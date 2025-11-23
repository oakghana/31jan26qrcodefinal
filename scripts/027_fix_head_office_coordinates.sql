-- Fix incorrect Head Office coordinates
-- The Head Office should be in Accra city center, approximately 22km from Awutu Stores
-- Accra coordinates: approximately 5.6037° N, 0.1870° W (Kwame Nkrumah Avenue area)

UPDATE geofence_locations
SET 
  latitude = 5.6037,
  longitude = -0.1870,
  address = 'Kwame Nkrumah Avenue, Accra, Ghana',
  updated_at = NOW()
WHERE name = 'Head Office,Accra,Ghana';

-- Also update the Swanzy Arcade location to proper Accra coordinates
UPDATE geofence_locations
SET 
  latitude = 5.6037,
  longitude = -0.1870,
  address = 'Swanzy Arcade, Accra, Ghana',
  updated_at = NOW()
WHERE name = 'HEAD OFFICE SWANZY ARCADE';

-- Verify the changes
SELECT 
  name,
  address,
  latitude,
  longitude,
  radius_meters
FROM geofence_locations
WHERE name IN ('Head Office,Accra,Ghana', 'HEAD OFFICE SWANZY ARCADE', 'Awutu Stores')
ORDER BY name;
