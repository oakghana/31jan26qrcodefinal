-- Backfill `updated_by` on user_profiles from latest audit_logs entries
-- NOTE: run only AFTER `audit_logs` and `user_profiles` schemas exist and AFTER applying `031_add_updated_by_to_user_profiles.sql`

BEGIN;

-- Update user_profiles.updated_by with the latest audit_logs.user_id for that profile (if not already set)
WITH latest_audits AS (
  SELECT DISTINCT ON (record_id) record_id, user_id, created_at
  FROM public.audit_logs
  WHERE table_name = 'user_profiles' AND action IN ('update_staff', 'create_staff', 'deactivate_staff')
  ORDER BY record_id, created_at DESC
)
UPDATE public.user_profiles u
SET updated_by = la.user_id,
    updated_at = COALESCE(u.updated_at, la.created_at)
FROM latest_audits la
WHERE u.id = la.record_id
  AND (u.updated_by IS NULL OR u.updated_by = '')
RETURNING u.id, u.updated_by, u.updated_at;

COMMIT;

-- Verification samples
-- SELECT id, updated_by, updated_at FROM public.user_profiles WHERE updated_by IS NOT NULL LIMIT 10;
-- SELECT COUNT(*) FROM public.user_profiles WHERE updated_by IS NOT NULL;