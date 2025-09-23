-- Update all existing locations to use 50-meter radius
-- This ensures consistency with the new 50-meter proximity requirement

UPDATE geofence_locations 
SET radius_meters = 50 
WHERE radius_meters = 20;

-- Update any locations that might have smaller radius to at least 50m
UPDATE geofence_locations 
SET radius_meters = 50 
WHERE radius_meters < 50;

-- Add a comment to track this change
COMMENT ON COLUMN geofence_locations.radius_meters IS 'Geofence radius in meters for attendance check-in (default: 50m, min: 10m, max: 10000m)';
