-- Migration: Add 'audit_staff' to the legacy CHECK constraint `valid_role` on user_profiles
-- Created: 2026-02-11
-- Run on staging first, after backup. See README in same folder for steps.

BEGIN;

-- Drop the legacy constraint and recreate it including 'audit_staff'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS valid_role;

ALTER TABLE user_profiles
  ADD CONSTRAINT valid_role
  CHECK (role IN (
    'staff',
    'admin',
    'department_head',
    'it-admin',
    'regional_manager',
    'nsp',
    'intern',
    'contract',
    'audit_staff'
  ));

COMMIT;

-- Rollback: (run if you must revert)
-- BEGIN;
-- ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS valid_role;
-- ALTER TABLE user_profiles
--   ADD CONSTRAINT valid_role
--   CHECK (role IN ('staff','admin','department_head','it-admin','regional_manager','nsp','intern','contract'));
-- COMMIT;

-- Post-migration verification (quick SQLs you can run):
-- 1) Show constraint definition:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'user_profiles'::regclass AND contype = 'c';

-- 2) Ensure no invalid rows exist:
-- SELECT COUNT(*) FROM user_profiles WHERE role NOT IN ('staff','admin','department_head','it-admin','regional_manager','nsp','intern','contract','audit_staff');
