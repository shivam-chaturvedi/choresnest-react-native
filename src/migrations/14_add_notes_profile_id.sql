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
