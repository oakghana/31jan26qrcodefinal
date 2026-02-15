-- Verification SQL for migration 044
-- Run after applying migration to confirm success

-- 1) Verify the constraint exists and includes audit_staff
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass AND contype = 'c';

-- 2) Ensure no rows would violate the new constraint
SELECT COUNT(*) AS invalid_count
FROM user_profiles
WHERE role NOT IN (
  'staff','admin','department_head','it-admin','regional_manager','nsp','intern','contract','audit_staff'
);

-- 3) Quick test: try updating a test user's role to audit_staff (run in staging)
-- UPDATE user_profiles SET role = 'audit_staff' WHERE id = '<TEST_USER_ID>' RETURNING id, role;
