import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ShieldAlert, Play, Pause, Volume2, VolumeX, 
  Maximize, Minimize, Settings, ChevronRight, Check 
} from 'lucide-react';
import { decryptToken } from '@/utils/cryptoUtils';
import { listBatches } from '@/lib/batchesStorage';

declare global { interface Window { Hls?: any; } }

async function decryptSecurePayload(encodedText: string, keyString: string) {
  const b64 = encodedText.split('').reverse().join('');
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  if (bytes.length < 28) throw new Error("Payload corrupted");
  const iv = bytes.slice(0, 12);
  const tag = bytes.slice(12, 28);
  const encrypted = bytes.slice(28);
  const cipherText = new Uint8Array(encrypted.length + tag.length);
  cipherText.set(encrypted, 0);
  cipherText.set(tag, encrypted.length);
  const encoder = new TextEncoder();
  const sha256Buffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(keyString));
  const cryptoKey = await window.crypto.subtle.importKey("raw", sha256Buffer, { name: "AES-GCM" }, false, ["decrypt"]);
  const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, cipherText);
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
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
  const [statusText, setStatusText] = useState('Initializing secure environment...');
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
        setStatusText('Requesting Secure Access Grant...');
        const encToken = sessionStorage.getItem('pw_token');
        const headers: Record<string, string> = {};
        if (encToken) {
          try { headers['Authorization'] = `Bearer ${await decryptToken(encToken)}`; } catch (e) {}
        }
        const batches = await listBatches();
        const b = batches.find(x => x.id === batchId);
        const realId = b?.pwId || batchId;

        const res = await fetch(`/api/v1/pw-proxy/v2/batches/${realId}/media-secure?batchId=${realId}&subjectId=${subjectId}&childId=${childId}&_v=${Date.now()}`, { headers });
        let meta; try { meta = await res.json(); } catch(e) {}
        if (!res.ok) throw new Error(`Integrity Error [${res.status}]: ${meta?.error || meta?.msg || ''}`);
        if (!isMounted) return;

        setStatusText('Decrypting Virtual Stream Pipeline...');
        const { streamUrl, keyHex } = await decryptSecurePayload(meta.payload, "PiMaxerkiJay@@##*(^*&%^%$%#");

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
               if (u.includes('get-hls-key')) {
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
          hls.on(window.Hls.Events.ERROR, (e: any, data: any) => {
             if (data.fatal) {
                 if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                 else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
                 else { hls.destroy(); setVideoError('Playback failed. Please refresh.'); setVideoLoading(false); }
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
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 min-h-screen bg-[#F8F9FB] pb-20 text-[#1F2937]">
      <div className="bg-white/80 backdrop-blur-xl sticky top-[64px] z-30 pt-4 pb-2 border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-gray-500 hover:text-[#1F2937] font-medium transition-colors">
            <ArrowLeft size={20} strokeWidth={2.5} /> <span className="text-[15px] font-semibold">Back</span>
          </button>
        </div>
      </div>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 flex flex-col items-center">
        <div className={`w-full max-w-5xl flex flex-col gap-6 ${videoLoading || videoError ? 'hidden' : 'flex'}`}>
          <div ref={containerRef} onMouseMove={() => { setShowControls(true); if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); controlsTimeoutRef.current = setTimeout(() => isPlaying && setShowControls(false), 2500); }} className="group bg-black w-full aspect-video rounded-none sm:rounded-2xl overflow-hidden relative flex flex-col items-center justify-center shadow-2xl border border-slate-800">
             <video ref={videoRef} onClick={togglePlay} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="w-full h-full object-contain bg-black z-10 cursor-pointer" />
             <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 flex flex-col bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-4 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="w-full relative group/t mb-1 cursor-pointer flex items-center h-4">
                  <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full overflow-hidden group-hover/t:h-1.5 transition-all"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div></div>
                  <input type="range" min="0" max="100" step="0.1" value={isNaN(progress) ? 0 : progress} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between mt-2 gap-4">
                  <div className="flex items-center gap-3 md:gap-5">
                    <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors p-1">{isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
                    <div className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">{formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}</div>
                  </div>
                  <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors p-1">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
                </div>
             </div>
          </div>
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
            <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center justify-center gap-2">🔒 Private Enclave Player Active</span>
          </div>
        </div>
        {videoLoading && <div className="w-full max-w-4xl aspect-video bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center py-20 text-slate-500"><div className="w-12 h-12 border-4 border-slate-200 border-t-[#7152F3] rounded-full animate-spin mb-4"></div><p className="font-semibold animate-pulse text-lg">{statusText}</p></div>}
        {videoError && <div className="w-full max-w-4xl bg-red-50 text-red-600 p-10 rounded-2xl border border-red-100 flex flex-col items-center shadow-sm"><ShieldAlert size={48} className="mb-4 opacity-80" /><h3 className="text-xl font-bold mb-2">Secure Playback Failure</h3><p className="font-medium text-center">{videoError}</p></div>}
      </div>
    </div>
  );
}
