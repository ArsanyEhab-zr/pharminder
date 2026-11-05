import { createClient } from '@supabase/supabase-js'
import { parseClinicalIntake, serializeClinicalIntake } from '../src/utils/patientMedicalNotes.js'
import { checkDrugInteractions } from '../src/utils/interactionChecker.js'
import { getPdrDrugMonograph } from '../src/utils/pdrDrugDatabase.js'

const SUPABASE_URL = 'https://yhxqrmweuxphspijzybp.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU0ODA2NSwiZXhwIjoyMTA5MTI0MDY1fQ.hc0VLd-2CEk6G7Bb9HiqYrM5l-G2ACrQki75H8jGoz8'

class DummyWS {}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

async function runVerification() {
  console.log('==================================================================')
  console.log('🧪 VERIFYING DRUGS.COM & PDR.NET CLINICAL INTELLIGENCE INTEGRATION')
  console.log('==================================================================\n')

  // 1. Test Clinical Intake Serialization & Parsing
  console.log('--- 1. Testing Patient Medical Form Serializer & Parser ---')
  const sampleSerialized = serializeClinicalIntake({
    currentSymptoms: 'Mild Morning Dizziness, Occasional Dry Cough',
    allergies: 'Penicillin / Amoxicillin, Sulfa Drugs',
    bloodType: 'O+',
    emergencyContact: 'Michael Doe (Spouse) • (555) 234-8910',
    familyHistory: 'Maternal history of Type 2 Diabetes; Paternal hypertension.',
  })

  const parsed = parseClinicalIntake(sampleSerialized)
  if (
    parsed.symptomTags.includes('Mild Morning Dizziness') &&
    parsed.allergyTags.includes('Penicillin / Amoxicillin') &&
    parsed.bloodType === 'O+'
  ) {
    console.log('✅ Clinical Intake Serializer & Parser passed 100%!')
  } else {
    throw new Error('Clinical Intake Parser mismatch')
  }

  // 2. Test Drugs.com Major / Moderate / Minor + Lab Interactions
  console.log('\n--- 2. Testing Drugs.com Interaction & Lab Interference Engine ---')

  // 2a. Major (Red) DDI
  const ddiMajor = checkDrugInteractions(
    'Aspirin 81mg',
    [{ medication: { name: 'Warfarin 5mg' } }],
    ['Hypertension'],
    []
  )
  console.log(`  - Drugs.com DDI (Aspirin + Warfarin): Category=${ddiMajor.drugsComCategory}, Severity=${ddiMajor.severity}, Blocked=${ddiMajor.isBlocked}`)
  if (ddiMajor.drugsComCategory !== 'Major' || ddiMajor.severity !== 'Red' || !ddiMajor.isBlocked) {
    throw new Error('Drugs.com Major DDI test failed')
  }

  // 2b. Moderate (Yellow) DDI + Ibuprofen False-Positive Drug Screen Lab Interaction
  const ddiModerateLab = checkDrugInteractions(
    'Ibuprofen 400mg',
    [{ medication: { name: 'Lisinopril 10mg' } }],
    ['Hypertension'],
    []
  )
  const ibuLab = ddiModerateLab.labInteractions.find((l) => l.drug === 'Ibuprofen')
  console.log(`  - Drugs.com DDI (Ibuprofen + Lisinopril): Category=${ddiModerateLab.drugsComCategory}, Severity=${ddiModerateLab.severity}`)
  console.log(`  - Drugs.com Lab Alert (Ibuprofen): "${ibuLab?.effect}" on "${ibuLab?.labTest}"`)
  if (
    ddiModerateLab.drugsComCategory !== 'Moderate' ||
    ddiModerateLab.severity !== 'Yellow' ||
    !ibuLab ||
    !ibuLab.summary.toLowerCase().includes('false-positive')
  ) {
    throw new Error('Drugs.com Moderate + Ibuprofen Lab Interaction test failed')
  }

  // 2c. Minor (Green) DDI
  const ddiMinor = checkDrugInteractions(
    'Amoxicillin 500mg',
    [{ medication: { name: 'Omeprazole 20mg' } }],
    ['Type 2 Diabetes'],
    []
  )
  console.log(`  - Drugs.com DDI (Amoxicillin + Omeprazole): Category=${ddiMinor.drugsComCategory}, Severity=${ddiMinor.severity}, Blocked=${ddiMinor.isBlocked}`)
  if (ddiMinor.drugsComCategory !== 'Minor' || ddiMinor.severity !== 'Green' || ddiMinor.isBlocked) {
    throw new Error('Drugs.com Minor DDI test failed')
  }

  // 3. Test PDR.net Monograph & Chronic Kidney Disease Dosing Considerations
  console.log('\n--- 3. Testing PDR.net Drug Summary & Kidney Disease Dosing Highlights ---')
  const metforminPdr = getPdrDrugMonograph('Metformin 850mg', ['Chronic Kidney Disease', 'Type 2 Diabetes'])
  const topConsideration = metforminPdr.dosingConsiderations[0]
  console.log(`  - PDR.net Drug: ${metforminPdr.genericName} | Brands: ${metforminPdr.commonBrandNames.join(', ')}`)
  console.log(`  - Highlighted Patient Condition Match: ${topConsideration.conditionLabel} (isPatientMatch=${topConsideration.isPatientMatch})`)
  console.log(`  - Directive: ${topConsideration.directive.slice(0, 110)}...`)

  if (
    !metforminPdr.administration ||
    !metforminPdr.mechanismOfAction ||
    !metforminPdr.adverseReactions?.common?.length ||
    !metforminPdr.dosageAndIndications?.length ||
    !topConsideration.isPatientMatch ||
    !topConsideration.isKidneyRelated
  ) {
    throw new Error('PDR.net Monograph or Kidney Disease Dosing Consideration highlight failed')
  }

  // 4. Test Global Drug Grey/Blue Alert (Phase 11 Task 37)
  console.log('\n--- 4. Testing Global Drug Grey/Blue Alert (NIH RxTerms Unindexed Drug) ---')
  const globalDrugCheck = checkDrugInteractions(
    'Apixaban (5 mg Oral Pill)',
    [{ medication: { name: 'Metformin 850mg' } }],
    ['Type 2 Diabetes'],
    []
  )
  console.log(`  - Global Drug Check (Apixaban): Severity=${globalDrugCheck.severity}, Description="${globalDrugCheck.description}"`)
  if (
    globalDrugCheck.severity !== 'Blue' ||
    !globalDrugCheck.description.includes(
      'Global Drug Detected: Please consult the PDR.net Panel or Drugs.com link directly to verify interactions.'
    )
  ) {
    throw new Error('Global Drug Grey/Blue Alert test failed')
  }

  // 5. Test Dynamic Custom Allergy Contraindication on Global Drug (Phase 11 Task 38)
  console.log('\n--- 5. Testing Dynamic Custom Allergy Tagging vs Global Drug ---')
  const dynamicAllergyCheck = checkDrugInteractions(
    'Ciprofloxacin (500 mg Tab)',
    [],
    [],
    ['Ciprofloxacin', 'Latex']
  )
  console.log(`  - Dynamic Allergy Check (Ciprofloxacin): Severity=${dynamicAllergyCheck.severity}, Blocked=${dynamicAllergyCheck.isBlocked}`)
  if (dynamicAllergyCheck.severity !== 'Red' || !dynamicAllergyCheck.isBlocked) {
    throw new Error('Dynamic Custom Allergy Contraindication test failed')
  }

  console.log('\n🎉 ALL DRUGS.COM, PDR.NET & PHASE 11 GLOBAL SCALING CHECKS PASSED 100%!')
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})
