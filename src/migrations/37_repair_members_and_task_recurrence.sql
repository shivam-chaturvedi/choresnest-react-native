-- Repair deployments that have profiles but are missing the family members table,
-- and bring the remote tasks table in line with the recurring-task local schema.
BEGIN;

CREATE OR REPLACE FUNCTION public.force_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.profile_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.members (
  id text PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text NOT NULL,
  color text NOT NULL,
  role text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 0
);

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS symbol text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

ALTER TABLE public.members
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN deleted SET DEFAULT false,
  ALTER COLUMN version SET DEFAULT 0;

UPDATE public.members
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now()),
  deleted = COALESCE(deleted, false),
  version = COALESCE(version, 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_pkey'
  ) THEN
    ALTER TABLE public.members ADD CONSTRAINT members_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_profile_id_fkey'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_members_profile_id ON public.members(profile_id);
CREATE INDEX IF NOT EXISTS idx_members_sync_cursor ON public.members(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id ON public.members(profile_id, updated_at, id);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Users can view own members" ON public.members;
DROP POLICY IF EXISTS "Users can insert own members" ON public.members;
DROP POLICY IF EXISTS "Users can update own members" ON public.members;
DROP POLICY IF EXISTS "Users can delete own members" ON public.members;

CREATE POLICY "Users can view own members"
  ON public.members FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own members"
  ON public.members FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own members"
  ON public.members FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own members"
  ON public.members FOR DELETE
  USING (auth.uid() = profile_id);

DROP TRIGGER IF EXISTS force_profile_id_members ON public.members;
CREATE TRIGGER force_profile_id_members
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.force_profile_id();

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS recurrence_rule text,
      ADD COLUMN IF NOT EXISTS recurrence_interval integer,
      ADD COLUMN IF NOT EXISTS recurrence_days_of_week text,
      ADD COLUMN IF NOT EXISTS recurrence_end_date text,
      ADD COLUMN IF NOT EXISTS recurrence_occurrence_limit integer,
      ADD COLUMN IF NOT EXISTS recurrence_completed_count integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS recurrence_anchor_date text,
      ADD COLUMN IF NOT EXISTS recurrence_skipped_dates text;

    CREATE INDEX IF NOT EXISTS idx_tasks_recurrence
      ON public.tasks(profile_id, is_recurring, date);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.members') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL THEN
    UPDATE public.tasks AS t
    SET assignee_id = NULL
    WHERE t.assignee_id IS NOT NULL
      AND btrim(t.assignee_id::text) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.members AS m WHERE m.id = t.assignee_id::text
      );

    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignee_id_fkey'
    ) THEN
      ALTER TABLE public.tasks
        ADD CONSTRAINT tasks_assignee_id_fkey
        FOREIGN KEY (assignee_id) REFERENCES public.members(id) ON DELETE SET NULL;
    END IF;
  END IF;

  IF to_regclass('public.list_items') IS NOT NULL THEN
    UPDATE public.list_items AS li
    SET added_by_id = NULL
    WHERE li.added_by_id IS NOT NULL
      AND btrim(li.added_by_id::text) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.members AS m WHERE m.id = li.added_by_id::text
      );

    ALTER TABLE public.list_items DROP CONSTRAINT IF EXISTS list_items_added_by_id_fkey;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'list_items_added_by_id_fkey'
    ) THEN
      ALTER TABLE public.list_items
        ADD CONSTRAINT list_items_added_by_id_fkey
        FOREIGN KEY (added_by_id) REFERENCES public.members(id) ON DELETE SET NULL;
    END IF;
  END IF;

  IF to_regclass('public.events') IS NOT NULL THEN
    UPDATE public.events AS e
    SET member_id = NULL
    WHERE e.member_id IS NOT NULL
      AND btrim(e.member_id::text) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.members AS m WHERE m.id = e.member_id::text
      );

    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_member_id_fkey;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'events_member_id_fkey'
    ) THEN
      ALTER TABLE public.events
        ADD CONSTRAINT events_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.members TO anon;
GRANT ALL ON TABLE public.members TO authenticated;
GRANT ALL ON TABLE public.members TO service_role;

COMMIT;
