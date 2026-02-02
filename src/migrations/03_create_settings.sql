-- Settings (Key-Value Store)
create table settings (
  id text primary key,
  key text not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_settings_key on settings(key);

-- App Lock
create table app_lock (
  id text primary key,
  enabled boolean default false,
  biometric_enabled boolean default false,
  pin_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- User Preferences
create table user_preferences (
  id text primary key,
  country_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- Notification Preferences
create table notification_preferences (
  id text primary key,
  category text not null,
  enabled boolean default true,
  reminder_offset_minutes numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_notif_prefs_category on notification_preferences(category);

-- Quiet Hours
create table quiet_hours (
  id text primary key,
  enabled boolean default false,
  start_hour integer,
  start_minute integer,
  end_hour integer,
  end_minute integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- App Settings
create table app_settings (
  id text primary key,
  has_completed_onboarding boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

-- Enable RLS for all
alter table settings enable row level security;
alter table app_lock enable row level security;
alter table user_preferences enable row level security;
alter table notification_preferences enable row level security;
alter table quiet_hours enable row level security;
alter table app_settings enable row level security;

-- Simple permissive policies
create policy "Enable all access for authenticated users" on settings for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on app_lock for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on user_preferences for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on notification_preferences for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on quiet_hours for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on app_settings for all using (auth.role() = 'authenticated');
