-- 1. Lists
create table public.lists (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  type text not null,
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.lists enable row level security;
create policy "Users can crud own lists" on public.lists using (auth.uid() = user_id);

-- 2. List Categories
create table public.list_categories (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  icon text not null,
  color text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.list_categories enable row level security;
create policy "Users can crud own list_categories" on public.list_categories using (auth.uid() = user_id);

-- 3. List Items
create table public.list_items (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  list_id text references public.lists(id) on delete cascade,
  name text not null,
  quantity numeric not null,
  unit text not null,
  category_id text,
  added_by_id text,
  is_completed boolean default false,
  purchased_at numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.list_items enable row level security;
create policy "Users can crud own list_items" on public.list_items using (auth.uid() = user_id);
