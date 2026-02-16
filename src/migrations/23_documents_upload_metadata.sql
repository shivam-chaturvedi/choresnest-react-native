BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'documents_upload_status'
  ) THEN
    CREATE TYPE public.documents_upload_status AS ENUM ('pending_upload', 'uploading', 'uploaded', 'failed');
  END IF;
END;
$$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS local_uri text,
  ADD COLUMN IF NOT EXISTS remote_path text,
  ADD COLUMN IF NOT EXISTS upload_status public.documents_upload_status NOT NULL DEFAULT 'pending_upload',
  ADD COLUMN IF NOT EXISTS upload_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_upload_error text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS checksum text;

UPDATE public.documents
SET remote_path = COALESCE(remote_path, file_path);

UPDATE public.documents
SET upload_status = 'uploaded',
    upload_attempts = CASE
        WHEN upload_attempts >= 1 THEN upload_attempts
        ELSE 1
    END
WHERE COALESCE(remote_path, file_path) IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_profile_updated_id
  ON public.documents (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_items_profile_updated_id
  ON public.list_items (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_categories_profile_updated_id
  ON public.list_categories (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated_id
  ON public.recipes (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated_id
  ON public.collections (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_profile_updated_id
  ON public.collection_recipes (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id
  ON public.members (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_events_profile_updated_id
  ON public.events (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_updated_id
  ON public.tasks (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_lists_profile_updated_id
  ON public.lists (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_updated_id
  ON public.transactions (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_updated_id
  ON public.budgets (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_folders_profile_updated_id
  ON public.folders (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notes_profile_updated_id
  ON public.notes (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_settings_profile_updated_id
  ON public.settings (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_updated_id
  ON public.user_preferences (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_updated_id
  ON public.notification_preferences (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_profile_updated_id
  ON public.quiet_hours (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_updated_id
  ON public.app_settings (profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_lock_profile_updated_id
  ON public.app_lock (profile_id, updated_at, id);
COMMIT;
