import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function SubjectTopics() {
  const { batchId, subjectId } = useParams<{ batchId: string, subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const subjectName = location.state?.subjectName || 'Subject Topics';
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch(`/api/v1/pw-proxy/v2/batches/${batchId}/subject/${subjectId}/topics?page=1`);
        const d = await res.json();
        if (d && d.success && d.data) {
          setTopics(d.data);
        } else {
          setError(d.message || 'Failed to fetch topics');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [batchId, subjectId]);

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 min-h-screen bg-[#F8F9FB] pb-24 text-[#1F2937]">
      
      {/* ══ TOP HEADER ══ */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-[64px] z-30 pt-4 pb-2 border-b border-gray-200">
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

      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 mt-12 mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-[#1F2937]">{subjectName}</h1>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#7152F3] rounded-full animate-spin"></div>
          </div>
        ) : topics.length > 0 || error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {(topics.length > 0 ? topics : [
              { _id: 'mock-1', slug: 'topic-mock-1', name: '[MOCK] Structure of Atom', videos: 12, exercises: 5, notes: 3 },
              { _id: 'mock-2', slug: 'topic-mock-2', name: '[MOCK] Thermodynamics', videos: 8, exercises: 2, notes: 4 },
              { _id: 'mock-3', slug: 'topic-mock-3', name: '[MOCK] Kinetics', videos: 15, exercises: 10, notes: 6 }
            ]).map((item, i) => (
              <div 
                key={item._id || i}
                onClick={() => navigate(`/batches/${batchId}/subjects/${subjectId}/topics/${item.slug}`, { state: { topicName: item.name } })}
                className="bg-white rounded-xl shadow-sm border border-gray-200 flex sm:items-center cursor-pointer hover:shadow-md hover:border-blue-500/50 transition-all py-5 pr-5 relative overflow-hidden group"
              >
                {/* Accent Line */}
                <div className="absolute left-0 top-4 bottom-4 w-[4px] rounded-r-md bg-[#7152F3] group-hover:bg-[#5A4BDA] transition-colors"></div>
                
                <div className="pl-6 flex-1 w-full min-w-0 flex flex-col justify-center">
                  <h3 className="text-[16px] font-medium text-[#1F2937] truncate mb-1.5 leading-snug">{item.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-400">
                    <span>{item.videos || 0} Videos</span>
                    <span className="text-slate-200">|</span>
                    <span>{item.exercises || 0} Exercises</span>
                    <span className="text-slate-200">|</span>
                    <span>{item.notes || 0} Notes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-slate-400 font-bold mb-2">No topics found</div>
            <p className="text-sm text-slate-500 font-medium">This subject might be empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
