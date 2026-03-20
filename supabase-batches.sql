create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null,
  exam_label text not null,
  language text not null,
  start_date text not null,
  price numeric not null,
  original_price numeric not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.batches enable row level security;

create policy "batches_read_all" on public.batches
for select
using (true);

create policy "batches_write_all" on public.batches
for insert
with check (true);

create policy "batches_delete_all" on public.batches
for delete
using (true);

