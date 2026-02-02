-- Documents (Vault Documents)
create table documents (
  id text primary key,
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

create index idx_documents_member_id on documents(member_id);
create index idx_documents_type on documents(type);
create index idx_documents_date on documents(date);

-- Enable RLS
alter table documents enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on documents for all using (auth.role() = 'authenticated');
