-- Members Table
create table public.members (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  symbol text not null,
  color text not null,
  role text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.members enable row level security;
create policy "Users can crud own members" on public.members using (auth.uid() = user_id);
