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

export async function listBatches(): Promise<Batch[]> {
  // Use Render API Proxy first
  try {
    const res = await fetch('/api/v1/pw-proxy/render/batches');
    if (res.ok) {
      const d = await res.json();
      return Array.isArray(d) ? d : (d.data || []);
    }
  } catch {}
  
  if (!supabase) return loadBatches();
  const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
  if (error || !data) return loadBatches();
  
  return data.map((r: any) => ({
    id: r.id, pwId: r.pw_id, title: r.title, subtitle: r.subtitle,
    examLabel: r.exam_label, language: r.language, startDate: r.start_date,
    price: r.price, originalPrice: r.original_price, imageUrl: r.image_url,
    createdAt: new Date(r.created_at).getTime()
  }));
}
