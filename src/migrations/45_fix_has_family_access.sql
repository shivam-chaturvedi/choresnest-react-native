-- =============================================================================
-- Migration 45: Fix has_family_access RLS Function
-- =============================================================================
-- This migration fixes an issue where the STABLE keyword and raw SQL execution
-- caused auth.uid() to evaluate incorrectly (to NULL) within the Supabase
-- evaluation context, resulting in completely empty data syncs for family members.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_family_access(query_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner_id uuid;
BEGIN
  -- 1. Get the current authenticated user's ID
  -- Using PL/pgSQL ensures auth.uid() forces execution context and avoids
  -- aggressive planner optimizations causing NULL resolution.
  v_uid := auth.uid();
  
  -- If not logged in, deny access flat out
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Case 1: Caller directly matches the queried profile_id (Owner requesting own data)
  IF v_uid = query_profile_id THEN
    RETURN true;
  END IF;

  -- Case 2: Caller is a MEMBER of this family requesting the owner's data
  SELECT p.owner_id INTO v_owner_id 
  FROM public.profiles p 
  WHERE p.id = v_uid;

  IF v_owner_id = query_profile_id THEN
    RETURN true;
  END IF;

  -- Default deny
  RETURN false;
END;
$$;
