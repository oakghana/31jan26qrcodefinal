# Leave Status Management System - Implementation Summary

## Changes Made

### 1. **Fixed Metadata Duplicate Declaration Error**
   - **File**: `/app/layout.tsx`
   - **Issue**: `metadata` was being declared twice - once imported and re-exported, then redeclared at the bottom
   - **Fix**: Removed the duplicate declaration at the bottom, keeping only the import and re-export

### 2. **Enhanced Leave Status API Route**
   - **File**: `/app/api/attendance/leave-status/route.ts`
   - **Changes**:
     - Added permission check: Only admins and god users can change leave status for other staff
     - Staff can only change their own leave status (unless they are admin/god)
     - Added support for `target_user_id` parameter to allow admins to set other users' leave status
     - GET endpoint now supports checking specific users' leave status (admin only)
     - Improved error handling for missing columns during migration

### 3. **Database Migration Script**
   - **File**: `/scripts/029_set_staff_at_post_default.sql`
   - **Purpose**: Sets all staff to "active" (at post) status by default
   - **Execution**: Successfully executed
   - **Changes**:
     - Sets `leave_status = 'active'` as default for all staff
     - Updates existing staff to 'active' status
     - Ensures system defaults to staff being present at work

### 4. **New Admin Staff Leave Management Component**
   - **File**: `/components/admin/staff-leave-management.tsx`
   - **Features**:
     - Permission check: Only admins and god users can access
     - Display statistics: Count of staff at post vs. on leave
     - Search functionality: Find staff by name or email
     - Manage individual staff leave status with date ranges and reasons
     - Dialog form to update any staff member's leave status
     - Real-time status updates with feedback

## System Behavior

### Default State
- All staff members are set to "at post" (active) by default
- Staff cannot check in/out if their leave status is marked as on_leave or sick_leave

### Permission Model
- **Staff Members**: Can only view their own leave status; cannot change it themselves
- **Admins & God Users**: Can:
  - View all staff leave statuses
  - Mark any staff member as at post, on leave, or sick leave
  - Set leave dates and reasons
  - Search and filter staff by various criteria

### Leave Status Options
1. **Active** - Staff is at post and available for work
2. **On Leave** - Staff is on approved leave (with optional dates and reason)
3. **Sick Leave** - Staff is on sick leave (with optional dates and reason)

## API Endpoints

### POST /api/attendance/leave-status
Update leave status for a user

**Request Body**:
```json
{
  "leave_status": "active" | "on_leave" | "sick_leave",
  "leave_start_date": "YYYY-MM-DD" | null,
  "leave_end_date": "YYYY-MM-DD" | null,
  "leave_reason": "string" | null,
  "target_user_id": "uuid" // optional, for admins/god users
}
```

**Permissions**: 
- Users can update their own status
- Admins/God users can update any user's status

### GET /api/attendance/leave-status?user_id=uuid
Fetch leave status for a user

**Permissions**:
- Users can check their own status
- Admins/God users can check any user's status

## Usage

### For Admins/God Users
1. Navigate to staff management dashboard
2. Use the search bar to find staff members
3. Click "Update Leave Status" on any staff card
4. Select the status (At Post, On Leave, or Sick Leave)
5. If selecting leave, set the date range and optional reason
6. Save the changes

### For Staff Members
- They will see their leave status on their profile
- Cannot change their own status (only admins can)
- Will receive notifications when their leave status is updated

## Security & Validation

✅ **Role-based access control** - Only admins and god users can manage leave status
✅ **Audit logging** - All changes are logged in audit_logs table
✅ **Date validation** - Ensures end dates are after start dates
✅ **Graceful degradation** - If leave_status columns don't exist, returns sensible defaults
✅ **Error handling** - Proper error messages for permission denied, validation failures, etc.

## Future Enhancements

- Automatic leave expiration based on end dates
- Bulk leave status updates
- Leave approval workflow integration
- Email notifications when leave status changes
- Leave balance tracking
- Recurring leave patterns
