-- Transactions (Finance)
create table transactions (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  date text not null, -- YYYY-MM-DD
  icon text,
  type text not null, -- income, expense
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_transactions_profile_id on transactions(profile_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_type on transactions(type);
create index idx_transactions_category on transactions(category);

-- Budgets (Finance Budgets)
create table budgets (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  category text not null,
  amount numeric not null,
  month text not null, -- YYYY-MM
  notification_id text,
  alert_threshold_percent numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_budgets_profile_id on budgets(profile_id);
create index idx_budgets_month on budgets(month);
create index idx_budgets_category on budgets(category);

-- Enable RLS
alter table transactions enable row level security;
alter table budgets enable row level security;

-- Policies for transactions
create policy "Users can view own transactions"
  on transactions for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own transactions"
  on transactions for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own transactions"
  on transactions for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own transactions"
  on transactions for delete
  using ( auth.uid() = profile_id );

-- Policies for budgets
create policy "Users can view own budgets"
  on budgets for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own budgets"
  on budgets for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own budgets"
  on budgets for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own budgets"
  on budgets for delete
  using ( auth.uid() = profile_id );
