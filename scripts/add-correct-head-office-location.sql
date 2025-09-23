-- Add the correct Head Office location based on user's current position
-- User is at lat: 5.5519688, lng: -0.21158002 which should be Head Office

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
    5.5519688,
    -0.21158002,
    50,
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address = EXCLUDED.address,
    updated_at = NOW();

-- Also update the existing incorrect Head Office entries to be inactive
-- so they don't interfere with location detection
UPDATE geofence_locations 
SET is_active = false, updated_at = NOW()
WHERE name IN ('HEAD OFFICE SWANZY ARCADE', 'Head Office,Accra,Ghana')
AND (latitude != 5.5519688 OR longitude != -0.21158002);

-- Verify the changes
SELECT name, address, latitude, longitude, radius_meters, is_active
FROM geofence_locations 
WHERE name ILIKE '%head office%' OR name ILIKE '%office%'
ORDER BY is_active DESC, name;
