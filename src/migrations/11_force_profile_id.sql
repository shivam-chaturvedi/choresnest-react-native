-- Function to automatically set profile_id to the authenticated user's ID
create or replace function public.force_profile_id()
returns trigger as $$
begin
  -- Only override if it's separate from what it should be (or missing)
  -- This enforces that a user can only write data for their own profile
  if auth.uid() is not null then
    new.profile_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for settings
drop trigger if exists force_profile_id_settings on public.settings;
create trigger force_profile_id_settings
before insert or update on public.settings
for each row execute procedure public.force_profile_id();

-- Trigger for members
drop trigger if exists force_profile_id_members on public.members;
create trigger force_profile_id_members
before insert or update on public.members
for each row execute procedure public.force_profile_id();
