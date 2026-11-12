/**
 * Structured Clinical Intake Serializer & Parser for `public.patients_data`
 *
 * Stores rich patient-reported health information inside the existing
 * `patients_data.family_history` text column alongside `chronic_diseases` (text[]),
 * ensuring 100% compatibility with the remote PostgreSQL schema without requiring DDL migrations.
 */

const SECTION_MARKERS = {
  SYMPTOMS: '[SYMPTOMS]:',
  ALLERGIES: '[ALLERGIES]:',
  HOME_MEDS: '[HOME_MEDS]:',
  BLOOD_TYPE: '[BLOOD_TYPE]:',
  EMERGENCY_CONTACT: '[EMERGENCY_CONTACT]:',
  SMOKING_ALCOHOL: '[LIFESTYLE]:',
  FAMILY_HISTORY: '[FAMILY_HISTORY]:',
}

/**
 * Parses `patients_data.family_history` into structured clinical fields.
 * Gracefully handles legacy plain-text `family_history` strings.
 */
export function parseClinicalIntake(rawFamilyHistory = '') {
  const defaultResult = {
    currentSymptoms: '',
    symptomTags: [],
    allergies: '',
    allergyTags: [],
    homeMeds: '',
    homeMedTags: [],
    bloodType: 'O+',
    emergencyContact: '',
    lifestyleNotes: 'Non-smoker',
    familyHistory: '',
  }

  if (!rawFamilyHistory || typeof rawFamilyHistory !== 'string') {
    return defaultResult
  }

  const trimmed = rawFamilyHistory.trim()
  if (!trimmed) return defaultResult

  // Check if the string uses our structured markers
  const hasMarkers = Object.values(SECTION_MARKERS).some((marker) =>
    trimmed.includes(marker)
  )

  if (!hasMarkers) {
    return {
      ...defaultResult,
      familyHistory: trimmed,
    }
  }

  const extractSection = (markerKey) => {
    const marker = SECTION_MARKERS[markerKey]
    const idx = trimmed.indexOf(marker)
    if (idx === -1) return ''

    const start = idx + marker.length
    // Find the earliest next marker after `start`
    let end = trimmed.length
    for (const m of Object.values(SECTION_MARKERS)) {
      const nextIdx = trimmed.indexOf(m, start)
      if (nextIdx !== -1 && nextIdx < end) {
        end = nextIdx
      }
    }

    return trimmed.slice(start, end).trim()
  }

  const currentSymptoms = extractSection('SYMPTOMS')
  const allergies = extractSection('ALLERGIES')
  const homeMeds = extractSection('HOME_MEDS')
  const bloodType = extractSection('BLOOD_TYPE') || 'O+'
  const emergencyContact = extractSection('EMERGENCY_CONTACT')
  const lifestyleNotes = extractSection('SMOKING_ALCOHOL') || 'Non-smoker'
  const familyHistory = extractSection('FAMILY_HISTORY')

  const splitTags = (str) =>
    str
      ? str
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  return {
    currentSymptoms,
    symptomTags: splitTags(currentSymptoms),
    allergies,
    allergyTags: splitTags(allergies),
    homeMeds,
    homeMedTags: splitTags(homeMeds),
    bloodType,
    emergencyContact,
    lifestyleNotes,
    familyHistory,
  }
}

/**
 * Serializes structured clinical intake fields into a clean, human-readable text block
 * stored in `patients_data.family_history`.
 */
export function serializeClinicalIntake({
  currentSymptoms = '',
  allergies = '',
  homeMeds = '',
  bloodType = 'O+',
  emergencyContact = '',
  lifestyleNotes = 'Non-smoker',
  familyHistory = '',
}) {
  const lines = []

  if (currentSymptoms && currentSymptoms.trim()) {
    lines.push(`${SECTION_MARKERS.SYMPTOMS} ${currentSymptoms.trim()}`)
  }
  if (allergies && allergies.trim()) {
    lines.push(`${SECTION_MARKERS.ALLERGIES} ${allergies.trim()}`)
  }
  if (homeMeds && homeMeds.trim()) {
    lines.push(`${SECTION_MARKERS.HOME_MEDS} ${homeMeds.trim()}`)
  }
  if (bloodType && bloodType.trim()) {
    lines.push(`${SECTION_MARKERS.BLOOD_TYPE} ${bloodType.trim()}`)
  }
  if (emergencyContact && emergencyContact.trim()) {
    lines.push(`${SECTION_MARKERS.EMERGENCY_CONTACT} ${emergencyContact.trim()}`)
  }
  if (lifestyleNotes && lifestyleNotes.trim()) {
    lines.push(`${SECTION_MARKERS.SMOKING_ALCOHOL} ${lifestyleNotes.trim()}`)
  }
  if (familyHistory && familyHistory.trim()) {
    lines.push(`${SECTION_MARKERS.FAMILY_HISTORY} ${familyHistory.trim()}`)
  }

  return lines.join('\n')
}

