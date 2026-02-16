BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES
('recipe-images', 'recipe-images', true),
('recipe-audio', 'recipe-audio', true),
('recipe-thumbnails', 'recipe-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read recipe-images'
  ) THEN
    CREATE POLICY "Public read recipe-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recipe-images');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read recipe-audio'
  ) THEN
    CREATE POLICY "Public read recipe-audio"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recipe-audio');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read recipe-thumbnails'
  ) THEN
    CREATE POLICY "Public read recipe-thumbnails"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recipe-thumbnails');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload recipe-images'
  ) THEN
    CREATE POLICY "Allow upload recipe-images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recipe-images');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload recipe-audio'
  ) THEN
    CREATE POLICY "Allow upload recipe-audio"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recipe-audio');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload recipe-thumbnails'
  ) THEN
    CREATE POLICY "Allow upload recipe-thumbnails"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recipe-thumbnails');
  END IF;
END
$$;

COMMIT;
