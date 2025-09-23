-- Clean up duplicate Head Office entries and ensure only one correct active location
-- First, let's see what we have
SELECT id, name, address, latitude, longitude, radius_meters, is_active 
FROM geofence_locations 
WHERE LOWER(name) LIKE '%head office%' OR LOWER(address) LIKE '%head office%'
ORDER BY created_at DESC;

-- Deactivate all existing Head Office entries
UPDATE geofence_locations 
SET is_active = false, updated_at = NOW()
WHERE LOWER(name) LIKE '%head office%' OR LOWER(address) LIKE '%head office%';

-- Insert the correct Head Office location with proper coordinates
-- Based on the user's current location from debug logs
INSERT INTO geofence_locations (
    name, 
    address, 
    latitude, 
    longitude, 
    radius_meters, 
    is_active,
    created_at,
    updated_at
) VALUES (
    'QCC Head Office',
    'Head Office, Accra, Ghana',
    5.55196880,
    -0.21158002,
    50,
    true,
    NOW(),
    NOW()
);

-- Verify the cleanup
SELECT id, name, address, latitude, longitude, radius_meters, is_active 
FROM geofence_locations 
WHERE LOWER(name) LIKE '%head office%' OR LOWER(address) LIKE '%head office%'
ORDER BY is_active DESC, created_at DESC;
