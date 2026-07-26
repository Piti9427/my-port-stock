-- Migration: 20260704170000_add_system_theme.sql
-- Description: Allow 'system' as a valid theme preference constraint in user_preferences.

ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_theme_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_theme_check CHECK (theme IN ('dark', 'light', 'system'));
