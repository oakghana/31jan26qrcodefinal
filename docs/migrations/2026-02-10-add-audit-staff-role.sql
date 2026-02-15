-- Migration: Add 'audit_staff' to user_profiles role constraint
-- Run this in your Postgres DB (Supabase SQL editor / psql)

BEGIN;

-- Please confirm the constraint name below matches your database. The common name is user_profiles_role_check.
-- The migration drops the existing constraint and recreates it including 'audit_staff'.

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','it-admin','department_head','regional_manager','nsp','intern','contract','staff','audit_staff'));

COMMIT;

-- After running this migration, you should be able to create or update profiles with role = 'audit_staff'.
