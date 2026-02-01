-- Documents Table
create table public.documents (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  type text not null,
  icon text not null,
  date text not null,
  expiry_date text,
  member_id text,
  shared_with_json text,
  file_path text,
  meta_json text,
  notification_ids_json text,
  reminder_days_before numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Users can crud own documents" on public.documents using (auth.uid() = user_id);
