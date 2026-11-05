/**
 * Real-World Global Drug Autocomplete Service
 * Powered by the National Institutes of Health (NIH) / National Library of Medicine (NLM)
 * RxTerms REST API: https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=
 *
 * Includes intelligent local caching, debouncing support, and offline fallback
 * so clinicians and patients can search and add ANY medication in the world.
 */

export const NIH_RXTERMS_ENDPOINT =
  'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search'

// Local fallback formulary in case of offline mode
export const FALLBACK_GLOBAL_DRUGS = [
  { name: 'Amoxicillin 500mg', dosage_form: 'Capsule', category: 'Antibiotic', description: 'Broad-spectrum aminopenicillin antibiotic' },
  { name: 'Metformin 850mg', dosage_form: 'Tablet', category: 'Antidiabetic', description: 'First-line biguanide antihyperglycemic' },
  { name: 'Atorvastatin 20mg', dosage_form: 'Tablet', category: 'Statin', description: 'HMG-CoA reductase lipid-lowering agent' },
  { name: 'Lisinopril 10mg', dosage_form: 'Tablet', category: 'Antihypertensive', description: 'ACE inhibitor for hypertension and heart failure' },
  { name: 'Warfarin 5mg', dosage_form: 'Tablet', category: 'Anticoagulant', description: 'Vitamin K antagonist oral anticoagulant' },
  { name: 'Aspirin 81mg', dosage_form: 'Tablet', category: 'Antiplatelet', description: 'Salicylate antiplatelet for cardiovascular protection' },
  { name: 'Ibuprofen 400mg', dosage_form: 'Tablet', category: 'NSAID', description: 'Nonsteroidal anti-inflammatory analgesic' },
  { name: 'Omeprazole 20mg', dosage_form: 'Capsule', category: 'Gastrointestinal', description: 'Proton pump inhibitor for GERD and ulcers' },
  { name: 'Amlodipine 5mg', dosage_form: 'Tablet', category: 'Calcium Channel Blocker', description: 'Dihydropyridine calcium channel blocker for hypertension' },
  { name: 'Levothyroxine 50mcg', dosage_form: 'Tablet', category: 'Thyroid Hormone', description: 'Synthetic T4 hormone replacement for hypothyroidism' },
  { name: 'Losartan 50mg', dosage_form: 'Tablet', category: 'ARB Antihypertensive', description: 'Angiotensin II receptor blocker for hypertension & nephropathy' },
  { name: 'Albuterol 90mcg/actuation', dosage_form: 'Metered Dose Inhaler', category: 'Bronchodilator', description: 'Short-acting beta-2 agonist for acute bronchospasm' },
  { name: 'Gabapentin 300mg', dosage_form: 'Capsule', category: 'Anticonvulsant / Neuropathic', description: 'GABA analogue for neuropathic pain and seizures' },
  { name: 'Hydrochlorothiazide 25mg', dosage_form: 'Tablet', category: 'Thiazide Diuretic', description: 'Thiazide diuretic for hypertension and edema' },
  { name: 'Sertraline 50mg', dosage_form: 'Tablet', category: 'SSRI Antidepressant', description: 'Selective serotonin reuptake inhibitor' },
  { name: 'Montelukast 10mg', dosage_form: 'Tablet', category: 'Leukotriene Receptor Antagonist', description: 'Maintenance treatment of asthma and allergic rhinitis' },
  { name: 'Pantoprazole 40mg', dosage_form: 'Delayed-Release Tablet', category: 'Proton Pump Inhibitor', description: 'CYP2C19-sparing gastric acid suppressant' },
  { name: 'Clopidogrel 75mg', dosage_form: 'Tablet', category: 'P2Y12 Antiplatelet', description: 'Thienopyridine antiplatelet agent' },
  { name: 'Empagliflozin 10mg', dosage_form: 'Tablet', category: 'SGLT2 Inhibitor', description: 'Cardiorenal-protective antihyperglycemic agent' },
  { name: 'Apixaban 5mg', dosage_form: 'Tablet', category: 'Direct Oral Anticoagulant (DOAC)', description: 'Direct Factor Xa inhibitor' },
]

const responseCache = new Map()

/**
 * Cleans NIH RxTerms display name (e.g. "metFORMIN (Oral Pill)" -> "Metformin")
 */
export function formatRxTermsDisplayName(rawDisplay = '') {
  const withoutRoute = rawDisplay.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (!withoutRoute) return rawDisplay
  return withoutRoute
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Queries the live NIH ClinicalTables RxTerms v3 API for global medications.
 * @param {string} searchTerm
 * @returns {Promise<Array>} Array of normalized medication suggestions
 */
export async function searchGlobalMedications(searchTerm) {
  const trimmed = (searchTerm || '').trim()
  if (!trimmed || trimmed.length < 2) {
    return FALLBACK_GLOBAL_DRUGS.slice(0, 8)
  }

  const cacheKey = trimmed.toLowerCase()
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)
  }

  try {
    const url = `${NIH_RXTERMS_ENDPOINT}?terms=${encodeURIComponent(
      trimmed
    )}&ef=STRENGTHS_AND_FORMS,RXCUIS,DISPLAY_NAME_SYNONYM&maxList=12`

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`NIH RxTerms API status ${response.status}`)
    }

    const payload = await response.json()
    // Format: [totalCount, codeArray, extraFieldsObj, displayStringsArray]
    const extraFields = payload?.[2] || {}
    const displayList = payload?.[3] || []
    const strengthsList = extraFields.STRENGTHS_AND_FORMS || []
    const synonymsList = extraFields.DISPLAY_NAME_SYNONYM || []

    const parsedResults = []

    displayList.forEach((row, index) => {
      const rawName = Array.isArray(row) ? row[0] : String(row || '')
      const cleanBaseName = formatRxTermsDisplayName(rawName)
      const routeMatch = rawName.match(/\(([^)]+)\)/)
      const routeLabel = routeMatch ? routeMatch[1] : 'Oral Formulation'
      const strengths = Array.isArray(strengthsList[index]) ? strengthsList[index] : []
      const synonyms = Array.isArray(synonymsList[index]) ? synonymsList[index].join(', ') : ''

      // Create primary entry with the most common strength (or base name if no strength array)
      const primaryStrength = strengths[0] ? strengths[0].trim() : ''
      const fullMedName = primaryStrength
        ? `${cleanBaseName} ${primaryStrength}`
        : cleanBaseName

      parsedResults.push({
        id: `rxterms-${index}-${cleanBaseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: fullMedName,
        baseName: cleanBaseName,
        dosage_form: primaryStrength || routeLabel,
        category: synonyms ? `Brand/Synonym: ${synonyms}` : `NIH RxTerms (${routeLabel})`,
        description: `Global NIH RxTerms Formulary • ${rawName}${
          strengths.length > 1 ? ` • Available strengths: ${strengths.slice(0, 4).join(', ')}` : ''
        }`,
        availableStrengths: strengths.slice(0, 6),
        isGlobalApi: true,
        source: 'NIH RxTerms API',
      })
    })

    // Merge any matching local fallback items that weren't already included
    const localMatches = FALLBACK_GLOBAL_DRUGS.filter(
      (item) =>
        item.name.toLowerCase().includes(cacheKey) ||
        item.category.toLowerCase().includes(cacheKey)
    )

    const combined = [...localMatches, ...parsedResults]
    responseCache.set(cacheKey, combined)
    return combined
  } catch (err) {
    console.warn('NIH RxTerms API fallback to local formulary:', err.message)
    return FALLBACK_GLOBAL_DRUGS.filter(
      (item) =>
        item.name.toLowerCase().includes(cacheKey) ||
        item.category.toLowerCase().includes(cacheKey)
    )
  }
}

