-- Create weekly attendance summaries table
CREATE TABLE IF NOT EXISTS weekly_attendance_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_days_worked INTEGER DEFAULT 0,
    total_work_hours NUMERIC(10, 2) DEFAULT 0,
    days_on_time INTEGER DEFAULT 0,
    days_late INTEGER DEFAULT 0,
    days_absent INTEGER DEFAULT 0,
    early_checkouts INTEGER DEFAULT 0,
    average_check_in_time TIME,
    average_check_out_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_week ON weekly_attendance_summaries(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_attendance_summaries(week_start_date DESC);

-- Create function to generate weekly summary for a user
CREATE OR REPLACE FUNCTION generate_weekly_summary(
    p_user_id UUID,
    p_week_start DATE,
    p_week_end DATE
)
RETURNS TABLE (
    total_days_worked INTEGER,
    total_work_hours NUMERIC,
    days_on_time INTEGER,
    days_late INTEGER,
    days_absent INTEGER,
    early_checkouts INTEGER,
    average_check_in_time TIME,
    average_check_out_time TIME
) AS $$
DECLARE
    v_standard_check_in_time TIME := '08:00:00';
    v_standard_check_out_time TIME := '17:00:00';
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT DATE(ar.check_in_time))::INTEGER as total_days_worked,
        COALESCE(SUM(ar.work_hours), 0) as total_work_hours,
        COUNT(DISTINCT CASE 
            WHEN ar.check_in_time::TIME <= v_standard_check_in_time 
            THEN DATE(ar.check_in_time) 
        END)::INTEGER as days_on_time,
        COUNT(DISTINCT CASE 
            WHEN ar.check_in_time::TIME > v_standard_check_in_time 
            THEN DATE(ar.check_in_time) 
        END)::INTEGER as days_late,
        (5 - COUNT(DISTINCT DATE(ar.check_in_time)))::INTEGER as days_absent,
        COUNT(CASE 
            WHEN ar.check_out_time IS NOT NULL 
            AND ar.check_out_time::TIME < v_standard_check_out_time 
            THEN 1 
        END)::INTEGER as early_checkouts,
        AVG(ar.check_in_time::TIME) as average_check_in_time,
        AVG(ar.check_out_time::TIME) as average_check_out_time
    FROM attendance_records ar
    WHERE ar.user_id = p_user_id
        AND DATE(ar.check_in_time) BETWEEN p_week_start AND p_week_end
        AND EXTRACT(DOW FROM DATE(ar.check_in_time)) BETWEEN 1 AND 5; -- Monday to Friday
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE weekly_attendance_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own summaries"
    ON weekly_attendance_summaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all summaries"
    ON weekly_attendance_summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Department heads can view their department summaries"
    ON weekly_attendance_summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up1
            INNER JOIN user_profiles up2 ON up1.department_id = up2.department_id
            WHERE up1.id = auth.uid() AND up1.role = 'department_head'
            AND up2.id = weekly_attendance_summaries.user_id
        )
    );
