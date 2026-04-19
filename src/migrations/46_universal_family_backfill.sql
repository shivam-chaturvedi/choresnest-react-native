-- =============================================================================
-- Migration 46: Universal Family Data Backfill & Cleanup
-- =============================================================================
-- This migration performs a comprehensive data reconciliation to ensure ALL
-- family data (Events, Tasks, Shopping, etc.) is correctly tagged with the 
-- family owner's profile_id. 
--
-- It specifically repairs data that was missed or mislabeled due to previous 
-- bugs in Migration 40 and 43.
-- =============================================================================

BEGIN;

-- 1. REPAIR "ISOLATED" MEMBERS (Migration 40 cleanup)
-- Ensure any member mistakenly pointed at themselves now points to the family head.
-- We use the 'invites' table to reconstruct the intended relationship.
UPDATE public.profiles p
SET owner_id = i.invited_by,
    updated_at = NOW()
FROM public.invites i
WHERE p.id = i.profile_id
  AND p.role = 'member'
  AND (p.owner_id IS NULL OR p.owner_id = p.id);


-- 2. UNIVERSAL PROFILE_ID ALIGNMENT
-- For each family-scoped table, we perform two updates:
--   A) Move records from a Member's ID to the Owner's ID.
--   B) Fill in NULL profile_id values based on the existing member_id (assignee).

-- --- EVENTS ---
-- Move member records to owner
UPDATE public.events t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;

-- Fill in NULLs based on member_id (Fixing UUID/Text mismatch)
UPDATE public.events t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id IS NULL AND t.member_id::text = p.id::text AND p.owner_id IS NOT NULL;

-- Ensure Owner's own records have a profile_id (if they were NULL)
UPDATE public.events t SET profile_id = p.id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id IS NULL AND t.member_id::text = p.id::text AND p.role = 'owner';


-- --- TASKS ---
-- Move member records to owner
UPDATE public.tasks t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;

-- Fill in NULLs based on assignee_id
UPDATE public.tasks t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id IS NULL AND t.assignee_id::text = p.id::text AND p.owner_id IS NOT NULL;


-- --- LIST_ITEMS ---
-- Move member records to owner
UPDATE public.list_items t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;

-- Fill in NULLs based on added_by_id
UPDATE public.list_items t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id IS NULL AND t.added_by_id::text = p.id::text AND p.owner_id IS NOT NULL;


-- --- NOTES ---
UPDATE public.notes t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;


-- --- TRANSACTIONS ---
UPDATE public.transactions t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;


-- --- DOCUMENTS ---
UPDATE public.documents t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;

-- --- BUDGETS ---
UPDATE public.budgets t SET profile_id = p.owner_id::uuid, updated_at = NOW()
FROM public.profiles p WHERE t.profile_id::text = p.id::text AND p.role = 'member' AND p.owner_id IS NOT NULL AND t.profile_id::text <> p.owner_id::text;


-- 3. FINAL SANITY CHECK
-- Ensure EVERY shared record has a profile_id. If still NULL, default to the 
-- profile_id of the person who created the row.
UPDATE public.events SET profile_id = auth.uid() WHERE profile_id IS NULL; -- Should be rare
UPDATE public.tasks SET profile_id = auth.uid() WHERE profile_id IS NULL;
UPDATE public.list_items SET profile_id = auth.uid() WHERE profile_id IS NULL;

COMMIT;
