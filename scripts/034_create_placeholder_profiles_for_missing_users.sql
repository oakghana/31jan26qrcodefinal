-- Migration: create placeholder user_profiles for any attendance_records.user_id that is missing in user_profiles
-- This creates non-active placeholder profiles so joins won't return null and logs the action to audit_logs.

BEGIN;

-- 1) Identify missing user_ids referenced by attendance_records
CREATE TEMP TABLE IF NOT EXISTS tmp_missing_user_ids AS
SELECT DISTINCT ar.user_id
FROM public.attendance_records ar
LEFT JOIN public.user_profiles up ON up.id = ar.user_id
WHERE up.id IS NULL
  AND ar.user_id IS NOT NULL;

-- 2) Insert placeholder profiles for each missing id (only if not exists)
INSERT INTO public.user_profiles (id, first_name, last_name, email, employee_id, role, is_active, created_at, updated_at)
SELECT m.user_id,
       'Unknown' AS first_name,
       'User' AS last_name,
       NULL::text AS email,
       ('MISSING-' || LEFT(m.user_id::text, 8))::text AS employee_id,
       'staff'::text AS role,
       false AS is_active,
       NOW() AS created_at,
       NOW() AS updated_at
FROM tmp_missing_user_ids m
ON CONFLICT (id) DO NOTHING;

-- 3) Insert audit log entries for created placeholders
INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, created_at)
SELECT NULL, 'backfill_placeholder_profile', 'user_profiles', id, row_to_json(public.user_profiles.*), NOW()
FROM public.user_profiles
WHERE id IN (SELECT user_id FROM tmp_missing_user_ids);

-- 4) Cleanup
DROP TABLE IF EXISTS tmp_missing_user_ids;

COMMIT;

-- Verification queries (run after the migration manually if desired):
-- SELECT COUNT(*) FROM attendance_records WHERE user_id NOT IN (SELECT id FROM user_profiles);
-- SELECT id, first_name, last_name, employee_id, is_active FROM user_profiles WHERE employee_id LIKE 'MISSING-%' LIMIT 10;