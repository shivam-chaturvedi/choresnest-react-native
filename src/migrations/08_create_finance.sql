-- Transactions (Finance)
create table transactions (
  id text primary key,
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

create index idx_transactions_date on transactions(date);
create index idx_transactions_type on transactions(type);
create index idx_transactions_category on transactions(category);

-- Budgets (Finance Budgets)
create table budgets (
  id text primary key,
  category text not null,
  amount numeric not null,
  month text not null, -- YYYY-MM
  notification_id text,
  alert_threshold_percent numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_budgets_month on budgets(month);
create index idx_budgets_category on budgets(category);

-- Enable RLS
alter table transactions enable row level security;
alter table budgets enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on transactions for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on budgets for all using (auth.role() = 'authenticated');
