-- =============================================================================
-- Migration 43: Definitive Family RLS + Data Model Fix
-- =============================================================================
-- Run this ENTIRE script in Supabase SQL Editor.
-- It does 5 things in order:
--   1. Nukes ALL old conflicting "own"-style policies on every table
--   2. Removes known dangerous open-access policies (lists_allow_all, notes open)
--   3. Creates/replaces has_family_access() helper (idempotent)
--   4. Recreates clean, consistent family-scoped policies on every table
--   5. One-time data backfill: moves member-owned rows → owner's profile_id
-- =============================================================================


-- =============================================================================
-- STEP 1: Drop ALL policies that match old "own" naming pattern
-- =============================================================================
-- This catches every variant: "Users can view own events", "Users can insert own tasks", etc.
-- It also catches the dangerous "allow all" variants.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname ILIKE '%own%'
        OR policyname ILIKE '%allow_all%'
        OR policyname ILIKE '%Allow all%'
        OR policyname ILIKE '%lists_allow%'
        OR policyname ILIKE '%Enable all%'
        OR policyname ILIKE '%family%'   -- also wipe the migration 42 ones so we redo them cleanly
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I;',
      r.policyname,
      r.tablename
    );
    RAISE NOTICE 'Dropped policy: % on %', r.policyname, r.tablename;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 2: Drop any remaining named dangerous policies explicitly
-- =============================================================================

DROP POLICY IF EXISTS "lists_allow_all" ON public.lists;
DROP POLICY IF EXISTS "lists_allow_all" ON public.list_items;

DROP POLICY IF EXISTS "Allow all selects on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow all inserts on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow all updates on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow all deletes on notes" ON public.notes;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.events;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tasks;


-- =============================================================================
-- STEP 3: Create (or replace) the has_family_access helper
-- =============================================================================
-- SECURITY DEFINER bypasses RLS when reading the profiles table internally,
-- which prevents recursive policy evaluation and ensures correct results.

CREATE OR REPLACE FUNCTION public.has_family_access(query_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      -- Case 1: caller IS the family owner (data belongs to them directly)
      auth.uid() = query_profile_id
      OR
      -- Case 2: caller is a MEMBER of this family (their owner_id = the family owner)
      (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()) = query_profile_id
    ),
    false
  );
$$;


-- =============================================================================
-- STEP 4: Recreate all policies — clean, consistent, no duplicates
-- =============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- Using has_family_access on COALESCE(owner_id, id) to handle both:
--   • Owners (owner_id = their own id, or owner_id is null after migration 41)
--   • Members (owner_id = the owner's uuid)
-- ----------------------------------------------------------------------------

CREATE POLICY "family_profiles_select"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.has_family_access(COALESCE(owner_id, id))
  );

CREATE POLICY "family_profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "family_profiles_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
CREATE POLICY "family_events_select"
  ON public.events FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_events_insert"
  ON public.events FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_events_update"
  ON public.events FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_events_delete"
  ON public.events FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
CREATE POLICY "family_tasks_select"
  ON public.tasks FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_tasks_insert"
  ON public.tasks FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_tasks_update"
  ON public.tasks FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_tasks_delete"
  ON public.tasks FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- documents (vault)
-- ----------------------------------------------------------------------------
CREATE POLICY "family_documents_select"
  ON public.documents FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_documents_insert"
  ON public.documents FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_documents_update"
  ON public.documents FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_documents_delete"
  ON public.documents FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- notes
-- ----------------------------------------------------------------------------
CREATE POLICY "family_notes_select"
  ON public.notes FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_notes_insert"
  ON public.notes FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_notes_update"
  ON public.notes FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_notes_delete"
  ON public.notes FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- folders
-- ----------------------------------------------------------------------------
CREATE POLICY "family_folders_select"
  ON public.folders FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_folders_insert"
  ON public.folders FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_folders_update"
  ON public.folders FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_folders_delete"
  ON public.folders FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- lists
-- ----------------------------------------------------------------------------
CREATE POLICY "family_lists_select"
  ON public.lists FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_lists_insert"
  ON public.lists FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_lists_update"
  ON public.lists FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_lists_delete"
  ON public.lists FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- list_items
-- ----------------------------------------------------------------------------
CREATE POLICY "family_list_items_select"
  ON public.list_items FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_list_items_insert"
  ON public.list_items FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_list_items_update"
  ON public.list_items FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_list_items_delete"
  ON public.list_items FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- recipes
-- ----------------------------------------------------------------------------
CREATE POLICY "family_recipes_select"
  ON public.recipes FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_recipes_insert"
  ON public.recipes FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_recipes_update"
  ON public.recipes FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_recipes_delete"
  ON public.recipes FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- collections
-- ----------------------------------------------------------------------------
CREATE POLICY "family_collections_select"
  ON public.collections FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_collections_insert"
  ON public.collections FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_collections_update"
  ON public.collections FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_collections_delete"
  ON public.collections FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- collection_recipes
-- ----------------------------------------------------------------------------
CREATE POLICY "family_collection_recipes_select"
  ON public.collection_recipes FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_collection_recipes_insert"
  ON public.collection_recipes FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_collection_recipes_update"
  ON public.collection_recipes FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_collection_recipes_delete"
  ON public.collection_recipes FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- meal_plans
-- ----------------------------------------------------------------------------
CREATE POLICY "family_meal_plans_select"
  ON public.meal_plans FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_meal_plans_insert"
  ON public.meal_plans FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_meal_plans_update"
  ON public.meal_plans FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_meal_plans_delete"
  ON public.meal_plans FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- transactions
-- ----------------------------------------------------------------------------
CREATE POLICY "family_transactions_select"
  ON public.transactions FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_transactions_insert"
  ON public.transactions FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_transactions_update"
  ON public.transactions FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_transactions_delete"
  ON public.transactions FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- budgets
-- ----------------------------------------------------------------------------
CREATE POLICY "family_budgets_select"
  ON public.budgets FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_budgets_insert"
  ON public.budgets FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_budgets_update"
  ON public.budgets FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_budgets_delete"
  ON public.budgets FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- settings (family_name etc. — shared)
-- ----------------------------------------------------------------------------
CREATE POLICY "family_settings_select"
  ON public.settings FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_settings_insert"
  ON public.settings FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_settings_update"
  ON public.settings FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_settings_delete"
  ON public.settings FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- app_settings (onboarding flags — shared)
-- ----------------------------------------------------------------------------
CREATE POLICY "family_app_settings_select"
  ON public.app_settings FOR SELECT USING (public.has_family_access(profile_id));

CREATE POLICY "family_app_settings_insert"
  ON public.app_settings FOR INSERT WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_app_settings_update"
  ON public.app_settings FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "family_app_settings_delete"
  ON public.app_settings FOR DELETE USING (public.has_family_access(profile_id));

-- ----------------------------------------------------------------------------
-- user_preferences, notification_preferences, quiet_hours, app_lock
-- These are PERSONAL (per-device/per-user) — strict self-only access.
-- ----------------------------------------------------------------------------
CREATE POLICY "personal_user_preferences_select"
  ON public.user_preferences FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "personal_user_preferences_insert"
  ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_user_preferences_update"
  ON public.user_preferences FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_user_preferences_delete"
  ON public.user_preferences FOR DELETE USING (auth.uid() = profile_id);

CREATE POLICY "personal_notification_prefs_select"
  ON public.notification_preferences FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "personal_notification_prefs_insert"
  ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_notification_prefs_update"
  ON public.notification_preferences FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_notification_prefs_delete"
  ON public.notification_preferences FOR DELETE USING (auth.uid() = profile_id);

CREATE POLICY "personal_quiet_hours_select"
  ON public.quiet_hours FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "personal_quiet_hours_insert"
  ON public.quiet_hours FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_quiet_hours_update"
  ON public.quiet_hours FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_quiet_hours_delete"
  ON public.quiet_hours FOR DELETE USING (auth.uid() = profile_id);

CREATE POLICY "personal_app_lock_select"
  ON public.app_lock FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "personal_app_lock_insert"
  ON public.app_lock FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_app_lock_update"
  ON public.app_lock FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "personal_app_lock_delete"
  ON public.app_lock FOR DELETE USING (auth.uid() = profile_id);


-- =============================================================================
-- STEP 5: One-time data backfill
-- =============================================================================
-- Fix existing rows where a member stored data under their own auth.uid()
-- instead of under the family owner's profile_id.
-- After this runs, ALL family data lives under owner_id.
-- Safe to re-run: WHERE clause is keyed on role='member' so owners are untouched.
-- =============================================================================

-- Helper: backfill any table where profile_id = member.id → should be member.owner_id
-- We join through profiles to find rows where the profile is a 'member' role.

UPDATE public.events t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.tasks t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.documents t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.notes t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.folders t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.lists t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.list_items t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.recipes t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.collections t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.collection_recipes t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.meal_plans t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.transactions t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

UPDATE public.budgets t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

-- settings: unique constraint on (profile_id, key) requires conflict-safe migration.
-- First, migrate rows where the owner does NOT already have that key.
-- Then, delete the leftover member rows that would have conflicted.
UPDATE public.settings t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id
  -- Only migrate if the owner doesn't already have this key (avoids unique violation)
  AND NOT EXISTS (
    SELECT 1 FROM public.settings s2
    WHERE s2.profile_id = p.owner_id
      AND s2.key = t.key
  );

-- Delete any remaining member-owned settings rows that couldn't be migrated
-- because the owner already had that key (their value takes precedence).
DELETE FROM public.settings t
USING public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

-- app_settings: same pattern — conflict-safe migration.
UPDATE public.app_settings t
SET profile_id = p.owner_id,
    updated_at = NOW()
FROM public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id
  AND NOT EXISTS (
    SELECT 1 FROM public.app_settings s2
    WHERE s2.profile_id = p.owner_id
  );

DELETE FROM public.app_settings t
USING public.profiles p
WHERE t.profile_id = p.id
  AND p.role = 'member'
  AND p.owner_id IS NOT NULL
  AND p.owner_id <> p.id;

-- Also fix the profiles table itself: ensure every profile's owner_id is set
-- Owners should point to themselves; this fixes any NULL owner_id for owner accounts.
UPDATE public.profiles
SET owner_id = id
WHERE owner_id IS NULL
  AND (role = 'owner' OR role IS NULL);


-- =============================================================================
-- Verification — run these queries to confirm it worked
-- =============================================================================
-- 1. Check no old restrictive policies remain:
--    SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname='public' AND policyname ILIKE '%own%';
--    → Should return 0 rows
--
-- 2. Check has_family_access exists:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema='public' AND routine_name='has_family_access';
--    → Should return 1 row
--
-- 3. As the member user via API, check data counts:
--    SELECT count(*) FROM events;    -- should show owner's events
--    SELECT count(*) FROM profiles;  -- should show all family profiles
--
-- 4. Verify backfill worked (should be 0 after running):
--    SELECT count(*) FROM events e
--    JOIN profiles p ON e.profile_id = p.id
--    WHERE p.role = 'member';
--    → Should return 0
-- =============================================================================
