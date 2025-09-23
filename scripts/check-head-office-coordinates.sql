-- Check Head Office coordinates in the database
SELECT 
    name,
    address,
    latitude,
    longitude,
    radius_meters,
    is_active
FROM geofence_locations 
WHERE LOWER(name) LIKE '%head office%' 
   OR LOWER(name) LIKE '%swanzy%'
   OR LOWER(address) LIKE '%accra%'
ORDER BY name;

-- Also check all locations to see the full list
SELECT 
    name,
    address,
    latitude,
    longitude,
    radius_meters,
    is_active
FROM geofence_locations 
WHERE is_active = true
ORDER BY name;
