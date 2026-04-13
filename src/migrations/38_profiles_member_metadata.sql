-- Add member-style metadata (symbol, color, role, is_active) to profiles so that every profile can be treated like the active member.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS symbol text NOT NULL DEFAULT 'account',
    ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'member-blue',
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner',
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.profiles
SET symbol = COALESCE(symbol, 'account'),
    color = COALESCE(color, 'member-blue'),
    role = COALESCE(role, 'owner'),
    is_active = COALESCE(is_active, true);
