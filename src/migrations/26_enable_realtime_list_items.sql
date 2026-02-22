-- Migration 26: Fix list_items RLS policy for Realtime Sync
-- Supabase Realtime fails to broadcast row changes if the RLS policy contains a join (like EXISTS).
-- Since list_items now has a profile_id column (added in 17_sync_hardening.sql), we can simplify the RLS policy.

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

        -- Recreate policies using direct profile_id check
        CREATE POLICY "Users can view own list_items"
          ON list_items FOR SELECT
          USING ( auth.uid() = profile_id );

        CREATE POLICY "Users can insert own list_items"
          ON list_items FOR INSERT
          WITH CHECK ( auth.uid() = profile_id );

        CREATE POLICY "Users can update own list_items"
          ON list_items FOR UPDATE
          USING ( auth.uid() = profile_id )
          WITH CHECK ( auth.uid() = profile_id );

        CREATE POLICY "Users can delete own list_items"
          ON list_items FOR DELETE
          USING ( auth.uid() = profile_id );
          
    END IF;
END $$;
