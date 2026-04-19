-- Drop the legacy members table now that profiles contains the same metadata.
DROP TRIGGER IF EXISTS force_profile_id_members ON public.members;
DROP POLICY IF EXISTS "Users can delete own members" ON public.members;
DROP POLICY IF EXISTS "Users can insert own members" ON public.members;
DROP POLICY IF EXISTS "Users can update own members" ON public.members;
DROP POLICY IF EXISTS "Users can view own members" ON public.members;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.members';
  END IF;
END;
$$;
DROP TABLE IF EXISTS public.members CASCADE;


ALTER TABLE profiles DROP CONSTRAINT profiles_owner_id_fkey;

ALTER TABLE profiles ALTER COLUMN owner_id DROP NOT NULL;