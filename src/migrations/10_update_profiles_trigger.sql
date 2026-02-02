-- Update handle_new_user function to include active_profile_id
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, active_profile_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.id -- Set active_profile_id to the user's own ID by default
  );
  return new;
end;
$$ language plpgsql security definer;
