const { readFileSync } = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Quick .env.local loader (no dependency)
try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const env = readFileSync(envPath, 'utf8')
  env.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^(\w+)=(.*)$/)
    if (m) {
      const k = m[1]
      let v = m[2] || ''
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      process.env[k] = v
    }
  })
} catch (err) {
  // Ignore if file not present
}


async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const timestamp = Date.now()
  const email = `test.audit.staff+${timestamp}@example.com`
  const password = 'TempPassword123!'

  console.log('Creating auth user:', email)
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Test', last_name: 'Audit' },
  })

  if (authErr) {
    console.error('Auth create error:', authErr)
    process.exit(1)
  }

  const userId = authUser.user.id
  console.log('Auth user created with id', userId)

  console.log('Inserting user_profiles row with role audit_staff')
  const { data: profile, error: profileErr } = await admin
    .from('user_profiles')
    .insert({ id: userId, email, first_name: 'Test', last_name: 'Audit', employee_id: `TAS${timestamp}`, role: 'audit_staff', is_active: true })
    .select('*')
    .single()

  if (profileErr) {
    console.error('Profile insert error:', profileErr)
    // Cleanup auth user
    await admin.auth.admin.deleteUser(userId)
    process.exit(1)
  }

  console.log('Inserted profile:', profile)

  // Verify
  const { data: fetched } = await admin.from('user_profiles').select('id, role').eq('id', userId).single()
  console.log('Fetched profile role:', fetched.role)

  // Cleanup
  console.log('Cleaning up: deleting user')
  await admin.auth.admin.deleteUser(userId)
  console.log('Cleanup complete')
}

run().catch((err) => { console.error('Unexpected error:', err); process.exit(1) })
