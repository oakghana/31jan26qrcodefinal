-- Add early_checkout_reason field to attendance_records table
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS early_checkout_reason TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN attendance_records.early_checkout_reason IS 'Reason provided by staff when checking out before 5:00 PM';
