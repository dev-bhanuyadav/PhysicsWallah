import { supabase } from '@/lib/supabaseClient';

export type Batch = {
  id: string;
  pwId?: string;
  title: string;
  subtitle: string;
  examLabel: string;
  language: string;
  startDate: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  createdAt: number;
};

const STORAGE_KEY = 'pw_batches_v1';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function loadBatches(): Batch[] {
  const parsed = safeParse<Batch[]>(localStorage.getItem(STORAGE_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.filter(Boolean).filter((b) => typeof b === 'object' && !!(b as Batch).id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function isGlobalBatchesEnabled() { return true; }

export function seedIfEmpty() {
  const existing = loadBatches();
  if (existing.length) return;
  const seeded: Batch[] = [{
    id: crypto.randomUUID(),
    title: 'Yakeen NEET 2027',
    subtitle: 'Class 12+ • NEET',
    examLabel: 'NEET 2027',
    language: 'HINGLISH',
    startDate: '2026-04-14',
    price: 5200,
    originalPrice: 6000,
    imageUrl: 'https://static.pw.live/auth-fe/assets/images/pw_badge_v2_login.webp',
    createdAt: Date.now()
  }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
}

async function fetchWithTimeout(url: string, options: any, ms = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function listBatches(): Promise<Batch[]> {
  console.log("[listBatches] Starting fetch...");
  
  const results = await Promise.allSettled([
    // 1. Render API
    (async () => {
      try {
        const res = await fetchWithTimeout('/api/v1/pw-proxy/render/batches', {}, 5000);
        if (res.ok) {
          const d = await res.json();
          return Array.isArray(d) ? d : (d.data || []);
        }
      } catch (e) {
        console.warn("[listBatches] Render fetch failed or timed out");
      }
      return [];
    })(),

    // 2. Supabase API
    (async () => {
      if (!supabase) return [];
      try {
        const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id, pwId: r.pw_id, title: r.title, subtitle: r.subtitle,
            examLabel: r.exam_label, language: r.language, startDate: r.start_date,
            price: r.price, originalPrice: r.original_price, imageUrl: r.image_url,
            createdAt: new Date(r.created_at || Date.now()).getTime()
          }));
        }
        if (error) console.error("[listBatches] Supabase Error:", error);
      } catch (e) {
        console.error("[listBatches] Supabase crash:", e);
      }
      return [];
    })()
  ]);

  const renderBatches = results[0].status === 'fulfilled' ? (results[0].value as Batch[]) : [];
  const supabaseBatches = results[1].status === 'fulfilled' ? (results[1].value as Batch[]) : [];

  console.log(`[listBatches] Results - Render: ${renderBatches.length}, Supabase: ${supabaseBatches.length}`);

  const merged = [...renderBatches];
  const seenTitles = new Set(renderBatches.map(b => b.title.toLowerCase()));

  for (const b of supabaseBatches) {
    if (!seenTitles.has(b.title.toLowerCase())) {
      merged.push(b);
      seenTitles.add(b.title.toLowerCase());
    }
  }

  if (merged.length === 0) {
    console.log("[listBatches] No network batches found, returning local storage");
    return loadBatches();
  }

  return merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createBatch(batch: Omit<Batch, 'id' | 'createdAt'>, adminKey: string): Promise<Batch> {
  const res = await fetch('/api/v1/pw-proxy/render/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify(batch)
  });
  if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create batch');
  }
  return await res.json();
}

export async function removeBatch(id: string, adminKey: string): Promise<void> {
  const res = await fetch(`/api/v1/pw-proxy/render/batches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey }
  });
  if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete batch');
  }
}
