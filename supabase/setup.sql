-- Blu's Game Plan: check-off storage.
-- Run once in the Supabase SQL editor (or via the Supabase CLI).

create table if not exists public.checks (
  id text primary key,
  done boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.checks enable row level security;

drop policy if exists "read checks" on public.checks;
drop policy if exists "insert checks" on public.checks;
drop policy if exists "update checks" on public.checks;

create policy "read checks" on public.checks
  for select to anon using (true);

create policy "insert checks" on public.checks
  for insert to anon with check (true);

create policy "update checks" on public.checks
  for update to anon using (true) with check (true);
