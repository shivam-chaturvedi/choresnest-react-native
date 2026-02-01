-- 1. Folders
create table public.folders (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  icon text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.folders enable row level security;
create policy "Users can crud own folders" on public.folders using (auth.uid() = user_id);

-- 2. Notes
create table public.notes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  preview text not null,
  tag text,
  color text not null,
  is_starred boolean default false,
  updated_at_timestamp numeric,
  folder_id text,
  blocks_json text,
  created_at timestamptz default now()
);
alter table public.notes enable row level security;
create policy "Users can crud own notes" on public.notes using (auth.uid() = user_id);
