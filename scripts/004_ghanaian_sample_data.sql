-- Creating comprehensive Ghanaian sample data for all tables

-- Clear existing sample data
DELETE FROM attendance_records;
DELETE FROM device_sessions;
DELETE FROM user_profiles;
DELETE FROM geofence_locations;
DELETE FROM districts;
DELETE FROM departments;

-- Insert Ghanaian districts
INSERT INTO districts (id, name, region, is_active) VALUES
(uuid_generate_v4(), 'Accra Metropolitan', 'Greater Accra Region', true),
(uuid_generate_v4(), 'Kumasi Metropolitan', 'Ashanti Region', true),
(uuid_generate_v4(), 'Sekondi-Takoradi Metropolitan', 'Western Region', true),
(uuid_generate_v4(), 'Cape Coast Metropolitan', 'Central Region', true),
(uuid_generate_v4(), 'Tamale Metropolitan', 'Northern Region', true);

-- Insert departments with Ghanaian context
INSERT INTO departments (id, name, code, description, head_id, is_active) VALUES
(uuid_generate_v4(), 'Computer Science & IT', 'CSIT', 'Information Technology and Computer Science Department', NULL, true),
(uuid_generate_v4(), 'Business Administration', 'BADM', 'Business and Management Studies Department', NULL, true),
(uuid_generate_v4(), 'Agricultural Technology', 'AGRI', 'Agricultural and Food Technology Department', NULL, true),
(uuid_generate_v4(), 'Engineering Technology', 'ENGR', 'Engineering and Technical Studies Department', NULL, true),
(uuid_generate_v4(), 'Health Sciences', 'HLTH', 'Health and Medical Sciences Department', NULL, true);

-- Insert QCC locations across Ghana
INSERT INTO geofence_locations (id, name, address, latitude, longitude, radius_meters, district_id, is_active) VALUES
(uuid_generate_v4(), 'QCC Head Office', 'University of Ghana Campus, Legon, Accra', 5.551760, -0.211845, 20, (SELECT id FROM districts WHERE name = 'Accra Metropolitan' LIMIT 1), true),
(uuid_generate_v4(), 'QCC Kumasi Campus', 'KNUST Campus, Kumasi, Ashanti Region', 6.673175, -1.565423, 20, (SELECT id FROM districts WHERE name = 'Kumasi Metropolitan' LIMIT 1), true),
(uuid_generate_v4(), 'QCC Takoradi Branch', 'Takoradi Technical University, Western Region', 4.896180, -1.775280, 20, (SELECT id FROM districts WHERE name = 'Sekondi-Takoradi Metropolitan' LIMIT 1), true),
(uuid_generate_v4(), 'QCC Cape Coast Center', 'University of Cape Coast, Central Region', 5.103690, -1.280370, 20, (SELECT id FROM districts WHERE name = 'Cape Coast Metropolitan' LIMIT 1), true),
(uuid_generate_v4(), 'QCC Tamale Office', 'University for Development Studies, Northern Region', 9.401830, -0.872950, 20, (SELECT id FROM districts WHERE name = 'Tamale Metropolitan' LIMIT 1), true);

-- Insert sample user profiles with Ghanaian names and context
INSERT INTO user_profiles (id, user_id, employee_id, first_name, last_name, email, phone, department_id, position, role, hire_date, is_active, region) VALUES
(uuid_generate_v4(), uuid_generate_v4(), 'QCC001', 'Kwame', 'Asante', 'kwame.asante@qcc.edu.gh', '+233244123456', (SELECT id FROM departments WHERE code = 'CSIT' LIMIT 1), 'Senior Lecturer', 'department_head', '2020-01-15', true, 'Greater Accra Region'),
(uuid_generate_v4(), uuid_generate_v4(), 'QCC002', 'Akosua', 'Osei', 'akosua.osei@qcc.edu.gh', '+233244234567', (SELECT id FROM departments WHERE code = 'BADM' LIMIT 1), 'Associate Professor', 'department_head', '2019-03-20', true, 'Ashanti Region'),
(uuid_generate_v4(), uuid_generate_v4(), 'QCC003', 'Kofi', 'Mensah', 'kofi.mensah@qcc.edu.gh', '+233244345678', (SELECT id FROM departments WHERE code = 'AGRI' LIMIT 1), 'Lecturer', 'staff', '2021-08-10', true, 'Western Region'),
(uuid_generate_v4(), uuid_generate_v4(), 'QCC004', 'Ama', 'Boateng', 'ama.boateng@qcc.edu.gh', '+233244456789', (SELECT id FROM departments WHERE code = 'ENGR' LIMIT 1), 'Assistant Lecturer', 'staff', '2022-02-14', true, 'Central Region'),
(uuid_generate_v4(), uuid_generate_v4(), 'QCC005', 'Yaw', 'Adjei', 'yaw.adjei@qcc.edu.gh', '+233244567890', (SELECT id FROM departments WHERE code = 'HLTH' LIMIT 1), 'Senior Lecturer', 'staff', '2020-09-01', true, 'Northern Region');

-- Insert sample device sessions
INSERT INTO device_sessions (id, user_id, device_info, ip_address, location_id, is_active) VALUES
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC001' LIMIT 1), '{"device_type": "mobile", "os": "Android", "browser": "Chrome"}', '192.168.1.100', (SELECT id FROM geofence_locations WHERE name = 'QCC Head Office' LIMIT 1), true),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC002' LIMIT 1), '{"device_type": "desktop", "os": "Windows", "browser": "Edge"}', '192.168.1.101', (SELECT id FROM geofence_locations WHERE name = 'QCC Kumasi Campus' LIMIT 1), true),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC003' LIMIT 1), '{"device_type": "mobile", "os": "iOS", "browser": "Safari"}', '192.168.1.102', (SELECT id FROM geofence_locations WHERE name = 'QCC Takoradi Branch' LIMIT 1), true),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC004' LIMIT 1), '{"device_type": "tablet", "os": "Android", "browser": "Chrome"}', '192.168.1.103', (SELECT id FROM geofence_locations WHERE name = 'QCC Cape Coast Center' LIMIT 1), true),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC005' LIMIT 1), '{"device_type": "mobile", "os": "Android", "browser": "Firefox"}', '192.168.1.104', (SELECT id FROM geofence_locations WHERE name = 'QCC Tamale Office' LIMIT 1), true);

-- Insert sample attendance records for the past week
INSERT INTO attendance_records (id, user_id, location_id, check_in_time, check_out_time, work_hours, status, device_session_id, notes) VALUES
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC001' LIMIT 1), (SELECT id FROM geofence_locations WHERE name = 'QCC Head Office' LIMIT 1), NOW() - INTERVAL '1 day' + INTERVAL '8 hours', NOW() - INTERVAL '1 day' + INTERVAL '17 hours', 9.0, 'present', (SELECT id FROM device_sessions WHERE user_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC001' LIMIT 1) LIMIT 1), 'Regular work day'),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC002' LIMIT 1), (SELECT id FROM geofence_locations WHERE name = 'QCC Kumasi Campus' LIMIT 1), NOW() - INTERVAL '1 day' + INTERVAL '7:30 hours', NOW() - INTERVAL '1 day' + INTERVAL '16:30 hours', 9.0, 'present', (SELECT id FROM device_sessions WHERE user_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC002' LIMIT 1) LIMIT 1), 'Department meeting'),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC003' LIMIT 1), (SELECT id FROM geofence_locations WHERE name = 'QCC Takoradi Branch' LIMIT 1), NOW() - INTERVAL '2 days' + INTERVAL '8:15 hours', NOW() - INTERVAL '2 days' + INTERVAL '17:15 hours', 9.0, 'present', (SELECT id FROM device_sessions WHERE user_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC003' LIMIT 1) LIMIT 1), 'Field work supervision'),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC004' LIMIT 1), (SELECT id FROM geofence_locations WHERE name = 'QCC Cape Coast Center' LIMIT 1), NOW() - INTERVAL '2 days' + INTERVAL '8 hours', NOW() - INTERVAL '2 days' + INTERVAL '16 hours', 8.0, 'present', (SELECT id FROM device_sessions WHERE user_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC004' LIMIT 1) LIMIT 1), 'Laboratory sessions'),
(uuid_generate_v4(), (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC005' LIMIT 1), (SELECT id FROM geofence_locations WHERE name = 'QCC Tamale Office' LIMIT 1), NOW() - INTERVAL '3 days' + INTERVAL '9 hours', NOW() - INTERVAL '3 days' + INTERVAL '18 hours', 9.0, 'present', (SELECT id FROM device_sessions WHERE user_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC005' LIMIT 1) LIMIT 1), 'Community outreach program');

-- Update department heads
UPDATE departments SET head_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC001' LIMIT 1) WHERE code = 'CSIT';
UPDATE departments SET head_id = (SELECT user_id FROM user_profiles WHERE employee_id = 'QCC002' LIMIT 1) WHERE code = 'BADM';
