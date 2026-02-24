-- Drop the old list_categories table after moving to hard-coded shopping categories.
-- This should run after 29_deduplicate_settings_keys.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'list_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE list_categories;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.list_items DROP CONSTRAINT IF EXISTS list_items_category_id_fkey;
DROP INDEX IF EXISTS idx_list_items_category_id;
ALTER TABLE public.list_items RENAME COLUMN category_id TO category;
CREATE INDEX IF NOT EXISTS idx_list_items_category ON public.list_items (category);

DROP INDEX IF EXISTS idx_list_categories_profile_id;
DROP INDEX IF EXISTS idx_list_categories_profile_updated_id;
DROP INDEX IF EXISTS idx_list_categories_sync_cursor;
DROP TABLE IF EXISTS public.list_categories;
