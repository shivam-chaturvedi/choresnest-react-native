-- =============================================================================
-- Migration 42: Family RLS Policies — Share data across owner + members
-- =============================================================================
-- PROBLEM: All tables currently use `auth.uid() = profile_id` which completely
-- blocks invited members from seeing any family data. Since all shared data is
-- stored under the owner's profile_id, members with a different auth.uid() get
-- zero rows from every table.
--
-- SOLUTION: Replace the simple equality check with a family-access helper that
-- allows access if the requesting user IS the owner or is a MEMBER of that family.
-- =============================================================================


-- =============================================================================
-- STEP 1: Create a fast helper function for family access checks
-- =============================================================================
-- This function returns TRUE if the authenticated user has access to data
-- belonging to `query_profile_id` (i.e., they are the owner or a member of
-- that family). Marking it STABLE + SECURITY DEFINER allows Postgres to cache
-- the result within a single query and gives it access to the profiles table
-- regardless of the caller's RLS context.

CREATE OR REPLACE FUNCTION public.has_family_access(query_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- User IS the family owner (owner querying their own data)
    auth.uid() = query_profile_id
    OR
    -- User is a MEMBER: their owner_id points to the family owner
    (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) = query_profile_id
  );
$$;


-- =============================================================================
-- STEP 2: profiles table — allow family members to see each other
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view family profiles" ON public.profiles;

CREATE POLICY "Users can view family profiles"
  ON public.profiles FOR SELECT
  USING (
    -- Can always see yourself
    id = auth.uid()
    OR
    -- Owner can see all their members
    owner_id = auth.uid()
    OR
    -- Members can see all profiles that share the same owner (siblings + owner)
    owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
  );

-- INSERT / UPDATE keep the strict self-only check so users can only write their own profile
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- =============================================================================
-- STEP 3: events
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

CREATE POLICY "Users can view family events"
  ON public.events FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family events"
  ON public.events FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family events"
  ON public.events FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family events"
  ON public.events FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 4: tasks
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view family tasks"
  ON public.tasks FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family tasks"
  ON public.tasks FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family tasks"
  ON public.tasks FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 5: documents (vault)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

CREATE POLICY "Users can view family documents"
  ON public.documents FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family documents"
  ON public.documents FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family documents"
  ON public.documents FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 6: notes
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;

CREATE POLICY "Users can view family notes"
  ON public.notes FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family notes"
  ON public.notes FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family notes"
  ON public.notes FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family notes"
  ON public.notes FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 7: folders (note folders)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

CREATE POLICY "Users can view family folders"
  ON public.folders FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family folders"
  ON public.folders FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family folders"
  ON public.folders FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 8: lists
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own lists" ON public.lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON public.lists;
DROP POLICY IF EXISTS "Users can update own lists" ON public.lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON public.lists;

CREATE POLICY "Users can view family lists"
  ON public.lists FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family lists"
  ON public.lists FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family lists"
  ON public.lists FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family lists"
  ON public.lists FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 9: list_items
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own list_items" ON public.list_items;
DROP POLICY IF EXISTS "Users can insert own list_items" ON public.list_items;
DROP POLICY IF EXISTS "Users can update own list_items" ON public.list_items;
DROP POLICY IF EXISTS "Users can delete own list_items" ON public.list_items;

CREATE POLICY "Users can view family list_items"
  ON public.list_items FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family list_items"
  ON public.list_items FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family list_items"
  ON public.list_items FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family list_items"
  ON public.list_items FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 10: recipes
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;

CREATE POLICY "Users can view family recipes"
  ON public.recipes FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family recipes"
  ON public.recipes FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family recipes"
  ON public.recipes FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 11: collections
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can insert own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON public.collections;

CREATE POLICY "Users can view family collections"
  ON public.collections FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family collections"
  ON public.collections FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family collections"
  ON public.collections FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family collections"
  ON public.collections FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 12: collection_recipes
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own collection_recipes" ON public.collection_recipes;
DROP POLICY IF EXISTS "Users can insert own collection_recipes" ON public.collection_recipes;
DROP POLICY IF EXISTS "Users can update own collection_recipes" ON public.collection_recipes;
DROP POLICY IF EXISTS "Users can delete own collection_recipes" ON public.collection_recipes;

CREATE POLICY "Users can view family collection_recipes"
  ON public.collection_recipes FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family collection_recipes"
  ON public.collection_recipes FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family collection_recipes"
  ON public.collection_recipes FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family collection_recipes"
  ON public.collection_recipes FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 13: meal_plans
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own meal_plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal_plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update own meal_plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal_plans" ON public.meal_plans;

CREATE POLICY "Users can view family meal_plans"
  ON public.meal_plans FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family meal_plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family meal_plans"
  ON public.meal_plans FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family meal_plans"
  ON public.meal_plans FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 14: transactions
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users can view family transactions"
  ON public.transactions FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family transactions"
  ON public.transactions FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family transactions"
  ON public.transactions FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 15: budgets
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;

CREATE POLICY "Users can view family budgets"
  ON public.budgets FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family budgets"
  ON public.budgets FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family budgets"
  ON public.budgets FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 16: settings
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.settings;

CREATE POLICY "Users can view family settings"
  ON public.settings FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family settings"
  ON public.settings FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family settings"
  ON public.settings FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family settings"
  ON public.settings FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 17: app_settings
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can insert own app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can update own app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can delete own app_settings" ON public.app_settings;

CREATE POLICY "Users can view family app_settings"
  ON public.app_settings FOR SELECT
  USING (public.has_family_access(profile_id));

CREATE POLICY "Users can insert family app_settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can update family app_settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_family_access(profile_id))
  WITH CHECK (public.has_family_access(profile_id));

CREATE POLICY "Users can delete family app_settings"
  ON public.app_settings FOR DELETE
  USING (public.has_family_access(profile_id));


-- =============================================================================
-- STEP 18: user_preferences
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own user_preferences" ON public.user_preferences;

CREATE POLICY "Users can view own user_preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own user_preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own user_preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own user_preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = profile_id);


-- =============================================================================
-- STEP 19: notification_preferences
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification_preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own notification_preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own notification_preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own notification_preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own notification_preferences"
  ON public.notification_preferences FOR DELETE
  USING (auth.uid() = profile_id);


-- =============================================================================
-- STEP 20: quiet_hours
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own quiet_hours" ON public.quiet_hours;
DROP POLICY IF EXISTS "Users can insert own quiet_hours" ON public.quiet_hours;
DROP POLICY IF EXISTS "Users can update own quiet_hours" ON public.quiet_hours;
DROP POLICY IF EXISTS "Users can delete own quiet_hours" ON public.quiet_hours;

CREATE POLICY "Users can view own quiet_hours"
  ON public.quiet_hours FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own quiet_hours"
  ON public.quiet_hours FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own quiet_hours"
  ON public.quiet_hours FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own quiet_hours"
  ON public.quiet_hours FOR DELETE
  USING (auth.uid() = profile_id);


-- =============================================================================
-- STEP 21: app_lock
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own app_lock" ON public.app_lock;
DROP POLICY IF EXISTS "Users can insert own app_lock" ON public.app_lock;
DROP POLICY IF EXISTS "Users can update own app_lock" ON public.app_lock;
DROP POLICY IF EXISTS "Users can delete own app_lock" ON public.app_lock;

-- App lock is intentionally personal — each user controls only their own PIN/biometric
CREATE POLICY "Users can view own app_lock"
  ON public.app_lock FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own app_lock"
  ON public.app_lock FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own app_lock"
  ON public.app_lock FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own app_lock"
  ON public.app_lock FOR DELETE
  USING (auth.uid() = profile_id);


-- =============================================================================
-- STEP 22: invites — owner-only access (no family sharing needed)
-- =============================================================================
-- Invite policies from migration 37 are already correct; no changes needed.
-- They are already scoped to the owning profile (the person who sent the invite).


-- =============================================================================
-- Verification queries (run manually after applying to check correctness)
-- =============================================================================
-- Check that the function exists:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public' AND routine_name = 'has_family_access';
--
-- As the logged-in member, run:
--   SELECT count(*) FROM events;     -- should return owner's events count
--   SELECT count(*) FROM profiles;   -- should return owner + all members
--   SELECT count(*) FROM tasks;      -- should return owner's tasks count
