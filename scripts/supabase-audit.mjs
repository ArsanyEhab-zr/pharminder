import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yhxqrmweuxphspijzybp.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDgwNjUsImV4cCI6MjEwOTEyNDA2NX0.9Bd4SQAo3wefxfIUzxyA6_5KwxFy-2AnFqb39K4aXDE'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU0ODA2NSwiZXhwIjoyMTA5MTI0MDY1fQ.hc0VLd-2CEk6G7Bb9HiqYrM5l-G2ACrQki75H8jGoz8'

class DummyWS {}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

const DEMO_PASSWORD = 'PharminderDemo123!'

const DEMO_USERS = [
  {
    email: 'dr.smith@pharminder.app',
    fullName: 'Dr. Sarah Smith, PharmD',
    role: 'pharmacist',
  },
  {
    email: 'jane.patient@pharminder.app',
    fullName: 'Jane Doe',
    role: 'patient',
  },
]

async function runAudit() {
  console.log('====================================================')
  console.log('🚀 STARTING SUPABASE AUDIT & INTEGRATION REPAIR')
  console.log('====================================================\n')

  // 1. Inspect existing users via Auth Admin
  console.log('--- STEP 1: AUTH ADMIN USER AUDIT ---')
  const { data: usersData, error: listUsersError } = await adminClient.auth.admin.listUsers()

  if (listUsersError) {
    console.error('❌ Failed to list users via admin API:', listUsersError)
    process.exit(1)
  }

  const existingUsers = usersData?.users || []
  console.log(`Found ${existingUsers.length} user(s) in auth.users:`)
  for (const u of existingUsers) {
    console.log(`  - [${u.id}] ${u.email} | Confirmed: ${u.email_confirmed_at ? 'YES (' + u.email_confirmed_at + ')' : 'NO'}`)
  }

  // 2. Setup or Update Demo Users with confirmed email
  console.log('\n--- STEP 2: ENSURE DEMO ACCOUNTS EXIST & FORCE-CONFIRMED ---')
  const resolvedUsers = {}

  for (const demo of DEMO_USERS) {
    const existing = existingUsers.find((u) => u.email?.toLowerCase() === demo.email.toLowerCase())
    if (existing) {
      console.log(`Updating existing user: ${demo.email} (${existing.id})...`)
      const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: demo.fullName,
          role: demo.role,
        },
      })
      if (updateErr) {
        console.error(`❌ Failed to update ${demo.email}:`, updateErr)
      } else {
        console.log(`✅ Successfully updated & confirmed ${demo.email}!`)
        resolvedUsers[demo.role] = updated.user
      }
    } else {
      console.log(`Creating fresh confirmed user: ${demo.email}...`)
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: demo.fullName,
          role: demo.role,
        },
      })
      if (createErr) {
        console.error(`❌ Failed to create ${demo.email}:`, createErr)
      } else {
        console.log(`✅ Successfully created & confirmed ${demo.email} (ID: ${created.user.id})!`)
        resolvedUsers[demo.role] = created.user
      }
    }
  }

  // 3. Confirm ANY other unconfirmed accounts in auth.users
  console.log('\n--- STEP 3: FORCE-CONFIRM ANY OTHER UNCONFIRMED USERS ---')
  for (const u of existingUsers) {
    if (!u.email_confirmed_at) {
      console.log(`Confirming user: ${u.email} (${u.id})...`)
      const { error: confErr } = await adminClient.auth.admin.updateUserById(u.id, {
        email_confirm: true,
      })
      if (confErr) console.warn(`Warning: failed to confirm ${u.email}:`, confErr.message)
      else console.log(`✅ Confirmed ${u.email}`)
    }
  }

  // 4. Ensure public.profiles rows exist for demo accounts
  console.log('\n--- STEP 4: VERIFY & UPSERT PUBLIC.PROFILES ---')
  for (const demo of DEMO_USERS) {
    const userObj = resolvedUsers[demo.role]
    if (!userObj) continue

    const { data: prof, error: profErr } = await adminClient
      .from('profiles')
      .upsert({
        id: userObj.id,
        full_name: demo.fullName,
        email: demo.email,
        role: demo.role,
      })
      .select()

    if (profErr) {
      console.error(`❌ Error upserting profile for ${demo.email}:`, profErr)
    } else {
      console.log(`✅ Profile upserted for ${demo.email} (${demo.role}):`, prof?.[0])
    }
  }

  // 5. Ensure patients_data row exists for Jane Doe and additional clinical patients
  console.log('\n--- STEP 5: VERIFY & UPSERT PUBLIC.PATIENTS_DATA ---')
  const patientUser = resolvedUsers['patient']
  if (patientUser) {
    const { data: pData, error: pDataErr } = await adminClient
      .from('patients_data')
      .upsert({
        user_id: patientUser.id,
        age: 54,
        gender: 'Female',
        height: 168.0,
        weight: 71.5,
        chronic_diseases: ['Type 2 Diabetes', 'Hypertension'],
        family_history: 'Family history of cardiovascular conditions',
      })
      .select()

    if (pDataErr) {
      console.error('❌ Error upserting patients_data for Jane Doe:', pDataErr)
    } else {
      console.log('✅ patients_data upserted for demo patient:', pData?.[0])
    }
  }

  // Seed additional clinical patients for pharmacist dashboard roster
  const ADDITIONAL_PATIENTS = [
    {
      id: 'b1111111-1111-4111-8111-111111111111',
      full_name: 'Johnathan Miller',
      email: 'johnathan.miller@pharminder.local',
      role: 'patient',
      vitals: { age: 62, gender: 'Male', height: 178, weight: 84.0, chronic_diseases: ['Cardiovascular Disease', 'Hyperlipidemia'] },
    },
    {
      id: 'b2222222-2222-4222-8222-222222222222',
      full_name: 'Robert Chen',
      email: 'robert.chen@pharminder.local',
      role: 'patient',
      vitals: { age: 48, gender: 'Male', height: 172, weight: 76.5, chronic_diseases: ['Asthma'] },
    },
  ]

  for (const pt of ADDITIONAL_PATIENTS) {
    await adminClient.from('profiles').upsert({
      id: pt.id,
      full_name: pt.full_name,
      email: pt.email,
      role: pt.role,
    })
    await adminClient.from('patients_data').upsert({
      user_id: pt.id,
      ...pt.vitals,
    })
    console.log(`✅ Seeded additional clinical patient: ${pt.full_name}`)
  }


  // 6. Inspect & Seed Medications Formulary
  console.log('\n--- STEP 6: VERIFY & SEED MEDICATIONS FORMULARY ---')
  const { data: existingMeds, error: medsQueryErr } = await adminClient.from('medications').select('*')
  if (medsQueryErr) {
    console.error('❌ Error querying medications table:', medsQueryErr)
  } else {
    console.log(`Found ${existingMeds?.length || 0} medications in database.`)
  }

  const FORMULARY = [
    { name: 'Amoxicillin 500mg', category: 'Antibiotic', dosage_form: 'Capsule', description: 'Broad-spectrum penicillin antibiotic for bacterial infections' },
    { name: 'Metformin 850mg', category: 'Antidiabetic', dosage_form: 'Tablet', description: 'First-line biguanide therapy for glycemic management in T2D' },
    { name: 'Atorvastatin 20mg', category: 'Statin', dosage_form: 'Tablet', description: 'HMG-CoA reductase inhibitor for lipid management' },
    { name: 'Lisinopril 10mg', category: 'Antihypertensive', dosage_form: 'Tablet', description: 'ACE inhibitor for blood pressure control' },
    { name: 'Warfarin 5mg', category: 'Anticoagulant', dosage_form: 'Tablet', description: 'Vitamin K antagonist for thromboembolic prophylaxis' },
    { name: 'Aspirin 81mg', category: 'Antiplatelet', dosage_form: 'Tablet', description: 'Low-dose acetylsalicylic acid for secondary cardiovascular prevention' },
    { name: 'Ibuprofen 400mg', category: 'NSAID', dosage_form: 'Tablet', description: 'Non-steroidal anti-inflammatory drug for pain and inflammation' },
    { name: 'Omeprazole 20mg', category: 'Gastrointestinal', dosage_form: 'Capsule', description: 'Proton pump inhibitor for acid suppression' },
  ]

  let activeMeds = existingMeds || []
  if (activeMeds.length < FORMULARY.length) {
    console.log('Seeding / Upserting complete formulary medications...')
    for (const med of FORMULARY) {
      const exists = activeMeds.find((m) => m.name.toLowerCase() === med.name.toLowerCase())
      if (!exists) {
        const { data: newMed, error: insErr } = await adminClient.from('medications').insert(med).select()
        if (insErr) console.warn('Warning inserting medication:', insErr.message)
        else {
          console.log(`  + Seeded medication: ${med.name}`)
          activeMeds.push(newMed[0])
        }
      }
    }
  }

  // 7. Seed Prescriptions and Dose Logs for Demo Patient
  console.log('\n--- STEP 7: SEED PRESCRIPTIONS & DOSE LOGS FOR PATIENT ---')
  const pharmacistUser = resolvedUsers['pharmacist']
  if (patientUser && pharmacistUser && activeMeds.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    // Find Amoxicillin, Metformin, Atorvastatin
    const amox = activeMeds.find((m) => m.name.toLowerCase().includes('amoxicillin')) || activeMeds[0]
    const metf = activeMeds.find((m) => m.name.toLowerCase().includes('metformin')) || activeMeds[1]

    const demoPrescriptions = [
      {
        patient_id: patientUser.id,
        medication_id: amox.id,
        dosage_instructions: 'Take 1 capsule by mouth every 8 hours with water',
        frequency: 'Every 8 hours (3 times daily)',
        start_date: today,
        end_date: nextMonth,
        status: 'active',
      },
      {
        patient_id: patientUser.id,
        medication_id: metf.id,
        dosage_instructions: 'Take 1 tablet twice daily with morning and evening meals',
        frequency: 'Every 12 hours (2 times daily)',
        start_date: today,
        end_date: nextMonth,
        status: 'active',
      },
    ]

    // Check if patient already has active prescriptions
    const { data: existingRxs } = await adminClient
      .from('prescriptions')
      .select('id, medication_id')
      .eq('patient_id', patientUser.id)
      .eq('status', 'active')

    let seededRxs = existingRxs || []
    if (seededRxs.length === 0) {
      console.log('Inserting active demo prescriptions for Jane Doe...')
      const { data: createdRxs, error: rxErr } = await adminClient
        .from('prescriptions')
        .insert(demoPrescriptions)
        .select()

      if (rxErr) console.error('❌ Error creating prescriptions:', rxErr)
      else {
        console.log(`✅ Created ${createdRxs.length} prescriptions for demo patient.`)
        seededRxs = createdRxs
      }
    } else {
      console.log(`Patient already has ${seededRxs.length} active prescriptions.`)
    }

    // Seed recent 7-day dose logs for compliance tracking
    const { count: doseLogCount } = await adminClient
      .from('dose_logs')
      .select('*', { count: 'exact', head: true })
      .in('prescription_id', seededRxs.map((r) => r.id))

    if (!doseLogCount || doseLogCount === 0) {
      console.log('Seeding 7 days of realistic dose logs for adherence analytics...')
      const logsToInsert = []
      const now = Date.now()

      for (const rx of seededRxs) {
        for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
          const d = new Date(now - dayOffset * 86400000)
          const dateStr = d.toISOString().split('T')[0]

          // Morning 8 AM
          const morningSched = new Date(`${dateStr}T08:00:00Z`).toISOString()
          const morningTaken = dayOffset === 2 
            ? null 
            : new Date(new Date(morningSched).getTime() + (Math.random() * 20 - 5) * 60000).toISOString()

          logsToInsert.push({
            prescription_id: rx.id,
            scheduled_time: morningSched,
            taken_time: morningTaken,
            status: morningTaken ? 'taken' : 'missed',
          })

          // Evening 8 PM
          if (dayOffset > 0 || new Date().getHours() >= 20) {
            const eveSched = new Date(`${dateStr}T20:00:00Z`).toISOString()
            const eveTaken = dayOffset === 5 
              ? null 
              : new Date(new Date(eveSched).getTime() + (Math.random() * 20) * 60000).toISOString()

            logsToInsert.push({
              prescription_id: rx.id,
              scheduled_time: eveSched,
              taken_time: eveTaken,
              status: eveTaken ? 'taken' : 'missed',
            })
          }
        }
      }

      const { data: insertedLogs, error: logInsErr } = await adminClient.from('dose_logs').insert(logsToInsert).select()
      if (logInsErr) console.error('❌ Error seeding dose logs:', logInsErr)
      else console.log(`✅ Successfully seeded ${insertedLogs.length} dose logs for compliance history!`)
    } else {
      console.log(`Dose logs already populated (${doseLogCount} logs).`)
    }

    // Check if additional patients have active prescriptions
    const ator = activeMeds.find((m) => m.name.toLowerCase().includes('atorvastatin')) || activeMeds[2]
    const lisin = activeMeds.find((m) => m.name.toLowerCase().includes('lisinopril')) || activeMeds[3]

    for (const pt of ADDITIONAL_PATIENTS) {
      const { data: existingPtRxs } = await adminClient
        .from('prescriptions')
        .select('id')
        .eq('patient_id', pt.id)
        .eq('status', 'active')

      if (!existingPtRxs || existingPtRxs.length === 0) {
        const medForPt = pt.full_name.includes('Miller') ? ator : lisin
        const { data: newPtRxs } = await adminClient.from('prescriptions').insert({
          patient_id: pt.id,
          medication_id: medForPt.id,
          dosage_instructions: `Take 1 tablet daily with water (${medForPt.category})`,
          frequency: 'Once daily in the morning',
          start_date: today,
          end_date: nextMonth,
          status: 'active',
        }).select()

        if (newPtRxs?.[0]) {
          console.log(`✅ Seeded prescription for ${pt.full_name}: ${medForPt.name}`)
          // Seed a few dose logs
          await adminClient.from('dose_logs').insert([
            { prescription_id: newPtRxs[0].id, scheduled_time: new Date(Date.now() - 86400000).toISOString(), taken_time: new Date(Date.now() - 86400000 + 10000).toISOString(), status: 'taken' },
            { prescription_id: newPtRxs[0].id, scheduled_time: new Date().toISOString(), taken_time: null, status: 'pending' }
          ])
        }
      }
    }
  }

  // 8. Test Foreign Key Constraint Behavior for Patient Registration
  console.log('\n--- STEP 8: TESTING FOREIGN KEY CONSTRAINTS (PROFILES.ID -> AUTH.USERS) ---')
  const probeId = crypto.randomUUID()
  const { data: fkProbe, error: fkError } = await adminClient
    .from('profiles')
    .insert({
      id: probeId,
      full_name: '__FK_TEST_PROBE__',
      email: `fk.probe.${Date.now()}@pharminder.local`,
      role: 'patient',
    })
    .select()

  if (fkError) {
    console.log('⚠️ FOREIGN KEY TRAP CONFIRMED:')
    console.log('   `public.profiles.id` enforces a foreign key referencing `auth.users(id)`!')
    console.log('   Error details:', fkError.message, fkError.code)
    console.log('   -> This means the frontend cannot insert a random UUID into `profiles` directly without creating an `auth.users` row or handling it via an admin function/service!')
  } else {
    console.log('✅ `public.profiles.id` does NOT strictly enforce an `auth.users(id)` foreign key constraint (or allows standalone profiles)!')
    console.log('   Inserted probe profile ID:', probeId)
    // Clean up probe
    await adminClient.from('profiles').delete().eq('id', probeId)
  }

  // 9. End-to-End Test Login with Anon Key
  console.log('\n--- STEP 9: END-TO-END LOGIN TEST (ANON KEY CLIENT) ---')
  for (const demo of DEMO_USERS) {
    console.log(`Testing Anon Key login for ${demo.email} ...`)
    const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
      email: demo.email,
      password: DEMO_PASSWORD,
    })

    if (authErr) {
      console.error(`❌ LOGIN FAILED for ${demo.email}:`, authErr.message)
    } else {
      console.log(`🎉 LOGIN SUCCEEDED for ${demo.email}!`)
      console.log(`   User ID: ${authData.user.id}`)
      console.log(`   Role in metadata: ${authData.user.user_metadata?.role}`)
      console.log(`   Email Confirmed At: ${authData.user.email_confirmed_at}`)
      console.log(`   Access Token issued: ${authData.session?.access_token ? 'YES' : 'NO'}`)
    }
  }

  console.log('\n====================================================')
  console.log('🏁 SUPABASE AUDIT & REPAIR COMPLETE!')
  console.log('====================================================')
}

runAudit().catch(console.error)
