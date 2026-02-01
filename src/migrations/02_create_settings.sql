-- 1. App Lock
create table public.app_lock (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  enabled boolean default false,
  biometric_enabled boolean default false,
  pin_hash text,
  created_at_timestamp numeric,
  updated_at_timestamp numeric
);
alter table public.app_lock enable row level security;
create policy "Users can crud own app_lock" on public.app_lock using (auth.uid() = user_id);

-- 2. Settings (Key-Value)
create table public.settings (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  key text not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.settings enable row level security;
create policy "Users can crud own settings" on public.settings using (auth.uid() = user_id);

-- 3. User Preferences
create table public.user_preferences (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  country_code text,
  created_at_timestamp numeric,
  updated_at_timestamp numeric,
  created_at timestamptz default now()
);
alter table public.user_preferences enable row level security;
create policy "Users can crud own user_preferences" on public.user_preferences using (auth.uid() = user_id);

-- 4. Notification Preferences
create table public.notification_preferences (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  category text not null,
  enabled boolean default true,
  reminder_offset_minutes numeric,
  updated_at_timestamp numeric,
  created_at timestamptz default now()
);
alter table public.notification_preferences enable row level security;
create policy "Users can crud own notification_preferences" on public.notification_preferences using (auth.uid() = user_id);

-- 5. Quiet Hours
create table public.quiet_hours (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  enabled boolean default false,
  start_hour numeric,
  start_minute numeric,
  end_hour numeric,
  end_minute numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.quiet_hours enable row level security;
create policy "Users can crud own quiet_hours" on public.quiet_hours using (auth.uid() = user_id);

-- 6. App Settings (General)
create table public.app_settings (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  has_completed_onboarding boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.app_settings enable row level security;
create policy "Users can crud own app_settings" on public.app_settings using (auth.uid() = user_id);
