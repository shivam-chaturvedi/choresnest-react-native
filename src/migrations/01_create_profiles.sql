-- Create a table for public profiles (mirrors users table)
create table profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  name text,
  is_guest boolean default false,
  has_completed_onboarding boolean default false,
  active_profile_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- Set up Row Level Security!
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- This triggers a function every time a new user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function on new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
