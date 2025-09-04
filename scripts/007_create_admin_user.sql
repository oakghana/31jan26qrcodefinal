-- Create admin user with credentials
-- This script creates an admin user for the QCC Electronic Attendance App

-- Create or replace function to handle admin user signup
CREATE OR REPLACE FUNCTION public.handle_admin_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if this is the admin email
    IF NEW.email = 'admin@qccgh.com' THEN
        -- Update the user profile to have admin role and IT department
        UPDATE public.user_profiles 
        SET 
            employee_id = 'QCC-ADMIN-001',
            first_name = 'System',
            last_name = 'Administrator',
            position = 'System Administrator',
            role = 'admin',
            department_id = (SELECT id FROM public.departments WHERE code = 'IT' LIMIT 1),
            is_active = true
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for admin user signup (runs after the default handle_new_user trigger)
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_admin_user_signup();

-- Add constraint only if it doesn't exist to prevent duplicate constraint error
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_minimum_radius' 
        AND table_name = 'geofence_locations'
    ) THEN
        ALTER TABLE geofence_locations 
        ADD CONSTRAINT check_minimum_radius 
        CHECK (radius_meters >= 20);
    END IF;
END $$;

-- Create a function to log admin actions (for audit trail)
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Log admin actions for security
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        NEW.updated_by,
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        row_to_json(OLD),
        row_to_json(NEW),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add triggers for admin-sensitive tables
DROP TRIGGER IF EXISTS geofence_locations_audit ON geofence_locations;
CREATE TRIGGER geofence_locations_audit
    AFTER UPDATE ON geofence_locations
    FOR EACH ROW
    EXECUTE FUNCTION log_admin_action();

-- Add column only if it doesn't exist to prevent duplicate column error
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'geofence_locations' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE geofence_locations 
        ADD COLUMN updated_by UUID REFERENCES user_profiles(id);
    END IF;
END $$;

-- Create a view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM user_profiles WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM geofence_locations WHERE is_active = true) as active_locations,
    (SELECT COUNT(*) FROM attendance_records WHERE DATE(check_in_time) = CURRENT_DATE) as today_attendance,
    (SELECT COUNT(*) FROM departments WHERE is_active = true) as active_departments;

-- Grant appropriate permissions
GRANT SELECT ON admin_dashboard_stats TO authenticated;
GRANT ALL ON audit_logs TO authenticated;

-- Drop existing policy before creating to prevent duplicate policy error
DROP POLICY IF EXISTS "Admin only location management" ON geofence_locations;
CREATE POLICY "Admin only location management" ON geofence_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Enable RLS on geofence_locations
ALTER TABLE geofence_locations ENABLE ROW LEVEL SECURITY;

-- Comment with admin credentials
COMMENT ON TABLE user_profiles IS 'Admin user created: admin@qccgh.com - Use signup page to create auth credentials';
