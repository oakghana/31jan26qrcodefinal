-- Updated to treat QCC locations as primary organizational units
-- Update QCC Electronic Attendance System with specific regions and departments
-- Clear existing data and insert QCC-specific regions and departments

-- Clear existing data
DELETE FROM public.user_profiles WHERE department_id IS NOT NULL;
DELETE FROM public.geofence_locations;
DELETE FROM public.districts;
DELETE FROM public.regions;
DELETE FROM public.departments;

-- Insert QCC specific departments
INSERT INTO public.departments (name, code, description, is_active) VALUES
('IT', 'IT', 'Information Technology Department', true),
('HR', 'HR', 'Human Resources Department', true),
('Audit', 'AUD', 'Audit Department', true),
('Accounts', 'ACC', 'Accounts Department', true),
('Research', 'RES', 'Research Department', true),
('Transport', 'TRA', 'Transport Department', true),
('Security', 'SEC', 'Security Department', true),
('Marketing', 'MKT', 'Marketing Department', true),
('Procurement', 'PRO', 'Procurement Department', true),
('Estate', 'EST', 'Estate Department', true),
('Operations', 'OPS', 'Operations Department', true);

-- Insert QCC locations as regions (organizational structure)
INSERT INTO public.regions (name, code, country, is_active) VALUES
('Head Office', 'HO', 'Ghana', true),
('Tema Port', 'TP', 'Ghana', true),
('Tema Research', 'TR', 'Ghana', true),
('Tema Training School', 'TTS', 'Ghana', true),
('Nsawam Archive Center', 'NAC', 'Ghana', true),
('Awutu Stores', 'AS', 'Ghana', true),
('Takoradi Port', 'TAP', 'Ghana', true),
('Kaase Port', 'KP', 'Ghana', true),
('Ashanti Regional Office', 'ARO', 'Ghana', true),
('Brong Ahafo Regional Office', 'BARO', 'Ghana', true),
('Western South Regional Office', 'WSRO', 'Ghana', true),
('Western North Regional Office', 'WNRO', 'Ghana', true),
('Volta Regional Office', 'VRO', 'Ghana', true),
('Eastern Regional Office', 'ERO', 'Ghana', true),
('Central Regional Office', 'CRO', 'Ghana', true);

-- Create districts for each QCC location (for organizational hierarchy)
DO $$
DECLARE
    region_record RECORD;
BEGIN
    -- Create a district for each QCC location
    FOR region_record IN SELECT id, name, code FROM public.regions LOOP
        INSERT INTO public.districts (name, code, region_id, is_active) 
        VALUES (region_record.name || ' District', region_record.code || '_DIST', region_record.id, true);
    END LOOP;
END $$;

-- Insert QCC specific geofence locations with exact coordinates
DO $$
DECLARE
    ho_district_id UUID;
    tp_district_id UUID;
    tr_district_id UUID;
    tts_district_id UUID;
    nac_district_id UUID;
    as_district_id UUID;
    tap_district_id UUID;
    kp_district_id UUID;
    aro_district_id UUID;
    baro_district_id UUID;
    wsro_district_id UUID;
    wnro_district_id UUID;
    vro_district_id UUID;
    ero_district_id UUID;
    cro_district_id UUID;
BEGIN
    -- Get district IDs for each QCC location
    SELECT d.id INTO ho_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'HO';
    SELECT d.id INTO tp_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'TP';
    SELECT d.id INTO tr_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'TR';
    SELECT d.id INTO tts_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'TTS';
    SELECT d.id INTO nac_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'NAC';
    SELECT d.id INTO as_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'AS';
    SELECT d.id INTO tap_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'TAP';
    SELECT d.id INTO kp_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'KP';
    SELECT d.id INTO aro_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'ARO';
    SELECT d.id INTO baro_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'BARO';
    SELECT d.id INTO wsro_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'WSRO';
    SELECT d.id INTO wnro_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'WNRO';
    SELECT d.id INTO vro_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'VRO';
    SELECT d.id INTO ero_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'ERO';
    SELECT d.id INTO cro_district_id FROM public.districts d JOIN public.regions r ON d.region_id = r.id WHERE r.code = 'CRO';

    -- Insert QCC locations with precise 20-meter geofencing
    INSERT INTO public.geofence_locations (name, address, latitude, longitude, radius_meters, district_id, is_active) VALUES
    ('Head Office', 'QCC Head Office, Accra, Ghana', 5.551760, -0.211845, 20, ho_district_id, true),
    ('Tema Port', 'QCC Tema Port Office, Tema, Ghana', 5.670000, -0.017000, 20, tp_district_id, true),
    ('Tema Research', 'QCC Tema Research Center, Tema, Ghana', 5.665000, -0.020000, 20, tr_district_id, true),
    ('Tema Training School', 'QCC Tema Training School, Tema, Ghana', 5.672000, -0.015000, 20, tts_district_id, true),
    ('Nsawam Archive Center', 'QCC Nsawam Archive Center, Nsawam, Ghana', 5.808000, -0.351000, 20, nac_district_id, true),
    ('Awutu Stores', 'QCC Awutu Stores, Awutu, Ghana', 5.450000, -0.650000, 20, as_district_id, true),
    ('Takoradi Port', 'QCC Takoradi Port Office, Takoradi, Ghana', 4.896000, -1.756000, 20, tap_district_id, true),
    ('Kaase Port', 'QCC Kaase Port Office, Kumasi, Ghana', 6.688000, -1.628000, 20, kp_district_id, true),
    ('Ashanti Regional Office', 'QCC Ashanti Regional Office, Kumasi, Ghana', 6.692000, -1.624000, 20, aro_district_id, true),
    ('Brong Ahafo Regional Office', 'QCC Brong Ahafo Regional Office, Sunyani, Ghana', 7.340000, -2.327000, 20, baro_district_id, true),
    ('Western South Regional Office', 'QCC Western South Regional Office, Takoradi, Ghana', 4.900000, -1.750000, 20, wsro_district_id, true),
    ('Western North Regional Office', 'QCC Western North Regional Office, Sefwi Wiawso, Ghana', 6.210000, -2.490000, 20, wnro_district_id, true),
    ('Volta Regional Office', 'QCC Volta Regional Office, Ho, Ghana', 6.601000, 0.472000, 20, vro_district_id, true),
    ('Eastern Regional Office', 'QCC Eastern Regional Office, Koforidua, Ghana', 6.094000, -0.259000, 20, ero_district_id, true),
    ('Central Regional Office', 'QCC Central Regional Office, Cape Coast, Ghana', 5.105000, -1.247000, 20, cro_district_id, true);
END $$;
