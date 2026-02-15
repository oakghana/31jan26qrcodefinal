#!/usr/bin/env node
// Simple verification script for migration 044
// Usage: set DATABASE_URL env var and run `node scripts/verify-valid-role-044.js`

const { Client } = require('pg')

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL is required (export DATABASE_URL=...)')
    process.exit(2)
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    console.log('[v0] Checking CHECK constraints on user_profiles...')
    const res = await client.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'user_profiles'::regclass AND contype = 'c';")
    console.table(res.rows)

    console.log('[v0] Checking for invalid rows under desired role set...')
    const r2 = await client.query("SELECT COUNT(*) AS invalid_count FROM user_profiles WHERE role NOT IN ('staff','admin','department_head','it-admin','regional_manager','nsp','intern','contract','audit_staff');")
    console.log('[v0] invalid_count =', r2.rows[0].invalid_count)

    if (Number(r2.rows[0].invalid_count) === 0) {
      console.log('[v0] Verification passed: no invalid rows')
      process.exit(0)
    } else {
      console.error('[v0] Verification failed: there are rows that would violate the new constraint')
      process.exit(3)
    }
  } catch (err) {
    console.error('[v0] Verification error:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
