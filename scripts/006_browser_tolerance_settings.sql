-- Add browser-specific tolerance settings to system_settings.geo_settings
-- This script updates the geo_settings JSONB column to include browser tolerances

DO $$
BEGIN
  -- Update system_settings with browser-specific tolerance settings
  UPDATE system_settings
  SET geo_settings = COALESCE(geo_settings, '{}'::jsonb) || jsonb_build_object(
    'browserTolerances', jsonb_build_object(
      'chrome', 200,
      'edge', 200,
      'firefox', 500,
      'safari', 300,
      'opera', 1500,
      'default', 1500
    ),
    'enableBrowserSpecificTolerance', true
  )
  WHERE id = 1;

  -- If no system_settings record exists, create one
  IF NOT FOUND THEN
    INSERT INTO system_settings (id, settings, geo_settings, created_at, updated_at)
    VALUES (
      1,
      '{}'::jsonb,
      jsonb_build_object(
        'defaultRadius', '20',
        'allowManualOverride', false,
        'requireHighAccuracy', true,
        'maxLocationAge', '300000',
        'checkInProximityRange', '50',
        'globalProximityDistance', '1500',
        'browserTolerances', jsonb_build_object(
          'chrome', 200,
          'edge', 200,
          'firefox', 500,
          'safari', 300,
          'opera', 1500,
          'default', 1500
        ),
        'enableBrowserSpecificTolerance', true
      ),
      NOW(),
      NOW()
    );
  END IF;
END $$;
