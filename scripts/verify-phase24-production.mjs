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

assert.ok(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY, 'Missing Supabase credentials in .env.local')

class DummyWS {}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

const makeAnonClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, {
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
  console.log('PHASE 24 PRODUCTION READINESS VERIFICATION')
  console.log('====================================================\n')

  const stamp = Date.now()
  const testDoctorEmail = `prod.doc.${stamp}@example.com`
  const testPatientEmail = `prod.pat.${stamp}@example.com`
  const password = 'RealUserPass2026!'
  let doctorUserId = null
  let patientUserId = null

  try {
    // 1. Register real clinician + patient via Supabase Auth & clean DB state
    console.log('1. Testing brand-new patient & clinician creation with ZERO fake/default data...')
    const { data: docAuth, error: docAuthErr } = await admin.auth.admin.createUser({
      email: testDoctorEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Dr. Test Production',
        role: 'pharmacist',
        specialty: 'Clinical Pharmacy',
      },
    })
    assert.ifError(docAuthErr)
    doctorUserId = docAuth.user.id

    const { error: docProfErr } = await admin.from('profiles').insert({
      id: doctorUserId,
      role: 'pharmacist',
      full_name: 'Dr. Test Production',
      email: testDoctorEmail,
    })
    assert.ifError(docProfErr)

    const { data: patAuth, error: patAuthErr } = await admin.auth.admin.createUser({
      email: testPatientEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Production Patient One',
        role: 'patient',
      },
    })
    assert.ifError(patAuthErr)
    patientUserId = patAuth.user.id

    const { data: patProf, error: patProfErr } = await admin
      .from('profiles')
      .insert({
        id: patientUserId,
        role: 'patient',
        full_name: 'Production Patient One',
        email: testPatientEmail,
      })
      .select()
      .single()
    assert.ifError(patProfErr)
    assert.match(patProf.patient_code || '', /^PHM-26[2-9]{4}$/, 'Missing valid PHM-26XXXX code')

    const { error: pdErr } = await admin.from('patients_data').insert({
      user_id: patientUserId,
      age: null,
      gender: null,
      height: null,
      weight: null,
      chronic_diseases: [],
      family_history: null,
    })
    assert.ifError(pdErr)

    // Verify clean patient starts with 0 prescriptions and 0 chronic diseases
    const patientClient = makeAnonClient()
    const { error: wrongPassErr } = await patientClient.auth.signInWithPassword({
      email: testPatientEmail,
      password: 'WrongPassword123!',
    })
    assert.ok(wrongPassErr, 'Wrong password must be rejected strictly')

    const { error: patSignErr } = await patientClient.auth.signInWithPassword({
      email: testPatientEmail,
      password,
    })
    assert.ifError(patSignErr)

    const { data: initialRxs, error: initialRxErr } = await patientClient
      .from('prescriptions')
      .select('id')
      .eq('patient_id', patientUserId)
    assert.ifError(initialRxErr)
    assert.equal(initialRxs.length, 0, 'New patient must start with 0 prescriptions')

    const { data: initialData, error: initialDataErr } = await patientClient
      .from('patients_data')
      .select('chronic_diseases, age, gender, family_history')
      .eq('user_id', patientUserId)
      .single()
    assert.ifError(initialDataErr)
    assert.deepEqual(initialData.chronic_diseases, [], 'New patient must have 0 chronic diseases')
    assert.equal(initialData.family_history, null, 'New patient must have empty family_history')
    console.log(`   PASS: New patient ${patProf.patient_code} starts with 0 prescriptions, 0 diseases, and rejects invalid passwords.`)

    // 2. Doctor authenticates, links patient by patient_code, prescribes with scheduled_times
    console.log('\n2. Testing DB-persisted scheduled_times end-to-end across Doctor -> Patient RLS...')
    const doctorClient = makeAnonClient()
    const { error: docSignErr } = await doctorClient.auth.signInWithPassword({
      email: testDoctorEmail,
      password,
    })
    assert.ifError(docSignErr)

    const { data: lookupRes, error: lookupErr } = await doctorClient.rpc('lookup_patient_by_code', {
      p_code: patProf.patient_code,
    })
    assert.ifError(lookupErr)
    assert.equal(lookupRes?.[0]?.id, patientUserId)

    const { error: linkErr } = await doctorClient
      .from('doctor_patients')
      .insert({ doctor_id: doctorUserId, patient_id: patientUserId })
    assert.ifError(linkErr)

    const { data: meds } = await doctorClient.from('medications').select('id').limit(1)
    assert.ok(meds && meds.length > 0, 'Expected existing catalog medication in public.medications')

    const { data: createdRx, error: rxInsErr } = await doctorClient
      .from('prescriptions')
      .insert({
        patient_id: patientUserId,
        pharmacist_id: doctorUserId,
        medication_id: meds[0].id,
        dosage_instructions: 'Take 1 tablet by mouth with food',
        frequency: 'Every 12 hours (2 times daily)',
        scheduled_times: ['10:30', '22:30'],
        status: 'active',
      })
      .select('id, scheduled_times, dosage_instructions')
      .single()
    assert.ifError(rxInsErr)
    assert.deepEqual(createdRx.scheduled_times, ['10:30', '22:30'])
    console.log('   PASS: Doctor prescribed medication with scheduled_times ["10:30", "22:30"] persisted in Supabase.')

    // Patient reads DB scheduled_times & updates them directly under strict RLS
    const { data: patUpdatedRx, error: patUpdErr } = await patientClient
      .from('prescriptions')
      .update({
        scheduled_times: ['09:15', '21:15'],
        dosage_instructions: 'Tamper attempt should be ignored by DB trigger',
      })
      .eq('id', createdRx.id)
      .select('id, scheduled_times, dosage_instructions')
      .single()
    assert.ifError(patUpdErr)
    assert.deepEqual(patUpdatedRx.scheduled_times, ['09:15', '21:15'])
    assert.equal(patUpdatedRx.dosage_instructions, 'Take 1 tablet by mouth with food')
    console.log('   PASS: Patient updated scheduled_times to ["09:15", "21:15"] via RLS while immutable fields stayed protected.')

    // 3. Verify static production safeguards (zero demo autofills, zero fake seeders, zero emojis)
    console.log('\n3. Auditing Login screens, AuthContext, Dashboards, and 0-emoji rule...')
    const patientLoginSrc = fs.readFileSync('src/pages/PatientLogin.jsx', 'utf8')
    const pharmacistLoginSrc = fs.readFileSync('src/pages/PharmacistLogin.jsx', 'utf8')
    const authCtxSrc = fs.readFileSync('src/context/AuthContext.jsx', 'utf8')
    const patDashSrc = fs.readFileSync('src/pages/PatientDashboard.jsx', 'utf8')
    const adherenceSrc = fs.readFileSync('src/components/pharmacist/PatientAdherenceModal.jsx', 'utf8')

    for (const forbidden of ['fillPatientDemo', 'fillDoctorDemo', '1-Tap Fill', 'Quick Demo', 'Jane Doe', 'dr.smith@pharminder.app']) {
      assert.ok(!patientLoginSrc.includes(forbidden), `PatientLogin.jsx still contains ${forbidden}`)
      assert.ok(!pharmacistLoginSrc.includes(forbidden), `PharmacistLogin.jsx still contains ${forbidden}`)
    }
    assert.ok(patientLoginSrc.includes('Create Patient Account') && pharmacistLoginSrc.includes('Create Clinician Account'))
    assert.ok(!authCtxSrc.includes('auto-heal'), 'AuthContext.jsx must not bypass passwords via auto-heal')
    assert.ok(!patDashSrc.includes('handleSeedDemoPrescriptions') && !patDashSrc.includes('demo-rx-1'))
    assert.ok(!adherenceSrc.includes('handleSeedDemoAdherence'))

    const emojiRegex = /[\u{1F000}-\u{1FAFF}\u2300-\u27BF\uFE0F]/gu
    const srcFiles = collectSrcFiles(path.resolve(process.cwd(), 'src'))
    const violations = []
    for (const file of srcFiles) {
      const matches = fs.readFileSync(file, 'utf8').match(emojiRegex)
      if (matches?.length) violations.push({ file, matches })
    }
    assert.equal(violations.length, 0, `Emoji violations found: ${JSON.stringify(violations)}`)
    console.log(`   PASS: Audited auth screens, dashboards, and ${srcFiles.length} source files — 0 demo shortcuts and 0 emojis.`)

    console.log('\nALL PHASE 24 PRODUCTION CHECKS PASSED WITH ZERO ERRORS.')
  } finally {
    if (patientUserId) {
      await admin.from('prescriptions').delete().eq('patient_id', patientUserId)
      await admin.from('doctor_patients').delete().eq('patient_id', patientUserId)
      await admin.from('patients_data').delete().eq('user_id', patientUserId)
      await admin.from('profiles').delete().eq('id', patientUserId)
      await admin.auth.admin.deleteUser(patientUserId).catch(() => {})
    }
    if (doctorUserId) {
      await admin.from('doctor_patients').delete().eq('doctor_id', doctorUserId)
      await admin.from('profiles').delete().eq('id', doctorUserId)
      await admin.auth.admin.deleteUser(doctorUserId).catch(() => {})
    }
  }
}

runVerification().catch((err) => {
  console.error('\nPHASE 24 VERIFICATION FAILED:', err)
  process.exit(1)
})
