create table members (
  id text primary key,
  name text not null,
  symbol text not null,
  color text not null,
  role text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

alter table members enable row level security;
-- Policy can be added later as permissions are defined
create policy "Enable all access for authenticated users" on members for all using (auth.role() = 'authenticated');
