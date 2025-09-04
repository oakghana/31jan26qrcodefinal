-- Create three dummy users with different roles for testing
-- Note: These are user profiles only. Users must still sign up through the auth system.

-- First, ensure we have the required departments and districts
INSERT INTO departments (id, name, code, description, is_active) VALUES
('d1234567-89ab-cdef-0123-456789abcdef', 'Information Technology', 'IT', 'IT Department', true),
('d2234567-89ab-cdef-0123-456789abcdef', 'Human Resources', 'HR', 'HR Department', true),
('d3234567-89ab-cdef-0123-456789abcdef', 'Operations', 'OPS', 'Operations Department', true)
ON CONFLICT (code) DO NOTHING;

-- Create trigger function to auto-assign profiles for dummy users
CREATE OR REPLACE FUNCTION assign_dummy_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Admin user: admin.test@qccgh.com
  IF NEW.email = 'admin.test@qccgh.com' THEN
    INSERT INTO user_profiles (
      id, employee_id, first_name, last_name, email, 
      department_id, position, role, phone_number, is_active
    ) VALUES (
      NEW.id, '1000001', 'System', 'Administrator', NEW.email,
      'd1234567-89ab-cdef-0123-456789abcdef', 'System Administrator', 'admin', 
      '+233-24-123-4567', true
    );
  END IF;

  -- Department Head user: head.test@qccgh.com
  IF NEW.email = 'head.test@qccgh.com' THEN
    INSERT INTO user_profiles (
      id, employee_id, first_name, last_name, email, 
      department_id, position, role, phone_number, is_active
    ) VALUES (
      NEW.id, '2000001', 'Department', 'Head', NEW.email,
      'd2234567-89ab-cdef-0123-456789abcdef', 'HR Department Head', 'department_head', 
      '+233-24-234-5678', true
    );
  END IF;

  -- Staff user: staff.test@qccgh.com
  IF NEW.email = 'staff.test@qccgh.com' THEN
    INSERT INTO user_profiles (
      id, employee_id, first_name, last_name, email, 
      department_id, position, role, phone_number, is_active
    ) VALUES (
      NEW.id, '3000001', 'Regular', 'Staff', NEW.email,
      'd3234567-89ab-cdef-0123-456789abcdef', 'Operations Officer', 'staff', 
      '+233-24-345-6789', true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for dummy user profile assignment
DROP TRIGGER IF EXISTS assign_dummy_user_profile_trigger ON auth.users;
CREATE TRIGGER assign_dummy_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_dummy_user_profile();

-- Drop existing view first to avoid column rename conflicts
DROP VIEW IF EXISTS dummy_users_info;

-- Create a view to show dummy user login information
CREATE VIEW dummy_users_info AS
SELECT 
  'Test Users - Sign up with these emails to get pre-configured profiles:' as info,
  'admin.test@qccgh.com (Staff #: 1000001)' as admin_email,
  'Admin role with full system access' as admin_description,
  'head.test@qccgh.com (Staff #: 2000001)' as dept_head_email,
  'Department head role with staff management access' as dept_head_description,
  'staff.test@qccgh.com (Staff #: 3000001)' as staff_email,
  'Regular staff role with basic attendance access' as staff_description,
  'Use 7-digit staff numbers (1000001, 2000001, 3000001) or emails to login' as login_note;

-- Display the dummy users information
SELECT * FROM dummy_users_info;
