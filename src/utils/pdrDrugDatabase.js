/**
 * PDR.net (Prescribers' Digital Reference) Clinical Monograph Database
 * Source Reference: https://www.pdr.net/
 *
 * Provides authoritative Drug Summaries with the 6 required PDR.net sections:
 * 1. Administration
 * 2. Adverse Reactions
 * 3. Common Brand Names
 * 4. Dosage and Indications
 * 5. Dosing Considerations (with dynamic highlighting for Patient's Chronic Diseases, especially Kidney Disease)
 * 6. Mechanism of Action
 */

import { normalizeDrugKey } from './interactionChecker.js'

export const PDR_REFERENCE_URL = 'https://www.pdr.net/'

export const PDR_DRUG_MONOGRAPHS = {
  amoxicillin: {
    genericName: 'Amoxicillin Trihydrate',
    therapeuticClass: 'Beta-Lactam Aminopenicillin Antibiotic',
    pdrUrl: 'https://www.pdr.net/drug-summary/Amoxicillin-amoxicillin-704',
    commonBrandNames: ['Amoxil', 'Moxatag', 'Trimox', 'Larotid'],
    administration:
      'Oral administration. May be taken without regard to meals; however, administering at the start of a light meal minimizes gastrointestinal intolerance. Swallow capsules whole with a full glass of water (240 mL). Space doses evenly every 8 or 12 hours to maintain time above MIC (T>MIC).',
    dosageAndIndications: [
      {
        indication: 'Ear, Nose & Throat / Skin & Structure Infections',
        adultDose: '500 mg PO every 12 hours or 250 mg PO every 8 hours for 7–10 days (Mild/Moderate); 875 mg PO every 12 hours or 500 mg PO every 8 hours (Severe).',
      },
      {
        indication: 'Lower Respiratory Tract Infections / Community-Acquired Pneumonia',
        adultDose: '875 mg PO every 12 hours or 500 mg PO every 8 hours for 7–10 days.',
      },
      {
        indication: 'Helicobacter pylori Eradication (Triple/Quadruple Therapy)',
        adultDose: '1,000 mg PO twice daily with Omeprazole 20 mg BID and Clarithromycin 500 mg BID for 14 days.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment (eGFR / CrCl)',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Adjustment Required',
        directive:
          'PDR.net Renal Dosing Protocol: Amoxicillin is primarily excreted unchanged by the kidneys (~60–75%). For CrCl 10–30 mL/min: Reduce dose to 250–500 mg PO every 12 hours. For CrCl < 10 mL/min: Reduce to 250–500 mg PO every 24 hours. Avoid the 875 mg tablet if CrCl < 30 mL/min.',
      },
      {
        conditionLabel: 'Type 2 Diabetes (Glycemic Urine Testing)',
        conditionKeywords: ['type 2 diabetes', 'diabetes'],
        alertLevel: 'Clinical Precaution',
        directive:
          'High urine Amoxicillin concentrations cause false-positive copper-reduction glucose tests (Clinitest). Counsel diabetic patients to use enzymatic glucose oxidase strips.',
      },
      {
        conditionLabel: 'Hepatic Impairment / Liver Disease',
        conditionKeywords: ['liver disease', 'hepatic'],
        alertLevel: 'Standard Dosing',
        directive:
          'No routine initial dose adjustment required in hepatic impairment; monitor hepatic transaminases during prolonged therapy.',
      },
    ],
    adverseReactions: {
      common: ['Diarrhea (1.7%–9%)', 'Nausea & Vomiting (1%–3%)', 'Mucocutaneous Candidiasis', 'Maculopapular Rash'],
      serious: [
        'IgE-Mediated Anaphylaxis / Angioedema',
        'Clostridioides difficile-Associated Diarrhea (CDAD)',
        'Stevens-Johnson Syndrome (SJS) / Toxic Epidermal Necrolysis',
        'Crystalluria & Acute Interstitial Nephritis (high doses in renal impairment)',
      ],
    },
    mechanismOfAction:
      'Bactericidal aminopenicillin that binds to Penicillin-Binding Proteins (PBPs 1A, 1B, 2, and 3) inside the bacterial cell wall, inhibiting transpeptidation of peptidoglycan chains and activating autolytic enzymes that lyse actively dividing susceptible Gram-positive and Gram-negative bacteria.',
  },

  metformin: {
    genericName: 'Metformin Hydrochloride',
    therapeuticClass: 'Biguanide Antihyperglycemic Agent',
    pdrUrl: 'https://www.pdr.net/drug-summary/Glucophage-metformin-hydrochloride-745',
    commonBrandNames: ['Glucophage', 'Glucophage XR', 'Fortamet', 'Glumetza', 'Riomet'],
    administration:
      'Oral administration. Administer immediate-release tablets in divided doses with morning and evening meals to reduce gastrointestinal side effects (nausea, diarrhea, abdominal cramping). Titrate slowly by 500 mg weekly or 850 mg every 2 weeks.',
    dosageAndIndications: [
      {
        indication: 'Type 2 Diabetes Mellitus (Glycemic Control)',
        adultDose: 'Initial: 500 mg PO twice daily or 850 mg PO once daily with meals. Maintenance: 850 mg PO twice daily or 1,000 mg PO twice daily (Max 2,550 mg/day).',
      },
      {
        indication: 'Prediabetes / Insulin Resistance Syndrome',
        adultDose: '500–850 mg PO twice daily with meals alongside lifestyle intervention.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment (eGFR Dosing Lock)',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Critical Renal Adjustment',
        directive:
          'PDR.net Boxed Warning (Renal Clearance): Metformin is excreted 90% unchanged via renal tubular secretion. eGFR >= 45 mL/min/1.73m²: Full dose permitted. eGFR 30–44 mL/min/1.73m²: Initiation NOT recommended; if already on therapy, reduce dose by 50% (max 1,000 mg/day) and monitor eGFR every 3 months. eGFR < 30 mL/min/1.73m²: STRICTLY CONTRAINDICATED due to fatal Lactic Acidosis risk.',
      },
      {
        conditionLabel: 'Liver Disease / Hepatic Impairment',
        conditionKeywords: ['liver disease', 'hepatic', 'cirrhosis'],
        alertLevel: 'Contraindicated',
        directive:
          'Avoid Metformin in clinical or laboratory evidence of hepatic disease; impaired hepatic lactate clearance markedly increases Metformin-Associated Lactic Acidosis (MALA) risk.',
      },
      {
        conditionLabel: 'Heart Failure / Cardiovascular Disease',
        conditionKeywords: ['heart failure', 'cardiovascular disease'],
        alertLevel: 'Clinical Precaution',
        directive:
          'Contraindicated in acute or unstable congestive heart failure with hypoperfusion/hypoxemia. Safe in stable compensated heart failure if eGFR > 30 mL/min/1.73m².',
      },
    ],
    adverseReactions: {
      common: ['Diarrhea (up to 53% IR)', 'Nausea & Vomiting (26%)', 'Flatulence (12%)', 'Metallic Taste (Dysgeusia)', 'Subclinical Vitamin B12 Deficiency (7%)'],
      serious: [
        'Metformin-Associated Lactic Acidosis (MALA — Boxed Warning, ~50% mortality if untreated)',
        'Megaloblastic Anemia secondary to Vitamin B12 malabsorption',
      ],
    },
    mechanismOfAction:
      'Activates hepatic AMP-activated protein kinase (AMPK) and inhibits mitochondrial respiratory-chain complex I, suppressing hepatic gluconeogenesis and glycogenolysis, reducing intestinal glucose absorption, and improving peripheral skeletal muscle insulin sensitivity without stimulating endogenous insulin secretion (no hypoglycemia in monotherapy).',
  },

  ibuprofen: {
    genericName: 'Ibuprofen',
    therapeuticClass: 'Nonsteroidal Anti-Inflammatory Drug (Propionic Acid Derivative)',
    pdrUrl: 'https://www.pdr.net/drug-summary/Motrin-ibuprofen-1909',
    commonBrandNames: ['Advil', 'Motrin', 'Caldolor', 'Nuprin', 'Brufen'],
    administration:
      'Oral administration. Take with food, milk, or antacids to decrease gastrointestinal mucosal irritation. Use the lowest effective dose for the shortest clinical duration consistent with patient treatment goals.',
    dosageAndIndications: [
      {
        indication: 'Mild-to-Moderate Pain / Primary Dysmenorrhea',
        adultDose: '400 mg PO every 4 to 6 hours as needed (Max OTC 1,200 mg/day; Max Rx 3,200 mg/day).',
      },
      {
        indication: 'Osteoarthritis & Rheumatoid Arthritis',
        adultDose: '400–800 mg PO 3 to 4 times daily (1,200–3,200 mg/day divided).',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment (Nephrotoxicity Alert)',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Contraindicated / Avoid',
        directive:
          'PDR.net Renal Warning: Ibuprofen blocks renal prostaglandin E2 and prostacyclin synthesis, causing afferent arteriolar vasoconstriction, sharp reduction in GFR, papillary necrosis, and hyperkalemia. Contraindicated in advanced CKD (CrCl < 30 mL/min); avoid in mild-to-moderate CKD.',
      },
      {
        conditionLabel: 'Peptic Ulcer Disease / GI Reflux (GERD)',
        conditionKeywords: ['peptic ulcer', 'ulcer', 'gerd', 'acid reflux'],
        alertLevel: 'Contraindicated / Boxed Warning',
        directive:
          'PDR.net GI Boxed Warning: NSAIDs cause an increased risk of serious gastrointestinal adverse events including bleeding, ulceration, and perforation of the stomach or intestines, which can be fatal. Contraindicated in active Peptic Ulcer.',
      },
      {
        conditionLabel: 'Hypertension & Cardiovascular Disease',
        conditionKeywords: ['hypertension', 'cardiovascular disease', 'heart failure'],
        alertLevel: 'Cardiovascular Boxed Warning',
        directive:
          'Can lead to new-onset hypertension or worsening of preexisting hypertension (+3–6 mmHg MAP), fluid retention, and increased risk of serious cardiovascular thrombotic events (MI and stroke).',
      },
      {
        conditionLabel: 'Asthma',
        conditionKeywords: ['asthma'],
        alertLevel: 'Bronchospasm Precaution',
        directive:
          'May precipitate severe bronchospasm in patients with Aspirin/NSAID-Exacerbated Respiratory Disease (AERD) due to leukotriene shunting.',
      },
    ],
    adverseReactions: {
      common: ['Dyspepsia & Epigastric Pain (3%–9%)', 'Nausea', 'Edema / Fluid Retention (1%–3%)', 'Dizziness & Headache'],
      serious: [
        'Gastrointestinal Ulceration, Hemorrhage & Perforation (Boxed Warning)',
        'Myocardial Infarction & Cerebrovascular Stroke (Boxed Warning)',
        'Acute Kidney Injury (AKI) & Renal Papillary Necrosis',
        'False-Positive Urine Cannabinoid (THC) & Barbiturate Drug Screen',
      ],
    },
    mechanismOfAction:
      'Reversibly inhibits cyclooxygenase-1 (COX-1) and cyclooxygenase-2 (COX-2) isoenzymes, blocking the conversion of arachidonic acid to prostaglandin G2/H2 precursors and downstream pro-inflammatory prostaglandins (PGE2, PGI2) and thromboxane A2.',
  },

  lisinopril: {
    genericName: 'Lisinopril Dihydrate',
    therapeuticClass: 'Angiotensin-Converting Enzyme (ACE) Inhibitor',
    pdrUrl: 'https://www.pdr.net/drug-summary/Zestril-lisinopril-2023',
    commonBrandNames: ['Prinivil', 'Zestril', 'Qbrelis'],
    administration:
      'Oral administration once daily at the same time each day, with or without food. Monitor blood pressure for 2 hours after the initial dose in volume-depleted patients to detect first-dose orthostatic hypotension.',
    dosageAndIndications: [
      {
        indication: 'Essential Hypertension',
        adultDose: 'Initial: 10 mg PO once daily (5 mg/day if on diuretics). Maintenance: 20–40 mg PO once daily (Max 80 mg/day).',
      },
      {
        indication: 'Heart Failure (Adjunctive Therapy) / Diabetic Nephropathy Protection',
        adultDose: 'Initial: 5 mg PO once daily. Target maintenance: 20–40 mg PO once daily as tolerated.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment (Dose Titration)',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Adjustment Required',
        directive:
          'PDR.net Renal Dosing Protocol: Lisinopril is excreted 100% unchanged in urine. Normal/Mild (CrCl > 30 mL/min): Initial 10 mg/day. Moderate-to-Severe CKD (CrCl 10–30 mL/min): Halve initial dose to 5 mg PO once daily (2.5 mg in Heart Failure). Hemodialysis / CrCl < 10 mL/min: Initial 2.5 mg PO once daily (max 40 mg/day). Monitor serum potassium and creatinine within 1–2 weeks.',
      },
      {
        conditionLabel: 'Type 2 Diabetes & Hypertension',
        conditionKeywords: ['type 2 diabetes', 'hypertension'],
        alertLevel: 'Preferred Renoprotective Agent',
        directive:
          'First-line therapy in patients with comorbid Hypertension and Type 2 Diabetes to reduce intraglomerular pressure and slow progression of albuminuria/diabetic nephropathy.',
      },
    ],
    adverseReactions: {
      common: ['Persistent Dry Nonproductive Cough (3.5%–11% via bradykinin accumulation)', 'Dizziness & Orthostatic Hypotension (5%–12%)', 'Headache', 'Hyperkalemia (2%–5%)'],
      serious: [
        'Angioedema of the Head, Neck, Tongue, or Intestines (0.1%–0.7%)',
        'Acute Renal Failure (especially in bilateral renal artery stenosis)',
        'Fetal Toxicity (Boxed Warning — discontinue immediately in pregnancy)',
      ],
    },
    mechanismOfAction:
      'Competitively inhibits Angiotensin-Converting Enzyme (ACE / peptidyl dipeptidase), preventing the conversion of Angiotensin I to the potent vasoconstrictor Angiotensin II, decreasing aldosterone secretion (promoting natriuresis and potassium retention), and inhibiting bradykinin degradation.',
  },

  atorvastatin: {
    genericName: 'Atorvastatin Calcium',
    therapeuticClass: 'HMG-CoA Reductase Inhibitor (Statin)',
    pdrUrl: 'https://www.pdr.net/drug-summary/Lipitor-atorvastatin-calcium-2339',
    commonBrandNames: ['Lipitor', 'Atorvaliq', 'Caduet (with Amlodipine)'],
    administration:
      'Oral administration once daily at any time of day, with or without food. Because Atorvastatin has a long active metabolite half-life (~20–30 hours), evening administration is convenient but not strictly required. Avoid consuming >1.2 liters of grapefruit juice daily.',
    dosageAndIndications: [
      {
        indication: 'Primary Hyperlipidemia & Mixed Dyslipidemia',
        adultDose: 'Initial: 10–20 mg PO once daily (40 mg once daily if >45% LDL-C reduction required). Range: 10–80 mg PO once daily.',
      },
      {
        indication: 'Secondary ASCVD Risk Reduction / Type 2 Diabetes Cardioprotection',
        adultDose: 'Moderate-intensity: 10–20 mg PO once daily. High-intensity: 40–80 mg PO once daily.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Renally Safe (No Dose Adjustment)',
        directive:
          'PDR.net Renal Dosing Protocol: Renal disease does not affect plasma concentrations or LDL-C lowering efficacy of Atorvastatin (<2% renal excretion). No dose adjustment is required in Chronic Kidney Disease, making it the preferred statin in renal impairment.',
      },
      {
        conditionLabel: 'Liver Disease / Hepatic Impairment',
        conditionKeywords: ['liver disease', 'hepatic', 'cirrhosis'],
        alertLevel: 'Contraindicated',
        directive:
          'Contraindicated in acute liver failure, decompensated cirrhosis, or unexplained persistent elevations of serum transaminases (>3x ULN).',
      },
      {
        conditionLabel: 'Type 2 Diabetes',
        conditionKeywords: ['type 2 diabetes', 'diabetes'],
        alertLevel: 'Clinical Monitoring',
        directive:
          'Statins may slightly increase HbA1c (+0.1%–0.2%); however, cardiovascular mortality reduction in diabetic patients strongly outweighs mild glycemic shifts.',
      },
    ],
    adverseReactions: {
      common: ['Myalgia & Arthralgia (4%–12%)', 'Nasopharyngitis (8%)', 'Diarrhea (5%–7%)', 'Mild Transaminase Elevation'],
      serious: [
        'Rhabdomyolysis with Myoglobinuria & Acute Renal Failure',
        'Immune-Mediated Necrotizing Myopathy (IMNM)',
        'Hepatic Failure (rare)',
      ],
    },
    mechanismOfAction:
      'Selectively and competitively inhibits 3-hydroxy-3-methylglutaryl-coenzyme A (HMG-CoA) reductase, the rate-limiting enzyme that converts HMG-CoA to mevalonate in hepatic cholesterol biosynthesis, upregulating hepatic LDL receptors and accelerating systemic clearance of atherogenic LDL particles.',
  },

  warfarin: {
    genericName: 'Warfarin Sodium',
    therapeuticClass: 'Coumarin Vitamin K Antagonist Anticoagulant',
    pdrUrl: 'https://www.pdr.net/drug-summary/Coumadin-warfarin-sodium-106',
    commonBrandNames: ['Coumadin', 'Jantoven'],
    administration:
      'Oral administration once daily in the late afternoon or evening so same-day PT/INR lab results can guide immediate dosage adjustments. Maintain consistent daily dietary Vitamin K intake (dark leafy greens).',
    dosageAndIndications: [
      {
        indication: 'Atrial Fibrillation / Venous Thromboembolism (DVT/PE) Prophylaxis & Treatment',
        adultDose: 'Initial: 2–5 mg PO once daily; titrate strictly according to Prothrombin Time / International Normalized Ratio (Target INR 2.0–3.0 for most indications; 2.5–3.5 for mechanical mitral valves).',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Increased Bleeding Sensitivity',
        directive:
          'PDR.net Renal Dosing Protocol: Although Warfarin is metabolized hepatically (CYP2C9), patients with moderate-to-severe CKD exhibit downregulated CYP2C9 activity, uremic platelet dysfunction, and a 2-fold higher hemorrhage risk. Initiate at lower doses (2–2.5 mg/day) and monitor INR more frequently.',
      },
      {
        conditionLabel: 'Peptic Ulcer Disease / Liver Disease',
        conditionKeywords: ['peptic ulcer', 'ulcer', 'liver disease', 'hepatic'],
        alertLevel: 'Contraindicated / High Bleed Hazard',
        directive:
          'Contraindicated in active gastrointestinal ulceration or overt bleeding. Hepatic impairment reduces synthesis of clotting factors and slows Warfarin clearance.',
      },
    ],
    adverseReactions: {
      common: ['Minor Epistaxis & Gingival Bleeding', 'Easy Bruising (Ecchymosis)', 'Alopecia'],
      serious: [
        'Major / Fatal Intracranial or Gastrointestinal Hemorrhage (Boxed Warning)',
        'Warfarin-Induced Skin Necrosis & Purple Toe Syndrome (Cholesterol Microembolization)',
        'Calciphylaxis (in End-Stage Renal Disease)',
      ],
    },
    mechanismOfAction:
      'Inhibits the C1 subunit of Vitamin K epoxide reductase complex 1 (VKORC1), blocking the regeneration of reduced Vitamin K (hydroquinone) required for gamma-carboxylation of hepatic coagulation factors II (prothrombin), VII, IX, and X, as well as anticoagulant proteins C and S.',
  },

  aspirin: {
    genericName: 'Aspirin (Acetylsalicylic Acid)',
    therapeuticClass: 'Salicylate Antiplatelet & Nonsteroidal Anti-Inflammatory Agent',
    pdrUrl: 'https://www.pdr.net/drug-summary/Bayer-Aspirin-aspirin-1420',
    commonBrandNames: ['Bayer Aspirin', 'Ecotrin', 'Bufferin', 'Vazalore', 'Durlaza'],
    administration:
      'Oral administration with a full glass of water during or immediately after meals to minimize gastric mucosal erosion. Enteric-coated tablets should be swallowed whole (unless chewed during acute suspected myocardial infarction).',
    dosageAndIndications: [
      {
        indication: 'Secondary Prevention of Cardiovascular Events (Post-MI, Stroke, Stent, Angina)',
        adultDose: '81 mg (low-dose) to 325 mg PO once daily indefinitely.',
      },
      {
        indication: 'Acute Coronary Syndrome / Suspected Myocardial Infarction',
        adultDose: '162–325 mg non-enteric coated tablet chewed immediately.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Dose-Dependent Precaution',
        directive:
          'PDR.net Renal Dosing Protocol: Avoid high/analgesic doses (>325 mg/day) in severe CKD (CrCl < 10 mL/min) due to salicylate accumulation and renal prostaglandin inhibition. Low-dose cardioprotective Aspirin (81 mg/day) is generally permitted in CKD if cardiovascular indication exists, with bleeding surveillance.',
      },
      {
        conditionLabel: 'Peptic Ulcer Disease / GI Reflux',
        conditionKeywords: ['peptic ulcer', 'ulcer', 'gerd'],
        alertLevel: 'Contraindicated in Active Ulcer',
        directive:
          'Contraindicated in active peptic ulcer disease or history of GI bleeding unless co-administered with a proton pump inhibitor (e.g., Omeprazole) under cardiology supervision.',
      },
      {
        conditionLabel: 'Asthma',
        conditionKeywords: ['asthma'],
        alertLevel: 'Samter’s Triad / AERD Warning',
        directive:
          'May precipitate severe bronchospasm and laryngospasm in patients with Aspirin-Exacerbated Respiratory Disease (8%–20% of adult asthmatics).',
      },
    ],
    adverseReactions: {
      common: ['Dyspepsia & Heartburn', 'Minor Bruising', 'Prolonged Bleeding Time'],
      serious: [
        'Upper Gastrointestinal Ulceration & Hemorrhage',
        'Hemorrhagic Stroke',
        'Salicylism / Tinnitus & Metabolic Acidosis (at high doses)',
        'Reye’s Syndrome (in pediatric viral illnesses)',
      ],
    },
    mechanismOfAction:
      'Irreversibly acetylates the serine-530 residue of platelet cyclooxygenase-1 (COX-1), permanently blocking the synthesis of Thromboxane A2 (TXA2)—a potent promoter of platelet aggregation and vasoconstriction—for the entire 7-to-10-day lifespan of the platelet.',
  },

  omeprazole: {
    genericName: 'Omeprazole',
    therapeuticClass: 'Substituted Benzimidazole Proton Pump Inhibitor (PPI)',
    pdrUrl: 'https://www.pdr.net/drug-summary/Prilosec-omeprazole-918',
    commonBrandNames: ['Prilosec', 'Prilosec OTC', 'Zegerid', 'Losec'],
    administration:
      'Oral administration 30 to 60 minutes BEFORE a morning meal so proton pumps are actively translocated to the parietal cell canaliculi when peak plasma drug levels occur. Swallow delayed-release capsules whole; do not crush or chew enteric-coated granules.',
    dosageAndIndications: [
      {
        indication: 'Gastroesophageal Reflux Disease (GERD) & Erosive Esophagitis',
        adultDose: '20 mg PO once daily before breakfast for 4–8 weeks.',
      },
      {
        indication: 'Active Duodenal / Gastric Peptic Ulcer & NSAID Ulcer Prophylaxis',
        adultDose: '20–40 mg PO once daily for 4–8 weeks.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment (AIN Surveillance)',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Monitor Renal Function',
        directive:
          'PDR.net Renal Dosing Protocol: No initial dose reduction is required in renal impairment; however, Proton Pump Inhibitors are associated with Acute Interstitial Nephritis (AIN) and slow progression of CKD with long-term use. Periodically reassess the clinical need for chronic therapy and monitor serum creatinine.',
      },
      {
        conditionLabel: 'Liver Disease / Hepatic Impairment (Child-Pugh A–C)',
        conditionKeywords: ['liver disease', 'hepatic', 'cirrhosis'],
        alertLevel: 'Adjustment Required',
        directive:
          'PDR.net Hepatic Dosing Protocol: Bioavailability increases to ~100% and plasma half-life increases from 1 hour to 3 hours in hepatic cirrhosis. Reduce maintenance dose to 10–20 mg PO once daily.',
      },
      {
        conditionLabel: 'Peptic Ulcer / GERD / Acid Reflux',
        conditionKeywords: ['peptic ulcer', 'ulcer', 'gerd', 'acid reflux'],
        alertLevel: 'Primary Therapeutic Indication',
        directive:
          'Directly indicated for healing and mucosal protection in Peptic Ulcer and GERD reported on the patient’s medical form.',
      },
    ],
    adverseReactions: {
      common: ['Headache (7%)', 'Abdominal Pain (5%)', 'Diarrhea (4%)', 'Nausea & Flatulence (3%–4%)'],
      serious: [
        'Acute Interstitial Nephritis (AIN)',
        'Clostridioides difficile-Associated Diarrhea',
        'Severe Hypomagnesemia & Vitamin B12 Deficiency (chronic use >1 year)',
        'Osteoporosis-Related Hip, Wrist, or Spine Fractures',
      ],
    },
    mechanismOfAction:
      'Prodrug weak base that concentrates in the acidic secretory canaliculi of gastric parietal cells, where it is protonated into an active sulfenamide intermediate that covalently binds cysteine residues on the H+/K+ ATPase enzyme ("proton pump"), irreversibly blocking the final common step of gastric acid secretion for up to 72 hours.',
  },
}

/**
 * Retrieves the PDR.net monograph for any medication name, along with
 * dynamic matching against the patient's reported chronic diseases.
 */
export function getPdrDrugMonograph(medicationName, patientChronicDiseases = []) {
  const key = normalizeDrugKey(medicationName)
  const baseMonograph = PDR_DRUG_MONOGRAPHS[key] || {
    genericName: medicationName || 'Clinical Formulary Agent',
    therapeuticClass: 'Systemic Pharmacotherapeutic Agent',
    pdrUrl: PDR_REFERENCE_URL,
    commonBrandNames: [medicationName || 'Formulary Standard'],
    administration:
      'Administer orally as directed by the prescribing clinician. Maintain consistent daily dosing intervals with water.',
    dosageAndIndications: [
      {
        indication: 'Standard Approved Clinical Indication',
        adultDose: 'Consult individualized patient regimen and titration protocol.',
      },
    ],
    dosingConsiderations: [
      {
        conditionLabel: 'Chronic Kidney Disease / Renal Impairment',
        conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
        alertLevel: 'Evaluate Renal Clearance',
        directive:
          'Verify baseline estimated Glomerular Filtration Rate (eGFR) and adjust dosing interval if CrCl < 50 mL/min.',
      },
    ],
    adverseReactions: {
      common: ['Mild Gastrointestinal Discomfort', 'Headache', 'Fatigue'],
      serious: ['Hypersensitivity / Anaphylaxis', 'Hepatic or Renal Laboratory Shifts'],
    },
    mechanismOfAction:
      'Acts selectively on target physiological receptors or enzymatic pathways to achieve therapeutic clinical control.',
  }

  // Match dosing considerations against the patient's reported chronic diseases from PatientMedicalProfileForm
  const enrichedConsiderations = baseMonograph.dosingConsiderations.map((item) => {
    const matchedPatientConditions = (patientChronicDiseases || []).filter((patCond) =>
      item.conditionKeywords.some((kw) => String(patCond).toLowerCase().includes(kw))
    )
    const isKidneyRelated = item.conditionKeywords.some((kw) =>
      ['chronic kidney disease', 'kidney', 'renal', 'ckd'].includes(kw)
    )
    return {
      ...item,
      isPatientMatch: matchedPatientConditions.length > 0,
      matchedPatientConditions,
      isKidneyRelated,
    }
  })

  // Sort so patient-matched chronic conditions and Kidney Disease considerations appear first
  enrichedConsiderations.sort((a, b) => {
    if (a.isPatientMatch && !b.isPatientMatch) return -1
    if (!a.isPatientMatch && b.isPatientMatch) return 1
    if (a.isKidneyRelated && !b.isKidneyRelated) return -1
    if (!a.isKidneyRelated && b.isKidneyRelated) return 1
    return 0
  })

  return {
    ...baseMonograph,
    dosingConsiderations: enrichedConsiderations,
    hasPatientConditionMatches: enrichedConsiderations.some((c) => c.isPatientMatch),
  }
}

