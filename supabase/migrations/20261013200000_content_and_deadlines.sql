-- Editable structured content: weekly schedules, classes, exam-study methods, exams.
-- One JSON blob per key, upserted whenever Blu or Gabe edits something in the app.
create table if not exists public.content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.content enable row level security;

drop policy if exists "read content" on public.content;
drop policy if exists "insert content" on public.content;
drop policy if exists "update content" on public.content;

create policy "read content" on public.content
  for select to anon using (true);

create policy "insert content" on public.content
  for insert to anon with check (true);

create policy "update content" on public.content
  for update to anon using (true) with check (true);

-- Deadlines: editable list. Rows with id starting "canvas:" are written by the weekly
-- Canvas sync (scripts/sync-deadlines.mjs) and are safe to overwrite automatically.
-- Any row a human edits in the app gets source='manual' and is never touched by the sync.
create table if not exists public.deadlines (
  id text primary key,
  date date not null,
  cls text not null,
  title text not null,
  note text not null default '',
  is_exam boolean not null default false,
  source text not null default 'manual',
  updated_at timestamptz not null default now()
);

alter table public.deadlines enable row level security;

drop policy if exists "read deadlines" on public.deadlines;
drop policy if exists "insert deadlines" on public.deadlines;
drop policy if exists "update deadlines" on public.deadlines;
drop policy if exists "delete deadlines" on public.deadlines;

create policy "read deadlines" on public.deadlines
  for select to anon using (true);

create policy "insert deadlines" on public.deadlines
  for insert to anon with check (true);

create policy "update deadlines" on public.deadlines
  for update to anon using (true) with check (true);

create policy "delete deadlines" on public.deadlines
  for delete to anon using (true);
