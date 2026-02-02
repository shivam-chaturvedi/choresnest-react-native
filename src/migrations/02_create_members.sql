create table members (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  symbol text not null,
  color text not null,
  role text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_members_profile_id on members(profile_id);

alter table members enable row level security;

-- Users can only see their own family members
create policy "Users can view own members"
  on members for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own members"
  on members for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own members"
  on members for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own members"
  on members for delete
  using ( auth.uid() = profile_id );
