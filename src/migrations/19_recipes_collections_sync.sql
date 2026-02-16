BEGIN;

ALTER TABLE IF EXISTS public.recipes
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.collections
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.collection_recipes
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.recipes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collections REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collection_recipes REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated ON public.recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated ON public.collections(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_profile_updated ON public.collection_recipes(profile_id, updated_at, id);

COMMIT;
