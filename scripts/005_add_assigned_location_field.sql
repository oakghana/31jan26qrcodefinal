-- Add assigned_location_id field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES public.geofence_locations(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_location ON public.user_profiles(assigned_location_id);

-- Update RLS policies to include location assignment
CREATE POLICY "Admins can update all profiles with location" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add sample location assignments for existing users (optional)
-- This will assign users to the first active location if they don't have one
UPDATE public.user_profiles 
SET assigned_location_id = (
    SELECT id FROM public.geofence_locations 
    WHERE is_active = true 
    LIMIT 1
)
WHERE assigned_location_id IS NULL 
AND EXISTS (SELECT 1 FROM public.geofence_locations WHERE is_active = true);
