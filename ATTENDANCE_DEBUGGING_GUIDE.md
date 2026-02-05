# Attendance Check-in and Check-out Debugging Guide

## Overview
This guide helps debug "Failed to record attendance" and check-in/check-out failures in the QCC Attendance System.

## Recent Improvements
Enhanced error logging and validation have been added to provide better visibility into what's causing failures:

### 1. **Check-in API (`/app/api/attendance/check-in/route.ts`)**
- Added detailed error logging with error codes and messages
- Added validation for location_id being present before database insert
- Added specific error handling for:
  - **23505**: Unique constraint violations (duplicate check-ins)
  - **23503**: Foreign key violations (invalid location or user)
  - **23502**: NOT NULL constraint violations (missing required fields)

### 2. **Frontend Validation (`/components/attendance/attendance-recorder.tsx`)**
- Added check to ensure location_id exists before sending to API
- Enhanced logging to show:
  - Device info being sent
  - Location ID being used
  - Latitude/longitude coordinates
  - QR code usage flag
- Better error messages in flash notifications

### 3. **Check-out API (`/app/api/attendance/check-out/route.tsx`)**
- Improved error logging with error code details
- Development environment shows detailed error messages

## Common Issues and Solutions

### Issue 1: "Failed to record attendance" - Foreign Key Error

**Root Cause**: The `location_id` sent to the check-in API doesn't exist in the `geofence_locations` table.

**How to Debug**:
1. Check browser console logs for: `"Check-in data to send"` - verify `location_id` is present
2. Check server logs for: `"Foreign key constraint violation - location or user may not exist"`
3. Verify locations are loaded: Look for `"realTimeLocations"` in the console

**Solution**:
```sql
-- Verify locations exist
SELECT id, name, is_active FROM geofence_locations LIMIT 10;

-- Verify user profile exists
SELECT id, first_name, last_name FROM user_profiles WHERE id = 'USER_ID_HERE';
```

### Issue 2: "Failed to record attendance" - Missing Required Fields

**Root Cause**: A required field is NULL when trying to insert into attendance_records.

**How to Debug**:
1. Check server logs for: `"Not null constraint violation"`
2. Check the browser console for: `"Check-in data to send"` to see what's being sent
3. Common missing fields:
   - `check_in_location_id` - User is not near any location
   - `user_id` - Authentication failed
   - `check_in_time` - Timestamp generation failed

**Solution**:
Ensure you're within proximity of a location. Check the console for:
```
"Check-in proximity validation": {
  nearestLocation: "Location Name",
  distance: 250,
  deviceProximityRadius: 400,
  isWithinRange: true
}
```

### Issue 3: "Location ID is missing"

**Root Cause**: The frontend couldn't find a nearby location within the device's proximity radius.

**How to Debug**:
1. Check console for: `"Check-in proximity validation"` to see distances
2. Desktop/laptops have larger radius (2000m) vs mobile (400m)
3. No locations loaded at all

**Solution**:
- Move closer to a QCC location
- If using a laptop/desktop, you can be further away
- Verify locations are loaded by checking: `realTimeLocations?.length`

### Issue 4: Database Constraint Errors

**PostgreSQL Error Codes Referenced**:
- **23505**: Unique constraint violation (duplicate entry)
- **23503**: Foreign key constraint violation (referenced record doesn't exist)
- **23502**: NOT NULL constraint violation (required field is NULL)
- **23514**: Check constraint violation (invalid data format)

## Debugging Steps

### Step 1: Enable Browser DevTools
1. Press F12 or right-click → Inspect
2. Go to Console tab
3. Look for `[v0]` prefixed messages

### Step 2: Check Check-in Flow
Look for these log messages in order:
```
[v0] Check-in initiated
[v0] Device info: {...}
[v0] Check-in proximity validation: {...}
[v0] Check-in data to send: {...}
[v0] Sending check-in request to API...
[v0] Check-in API response: {...}
```

### Step 3: Verify Locations are Loaded
```javascript
// In browser console
console.log("Locations:", realTimeLocations);
console.log("Location count:", realTimeLocations?.length);
```

### Step 4: Check User Profile
Verify the user profile exists with assigned location:
```javascript
// In browser console - would need to be added to code for inspection
console.log("User profile:", userProfile);
```

### Step 5: Check Database Directly
```sql
-- Check attendance records
SELECT id, user_id, check_in_time, check_out_time 
FROM attendance_records 
WHERE user_id = 'USER_ID_HERE'
ORDER BY check_in_time DESC
LIMIT 5;

-- Check if user already checked in today
SELECT * FROM attendance_records 
WHERE user_id = 'USER_ID_HERE'
AND DATE(check_in_time) = CURRENT_DATE;

-- Verify geofence_locations exist
SELECT id, name, latitude, longitude, radius_meters, is_active 
FROM geofence_locations 
WHERE is_active = true
ORDER BY name;
```

## Network Troubleshooting

### Check API Response
In browser DevTools → Network tab:
1. Look for POST request to `/api/attendance/check-in`
2. Check Response tab for error details
3. Common response codes:
   - 200: Success
   - 400: Client error (bad data, already checked in, etc.)
   - 401: Unauthorized
   - 500: Server error (database error)

### Example Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Successfully checked in at Location Name",
  "checkInPosition": 3,
  "isLateArrival": false
}
```

### Example Error Response
```json
{
  "error": "Failed to record attendance. Please try again.",
  "details": "[development only] Foreign key constraint violated..."
}
```

## Performance Check-list

Before declaring a system-wide issue, verify:

- [ ] At least one active geofence_location exists
- [ ] User profile exists and is active
- [ ] User is authenticated (not logged out)
- [ ] User hasn't already checked in today
- [ ] Browser location permissions are granted
- [ ] User is within proximity radius of a location
- [ ] Network connectivity is working
- [ ] Server logs show no database connection errors

## Recent Migration Files

Ensure these migrations have been run:
- `001_create_database_schema.sql` - Core tables
- `003_add_check_in_method_column.sql` - Method tracking
- `004_fix_attendance_schema.sql` - Location names and remote flags
- `005_add_assigned_location_field.sql` - User location assignment
- `028_add_location_working_hours.sql` - Location working hours

## Contact & Escalation

If issues persist after debugging:
1. Check server logs for detailed error messages
2. Verify database connection is working
3. Check Supabase dashboard for table status
4. Review audit_logs table for failed attempts
