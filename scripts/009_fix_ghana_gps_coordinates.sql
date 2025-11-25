-- Fix incorrect GPS coordinates for Ghanaian locations
-- The coordinates were incorrectly set to Australian locations
-- Ghana coordinates should be approximately:
-- Latitude: 4.5° to 11° North (positive values)
-- Longitude: -3.5° to 1.5° West (negative values, west of Prime Meridian)

-- Fix Awutu Stores if it has Australian coordinates
UPDATE geofence_locations
SET 
  latitude = 5.2,
  longitude = -0.5,
  address = 'QCC Awutu Stores, Awutu, Central Region, Ghana'
WHERE name = 'Awutu Stores' 
  AND (latitude < 0 OR latitude > 15 OR longitude > 10);

-- Verify Head Office coordinates are correct (should be in Accra)
UPDATE geofence_locations
SET 
  latitude = 5.55202031,
  longitude = -0.21159141,
  address = 'Head Office, Kwame Nkrumah Avenue, Accra, Ghana'
WHERE name = 'Head Office,Accra,Ghana'
  AND (latitude < 4 OR latitude > 12 OR longitude > 5 OR longitude < -5);

-- Verify Swanzy Arcade coordinates
UPDATE geofence_locations
SET 
  latitude = 5.5528508,
  longitude = -0.2113917,
  address = 'Head Office Swanzy Arcade, Kwame Nkrumah Avenue, Accra, Ghana'
WHERE name = 'HEAD OFFICE SWANZY ARCADE'
  AND (latitude < 4 OR latitude > 12 OR longitude > 5 OR longitude < -5);

-- Verify Nsawam Archive Center coordinates (Nsawam is northeast of Accra)
UPDATE geofence_locations
SET 
  latitude = 5.8,
  longitude = -0.35,
  address = 'QCC Nsawam Archive Center, Nsawam, Eastern Region, Ghana'
WHERE name = 'Nsawam Archive Center'
  AND (latitude < 4 OR latitude > 12 OR longitude > 5 OR longitude < -5);

-- Display all locations to verify they're now in Ghana
SELECT 
  name,
  latitude,
  longitude,
  address,
  radius_meters,
  is_active
FROM geofence_locations
ORDER BY name;
