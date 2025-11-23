-- Create warnings table for department heads to issue warnings to staff
CREATE TABLE IF NOT EXISTS staff_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issued_by UUID NOT NULL REFERENCES user_profiles(id),
  issued_to UUID NOT NULL REFERENCES user_profiles(id),
  warning_type VARCHAR(50) NOT NULL CHECK (warning_type IN ('no_checkin', 'no_checkout', 'late_checkin', 'early_checkout')),
  warning_message TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_record_id UUID REFERENCES attendance_records(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
  department_id UUID REFERENCES departments(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_warnings_issued_to ON staff_warnings(issued_to);
CREATE INDEX IF NOT EXISTS idx_staff_warnings_issued_by ON staff_warnings(issued_by);
CREATE INDEX IF NOT EXISTS idx_staff_warnings_date ON staff_warnings(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_warnings_department ON staff_warnings(department_id);

-- RLS policies
ALTER TABLE staff_warnings ENABLE ROW LEVEL SECURITY;

-- Users can view warnings issued to them
CREATE POLICY "Users can view their own warnings"
  ON staff_warnings FOR SELECT
  USING (issued_to = auth.uid());

-- Department heads and admins can view and insert warnings
CREATE POLICY "Department heads and admins can manage warnings"
  ON staff_warnings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'department_head', 'it-admin')
    )
  );
