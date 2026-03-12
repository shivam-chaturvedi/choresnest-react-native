-- Create budget category color mapping metadata scoped per profile
create table if not exists budget_category_color_mappings (
  id uuid not null default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category_key text not null,
  color_hex text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  version integer not null default 0,
  primary key (id)
);

create unique index if not exists idx_budget_category_color_mappings_profile_category on budget_category_color_mappings(profile_id, category_key);
create index if not exists idx_budget_category_color_mappings_profile_updated_id on budget_category_color_mappings(profile_id, updated_at);

alter table budget_category_color_mappings enable row level security;

create policy "Users can view own category color mappings"
  on budget_category_color_mappings for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own category color mappings"
  on budget_category_color_mappings for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own category color mappings"
  on budget_category_color_mappings for update
  using ( auth.uid() = profile_id )
  with check ( auth.uid() = profile_id );

create policy "Users can delete own category color mappings"
  on budget_category_color_mappings for delete
  using ( auth.uid() = profile_id );

create or replace function public.category_color_mappings_before_write_hook()
returns trigger as $$
declare
  requester_id uuid;
begin
  begin
    requester_id := auth.uid()::uuid;
  exception when invalid_text_representation then
    requester_id := null;
  end;

  if tg_op = 'INSERT' then
    if new.profile_id is null then
      if requester_id is null then
        raise exception 'category_color_mappings.profile_id cannot be null';
      end if;
      new.profile_id := requester_id;
    end if;
    new.created_at := coalesce(new.created_at, now());
    new.deleted := coalesce(new.deleted, false);
    new.version := coalesce(new.version, 0);
  else
    if new.profile_id is null then
      new.profile_id := coalesce(old.profile_id, requester_id);
    end if;
    new.version := coalesce(new.version, coalesce(old.version, 0)) + 1;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists category_color_mappings_before_write on public.budget_category_color_mappings;
create trigger category_color_mappings_before_write
  before insert or update on public.budget_category_color_mappings
  for each row
  execute function public.category_color_mappings_before_write_hook();

-- Ensure realtime publication includes the new table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'budget_category_color_mappings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE budget_category_color_mappings;
  END IF;
END;
$$;
