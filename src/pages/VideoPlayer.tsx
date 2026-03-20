import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Play, Pause, Maximize, Minimize } from 'lucide-react';

declare global { interface Window { Hls?: any; } }

async function decryptRenderPayload(encodedText: string, keyStr: string) {
  const [ivHex, cipherHex] = encodedText.split(':');
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const cipherTextWithTag = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  // Try SHA-256 of keyStr as the key (Standard for GCM)
  const keyBuffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(keyStr));
  const cryptoKey = await window.crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, ["decrypt"]);
  
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      cipherTextWithTag
    );
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  } catch (e) {
    // If GCM fails, it might be a different derivation or CBC
    throw new Error("Decryption failed. Please check the key 'maggikhalo'.");
  }
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer() {
  const { batchId, subjectId, childId } = useParams<{ batchId: string, subjectId: string, childId: string }>();
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState('');
  const [videoLoading, setVideoLoading] = useState(true);
  const [statusText, setStatusText] = useState('Initializing Render Pipeline...');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { return () => { if (hlsRef.current) hlsRef.current.destroy(); }; }, []);

  useEffect(() => {
    let isMounted = true;
    const initPlayer = async () => {
      setVideoLoading(true); setVideoError('');
      try {
        setStatusText('Requesting Render Stream Grant...');
        // Call the Vercel proxy which forwards to Render
        const res = await fetch(`/api/v1/pw-proxy/render/video?batchId=${batchId}&subjectId=${subjectId}&childId=${childId}&_v=${Date.now()}`);
        const meta = await res.json();
        
        if (!res.ok) throw new Error(`Render API Error [${res.status}]: ${meta?.error || meta?.message || 'Unauthorized'}`);
        if (!isMounted) return;

        setStatusText('Decrypting Render Payload...');
        // Render API returns { data: "iv:ciphertext" }
        const payload = await decryptRenderPayload(meta.data, "maggikhalo");
        const streamUrl = payload.streamUrl || payload.url;
        const keyHex = payload.keyHex;

        setStatusText('Initializing HLS Engine...');
        const Hls = await new Promise<any>((resolve, reject) => {
          if (window.Hls) return resolve(window.Hls);
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.0/dist/hls.min.js';
          script.onload = () => resolve(window.Hls);
          script.onerror = () => reject(new Error('Failed to load HLS'));
          document.body.appendChild(script);
        });

        if (!Hls.isSupported()) throw new Error('HLS not supported');
        const hls = new Hls({
           xhrSetup: (xhr: any, u: string) => {
               if (u.includes('get-hls-key') && keyHex) {
                   const hexArray = keyHex.match(/.{1,2}/g) || [];
                   const base64Key = btoa(String.fromCharCode(...hexArray.map((b: string) => parseInt(b, 16))));
                   xhr.open('GET', `data:application/octet-stream;base64,${base64Key}`, true);
               }
           },
           enableWorker: true, lowLatencyMode: true
        });
        hlsRef.current = hls;

        if (videoRef.current) {
          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
             if (isMounted) {
               setVideoLoading(false);
               videoRef.current?.play().catch(() => {});
             }
          });
        }
      } catch (err: any) {
        if (isMounted) { setVideoError(err.message || 'Stream authorization failed.'); setVideoLoading(false); }
      }
    };
    if (batchId && subjectId && childId) initPlayer();
    return () => { isMounted = false; };
  }, [batchId, subjectId, childId]);

  const togglePlay = () => { videoRef.current && (isPlaying ? videoRef.current.pause() : videoRef.current.play()); };
  const handleTimeUpdate = () => { if (videoRef.current) { setCurrentTime(videoRef.current.currentTime); setDuration(videoRef.current.duration); setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100); } };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => { if (videoRef.current && duration > 0) { const val = parseFloat(e.target.value); videoRef.current.currentTime = (val / 100) * duration; setProgress(val); } };
  const toggleFullscreen = () => { if (!containerRef.current) return; document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen(); };

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 min-h-screen bg-[#000A1F] pb-20 text-white">
      <div className="bg-[#000A1F]/80 backdrop-blur-xl sticky top-[64px] z-30 pt-4 pb-2 border-b border-white/10">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-white/50 hover:text-white font-medium transition-colors">
            <ArrowLeft size={20} strokeWidth={2.5} /> <span className="text-[15px] font-semibold">Back</span>
          </button>
        </div>
      </div>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 flex flex-col items-center">
        <div className={`w-full max-w-5xl flex flex-col gap-6 ${videoLoading || videoError ? 'hidden' : 'flex'}`}>
          <div ref={containerRef} onMouseMove={() => { setShowControls(true); if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); controlsTimeoutRef.current = setTimeout(() => isPlaying && setShowControls(false), 2500); }} className="group bg-black w-full aspect-video rounded-none sm:rounded-2xl overflow-hidden relative flex flex-col items-center justify-center shadow-2xl border border-white/10">
             <video ref={videoRef} onClick={togglePlay} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="w-full h-full object-contain bg-black z-10 cursor-pointer" />
             <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 flex flex-col bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-4 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="w-full relative group/t mb-1 cursor-pointer flex items-center h-4">
                  <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full overflow-hidden group-hover/t:h-1.5 transition-all"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }}></div></div>
                  <input type="range" min="0" max="100" step="0.1" value={isNaN(progress) ? 0 : progress} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between mt-2 gap-4">
                  <div className="flex items-center gap-3 md:gap-5">
                    <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors p-1">{isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
                    <div className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">{formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}</div>
                  </div>
                  <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors p-1">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
                </div>
             </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-sm text-center">
            <span className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center justify-center gap-2">🔒 Render Pipeline Active</span>
          </div>
        </div>
        {videoLoading && <div className="w-full max-w-4xl aspect-video bg-white/5 rounded-2xl border border-white/10 shadow-md flex flex-col items-center justify-center py-20 text-white/40"><div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div><p className="font-semibold animate-pulse text-lg">{statusText}</p></div>}
        {videoError && <div className="w-full max-w-4xl bg-red-950/20 text-red-500 p-10 rounded-2xl border border-red-500/20 flex flex-col items-center shadow-sm"><ShieldAlert size={48} className="mb-4 opacity-80" /><h3 className="text-xl font-bold mb-2">Secure Playback Failure</h3><p className="font-medium text-center">{videoError}</p></div>}
      </div>
    </div>
  );
}
