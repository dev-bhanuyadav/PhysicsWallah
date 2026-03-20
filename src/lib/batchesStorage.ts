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
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadBatches(): Batch[] {
  const parsed = safeParse<Batch[]>(localStorage.getItem(STORAGE_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed
    .filter(Boolean)
    .filter((b) => typeof b === 'object' && !!(b as Batch).id)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function saveBatches(batches: Batch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
}

export function addBatch(input: Omit<Batch, 'id' | 'createdAt'>): Batch {
  const batches = loadBatches();
  const next: Batch = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  saveBatches([next, ...batches]);
  return next;
}

export function deleteBatch(id: string) {
  const batches = loadBatches().filter((b) => b.id !== id);
  saveBatches(batches);
}

export function seedIfEmpty() {
  const existing = loadBatches();
  if (existing.length) return;
  const seeded: Batch[] = [
    {
      id: crypto.randomUUID(),
      title: 'Yakeen NEET 2027',
      subtitle: 'Class 12+ • NEET',
      examLabel: 'NEET 2027',
      language: 'HINGLISH',
      startDate: '2026-04-14',
      price: 5200,
      originalPrice: 6000,
      imageUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1400&auto=format&fit=crop',
      createdAt: Date.now(),
    },
  ];
  saveBatches(seeded);
}

export function isGlobalBatchesEnabled() {
  return !!supabase || !!(import.meta.env.VITE_API_BASE_URL as string | undefined);
}

type BatchRow = {
  id: string;
  pw_id: string;
  title: string;
  subtitle: string;
  exam_label: string;
  language: string;
  start_date: string;
  price: number;
  original_price: number;
  image_url: string;
  created_at: string | number;
};

function rowToBatch(r: BatchRow): Batch {
  const created =
    typeof r.created_at === 'number' ? r.created_at : new Date(r.created_at).getTime();
  return {
    id: r.id,
    pwId: r.pw_id,
    title: r.title,
    subtitle: r.subtitle,
    examLabel: r.exam_label,
    language: r.language,
    startDate: r.start_date,
    price: r.price,
    originalPrice: r.original_price,
    imageUrl: r.image_url,
    createdAt: Number.isFinite(created) ? created : Date.now(),
  };
}

async function tryFetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
    const url = base ? `${base}${path}` : path;
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listBatches(): Promise<Batch[]> {
  const api = await tryFetchJson<Batch[]>('/api/batches');
  if (api) return api;
  if (!supabase) return loadBatches();
  const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
  if (error) return loadBatches();
  return (data as BatchRow[]).map(rowToBatch);
}

export async function createBatch(
  input: Omit<Batch, 'id' | 'createdAt'>,
  adminKey?: string,
): Promise<Batch> {
  const api = await tryFetchJson<Batch>('/api/batches', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(adminKey ? { 'x-admin-key': adminKey } : {}),
    },
    body: JSON.stringify(input),
  });
  if (api) return api;
  if (!supabase) return addBatch(input);
  const row = {
    pw_id: (input as any).pwId || null,
    title: input.title,
    subtitle: input.subtitle,
    exam_label: input.examLabel,
    language: input.language,
    start_date: input.startDate,
    price: input.price,
    original_price: input.originalPrice,
    image_url: input.imageUrl,
  };
  const { data, error } = await supabase.from('batches').insert(row).select('*').single();
  if (error || !data) return addBatch(input);
  return rowToBatch(data as BatchRow);
}

export async function removeBatch(id: string, adminKey?: string): Promise<void> {
  const api = await tryFetchJson<{ ok: boolean }>('/api/batches/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: {
      ...(adminKey ? { 'x-admin-key': adminKey } : {}),
    },
  });
  if (api?.ok) return;
  if (!supabase) return deleteBatch(id);
  const { error } = await supabase.from('batches').delete().eq('id', id);
  if (error) deleteBatch(id);
}

