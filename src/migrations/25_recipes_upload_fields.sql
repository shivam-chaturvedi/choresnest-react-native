-- Add media-upload tracking columns to recipes

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS local_image_uris TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS local_audio_uri TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS remote_image_paths TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS remote_audio_path TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_checksums_json TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS audio_checksum TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'uploaded';

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS upload_attempts INTEGER DEFAULT 0;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS last_upload_error TEXT;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

UPDATE recipes
SET local_image_uris = COALESCE(local_image_uris, '[]')
WHERE local_image_uris IS NULL;

UPDATE recipes
SET remote_image_paths = COALESCE(remote_image_paths, '[]')
WHERE remote_image_paths IS NULL;

UPDATE recipes
SET image_checksums_json = COALESCE(image_checksums_json, '[]')
WHERE image_checksums_json IS NULL;

UPDATE recipes
SET upload_status = COALESCE(NULLIF(upload_status, ''), 'uploaded');

UPDATE recipes
SET upload_attempts = COALESCE(upload_attempts, 0);

UPDATE recipes
SET last_upload_error = NULL
WHERE FALSE;

UPDATE recipes
SET audio_checksum = NULL
WHERE FALSE;

UPDATE recipes
SET updated_at = COALESCE(updated_at, now());

UPDATE recipes
SET version = COALESCE(version, 1);

CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated
  ON recipes(profile_id, updated_at);
