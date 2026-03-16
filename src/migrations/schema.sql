-- RESET database objects so the schema can rebuild clean
BEGIN;

-- ensure Supabase auth trigger+function start from scratch
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- helper triggers + functions (settings/members/notes/documents)
DROP TRIGGER IF EXISTS force_profile_id_settings ON public.settings;
DROP TRIGGER IF EXISTS force_profile_id_members ON public.members;
DROP TRIGGER IF EXISTS force_profile_id_notes ON public.notes;
DROP FUNCTION IF EXISTS public.force_profile_id();
DROP TRIGGER IF EXISTS documents_before_write ON public.documents;
DROP FUNCTION IF EXISTS public.documents_before_write_hook();
DROP TRIGGER IF EXISTS category_color_mappings_before_write ON public.budget_category_color_mappings;
DROP FUNCTION IF EXISTS public.category_color_mappings_before_write_hook();

-- drop published type used for document uploads
DROP TYPE IF EXISTS public.documents_upload_status;

-- tear down all schema tables (child tables first)
DROP TABLE IF EXISTS public.list_items CASCADE;
DROP TABLE IF EXISTS public.collection_recipes CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.meal_plans CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.budget_category_color_mappings CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.list_categories CASCADE;
DROP TABLE IF EXISTS public.lists CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.app_lock CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.quiet_hours CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- clear storage policies used by buckets and vault docs
DROP POLICY IF EXISTS "Vault objects select own" ON storage.objects;
DROP POLICY IF EXISTS "Vault objects insert own" ON storage.objects;
DROP POLICY IF EXISTS "Vault objects update own" ON storage.objects;
DROP POLICY IF EXISTS "Vault objects delete own" ON storage.objects;
DROP POLICY IF EXISTS "vault-documents full access" ON storage.objects;
DROP POLICY IF EXISTS "recipe-images full access" ON storage.objects;
DROP POLICY IF EXISTS "recipe-audio full access" ON storage.objects;
DROP POLICY IF EXISTS "recipe-thumbnails full access" ON storage.objects;
DROP POLICY IF EXISTS "Public read recipe-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read recipe-audio" ON storage.objects;
DROP POLICY IF EXISTS "Public read recipe-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload recipe-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload recipe-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload recipe-thumbnails" ON storage.objects;

-- remove published tables from supabase_realtime so the reset can re-add them
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'list_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE list_items;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE lists;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'list_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE list_categories;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'budget_category_color_mappings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE budget_category_color_mappings;
  END IF;
END;
$$;

-- remove bucket definitions (clears uploaded files if you re-create later)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
  ) THEN
    DELETE FROM storage.buckets
    WHERE id IN ('recipe-images', 'recipe-audio', 'recipe-thumbnails', 'vault-documents');
  END IF;
END;
$$;

COMMIT;


-- Rebuild schema migrations follow
-- 01_create_profiles.sql
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


-- 02_create_members.sql
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


-- 03_create_settings.sql
-- Settings (Key-Value Store)
create table settings (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  key text not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_settings_profile_id on settings(profile_id);
create index idx_settings_key on settings(key);

-- App Lock
create table app_lock (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  enabled boolean default false,
  biometric_enabled boolean default false,
  pin_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_app_lock_profile_id on app_lock(profile_id);

-- User Preferences
create table user_preferences (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  country_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_user_preferences_profile_id on user_preferences(profile_id);

-- Notification Preferences
create table notification_preferences (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  category text not null,
  enabled boolean default true,
  reminder_offset_minutes numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_notif_prefs_profile_id on notification_preferences(profile_id);
create index idx_notif_prefs_category on notification_preferences(category);

-- Quiet Hours
create table quiet_hours (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  enabled boolean default false,
  start_hour integer,
  start_minute integer,
  end_hour integer,
  end_minute integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_quiet_hours_profile_id on quiet_hours(profile_id);

-- App Settings
create table app_settings (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  has_completed_onboarding boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_app_settings_profile_id on app_settings(profile_id);

-- Enable RLS for all
alter table settings enable row level security;
alter table app_lock enable row level security;
alter table user_preferences enable row level security;
alter table notification_preferences enable row level security;
alter table quiet_hours enable row level security;
alter table app_settings enable row level security;

-- RLS Policies - Users can only access their own settings
create policy "Users can view own settings"
  on settings for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own settings"
  on settings for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own settings"
  on settings for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own settings"
  on settings for delete
  using ( auth.uid() = profile_id );

-- App Lock policies
create policy "Users can view own app_lock"
  on app_lock for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own app_lock"
  on app_lock for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own app_lock"
  on app_lock for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own app_lock"
  on app_lock for delete
  using ( auth.uid() = profile_id );

-- User Preferences policies
create policy "Users can view own user_preferences"
  on user_preferences for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own user_preferences"
  on user_preferences for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own user_preferences"
  on user_preferences for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own user_preferences"
  on user_preferences for delete
  using ( auth.uid() = profile_id );

-- Notification Preferences policies
create policy "Users can view own notification_preferences"
  on notification_preferences for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own notification_preferences"
  on notification_preferences for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own notification_preferences"
  on notification_preferences for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own notification_preferences"
  on notification_preferences for delete
  using ( auth.uid() = profile_id );

-- Quiet Hours policies
create policy "Users can view own quiet_hours"
  on quiet_hours for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own quiet_hours"
  on quiet_hours for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own quiet_hours"
  on quiet_hours for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own quiet_hours"
  on quiet_hours for delete
  using ( auth.uid() = profile_id );

-- App Settings policies
create policy "Users can view own app_settings"
  on app_settings for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own app_settings"
  on app_settings for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own app_settings"
  on app_settings for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own app_settings"
  on app_settings for delete
  using ( auth.uid() = profile_id );


-- 04_create_events_tasks.sql
-- Events (Calendar Events)
create table events (
  id text primary key,
  title text not null,
  icon text,
  date text not null, -- ISO Date YYYY-MM-DD
  time text not null,
  end_time text,
  end_date text,
  member_id text references members(id) on delete cascade,
  location text,
  description text,
  notes text,
  visibility text default 'default', -- default, public, private
  time_zone text,
  is_recurring boolean default false,
  recurrence_rule text,
  recurrence_end_date text,
  notification_id text,
  reminder_offset_minutes numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_events_date on events(date);
create index idx_events_member_id on events(member_id);

-- Tasks
create table tasks (
  id text primary key,
  name text not null,
  icon text,
  status text default 'pending', -- pending, done
  priority text default 'medium', -- high, medium, low
  due_display text, -- "Today", "Tomorrow" etc
  date text not null, -- YYYY-MM-DD
  assignee_id text references members(id) on delete set null,
  tab text, -- "My Tasks", "Family Tasks"
  notification_id text,
  reminder_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_tasks_date on tasks(date);
create index idx_tasks_assignee_id on tasks(assignee_id);
create index idx_tasks_status on tasks(status);

-- Enable RLS
alter table events enable row level security;
alter table tasks enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on events for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on tasks for all using (auth.role() = 'authenticated');


-- 05_create_lists.sql
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



-- 06_create_recipes.sql
-- Recipes
create table recipes (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  prep_time text,
  cook_time text,
  servings numeric,
  difficulty text,
  calories text,
  image_path text,
  is_saved boolean default false,
  rating numeric,
  author text,
  ingredients_json text, -- JSON array
  instructions_json text, -- JSON array
  tags_json text, -- JSON array
  nutrition_json text, -- JSON object
  audio_path text,
  duration numeric,
  url text,
  images_json text, -- JSON array of additional images
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_recipes_profile_id on recipes(profile_id);

-- Collections (Recipe Collections)
create table collections (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_collections_profile_id on collections(profile_id);

-- Collection Recipes (Many-to-Many link)
create table collection_recipes (
  id text primary key,
  collection_id text references collections(id) on delete cascade,
  recipe_id text references recipes(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false,
  unique(collection_id, recipe_id)
);

create index idx_collection_recipes_collection_id on collection_recipes(collection_id);
create index idx_collection_recipes_recipe_id on collection_recipes(recipe_id);

-- Meal Plans
create table meal_plans (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  date text not null, -- YYYY-MM-DD
  type text not null, -- breakfast, lunch, dinner, snack
  recipe_id text references recipes(id) on delete cascade,
  is_cooked boolean default false,
  notification_id text,
  reminder_minutes_before numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_meal_plans_profile_id on meal_plans(profile_id);
create index idx_meal_plans_date on meal_plans(date);
create index idx_meal_plans_recipe_id on meal_plans(recipe_id);

-- Enable RLS
alter table recipes enable row level security;
alter table collections enable row level security;
alter table collection_recipes enable row level security;
alter table meal_plans enable row level security;

-- Policies for recipes
create policy "Users can view own recipes"
  on recipes for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own recipes"
  on recipes for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own recipes"
  on recipes for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own recipes"
  on recipes for delete
  using ( auth.uid() = profile_id );

-- Policies for collections
create policy "Users can view own collections"
  on collections for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own collections"
  on collections for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own collections"
  on collections for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own collections"
  on collections for delete
  using ( auth.uid() = profile_id );

-- Policies for collection_recipes (inherit from collection)
create policy "Users can view own collection_recipes"
  on collection_recipes for select
  using ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

create policy "Users can insert own collection_recipes"
  on collection_recipes for insert
  with check ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

create policy "Users can update own collection_recipes"
  on collection_recipes for update
  using ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

create policy "Users can delete own collection_recipes"
  on collection_recipes for delete
  using ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

-- Policies for meal_plans
create policy "Users can view own meal_plans"
  on meal_plans for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own meal_plans"
  on meal_plans for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own meal_plans"
  on meal_plans for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own meal_plans"
  on meal_plans for delete
  using ( auth.uid() = profile_id );



-- 07_create_documents.sql
-- Documents (Vault Documents)
create table documents (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null,
  icon text,
  date text not null,
  expiry_date text,
  member_id text, -- can be 'global' or reference members(id)
  shared_with_json text, -- JSON array
  file_path text, -- Local FS path or cloud storage URL
  meta_json text, -- Flexible metadata for different doc types
  notification_ids_json text, -- Array of notification IDs for multiple reminders
  reminder_days_before numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_documents_profile_id on documents(profile_id);
create index idx_documents_member_id on documents(member_id);
create index idx_documents_type on documents(type);
create index idx_documents_date on documents(date);

-- Enable RLS
alter table documents enable row level security;

-- Policies
create policy "Users can view own documents"
  on documents for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own documents"
  on documents for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own documents"
  on documents for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own documents"
  on documents for delete
  using ( auth.uid() = profile_id );


-- 08_create_finance.sql
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


-- 34_budget_category_color_mappings.sql
-- Budget Category Color Mappings (Finance metadata)
create table budget_category_color_mappings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  category_key text not null,
  color_hex text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false,
  version integer default 0
);

create unique index idx_budget_category_color_mappings_profile_category on budget_category_color_mappings(profile_id, category_key);
create index idx_budget_category_color_mappings_profile_updated_id on budget_category_color_mappings(profile_id, updated_at);

alter table budget_category_color_mappings enable row level security;

create policy "Users can view own category color mappings"
  on budget_category_color_mappings for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own category color mappings"
  on budget_category_color_mappings for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own category color mappings"
  on budget_category_color_mappings for update
  using ( auth.uid() = profile_id )
  with check ( auth.uid() = profile_id );

create policy "Users can delete own category color mappings"
  on budget_category_color_mappings for delete
  using ( auth.uid() = profile_id );

create or replace function public.category_color_mappings_before_write_hook()
returns trigger as $$
declare
  requester_id uuid;
begin
  begin
    requester_id := auth.uid()::uuid;
  exception when invalid_text_representation then
    requester_id := null;
  end;

  if tg_op = 'INSERT' then
    if new.profile_id is null then
      if requester_id is null then
        raise exception 'category_color_mappings.profile_id cannot be null';
      end if;
      new.profile_id := requester_id;
    end if;
    new.created_at := coalesce(new.created_at, now());
    new.deleted := coalesce(new.deleted, false);
    new.version := coalesce(new.version, 0);
  else
    if new.profile_id is null then
      new.profile_id := coalesce(old.profile_id, requester_id);
    end if;
    new.version := coalesce(new.version, coalesce(old.version, 0)) + 1;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists category_color_mappings_before_write on public.budget_category_color_mappings;
create trigger category_color_mappings_before_write
  before insert or update on public.budget_category_color_mappings
  for each row
  execute function public.category_color_mappings_before_write_hook();


-- 09_create_notes.sql
-- Folders (Note Folders)
create table folders (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_folders_profile_id on folders(profile_id);

-- Notes
create table notes (
  id text primary key,
  title text not null,
  preview text,
  tag text,
  color text,
  is_starred boolean default false,
  folder_id text references folders(id) on delete cascade,
  blocks_json text, -- JSON array of note blocks
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_notes_folder_id on notes(folder_id);
create index idx_notes_is_starred on notes(is_starred);
create index idx_notes_updated_at on notes(updated_at);

-- Enable RLS
alter table folders enable row level security;
alter table notes enable row level security;

-- Policies for folders
create policy "Users can view own folders"
  on folders for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own folders"
  on folders for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own folders"
  on folders for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own folders"
  on folders for delete
  using ( auth.uid() = profile_id );

-- Policies for notes (inherit from folder)
create policy "Users can view own notes"
  on notes for select
  using ( 
    exists (
      select 1 from folders 
      where folders.id = notes.folder_id 
      and folders.profile_id = auth.uid()
    )
  );

create policy "Users can insert own notes"
  on notes for insert
  with check ( 
    exists (
      select 1 from folders 
      where folders.id = notes.folder_id 
      and folders.profile_id = auth.uid()
    )
  );

create policy "Users can update own notes"
  on notes for update
  using ( 
    exists (
      select 1 from folders 
      where folders.id = notes.folder_id 
      and folders.profile_id = auth.uid()
    )
  );

create policy "Users can delete own notes"
  on notes for delete
  using ( 
    exists (
      select 1 from folders 
      where folders.id = notes.folder_id 
      and folders.profile_id = auth.uid()
    )
  );


-- 10_update_profiles_trigger.sql
-- Update handle_new_user function to include active_profile_id
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, active_profile_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.id -- Set active_profile_id to the user's own ID by default
  );
  return new;
end;
$$ language plpgsql security definer;


-- 11_force_profile_id.sql
-- Function to automatically set profile_id to the authenticated user's ID
create or replace function public.force_profile_id()
returns trigger as $$
begin
  -- Only override if it's separate from what it should be (or missing)
  -- This enforces that a user can only write data for their own profile
  if auth.uid() is not null then
    new.profile_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for settings
drop trigger if exists force_profile_id_settings on public.settings;
create trigger force_profile_id_settings
before insert or update on public.settings
for each row execute procedure public.force_profile_id();

-- Trigger for members
drop trigger if exists force_profile_id_members on public.members;
create trigger force_profile_id_members
before insert or update on public.members
for each row execute procedure public.force_profile_id();


-- 12_add_profile_id_to_events_tasks.sql
-- Add profile_id to events table
alter table events add column profile_id uuid references profiles(id) on delete cascade;

-- Add profile_id to tasks table
alter table tasks add column profile_id uuid references profiles(id) on delete cascade;

-- Create indexes for profile_id
create index idx_events_profile_id on events(profile_id);
create index idx_tasks_profile_id on tasks(profile_id);

-- Update existing records to set profile_id (this will need to be done per user)
-- Note: This is a placeholder - actual migration should set profile_id based on member_id
-- For now, we'll rely on RLS and application logic to ensure profile_id is set

-- Update RLS policies for events
drop policy if exists "Enable all access for authenticated users" on events;
create policy "Users can view own events"
  on events for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own events"
  on events for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own events"
  on events for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own events"
  on events for delete
  using ( auth.uid() = profile_id );

-- Update RLS policies for tasks
drop policy if exists "Enable all access for authenticated users" on tasks;
create policy "Users can view own tasks"
  on tasks for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own tasks"
  on tasks for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own tasks"
  on tasks for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own tasks"
  on tasks for delete
  using ( auth.uid() = profile_id );

-- Make profile_id NOT NULL after setting values (run this after data migration)
-- alter table events alter column profile_id set not null;
-- alter table tasks alter column profile_id set not null;


-- 13_fix_rls_policies.sql
-- Migration 13: Fix RLS policies for list_items and user_preferences
-- This migration ensures proper RLS policies and data validation

-- 1. Ensure list_items cannot have empty list_id (add constraint if not exists)
-- Note: We can't add a NOT NULL constraint if there are existing NULL values
-- But we can add a check constraint for empty strings
-- First check if the table exists
DO $$ 
BEGIN
    -- Check if list_items table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        -- Add check constraint to prevent empty list_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'list_items_list_id_not_empty'
        ) THEN
            ALTER TABLE list_items 
            ADD CONSTRAINT list_items_list_id_not_empty 
            CHECK (list_id IS NULL OR (list_id IS NOT NULL AND length(trim(list_id)) > 0));
        END IF;
    END IF;
END $$;

-- 2. Update RLS policies for list_items to handle NULL/empty list_id gracefully
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can insert own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can update own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can delete own list_items" ON list_items;

        -- Recreate policies with better validation
        -- View: Only show items that belong to user's lists AND have valid list_id
        CREATE POLICY "Users can view own list_items"
          ON list_items FOR SELECT
          USING ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );

        -- Insert: Must have valid list_id that belongs to user
        CREATE POLICY "Users can insert own list_items"
          ON list_items FOR INSERT
          WITH CHECK ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );

        -- Update: Must have valid list_id that belongs to user
        CREATE POLICY "Users can update own list_items"
          ON list_items FOR UPDATE
          USING ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          )
          WITH CHECK (
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );

        -- Delete: Must have valid list_id that belongs to user
        CREATE POLICY "Users can delete own list_items"
          ON list_items FOR DELETE
          USING ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 3. Ensure user_preferences always has profile_id (recreate policies to be explicit)
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own user_preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can insert own user_preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can update own user_preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can delete own user_preferences" ON user_preferences;

        -- Recreate with explicit profile_id checks
        CREATE POLICY "Users can view own user_preferences"
          ON user_preferences FOR SELECT
          USING ( auth.uid() = profile_id );

        CREATE POLICY "Users can insert own user_preferences"
          ON user_preferences FOR INSERT
          WITH CHECK ( 
            auth.uid() = profile_id 
            AND profile_id IS NOT NULL
          );

        CREATE POLICY "Users can update own user_preferences"
          ON user_preferences FOR UPDATE
          USING ( auth.uid() = profile_id )
          WITH CHECK ( 
            auth.uid() = profile_id 
            AND profile_id IS NOT NULL
          );

        CREATE POLICY "Users can delete own user_preferences"
          ON user_preferences FOR DELETE
          USING ( auth.uid() = profile_id );
    END IF;
END $$;

-- 4. Clean up any orphaned list_items with empty list_id
-- This will delete items that can't be synced anyway
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        DELETE FROM list_items 
        WHERE list_id IS NULL 
           OR length(trim(list_id)) = 0;
    END IF;
END $$;

-- 5. Create index for better performance on list_id lookups
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_list_items_list_id_valid 
        ON list_items(list_id) 
        WHERE list_id IS NOT NULL AND length(trim(list_id)) > 0;
    END IF;
END $$;


-- 14_add_notes_profile_id.sql
-- Migration 14: Align notes with profile-aware RLS
-- Adds a profile_id column, backfills existing rows, and simplifies the RLS policies.

-- 1. Add profile_id column so every note can be owned directly.
alter table notes
  add column if not exists profile_id uuid references profiles(id) on delete cascade;

-- 2. Index the new column for faster lookups.
create index if not exists idx_notes_profile_id on notes(profile_id);

-- 3. Backfill profile_id from the owning folder whenever possible.
update notes
set profile_id = folders.profile_id
from folders
where notes.folder_id = folders.id
  and notes.profile_id is null;

-- 4. Recreate the policies so they rely on the note's owner while still verifying the folder.
drop policy if exists "Users can view own notes" on notes;
drop policy if exists "Users can insert own notes" on notes;
drop policy if exists "Users can update own notes" on notes;
drop policy if exists "Users can delete own notes" on notes;

create policy "Users can view own notes"
  on notes for select
  using (
    auth.uid() = profile_id
    and exists (
      select 1 from folders
      where folders.id = notes.folder_id
        and folders.profile_id = auth.uid()
    )
  );

create policy "Users can insert own notes"
  on notes for insert
  with check (
    auth.uid() = profile_id
    and folder_id is not null
    and exists (
      select 1 from folders
      where folders.id = folder_id
        and folders.profile_id = auth.uid()
    )
  );

create policy "Users can update own notes"
  on notes for update
  using (
    auth.uid() = profile_id
    and folder_id is not null
    and exists (
      select 1 from folders
      where folders.id = folder_id
        and folders.profile_id = auth.uid()
    )
  )
  with check (
    auth.uid() = profile_id
    and folder_id is not null
    and exists (
      select 1 from folders
      where folders.id = folder_id
        and folders.profile_id = auth.uid()
    )
  );

create policy "Users can delete own notes"
  on notes for delete
  using (
    auth.uid() = profile_id
    and folder_id is not null
    and exists (
      select 1 from folders
      where folders.id = folder_id
        and folders.profile_id = auth.uid()
    )
  );

-- 5. Enforce profile ownership automatically whenever a client writes to notes.
drop trigger if exists force_profile_id_notes on public.notes;
create trigger force_profile_id_notes
  before insert or update on public.notes
  for each row execute procedure public.force_profile_id();


-- 15_relax_notes_insert_policy.sql
-- Migration 15: Relax notes insert policy to only enforce ownership via USING clause

-- Drop the existing insert policy so we can replace it
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;

-- Recreate the policy that uses the folder/owner check in the USING clause
-- but allows any record that satisfies the ownership check to be inserted (WITH CHECK TRUE).
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND folder_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM folders
      WHERE folders.id = folder_id
        AND folders.profile_id = auth.uid()
    )
  );


-- 16_altering_for_sync.sql
BEGIN;

-- Add version column to every sync-safe table (default 0, never null).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE app_lock ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE quiet_hours ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE list_categories ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Ensure updated_at exists and is maintained (PostgreSQL default + trigger if desired).
-- (Optional) create trigger to auto-update 'updated_at' on writes if missing in existing schema.

-- Backfill profile_id for events/tasks so RLS continues to work cleanly.
ALTER TABLE events ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

UPDATE events
SET profile_id = m.profile_id
FROM members m
WHERE events.profile_id IS NULL AND events.member_id IS NOT NULL
  AND m.id = events.member_id;

UPDATE tasks
SET profile_id = m.profile_id
FROM members m
WHERE tasks.profile_id IS NULL AND tasks.assignee_id IS NOT NULL
  AND m.id = tasks.assignee_id;

ALTER TABLE events ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN profile_id SET NOT NULL;

-- Composite indexes for profile-scoped tables. These improve cursor pagination performance.
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id ON members(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_settings_profile_updated_id ON settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_lock_profile_updated_id ON app_lock(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_updated_id ON user_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_updated_id ON notification_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_profile_updated_id ON quiet_hours(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_updated_id ON app_settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_events_profile_updated_id ON events(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_updated_id ON tasks(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_lists_profile_updated_id ON lists(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_categories_profile_updated_id ON list_categories(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated_id ON recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated_id ON collections(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_updated_id ON meal_plans(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_updated_id ON transactions(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_updated_id ON budgets(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_folders_profile_updated_id ON folders(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notes_profile_updated_id ON notes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_documents_profile_updated_id ON documents(profile_id, updated_at, id);

-- Global index for profiles so cursor pagination stays deterministic.
CREATE INDEX IF NOT EXISTS idx_profiles_updated_id ON profiles(updated_at, id);

COMMIT;

NOTIFY pgrst, 'reload schema';


-- 17_sync_hardening.sql
BEGIN;

-- Remove redundant onboarding flag from profiles (app_settings is now the single source of truth)
ALTER TABLE profiles DROP COLUMN IF EXISTS has_completed_onboarding;

-- Ensure finance tables have enforced timestamps, tombstones, and versioning
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE transactions SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE transactions SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE transactions ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE transactions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE transactions ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE transactions ALTER COLUMN deleted SET NOT NULL;

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE budgets SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE budgets SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE budgets ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE budgets ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE budgets ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE budgets ALTER COLUMN deleted SET NOT NULL;

-- Harden notes/folders schema
UPDATE notes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE notes SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE notes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE notes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE notes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE notes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE notes ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE notes ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE notes ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

UPDATE folders SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE folders SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE folders ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE folders ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE folders ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE folders ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE folders ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE folders ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE folders ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Add profile_id to list_items and collection_recipes (backfill from parents)
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
UPDATE list_items
SET profile_id = lists.profile_id
FROM lists
WHERE list_items.profile_id IS NULL
  AND list_items.list_id = lists.id;
ALTER TABLE list_items ALTER COLUMN profile_id SET NOT NULL;
UPDATE list_items SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE list_items SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE list_items ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE list_items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE list_items ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE list_items ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
UPDATE collection_recipes
SET profile_id = collections.profile_id
FROM collections
WHERE collection_recipes.profile_id IS NULL
  AND collection_recipes.collection_id = collections.id;
ALTER TABLE collection_recipes ALTER COLUMN profile_id SET NOT NULL;
UPDATE collection_recipes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE collection_recipes SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE collection_recipes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE collection_recipes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE collection_recipes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE collection_recipes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE collection_recipes ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE collection_recipes ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Harden remaining profile-scoped tables
ALTER TABLE members ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE members SET version = 0 WHERE version IS NULL;
UPDATE members SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE members SET created_at = NOW() WHERE created_at IS NULL;
UPDATE members SET deleted = false WHERE deleted IS NULL;
ALTER TABLE members ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE members ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE members ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE members ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE members ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE members ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE members ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE events ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE events SET version = 0 WHERE version IS NULL;
UPDATE events SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE events SET created_at = NOW() WHERE created_at IS NULL;
UPDATE events SET deleted = false WHERE deleted IS NULL;
ALTER TABLE events ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE events ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE events ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE events ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE events ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE tasks SET version = 0 WHERE version IS NULL;
UPDATE tasks SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE tasks SET created_at = NOW() WHERE created_at IS NULL;
UPDATE tasks SET deleted = false WHERE deleted IS NULL;
ALTER TABLE tasks ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE tasks ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE tasks ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE tasks ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE lists ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE lists SET version = 0 WHERE version IS NULL;
UPDATE lists SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE lists SET created_at = NOW() WHERE created_at IS NULL;
UPDATE lists SET deleted = false WHERE deleted IS NULL;
ALTER TABLE lists ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE lists ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE lists ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE lists ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE lists ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE lists ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE lists ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE list_categories ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE list_categories SET version = 0 WHERE version IS NULL;
UPDATE list_categories SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE list_categories SET created_at = NOW() WHERE created_at IS NULL;
UPDATE list_categories SET deleted = false WHERE deleted IS NULL;
ALTER TABLE list_categories ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE list_categories ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE list_categories ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE list_categories ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE list_categories ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE list_categories ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE list_categories ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE documents SET version = 0 WHERE version IS NULL;
UPDATE documents SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE documents SET created_at = NOW() WHERE created_at IS NULL;
UPDATE documents SET deleted = false WHERE deleted IS NULL;
ALTER TABLE documents ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE documents ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE documents ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE documents ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE documents ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE documents ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE documents ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE app_lock ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE app_lock SET version = 0 WHERE version IS NULL;
UPDATE app_lock SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE app_lock SET created_at = NOW() WHERE created_at IS NULL;
UPDATE app_lock SET deleted = false WHERE deleted IS NULL;
ALTER TABLE app_lock ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE app_lock ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE app_lock ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE app_lock ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE app_lock ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE app_lock ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE app_lock ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE settings SET version = 0 WHERE version IS NULL;
UPDATE settings SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE settings SET created_at = NOW() WHERE created_at IS NULL;
UPDATE settings SET deleted = false WHERE deleted IS NULL;
ALTER TABLE settings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE settings ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE settings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE settings ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE settings ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE settings ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE settings ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE user_preferences SET version = 0 WHERE version IS NULL;
UPDATE user_preferences SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE user_preferences SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_preferences SET deleted = false WHERE deleted IS NULL;
ALTER TABLE user_preferences ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE user_preferences ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_preferences ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE user_preferences ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE notification_preferences SET version = 0 WHERE version IS NULL;
UPDATE notification_preferences SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE notification_preferences SET created_at = NOW() WHERE created_at IS NULL;
UPDATE notification_preferences SET deleted = false WHERE deleted IS NULL;
ALTER TABLE notification_preferences ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE notification_preferences ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE notification_preferences ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE notification_preferences ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE quiet_hours ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE quiet_hours SET version = 0 WHERE version IS NULL;
UPDATE quiet_hours SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE quiet_hours SET created_at = NOW() WHERE created_at IS NULL;
UPDATE quiet_hours SET deleted = false WHERE deleted IS NULL;
ALTER TABLE quiet_hours ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE quiet_hours ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE quiet_hours ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE quiet_hours ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE quiet_hours ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE quiet_hours ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE quiet_hours ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE app_settings SET version = 0 WHERE version IS NULL;
UPDATE app_settings SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE app_settings SET created_at = NOW() WHERE created_at IS NULL;
UPDATE app_settings SET deleted = false WHERE deleted IS NULL;
ALTER TABLE app_settings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE app_settings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE app_settings ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE app_settings ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE recipes SET version = 0 WHERE version IS NULL;
UPDATE recipes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE recipes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE recipes SET deleted = false WHERE deleted IS NULL;
ALTER TABLE recipes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE recipes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE recipes ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE recipes ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE collections ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE collections SET version = 0 WHERE version IS NULL;
UPDATE collections SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE collections SET created_at = NOW() WHERE created_at IS NULL;
UPDATE collections SET deleted = false WHERE deleted IS NULL;
ALTER TABLE collections ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE collections ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE collections ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE collections ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE collections ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE collections ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE collections ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE meal_plans SET version = 0 WHERE version IS NULL;
UPDATE meal_plans SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE meal_plans SET created_at = NOW() WHERE created_at IS NULL;
UPDATE meal_plans SET deleted = false WHERE deleted IS NULL;
ALTER TABLE meal_plans ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE meal_plans ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE meal_plans ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE meal_plans ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN profile_id SET NOT NULL;

-- Composite indexes for profile-scoped cardinality
CREATE INDEX IF NOT EXISTS idx_transactions_profile_updated_id ON transactions(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_updated_id ON budgets(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notes_profile_updated_id ON notes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_folders_profile_updated_id ON folders(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_items_profile_updated_id ON list_items(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_profile_updated_id ON collection_recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id ON members(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_events_profile_updated_id ON events(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_updated_id ON tasks(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_lists_profile_updated_id ON lists(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_categories_profile_updated_id ON list_categories(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_documents_profile_updated_id ON documents(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_lock_profile_updated_id ON app_lock(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_settings_profile_updated_id ON settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_updated_id ON user_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_updated_id ON notification_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_profile_updated_id ON quiet_hours(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_updated_id ON app_settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated_id ON recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated_id ON collections(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_updated_id ON meal_plans(profile_id, updated_at, id);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Acceptance Checklist:
-- - After applying this migration, confirm Device A's transactions/budgets/notes/folders/list_items/collection_recipes carry profile_id, updated_at, deleted, and version so Device B sees proper tombstone sync.


-- 18_enable_full_replica.sql
BEGIN;

ALTER TABLE IF EXISTS public.events REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.tasks REPLICA IDENTITY FULL;

-- Rollback (if needed):
-- ALTER TABLE public.events REPLICA IDENTITY DEFAULT;
-- ALTER TABLE public.tasks REPLICA IDENTITY DEFAULT;

COMMIT;

BEGIN;

ALTER TABLE IF EXISTS public.events REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.tasks REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.lists REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.list_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.list_categories REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.members REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.recipes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collections REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collection_recipes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.meal_plans REPLICA IDENTITY FULL;

COMMIT;

BEGIN;

ALTER TABLE IF EXISTS public.members REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.settings REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.app_settings REPLICA IDENTITY FULL;

COMMIT;


-- 19_recipes_collections_sync.sql
BEGIN;

ALTER TABLE IF EXISTS public.recipes
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.collections
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.collection_recipes
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.recipes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collections REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collection_recipes REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated ON public.recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated ON public.collections(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_profile_updated ON public.collection_recipes(profile_id, updated_at, id);

COMMIT;


-- 20_storage_buckets.sql
BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES
('recipe-images', 'recipe-images', true),
('recipe-audio', 'recipe-audio', true),
('recipe-thumbnails', 'recipe-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read recipe-images'
  ) THEN
    CREATE POLICY "Public read recipe-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recipe-images');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read recipe-audio'
  ) THEN
    CREATE POLICY "Public read recipe-audio"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recipe-audio');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read recipe-thumbnails'
  ) THEN
    CREATE POLICY "Public read recipe-thumbnails"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recipe-thumbnails');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload recipe-images'
  ) THEN
    CREATE POLICY "Allow upload recipe-images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recipe-images');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload recipe-audio'
  ) THEN
    CREATE POLICY "Allow upload recipe-audio"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recipe-audio');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload recipe-thumbnails'
  ) THEN
    CREATE POLICY "Allow upload recipe-thumbnails"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recipe-thumbnails');
  END IF;
END
$$;

COMMIT;


-- 21_vault_documents_sync.sql
BEGIN;

-- Ensure documents table has the required columns for sync and RLS policies.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Composite index optimized for profile-scoped pulls.
CREATE INDEX IF NOT EXISTS idx_documents_profile_updated
  ON public.documents (profile_id, updated_at, id);

-- Enforce RLS and policies so profiles can only read/write their own rows.
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents select own" ON public.documents;
DROP POLICY IF EXISTS "Documents insert own" ON public.documents;
DROP POLICY IF EXISTS "Documents update own" ON public.documents;
DROP POLICY IF EXISTS "Documents delete own" ON public.documents;

CREATE POLICY "Documents select own"
  ON public.documents FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Documents insert own"
  ON public.documents FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Documents update own"
  ON public.documents FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Documents delete own"
  ON public.documents FOR DELETE
  USING (profile_id = auth.uid());

-- Vault storage bucket and RLS policies ensure profile isolation for binary assets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  owner text;
BEGIN
  SELECT tableowner INTO owner
  FROM pg_tables
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
  LIMIT 1;

  IF owner = current_user THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Vault objects select own" ON storage.objects;
    DROP POLICY IF EXISTS "Vault objects insert own" ON storage.objects;
    DROP POLICY IF EXISTS "Vault objects update own" ON storage.objects;
    DROP POLICY IF EXISTS "Vault objects delete own" ON storage.objects;

    CREATE POLICY "Vault objects select own"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY "Vault objects insert own"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY "Vault objects update own"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY "Vault objects delete own"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  ELSE
    RAISE NOTICE 'Skipping storage.objects RLS/policy configuration because % is not owner (owner: %).', current_user, owner;
  END IF;
END;
$$;

COMMIT;


-- 22_documents_sync_triggers.sql
BEGIN;

-- Ensure profile_id is enforced and generated when missing, and updated_at/version stay in sync for manual edits.
ALTER TABLE public.documents
  ALTER COLUMN profile_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.documents_before_write_hook()
RETURNS trigger AS $$
DECLARE
  requester_id uuid;
BEGIN
  -- resolve the acting profile from the JWT if available
  BEGIN
    requester_id := auth.uid()::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    requester_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.profile_id IS NULL THEN
      IF requester_id IS NULL THEN
        RAISE EXCEPTION 'documents.profile_id cannot be null';
      END IF;
      NEW.profile_id := requester_id;
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.deleted := COALESCE(NEW.deleted, false);
    NEW.version := COALESCE(NEW.version, 1);
  ELSE
    IF NEW.profile_id IS NULL THEN
      NEW.profile_id := COALESCE(OLD.profile_id, requester_id);
    END IF;
    NEW.version := COALESCE(NEW.version, COALESCE(OLD.version, 0)) + 1;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_before_write ON public.documents;
CREATE TRIGGER documents_before_write
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.documents_before_write_hook();

COMMIT;


-- 23_documents_upload_metadata.sql
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'documents_upload_status'
  ) THEN
    CREATE TYPE public.documents_upload_status AS ENUM ('pending_upload', 'uploading', 'uploaded', 'failed');
  END IF;
END;
$$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS local_uri text,
  ADD COLUMN IF NOT EXISTS remote_path text,
  ADD COLUMN IF NOT EXISTS upload_status public.documents_upload_status NOT NULL DEFAULT 'pending_upload',
  ADD COLUMN IF NOT EXISTS upload_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_upload_error text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS metadata_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remote_delete_pending boolean NOT NULL DEFAULT false;

UPDATE public.documents
SET remote_path = COALESCE(remote_path, file_path);

UPDATE public.documents
SET upload_status = 'uploaded',
    upload_attempts = CASE
        WHEN upload_attempts >= 1 THEN upload_attempts
        ELSE 1
    END
WHERE COALESCE(remote_path, file_path) IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_profile_updated_id
  ON public.documents (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_items_profile_updated_id
  ON public.list_items (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_categories_profile_updated_id
  ON public.list_categories (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated_id
  ON public.recipes (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated_id
  ON public.collections (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_profile_updated_id
  ON public.collection_recipes (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id
  ON public.members (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_events_profile_updated_id
  ON public.events (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_updated_id
  ON public.tasks (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_lists_profile_updated_id
  ON public.lists (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_updated_id
  ON public.transactions (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_updated_id
  ON public.budgets (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_folders_profile_updated_id
  ON public.folders (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notes_profile_updated_id
  ON public.notes (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_settings_profile_updated_id
  ON public.settings (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_updated_id
  ON public.user_preferences (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_updated_id
  ON public.notification_preferences (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_profile_updated_id
  ON public.quiet_hours (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_updated_id
  ON public.app_settings (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_lock_profile_updated_id
  ON public.app_lock (profile_id, updated_at, id);
COMMIT;


-- 24_documents_bucket_policy.sql
-- =====================================================
-- STORAGE POLICIES FOR ALL BUCKETS
-- Grants full access to authenticated users

-- Clean previous policies (if any)
drop policy if exists "vault-documents full access" on storage.objects;
drop policy if exists "recipe-images full access" on storage.objects;
drop policy if exists "recipe-audio full access" on storage.objects;
drop policy if exists "recipe-thumbnails full access" on storage.objects;


-- =====================================================
-- VAULT-DOCUMENTS
-- =====================================================

create policy "vault-documents full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'vault-documents')
with check (bucket_id = 'vault-documents');


-- =====================================================
-- RECIPE-IMAGES
-- =====================================================

create policy "recipe-images full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'recipe-images')
with check (bucket_id = 'recipe-images');


-- =====================================================
-- RECIPE-AUDIO
-- =====================================================

create policy "recipe-audio full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'recipe-audio')
with check (bucket_id = 'recipe-audio');


-- =====================================================
-- RECIPE-THUMBNAILS
-- =====================================================

create policy "recipe-thumbnails full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'recipe-thumbnails')
with check (bucket_id = 'recipe-thumbnails');



-- 25_recipes_upload_fields.sql
-- Add media-upload tracking columns to recipes

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS local_image_uris TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS local_audio_uri TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS remote_image_paths TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS remote_audio_path TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_checksums_json TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS audio_checksum TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'uploaded';

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS upload_attempts INTEGER DEFAULT 0;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS last_upload_error TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

UPDATE recipes
SET local_image_uris = COALESCE(local_image_uris, '[]')
WHERE local_image_uris IS NULL;

UPDATE recipes
SET remote_image_paths = COALESCE(remote_image_paths, '[]')
WHERE remote_image_paths IS NULL;

UPDATE recipes
SET image_checksums_json = COALESCE(image_checksums_json, '[]')
WHERE image_checksums_json IS NULL;

UPDATE recipes
SET upload_status = COALESCE(NULLIF(upload_status, ''), 'uploaded');

UPDATE recipes
SET upload_attempts = COALESCE(upload_attempts, 0);

UPDATE recipes
SET last_upload_error = NULL
WHERE FALSE;

UPDATE recipes
SET audio_checksum = NULL
WHERE FALSE;

UPDATE recipes
SET updated_at = COALESCE(updated_at, now());

UPDATE recipes
SET version = COALESCE(version, 1);

CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated
  ON recipes(profile_id, updated_at);


-- 26_enable_realtime_list_items.sql
-- Migration 26: Fix list_items RLS policy for Realtime Sync
-- Supabase Realtime fails to broadcast row changes if the RLS policy contains a join (like EXISTS).
-- Since list_items now has a profile_id column (added in 17_sync_hardening.sql), we can simplify the RLS policy.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can insert own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can update own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can delete own list_items" ON list_items;

        -- Recreate policies using direct profile_id check
        CREATE POLICY "Users can view own list_items"
          ON list_items FOR SELECT
          USING ( auth.uid() = profile_id );

        CREATE POLICY "Users can insert own list_items"
          ON list_items FOR INSERT
          WITH CHECK ( auth.uid() = profile_id );

        CREATE POLICY "Users can update own list_items"
          ON list_items FOR UPDATE
          USING ( auth.uid() = profile_id )
          WITH CHECK ( auth.uid() = profile_id );

        CREATE POLICY "Users can delete own list_items"
          ON list_items FOR DELETE
          USING ( auth.uid() = profile_id );
          
    END IF;
END $$;


-- 27_enable_realtime_publication_for_lists.sql
-- Migration 27: Add lists tables to supabase_realtime publication
-- Ensures that Supabase broadcasts realtime updates for lists, list_items, and list_categories

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'list_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE list_items;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lists') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE lists;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'list_categories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE list_categories;
    END IF;
END $$;

-- 34_budget_category_color_mappings.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'budget_category_color_mappings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE budget_category_color_mappings;
    END IF;
END $$;


-- 28_add_sync_cursor_indexes.sql
-- Migration 28: Add composite indexes for Sync Cursor Stability
-- WatermelonDB PullCursorEngine relies heavily on querying records by `profile_id`
-- and ordering/filtering by `updated_at`. Adding indexing on `(profile_id, updated_at)`
-- drastically improves the performance and stability of sync pulls.

-- App Settings & Configuration
CREATE INDEX IF NOT EXISTS idx_app_settings_sync_cursor ON app_settings(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_sync_cursor ON user_preferences(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_sync_cursor ON notification_preferences(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_sync_cursor ON quiet_hours(profile_id, updated_at);

-- Family Members
CREATE INDEX IF NOT EXISTS idx_members_sync_cursor ON members(profile_id, updated_at);

-- Lists & Categories
CREATE INDEX IF NOT EXISTS idx_list_categories_sync_cursor ON list_categories(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_lists_sync_cursor ON lists(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_list_items_sync_cursor ON list_items(profile_id, updated_at);

-- Recipes & Meal Plans
CREATE INDEX IF NOT EXISTS idx_recipes_sync_cursor ON recipes(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_collections_sync_cursor ON collections(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_sync_cursor ON collection_recipes(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_meal_plans_sync_cursor ON meal_plans(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_folders_sync_cursor ON folders(profile_id, updated_at);

-- Events & Tasks
CREATE INDEX IF NOT EXISTS idx_events_sync_cursor ON events(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_sync_cursor ON tasks(profile_id, updated_at);

-- Finance
CREATE INDEX IF NOT EXISTS idx_transactions_sync_cursor ON transactions(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_budgets_sync_cursor ON budgets(profile_id, updated_at);

-- Vault & Notes
CREATE INDEX IF NOT EXISTS idx_documents_sync_cursor ON documents(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_sync_cursor ON notes(profile_id, updated_at);

-- Also add a comment confirming execution
-- Replaced invalid COMMENT ON MIGRATION with a standard SQL comment


-- 29_deduplicate_settings_keys.sql
-- Migration 29: Deduplicate and enforce unique settings per (profile_id, key)
-- The settings table was storing multiple rows for the same (profile_id, key) combination.
-- This migration cleans up duplicates (keeping the most recently updated row) and
-- adds a UNIQUE constraint to prevent future duplicates.

-- Step 1: Deduplicate — delete older duplicate (profile_id, key) pairs, keeping only the latest updated_at
DELETE FROM public.settings
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY profile_id, key
                ORDER BY updated_at DESC NULLS LAST
            ) AS rn
        FROM public.settings
        WHERE deleted = false OR deleted IS NULL
    ) ranked
    WHERE rn > 1
);

-- Also clean up rows that have no profile_id (orphaned rows)
DELETE FROM public.settings
WHERE profile_id IS NULL;

-- Step 2: Add a UNIQUE constraint on (profile_id, key)
-- This prevents any future duplicate insertions; all writes must use ON CONFLICT DO UPDATE
ALTER TABLE public.settings
    ADD CONSTRAINT settings_profile_id_key_unique UNIQUE (profile_id, key);


-- 30_remove_list_categories.sql
-- Drop the old list_categories table after moving to hard-coded shopping categories.
-- This should run after 29_deduplicate_settings_keys.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'list_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE list_categories;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.list_items DROP CONSTRAINT IF EXISTS list_items_category_id_fkey;
DROP INDEX IF EXISTS idx_list_items_category_id;
ALTER TABLE public.list_items RENAME COLUMN category_id TO category;
CREATE INDEX IF NOT EXISTS idx_list_items_category ON public.list_items (category);

DROP INDEX IF EXISTS idx_list_categories_profile_id;
DROP INDEX IF EXISTS idx_list_categories_profile_updated_id;
DROP INDEX IF EXISTS idx_list_categories_sync_cursor;
DROP TABLE IF EXISTS public.list_categories;
