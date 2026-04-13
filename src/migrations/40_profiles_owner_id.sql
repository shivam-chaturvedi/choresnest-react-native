-- Mark each profile with a canonical owner_id so family lookups can query the users table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owner_id uuid;

UPDATE public.profiles
SET owner_id = id
WHERE owner_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN owner_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_owner_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;


