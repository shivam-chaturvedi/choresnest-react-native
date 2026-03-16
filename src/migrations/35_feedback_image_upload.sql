-- Ensure feedback attachments table columns and storage bucket exist
BEGIN;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS image_bucket text,
  ADD COLUMN IF NOT EXISTS image_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-images', 'feedback-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read feedback-images'
  ) THEN
    CREATE POLICY "Public read feedback-images"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'feedback-images');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload feedback-images'
  ) THEN
    CREATE POLICY "Allow upload feedback-images"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'feedback-images');
  END IF;
END
$$;

COMMIT;
