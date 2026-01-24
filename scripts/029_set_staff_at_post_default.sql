-- Set all staff to "active" (at post) by default
-- This ensures staff are marked as being at work unless they explicitly indicate they are on leave
-- Only admins and god users can change this status

-- Update all users to have active status if not already set
UPDATE user_profiles
SET leave_status = 'active'
WHERE leave_status IS NULL OR leave_status != 'active';

-- Ensure all leave date fields are NULL for active users
UPDATE user_profiles
SET 
  leave_start_date = NULL,
  leave_end_date = NULL,
  leave_reason = NULL,
  leave_document_url = NULL,
  updated_at = NOW()
WHERE leave_status = 'active';

-- Create or update the constraint to ensure valid status values
ALTER TABLE user_profiles
ADD CONSTRAINT chk_leave_status_valid CHECK (leave_status IN ('active', 'on_leave', 'sick_leave'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_leave_status_active 
ON user_profiles(id, leave_status) 
WHERE leave_status = 'active';

COMMENT ON TABLE user_profiles IS 'User profiles and leave status management. All staff default to active (at post) unless explicitly marked on leave by admins.';
