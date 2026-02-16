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
