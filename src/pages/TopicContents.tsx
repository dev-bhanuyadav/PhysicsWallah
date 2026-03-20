import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Clock, Calendar, Paperclip, MoreVertical, Lock } from 'lucide-react';

export default function TopicContents() {
  const { batchId, subjectId, topicSlug } = useParams<{ batchId: string, subjectId: string, topicSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const topicName = location.state?.topicName || 'Topic Contents';
  
  const [activeTab, setActiveTab] = useState('Lectures');
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleVideoClick = (item: any) => {
    if (item.type !== "BATCH_SCHEDULE_VIDEO" && !item.isVideoLecture) return;
    navigate(`/batches/${batchId}/subjects/${subjectId}/video/${item._id}`, { 
      state: { videoTitle: item.topic || item.name } 
    });
  };

  const TABS = [
    { name: 'Lectures', id: 'videos', locked: false },
    { name: 'Notes', id: 'notes', locked: true },
    { name: 'DPP', id: 'dpp', locked: true },
  ];

  useEffect(() => {
    const fetchContents = async () => {
      const currentTab = TABS.find(t => t.name === activeTab);
      // If locked, immediately clear state instead of fetching
      if (currentTab?.locked) {
        setContents([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        const res = await fetch(`/api/v1/pw-proxy/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=${currentTab?.id}&tag=${topicSlug}`);
        const d = await res.json();
        if (d && d.success) {
          setContents(d.data || []);
        } else {
          setError(d.message || 'Failed to fetch contents.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Network error.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContents();
  }, [batchId, subjectId, topicSlug, activeTab]);

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 min-h-screen bg-[#000A1F] pb-24 text-white">
      
      {/* ══ TOP HEADER ══ */}
      <div className="bg-[#000A1F]/80 backdrop-blur-xl sticky top-[64px] z-30 pt-4 pb-2 border-b border-white/10">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-white/70 hover:text-white font-medium transition-colors">
            <ArrowLeft size={20} strokeWidth={2.5} /> <span className="text-[15px] font-semibold">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F5] font-bold text-xs text-[#6B7280]">
              <span className="w-[18px] h-[18px] rounded-full border border-slate-300 flex items-center justify-center text-[8px] bg-slate-200">XP</span>
              0
            </div>
          </div>
        </div>
      </div>

      {/* ══ TOPIC BANNER & TABS ══ */}
      <div className="bg-white pt-10 pb-0 border-b border-gray-200 shadow-sm">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#1F2937] mb-8 leading-tight">{topicName}</h1>
          
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto hide-scrollbar">
            {TABS.map(tab => (
              <button 
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`whitespace-nowrap px-4 py-3 text-[14px] font-bold transition-all relative flex items-center gap-1.5 ${
                  activeTab === tab.name 
                    ? 'text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.locked && <Lock size={14} className="mb-0.5" />}
                {tab.name}
                {/* Active Indicator */}
                {activeTab === tab.name && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-sm" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTENT GRID ══ */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 mt-8">
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#5A4BDA] rounded-full animate-spin"></div>
          </div>
        ) : contents.length > 0 || error ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(contents.length > 0 ? contents : [
              { _id: 'mock-vid-1', type: 'BATCH_SCHEDULE_VIDEO', topic: '[MOCK] Structure of Atom 01', date: new Date().toISOString(), videoDetails: { duration: '01:15:00' } },
              { _id: 'mock-vid-2', type: 'BATCH_SCHEDULE_VIDEO', topic: '[MOCK] Structure of Atom 02', date: new Date().toISOString(), videoDetails: { duration: '00:45:00' } }
            ]).map((item, i) => (
              <div 
                key={item._id || i}
                onClick={() => handleVideoClick(item)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-start gap-5 hover:border-blue-500/50 transition-all group cursor-pointer text-[#1F2937]"
              >
                {/* Image Banner */}
                <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                  <img 
                    src={item.videoDetails?.image || item.image || "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/8679bec1-6460-4448-9bbb-483d6554155a.png"} 
                    alt={item.topic || item.name}
                    className="w-full h-full object-cover block"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {/* Play Button Overlay */}
                  {(item.isVideoLecture || item.type === "BATCH_SCHEDULE_VIDEO") && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle size={22} className="text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                
                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold text-gray-400 mb-1.5">
                    <div className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(item.date).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><Clock size={13} /> {item.videoDetails?.duration || '00:00:00'}</div>
                  </div>
                  
                  <h3 className="text-[14px] font-bold text-[#1F2937] leading-snug line-clamp-2">{item.topic || item.name}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-slate-400 font-bold mb-2 text-lg">No {activeTab} Found</div>
            <p className="text-sm text-slate-500 font-medium">There is currently no content uploaded in this section.</p>
          </div>
        )}
      </div>
    </div>
  );
}
