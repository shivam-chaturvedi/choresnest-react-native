-- 1. Events
create table public.events (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  icon text not null,
  date text not null, -- YYYY-MM-DD
  time text not null,
  end_time text,
  end_date text,
  member_id text, -- Loose reference to members(id)
  location text,
  description text,
  notes text,
  visibility text default 'default',
  time_zone text,
  is_recurring boolean default false,
  recurrence_rule text,
  recurrence_end_date text,
  notification_id text,
  reminder_offset_minutes numeric,
  created_at timestamptz default now(),
  updated_at_timestamp numeric
);
alter table public.events enable row level security;
create policy "Users can crud own events" on public.events using (auth.uid() = user_id);

-- 2. Tasks
create table public.tasks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  icon text not null,
  status text not null,
  priority text,
  due_display text,
  date text,
  assignee_id text,
  tab text,
  notification_id text,
  reminder_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at_timestamp numeric
);
alter table public.tasks enable row level security;
create policy "Users can crud own tasks" on public.tasks using (auth.uid() = user_id);
