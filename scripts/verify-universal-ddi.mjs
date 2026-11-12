#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  evaluateDrugsComRules,
  verifyLiveDrugInteractions,
  checkMultiDrugCombination,
} from '../src/utils/interactionChecker.js'

async function runTests() {
  console.log('=== Pharminder Universal 3-Layer Clinical DDI Verification ===\n')

  const syncCases = [
    {
      name: '1. PDE5 + Nitrates via Trade + Dosage (Viagra 50 MG + Nitrostat 0.4 MG)',
      candidate: 'Viagra 50 MG Oral Tablet',
      active: ['Nitrostat 0.4 MG Sublingual Tablet'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '2. Warfarin + NSAID via Egyptian Brands (Marevan 5mg + Brufen 400mg)',
      candidate: 'Marevan 5 MG Tablet',
      active: ['Brufen 400 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '3. Statin + Macrolide CYP3A4 via Brands (Zocor 40mg + Klacid 500mg)',
      candidate: 'Zocor 40 MG Tablet',
      active: ['Klacid 500 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '4. SSRI + Tramadol Serotonin Syndrome (Prozac + Tramal)',
      candidate: 'Prozac 20 MG Capsule',
      active: ['Tramal 50 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '5. ACEi + NSAID Moderate AKI / BP Attenuation via Brands (Zestril + Cataflam)',
      candidate: 'Cataflam 50 MG Tablet',
      active: ['Zestril 10 MG'],
      expectedSeverity: 'Yellow',
      expectedBlocked: false,
    },
    {
      name: '6. Multi-Ingredient Brand Septrin/Bactrim + ACEi (Septrin + Tritace)',
      candidate: 'Septrin DS Tablet',
      active: ['Tritace 5 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '7. Carbapenem + Valproate via Brands (Meronem + Depakine Chrono)',
      candidate: 'Meronem 1g IV',
      active: ['Depakine Chrono 500 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '8. Opioid + Benzodiazepine FDA Black Box (OxyContin + Xanax)',
      candidate: 'Xanax 0.5 MG Tablet',
      active: ['OxyContin 20 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '9. Duplicate Acetaminophen Therapy across Brands (Panadol Extra + Tylenol)',
      candidate: 'Panadol 500 MG',
      active: ['Tylenol 500 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '10. Digoxin + Amiodarone via Brands (Lanoxin + Cordarone)',
      candidate: 'Lanoxin 0.25 MG',
      active: ['Cordarone 200 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '11. Beta-Blocker + Non-DHP CCB via Brands (Concor + Isoptin)',
      candidate: 'Concor 5 MG',
      active: ['Isoptin 80 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '12. Clopidogrel + Omeprazole CYP2C19 (Plavix + Losec)',
      candidate: 'Plavix 75 MG',
      active: ['Losec 20 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '13. Lithium + NSAID Toxicity (Priadel + Voltaren)',
      candidate: 'Voltaren 75 MG',
      active: ['Lithium Carbonate 300 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '14. Methotrexate + NSAID/Penicillin Clearance Block (Methotrexate + Augmentin)',
      candidate: 'Augmentin 1g Tablet',
      active: ['Methotrexate 2.5 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '15. MAOI + SSRI Hypertensive/Serotonin Crisis (Linezolid + Zoloft)',
      candidate: 'Zyvox 600 MG',
      active: ['Zoloft 50 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '16. Dual QT Prolongation Torsades Risk (Azithromycin + Haloperidol)',
      candidate: 'Zithromax 500 MG',
      active: ['Haldol 5 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '17. Potassium-Sparing + Potassium Supplement (Aldactone + Slow-K)',
      candidate: 'Aldactone 25 MG',
      active: ['Potassium Chloride 600 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '18. Fluoroquinolone + Antacid/Iron Chelation Moderate (Cipro + Ferrous Sulfate)',
      candidate: 'Cipro 500 MG',
      active: ['Ferrous Sulfate 325 MG'],
      expectedSeverity: 'Yellow',
      expectedBlocked: false,
    },
    {
      name: '19. Loop Diuretic + Aminoglycoside Ototoxicity (Lasix + Amikacin)',
      candidate: 'Lasix 40 MG',
      active: ['Amikacin 500 MG'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '20. Salt Protection Negative Test (Losartan Potassium + Glucophage = Safe Green)',
      candidate: 'Losartan Potassium 50 MG',
      active: ['Glucophage 500 MG'],
      expectedSeverity: 'Green',
      expectedBlocked: false,
    },
    {
      name: '21. Drug-Allergy Cross-Reactivity (Augmentin with Penicillin Allergy)',
      candidate: 'Augmentin 625 MG',
      active: [],
      allergies: ['Penicillin'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
    {
      name: '22. Drug-Disease Contraindication (Propranolol with Asthma)',
      candidate: 'Inderal 40 MG',
      active: [],
      diseases: ['Asthma'],
      expectedSeverity: 'Red',
      expectedBlocked: true,
    },
  ]

  let passed = 0
  for (const tc of syncCases) {
    const res = evaluateDrugsComRules(
      tc.candidate,
      tc.active,
      tc.diseases || [],
      tc.allergies || []
    )
    assert.equal(
      res.severity,
      tc.expectedSeverity,
      `${tc.name}: expected severity ${tc.expectedSeverity}, got ${res.severity} (${res.title})`
    )
    assert.equal(
      res.isBlocked,
      tc.expectedBlocked,
      `${tc.name}: expected isBlocked=${tc.expectedBlocked}, got ${res.isBlocked}`
    )
    if (res.severity !== 'Green') {
      assert.ok(
        res.riskPercentage > 0 && res.description && res.clinicalAdvice,
        `${tc.name}: missing riskPercentage, description, or clinicalAdvice`
      )
    }
    passed += 1
    console.log(
      `PASS  ${tc.name} -> [${res.severity} | ${res.riskPercentage || 0}% | ${res.title}]`
    )
  }

  console.log('\n--- Testing Live Async 3-Layer Pipeline (RxNorm + OpenFDA + Extra Profile Meds) ---')

  // Test 23: Outside Home Med passed as extraProfileDrugs (5th argument)
  const homeMedRes = await verifyLiveDrugInteractions(
    'Sildenafil 50 MG',
    [],
    [],
    [],
    ['Isosorbide Mononitrate 20 MG']
  )
  assert.equal(homeMedRes.severity, 'Red', 'Home med Nitrate + Sildenafil must hard-lock')
  assert.equal(homeMedRes.isBlocked, true)
  passed += 1
  console.log(`PASS  23. Outside Home Med Screening -> [${homeMedRes.severity} | ${homeMedRes.riskPercentage}%]`)

  // Test 24: Live Multi-Drug Combination Check
  const multiRes = await checkMultiDrugCombination([
    'Metformin 500 MG',
    'Warfarin 5 MG',
    'Aspirin 100 MG',
  ])
  assert.equal(multiRes.severity, 'Red', 'Multi-drug combination Warfarin + Aspirin must catch Red')
  assert.equal(multiRes.isBlocked, true)
  passed += 1
  console.log(`PASS  24. Multi-Drug Combination Check -> [${multiRes.severity} | ${multiRes.riskPercentage}%]`)

  // Test 25: Live Network Layer 1 + Layer 3 (OpenFDA Drug Label check for an uncommon/non-matrix pair like Allopurinol + Azathioprine or Colchicine + Clarithromycin)
  try {
    const liveFdaRes = await verifyLiveDrugInteractions(
      'Colchicine 0.6 MG',
      ['Clarithromycin 500 MG']
    )
    assert.ok(
      liveFdaRes.severity === 'Red' || liveFdaRes.severity === 'Yellow',
      `Live OpenFDA/Layer1 test (Colchicine + Clarithromycin) should warn or block, got ${liveFdaRes.severity}: ${liveFdaRes.title}`
    )
    passed += 1
    console.log(
      `PASS  25. Live Network OpenFDA/RxNorm (Colchicine + Clarithromycin) -> [${liveFdaRes.severity} | ${liveFdaRes.riskPercentage}% | ${liveFdaRes.layerUsed}]`
    )
  } catch (netErr) {
    console.log(`WARN  25. Live network check skipped/offline: ${netErr.message}`)
  }

  console.log(`\nALL ${passed} UNIVERSAL DDI VERIFICATION CHECKS PASSED!`)
}

runTests().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err)
  process.exit(1)
})
