-- Add schedules table to QCC Electronic Attendance System
-- This table manages work schedules for staff members

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id),
    location_id UUID REFERENCES public.geofence_locations(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
    schedule_type VARCHAR(30) DEFAULT 'regular' CHECK (schedule_type IN ('regular', 'overtime', 'meeting', 'training', 'event')),
    is_recurring BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_department_id ON public.schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON public.schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON public.schedules(created_by);

-- Enable Row Level Security
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for schedules
CREATE POLICY "Users can view their own schedules" ON public.schedules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view schedules in their department" ON public.schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.department_id = schedules.department_id
        )
    );

CREATE POLICY "Department heads can manage department schedules" ON public.schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role = 'department_head'
            AND up.department_id = schedules.department_id
        )
    );

CREATE POLICY "Admins can manage all schedules" ON public.schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

CREATE POLICY "Users can create schedules" ON public.schedules
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND (
            -- Users can create schedules for themselves
            auth.uid() = user_id OR
            -- Department heads can create schedules for their department
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.id = auth.uid() 
                AND up.role IN ('department_head', 'admin')
                AND (up.department_id = schedules.department_id OR up.role = 'admin')
            )
        )
    );

-- Create trigger for updated_at column
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample schedules for testing
INSERT INTO public.schedules (
    title,
    description,
    department_id,
    start_date,
    end_date,
    start_time,
    end_time,
    schedule_type,
    created_by
) VALUES 
(
    'Regular Work Schedule',
    'Standard Monday to Friday work schedule',
    (SELECT id FROM public.departments WHERE code = 'AUD' LIMIT 1),
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    '08:00:00',
    '17:00:00',
    'regular',
    (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1)
),
(
    'Department Meeting',
    'Weekly department meeting every Monday',
    (SELECT id FROM public.departments WHERE code = 'ACC' LIMIT 1),
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    '09:00:00',
    '10:00:00',
    'meeting',
    (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1)
);
