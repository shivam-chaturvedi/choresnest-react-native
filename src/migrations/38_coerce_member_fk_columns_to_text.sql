-- WatermelonDB member ids (e.g. BL3klSANQA2fD8AG) must be stored as text foreign keys.
-- Some deployments accidentally typed member-reference columns as uuid, which causes
-- PostgREST upserts to fail with 22P02 during sync.
BEGIN;

CREATE OR REPLACE FUNCTION public.force_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.profile_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.coerce_member_reference_column_to_text(
  p_table_name text,
  p_column_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_table regclass;
  v_data_type text;
  v_fk_name text;
BEGIN
  v_table := to_regclass(format('public.%I', p_table_name));
  IF v_table IS NULL THEN
    RETURN;
  END IF;

  SELECT c.data_type
  INTO v_data_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
    AND c.column_name = p_column_name;

  IF v_data_type IS NULL OR v_data_type = 'text' THEN
    RETURN;
  END IF;

  FOR v_fk_name IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = v_table
      AND con.contype = 'f'
      AND EXISTS (
        SELECT 1
        FROM unnest(con.conkey) AS key_attnum(attnum)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = key_attnum.attnum
        WHERE att.attname = p_column_name
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_table, v_fk_name);
  END LOOP;

  EXECUTE format(
    'ALTER TABLE %s ALTER COLUMN %I TYPE text USING %I::text',
    v_table,
    p_column_name,
    p_column_name
  );
END;
$$;

SELECT public.coerce_member_reference_column_to_text('tasks', 'assignee_id');
SELECT public.coerce_member_reference_column_to_text('list_items', 'added_by_id');
SELECT public.coerce_member_reference_column_to_text('events', 'member_id');
SELECT public.coerce_member_reference_column_to_text('documents', 'member_id');

CREATE OR REPLACE FUNCTION public.sanitize_member_reference_column(
  p_table_name text,
  p_column_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_table regclass;
BEGIN
  v_table := to_regclass(format('public.%I', p_table_name));
  IF v_table IS NULL OR to_regclass('public.members') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    $sql$
    UPDATE %s AS t
    SET %I = NULL
    WHERE t.%I IS NOT NULL
      AND btrim(t.%I::text) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.members AS m
        WHERE m.id = t.%I::text
      )
    $sql$,
    v_table,
    p_column_name,
    p_column_name,
    p_column_name,
    p_column_name
  );
END;
$$;

SELECT public.sanitize_member_reference_column('tasks', 'assignee_id');
SELECT public.sanitize_member_reference_column('list_items', 'added_by_id');
SELECT public.sanitize_member_reference_column('events', 'member_id');
SELECT public.sanitize_member_reference_column('documents', 'member_id');

DO $$
BEGIN
  IF to_regclass('public.members') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL THEN
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
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_member_id_fkey;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'events_member_id_fkey'
    ) THEN
      ALTER TABLE public.events
        ADD CONSTRAINT events_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_member_id_fkey;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'documents_member_id_fkey'
    ) THEN
      ALTER TABLE public.documents
        ADD CONSTRAINT documents_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL
     AND to_regclass('public.members') IS NOT NULL THEN
    UPDATE public.tasks AS t
    SET profile_id = m.profile_id
    FROM public.members AS m
    WHERE t.assignee_id = m.id
      AND m.profile_id IS NOT NULL
      AND t.profile_id IS DISTINCT FROM m.profile_id;
  END IF;

  IF to_regclass('public.list_items') IS NOT NULL
     AND to_regclass('public.lists') IS NOT NULL THEN
    UPDATE public.list_items AS li
    SET profile_id = l.profile_id
    FROM public.lists AS l
    WHERE li.list_id = l.id
      AND l.profile_id IS NOT NULL
      AND li.profile_id IS DISTINCT FROM l.profile_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_profile_scoped_trigger(p_table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_table regclass;
  v_trigger_name text;
BEGIN
  v_table := to_regclass(format('public.%I', p_table_name));
  IF v_table IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = 'profile_id'
  ) THEN
    RETURN;
  END IF;

  v_trigger_name := format('force_profile_id_%s', p_table_name);
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', v_trigger_name, v_table);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.force_profile_id()',
    v_trigger_name,
    v_table
  );
END;
$$;

SELECT public.ensure_profile_scoped_trigger('tasks');
SELECT public.ensure_profile_scoped_trigger('list_items');
SELECT public.ensure_profile_scoped_trigger('lists');
SELECT public.ensure_profile_scoped_trigger('events');
SELECT public.ensure_profile_scoped_trigger('documents');
SELECT public.ensure_profile_scoped_trigger('notes');
SELECT public.ensure_profile_scoped_trigger('folders');
SELECT public.ensure_profile_scoped_trigger('settings');
SELECT public.ensure_profile_scoped_trigger('members');

DROP FUNCTION public.coerce_member_reference_column_to_text(text, text);
DROP FUNCTION public.sanitize_member_reference_column(text, text);
DROP FUNCTION public.ensure_profile_scoped_trigger(text);

NOTIFY pgrst, 'reload schema';

COMMIT;
