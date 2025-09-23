-- Check all current geofence locations to understand the data
SELECT 
    id,
    name,
    address,
    latitude,
    longitude,
    radius_meters,
    is_active,
    created_at
FROM geofence_locations 
WHERE is_active = true
ORDER BY name;

-- Check if there are any Head Office locations
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
ORDER BY created_at DESC;
