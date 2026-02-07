-- Migration 13: Fix RLS policies for list_items and user_preferences
-- This migration ensures proper RLS policies and data validation

-- 1. Ensure list_items cannot have empty list_id (add constraint if not exists)
-- Note: We can't add a NOT NULL constraint if there are existing NULL values
-- But we can add a check constraint for empty strings
-- First check if the table exists
DO $$ 
BEGIN
    -- Check if list_items table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        -- Add check constraint to prevent empty list_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'list_items_list_id_not_empty'
        ) THEN
            ALTER TABLE list_items 
            ADD CONSTRAINT list_items_list_id_not_empty 
            CHECK (list_id IS NULL OR (list_id IS NOT NULL AND length(trim(list_id)) > 0));
        END IF;
    END IF;
END $$;

-- 2. Update RLS policies for list_items to handle NULL/empty list_id gracefully
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can insert own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can update own list_items" ON list_items;
        DROP POLICY IF EXISTS "Users can delete own list_items" ON list_items;

        -- Recreate policies with better validation
        -- View: Only show items that belong to user's lists AND have valid list_id
        CREATE POLICY "Users can view own list_items"
          ON list_items FOR SELECT
          USING ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );

        -- Insert: Must have valid list_id that belongs to user
        CREATE POLICY "Users can insert own list_items"
          ON list_items FOR INSERT
          WITH CHECK ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );

        -- Update: Must have valid list_id that belongs to user
        CREATE POLICY "Users can update own list_items"
          ON list_items FOR UPDATE
          USING ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          )
          WITH CHECK (
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );

        -- Delete: Must have valid list_id that belongs to user
        CREATE POLICY "Users can delete own list_items"
          ON list_items FOR DELETE
          USING ( 
            list_id IS NOT NULL 
            AND length(trim(list_id)) > 0
            AND EXISTS (
              SELECT 1 FROM lists 
              WHERE lists.id = list_items.list_id 
              AND lists.profile_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 3. Ensure user_preferences always has profile_id (recreate policies to be explicit)
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own user_preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can insert own user_preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can update own user_preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can delete own user_preferences" ON user_preferences;

        -- Recreate with explicit profile_id checks
        CREATE POLICY "Users can view own user_preferences"
          ON user_preferences FOR SELECT
          USING ( auth.uid() = profile_id );

        CREATE POLICY "Users can insert own user_preferences"
          ON user_preferences FOR INSERT
          WITH CHECK ( 
            auth.uid() = profile_id 
            AND profile_id IS NOT NULL
          );

        CREATE POLICY "Users can update own user_preferences"
          ON user_preferences FOR UPDATE
          USING ( auth.uid() = profile_id )
          WITH CHECK ( 
            auth.uid() = profile_id 
            AND profile_id IS NOT NULL
          );

        CREATE POLICY "Users can delete own user_preferences"
          ON user_preferences FOR DELETE
          USING ( auth.uid() = profile_id );
    END IF;
END $$;

-- 4. Clean up any orphaned list_items with empty list_id
-- This will delete items that can't be synced anyway
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        DELETE FROM list_items 
        WHERE list_id IS NULL 
           OR length(trim(list_id)) = 0;
    END IF;
END $$;

-- 5. Create index for better performance on list_id lookups
-- Only if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'list_items'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_list_items_list_id_valid 
        ON list_items(list_id) 
        WHERE list_id IS NOT NULL AND length(trim(list_id)) > 0;
    END IF;
END $$;
