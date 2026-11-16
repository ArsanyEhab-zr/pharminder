import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = val
  }
  return env
}

const env = loadEnvLocal()
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY

assert.ok(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY, 'Missing Supabase env credentials in .env.local')

class DummyWS {}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

const doctorClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

function collectSrcFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSrcFiles(fullPath, out)
    } else if (!/\.(png|jpe?g|webp|svg|ico|woff2?)$/i.test(entry.name)) {
      out.push(fullPath)
    }
  }
  return out
}

async function runVerification() {
  console.log('====================================================')
  console.log('PHASE 23 VERIFICATION SUITE')
  console.log('====================================================\n')

  // 1. Verify existing patients all have unique PHM-26XXXX patient_codes
  console.log('1. Checking backfilled patient_code values across public.profiles...')
  const { data: patients, error: patErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, patient_code')
    .eq('role', 'patient')

  assert.ifError(patErr)
  assert.ok(patients && patients.length >= 2, 'Expected patient profiles in DB')

  const codePattern = /^PHM-26[2-9]{4}$/
  const seenCodes = new Set()
  for (const p of patients) {
    assert.match(p.patient_code || '', codePattern, `Invalid patient_code for ${p.email}: ${p.patient_code}`)
    assert.ok(!seenCodes.has(p.patient_code), `Duplicate patient_code detected: ${p.patient_code}`)
    seenCodes.add(p.patient_code)
  }
  console.log(`   PASS: ${patients.length} patients have unique PHM-26XXXX codes (no 0/1/O/I/L ambiguity).`)

  // 2. Verify BEFORE INSERT trigger auto-generates unique patient_code on new patient insert
  console.log('\n2. Testing BEFORE INSERT patient_code trigger...')
  const tempPatientId = crypto.randomUUID()
  try {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: tempPatientId,
        role: 'patient',
        full_name: 'Phase23 Trigger Check',
        email: `phase23.trigger.${Date.now()}@pharminder.local`,
      })
      .select('id, patient_code')
      .single()

    assert.ifError(insErr)
    assert.match(inserted.patient_code || '', codePattern, `Trigger did not assign valid PHM-26XXXX code: ${inserted.patient_code}`)
    assert.ok(!seenCodes.has(inserted.patient_code), 'Trigger generated duplicate code')
    console.log(`   PASS: Trigger auto-generated unique code ${inserted.patient_code}`)
  } finally {
    await supabaseAdmin.from('profiles').delete().eq('id', tempPatientId)
  }

  // 3. Verify Demo Safeguard & Doctor-Patient Roster Isolation + Lookup RPC
  console.log('\n3. Verifying doctor_patients demo seed, strict RLS isolation, and code lookup RPC...')
  const { error: signErr } = await doctorClient.auth.signInWithPassword({
    email: 'dr.smith@pharminder.app',
    password: 'PharminderDemo123!',
  })
  assert.ifError(signErr)

  const { data: initialRoster, error: rosterErr } = await doctorClient
    .from('doctor_patients')
    .select('patient_id, profiles:patient_id(email, full_name, patient_code)')

  assert.ifError(rosterErr)
  assert.equal(
    initialRoster.length,
    1,
    `Demo safeguard expects exactly 1 linked patient (jane.patient@pharminder.app), found ${initialRoster.length}`
  )
  assert.equal(initialRoster[0].profiles?.email, 'jane.patient@pharminder.app')
  console.log(`   PASS: dr.smith starts with 1 linked patient: Jane Doe (${initialRoster[0].profiles?.patient_code})`)

  const { data: rlsVisibleProfiles, error: rlsProfErr } = await doctorClient
    .from('profiles')
    .select('id, email, patient_code')
    .eq('role', 'patient')

  assert.ifError(rlsProfErr)
  assert.equal(rlsVisibleProfiles.length, 1, 'RLS should expose ONLY linked patient profiles to logged-in doctor')
  console.log('   PASS: Authenticated doctor SELECT on profiles sees ONLY linked patients under RLS.')

  const unlinkedCandidate = patients.find((p) => p.email !== 'jane.patient@pharminder.app')
  assert.ok(unlinkedCandidate, 'Expected at least 1 unlinked patient to test live linking')

  const { data: rpcMatch, error: rpcErr } = await doctorClient.rpc('lookup_patient_by_code', {
    p_code: unlinkedCandidate.patient_code.toLowerCase(),
  })
  assert.ifError(rpcErr)
  assert.equal(rpcMatch?.[0]?.id, unlinkedCandidate.id)
  assert.equal(rpcMatch?.[0]?.already_linked, false)
  console.log(`   PASS: Case-insensitive lookup_patient_by_code found ${unlinkedCandidate.full_name} (${unlinkedCandidate.patient_code})`)

  try {
    const drSmithId = initialRoster[0] ? (await doctorClient.auth.getUser()).data.user.id : null
    const { error: linkErr } = await doctorClient
      .from('doctor_patients')
      .insert({ doctor_id: drSmithId, patient_id: unlinkedCandidate.id })
    assert.ifError(linkErr)

    const { data: afterLinkProfiles } = await doctorClient
      .from('profiles')
      .select('id')
      .eq('role', 'patient')
    assert.equal(afterLinkProfiles.length, 2, 'Linked roster should expand immediately to 2')
    console.log('   PASS: Linking unlinked patient expands doctor roster immediately under RLS.')
  } finally {
    const drSmithId = (await doctorClient.auth.getUser()).data.user.id
    await doctorClient
      .from('doctor_patients')
      .delete()
      .eq('doctor_id', drSmithId)
      .eq('patient_id', unlinkedCandidate.id)
  }

  // 4. Verify 0 Unicode Emojis / Dingbats across all src/ text files
  console.log('\n4. Auditing src/ for 0 Unicode emojis and clinical symbol glyphs...')
  const emojiRegex = /[\u{1F000}-\u{1FAFF}\u2300-\u27BF\uFE0F]/gu
  const srcFiles = collectSrcFiles(path.resolve(process.cwd(), 'src'))
  const violations = []
  for (const file of srcFiles) {
    const text = fs.readFileSync(file, 'utf8')
    const matches = text.match(emojiRegex)
    if (matches && matches.length > 0) {
      violations.push({ file: path.relative(process.cwd(), file), matches })
    }
  }
  assert.equal(violations.length, 0, `Emoji violations found: ${JSON.stringify(violations)}`)
  console.log(`   PASS: Audited ${srcFiles.length} source files — 0 emojis found.`)

  // 5. Structural verification for Phase 23 UX modules
  console.log('\n5. Checking Phase 23 UI/UX & Alarm Engine architecture...')
  const alarmSoundSrc = fs.readFileSync('src/utils/alarmSound.js', 'utf8')
  assert.ok(alarmSoundSrc.includes('AudioContext') && alarmSoundSrc.includes('navigator.vibrate'))

  const remindersSrc = fs.readFileSync('src/hooks/useMedicationReminders.js', 'utf8')
  assert.ok(remindersSrc.includes('10000'), 'Expected 10-second interval loop')
  assert.ok(remindersSrc.includes('showNotification'), 'Expected Service Worker showNotification')
  assert.ok(remindersSrc.includes('snoozeAlarm'), 'Expected snoozeAlarm support')

  const doseModalSrc = fs.readFileSync('src/components/patient/DoseAlertModal.jsx', 'utf8')
  assert.ok(doseModalSrc.includes('min-h-[60px]') && doseModalSrc.includes('text-2xl sm:text-3xl'))

  const prescribeSrc = fs.readFileSync('src/components/pharmacist/PrescribeMedication.jsx', 'utf8')
  assert.ok(prescribeSrc.includes('max-h-[85dvh]') && prescribeSrc.includes('w-[95vw] max-w-lg'))
  assert.ok(prescribeSrc.includes('OctagonAlert') && prescribeSrc.includes('ring-4 ring-red-500/30'))
  assert.ok(prescribeSrc.includes('[0, -10, 10, -8, 8, -4, 4, 0]'))

  console.log('   PASS: All Phase 23 modules, animations, elderly alarm UI, and roster isolation checks passed!')
  console.log('\nALL PHASE 23 CHECKS PASSED WITH ZERO ERRORS.')
}

runVerification().catch((err) => {
  console.error('\nPHASE 23 VERIFICATION FAILED:', err)
  process.exit(1)
})
