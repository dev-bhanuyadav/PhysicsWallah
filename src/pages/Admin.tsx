import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { createBatch, isGlobalBatchesEnabled, listBatches, removeBatch, seedIfEmpty, type Batch } from '@/lib/batchesStorage';
import { encryptToken, decryptToken } from '@/utils/cryptoUtils';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function Admin() {
  const navigate = useNavigate();
  const isAdmin = sessionStorage.getItem('pw_admin') === '1';
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [examLabel, setExamLabel] = useState('');
  const [language, setLanguage] = useState('HINGLISH');
  const [startDate, setStartDate] = useState('');
  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setBatchesLoading(true);
      try {
        if (!isGlobalBatchesEnabled()) seedIfEmpty();
        const next = await listBatches();
        if (alive) setBatches(next);
      } finally {
        if (alive) setBatchesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const unlockAdmin = async () => {
    const expectedHash = '01e669848c66516767163aa30b02530e7d21f0b19376bf5ba899216dbe594ba5';
    setKeyLoading(true);
    setKeyError('');
    try {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(keyValue.trim()));
      const hash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (hash !== expectedHash) {
        setKeyError('Wrong key');
        return;
      }
      sessionStorage.setItem('pw_admin', '1');
      setAdminKey(keyValue);
      setKeyValue('');
      showToast('Admin unlocked');
      setRefreshKey((k) => k + 1);
    } finally {
      setKeyLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#000A1F] text-white font-sans flex items-center justify-center px-6">
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 w-full max-w-md">
            <div className="rounded-2xl px-5 py-4 border shadow-2xl backdrop-blur-xl bg-white/10 border-white/15">
              <div className="text-sm font-black tracking-wide">{toast}</div>
            </div>
          </div>
        )}
        <div className="max-w-md w-full rounded-[24px] bg-white/5 border border-white/10 p-8">
          <div className="text-2xl font-black tracking-tight text-center">Admin Panel</div>
          <div className="mt-3 text-white/50 font-medium text-center">
            Admin access ke liye key enter karo.
          </div>

          <div className="mt-8 space-y-3">
            <div className="text-xs font-black tracking-widest uppercase text-white/50">Admin Key</div>
            <input
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-blue-500/40"
              placeholder="Enter key"
            />
            {keyError && <div className="text-red-300 text-sm font-black">{keyError}</div>}
          </div>

          <button
            onClick={unlockAdmin}
            disabled={keyLoading || !keyValue.trim()}
            className={`mt-6 w-full py-4 rounded-2xl font-black tracking-widest text-sm transition-all active:scale-95 ${
              keyValue.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white/10 text-white/50 cursor-not-allowed'
            }`}
          >
            {keyLoading ? 'UNLOCKING...' : 'UNLOCK ADMIN'}
          </button>

          <button
            onClick={() => navigate('/batches')}
            className="mt-4 w-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all py-4 rounded-2xl font-black tracking-widest text-sm"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  const [pwToken, setPwToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isAdmin || !adminKey) return;
    (async () => {
      try {
        const res = await fetch('/api/v1/admin/settings/token', {
          headers: { 'x-admin-key': adminKey },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            const dec = await decryptToken(data.token);
            setPwToken(dec);
          } else {
            setPwToken('');
          }
        }
      } catch (e) {
        console.error('Failed to fetch token:', e);
      }
    })();
  }, [isAdmin, adminKey]);

  const saveToken = async () => {
    if (!adminKey) return showToast('Unlock admin first');
    setTokenLoading(true);
    try {
        const encToken = await encryptToken(pwToken.trim());
        const res = await fetch('/api/v1/admin/settings/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify({ token: encToken }),
        });
      if (res.ok) showToast('Token saved successfully');
      else {
        const err = await res.json();
        showToast(err.error || 'Failed to save token');
      }
    } catch (e) {
      showToast('Network error');
    } finally {
      setTokenLoading(false);
    }
  };

  const syncBatches = async () => {
    if (!pwToken.trim()) return showToast('Enter PW Token first');
    setIsSyncing(true);
    try {
      // Step 1: Fetch from proxy
      const res = await fetch('/api/v1/pw-proxy/v3/batches/my-batches?mode=online', {
        headers: { 'x-admin-key': adminKey }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Proxy fetch failed');
      }

      const data = await res.json();
      const rawBatches = data.data?.batches || [];
      
      if (!rawBatches.length) {
        showToast('No batches found to sync');
        return;
      }

      // Step 2: Map and Save
      let count = 0;
      for (const rb of rawBatches) {
        // Simple mapping based on expected PW API structure
        const batchData = {
          title: rb.name || rb.title,
          subtitle: rb.batchCode || 'PW Batch',
          examLabel: rb.exam?.name || 'PW Exam',
          language: rb.language || 'HINGLISH',
          startDate: rb.startDate || new Date().toISOString().split('T')[0],
          price: rb.price || 0,
          originalPrice: rb.mrp || 0,
          imageUrl: rb.previewImage || rb.image || 'https://static.pw.live/auth-fe/assets/images/pw_badge_v2_login.webp',
        };

        try {
          await createBatch(batchData, adminKey);
          count++;
        } catch (e) {
          console.error('Failed to save synced batch:', e);
        }
      }

      showToast(`Successfully synced ${count} batches`);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      showToast(e.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdd = async () => {
    if (!adminKey) return showToast('Unlock admin first');
    if (!title || !price) return showToast('Title and Price required');
    try {
      await createBatch({
        title,
        subtitle,
        examLabel,
        language,
        startDate,
        price: Number(price),
        originalPrice: Number(originalPrice),
        imageUrl
      }, adminKey);
      showToast('Batch added');
      setTitle(''); setSubtitle(''); setPrice(''); setOriginalPrice('');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      showToast(e.message || 'Failed to add');
    }
  };

  const handleDelete = async (id: string) => {
    if (!adminKey) return showToast('Unlock admin first');
    if (!window.confirm('Are you sure?')) return;
    try {
      await removeBatch(id, adminKey);
      showToast('Batch removed');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      showToast(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#000A1F] text-white font-sans">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 w-full max-w-md">
          <div className="rounded-2xl px-5 py-4 border shadow-2xl backdrop-blur-xl bg-white/10 border-white/15">
            <div className="text-sm font-black tracking-wide">{toast}</div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/batches')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-black tracking-widest uppercase">Back</span>
          </button>

          <div className="text-sm font-black tracking-widest uppercase text-white/50">
            Admin Panel
          </div>
        </div>

        {!adminKey && (
          <div className="mt-8 rounded-[24px] bg-white/5 border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
            <div className="text-lg font-black tracking-tight">Admin Key Required</div>
            <div className="mt-2 text-white/50 font-medium">
              Changes save karne ke liye admin key enter karo.
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <input
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-blue-500/40"
                placeholder="Enter key"
              />
              <button
                onClick={unlockAdmin}
                disabled={keyLoading || !keyValue.trim()}
                className={`shrink-0 w-full sm:w-auto px-6 py-4 rounded-2xl font-black tracking-widest text-sm transition-all active:scale-95 ${
                  keyValue.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              >
                {keyLoading ? 'UNLOCKING...' : 'UNLOCK'}
              </button>
            </div>
            {keyError && <div className="mt-3 text-red-300 text-sm font-black">{keyError}</div>}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transition to Sync Section */}
          <div className="lg:col-span-2 rounded-[24px] bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="text-xl font-black tracking-tight flex items-center gap-2">
                  Advance Sync
                  <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">PW API</span>
                </div>
                <div className="mt-2 text-white/50 text-sm font-medium">
                  PW Bearer Token add karo aur seedha official batches sync karo.
                </div>
                <div className="mt-4 max-w-xl">
                  <input
                    value={pwToken}
                    onChange={(e) => setPwToken(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40 text-xs font-mono"
                    placeholder="Paste Bearer Token here..."
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={saveToken}
                  disabled={tokenLoading}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-black tracking-widest transition-all"
                >
                  {tokenLoading ? 'SAVING...' : 'SAVE TOKEN'}
                </button>
                <button
                  onClick={syncBatches}
                  disabled={isSyncing}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-black tracking-widest shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {isSyncing ? 'SYNCING...' : 'SYNC NOW'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
            <div className="text-xl font-black tracking-tight">Add Batch Manually</div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Title</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                  placeholder="Yakeen NEET 2027"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Subtitle</div>
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                  placeholder="Class 12+ • NEET"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Exam Label</div>
                <input
                  value={examLabel}
                  onChange={(e) => setExamLabel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                  placeholder="NEET 2027"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Language</div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                >
                  <option value="HINGLISH">HINGLISH</option>
                  <option value="HINDI">HINDI</option>
                  <option value="ENGLISH">ENGLISH</option>
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Start Date</div>
                <input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Price (₹)</div>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                  placeholder="5200"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Original Price (₹)</div>
                <input
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                  placeholder="6000"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <div className="text-xs font-black tracking-widest uppercase text-white/50">Image URL</div>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/40"
                  placeholder="https://..."
                />
              </label>
            </div>

            <button
              onClick={handleAdd}
              className="mt-6 w-full bg-blue-600 text-white py-4 rounded-2xl font-black tracking-widest text-sm hover:bg-blue-700 transition-all active:scale-95 inline-flex items-center justify-center gap-3"
            >
              <Plus size={18} />
              ADD BATCH
            </button>

            <div className="mt-6 text-white/40 text-xs font-bold">
              Preview: {formatINR(Number(price || 0))} / {formatINR(Number(originalPrice || 0))}
            </div>
          </div>

          <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xl font-black tracking-tight">All Batches</div>
              <div className="text-xs font-black tracking-widest uppercase text-white/40">
                {batches.length}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {batchesLoading && (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-white/5 border border-white/10 p-4 h-[72px]"
                    />
                  ))}
                </>
              )}
              {batches.map((b: Batch) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-black truncate">{b.title}</div>
                    <div className="text-white/50 text-sm font-bold truncate">{b.subtitle}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {!batchesLoading && !batches.length && (
                <div className="text-white/40 text-sm font-bold">No batches yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

