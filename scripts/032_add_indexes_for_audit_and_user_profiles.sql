-- Migration: add indexes to improve audit_logs and user_profiles query performance

-- Speed up lookups of audit logs by record and created_at (used for finding the latest audit per record)
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id_created_at ON public.audit_logs(record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Speed up role-based user lookups and filters
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Ensure we still have useful indexes on user_profiles commonly used columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON public.user_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON public.user_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_location ON public.user_profiles(assigned_location_id);

-- Note: run VACUUM/ANALYZE after applying large index changes in production to refresh planner statistics.
