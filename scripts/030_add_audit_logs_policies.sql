-- Migration: Add RLS policies for audit_logs to allow admin and audit_staff to view logs
-- Run this in your Postgres DB (Supabase SQL editor / psql)

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own audit logs (e.g., login events) without being blocked
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow admins and audit_staff to select (view) audit logs
DROP POLICY IF EXISTS "Admins and Audit Staff can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and Audit Staff can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin','audit_staff')
    )
  );

-- Allow admins to manage audit logs (optional: delete)
DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.audit_logs;
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;

-- NOTE: After applying this migration, users with role 'admin' or 'audit_staff' will be able to SELECT audit_logs when authenticated.
-- Verify by creating an audit_staff user, inserting a test audit_logs row with that user's id, and attempting to SELECT as that user.