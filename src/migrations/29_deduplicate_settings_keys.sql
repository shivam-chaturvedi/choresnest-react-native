-- Migration 29: Deduplicate and enforce unique settings per (profile_id, key)
-- The settings table was storing multiple rows for the same (profile_id, key) combination.
-- This migration cleans up duplicates (keeping the most recently updated row) and
-- adds a UNIQUE constraint to prevent future duplicates.

-- Step 1: Deduplicate — delete older duplicate (profile_id, key) pairs, keeping only the latest updated_at
DELETE FROM public.settings
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY profile_id, key
                ORDER BY updated_at DESC NULLS LAST
            ) AS rn
        FROM public.settings
        WHERE deleted = false OR deleted IS NULL
    ) ranked
    WHERE rn > 1
);

-- Also clean up rows that have no profile_id (orphaned rows)
DELETE FROM public.settings
WHERE profile_id IS NULL;

-- Step 2: Add a UNIQUE constraint on (profile_id, key)
-- This prevents any future duplicate insertions; all writes must use ON CONFLICT DO UPDATE
ALTER TABLE public.settings
    ADD CONSTRAINT settings_profile_id_key_unique UNIQUE (profile_id, key);
