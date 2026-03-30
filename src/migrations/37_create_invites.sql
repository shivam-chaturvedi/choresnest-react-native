-- Create the invites table that records per-profile invite links generated via Supabase
CREATE TABLE IF NOT EXISTS public.invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitation_limit integer NOT NULL DEFAULT 1,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_profile_id ON public.invites (profile_id);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON public.invites (invited_by);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invites select own" ON public.invites;
DROP POLICY IF EXISTS "Invites insert own" ON public.invites;
DROP POLICY IF EXISTS "Invites update own" ON public.invites;
DROP POLICY IF EXISTS "Invites delete own" ON public.invites;

CREATE POLICY "Invites select own"
  ON public.invites FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Invites insert own"
  ON public.invites FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND invited_by = auth.uid()
  );

CREATE POLICY "Invites update own"
  ON public.invites FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Invites delete own"
  ON public.invites FOR DELETE
  USING (profile_id = auth.uid());
