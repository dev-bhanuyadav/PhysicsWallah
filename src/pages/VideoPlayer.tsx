import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ShieldAlert, Play, Pause, Volume2, VolumeX, 
  Maximize, Minimize, Settings, ChevronRight, Check 
} from 'lucide-react';
import { decryptToken } from '@/utils/cryptoUtils';
import { listBatches } from '@/lib/batchesStorage';

declare global { interface Window { Hls?: any; } }

// Secure Frontend Decryption for our OWN Custom Payload
async function decryptSecurePayload(encodedText: string, keyString: string) {
  // Step 1: De-Obfuscate Reversed Base64
  const b64 = encodedText.split('').reverse().join('');
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Step 2: Slice the completely invisible raw buffer
  if (bytes.length < 28) throw new Error("Payload corrupted");
  const iv = bytes.slice(0, 12);
  const tag = bytes.slice(12, 28);
  const encrypted = bytes.slice(28);

  // WebCrypto expects CIPHERTEXT + AUTHTAG as one unified buffer
  const cipherText = new Uint8Array(encrypted.length + tag.length);
  cipherText.set(encrypted, 0);
  cipherText.set(tag, encrypted.length);

  const encoder = new TextEncoder();
  const sha256Buffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(keyString));

  const cryptoKey = await window.crypto.subtle.importKey(
     "raw", sha256Buffer, { name: "AES-GCM" }, false, ["decrypt"]
  );
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
     { name: "AES-GCM", iv }, cryptoKey, cipherText
  );
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}

// Utility functions
function formatTime(seconds: number) {
  if (isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer() {
  const { batchId, subjectId, childId } = useParams<{ batchId: string, subjectId: string, childId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const videoTitle = location.state?.videoTitle || 'Secure Video Player';

  const [videoError, setVideoError] = useState('');
  const [videoLoading, setVideoLoading] = useState(true);
  const [statusText, setStatusText] = useState('Initializing secure environment...');

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);

  // --- Custom Controls State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Settings Menu State ---
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState<'main' | 'speed' | 'quality'>('main');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualities, setQualities] = useState<{ height: number, index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 means Auto
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  useEffect(() => {
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const initPlayer = async () => {
      setVideoLoading(true);
      setVideoError('');
      
      try {
        setStatusText('Requesting Secure Access Grant...');
        const encToken = sessionStorage.getItem('pw_token');
        const headers: Record<string, string> = {};
        if (encToken) {
          try {
            headers['Authorization'] = `Bearer ${await decryptToken(encToken)}`;
          } catch (e) {
            console.error('Failed to decrypt token for API call', e);
          }
        }
        
        const batches = await listBatches();
        const b = batches.find(x => x.id === batchId);
        const realId = b?.pwId || batchId;

        const res = await fetch(`/api/v1/media-secure?b=${realId}&s=${subjectId}&c=${childId}`, { headers });
        
        let meta;
        try { meta = await res.json(); } catch(e) {}
        
        if (!res.ok) {
            throw new Error(`Integrity Error [${res.status}]: ${meta?.error || ''} ${meta?.msg || ''}`);
        }
        
        if (!isMounted) return;
        setStatusText('Decrypting Virtual Stream Pipeline...');
        
        const { streamUrl, keyHex } = await decryptSecurePayload(meta.payload, "PiMaxerkiJay@@##*(^*&%^%$%#");

        setStatusText('Initializing HLS Engine...');
        const Hls = await new Promise<any>((resolve, reject) => {
          if (window.Hls) return resolve(window.Hls);
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.0/dist/hls.min.js';
          script.onload = () => resolve(window.Hls);
          script.onerror = () => reject(new Error('Failed to load HLS runtime components'));
          document.body.appendChild(script);
        });

        if (!Hls.isSupported()) throw new Error('Browser HLS streaming not supported.');
        if (!isMounted) return;

        const hlsConfig = {
           xhrSetup: function(xhr: any, u: string) {
               if (u.includes('get-hls-key')) {
                   const hexArray = keyHex.match(/.{1,2}/g) || [];
                   const binaryString = String.fromCharCode(...hexArray.map((byte: string) => parseInt(byte, 16)));
                   const base64Key = btoa(binaryString);
                   const dataUri = `data:application/octet-stream;base64,${base64Key}`;
                   xhr.open('GET', dataUri, true);
                   return;
               }
           },
           // --- Optimization for low-end devices & Buffering Fix [MUST FIX] ---
           enableWorker: true,
           maxBufferLength: 30,
           maxMaxBufferLength: 60,
           maxBufferSize: 60 * 1000 * 1000, // 60MB
           maxBufferHole: 0.5,
           lowLatencyMode: true,
           backBufferLength: 90,
           frontBufferFlushThreshold: 100,
           fragLoadingMaxRetry: 3,
           manifestLoadingMaxRetry: 3,
           debug: false
        };

        const hls = new Hls(hlsConfig);
        hlsRef.current = hls;

        if (videoRef.current) {
          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current);
          
          hls.on(window.Hls.Events.MANIFEST_PARSED, (e: any, data: any) => {
             if (isMounted) {
               setVideoLoading(false);
               // Extract qualities (Levels)
               const availableQualities = data.levels.map((l: any, i: number) => ({
                  height: l.height,
                  index: i
               })).sort((a: any, b: any) => b.height - a.height); // descending
               setQualities(availableQualities);

               videoRef.current?.play().catch(err => console.warn('Auto-play blocked.', err));
             }
          });
          
          hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
             if (data.fatal) {
                 switch (data.type) {
                     case window.Hls.ErrorTypes.NETWORK_ERROR:
                         console.warn("Fatal network error, attempting to recover...", data);
                         hls.startLoad();
                         break;
                     case window.Hls.ErrorTypes.MEDIA_ERROR:
                         console.error("Fatal media error encountered, trying to recover", data);
                         hls.recoverMediaError();
                         break;
                     default:
                         hls.destroy();
                         if (isMounted) {
                           setVideoError(`HLS Crash: ${data.details}. Please refresh the page.`);
                           setVideoLoading(false);
                         }
                         break;
                 }
             } else if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
                 if (isMounted && data.details === 'manifestLoadError') {
                    console.error("Manifest load error detected");
                    hls.destroy();
                    setVideoError(`HLS Manifest Blocked. Tokens might be invalid or expired.`);
                    setVideoLoading(false);
                 }
             }
          });
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setVideoError(err.message || 'Stream authorization failed.');
          setVideoLoading(false);
        }
      }
    };
    
    if (batchId && subjectId && childId) {
      initPlayer();
    }
    
    return () => { isMounted = false; };
  }, [batchId, subjectId, childId]);

  // --- Player Event Handlers ---
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    if (videoRef.current && duration > 0) {
      const newTime = (newProgress / 100) * duration;
      videoRef.current.currentTime = newTime;
      setProgress(newProgress);
    }
  };

  const traverseVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (newMuted) setVolume(0);
      else setVolume(0.5);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
      setShowSettings(false); // Auto close settings if idle
    }, 2500);
  };

  const handleQualitySelect = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQuality(index);
    }
    setSettingsMenu('main');
    setShowSettings(false);
  };

  const handleSpeedSelect = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackSpeed(rate);
    }
    setSettingsMenu('main');
    setShowSettings(false);
  };

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 min-h-screen bg-[#F8F9FB] pb-20 text-[#1F2937]">
      
      {/* ══ TOP HEADER ══ */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-[64px] z-30 pt-4 pb-2 border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-gray-500 hover:text-[#1F2937] font-medium transition-colors">
            <ArrowLeft size={20} strokeWidth={2.5} /> <span className="text-[15px] font-semibold">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 flex flex-col items-center">
        
        {/* WE ALWAYS KEEP VIDEO IN DOM AVOIDING REACT REF BUGS, BUT WE CSS-HIDE IT IF LOADING/ERROR */}
        <div className={`w-full max-w-5xl flex flex-col gap-6 ${videoLoading || videoError ? 'hidden' : 'flex'}`}>
          <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onClick={() => showSettings && setShowSettings(false)}
            className="group bg-black w-full aspect-video rounded-none sm:rounded-2xl overflow-hidden relative flex flex-col items-center justify-center shadow-2xl border border-slate-800"
          >
             {/* THE ACTUAL VIDEO ELEMENT */}
             {/* Note: the custom controls intercept clicks so we disable native controls */}
             <video 
               ref={videoRef}
               onClick={togglePlay}
               onPlay={() => setIsPlaying(true)}
               onPause={() => setIsPlaying(false)}
               onTimeUpdate={handleTimeUpdate}
               onLoadedMetadata={handleTimeUpdate}
               onEnded={() => setIsPlaying(false)}
               className="w-full h-full object-contain bg-black z-10 cursor-pointer"
             ></video>

             {/* CUSTOM CONTROLS OVERLAY */}
             <div 
               className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 flex flex-col bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-4 ${
                 showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
               }`}
             >
                {/* PROGRESS BAR */}
                <div className="w-full relative group/t mb-1 cursor-pointer flex items-center h-4">
                  <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full overflow-hidden group-hover/t:h-1.5 transition-all">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={isNaN(progress) ? 0 : progress}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  {/* Custom thumb just for visual */}
                  <div 
                    className="absolute h-3 w-3 bg-white rounded-full shadow blur-[0.5px] scale-0 group-hover/t:scale-100 transition-transform pointer-events-none" 
                    style={{ left: `calc(${progress}% - 6px)` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between mt-2 gap-4">
                  <div className="flex items-center gap-3 md:gap-5">
                    <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors p-1">
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    
                    <div className="flex items-center gap-2 group/v">
                      <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors">
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={isMuted ? 0 : volume} 
                        onChange={traverseVolume}
                        className="w-0 md:w-20 transition-all duration-300 opacity-0 md:opacity-100 origin-left accent-indigo-500 scale-x-0 group-hover/v:scale-x-100 md:scale-x-100 cursor-pointer h-1 bg-white/30 rounded-full"
                      />
                    </div>

                    <div className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">
                      {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 relative">
                    
                    {/* SETTINGS MENU DROPDOWN */}
                    <div className="relative">
                      {showSettings && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="absolute bottom-12 right-0 mb-2 w-48 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 text-white z-50 text-sm font-medium animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200"
                        >
                          {settingsMenu === 'main' && (
                            <div className="flex flex-col">
                              <button onClick={() => setSettingsMenu('quality')} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors">
                                <span>Quality</span>
                                <div className="flex items-center text-slate-300 text-xs">
                                  <span>{currentQuality === -1 ? 'Auto' : `${qualities.find(q => q.index === currentQuality)?.height}p`}</span>
                                  <ChevronRight size={14} className="ml-1" />
                                </div>
                              </button>
                              <button onClick={() => setSettingsMenu('speed')} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors">
                                <span>Speed</span>
                                <div className="flex items-center text-slate-300 text-xs">
                                  <span>{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                                  <ChevronRight size={14} className="ml-1" />
                                </div>
                              </button>
                            </div>
                          )}

                          {settingsMenu === 'quality' && (
                            <div className="flex flex-col">
                              <button onClick={() => setSettingsMenu('main')} className="w-full px-3 py-2 flex items-center gap-2 border-b border-white/10 hover:bg-white/5 transition-colors mb-1 text-slate-300">
                                <ArrowLeft size={14} /> <span className="text-xs">Back</span>
                              </button>
                              <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                <button onClick={() => handleQualitySelect(-1)} className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/10 transition-colors">
                                  <span>Auto</span>
                                  {currentQuality === -1 && <Check size={16} className="text-indigo-400" />}
                                </button>
                                {qualities.map(q => (
                                  <button key={q.height} onClick={() => handleQualitySelect(q.index)} className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <span>{q.height}p</span>
                                    {currentQuality === q.index && <Check size={16} className="text-indigo-400" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {settingsMenu === 'speed' && (
                            <div className="flex flex-col">
                              <button onClick={() => setSettingsMenu('main')} className="w-full px-3 py-2 flex items-center gap-2 border-b border-white/10 hover:bg-white/5 transition-colors mb-1 text-slate-300">
                                <ArrowLeft size={14} /> <span className="text-xs">Back</span>
                              </button>
                              <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                {speeds.map(s => (
                                  <button key={s} onClick={() => handleSpeedSelect(s)} className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <span>{s === 1 ? 'Normal' : `${s}x`}</span>
                                    {playbackSpeed === s && <Check size={16} className="text-indigo-400" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSettingsMenu('main'); setShowSettings(!showSettings); }} 
                        className={`text-white hover:text-indigo-400 transition-colors p-1 ${showSettings ? 'rotate-90' : ''} duration-300`}
                      >
                        <Settings size={20} />
                      </button>
                    </div>

                    <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors p-1">
                      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                  </div>
                </div>
             </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
            <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center justify-center gap-2">
              🔒 Private Enclave Player Active
            </span>
            <p className="text-slate-500 text-sm mt-3 font-medium">HLS Engine streaming at {currentQuality === -1 ? 'Auto Adaptive' : `${qualities.find(q=>q.index === currentQuality)?.height}p`} resolution.</p>
          </div>
        </div>

        {videoLoading && (
          <div className="w-full max-w-4xl aspect-video bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7152F3] rounded-full animate-spin mb-4"></div>
            <p className="font-semibold animate-pulse text-lg">{statusText}</p>
          </div>
        )}

        {videoError && (
          <div className="w-full max-w-4xl bg-red-50 text-red-600 p-10 rounded-2xl border border-red-100 flex flex-col items-center shadow-sm">
            <ShieldAlert size={48} className="mb-4 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Secure Playback Failure</h3>
            <p className="font-medium text-center">{videoError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
