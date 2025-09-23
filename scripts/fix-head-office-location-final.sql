-- First, let's add the correct Head Office location based on user's current coordinates
-- User is at: lat: 5.5519688, lng: -0.21158002
INSERT INTO geofence_locations (
    id,
    name,
    address,
    latitude,
    longitude,
    radius_meters,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'QCC Head Office',
    'QCC Head Office, Accra, Ghana',
    5.5519688,
    -0.21158002,
    50,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address = EXCLUDED.address,
    is_active = true,
    updated_at = NOW();

-- Deactivate the incorrect Head Office locations
UPDATE geofence_locations 
SET is_active = false, updated_at = NOW()
WHERE (LOWER(name) LIKE '%head office%' OR LOWER(address) LIKE '%head office%')
  AND NOT (latitude = 5.5519688 AND longitude = -0.21158002);

-- Verify the changes
SELECT 
    id,
    name,
    address,
    latitude,
    longitude,
    radius_meters,
    is_active
FROM geofence_locations 
WHERE LOWER(name) LIKE '%head office%' OR LOWER(address) LIKE '%head office%'
ORDER BY is_active DESC, created_at DESC;
