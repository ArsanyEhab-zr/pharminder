import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yhxqrmweuxphspijzybp.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDgwNjUsImV4cCI6MjEwOTEyNDA2NX0.9Bd4SQAo3wefxfIUzxyA6_5KwxFy-2AnFqb39K4aXDE'

class DummyWS {}

const client = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

async function testPharmacistFlow() {
  console.log('1. Signing in as Pharmacist...')
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'dr.smith@pharminder.app',
    password: 'PharminderDemo123!',
  })
  if (authErr) {
    console.error('Sign in error:', authErr)
    return
  }
  console.log('✅ Pharmacist signed in successfully:', auth.user.email)

  // 2. Test reading patients from profiles
  const { data: patients, error: patErr } = await client
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      patients_data (
        age,
        gender,
        height,
        weight,
        chronic_diseases
      ),
      prescriptions:prescriptions_patient_id_fkey (
        id,
        status,
        medication:medication_id ( name )
      )
    `)
    .eq('role', 'patient')

  if (patErr) {
    console.error('❌ Error reading patients with anon client:', patErr)
  } else {
    console.log(`✅ Successfully queried patients list! Found: ${patients.length} patient(s)`)
    for (const p of patients) {
      console.log(`   - ${p.full_name} (${p.email}) with ${p.prescriptions?.length || 0} prescription(s)`)
    }
  }

  // 3. Test patient registering a dose log or fetching active prescriptions as patient
  const patientClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: DummyWS },
  })

  console.log('\n2. Signing in as Patient...')
  const { data: pAuth, error: pAuthErr } = await patientClient.auth.signInWithPassword({
    email: 'jane.patient@pharminder.app',
    password: 'PharminderDemo123!',
  })
  if (pAuthErr) {
    console.error('Patient sign in error:', pAuthErr)
    return
  }
  console.log('✅ Patient signed in successfully:', pAuth.user.email)

  const { data: patientRxs, error: rxErr } = await patientClient
    .from('prescriptions')
    .select('id, dosage_instructions, frequency, medication:medication_id ( name )')
    .eq('patient_id', pAuth.user.id)
    .eq('status', 'active')

  if (rxErr) {
    console.error('❌ Error reading patient active prescriptions:', rxErr)
  } else {
    console.log(`✅ Successfully fetched patient prescriptions! Found: ${patientRxs.length}`)
    for (const rx of patientRxs) {
      console.log(`   - ${rx.medication?.name}: ${rx.frequency}`)
    }
  }
}

testPharmacistFlow().catch(console.error)

