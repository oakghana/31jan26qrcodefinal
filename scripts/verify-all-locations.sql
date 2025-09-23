-- Check all active geofence locations to ensure we have the right data
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

-- Also check if there are any location conflicts
SELECT 
    name,
    COUNT(*) as count,
    STRING_AGG(DISTINCT CONCAT(latitude, ',', longitude), '; ') as coordinates
FROM geofence_locations 
WHERE is_active = true
GROUP BY name
HAVING COUNT(*) > 1;
