-- List Categories (for grocery lists)
create table list_categories (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  icon text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_list_categories_profile_id on list_categories(profile_id);

-- Lists (Grocery/Todo Lists)
create table lists (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- grocery, todo
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_lists_profile_id on lists(profile_id);

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

-- Policies for list_categories
create policy "Users can view own list_categories"
  on list_categories for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own list_categories"
  on list_categories for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own list_categories"
  on list_categories for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own list_categories"
  on list_categories for delete
  using ( auth.uid() = profile_id );

-- Policies for lists
create policy "Users can view own lists"
  on lists for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own lists"
  on lists for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own lists"
  on lists for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own lists"
  on lists for delete
  using ( auth.uid() = profile_id );

-- Policies for list_items (inherit from parent list)
create policy "Users can view own list_items"
  on list_items for select
  using ( 
    exists (
      select 1 from lists 
      where lists.id = list_items.list_id 
      and lists.profile_id = auth.uid()
    )
  );

create policy "Users can insert own list_items"
  on list_items for insert
  with check ( 
    exists (
      select 1 from lists 
      where lists.id = list_items.list_id 
      and lists.profile_id = auth.uid()
    )
  );

create policy "Users can update own list_items"
  on list_items for update
  using ( 
    exists (
      select 1 from lists 
      where lists.id = list_items.list_id 
      and lists.profile_id = auth.uid()
    )
  );

create policy "Users can delete own list_items"
  on list_items for delete
  using ( 
    exists (
      select 1 from lists 
      where lists.id = list_items.list_id 
      and lists.profile_id = auth.uid()
    )
  );

