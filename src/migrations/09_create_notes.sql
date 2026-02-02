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
