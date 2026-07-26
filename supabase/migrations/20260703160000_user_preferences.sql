-- Migration: 20260703160000_user_preferences.sql
-- Description: Create the user_preferences table for storing synced per-user UI settings and defaults.

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id TEXT PRIMARY KEY DEFAULT requesting_user_id(),
    reporting_currency TEXT NOT NULL DEFAULT 'THB' CONSTRAINT user_preferences_currency_check CHECK (reporting_currency IN ('THB', 'USD')),
    disclosure_level TEXT NOT NULL DEFAULT 'beginner' CONSTRAINT user_preferences_disclosure_check CHECK (disclosure_level IN ('beginner', 'advanced')),
    theme TEXT NOT NULL DEFAULT 'light' CONSTRAINT user_preferences_theme_check CHECK (theme IN ('dark', 'light')),
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_own_preferences ON public.user_preferences;
DROP POLICY IF EXISTS insert_own_preferences ON public.user_preferences;
DROP POLICY IF EXISTS update_own_preferences ON public.user_preferences;

-- Create owner policies
CREATE POLICY select_own_preferences ON public.user_preferences
    FOR SELECT TO authenticated USING (user_id = requesting_user_id());

CREATE POLICY insert_own_preferences ON public.user_preferences
    FOR INSERT TO authenticated WITH CHECK (user_id = requesting_user_id());

CREATE POLICY update_own_preferences ON public.user_preferences
    FOR UPDATE TO authenticated USING (user_id = requesting_user_id()) WITH CHECK (user_id = requesting_user_id());

-- Grant explicit table operations to authenticated
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
