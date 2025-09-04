-- Create test user account for ohemengappiah@qccgh.com
-- This script helps create a user account directly in the database
-- Note: The actual Supabase Auth user still needs to be created through signup

-- First, let's ensure we have the departments and regions set up
-- Insert a test user profile that will link to Supabase Auth when they sign up

DO $$
DECLARE
    it_dept_id UUID;
    head_office_id UUID;
BEGIN
    -- Get IT department ID
    SELECT id INTO it_dept_id FROM departments WHERE code = 'IT' LIMIT 1;
    
    -- Get Head Office district ID  
    SELECT id INTO head_office_id FROM districts WHERE name = 'Head Office' LIMIT 1;
    
    -- Insert user profile (this will link when they sign up with matching email)
    INSERT INTO user_profiles (
        id,
        email,
        first_name,
        last_name,
        employee_id,
        department_id,
        district_id,
        position,
        role,
        phone_number,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'ohemengappiah@qccgh.com',
        'Ohemeng',
        'Appiah',
        'QCC2024001',
        it_dept_id,
        head_office_id,
        'IT Administrator',
        'admin',
        '+233244123456',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        employee_id = EXCLUDED.employee_id,
        department_id = EXCLUDED.department_id,
        district_id = EXCLUDED.district_id,
        position = EXCLUDED.position,
        role = EXCLUDED.role,
        phone_number = EXCLUDED.phone_number,
        updated_at = NOW();
        
    RAISE NOTICE 'User profile created for ohemengappiah@qccgh.com';
    RAISE NOTICE 'User can now sign up at /auth/signup with this email and password: pa$$w0rd';
    RAISE NOTICE 'Or use the OTP login feature with this email address';
    
END $$;
