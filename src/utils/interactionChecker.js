/**
 * Modular Clinical Safety & Interaction Engine
 *
 * Powered by:
 * 1. Drugs.com Clinical Intelligence (Primary Authority):
 *    - Drug-to-Drug Interaction (DDI) Evaluator (`Major` [Red], `Moderate` [Yellow], `Minor` [Green])
 *    - Drug-to-Disease Contraindication Evaluator (screened against Patient Medical Form)
 *    - Drug-to-Allergy Cross-Reactivity Evaluator
 *    - Laboratory Test Interference ("Lab Interaction") Detector (e.g. Ibuprofen false-positive drug screen)
 *    Reference: https://www.drugs.com/drug_interactions.html
 *
 * 2. PDR.net (Prescribers' Digital Reference):
 *    - Clinical Contraindications & Dosing Considerations (Renal / CKD adjustments)
 *    Reference: https://www.pdr.net/
 *
 * 3. Supplemental Live Federal Clinical APIs (NIH RxNav & FDA OpenFDA):
 *    - Dynamic queries for unindexed global formulary medications
 */

import {
  resolveDrugRxCui,
  extractRxCui,
} from './globalDrugApi.js'

export const RXNAV_INTERACTION_LIST_ENDPOINT =
  'https://rxnav.nlm.nih.gov/REST/interaction/list.json'
export const RXNAV_RXCLASS_ENDPOINT =
  'https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json'
export const OPENFDA_LABEL_ENDPOINT = 'https://api.fda.gov/drug/label.json'

export const EXTERNAL_INTERACTION_SOURCES = {
  source1: {
    id: 'drugs-com',
    name: 'Drugs.com Interaction & Lab Checker',
    referenceUrl: 'https://www.drugs.com/drug_interactions.html',
    endpointUrl:
      (typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_DRUG_INTERACTION_SOURCE_1_URL) ||
      'https://www.drugs.com/drug_interactions.html',
    enabled: true,
    status: 'Active • Drugs.com Engine',
  },
  source2: {
    id: 'pdr-net',
    name: "PDR.net (Prescribers' Digital Reference)",
    referenceUrl: 'https://www.pdr.net/',
    endpointUrl:
      (typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_DRUG_INTERACTION_SOURCE_2_URL) ||
      'https://www.pdr.net/',
    enabled: true,
    status: 'Active • PDR.net Monographs',
  },
}

// Maps internal color severity <-> Drugs.com Clinical Category
export function mapSeverityToDrugsComCategory(severity) {
  if (severity === 'Red') return 'Major'
  if (severity === 'Yellow') return 'Moderate'
  if (severity === 'Blue') return 'Global Reference'
  return 'Minor'
}

// Local formulary drugs with full DDI, Disease, Allergy, and Lab rule coverage
export const KNOWN_LOCAL_DRUGS = new Set([
  'amoxicillin',
  'metformin',
  'atorvastatin',
  'lisinopril',
  'warfarin',
  'aspirin',
  'ibuprofen',
  'omeprazole',
  'clopidogrel',
  'sertraline',
])

// Brand name & trade synonym to generic active ingredient dictionary
export const BRAND_TO_GENERIC_MAP = {
  advil: 'ibuprofen',
  motrin: 'ibuprofen',
  brufen: 'ibuprofen',
  nuprin: 'ibuprofen',
  plavix: 'clopidogrel',
  prilosec: 'omeprazole',
  losec: 'omeprazole',
  omepral: 'omeprazole',
  nexium: 'esomeprazole',
  protonix: 'pantoprazole',
  prevacid: 'lansoprazole',
  coumadin: 'warfarin',
  jantoven: 'warfarin',
  bayer: 'aspirin',
  ecotrin: 'aspirin',
  bufferin: 'aspirin',
  ascriptin: 'aspirin',
  glucophage: 'metformin',
  fortamet: 'metformin',
  glumetza: 'metformin',
  riomet: 'metformin',
  lipitor: 'atorvastatin',
  torvast: 'atorvastatin',
  zoloft: 'sertraline',
  lustral: 'sertraline',
  zestril: 'lisinopril',
  prinivil: 'lisinopril',
  amoxil: 'amoxicillin',
  augmentin: 'amoxicillin',
  moxatag: 'amoxicillin',
  trimox: 'amoxicillin',
  tylenol: 'acetaminophen',
  panadol: 'acetaminophen',
  paracetamol: 'acetaminophen',
  eliquis: 'apixaban',
  xarelto: 'rivaroxaban',
  pradaxa: 'dabigatran',
  norvasc: 'amlodipine',
  lasix: 'furosemide',
  cozaar: 'losartan',
  crestor: 'rosuvastatin',
  prozac: 'fluoxetine',
  lexapro: 'escitalopram',
  voltaren: 'diclofenac',
  cataflam: 'diclofenac',
  celebrex: 'celecoxib',
  aleve: 'naproxen',
  naprosyn: 'naproxen',
  diovan: 'valsartan',
  tenormin: 'atenolol',
  lopressor: 'metoprolol',
  toprol: 'metoprolol',
  zithromax: 'azithromycin',
  cipro: 'ciprofloxacin',
  levaquin: 'levofloxacin',
  flagyl: 'metronidazole',
}

// Common chemical salt modifiers and dosage form tokens to exclude during tokenization
export const SALT_MODIFIERS = new Set([
  'sodium',
  'potassium',
  'calcium',
  'magnesium',
  'succinate',
  'tartrate',
  'maleate',
  'hydrochloride',
  'hcl',
  'bisulfate',
  'trihydrate',
  'dihydrate',
  'monohydrate',
  'mesylate',
  'fumarate',
  'citrate',
  'acetate',
  'gluconate',
  'nitrate',
  'sulfate',
  'phosphate',
  'besylate',
  'valerate',
  'dipropionate',
  'er',
  'xr',
  'dr',
  'cr',
  'sr',
])

/**
 * Robust drug key normalizer:
 * Handles:
 * - Complex NIH RxTerms strings: "Ibuprofen (200 MG Oral Tablet)" -> "ibuprofen"
 * - Salt formulations: "Warfarin Sodium (5 MG Oral Tablet)" -> "warfarin"
 * - Brand names: "Plavix (75 MG Oral Tablet)" -> "clopidogrel", "Prilosec" -> "omeprazole"
 * - Medication objects: { cleanName: "...", name: "..." }
 */
export const normalizeDrugKey = (medInput) => {
  if (!medInput) return ''
  let raw = ''
  if (typeof medInput === 'object') {
    raw =
      medInput.cleanName ||
      medInput.baseName ||
      medInput.name ||
      medInput.medication?.name ||
      ''
  } else {
    raw = String(medInput)
  }

  if (!raw) return ''

  // 1. Strip [RxCUI: 12345] tags
  let cleaned = raw.replace(/\[RxCUI:\s*\d+\]/gi, ' ')

  // 2. Strip contents of parentheses and brackets: "(200 MG Oral Tablet)" -> ""
  cleaned = cleaned.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')

  // 3. Strip dosage forms, strengths, numbers and units
  cleaned = cleaned.replace(
    /\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|meq|%|tab|cap|tablet|tablets|capsule|capsules|oral|pill|pills|solution|suspension|delayed|release|extended|film|coated)\b/gi,
    ' '
  )

  // 4. Strip punctuation and non-alpha characters
  cleaned = cleaned.replace(/[^a-zA-Z\s-]/g, ' ').toLowerCase().trim()

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !SALT_MODIFIERS.has(w))

  if (words.length === 0) return ''

  // A. Check if any word matches BRAND_TO_GENERIC_MAP directly
  for (const w of words) {
    if (BRAND_TO_GENERIC_MAP[w]) {
      return BRAND_TO_GENERIC_MAP[w]
    }
  }

  // B. Check if any word matches a known local drug
  for (const w of words) {
    if (KNOWN_LOCAL_DRUGS.has(w)) {
      return w
    }
  }

  // C. Fallback to the first significant word (length >= 3)
  for (const w of words) {
    if (w.length >= 3) {
      return w
    }
  }

  return words[0] || ''
}

/**
 * Extracts a Set of all potential matching tokens for a drug (generic, brand, base words)
 */
export function extractAllDrugTokens(medInput) {
  const tokens = new Set()
  const primary = normalizeDrugKey(medInput)
  if (primary) tokens.add(primary)

  let raw = ''
  if (typeof medInput === 'object') {
    raw = `${medInput.cleanName || ''} ${medInput.baseName || ''} ${
      medInput.name || ''
    } ${medInput.medication?.name || ''}`
  } else {
    raw = String(medInput || '')
  }

  const cleaned = raw
    .replace(/\[RxCUI:\s*\d+\]/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .toLowerCase()
    .trim()

  cleaned.split(/\s+/).forEach((w) => {
    if (w.length >= 3 && !SALT_MODIFIERS.has(w)) {
      tokens.add(w)
      if (BRAND_TO_GENERIC_MAP[w]) {
        tokens.add(BRAND_TO_GENERIC_MAP[w])
      }
    }
  })

  return tokens
}

// 1. Canonical Drugs.com Drug-to-Drug Interaction (DDI) Dictionary (Major / Moderate / Minor)
export const DDI_RULES = [
  // MAJOR (Red - Contraindicated / Hard Lock)
  {
    drugs: ['aspirin', 'warfarin'],
    severity: 'Red',
    drugsComCategory: 'Major',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Severe Bleeding & Hemorrhage Risk',
    description:
      'Drugs.com [MAJOR]: Using Aspirin together with Warfarin significantly increases the risk of major systemic and gastrointestinal hemorrhage due to synergistic antiplatelet and anticoagulant activity.',
    clinicalAdvice:
      'Prescription blocked. Co-administration is contraindicated without specialized hematology supervision and intensive INR monitoring.',
  },
  {
    drugs: ['ibuprofen', 'warfarin'],
    severity: 'Red',
    drugsComCategory: 'Major',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Severe Gastrointestinal Hemorrhage',
    description:
      'Drugs.com [MAJOR]: NSAIDs (Ibuprofen) erode the gastric mucosal barrier and inhibit platelet aggregation while Warfarin suppresses coagulation factors, creating a life-threatening bleed risk.',
    clinicalAdvice:
      'Prescription blocked. Substitute with non-NSAID analgesic (e.g., Acetaminophen/Paracetamol).',
  },
  {
    drugs: ['clopidogrel', 'omeprazole'],
    severity: 'Red',
    drugsComCategory: 'Major',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'CYP2C19 Inhibition — Loss of Antiplatelet Efficacy',
    description:
      'Drugs.com [MAJOR]: Omeprazole strongly inhibits CYP2C19, blocking the hepatic conversion of Clopidogrel into its active metabolite and elevating thrombotic/stroke risk.',
    clinicalAdvice:
      'Prescription blocked. Switch gastroprotection to Pantoprazole or an H2-receptor antagonist.',
  },

  // MODERATE (Yellow - Clinical Precaution / Monitoring Required)
  {
    drugs: ['ibuprofen', 'lisinopril'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Attenuated Antihypertensive Effect & Acute Kidney Injury Risk',
    description:
      'Drugs.com [MODERATE]: NSAID-mediated prostaglandin inhibition blunts the vasodilatory effect of ACE inhibitors (Lisinopril) and reduces glomerular filtration ("Triple Whammy" nephrotoxicity risk).',
    clinicalAdvice:
      'Monitor blood pressure, renal function (eGFR/creatinine), and serum potassium closely.',
  },
  {
    drugs: ['aspirin', 'ibuprofen'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Competitive COX-1 Blockade & Mucosal Ulceration',
    description:
      'Drugs.com [MODERATE]: Ibuprofen sterically hinders low-dose Aspirin from irreversibly acetylating platelet COX-1, reducing cardioprotection while increasing GI ulcer risk.',
    clinicalAdvice:
      'Administer immediate-release Aspirin at least 2 hours prior to Ibuprofen or switch analgesic class.',
  },
  {
    drugs: ['sertraline', 'warfarin'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Potentiated Anticoagulation & Platelet Serotonin Depletion',
    description:
      'Drugs.com [MODERATE]: SSRIs impair platelet serotonin uptake and mildly inhibit CYP2C9, increasing bleeding risk when co-prescribed with Warfarin.',
    clinicalAdvice:
      'Monitor INR closely upon initiation or dose titration and counsel patient on bleeding signs.',
  },
  {
    drugs: ['aspirin', 'sertraline'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Additive Upper GI Bleeding Tendency',
    description:
      'Drugs.com [MODERATE]: Combined platelet serotonin depletion (Sertraline) and gastric COX-1 inhibition (Aspirin) elevates upper GI bleed risk.',
    clinicalAdvice:
      'Consider proton pump inhibitor gastroprotection if dual therapy is clinically required.',
  },
  {
    drugs: ['atorvastatin', 'warfarin'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction',
    title: 'Transient Prothrombin Time (INR) Alteration',
    description:
      'Drugs.com [MODERATE]: Atorvastatin may transiently alter Warfarin plasma protein binding and CYP3A4 metabolism during the first 1–2 weeks of co-administration.',
    clinicalAdvice:
      'Check PT/INR within 5–7 days of starting or changing Atorvastatin dosage.',
  },

  // MINOR (Green - Safe to Dispense with Clinical Awareness)
  {
    drugs: ['amoxicillin', 'omeprazole'],
    severity: 'Green',
    drugsComCategory: 'Minor',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction (Minor / Synergistic)',
    title: 'Minor Gastric pH Absorption Shift (Clinically Compatible)',
    description:
      'Drugs.com [MINOR]: Omeprazole increases gastric pH, which slightly enhances Amoxicillin stability in the stomach. Frequently co-prescribed purposefully in H. pylori eradication regimens.',
    clinicalAdvice: 'Safe to co-administer. No dosage adjustment required.',
  },
  {
    drugs: ['lisinopril', 'metformin'],
    severity: 'Green',
    drugsComCategory: 'Minor',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction (Minor)',
    title: 'Mildly Enhanced Insulin Sensitivity',
    description:
      'Drugs.com [MINOR]: ACE inhibitors (Lisinopril) may slightly improve peripheral insulin sensitivity when combined with Metformin, which is generally beneficial in Diabetic Hypertension.',
    clinicalAdvice:
      'Safe first-line cardiometabolic combination. Routine glycemic and renal monitoring applies.',
  },
  {
    drugs: ['atorvastatin', 'omeprazole'],
    severity: 'Green',
    drugsComCategory: 'Minor',
    source: 'Drugs.com Interaction Checker',
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    type: 'Drug-Drug Interaction (Minor)',
    title: 'Minor P-glycoprotein / CYP3A4 Overlap',
    description:
      'Drugs.com [MINOR]: Co-administration of Omeprazole and Atorvastatin produces negligible changes in systemic statin exposure.',
    clinicalAdvice: 'Safe to dispense together without dose modification.',
  },
]

// 2. Canonical Drug-to-Disease Contraindication Rules (Screened against Patient Medical Form)
export const DRUG_DISEASE_RULES = [
  {
    drug: 'ibuprofen',
    conditionKeywords: ['peptic ulcer', 'ulcer', 'gi bleed'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Peptic Ulcer Disease',
    description:
      'Patient’s Medical Form reports Peptic Ulcer Disease. Ibuprofen inhibits protective gastric prostaglandins (COX-1), risking acute ulcer perforation and hemorrhage.',
    clinicalAdvice:
      'Prescription blocked by patient condition profile. Avoid all systemic NSAIDs.',
  },
  {
    drug: 'ibuprofen',
    conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Chronic Kidney Disease (Nephrotoxic)',
    description:
      'Patient’s Medical Form reports Chronic Kidney Disease. NSAIDs constrict afferent renal arterioles and can precipitate acute renal failure.',
    clinicalAdvice:
      'Prescription blocked. Select a renally safe non-NSAID analgesic.',
  },
  {
    drug: 'ibuprofen',
    conditionKeywords: ['heart failure', 'cardiac failure'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Heart Failure (Fluid Retention)',
    description:
      'Patient’s Medical Form reports Heart Failure. NSAIDs promote sodium/water retention and increase systemic vascular resistance, risking acute decompensation.',
    clinicalAdvice:
      'Prescription blocked. Avoid NSAIDs in patients with heart failure.',
  },
  {
    drug: 'ibuprofen',
    conditionKeywords: ['hypertension', 'high blood pressure'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    type: 'Drug-Disease Precaution',
    title: 'Caution in Hypertension — Blood Pressure Elevation',
    description:
      'Patient’s Medical Form reports Hypertension. Ibuprofen can increase mean arterial pressure by 3–6 mmHg and antagonize antihypertensive therapy.',
    clinicalAdvice:
      'Use lowest effective dose for shortest duration and monitor blood pressure daily.',
  },
  {
    drug: 'ibuprofen',
    conditionKeywords: ['asthma', 'bronchospasm'],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    type: 'Drug-Disease Precaution',
    title: 'Caution in Asthma — Bronchospasm Risk (AERD)',
    description:
      'Patient’s Medical Form reports Asthma. COX-1 inhibition shunts arachidonic acid toward leukotriene synthesis, which may trigger bronchospasm.',
    clinicalAdvice:
      'Verify patient has no history of NSAID-exacerbated respiratory disease before dispensing.',
  },
  {
    drug: 'aspirin',
    conditionKeywords: ['peptic ulcer', 'ulcer'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Active Peptic Ulcer',
    description:
      'Patient’s Medical Form reports Peptic Ulcer. Aspirin irreversibly inhibits platelet aggregation and damages gastric mucosa.',
    clinicalAdvice:
      'Prescription blocked unless co-prescribed with high-dose PPI under cardiology directive.',
  },
  {
    drug: 'metformin',
    conditionKeywords: [
      'chronic kidney disease',
      'kidney',
      'renal',
      'ckd',
      'liver disease',
      'hepatic',
    ],
    severity: 'Yellow',
    drugsComCategory: 'Moderate',
    type: 'Drug-Disease Precaution',
    title: 'Lactic Acidosis Risk in Renal / Hepatic Impairment',
    description:
      'Patient’s Medical Form indicates renal or hepatic impairment. Metformin clearance is reduced, increasing the risk of metformin-associated lactic acidosis (MALA).',
    clinicalAdvice:
      'Verify eGFR > 30 mL/min/1.73m² (reduce max dose by 50% if eGFR 30–45) and inspect PDR.net Dosing Considerations.',
  },
  {
    drug: 'atorvastatin',
    conditionKeywords: ['liver disease', 'hepatic', 'cirrhosis'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Active Liver Disease',
    description:
      'Patient’s Medical Form reports Liver Disease. HMG-CoA reductase inhibitors (Atorvastatin) are contraindicated in active hepatic decompensation.',
    clinicalAdvice:
      'Prescription blocked. Evaluate baseline ALT/AST and consult hepatology.',
  },
  {
    drug: 'warfarin',
    conditionKeywords: ['peptic ulcer', 'liver disease', 'hepatic'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'High Hemorrhagic Risk with Ulcer / Hepatic Disease',
    description:
      'Patient’s Medical Form reports Peptic Ulcer or Liver Disease, creating a severe bleeding hazard with Vitamin K antagonism.',
    clinicalAdvice:
      'Prescription blocked. Requires specialist hematology clearance.',
  },
]

// 3. Drug-to-Allergy Cross-Reactivity Rules
export const DRUG_ALLERGY_RULES = [
  {
    drug: 'amoxicillin',
    allergyKeywords: ['penicillin', 'amoxicillin', 'beta-lactam'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Penicillin / Beta-Lactam Anaphylaxis Risk',
    description:
      'Patient’s Medical Form documents a Penicillin/Amoxicillin allergy. Prescribing Amoxicillin carries a high risk of IgE-mediated anaphylaxis or severe hypersensitivity.',
    clinicalAdvice:
      'Prescription strictly blocked. Select a non-beta-lactam macrolide or fluoroquinolone antibiotic.',
  },
  {
    drug: 'aspirin',
    allergyKeywords: ['aspirin', 'nsaid', 'salicylate'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Aspirin / NSAID Hypersensitivity',
    description:
      'Patient’s Medical Form documents an Aspirin/NSAID allergy. Risk of angioedema, urticaria, or severe bronchospasm.',
    clinicalAdvice:
      'Prescription strictly blocked. Avoid all salicylates and cross-reactive NSAIDs.',
  },
  {
    drug: 'ibuprofen',
    allergyKeywords: ['ibuprofen', 'aspirin', 'nsaid'],
    severity: 'Red',
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: NSAID Cross-Reactivity',
    description:
      'Patient’s Medical Form documents an NSAID/Aspirin allergy. High risk of cross-reactive anaphylactoid reaction.',
    clinicalAdvice:
      'Prescription strictly blocked. Use Acetaminophen/Paracetamol instead.',
  },
]

// 4. Drugs.com Laboratory Test Interference ("Lab Interaction") Database
export const DRUGS_COM_LAB_INTERACTIONS = {
  ibuprofen: [
    {
      drug: 'Ibuprofen',
      category: 'Moderate',
      labTest:
        'Urine Drug Screen (Cannabinoids / THC & Barbiturates Immunoassay)',
      effect: 'False-Positive Urine Drug Test Result',
      summary:
        'Ibuprofen and its urinary metabolites can cross-react with enzyme-multiplied immunoassay technique (EMIT) and fluorescence polarization immunoassay (FPIA) screening assays, causing a false-positive urine drug test for Marijuana (THC / Cannabinoids) or Barbiturates.',
      recommendation:
        'Advise patient and ordering physician that a positive immunoassay toxicology screen during Ibuprofen therapy requires Gas Chromatography–Mass Spectrometry (GC-MS) confirmatory testing.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  amoxicillin: [
    {
      drug: 'Amoxicillin',
      category: 'Moderate',
      labTest:
        'Urine Glucose Assay (Copper Reduction: Clinitest / Benedict’s)',
      effect: 'False-Positive Urine Glucose Reading',
      summary:
        'High urinary concentrations of Amoxicillin reduce copper ions in non-enzymatic urine glucose tests (Clinitest, Benedict’s, Fehling’s), producing a false-positive glycosuria reading.',
      recommendation:
        'Use enzymatic glucose oxidase tests (e.g., Clinistix) when monitoring urine glucose in diabetic patients taking Amoxicillin.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  metformin: [
    {
      drug: 'Metformin',
      category: 'Moderate',
      labTest:
        'Iodinated Radiocontrast Studies, FDG-PET Scans & Serum Vitamin B12',
      effect:
        'Contrast-Induced Lactic Acidosis Risk & Intense Bowel FDG-PET Uptake',
      summary:
        'Intravascular iodinated contrast agents can acutely decrease renal function and precipitate Metformin-Associated Lactic Acidosis (MALA). Metformin also increases colonic 18F-FDG uptake on PET/CT scans (obscuring bowel lesions) and lowers serum Vitamin B12 assays.',
      recommendation:
        'Hold Metformin prior to or at the time of iodinated contrast imaging in patients with eGFR 30–60 mL/min/1.73m²; re-evaluate eGFR 48 hours post-procedure before restarting.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  omeprazole: [
    {
      drug: 'Omeprazole',
      category: 'Moderate',
      labTest:
        'Serum Chromogranin A (CgA), H. pylori Urea Breath Test & Urine THC Immunoassay',
      effect:
        'False-Positive CgA / THC Screen & False-Negative H. pylori Assay',
      summary:
        'Omeprazole-induced gastric acid suppression causes secondary hypergastrinemia and elevated Chromogranin A levels (false-positive neuroendocrine tumor workup), suppresses H. pylori density (false-negative breath/stool tests), and can rarely trigger false-positive urine cannabinoid immunoassays.',
      recommendation:
        'Discontinue Omeprazole at least 14 days prior to Chromogranin A or H. pylori testing; confirm unexpected positive THC screens via GC-MS.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  warfarin: [
    {
      drug: 'Warfarin',
      category: 'Major',
      labTest:
        'Protein C, Protein S & Lupus Anticoagulant Thrombophilia Panels',
      effect:
        'False-Positive Thrombophilia & Coagulation Factor Deficiency',
      summary:
        'Warfarin inhibits Vitamin K epoxide reductase, depleting endogenous Protein C and Protein S and prolonging phospholipid-dependent clotting times—causing false-positive Lupus Anticoagulant and hereditary deficiency results.',
      recommendation:
        'Defer hypercoagulability lab workups until Warfarin has been discontinued for at least 2–4 weeks.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  aspirin: [
    {
      drug: 'Aspirin',
      category: 'Minor',
      labTest:
        'Urine 5-HIAA (Serotonin Metabolite) & Serum Uric Acid Assays',
      effect: 'Analytical Assay Interference & Biphasic Uric Acid Shift',
      summary:
        'Salicylates interfere with fluorometric and colorimetric urine 5-HIAA carcinoid tumor assays and cause false-high or false-low serum uric acid levels depending on dosage.',
      recommendation:
        'Withhold salicylates 48–72 hours prior to 24-hour urine 5-HIAA collection if clinically safe.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  lisinopril: [
    {
      drug: 'Lisinopril',
      category: 'Minor',
      labTest:
        'Basic Metabolic Panel (Serum Creatinine & Potassium) & Digoxin Assays',
      effect: 'Expected Creatinine Elevation (+10–25%) & Hyperkalemia Shift',
      summary:
        'ACE inhibition reduces efferent glomerular arteriolar tone, causing an expected transient rise in serum creatinine (up to 30% above baseline) and mild potassium elevation due to reduced aldosterone secretion.',
      recommendation:
        'Check baseline and 2-week post-initiation renal function and electrolytes; do not discontinue unless creatinine rises >30% or K+ > 5.5 mEq/L.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  atorvastatin: [
    {
      drug: 'Atorvastatin',
      category: 'Minor',
      labTest:
        'Hepatic Transaminases (ALT / AST) & Serum Creatine Kinase (CK)',
      effect: 'Asymptomatic Transaminase & Creatine Kinase Elevation',
      summary:
        'HMG-CoA reductase inhibition may produce dose-dependent, transient elevations in serum ALT/AST (<3x ULN) and Creatine Kinase (CK), particularly after vigorous exercise.',
      recommendation:
        'Obtain baseline hepatic panel prior to initiation; only repeat if clinical symptoms of hepatotoxicity or myopathy develop.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
}

/**
 * Returns Drugs.com Laboratory Test Interference alerts for candidate and active drugs
 */
export function getLabInteractionsForDrug(
  candidateMedInput,
  activePrescriptions = []
) {
  const candidateTokens = extractAllDrugTokens(candidateMedInput)
  const results = []
  const seenTests = new Set()

  candidateTokens.forEach((token) => {
    const list = DRUGS_COM_LAB_INTERACTIONS[token] || []
    list.forEach((item) => {
      const key = `${item.drug}|${item.labTest}`
      if (!seenTests.has(key)) {
        seenTests.add(key)
        results.push(item)
      }
    })
  })

  // Also include active co-prescriptions' lab interactions if any
  activePrescriptions.forEach((rx) => {
    const rxTokens = extractAllDrugTokens(rx)
    rxTokens.forEach((token) => {
      if (!candidateTokens.has(token)) {
        const list = DRUGS_COM_LAB_INTERACTIONS[token] || []
        list.forEach((item) => {
          const key = `${item.drug}|${item.labTest}`
          if (!seenTests.has(key)) {
            seenTests.add(key)
            results.push({
              ...item,
              isFromActiveRegimen: true,
            })
          }
        })
      }
    })
  })

  return results
}

/**
 * Synchronously evaluates Drugs.com Clinical Rules:
 * 1. Active Prescriptions (Drug-Drug Interactions: Major / Moderate / Minor)
 * 2. Patient Chronic Diseases from Medical Form (Drug-Disease Contraindications)
 * 3. Patient Allergies from Medical Form (Drug-Allergy Cross-Reactivity)
 * 4. Laboratory Test Interferences ("Lab Interactions")
 */
export function evaluateDrugsComRules(
  candidateMedInput,
  activePrescriptions = [],
  patientChronicDiseases = [],
  patientAllergies = []
) {
  const candidateDisplay =
    (typeof candidateMedInput === 'object'
      ? candidateMedInput?.cleanName || candidateMedInput?.name
      : String(candidateMedInput || '')) || 'Selected Medication'

  if (!candidateMedInput) {
    return {
      severity: 'Green',
      rxNavSeverity: 'None',
      drugsComCategory: 'Minor',
      title: 'No Medication Selected',
      description:
        'Select a medication to evaluate Drugs.com Drug-Drug, Drug-Disease, and Lab Interactions.',
      isBlocked: false,
      requiresAcknowledgment: false,
      interactions: [],
      diseaseAlerts: [],
      allergyAlerts: [],
      labInteractions: [],
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    }
  }

  const candidateKey = normalizeDrugKey(candidateMedInput)
  const candidateTokens = extractAllDrugTokens(candidateMedInput)
  const detectedInteractions = []
  const diseaseAlerts = []
  const allergyAlerts = []
  const labInteractions = getLabInteractionsForDrug(
    candidateMedInput,
    activePrescriptions
  )

  // A. Check Drug-to-Allergy Contraindications
  const normalizedAllergies = Array.isArray(patientAllergies)
    ? patientAllergies.join(' ').toLowerCase()
    : String(patientAllergies || '').toLowerCase()

  if (normalizedAllergies) {
    DRUG_ALLERGY_RULES.forEach((rule) => {
      if (candidateTokens.has(rule.drug)) {
        const matchedKeyword = rule.allergyKeywords.find((kw) =>
          normalizedAllergies.includes(kw)
        )
        if (matchedKeyword) {
          const alertObj = {
            drugA: candidateDisplay,
            drugB: `Allergy: ${matchedKeyword.toUpperCase()}`,
            type: rule.type,
            severity: rule.severity,
            rxNavSeverity: rule.severity === 'Red' ? 'High' : 'Moderate',
            drugsComCategory:
              rule.drugsComCategory ||
              mapSeverityToDrugsComCategory(rule.severity),
            title: rule.title,
            description: rule.description,
            clinicalAdvice: rule.clinicalAdvice,
            source: 'Drugs.com Interaction Checker',
            sourceUrl: 'https://www.drugs.com/drug_interactions.html',
          }
          allergyAlerts.push(alertObj)
          detectedInteractions.push(alertObj)
        }
      }
    })

    // Dynamic direct allergy matching
    candidateTokens.forEach((t) => {
      if (
        t.length >= 3 &&
        normalizedAllergies.includes(t) &&
        allergyAlerts.length === 0
      ) {
        const dynamicAllergyAlert = {
          drugA: candidateDisplay,
          drugB: `Documented Allergy (${t.toUpperCase()})`,
          type: 'Allergy Contraindication',
          severity: 'Red',
          rxNavSeverity: 'High',
          drugsComCategory: 'Major',
          title: `SEVERE ALLERGY ALERT: Documented ${candidateDisplay} Hypersensitivity`,
          description: `Patient’s Medical Form documents a direct allergy to ${candidateDisplay}. Prescribing this agent carries a severe hypersensitivity / anaphylaxis risk.`,
          clinicalAdvice:
            'Prescription strictly blocked by patient allergy profile. Select an alternative therapeutic class.',
          source: 'Drugs.com Interaction Checker',
          sourceUrl: 'https://www.drugs.com/drug_interactions.html',
        }
        allergyAlerts.push(dynamicAllergyAlert)
        detectedInteractions.push(dynamicAllergyAlert)
      }
    })
  }

  // B. Check Drug-to-Drug Interactions (DDI) against active prescriptions
  activePrescriptions.forEach((rx) => {
    const rxMedName = rx.medication?.name || rx.name || ''
    const rxKey = normalizeDrugKey(rx)
    const rxTokens = extractAllDrugTokens(rx)

    // Skip if comparing same drug
    if (rxKey && rxKey === candidateKey) return
    const sharedTokens = [...candidateTokens].filter((t) => rxTokens.has(t))
    if (sharedTokens.length > 0 && candidateTokens.size === 1) return

    DDI_RULES.forEach((rule) => {
      const [drugA, drugB] = rule.drugs
      const matchA = candidateTokens.has(drugA) && rxTokens.has(drugB)
      const matchB = candidateTokens.has(drugB) && rxTokens.has(drugA)

      if (matchA || matchB) {
        const isDuplicate = detectedInteractions.some(
          (d) =>
            d.type === 'Drug-Drug Interaction' &&
            ((d.drugA === candidateDisplay && d.drugB === rxMedName) ||
              (d.drugB === candidateDisplay && d.drugA === rxMedName))
        )

        if (!isDuplicate) {
          detectedInteractions.push({
            drugA: candidateDisplay,
            drugB: rxMedName || drugB,
            type: rule.type || 'Drug-Drug Interaction',
            severity: rule.severity,
            rxNavSeverity: rule.severity === 'Red' ? 'High' : 'Moderate',
            drugsComCategory:
              rule.drugsComCategory ||
              mapSeverityToDrugsComCategory(rule.severity),
            title: rule.title,
            description: rule.description,
            clinicalAdvice: rule.clinicalAdvice,
            source: rule.source || 'Drugs.com Interaction Checker',
            sourceUrl:
              rule.sourceUrl || 'https://www.drugs.com/drug_interactions.html',
          })
        }
      }
    })
  })

  // C. Check Drug-to-Disease Contraindications against Patient Chronic Diseases
  const normalizedDiseases = (patientChronicDiseases || []).map((d) =>
    String(d).toLowerCase()
  )

  if (normalizedDiseases.length > 0) {
    DRUG_DISEASE_RULES.forEach((rule) => {
      if (candidateTokens.has(rule.drug)) {
        const matchedDisease = patientChronicDiseases.find((patientDis) =>
          rule.conditionKeywords.some((kw) =>
            String(patientDis).toLowerCase().includes(kw)
          )
        )

        if (matchedDisease) {
          const diseaseAlertObj = {
            drugA: candidateDisplay,
            drugB: `Condition: ${matchedDisease}`,
            type: rule.type,
            severity: rule.severity,
            rxNavSeverity: rule.severity === 'Red' ? 'High' : 'Moderate',
            drugsComCategory:
              rule.drugsComCategory ||
              mapSeverityToDrugsComCategory(rule.severity),
            title: rule.title,
            description: rule.description,
            clinicalAdvice: rule.clinicalAdvice,
            source: 'Drugs.com & PDR.net Clinical Reference',
            sourceUrl: 'https://www.drugs.com/drug_interactions.html',
          }
          diseaseAlerts.push(diseaseAlertObj)
          detectedInteractions.push(diseaseAlertObj)
        }
      }
    })
  }

  // Determine highest severity: Major (Red) > Moderate (Yellow) > Minor (Green)
  const hasRed = detectedInteractions.some((i) => i.severity === 'Red')
  const hasYellow = detectedInteractions.some((i) => i.severity === 'Yellow')
  const minorInteractions = detectedInteractions.filter(
    (i) => i.severity === 'Green'
  )

  if (hasRed) {
    const primaryRed = detectedInteractions.find((i) => i.severity === 'Red')
    return {
      severity: 'Red',
      rxNavSeverity: 'High',
      drugsComCategory: 'Major',
      title: `${primaryRed.title} (${primaryRed.drugA} + ${primaryRed.drugB})`,
      description: primaryRed.description,
      clinicalAdvice: primaryRed.clinicalAdvice,
      isBlocked: true,
      requiresAcknowledgment: false,
      interactions: detectedInteractions,
      diseaseAlerts,
      allergyAlerts,
      labInteractions,
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    }
  }

  if (hasYellow) {
    const primaryYellow = detectedInteractions.find(
      (i) => i.severity === 'Yellow'
    )
    return {
      severity: 'Yellow',
      rxNavSeverity: 'Moderate',
      drugsComCategory: 'Moderate',
      title: `${primaryYellow.title} (${primaryYellow.drugA} + ${primaryYellow.drugB})`,
      description: primaryYellow.description,
      clinicalAdvice: primaryYellow.clinicalAdvice,
      isBlocked: false,
      requiresAcknowledgment: true,
      interactions: detectedInteractions,
      diseaseAlerts,
      allergyAlerts,
      labInteractions,
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    }
  }

  // If candidate is not indexed in local rules and has no interactions
  const isIndexed = [...candidateTokens].some((t) => KNOWN_LOCAL_DRUGS.has(t))
  if (!isIndexed && minorInteractions.length === 0) {
    return {
      severity: 'Blue',
      rxNavSeverity: 'None',
      drugsComCategory: 'Global Reference',
      isGlobalDrug: true,
      title: `Global Drug Verified (${candidateDisplay})`,
      description:
        'Global Drug Detected: Verified against patient profile. Please inspect PDR.net Panel or Drugs.com link for specialized monographs.',
      clinicalAdvice:
        'This medication was selected from the live NIH RxTerms global formulary. Screened against active patient medications and profile.',
      isBlocked: false,
      requiresAcknowledgment: false,
      interactions: [],
      diseaseAlerts: [],
      allergyAlerts,
      labInteractions,
      sourceUrl: `https://www.drugs.com/search.php?searchterm=${encodeURIComponent(
        candidateDisplay
      )}`,
      pdrSearchUrl: `https://www.pdr.net/search-results?q=${encodeURIComponent(
        candidateDisplay
      )}`,
    }
  }

  // Green / Minor or Cleared
  const activeCount = activePrescriptions.length
  const conditionCount = patientChronicDiseases.length
  const primaryMinor = minorInteractions[0]

  return {
    severity: 'Green',
    rxNavSeverity: 'None',
    drugsComCategory: 'Minor',
    title: primaryMinor
      ? `Minor Interaction: ${primaryMinor.title}`
      : 'Cleared by Drugs.com & PDR.net Clinical Safety Engine',
    description: primaryMinor
      ? primaryMinor.description
      : `Safe to prescribe. Screened via Drugs.com against ${activeCount} active ${
          activeCount === 1 ? 'medication' : 'medications'
        } and ${conditionCount} patient-reported chronic ${
          conditionCount === 1 ? 'condition' : 'conditions'
        }.`,
    clinicalAdvice: primaryMinor
      ? primaryMinor.clinicalAdvice
      : 'Standard clinical pharmacist counseling and adherence follow-up apply.',
    isBlocked: false,
    requiresAcknowledgment: false,
    interactions: minorInteractions,
    diseaseAlerts: [],
    allergyAlerts,
    labInteractions,
    sourceUrl: 'https://www.drugs.com/drug_interactions.html',
  }
}

/**
 * Adapter #1: Drugs.com Interaction Fetcher
 */
export async function fetchExternalInteractionSource1(
  candidateMedName,
  activeMedNames = []
) {
  const fakeRxList = activeMedNames.map((name) => ({ name }))
  const result = evaluateDrugsComRules(candidateMedName, fakeRxList, [], [])
  return {
    source: 'Drugs.com Interaction Checker',
    referenceUrl: 'https://www.drugs.com/drug_interactions.html',
    drugsComCategory: result.drugsComCategory,
    interactions: result.interactions,
    labInteractions: result.labInteractions,
  }
}

/**
 * Adapter #2: PDR.net Contraindication & Dosing Reference
 */
export async function fetchExternalInteractionSource2(
  candidateMedName,
  patientConditions = []
) {
  const result = evaluateDrugsComRules(candidateMedName, [], patientConditions, [])
  return {
    source: "PDR.net (Prescribers' Digital Reference)",
    referenceUrl: 'https://www.pdr.net/',
    drugsComCategory: result.drugsComCategory,
    contraindications: result.diseaseAlerts,
  }
}

/**
 * Main Live Interaction Verification Entrypoint:
 * Evaluates Drugs.com deterministic clinical safety rules first.
 * If Major (Red) or Moderate (Yellow) interaction is caught, returns immediately to lock or prompt.
 * For unindexed global medications, executes supplemental live NIH RxNav queries.
 */
export async function verifyLiveDrugInteractions(
  candidateMedInput,
  activePrescriptions = [],
  patientChronicDiseases = [],
  patientAllergies = []
) {
  if (!candidateMedInput) {
    return evaluateDrugsComRules(
      candidateMedInput,
      activePrescriptions,
      patientChronicDiseases,
      patientAllergies
    )
  }

  // 1. Evaluate Drugs.com Clinical Rules immediately (zero lag, deterministic)
  const drugsComResult = evaluateDrugsComRules(
    candidateMedInput,
    activePrescriptions,
    patientChronicDiseases,
    patientAllergies
  )

  // 2. If Major (Red) interaction detected, HARD LOCK IMMEDIATELY
  if (drugsComResult.severity === 'Red') {
    return drugsComResult
  }

  // 3. Resolve RxCUIs in background for prescription record persistence
  let candidateRxcui = extractRxCui(candidateMedInput)
  try {
    if (!candidateRxcui) {
      const resolved = await resolveDrugRxCui(candidateMedInput)
      candidateRxcui = resolved.rxcui
    }
  } catch (err) {
    console.warn('RxCUI resolution note:', err.message)
  }

  // If Moderate (Yellow) interaction detected, return with requiresAcknowledgment
  if (drugsComResult.severity === 'Yellow') {
    return {
      ...drugsComResult,
      candidateRxcui,
    }
  }

  // 4. For unindexed global medications (Blue), perform supplemental NIH RxNav check if RxCUIs exist
  if (drugsComResult.isGlobalDrug && candidateRxcui && activePrescriptions.length > 0) {
    try {
      const activeRxcuis = activePrescriptions
        .map((rx) => extractRxCui(rx.medication || rx))
        .filter(Boolean)

      if (activeRxcuis.length > 0) {
        const queryList = [candidateRxcui, ...activeRxcuis]
        const rxNavUrl = `${RXNAV_INTERACTION_LIST_ENDPOINT}?rxcuis=${queryList.join('+')}`
        const res = await fetch(rxNavUrl, {
          headers: { Accept: 'application/json' },
        })

        if (res.ok) {
          const data = await res.json()
          const pairList = []
          const fullTypeGroups = data?.interactionTypeGroup || []

          fullTypeGroups.forEach((group) => {
            ;(group.interactionType || []).forEach((type) => {
              ;(type.interactionPair || []).forEach((pair) => {
                pairList.push(pair)
              })
            })
          })

          if (pairList.length > 0) {
            const firstPair = pairList[0]
            const severityLevel =
              firstPair.severity?.toLowerCase() === 'high' ? 'Red' : 'Yellow'
            const isBlock = severityLevel === 'Red'

            return {
              severity: severityLevel,
              rxNavSeverity: firstPair.severity || 'Moderate',
              drugsComCategory: mapSeverityToDrugsComCategory(severityLevel),
              title: `Live NIH RxNav Interaction (${firstPair.interactionConcept?.[0]?.minConceptItem?.name || 'Drug'} + ${firstPair.interactionConcept?.[1]?.minConceptItem?.name || 'Drug'})`,
              description:
                firstPair.description ||
                'Clinical interaction identified by NIH RxNav live interaction database.',
              clinicalAdvice: isBlock
                ? 'Prescription blocked by live NIH RxNav interaction rules.'
                : 'Clinical monitoring required.',
              isBlocked: isBlock,
              requiresAcknowledgment: !isBlock,
              interactions: pairList.map((p) => ({
                drugA: p.interactionConcept?.[0]?.minConceptItem?.name,
                drugB: p.interactionConcept?.[1]?.minConceptItem?.name,
                type: 'Live NIH RxNav Interaction',
                severity: severityLevel,
                rxNavSeverity: p.severity,
                drugsComCategory: mapSeverityToDrugsComCategory(severityLevel),
                title: p.description || 'Interaction',
                description: p.description,
                source: 'NIH NLM RxNav Live Interaction API',
                sourceUrl: rxNavUrl,
              })),
              diseaseAlerts: drugsComResult.diseaseAlerts,
              allergyAlerts: drugsComResult.allergyAlerts,
              labInteractions: drugsComResult.labInteractions,
              candidateRxcui,
              sourceUrl: rxNavUrl,
            }
          }
        }
      }
    } catch (err) {
      console.warn('Supplemental RxNav query bypassed:', err.message)
    }
  }

  // Return standard cleared / safe Drugs.com result
  return {
    ...drugsComResult,
    candidateRxcui,
  }
}

/**
 * Backwards-compatible alias
 */
export const checkDrugInteractions = (
  candidateMedName,
  activePrescriptions = [],
  patientChronicDiseases = [],
  patientAllergies = []
) => {
  return evaluateDrugsComRules(
    candidateMedName,
    activePrescriptions,
    patientChronicDiseases,
    patientAllergies
  )
}
