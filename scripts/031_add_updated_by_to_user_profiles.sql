-- Migration: add updated_by column to user_profiles so we can record who last changed a profile

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.user_profiles(id);

-- Optional index to speed lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_by ON public.user_profiles(updated_by);

-- Note: application code must set updated_by when updating/inserting user_profiles. This migration just adds the column.
