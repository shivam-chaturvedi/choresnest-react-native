BEGIN;

-- Ensure documents table has the required columns for sync and RLS policies.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Composite index optimized for profile-scoped pulls.
CREATE INDEX IF NOT EXISTS idx_documents_profile_updated
  ON public.documents (profile_id, updated_at, id);

-- Enforce RLS and policies so profiles can only read/write their own rows.
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents select own" ON public.documents;
DROP POLICY IF EXISTS "Documents insert own" ON public.documents;
DROP POLICY IF EXISTS "Documents update own" ON public.documents;
DROP POLICY IF EXISTS "Documents delete own" ON public.documents;

CREATE POLICY "Documents select own"
  ON public.documents FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Documents insert own"
  ON public.documents FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Documents update own"
  ON public.documents FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Documents delete own"
  ON public.documents FOR DELETE
  USING (profile_id = auth.uid());

-- Vault storage bucket and RLS policies ensure profile isolation for binary assets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  owner text;
BEGIN
  SELECT tableowner INTO owner
  FROM pg_tables
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
  LIMIT 1;

  IF owner = current_user THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Vault objects select own" ON storage.objects;
    DROP POLICY IF EXISTS "Vault objects insert own" ON storage.objects;
    DROP POLICY IF EXISTS "Vault objects update own" ON storage.objects;
    DROP POLICY IF EXISTS "Vault objects delete own" ON storage.objects;

    CREATE POLICY "Vault objects select own"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY "Vault objects insert own"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY "Vault objects update own"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY "Vault objects delete own"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'vault-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  ELSE
    RAISE NOTICE 'Skipping storage.objects RLS/policy configuration because % is not owner (owner: %).', current_user, owner;
  END IF;
END;
$$;

COMMIT;
