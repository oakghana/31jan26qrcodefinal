# Vercel Build Fix - Staff Leave Management Component

## Problem Summary

The Vercel deployment was failing with `Command "pnpm run build" exited with 1` because the newly created `StaffLeaveManagement` component was incorrectly importing server-only Supabase functions in a client component.

## Root Cause

The component had:
```tsx
"use client" // Client component marker

import { createClient } from "@/lib/supabase/client" // ❌ This is server-only!
```

The `createClient()` from `@/lib/supabase/server.ts` is marked with `"server-only"` and cannot be used in client components. This causes a build error because:
1. The import tries to use `cookies()` API
2. `cookies()` can only be called in Server Components, Server Actions, or Route Handlers
3. The build fails when Next.js detects this violation

## Solution Applied

### Fixed StaffLeaveManagement Component

Converted the component to use **API calls** instead of direct Supabase client access:

**Before (❌ Broken):**
```tsx
const supabase = createClient() // In client component
const { data: { user } } = await supabase.auth.getUser()
const { data: staffData } = await supabase.from("user_profiles").select(...)
```

**After (✅ Fixed):**
```tsx
const authResponse = await fetch("/api/auth/current-user")
const { user } = await authResponse.json()

const staffResponse = await fetch("/api/admin/staff")
const staffData = await staffResponse.json()
```

### Key Changes

1. **Removed server imports** - No more `createClient()` from server utils
2. **Used fetch API** - All database operations go through API routes
3. **Maintained permissions** - Still checks if user is admin/god before allowing access
4. **Better error handling** - API responses now properly handled with error states
5. **API endpoints used**:
   - `/api/auth/current-user` - Get authenticated user
   - `/api/admin/staff` - Fetch all staff members
   - `/api/admin/staff/[id]` - Get specific staff profile
   - `/api/attendance/leave-status` - Update leave status (POST)

## Architecture Pattern

This follows Next.js best practices:
```
Client Component (UI)
    ↓
API Routes (server-side)
    ↓
Supabase Client (server-only)
    ↓
Database
```

## Prevention for Future

✅ Always check the import source for `createClient()`:
- ✅ `import { createClient } from "@/lib/supabase/middleware"` - OK for middleware
- ✅ `import { createClient } from "@/lib/supabase/server"` - OK for Server Components only
- ❌ Never use server functions in files marked with `"use client"`

## Testing

To verify the fix works:
1. Push changes to GitHub
2. Vercel will automatically rebuild
3. Build should complete successfully now
4. Deployment will proceed to your custom domain

## Related Files Modified

- `/components/admin/staff-leave-management.tsx` - Rewritten to use API calls
- `/scripts/029_set_staff_at_post_default.sql` - Sets default leave status
- `/app/api/attendance/leave-status/route.ts` - Enhanced with permission checks

## Build Configuration Note

The project has `ignoreBuildErrors: true` in `next.config.mjs` which masks TypeScript errors during builds. This makes debugging harder - consider disabling it in development to catch issues earlier.
