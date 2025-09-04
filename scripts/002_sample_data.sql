-- Sample data for QCC Electronic Attendance System

-- Insert Ghana regions
INSERT INTO public.regions (name, code, country) VALUES
('Greater Accra', 'GAR', 'Ghana'),
('Ashanti', 'ASH', 'Ghana'),
('Western', 'WES', 'Ghana'),
('Central', 'CEN', 'Ghana'),
('Eastern', 'EAS', 'Ghana'),
('Volta', 'VOL', 'Ghana'),
('Northern', 'NOR', 'Ghana'),
('Upper East', 'UEA', 'Ghana'),
('Upper West', 'UWE', 'Ghana'),
('Brong Ahafo', 'BAH', 'Ghana')
ON CONFLICT (name) DO NOTHING;

-- Insert sample districts
INSERT INTO public.districts (name, code, region_id) 
SELECT 'Accra Metropolitan', 'AMA', r.id FROM public.regions r WHERE r.code = 'GAR'
UNION ALL
SELECT 'Tema Metropolitan', 'TMA', r.id FROM public.regions r WHERE r.code = 'GAR'
UNION ALL
SELECT 'Kumasi Metropolitan', 'KMA', r.id FROM public.regions r WHERE r.code = 'ASH'
UNION ALL
SELECT 'Sekondi-Takoradi Metropolitan', 'STMA', r.id FROM public.regions r WHERE r.code = 'WES'
UNION ALL
SELECT 'Cape Coast Metropolitan', 'CCMA', r.id FROM public.regions r WHERE r.code = 'CEN'
ON CONFLICT (name, region_id) DO NOTHING;

-- Insert QCC departments
INSERT INTO public.departments (name, code, description) VALUES
('Information Technology', 'IT', 'Information Technology and Computer Science Department'),
('Business Administration', 'BA', 'Business Administration and Management Department'),
('Engineering Technology', 'ET', 'Engineering and Technical Studies Department'),
('Health Sciences', 'HS', 'Health Sciences and Nursing Department'),
('Liberal Arts', 'LA', 'Liberal Arts and Humanities Department'),
('Applied Sciences', 'AS', 'Applied Sciences and Mathematics Department'),
('Student Affairs', 'SA', 'Student Affairs and Services Department'),
('Human Resources', 'HR', 'Human Resources and Administration Department'),
('Finance', 'FIN', 'Finance and Accounting Department'),
('Facilities Management', 'FM', 'Facilities and Maintenance Department')
ON CONFLICT (name) DO NOTHING;

-- Insert QCC geofence locations (10 locations)
INSERT INTO public.geofence_locations (name, address, latitude, longitude, radius_meters, district_id)
SELECT 
    'QCC Main Campus - Doha',
    'Al Rayyan Road, Doha, Qatar',
    25.2854,
    51.5310,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Accra Metropolitan'
UNION ALL
SELECT 
    'QCC North Campus - Al Wakra',
    'Al Wakra Municipality, Qatar',
    25.1654,
    51.6039,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Tema Metropolitan'
UNION ALL
SELECT 
    'QCC West Campus - Al Rayyan',
    'Al Rayyan Municipality, Qatar',
    25.2919,
    51.4240,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Kumasi Metropolitan'
UNION ALL
SELECT 
    'QCC East Campus - Mesaieed',
    'Mesaieed Industrial City, Qatar',
    24.9384,
    51.5514,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Sekondi-Takoradi Metropolitan'
UNION ALL
SELECT 
    'QCC South Campus - Al Khor',
    'Al Khor Municipality, Qatar',
    25.6851,
    51.4969,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Cape Coast Metropolitan'
UNION ALL
SELECT 
    'QCC Technical Center - Dukhan',
    'Dukhan Industrial Area, Qatar',
    25.4167,
    50.7833,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Accra Metropolitan'
UNION ALL
SELECT 
    'QCC Training Center - Ras Laffan',
    'Ras Laffan Industrial City, Qatar',
    25.9167,
    51.2000,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Tema Metropolitan'
UNION ALL
SELECT 
    'QCC Research Center - Qatar Science & Technology Park',
    'QSTP, Doha, Qatar',
    25.3138,
    51.4336,
    50,
    d.id
From public.districts d WHERE d.name = 'Kumasi Metropolitan'
UNION ALL
SELECT 
    'QCC Administrative Office - West Bay',
    'West Bay Business District, Doha, Qatar',
    25.3548,
    51.5310,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Sekondi-Takoradi Metropolitan'
UNION ALL
SELECT 
    'QCC Extension Campus - Al Shamal',
    'Al Shamal Municipality, Qatar',
    26.1289,
    51.2039,
    50,
    d.id
FROM public.districts d WHERE d.name = 'Cape Coast Metropolitan'
ON CONFLICT DO NOTHING;

-- Create sample QR events
INSERT INTO public.qr_events (name, description, event_date, start_time, end_time, qr_code_data, location_id, created_by)
SELECT 
    'Monthly Staff Meeting',
    'All staff monthly meeting and updates',
    CURRENT_DATE + INTERVAL '7 days',
    '09:00:00',
    '11:00:00',
    'QR_STAFF_MEETING_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    gl.id,
    (SELECT id FROM auth.users LIMIT 1)
FROM public.geofence_locations gl 
WHERE gl.name = 'QCC Main Campus - Doha'
LIMIT 1;

-- Note: User profiles will be created automatically via trigger when users sign up
-- Sample attendance records will be created when users start using the system
