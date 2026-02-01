-- 1. Transactions
create table public.transactions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  amount numeric not null,
  date text not null,
  icon text not null,
  type text not null,
  category text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Users can crud own transactions" on public.transactions using (auth.uid() = user_id);

-- 2. Budgets
create table public.budgets (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  category text not null,
  amount numeric not null,
  month text not null,
  notification_id text,
  alert_threshold_percent numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.budgets enable row level security;
create policy "Users can crud own budgets" on public.budgets using (auth.uid() = user_id);
