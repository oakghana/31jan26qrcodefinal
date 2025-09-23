-- Ensure all locations have 50m radius and verify the update
UPDATE geofence_locations 
SET radius_meters = 50 
WHERE radius_meters != 50;

-- Verify the update
SELECT 
  id,
  name,
  radius_meters,
  CASE 
    WHEN radius_meters = 50 THEN 'CORRECT'
    ELSE 'NEEDS UPDATE'
  END as status
FROM geofence_locations
ORDER BY name;

-- Show summary
SELECT 
  COUNT(*) as total_locations,
  COUNT(CASE WHEN radius_meters = 50 THEN 1 END) as locations_with_50m,
  COUNT(CASE WHEN radius_meters != 50 THEN 1 END) as locations_needing_update
FROM geofence_locations;
