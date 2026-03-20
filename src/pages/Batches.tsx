import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CalendarDays,
  BookOpen,
  ChevronRight,
  Shield,
  GraduationCap,
  Library,
  Pi,
  Layers,
  Zap,
  ClipboardList,
  Award,
  MapPin,
} from 'lucide-react';
import { isGlobalBatchesEnabled, listBatches, seedIfEmpty, type Batch } from '@/lib/batchesStorage';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatStartDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}${getSuffix(day)} ${month}'${year}`;
}

function getSuffix(day: number) {
  if (day >= 11 && day <= 13) return 'th';
  const last = day % 10;
  if (last === 1) return 'st';
  if (last === 2) return 'nd';
  if (last === 3) return 'rd';
  return 'th';
}

function discountPercent(price: number, original: number) {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

function BatchCard({ batch }: { batch: Batch }) {
  const navigate = useNavigate();
  const off = discountPercent(batch.price, batch.originalPrice);
  
  const handleNav = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/batches/${batch.id}`);
  };

  return (
    <div 
      onClick={handleNav}
      className="rounded-[26px] bg-white border border-gray-100 overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.06)] group hover:border-blue-500/50 transition-all cursor-pointer"
    >
      <div className="relative w-full pt-[58%] sm:pt-[52%] bg-gray-100 overflow-hidden">
        <img
          src={batch.imageUrl}
          alt={batch.title}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-40" />
      </div>

      <div className="px-5 sm:px-6 pt-5 pb-6 text-[#1F2937]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-orange-500 font-black text-sm">{batch.subtitle}</div>
          <div className="px-4 py-1.5 rounded-lg border border-gray-100 text-[11px] font-black tracking-widest text-gray-500 bg-gray-50">
            {batch.language.toUpperCase()}
          </div>
        </div>

        <div className="mt-2 text-2xl font-black tracking-tight">{batch.title}</div>

          <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
            <BookOpen size={16} className="text-gray-300" />
            <span>{batch.examLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
            <CalendarDays size={16} className="text-gray-300" />
            <span>Starts on {formatStartDate(batch.startDate)}</span>
          </div>
        
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-black">{formatINR(batch.price)}</div>
              <div className="text-gray-400 line-through font-bold text-sm">
                {formatINR(batch.originalPrice)}
              </div>
            </div>
            {off > 0 && <div className="text-emerald-400 font-black text-sm">{off}% OFF</div>}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleNav}
              className="h-11 px-7 rounded-xl bg-blue-600 text-white font-black text-sm shadow-[0_10px_18px_rgba(37,99,235,0.2)] active:scale-95 transition-transform"
            >
              Buy Now
            </button>
            <button 
              onClick={handleNav}
              className="h-11 w-11 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-500 active:scale-95 transition-transform"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Batches() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('All');

  const categories = ['All', 'NEET', 'JEE', 'Foundation', 'UPSC', 'School'];

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!isGlobalBatchesEnabled()) seedIfEmpty();
        const data = await listBatches();
        if (alive) setAllBatches(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const batches = useMemo(() => {
    let filtered = allBatches;
    const query = q.trim().toLowerCase();
    
    if (query) {
      filtered = filtered.filter((b) => {
        const hay = `${b.title} ${b.subtitle} ${b.examLabel} ${b.language}`.toLowerCase();
        return hay.includes(query);
      });
    }

    if (category !== 'All') {
      filtered = filtered.filter((b) => {
        const hay = `${b.title} ${b.subtitle} ${b.examLabel}`.toLowerCase();
        return hay.includes(category.toLowerCase());
      });
    }

    return filtered;
  }, [q, allBatches, category]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1F2937] font-sans">
      <div className="mx-auto max-w-[1400px] min-h-screen flex flex-col">

        <main className="flex-1 min-w-0">
          <div className="px-4 sm:px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-lg font-black tracking-tight">Batches</div>

              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2 w-full sm:w-[360px] focus-within:border-blue-500/50 transition-all">
                  <Search size={18} className="text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search for neet"
                    className="w-full bg-transparent outline-none border-none text-slate-900 placeholder:text-slate-400 font-semibold"
                  />
                </div>
              </div>

              <div className="sm:hidden flex items-center gap-2">
                <button
                  onClick={() => setMobileSearchOpen((v) => !v)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  <Search size={18} className="text-slate-700" />
                </button>
              </div>
            </div>

            {mobileSearchOpen && (
              <div className="mt-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                <Search size={18} className="text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search for neet"
                  className="w-full bg-transparent outline-none border-none text-slate-900 placeholder:text-slate-400 font-semibold"
                />
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="text-3xl sm:text-4xl font-black tracking-tight">Popular Courses</div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                      category === cat
                        ? 'bg-[#5A4BDA] text-white shadow-lg shadow-[#5A4BDA]/20'
                        : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-[26px] bg-white border border-gray-100 overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-[16/9] bg-gray-100" />
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between">
                        <div className="h-4 w-20 bg-gray-100 rounded" />
                        <div className="h-4 w-12 bg-gray-100 rounded" />
                      </div>
                      <div className="h-8 w-3/4 bg-gray-100 rounded" />
                      <div className="space-y-2">
                        <div className="h-4 w-1/2 bg-gray-100 rounded" />
                        <div className="h-4 w-2/3 bg-gray-100 rounded" />
                      </div>
                      <div className="pt-4 flex justify-between items-center">
                        <div className="h-8 w-24 bg-gray-100 rounded" />
                        <div className="h-10 w-24 bg-gray-100 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              {!loading &&
                batches.map((b) => (
                  <BatchCard key={b.id} batch={b} />
                ))}
            </div>

            {!loading && !batches.length && (
              <div className="mt-10 text-slate-500 font-bold">No batches found.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

