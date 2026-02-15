Migration 044 — Add audit_staff to `valid_role` constraint

Purpose
- Add 'audit_staff' to the legacy `valid_role` CHECK constraint on `user_profiles` so the role can be saved.

Files created
- `scripts/044_add_audit_staff_to_valid_role_constraint.sql` — migration (with rollback commented)
- `scripts/044_verify_add_audit_staff_constraint.sql` — ad-hoc verification SQL
- `scripts/verify-valid-role-044.js` — Node verification script (requires DATABASE_URL env)

Recommended run order (staging first)
1) Backup DB: `pg_dump` or Supabase snapshot
2) Preflight (optional): run `scripts/044_verify_add_audit_staff_constraint.sql` pre-migration checks
3) Apply migration:
   psql "$DATABASE_URL" -f scripts/044_add_audit_staff_to_valid_role_constraint.sql
4) Verify: run the verification SQL or `node scripts/verify-valid-role-044.js`
5) Test in app: change a user to `audit_staff` in the UI or run `node scripts/test-create-audit-staff.js`
6) If all good, apply to production during a maintenance window

Rollback
- Use the rollback snippet in the migration file or restore from backup

Notes
- The migration is idempotent and will drop the existing `valid_role` constraint then recreate it including `audit_staff`.
- Ensure you run this on staging and run the verification script before applying to production.
