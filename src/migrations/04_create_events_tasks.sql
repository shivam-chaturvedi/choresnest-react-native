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
