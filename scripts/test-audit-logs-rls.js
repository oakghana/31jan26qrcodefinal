const path = require('path')
const { readFileSync } = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local if present
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
  // ignore
}

async function run() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) {
    console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in env')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const ts = Date.now()
  const email = `test.audit.staff+${ts}@example.com`
  const password = 'TempPassword123!'

  console.log('Creating test auth user')
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (authErr) {
    console.error('Auth create error', authErr)
    process.exit(1)
  }
  const userId = authUser.user.id

  console.log('Inserting profile with role audit_staff')
  const { data: profile, error: profileErr } = await admin
    .from('user_profiles')
    .insert({ id: userId, email, first_name: 'Test', last_name: 'Audit', employee_id: `TAS${ts}`, role: 'audit_staff', is_active: true })
    .select('*')
    .single()

  if (profileErr) {
    console.error('Profile insert error', profileErr)
    await admin.auth.admin.deleteUser(userId)
    process.exit(1)
  }

  console.log('Signing in as test user (anon/credentials)')
  const userClient = createClient(url, anonKey)
  const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({ email, password })
  if (signInErr) {
    console.error('Sign in error', signInErr)
    await admin.auth.admin.deleteUser(userId)
    process.exit(1)
  }

  // Insert a test audit log as this user (should be permitted by "Users can insert own audit logs")
  console.log('Inserting a test audit log as the test user')
  const { data: inserted, error: insertErr } = await userClient
    .from('audit_logs')
    .insert({ user_id: userId, action: 'test_access', table_name: 'test_table', details: { test: true } })
    .select('*')

  if (insertErr) {
    console.error('Failed to insert audit log as test user', insertErr)
  } else {
    console.log('Inserted audit log:', inserted)
  }

  // Try to fetch audit_logs as the test user (should be allowed because role = audit_staff)
  console.log('Attempting to SELECT audit_logs as test user')
  const { data: logs, error: logsErr } = await userClient.from('audit_logs').select('*').limit(5)
  if (logsErr) {
    console.error('Failed to SELECT audit_logs as audit_staff', logsErr)
  } else {
    console.log('SELECT succeeded, sample rows:', logs?.slice(0, 5))
  }

  // Cleanup
  console.log('Cleaning up: deleting test user')
  await admin.auth.admin.deleteUser(userId)
  console.log('Done')
}

run().catch((err) => { console.error('Unexpected error:', err); process.exit(1) })