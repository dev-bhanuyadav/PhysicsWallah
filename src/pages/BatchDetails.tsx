import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Bell, CheckCircle2, ChevronDown, PlayCircle, Star, Calendar, ShieldAlert } from 'lucide-react';
import { listBatches, type Batch } from '@/lib/batchesStorage';

function formatINR(n: number) {
  return `₹${Math.floor(n)}`;
}

export default function BatchDetails() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [activeTab, setActiveTab] = useState('Description');
  const [apiData, setApiData] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load basic batch details from async storage
    listBatches().then(all => {
      const found = all.find((b) => b.id === batchId);
      if (found) setBatch(found);
      else setApiError('Batch ID not found in global database.');
    });
    
    // 2. Fetch from real PenPencil API via Secure Node Proxy
    if (batchId) {
      listBatches().then(all => {
        const found = all.find(x => x.id === batchId);
        const realId = found?.pwId || batchId;
        
        fetch(`/api/v1/pw-proxy/v3/batches/${realId}/details?type=EXPLORE_LEAD`)
        .then(r => r.json())
        .then(d => {
        if (d && d.data) {
          setApiData(d.data);
          if (!d.data.description && !d.data.shortDescription) {
            setApiError('API returned data, but description/shortDescription is missing. Raw: ' + JSON.stringify(d).substring(0, 300));
          }
        } else {
          setApiError('API returned unexpected format: ' + JSON.stringify(d).substring(0, 300));
        }
        })
        .catch((e) => setApiError('PW API Fetch Error: ' + e.message));
      });
    }
  }, [batchId]);

  if (!batch && !apiData && !apiError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold">Loading Batch Details...</p>
        </div>
      </div>
    );
  }

  if (apiError && !batch && !apiData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h2>
        <p className="text-slate-600 mb-6 max-w-md">{apiError}</p>
        <button 
          onClick={() => navigate('/batches')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Go Back to Batches
        </button>
      </div>
    );
  }

  const tabs = ['Description', 'All Classes', 'Khazana', 'Infinity Learning', 'Tests', 'Community'];

  // Use API real data if available, else fallback to batch DB
  const dPrice = apiData?.fee?.total || batch?.price || 0;
  const dOriginalPrice = apiData?.fee?.price || apiData?.fee?.amount || Math.max(batch?.originalPrice || 0, batch?.price || 0);
  const dTitle = apiData?.name || batch?.title || 'Batch Details';
  const dLang = apiData?.language || batch?.language || 'Hindi/English';
  const dExamLabel = apiData?.byName 
    ? apiData.byName.replace('For ', '').replace(' Aspirants', '') 
    : (batch?.examLabel || 'General');

  const offPercentFloat = dOriginalPrice > dPrice 
    ? ((1 - dPrice/dOriginalPrice) * 100).toFixed(2)
    : '0';

  return (
    <div className="pb-24 text-[#1F2937]">
      
      {/* ══ TOP HEADER ══ */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 pt-4 pb-2 border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-gray-500 hover:text-[#1F2937] font-medium transition-colors">
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

      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 mt-6 flex flex-col xl:flex-row gap-6 items-start">
        
        {/* ══ LEFT CONTENT CONTENT ══ */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          
          {/* BATCH HEADER + TABS WRAPPER */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* PURPLE BANNER WITH SVG BACKGROUND */}
            <div 
              className="h-[84px] px-6 sm:px-8 py-0 flex items-center relative overflow-hidden bg-[#7152F3]"
              style={{ 
                backgroundImage: 'url("https://static.pw.live/react-batches/assets/svg/descriptionHeader.svg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center right'
              }}
            >
              <h1 className="text-white text-[22px] sm:text-[24px] font-bold tracking-tight z-10 antialiased relative drop-shadow-sm leading-none">{dTitle}</h1>
              {/* Optional ambient lighting overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#7152F3]/40 to-transparent"></div>
            </div>

            {/* TABS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 sm:px-6 border-b border-gray-100">
              <div className="flex items-center gap-5 overflow-x-auto flex-nowrap scrollbar-hide pb-1">
                {tabs.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap pt-4 pb-3.5 px-1 text-[13px] font-semibold transition-all relative flex items-center gap-1.5 ${
                      activeTab === tab 
                        ? 'text-blue-600' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'Infinity Learning' && <Star size={14} className={activeTab === tab ? "fill-amber-400 text-amber-500" : "text-amber-500"} />}
                    {tab}
                    {/* Active Bottom Line */}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-sm" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 py-3 sm:py-0 border-t sm:border-0 border-slate-100 px-4 sm:px-0">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#374151] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
                  <Share2 size={13} strokeWidth={2.5} className="text-[#6B7280]" /> Share Batch
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#EF4444] border border-red-100 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap">
                  <Bell size={13} strokeWidth={2.5} className="text-[#EF4444]" /> Announcement
                </button>
              </div>
            </div>
          </div>

          {/* TAB CONTENT: Description */}
          {activeTab === 'Description' && (
            <div className="flex flex-col gap-6">
              
              {/* Choose A Plan and Fake Batch Includes Removed per user request */}

              {/* THIS BATCH INCLUDES (API DRIVEN) */}
              {apiData?.shortDescription && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm overflow-hidden html-formatted-content">
                  <h2 className="text-xl font-bold tracking-tight mb-5">This Batch Includes</h2>
                  <div dangerouslySetInnerHTML={{ __html: apiData.shortDescription }} />
                </div>
              )}

              {/* Fake Demo Videos Removed per user request */}

              {/* OTHER DETAILS */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 cursor-pointer">
                  <h2 className="text-xl font-bold tracking-tight">Other Details</h2>
                  <ChevronDown size={20} className="text-slate-400" />
                </div>
                <div className="space-y-4 text-sm font-semibold text-slate-600 pr-4 html-formatted-content">
                  {apiData?.description ? (
                    <div dangerouslySetInnerHTML={{ __html: apiData.description }} />
                  ) : (
                    <div className="text-slate-400 font-medium italic py-4">
                      {apiError 
                        ? <div className="text-red-500 font-mono text-xs break-words">{apiError}</div>
                        : "Batch details not found. Please sync via Admin Panel using a valid PW token."}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: All Classes */}
          {activeTab === 'All Classes' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
               <h2 className="text-2xl font-black tracking-tight mb-2">Subjects</h2>
               <p className="text-sm font-medium text-slate-500 mb-8">Select your subjects & start learning</p>

               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {(apiData?.subjects || [
                    { _id: 'mock-sub-1', subject: '[Mock] Physics', lectureCount: 10 },
                    { _id: 'mock-sub-2', subject: '[Mock] Chemistry', lectureCount: 15 },
                    { _id: 'mock-sub-3', subject: '[Mock] Mathematics', lectureCount: 8 }
                 ]).length > 0 ? (
                   (apiData?.subjects || [
                    { _id: 'mock-sub-1', subject: '[Mock] Physics', lectureCount: 10 },
                    { _id: 'mock-sub-2', subject: '[Mock] Chemistry', lectureCount: 15 },
                    { _id: 'mock-sub-3', subject: '[Mock] Mathematics', lectureCount: 8 }
                 ]).map((subj: any) => (
                     <div 
                       key={subj._id || subj.subjectId} 
                       className="border border-gray-100 bg-gray-50 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all text-[#1F2937]"
                       onClick={() => navigate(`/batches/${batchId}/subjects/${subj._id || subj.subjectId}`, { state: { subjectName: subj.subject } })}
                     >
                       <div className="w-12 h-12 rounded-lg bg-[#F8F9FA] border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                         {subj.imageId ? (
                           <img src={`${subj.imageId.baseUrl}${subj.imageId.key}`} alt={subj.subject} className="w-8 h-8 object-contain" />
                         ) : (
                           <span className="text-xl font-bold text-slate-400">{subj.subject.charAt(0)}</span>
                         )}
                       </div>
                       <div>
                         <h3 className="font-black text-[15px]">{subj.subject}</h3>
                         <p className="text-xs font-semibold text-slate-400">{subj.lectureCount || 0} Lectures</p>
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="col-span-full py-8 text-center text-slate-400 italic font-medium">
                     Subject data not available. Please sync via Admin Panel.
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* Coming Soon logic for other tabs */}
          {['Infinity Learning', 'Tests', 'Community'].includes(activeTab) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
               <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Star size={24} />
               </div>
               <h2 className="text-xl font-black mb-2">{activeTab}</h2>
               <p className="text-slate-500 font-medium">This section is currently under development.</p>
            </div>
          )}

        </div>

        {/* ══ RIGHT STICKY CARD REMOVED AS REQUESTED ══ */}

      </div>
    </div>
  );
}
