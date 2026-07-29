-- Migration: 20260729170500_add_user_language.sql
-- Description: Add language column and constraint to user_preferences table.

ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'th';
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_language_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_language_check CHECK (language IN ('th', 'en'));
