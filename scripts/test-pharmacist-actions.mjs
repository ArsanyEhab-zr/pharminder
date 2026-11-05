import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yhxqrmweuxphspijzybp.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDgwNjUsImV4cCI6MjEwOTEyNDA2NX0.9Bd4SQAo3wefxfIUzxyA6_5KwxFy-2AnFqb39K4aXDE'

class DummyWS {}

const client = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

async function testPharmacistPrescribeAndRegister() {
  const { data: auth } = await client.auth.signInWithPassword({
    email: 'dr.smith@pharminder.app',
    password: 'PharminderDemo123!',
  })
  console.log('Pharmacist authenticated:', auth.user.id)

  // 1. Test registering a patient from PatientManagement
  const testPatientId = crypto.randomUUID()
  const { data: newPat, error: newPatErr } = await client
    .from('profiles')
    .insert({
      id: testPatientId,
      full_name: 'Test Patient Registration',
      email: `test.pat.${Date.now()}@pharminder.local`,
      role: 'patient',
    })
    .select()

  if (newPatErr) {
    console.error('❌ Error inserting new patient as pharmacist:', newPatErr)
  } else {
    console.log('✅ Successfully inserted patient via authenticated client:', newPat[0].full_name)
    // Clean up
    await client.from('profiles').delete().eq('id', testPatientId)
    console.log('Cleaned up test patient.')
  }
}

testPharmacistPrescribeAndRegister().catch(console.error)

