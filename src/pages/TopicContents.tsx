import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Clock, Calendar, Paperclip, MoreVertical, BookOpen } from 'lucide-react';
import { listBatches } from '@/lib/batchesStorage';
import { decryptToken } from '@/utils/cryptoUtils';

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
    { name: 'Notes', id: 'notes', locked: false },
    { name: 'DPP', id: 'dpp', locked: false },
    { name: 'DPP PDF', id: 'dpp_pdf', locked: false },
    { name: 'DPP VIDEOS', id: 'dpp_videos', locked: false },
  ];

  useEffect(() => {
    const fetchContents = async () => {
      const currentTab = TABS.find(t => t.name === activeTab);
      setLoading(true);
      setError('');
      
      try {
        const batches = await listBatches();
        const b = batches.find(x => x.id === batchId);
        const realId = b?.pwId || batchId;

        const encToken = sessionStorage.getItem('pw_token');
        const headers: Record<string, string> = {};
        if (encToken) {
          try {
            const token = await decryptToken(encToken);
            if (token) headers['Authorization'] = `Bearer ${token}`;
          } catch (e) {}
        }

        const res = await fetch(`/api/v1/pw-proxy/v2/batches/${realId}/subject/${subjectId}/contents?page=1&contentType=${currentTab?.id}&tag=${topicSlug}`, { headers });
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
    <div className="min-h-screen bg-[#F8F9FB] pb-24 text-[#1F2937]">
      
      {/* ══ TOP BAR ══ */}
      <div className="bg-white border-b border-gray-100 flex items-center justify-between h-14 px-6 md:px-10 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2.5 text-slate-800 font-bold hover:text-blue-600 transition-colors">
          <ArrowLeft size={18} strokeWidth={3} /> 
          <span className="text-[14px]">Back</span>
        </button>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 font-extrabold text-[#6B7280] shadow-sm">
          <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-slate-200 to-white border border-slate-300 flex items-center justify-center text-[7px] text-slate-500">XP</div>
          <span className="text-xs">0</span>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-6 md:px-10 pt-10">
        <h1 className="text-[32px] font-black text-[#1F2937] mb-8 leading-tight tracking-tight">{topicName}</h1>
        
        {/* PILL TABS */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto hide-scrollbar pb-2">
          {TABS.map(tab => (
            <button 
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`whitespace-nowrap px-6 py-2.5 text-[14px] font-bold rounded-2xl border transition-all ${
                activeTab === tab.name 
                  ? 'bg-blue-50/80 text-blue-600 border-blue-200/50 shadow-sm ring-1 ring-blue-100' 
                  : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* CONTENT GRID */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-400 animate-pulse">Loading {activeTab}...</p>
          </div>
        ) : contents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {contents.map((item, i) => (
              <div 
                key={item._id || i}
                onClick={() => handleVideoClick(item)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group cursor-pointer"
              >
                {/* Image / Thumbnail Section */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-50">
                  <img 
                    src={item.videoDetails?.image || item.image || "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/8679bec1-6460-4448-9bbb-483d6554155a.png"} 
                    alt={item.topic || item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                      <PlayCircle size={28} className="text-blue-600 ml-1" fill="currentColor" />
                    </div>
                  </div>
                  
                  {/* PW Logo Overlay (Small) */}
                  <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full p-0.5 shadow-sm">
                    <img src="https://th.bing.com/th/id/OIP.8vIGm3BuOD31_XaWr2FhMgHaHa?w=175&h=180&c=7&r=0&o=7&pid=1.7&rm=3" className="w-full h-full object-contain" />
                  </div>
                </div>
                
                {/* Info Area */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Teacher Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <img 
                        src="https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/97e9f801-6c2e-4b41-9494-b778c8577002.png" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[14px] font-bold text-slate-500">By {item.faculty?.[0]?.name || 'PW Team'}</span>
                  </div>

                  {/* Metadata Bar */}
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-400 mb-3 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-300" /> {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    <div className="flex items-center gap-1.5"><Clock size={13} className="text-slate-300" /> {item.videoDetails?.duration || '00:00:00'}</div>
                  </div>
                  
                  {/* Title & Attachment */}
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <h3 className="text-[15px] font-black text-[#1F2937] leading-tight line-clamp-2 flex-1">
                      {item.topic || item.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                        <Paperclip size={18} strokeWidth={2.5} />
                      </div>
                      <div className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                        <MoreVertical size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BookOpen size={40} className="text-slate-300" />
            </div>
            <h3 className="text-[#1F2937] font-black text-2xl mb-2">No {activeTab} Uploaded</h3>
            <p className="text-slate-500 font-medium px-10">We haven't shared any content in this section yet. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
