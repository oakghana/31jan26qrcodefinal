-- Fix Head Office coordinates based on user's actual location
-- User is currently at lat: 5.5519688, lng: -0.21158002 but system shows Nsawam Archive Center
-- This suggests Head Office coordinates in database are incorrect

-- First, let's check current locations to understand the issue
SELECT 
    name, 
    address, 
    latitude, 
    longitude, 
    radius_meters, 
    is_active,
    -- Calculate distance from user's current position to each location
    (6371000 * acos(
        cos(radians(5.5519688)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(-0.21158002)) + 
        sin(radians(5.5519688)) * sin(radians(latitude))
    )) as distance_from_user_meters
FROM geofence_locations 
WHERE is_active = true
ORDER BY distance_from_user_meters ASC;

-- Update Head Office to correct coordinates where user actually is
UPDATE geofence_locations 
SET 
    latitude = 5.5519688,
    longitude = -0.21158002,
    address = 'QCC Head Office, Accra, Ghana',
    radius_meters = 50,
    updated_at = NOW()
WHERE name ILIKE '%head office%' 
AND is_active = true;

-- If no Head Office exists, insert it
INSERT INTO geofence_locations (
    name,
    address,
    latitude,
    longitude,
    radius_meters,
    is_active,
    created_at,
    updated_at
)
SELECT 
    'QCC Head Office',
    'QCC Head Office, Accra, Ghana',
    5.5519688,
    -0.21158002,
    50,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM geofence_locations 
    WHERE name ILIKE '%head office%' AND is_active = true
);

-- Deactivate any duplicate or incorrect Head Office entries
UPDATE geofence_locations 
SET is_active = false, updated_at = NOW()
WHERE name ILIKE '%head office%' 
AND (latitude != 5.5519688 OR longitude != -0.21158002)
AND is_active = true;

-- Verify the fix by showing distances from user's location
SELECT 
    name, 
    address, 
    latitude, 
    longitude, 
    radius_meters, 
    is_active,
    -- Calculate distance from user's current position
    ROUND((6371000 * acos(
        cos(radians(5.5519688)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(-0.21158002)) + 
        sin(radians(5.5519688)) * sin(radians(latitude))
    ))::numeric, 0) as distance_meters
FROM geofence_locations 
WHERE is_active = true
ORDER BY distance_meters ASC
LIMIT 5;
