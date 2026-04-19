-- =============================================================================
-- Migration 47: Simplified Direct RLS Policies (Fixed)
-- =============================================================================
-- This migration replaces the complex and recursive has_family_access function
-- with direct, non-recursive RLS policies using CASCADE to clean up deps.
-- =============================================================================

BEGIN;

-- 1. AGGRESSIVE CLEANUP
-- We use CASCADE to automatically drop all policies that depend on the function.
DROP FUNCTION IF EXISTS public.has_family_access(uuid) CASCADE;

-- Also ensure the old SELECT policies are gone if they weren't caught by the above
DROP POLICY IF EXISTS "family_profiles_direct_select" ON public.profiles;
DROP POLICY IF EXISTS "family_events_direct_select" ON public.events;
DROP POLICY IF EXISTS "family_tasks_direct_select" ON public.tasks;
DROP POLICY IF EXISTS "family_notes_direct_select" ON public.notes;
DROP POLICY IF EXISTS "family_lists_direct_select" ON public.lists;
DROP POLICY IF EXISTS "family_list_items_direct_select" ON public.list_items;


-- 2. CREATE SIMPLIFIED, DIRECT POLICIES (RESTORE FULL CRUD)
-- We use a consistent pattern: 
-- (profile_id = auth.uid() OR profile_id = (SELECT owner_id FROM profiles WHERE id = auth.uid()))

-- --- PROFILES (Special case to avoid recursion) ---
CREATE POLICY "family_profiles_direct_select"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR 
    owner_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()) OR
    id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- --- EVENTS ---
CREATE POLICY "family_events_all" ON public.events FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- TASKS ---
CREATE POLICY "family_tasks_all" ON public.tasks FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- NOTES ---
CREATE POLICY "family_notes_all" ON public.notes FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- LISTS ---
CREATE POLICY "family_lists_all" ON public.lists FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- LIST_ITEMS ---
CREATE POLICY "family_list_items_all" ON public.list_items FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- DOCUMENTS ---
CREATE POLICY "family_documents_all" ON public.documents FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- TRANSACTIONS ---
CREATE POLICY "family_transactions_all" ON public.transactions FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- BUDGETS ---
CREATE POLICY "family_budgets_all" ON public.budgets FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- RECIPES & COLLECTIONS ---
CREATE POLICY "family_recipes_all" ON public.recipes FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "family_collections_all" ON public.collections FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "family_collection_recipes_all" ON public.collection_recipes FOR ALL
  USING (exists (select 1 from collections where collections.id = collection_recipes.collection_id and (collections.profile_id = auth.uid() OR collections.profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()))));

-- --- MEAL PLANS ---
CREATE POLICY "family_meal_plans_all" ON public.meal_plans FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

-- --- SETTINGS ---
CREATE POLICY "family_settings_all" ON public.settings FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "family_app_settings_all" ON public.app_settings FOR ALL
  USING (profile_id = auth.uid() OR profile_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()));

COMMIT;
