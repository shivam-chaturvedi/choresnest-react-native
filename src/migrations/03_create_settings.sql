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
