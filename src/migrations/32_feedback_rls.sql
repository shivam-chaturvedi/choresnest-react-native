-- Enable row level security and allow everyone to insert feedback
alter table if exists feedback enable row level security;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'allow_feedback_insert'
  ) then
    execute 'create policy allow_feedback_insert on feedback for insert with check (true)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'allow_feedback_select'
  ) then
    execute 'create policy allow_feedback_select on feedback for select using (true)';
  end if;
end $$;
