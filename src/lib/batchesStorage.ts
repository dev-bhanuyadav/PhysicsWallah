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

export async function listBatches(): Promise<Batch[]> {
  let renderBatches: Batch[] = [];
  let supabaseBatches: Batch[] = [];

  // 1. Attempt Render Fetch
  try {
    const res = await fetch('/api/v1/pw-proxy/render/batches');
    if (res.ok) {
      const d = await res.json();
      renderBatches = Array.isArray(d) ? d : (d.data || []);
    }
  } catch (e) {
    console.error("Render fetch failed:", e);
  }
  
  // 2. Attempt Supabase Fetch
  if (supabase) {
    try {
      const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        supabaseBatches = data.map((r: any) => ({
          id: r.id, pwId: r.pw_id, title: r.title, subtitle: r.subtitle,
          examLabel: r.exam_label, language: r.language, startDate: r.start_date,
          price: r.price, originalPrice: r.original_price, imageUrl: r.image_url,
          createdAt: new Date(r.created_at).getTime()
        }));
      }
    } catch (e) {
      console.error("Supabase fetch failed:", e);
    }
  }

  // 3. Fallback to Local if both fail and we have nothing
  if (renderBatches.length === 0 && supabaseBatches.length === 0) {
    return loadBatches();
  }

  // 4. Merge results (preferring Render IDs if they conflict, though unlikely)
  const merged = [...renderBatches];
  const renderTitles = new Set(renderBatches.map(b => b.title.toLowerCase()));
  
  for (const sb of supabaseBatches) {
    // Only add Supabase batch if it's not already in Render list (by title to avoid dupes)
    if (!renderTitles.has(sb.title.toLowerCase())) {
        merged.push(sb);
    }
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
