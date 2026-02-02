-- List Categories (for grocery lists)
create table list_categories (
  id text primary key,
  name text not null,
  icon text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- Lists (Grocery/Todo Lists)
create table lists (
  id text primary key,
  name text not null,
  type text not null, -- grocery, todo
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- List Items (Grocery/Todo Items)
create table list_items (
  id text primary key,
  list_id text references lists(id) on delete cascade,
  name text not null,
  quantity numeric default 1,
  unit text,
  category_id text references list_categories(id) on delete set null,
  added_by_id text references members(id) on delete set null,
  is_completed boolean default false,
  purchased_at numeric, -- timestamp
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_list_items_list_id on list_items(list_id);
create index idx_list_items_category_id on list_items(category_id);
create index idx_list_items_added_by_id on list_items(added_by_id);

-- Enable RLS
alter table list_categories enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on list_categories for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on lists for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on list_items for all using (auth.role() = 'authenticated');
