-- Add IT-Admin role to the system
-- IT-Admin can create users and change passwords but cannot manage admins or other it-admins

-- Update role constraint to include it-admin
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'it-admin', 'department_head', 'staff', 'nsp', 'intern', 'contract'));

-- Update any users with invalid roles to staff
UPDATE public.user_profiles 
SET role = 'staff' 
WHERE role NOT IN ('admin', 'it-admin', 'department_head', 'staff', 'nsp', 'intern', 'contract');

-- Log the role addition
INSERT INTO public.audit_logs (
    action,
    table_name,
    new_values,
    created_at
)
VALUES (
    'system_configuration',
    'user_profiles',
    jsonb_build_object(
        'change', 'added_it_admin_role',
        'valid_roles', ARRAY['admin', 'it-admin', 'department_head', 'staff', 'nsp', 'intern', 'contract']
    ),
    NOW()
);
