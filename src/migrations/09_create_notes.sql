-- Folders (Note Folders)
create table folders (
  id text primary key,
  title text not null,
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

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

-- Policies
create policy "Enable all access for authenticated users" on folders for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on notes for all using (auth.role() = 'authenticated');
