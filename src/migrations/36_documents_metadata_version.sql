BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS metadata_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remote_delete_pending boolean NOT NULL DEFAULT false;

COMMIT;
