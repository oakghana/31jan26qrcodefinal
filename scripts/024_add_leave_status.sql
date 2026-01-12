-- Add simple leave indication to user_profiles
-- This allows staff to indicate they are on leave without full leave management

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS leave_status VARCHAR(20) DEFAULT 'active' CHECK (leave_status IN ('active', 'on_leave', 'sick_leave')),
ADD COLUMN IF NOT EXISTS leave_start_date DATE,
ADD COLUMN IF NOT EXISTS leave_end_date DATE,
ADD COLUMN IF NOT EXISTS leave_reason TEXT,
ADD COLUMN IF NOT EXISTS leave_document_url TEXT;

-- Create index for quick leave status lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_leave_status ON user_profiles(leave_status) WHERE leave_status != 'active';

COMMENT ON COLUMN user_profiles.leave_status IS 'Staff leave status: active (working), on_leave (on leave), sick_leave (sick leave)';
COMMENT ON COLUMN user_profiles.leave_start_date IS 'Start date of current leave period';
COMMENT ON COLUMN user_profiles.leave_end_date IS 'End date of current leave period';
COMMENT ON COLUMN user_profiles.leave_reason IS 'Optional reason for leave';
COMMENT ON COLUMN user_profiles.leave_document_url IS 'URL to uploaded leave/medical document';
