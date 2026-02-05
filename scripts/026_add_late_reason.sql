-- Add late_reason column to attendance_records table
-- This allows staff to provide a reason for arriving late (after 9:00 AM)

ALTER TABLE IF EXISTS public.attendance_records
ADD COLUMN IF NOT EXISTS late_reason TEXT DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.attendance_records.late_reason IS 'Reason provided by staff for late arrival (when check-in is after 9:00 AM)';

-- Create index for filtering late arrivals with reasons
CREATE INDEX IF NOT EXISTS idx_attendance_records_late_reason 
ON public.attendance_records(user_id, status) 
WHERE status = 'late' AND late_reason IS NOT NULL;
