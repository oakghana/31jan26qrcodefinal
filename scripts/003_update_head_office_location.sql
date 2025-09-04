-- Update head office location with correct coordinates and 20-meter radius
-- Fixed table name from qcc_locations to geofence_locations
UPDATE geofence_locations 
SET 
  latitude = 5.551760,
  longitude = -0.211845,
  radius_meters = 20,
  updated_at = NOW()
WHERE name = 'Head Office';

-- Update all other locations to use 20-meter radius for precise geofencing
-- Fixed table name from qcc_locations to geofence_locations
UPDATE geofence_locations 
SET 
  radius_meters = 20,
  updated_at = NOW()
WHERE radius_meters != 20;

-- Verify the updates
-- Fixed table name from qcc_locations to geofence_locations
SELECT name, latitude, longitude, radius_meters 
FROM geofence_locations 
ORDER BY name;
