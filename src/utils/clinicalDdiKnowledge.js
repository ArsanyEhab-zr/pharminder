/**
 * Layer 1 & Layer 2 Clinical Knowledge Base for the Universal 3-Layer Clinical DDI Engine
 *
 * Covers:
 * - 220+ Global & Middle-Eastern / Egyptian Brand Names & Multi-Ingredient Synonyms
 * - Comprehensive Pharmacological Class Mappings + NIH RxClass Normalization
 * - 23 Textbook Lethal Class-to-Class, Drug-to-Drug, and Duplicate Therapy Matrix Rules
 * - Drug-Disease Contraindications, Drug-Allergy Cross-Reactivity, and Lab Interferences
 */

export const SALT_MODIFIERS = new Set([
  'sodium',
  'potassium',
  'calcium',
  'magnesium',
  'chloride',
  'bromide',
  'iodide',
  'carbonate',
  'bicarbonate',
  'lactate',
  'oxide',
  'hydroxide',
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
  'tromethamine',
  'olamine',
  'er',
  'xr',
  'dr',
  'cr',
  'sr',
  'xl',
  'la',
  'mr',
  'ds',
  'forte',
  'extra',
  'plus',
  'cor',
  'retard',
])

// Note: Keep active electrolyte minerals ('potassium', 'calcium', 'magnesium', 'iron', 'zinc')
// when they appear as primary drugs (not merely salt suffixes on drugs like "warfarin sodium" or "atorvastatin calcium").
export const ELECTROLYTE_PRIMARY_DRUGS = new Set([
  'potassium',
  'calcium',
  'magnesium',
  'iron',
  'ferrous',
  'zinc',
])

/**
 * 220+ Global & Egyptian / Middle-Eastern Trade Names -> Canonical Active Ingredient(s)
 */
export const BRAND_AND_SYNONYM_MAP = {
  // --- Nitrates & Vasodilators ---
  nitrostat: 'nitroglycerin',
  nitromak: 'nitroglycerin',
  nitrolingual: 'nitroglycerin',
  nitroderm: 'nitroglycerin',
  deponit: 'nitroglycerin',
  glyceryl: 'nitroglycerin',
  trinitrate: 'nitroglycerin',
  isordil: 'isosorbide',
  isoket: 'isosorbide',
  monomak: 'isosorbide',
  imdur: 'isosorbide',
  ismo: 'isosorbide',
  efox: 'isosorbide',
  nitrocard: 'nitroglycerin',

  // --- PDE5 Inhibitors ---
  viagra: 'sildenafil',
  erecta: 'sildenafil',
  vega: 'sildenafil',
  caverta: 'sildenafil',
  revatio: 'sildenafil',
  respatio: 'sildenafil',
  cialis: 'tadalafil',
  starkoprex: 'tadalafil',
  diamonda: 'tadalafil',
  adcirca: 'tadalafil',
  levitra: 'vardenafil',
  staxyn: 'vardenafil',
  stendra: 'avanafil',

  // --- Anticoagulants ---
  coumadin: 'warfarin',
  jantoven: 'warfarin',
  marevan: 'warfarin',
  sintrom: 'acenocoumarol',
  xarelto: 'rivaroxaban',
  riva: 'rivaroxaban',
  eliquis: 'apixaban',
  pradaxa: 'dabigatran',
  savaysa: 'edoxaban',
  lixiana: 'edoxaban',
  lovenox: 'enoxaparin',
  clexane: 'enoxaparin',
  fragmin: 'dalteparin',
  arixtra: 'fondaparinux',

  // --- Antiplatelets ---
  plavix: 'clopidogrel',
  clopex: 'clopidogrel',
  iscover: 'clopidogrel',
  brilinta: 'ticagrelor',
  brilique: 'ticagrelor',
  effient: 'prasugrel',
  bayer: 'aspirin',
  ecotrin: 'aspirin',
  bufferin: 'aspirin',
  ascriptin: 'aspirin',
  jusprin: 'aspirin',
  aspocid: 'aspirin',
  rivo: 'aspirin',
  disprin: 'aspirin',
  ezacard: 'aspirin',
  acetylsalicylic: 'aspirin',
  persantine: 'dipyridamole',
  pletal: 'cilostazol',

  // --- NSAIDs & Analgesics ---
  advil: 'ibuprofen',
  motrin: 'ibuprofen',
  brufen: 'ibuprofen',
  nuprin: 'ibuprofen',
  ibuflam: 'ibuprofen',
  marcofen: 'ibuprofen',
  megafen: 'ibuprofen',
  voltaren: 'diclofenac',
  cataflam: 'diclofenac',
  catafast: 'diclofenac',
  diclac: 'diclofenac',
  declophen: 'diclofenac',
  olifen: 'diclofenac',
  rheumafen: 'diclofenac',
  epifenac: 'diclofenac',
  aleve: 'naproxen',
  naprosyn: 'naproxen',
  anaprox: 'naproxen',
  mobic: 'meloxicam',
  mobitil: 'meloxicam',
  anticox: 'meloxicam',
  celebrex: 'celecoxib',
  eurocox: 'celecoxib',
  toradol: 'ketorolac',
  ketolac: 'ketorolac',
  adolac: 'ketorolac',
  indocid: 'indomethacin',
  feldene: 'piroxicam',
  feldoral: 'piroxicam',
  arcoxia: 'etoricoxib',
  ketofan: 'ketoprofen',
  orudis: 'ketoprofen',
  ponstan: 'mefenamic acid',
  tylenol: 'acetaminophen',
  panadol: 'acetaminophen',
  paracetamol: 'acetaminophen',
  abimol: 'acetaminophen',
  adol: 'acetaminophen',
  cetal: 'acetaminophen',
  paramol: 'acetaminophen',
  perfa: 'acetaminophen',
  perfelgan: 'acetaminophen',
  pyral: 'acetaminophen',

  // --- Opioids & Muscle/Pain ---
  tramal: 'tramadol',
  ultram: 'tramadol',
  tamol: 'tramadol',
  amadol: 'tramadol',
  tramax: 'tramadol',
  oxycontin: 'oxycodone',
  roxicodone: 'oxycodone',
  duragesic: 'fentanyl',
  actiq: 'fentanyl',
  sublimaze: 'fentanyl',
  demerol: 'meperidine',
  pethidine: 'meperidine',
  dolophine: 'methadone',
  dilaudid: 'hydromorphone',
  suboxone: 'buprenorphine',
  subutex: 'buprenorphine',
  nucynta: 'tapentadol',
  mst: 'morphine',
  kadian: 'morphine',

  // --- Benzodiazepines, Z-Drugs & Gabapentinoids ---
  xanax: 'alprazolam',
  zolam: 'alprazolam',
  prazolan: 'alprazolam',
  valium: 'diazepam',
  valinil: 'diazepam',
  neuril: 'diazepam',
  ativan: 'lorazepam',
  klonopin: 'clonazepam',
  rivotril: 'clonazepam',
  amotril: 'clonazepam',
  versed: 'midazolam',
  dormicum: 'midazolam',
  lexotanil: 'bromazepam',
  calmepam: 'bromazepam',
  librium: 'chlordiazepoxide',
  ambien: 'zolpidem',
  stilnox: 'zolpidem',
  imovane: 'zopiclone',
  lunesta: 'eszopiclone',
  lyrica: 'pregabalin',
  convugabalin: 'pregabalin',
  neurontin: 'gabapentin',
  conventin: 'gabapentin',
  gaptin: 'gabapentin',

  // --- SSRIs, SNRIs, TCAs, MAOIs & Psychiatric ---
  prozac: 'fluoxetine',
  fluzac: 'fluoxetine',
  philozac: 'fluoxetine',
  zoloft: 'sertraline',
  lustral: 'sertraline',
  moodapex: 'sertraline',
  serlift: 'sertraline',
  cipralex: 'escitalopram',
  lexapro: 'escitalopram',
  estikan: 'escitalopram',
  esram: 'escitalopram',
  celexa: 'citalopram',
  paxil: 'paroxetine',
  seroxat: 'paroxetine',
  luvox: 'fluvoxamine',
  faverin: 'fluvoxamine',
  effexor: 'venlafaxine',
  pristiq: 'desvenlafaxine',
  cymbalta: 'duloxetine',
  elavil: 'amitriptyline',
  tryptizol: 'amitriptyline',
  anafranil: 'clomipramine',
  tofranil: 'imipramine',
  pamelor: 'nortriptyline',
  desyrel: 'trazodone',
  remeron: 'mirtazapine',
  nardil: 'phenelzine',
  parnate: 'tranylcypromine',
  eldepryl: 'selegiline',
  emsam: 'selegiline',
  azilect: 'rasagiline',
  marplan: 'isocarboxazid',
  aurorix: 'moclobemide',
  eskalith: 'lithium',
  lithobid: 'lithium',
  priadel: 'lithium',
  haldol: 'haloperidol',
  seroquel: 'quetiapine',
  risperdal: 'risperidone',
  geodon: 'ziprasidone',
  thorazine: 'chlorpromazine',

  // --- Statins & Fibrates ---
  zocor: 'simvastatin',
  simva: 'simvastatin',
  simvast: 'simvastatin',
  lipitor: 'atorvastatin',
  torvast: 'atorvastatin',
  ator: 'atorvastatin',
  atocor: 'atorvastatin',
  liponorm: 'atorvastatin',
  crestor: 'rosuvastatin',
  rosuvas: 'rosuvastatin',
  cholesdrain: 'rosuvastatin',
  mevacor: 'lovastatin',
  altoprev: 'lovastatin',
  pravachol: 'pravastatin',
  lescol: 'fluvastatin',
  livalo: 'pitavastatin',
  lopid: 'gemfibrozil',
  tricor: 'fenofibrate',

  // --- Antibiotics, Antifungals & Antivirals ---
  amoxil: 'amoxicillin',
  moxatag: 'amoxicillin',
  trimox: 'amoxicillin',
  emox: 'amoxicillin',
  biomox: 'amoxicillin',
  clamoxin: 'amoxicillin',
  principen: 'ampicillin',
  zosyn: 'piperacillin',
  tazocin: 'piperacillin',
  biaxin: 'clarithromycin',
  klacid: 'clarithromycin',
  clarithro: 'clarithromycin',
  zithromax: 'azithromycin',
  zithrokan: 'azithromycin',
  azrolid: 'azithromycin',
  azomycin: 'azithromycin',
  xithrone: 'azithromycin',
  erythrocin: 'erythromycin',
  erythrin: 'erythromycin',
  ilosone: 'erythromycin',
  cipro: 'ciprofloxacin',
  ciprobay: 'ciprofloxacin',
  ciprofar: 'ciprofloxacin',
  ciloxan: 'ciprofloxacin',
  ciprocin: 'ciprofloxacin',
  levaquin: 'levofloxacin',
  tavanic: 'levofloxacin',
  tavacin: 'levofloxacin',
  unilox: 'levofloxacin',
  avelox: 'moxifloxacin',
  avalox: 'moxifloxacin',
  floxin: 'ofloxacin',
  noroxin: 'norfloxacin',
  flagyl: 'metronidazole',
  amrizole: 'metronidazole',
  metrozole: 'metronidazole',
  elyzol: 'metronidazole',
  diflucan: 'fluconazole',
  flucoral: 'fluconazole',
  fungican: 'fluconazole',
  treflucan: 'fluconazole',
  sporanox: 'itraconazole',
  itranox: 'itraconazole',
  nizoral: 'ketoconazole',
  ketozole: 'ketoconazole',
  vfend: 'voriconazole',
  noxafil: 'posaconazole',
  meronem: 'meropenem',
  merrem: 'meropenem',
  primaxin: 'imipenem',
  tienam: 'imipenem',
  invanz: 'ertapenem',
  doribax: 'doripenem',
  zyvox: 'linezolid',
  averolid: 'linezolid',
  vibramycin: 'doxycycline',
  doxycost: 'doxycycline',
  doxydar: 'doxycycline',
  minocin: 'minocycline',
  rifadin: 'rifampin',
  rimactane: 'rifampin',
  paxlovid: 'ritonavir',
  norvir: 'ritonavir',

  // --- Anticonvulsants ---
  tegretol: 'carbamazepine',
  tegretal: 'carbamazepine',
  depakine: 'valproate',
  depakote: 'valproate',
  convulex: 'valproate',
  valproic: 'valproate',
  divalproex: 'valproate',
  dilantin: 'phenytoin',
  epanutin: 'phenytoin',
  luminal: 'phenobarbital',

  // --- Cardiovascular, Antihypertensives & Diuretics ---
  concor: 'bisoprolol',
  bisocard: 'bisoprolol',
  zebeta: 'bisoprolol',
  lopressor: 'metoprolol',
  toprol: 'metoprolol',
  betaloc: 'metoprolol',
  tenormin: 'atenolol',
  athenol: 'atenolol',
  inderal: 'propranolol',
  coreg: 'carvedilol',
  dilatrend: 'carvedilol',
  carvid: 'carvedilol',
  bystolic: 'nebivolol',
  trandate: 'labetalol',
  corgard: 'nadolol',
  lasix: 'furosemide',
  fusix: 'furosemide',
  bumex: 'bumetanide',
  demadex: 'torsemide',
  aldactone: 'spironolactone',
  spectone: 'spironolactone',
  inspra: 'eplerenone',
  midamor: 'amiloride',
  dyrenium: 'triamterene',
  lanoxin: 'digoxin',
  cardoxin: 'digoxin',
  cordarone: 'amiodarone',
  pacerone: 'amiodarone',
  multaq: 'dronedarone',
  betapace: 'sotalol',
  tambocor: 'flecainide',
  isoptin: 'verapamil',
  calan: 'verapamil',
  verelan: 'verapamil',
  cardizem: 'diltiazem',
  altiazem: 'diltiazem',
  tiazac: 'diltiazem',
  norvasc: 'amlodipine',
  alkapress: 'amlodipine',
  zestril: 'lisinopril',
  prinivil: 'lisinopril',
  sinopril: 'lisinopril',
  vasotec: 'enalapril',
  ezapril: 'enalapril',
  capoten: 'captopril',
  capotril: 'captopril',
  altace: 'ramipril',
  tritace: 'ramipril',
  coversyl: 'perindopril',
  lotensin: 'benazepril',
  accupril: 'quinapril',
  cozaar: 'losartan',
  kanzar: 'losartan',
  losar: 'losartan',
  diovan: 'valsartan',
  tareg: 'valsartan',
  atacand: 'candesartan',
  blopress: 'candesartan',
  micardis: 'telmisartan',
  avapro: 'irbesartan',
  benicar: 'olmesartan',
  edarbi: 'azilsartan',
  tekturna: 'aliskiren',
  rasilez: 'aliskiren',
  catapres: 'clonidine',
  aldomet: 'methyldopa',
  microzide: 'hydrochlorothiazide',
  hydrodiuril: 'hydrochlorothiazide',
  esidrex: 'hydrochlorothiazide',
  hctz: 'hydrochlorothiazide',
  thalitone: 'chlorthalidone',
  lozol: 'indapamide',
  natrilix: 'indapamide',
  zaroxolyn: 'metolazone',
  klor: 'potassium',
  slowk: 'potassium',
  potassium: 'potassium',

  // --- GI, PPIs, Antiemetics ---
  prilosec: 'omeprazole',
  losec: 'omeprazole',
  omepral: 'omeprazole',
  gasec: 'omeprazole',
  risek: 'omeprazole',
  nexium: 'esomeprazole',
  nexicure: 'esomeprazole',
  protonix: 'pantoprazole',
  controloc: 'pantoprazole',
  pantazol: 'pantoprazole',
  zurcal: 'pantoprazole',
  prevacid: 'lansoprazole',
  lanzor: 'lansoprazole',
  aciphex: 'rabeprazole',
  dexilant: 'dexlansoprazole',
  pepcid: 'famotidine',
  antodine: 'famotidine',
  famotin: 'famotidine',
  zofran: 'ondansetron',
  danset: 'ondansetron',
  motilium: 'domperidone',
  carafate: 'sucralfate',

  // --- Diabetes / Hypoglycemics ---
  glucophage: 'metformin',
  cidophage: 'metformin',
  fortamet: 'metformin',
  glumetza: 'metformin',
  riomet: 'metformin',
  amaryl: 'glimepiride',
  glimaryl: 'glimepiride',
  dolcyl: 'glimepiride',
  daonil: 'glyburide',
  diabeta: 'glyburide',
  micronase: 'glyburide',
  glibenclamide: 'glyburide',
  diamicron: 'gliclazide',
  glucotrol: 'glipizide',
  lantus: 'insulin',
  novorapid: 'insulin',
  humalog: 'insulin',
  apidra: 'insulin',
  mixtard: 'insulin',
  levemir: 'insulin',
  tresiba: 'insulin',
  prandin: 'repaglinide',

  // --- Migraine, Rheumatology, Respiratory, Hormones, Supplements ---
  imitrex: 'sumatriptan',
  imigran: 'sumatriptan',
  maxalt: 'rizatriptan',
  zomig: 'zolmitriptan',
  cafergot: 'ergotamine',
  migranil: 'dihydroergotamine',
  rheumatrex: 'methotrexate',
  trexall: 'methotrexate',
  benemid: 'probenecid',
  theochron: 'theophylline',
  phyllocontin: 'theophylline',
  quibron: 'theophylline',
  aminophylline: 'theophylline',
  deltasone: 'prednisone',
  hostacortin: 'prednisone',
  solupred: 'prednisolone',
  decadron: 'dexamethasone',
  dexazone: 'dexamethasone',
  medrol: 'methylprednisolone',
  solumedrol: 'methylprednisolone',
  cortef: 'hydrocortisone',
  solucortef: 'hydrocortisone',
  synthroid: 'levothyroxine',
  eltroxin: 'levothyroxine',
  euthyrox: 'levothyroxine',
  plaquenil: 'hydroxychloroquine',
  caltrate: 'calcium',
  osteo: 'calcium',
  feroglobin: 'iron',
  fumarate: 'iron',
  maalox: 'magnesium',
  gaviscon: 'aluminum',
  mylanta: 'magnesium',
  pepto: 'bismuth',
  tussivan: 'dextromethorphan',
  hypericum: 'st john wort',
}

// Backwards-compatible alias
export const BRAND_TO_GENERIC_MAP = BRAND_AND_SYNONYM_MAP

/**
 * Combination Brand Drugs -> Expanded Array of Active Ingredients
 */
export const MULTI_INGREDIENT_BRAND_MAP = {
  augmentin: ['amoxicillin', 'clavulanate'],
  hibiotic: ['amoxicillin', 'clavulanate'],
  curam: ['amoxicillin', 'clavulanate'],
  megamox: ['amoxicillin', 'clavulanate'],
  septrin: ['trimethoprim', 'sulfamethoxazole'],
  sutrim: ['trimethoprim', 'sulfamethoxazole'],
  bactrim: ['trimethoprim', 'sulfamethoxazole'],
  septra: ['trimethoprim', 'sulfamethoxazole'],
  cotrimoxazole: ['trimethoprim', 'sulfamethoxazole'],
  percocet: ['oxycodone', 'acetaminophen'],
  vicodin: ['hydrocodone', 'acetaminophen'],
  norco: ['hydrocodone', 'acetaminophen'],
  ultracet: ['tramadol', 'acetaminophen'],
  aggrenox: ['aspirin', 'dipyridamole'],
  zestoretic: ['lisinopril', 'hydrochlorothiazide'],
  codiovan: ['valsartan', 'hydrochlorothiazide'],
  cozaarcomp: ['losartan', 'hydrochlorothiazide'],
  hyzaar: ['losartan', 'hydrochlorothiazide'],
  exforge: ['amlodipine', 'valsartan'],
  janumet: ['sitagliptin', 'metformin'],
  glucovance: ['glyburide', 'metformin'],
  amarylm: ['glimepiride', 'metformin'],
  moduretic: ['amiloride', 'hydrochlorothiazide'],
  aldactazide: ['spironolactone', 'hydrochlorothiazide'],
  paxlovid: ['nirmatrelvir', 'ritonavir'],
}

/**
 * Pharmacological Class Dictionary (Layer 2 Engine)
 */
export const DRUG_CLASSES = {
  NITRATES: new Set([
    'nitroglycerin',
    'isosorbide',
    'amyl nitrite',
    'sodium nitroprusside',
  ]),
  PDE5_INHIBITORS: new Set([
    'sildenafil',
    'tadalafil',
    'vardenafil',
    'avanafil',
  ]),
  ANTICOAGULANTS_VK_DOAC: new Set([
    'warfarin',
    'acenocoumarol',
    'rivaroxaban',
    'apixaban',
    'dabigatran',
    'edoxaban',
    'heparin',
    'enoxaparin',
    'dalteparin',
    'fondaparinux',
  ]),
  WARFARIN: new Set(['warfarin', 'acenocoumarol']),
  DOACS: new Set(['rivaroxaban', 'apixaban', 'dabigatran', 'edoxaban']),
  ANTIPLATELETS: new Set([
    'aspirin',
    'clopidogrel',
    'ticagrelor',
    'prasugrel',
    'dipyridamole',
    'cilostazol',
    'ticlopidine',
  ]),
  P2Y12_INHIBITORS: new Set(['clopidogrel', 'ticagrelor', 'prasugrel', 'ticlopidine']),
  NSAIDS: new Set([
    'ibuprofen',
    'diclofenac',
    'naproxen',
    'meloxicam',
    'celecoxib',
    'ketorolac',
    'indomethacin',
    'piroxicam',
    'etoricoxib',
    'ketoprofen',
    'flurbiprofen',
    'nabumetone',
    'tenoxicam',
    'lornoxicam',
  ]),
  ACETAMINOPHEN: new Set(['acetaminophen', 'paracetamol']),
  MACROLIDES: new Set(['clarithromycin', 'erythromycin', 'azithromycin', 'telithromycin']),
  AZOLE_ANTIFUNGALS: new Set([
    'itraconazole',
    'ketoconazole',
    'voriconazole',
    'fluconazole',
    'posaconazole',
  ]),
  CYP3A4_STRONG_INHIBITORS: new Set([
    'clarithromycin',
    'erythromycin',
    'itraconazole',
    'ketoconazole',
    'voriconazole',
    'posaconazole',
    'ritonavir',
    'cobicistat',
    'verapamil',
    'diltiazem',
    'amiodarone',
    'gemfibrozil',
  ]),
  PGP_CYP3A4_MODULATORS: new Set([
    'ketoconazole',
    'itraconazole',
    'voriconazole',
    'clarithromycin',
    'erythromycin',
    'verapamil',
    'diltiazem',
    'amiodarone',
    'ritonavir',
    'rifampin',
    'rifabutin',
    'carbamazepine',
    'phenytoin',
    'phenobarbital',
    'st john wort',
  ]),
  STATINS_CYP3A4: new Set(['simvastatin', 'lovastatin', 'atorvastatin']),
  STATINS_ALL: new Set([
    'simvastatin',
    'lovastatin',
    'atorvastatin',
    'rosuvastatin',
    'pravastatin',
    'fluvastatin',
    'pitavastatin',
  ]),
  SSRIs_SNRIs: new Set([
    'fluoxetine',
    'sertraline',
    'escitalopram',
    'citalopram',
    'paroxetine',
    'fluvoxamine',
    'venlafaxine',
    'desvenlafaxine',
    'duloxetine',
  ]),
  TCAS: new Set(['amitriptyline', 'clomipramine', 'imipramine', 'nortriptyline']),
  MAOIs: new Set([
    'phenelzine',
    'tranylcypromine',
    'selegiline',
    'rasagiline',
    'isocarboxazid',
    'linezolid',
    'methylene blue',
    'moclobemide',
  ]),
  SEROTONERGIC_OPIOIDS: new Set([
    'tramadol',
    'meperidine',
    'fentanyl',
    'methadone',
    'dextromethorphan',
    'tapentadol',
  ]),
  TRIPTANS: new Set(['sumatriptan', 'rizatriptan', 'zolmitriptan', 'eletriptan', 'naratriptan']),
  OPIOIDS: new Set([
    'morphine',
    'oxycodone',
    'fentanyl',
    'hydrocodone',
    'codeine',
    'tramadol',
    'meperidine',
    'methadone',
    'hydromorphone',
    'buprenorphine',
    'tapentadol',
  ]),
  BENZODIAZEPINES: new Set([
    'alprazolam',
    'diazepam',
    'lorazepam',
    'clonazepam',
    'midazolam',
    'bromazepam',
    'temazepam',
    'oxazepam',
    'chlordiazepoxide',
  ]),
  CNS_SLEEP_GABAPENTINOIDS: new Set([
    'pregabalin',
    'gabapentin',
    'zolpidem',
    'zopiclone',
    'eszopiclone',
  ]),
  ACE_INHIBITORS: new Set([
    'lisinopril',
    'enalapril',
    'captopril',
    'ramipril',
    'perindopril',
    'benazepril',
    'quinapril',
    'fosinopril',
    'trandolapril',
  ]),
  ARBS: new Set([
    'losartan',
    'valsartan',
    'candesartan',
    'telmisartan',
    'irbesartan',
    'olmesartan',
    'azilsartan',
  ]),
  RENIN_INHIBITORS: new Set(['aliskiren']),
  POTASSIUM_SPARING_DIURETICS: new Set([
    'spironolactone',
    'eplerenone',
    'amiloride',
    'triamterene',
  ]),
  POTASSIUM_SUPPLEMENTS: new Set(['potassium']),
  LOOP_DIURETICS: new Set(['furosemide', 'bumetanide', 'torsemide', 'ethacrynic']),
  THIAZIDE_DIURETICS: new Set([
    'hydrochlorothiazide',
    'chlorthalidone',
    'indapamide',
    'metolazone',
  ]),
  CARDIAC_GLYCOSIDES_DIGOXIN: new Set(['digoxin', 'digitoxin']),
  ANTIARRHYTHMICS_AMIODARONE: new Set([
    'amiodarone',
    'dronedarone',
    'sotalol',
    'quinidine',
    'procainamide',
    'flecainide',
  ]),
  CALCIUM_CHANNEL_BLOCKERS_NON_DHP: new Set(['verapamil', 'diltiazem']),
  BETA_BLOCKERS: new Set([
    'metoprolol',
    'atenolol',
    'propranolol',
    'bisoprolol',
    'carvedilol',
    'nebivolol',
    'labetalol',
    'nadolol',
    'esmolol',
    'sotalol',
  ]),
  NON_SELECTIVE_BETA_BLOCKERS: new Set(['propranolol', 'nadolol', 'carvedilol', 'labetalol']),
  FLUOROQUINOLONES: new Set([
    'ciprofloxacin',
    'levofloxacin',
    'moxifloxacin',
    'ofloxacin',
    'norfloxacin',
    'gemifloxacin',
  ]),
  QT_PROLONGING_AGENTS: new Set([
    'amiodarone',
    'sotalol',
    'quinidine',
    'procainamide',
    'flecainide',
    'haloperidol',
    'quetiapine',
    'risperidone',
    'ziprasidone',
    'chlorpromazine',
    'ondansetron',
    'domperidone',
    'escitalopram',
    'citalopram',
    'fluconazole',
    'voriconazole',
    'ciprofloxacin',
    'levofloxacin',
    'moxifloxacin',
    'azithromycin',
    'clarithromycin',
    'erythromycin',
    'hydroxychloroquine',
    'chloroquine',
    'methadone',
    'amitriptyline',
    'trazodone',
  ]),
  METHOTREXATE: new Set(['methotrexate']),
  SULFONAMIDES_TMP_SMX: new Set([
    'trimethoprim',
    'sulfamethoxazole',
    'cotrimoxazole',
  ]),
  PENICILLINS: new Set([
    'amoxicillin',
    'ampicillin',
    'piperacillin',
    'penicillin',
    'cloxacillin',
    'flucloxacillin',
    'oxacillin',
  ]),
  CEPHALOSPORINS: new Set([
    'ceftriaxone',
    'cefixime',
    'cefuroxime',
    'cephalexin',
    'cefazolin',
    'cefotaxime',
    'cefepime',
  ]),
  LITHIUM: new Set(['lithium']),
  CARBAPENEMS: new Set(['meropenem', 'imipenem', 'ertapenem', 'doripenem']),
  VALPROATE: new Set(['valproate']),
  PPIs: new Set([
    'omeprazole',
    'esomeprazole',
    'pantoprazole',
    'lansoprazole',
    'rabeprazole',
    'dexlansoprazole',
  ]),
  CYP2C19_INHIBITORS: new Set(['omeprazole', 'esomeprazole', 'fluoxetine', 'fluvoxamine']),
  THEOPHYLLINE: new Set(['theophylline', 'aminophylline']),
  CORTICOSTEROIDS: new Set([
    'prednisone',
    'prednisolone',
    'dexamethasone',
    'methylprednisolone',
    'hydrocortisone',
    'betamethasone',
    'triamcinolone',
  ]),
  ORAL_HYPOGLYCEMICS: new Set([
    'glimepiride',
    'glyburide',
    'gliclazide',
    'glipizide',
    'tolbutamide',
    'metformin',
    'insulin',
    'repaglinide',
    'sitagliptin',
  ]),
  SULFONYLUREAS_INSULIN: new Set([
    'glimepiride',
    'glyburide',
    'gliclazide',
    'glipizide',
    'tolbutamide',
    'insulin',
    'repaglinide',
  ]),
  TETRACYCLINES: new Set(['doxycycline', 'tetracycline', 'minocycline']),
  MULTIVALENT_CATIONS: new Set([
    'calcium',
    'iron',
    'ferrous',
    'magnesium',
    'aluminum',
    'sucralfate',
    'zinc',
    'bismuth',
  ]),
  ERGOT_ALKALOIDS: new Set(['ergotamine', 'dihydroergotamine', 'methylergonovine']),
  AMINOGLYCOSIDES_OTOTOXIC: new Set([
    'amikacin',
    'gentamicin',
    'tobramycin',
    'streptomycin',
    'neomycin',
    'vancomycin',
  ]),
}

/**
 * Maps live NIH RxClass names (returned from /rxclass/class/byRxcui.json)
 * into internal pharmacological classes so even brand-new / unindexed drugs are automatically classified.
 */
export const RXCLASS_PATTERN_TO_CLASS = [
  { pattern: /\bnitrate/i, className: 'NITRATES' },
  { pattern: /phosphodiesterase\s*5|pde5/i, className: 'PDE5_INHIBITORS' },
  { pattern: /vitamin\s*k\s*antagonist|direct\s*factor\s*xa|direct\s*thrombin|anticoagulant/i, className: 'ANTICOAGULANTS_VK_DOAC' },
  { pattern: /direct\s*factor\s*xa|direct\s*thrombin/i, className: 'DOACS' },
  { pattern: /platelet\s*aggregation\s*inhibitor|p2y12/i, className: 'ANTIPLATELETS' },
  { pattern: /nonsteroidal\s*anti-?inflammatory|cox-?2\s*inhibitor|nsaid/i, className: 'NSAIDS' },
  { pattern: /macrolide/i, className: 'MACROLIDES' },
  { pattern: /azole\s*antifungal|triazole|imidazole\s*antifungal/i, className: 'AZOLE_ANTIFUNGALS' },
  { pattern: /hmg-?coa\s*reductase/i, className: 'STATINS_ALL' },
  { pattern: /serotonin\s*reuptake|ssri|snri|norepinephrine\s*reuptake/i, className: 'SSRIs_SNRIs' },
  { pattern: /tricyclic\s*antidepressant/i, className: 'TCAS' },
  { pattern: /monoamine\s*oxidase\s*inhibitor|maoi/i, className: 'MAOIs' },
  { pattern: /serotonin\s*5-ht1|triptan/i, className: 'TRIPTANS' },
  { pattern: /opioid/i, className: 'OPIOIDS' },
  { pattern: /benzodiazepine/i, className: 'BENZODIAZEPINES' },
  { pattern: /angiotensin\s*converting\s*enzyme|ace\s*inhibitor/i, className: 'ACE_INHIBITORS' },
  { pattern: /angiotensin\s*(ii\s*)?receptor\s*(blocker|antagonist)/i, className: 'ARBS' },
  { pattern: /potassium[- ]sparing|aldosterone\s*antagonist/i, className: 'POTASSIUM_SPARING_DIURETICS' },
  { pattern: /loop\s*diuretic/i, className: 'LOOP_DIURETICS' },
  { pattern: /thiazide/i, className: 'THIAZIDE_DIURETICS' },
  { pattern: /cardiac\s*glycoside|digitalis/i, className: 'CARDIAC_GLYCOSIDES_DIGOXIN' },
  { pattern: /beta-?adrenergic\s*blocker|beta[- ]blocking/i, className: 'BETA_BLOCKERS' },
  { pattern: /fluoroquinolone|quinolone/i, className: 'FLUOROQUINOLONES' },
  { pattern: /carbapenem/i, className: 'CARBAPENEMS' },
  { pattern: /proton\s*pump\s*inhibitor/i, className: 'PPIs' },
  { pattern: /corticosteroid|glucocorticoid/i, className: 'CORTICOSTEROIDS' },
  { pattern: /aminoglycoside/i, className: 'AMINOGLYCOSIDES_OTOTOXIC' },
  { pattern: /sulfonylurea/i, className: 'SULFONYLUREAS_INSULIN' },
  { pattern: /tetracycline/i, className: 'TETRACYCLINES' },
  { pattern: /penicillin/i, className: 'PENICILLINS' },
  { pattern: /ergot\s*alkaloid/i, className: 'ERGOT_ALKALOIDS' },
]

/**
 * Helper to check if a resolved drug profile matches a rule selector.
 * A selector can be a CLASS name (in DRUG_CLASSES or matched via RxClass) or a specific drug string.
 */
function matchesSelector(drugProfile, selector) {
  if (!drugProfile || !selector) return false
  if (selector.startsWith('CLASS:')) {
    const classKey = selector.slice(6)
    return drugProfile.classes.has(classKey)
  }
  if (selector.startsWith('DRUG:')) {
    const drugName = selector.slice(5)
    return drugProfile.tokens.has(drugName)
  }
  return drugProfile.classes.has(selector) || drugProfile.tokens.has(selector)
}

/**
 * 23 Textbook Lethal Class-to-Class & Drug-to-Drug Interaction Rules (Layer 2)
 * Evaluated cleanly on (profileA, profileB).
 */
export const CLASS_DDI_MATRIX = [
  // 1. Nitrates + PDE5 Inhibitors (100% LETHAL)
  {
    id: 'RULE_01_NITRATE_PDE5',
    sideA: ['NITRATES'],
    sideB: ['PDE5_INHIBITORS'],
    severity: 'Red',
    riskPercentage: 100,
    riskLabel: 'LETHAL RISK (100%) — STRICTLY CONTRAINDICATED',
    type: 'Contraindicated Pharmacodynamic Synergy',
    title: 'Fatal Hypotension & Cardiovascular Collapse (Nitrates + PDE5 Inhibitor)',
    description:
      'Co-administration of organic Nitrates (nitric oxide donors activating guanylyl cyclase) with PDE5 Inhibitors (blocking cGMP degradation) produces massive synergistic cGMP accumulation, refractory systemic vasodilation, profound hypotension, myocardial infarction, and sudden death.',
    clinicalAdvice:
      '100% Contraindicated (Hard Lock). Wait at least 24 hours after Sildenafil/Vardenafil or 48 hours after Tadalafil before administering any nitrate.',
  },

  // 2. CYP3A4 Statins + Strong CYP3A4 Inhibitors / Gemfibrozil
  {
    id: 'RULE_02_STATIN_CYP3A4',
    sideA: ['STATINS_CYP3A4'],
    sideB: ['CYP3A4_STRONG_INHIBITORS'],
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL RISK (95%) — CONTRAINDICATED',
    type: 'CYP3A4 / OATP1B1 Metabolic Toxicity',
    title: 'Severe Rhabdomyolysis & Acute Kidney Injury Risk',
    description:
      'Strong CYP3A4 / OATP1B1 inhibition markedly increases systemic exposure (up to 10-fold AUC surge) of Simvastatin, Lovastatin, or Atorvastatin, precipitating fatal skeletal muscle necrosis (rhabdomyolysis), myoglobinuria, and acute renal failure.',
    clinicalAdvice:
      'Prescription blocked. Substitute with a non-CYP3A4 statin (Pravastatin or Rosuvastatin without Gemfibrozil) or switch antibiotic to Azithromycin (verify QT).',
  },
  {
    id: 'RULE_02B_ROSUVASTATIN_GEMFIBROZIL',
    sideA: ['STATINS_ALL'],
    sideB: ['DRUG:gemfibrozil'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — MAJOR',
    type: 'OATP1B1 / Glucuronidation Inhibition',
    title: 'Severe Myopathy & Rhabdomyolysis (Statin + Gemfibrozil)',
    description:
      'Gemfibrozil inhibits OATP1B1 hepatic uptake and statin glucuronidation, sharply elevating plasma statin toxicity and rhabdomyolysis risk.',
    clinicalAdvice:
      'Prescription blocked. Avoid Gemfibrozil with statins; use Fenofibrate if fibrate co-therapy is required.',
  },

  // 3. MAOIs + SSRIs / SNRIs / TCAs / Serotonergic Opioids (100% LETHAL)
  {
    id: 'RULE_03_MAOI_SEROTONERGIC',
    sideA: ['MAOIs'],
    sideB: ['SSRIs_SNRIs', 'TCAS', 'SEROTONERGIC_OPIOIDS', 'TRIPTANS'],
    severity: 'Red',
    riskPercentage: 100,
    riskLabel: 'LETHAL RISK (100%) — STRICTLY CONTRAINDICATED',
    type: 'Fatal Serotonin Syndrome / Hypertensive Crisis',
    title: 'Life-Threatening Serotonin Toxicity & Autonomic Storm (MAOI Interaction)',
    description:
      'Concurrent Monoamine Oxidase Inhibition (including Linezolid / Selegiline / Phenelzine) with serotonergic antidepressants, TCAs, Triptans, Tramadol, Meperidine, or Dextromethorphan causes catastrophic synaptic serotonin accumulation: hyperthermia (>40°C), clonus, seizures, coma, and hypertensive crisis.',
    clinicalAdvice:
      '100% Contraindicated (Hard Lock). A mandatory 14-day washout (5 weeks after Fluoxetine) is required.',
  },

  // 4. SSRIs / SNRIs + Tramadol / Fentanyl / Triptans / St. John's Wort / Lithium
  {
    id: 'RULE_04_SSRI_SEROTONERGICS',
    sideA: ['SSRIs_SNRIs', 'TCAS'],
    sideB: ['SEROTONERGIC_OPIOIDS', 'TRIPTANS', 'DRUG:st john wort', 'LITHIUM'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — MAJOR',
    type: 'Serotonin Syndrome & Seizure Threshold Reduction',
    title: 'High Risk of Serotonin Syndrome & Neurotoxicity',
    description:
      'Dual serotonergic blockade (e.g., SSRI/SNRI combined with Tramadol, Fentanyl, Triptans, St. John’s Wort, or Lithium) triggers neuromuscular rigidity, hyperreflexia, agitation, autonomic instability, and lowers the seizure threshold (especially with CYP2D6-dependent Tramadol).',
    clinicalAdvice:
      'Prescription blocked. Select a non-serotonergic analgesic (e.g., Acetaminophen) or avoid concomitant serotonergic agents.',
  },

  // 5. Anticoagulants + NSAIDs / Antiplatelets
  {
    id: 'RULE_05_ANTICOAGULANT_BLEEDING',
    sideA: ['ANTICOAGULANTS_VK_DOAC'],
    sideB: ['NSAIDS', 'ANTIPLATELETS'],
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL RISK (95%) — MAJOR HEMORRHAGE',
    type: 'Synergistic Anticoagulant / Antiplatelet Bleeding',
    title: 'Life-Threatening Gastrointestinal & Intracranial Hemorrhage Risk',
    description:
      'Combining an Anticoagulant (Warfarin, Rivaroxaban, Apixaban, Dabigatran, Enoxaparin, Heparin) with NSAIDs or Antiplatelets (Aspirin, Clopidogrel, Ticagrelor) compounds coagulation cascade blockade with platelet inhibition and gastric mucosal erosion, creating a 4–6x surge in fatal hemorrhage.',
    clinicalAdvice:
      'Prescription blocked. Substitute NSAID with Acetaminophen (within hepatic limits) or verify cardiology specialist triple-therapy protocol.',
  },
  {
    id: 'RULE_05B_P2Y12_NSAID',
    sideA: ['P2Y12_INHIBITORS'],
    sideB: ['NSAIDS'],
    severity: 'Red',
    riskPercentage: 88,
    riskLabel: 'HIGH CLINICAL RISK (88%) — MAJOR',
    type: 'Additive Antiplatelet & Mucosal Bleed Hazard',
    title: 'Major Gastrointestinal Hemorrhage Risk (Antiplatelet + NSAID)',
    description:
      'Combining potent P2Y12 antiplatelets (Clopidogrel, Ticagrelor, Prasugrel) with systemic NSAIDs markedly elevates upper GI ulceration and severe bleeding.',
    clinicalAdvice:
      'Prescription blocked. Use non-NSAID analgesia or require PPI prophylaxis under specialist guidance.',
  },

  // 6. Warfarin + CYP2C9 Inhibitors / Potentiators
  {
    id: 'RULE_06_WARFARIN_POTENTIATORS',
    sideA: ['WARFARIN'],
    sideB: [
      'DRUG:metronidazole',
      'DRUG:trimethoprim',
      'DRUG:sulfamethoxazole',
      'DRUG:fluconazole',
      'DRUG:amiodarone',
      'DRUG:ciprofloxacin',
      'DRUG:clarithromycin',
      'DRUG:erythromycin',
      'DRUG:levothyroxine',
      'DRUG:rifampin',
      'DRUG:carbamazepine',
    ],
    severity: 'Red',
    riskPercentage: 94,
    riskLabel: 'CRITICAL RISK (94%) — MAJOR INR TOXICITY',
    type: 'CYP2C9 Anticoagulant Metabolic Interaction',
    title: 'Severe INR Surge & Fatal Bleeding Hazard (Warfarin Interaction)',
    description:
      'Potent inhibition of hepatic CYP2C9/CYP3A4 (by Metronidazole, TMP-SMX, Fluconazole, Amiodarone, Macrolides, Ciprofloxacin) or Vitamin K catabolism amplification (Levothyroxine) causes dangerous INR spikes (>5.0) and spontaneous bleeding; conversely Rifampin/Carbamazepine cause lethal clot failure.',
    clinicalAdvice:
      'Prescription blocked. Choose a non-interacting antibiotic/antifungal or initiate daily INR monitoring with empiric 25–50% Warfarin reduction.',
  },

  // 7. DOACs + Strong P-gp / CYP3A4 Modulators
  {
    id: 'RULE_07_DOAC_MODULATORS',
    sideA: ['DOACS'],
    sideB: ['PGP_CYP3A4_MODULATORS'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — MAJOR',
    type: 'P-gp / CYP3A4 Anticoagulant Exposure Shift',
    title: 'Severe DOAC Bleeding or Thrombotic Failure Risk',
    description:
      'Combined P-gp and CYP3A4 inhibitors (Ketoconazole, Itraconazole, Clarithromycin, Verapamil, Amiodarone, Ritonavir) spike DOAC plasma levels causing major hemorrhage, while strong inducers (Rifampin, Carbamazepine, Phenytoin) abolish anticoagulation leading to stroke/PE.',
    clinicalAdvice:
      'Prescription blocked. Avoid strong P-gp/CYP3A4 inhibitors or inducers alongside Rivaroxaban, Apixaban, Dabigatran, or Edoxaban.',
  },

  // 8. Digoxin + Toxicity Precipitants
  {
    id: 'RULE_08_DIGOXIN_TOXICITY',
    sideA: ['CARDIAC_GLYCOSIDES_DIGOXIN'],
    sideB: [
      'DRUG:amiodarone',
      'DRUG:verapamil',
      'DRUG:diltiazem',
      'DRUG:clarithromycin',
      'DRUG:erythromycin',
      'DRUG:spironolactone',
      'LOOP_DIURETICS',
    ],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — MAJOR TOXICITY',
    type: 'Narrow Therapeutic Index P-gp / Electrolyte Toxicity',
    title: 'Fatal Digoxin Toxicity & Ventricular Arrhythmias Risk',
    description:
      'P-gp inhibition (Amiodarone, Verapamil, Diltiazem, Clarithromycin) or renal clearance blockade (Spironolactone) doubles serum Digoxin levels, while Loop Diuretics induce hypokalemia that sensitizes Na+/K+-ATPase pumps—triggering complete heart block and bidirectional ventricular tachycardia.',
    clinicalAdvice:
      'Prescription blocked. Reduce Digoxin dose by 50%, monitor serum Digoxin (<1.0 ng/mL) and electrolytes, or choose an alternative.',
  },

  // 9. ACEi / ARBs + Potassium-Sparing Diuretics / Potassium / Trimethoprim
  {
    id: 'RULE_09_RAAS_HYPERKALEMIA',
    sideA: ['ACE_INHIBITORS', 'ARBS'],
    sideB: ['POTASSIUM_SPARING_DIURETICS', 'POTASSIUM_SUPPLEMENTS', 'DRUG:trimethoprim'],
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL RISK (95%) — LETHAL HYPERKALEMIA',
    type: 'Synergistic Aldosterone / ENaC Potassium Retention',
    title: 'Life-Threatening Hyperkalemia & Cardiac Arrest Risk',
    description:
      'ACE inhibitors and ARBs suppress aldosterone-mediated renal potassium excretion; combining them with Potassium-Sparing Diuretics (Spironolactone, Eplerenone, Amiloride), Potassium supplements, or Trimethoprim (which blocks ENaC channels) precipitates severe hyperkalemia (>6.0 mEq/L) and ventricular fibrillation.',
    clinicalAdvice:
      'Prescription blocked. Discontinue exogenous potassium or select a non-trimethoprim antibiotic; intensive serum K+ monitoring is mandatory if dual therapy is specialist-ordered.',
  },
  {
    id: 'RULE_09B_KSPARING_POTASSIUM',
    sideA: ['POTASSIUM_SPARING_DIURETICS'],
    sideB: ['POTASSIUM_SUPPLEMENTS', 'DRUG:trimethoprim'],
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL RISK (95%) — LETHAL HYPERKALEMIA',
    type: 'Synergistic Renal Potassium Retention',
    title: 'Life-Threatening Hyperkalemia (K-Sparing Diuretic + Potassium / Trimethoprim)',
    description:
      'Combining Potassium-Sparing Diuretics (Spironolactone, Eplerenone, Amiloride, Triamterene) with Potassium supplements or Trimethoprim blocks collecting duct potassium excretion while adding potassium load, causing fatal hyperkalemia and cardiac arrest.',
    clinicalAdvice:
      'Prescription blocked. Discontinue potassium supplementation or select an alternative antibiotic; monitor serum K+ closely.',
  },

  // 10. Dual / Triple RAAS Blockade (ACEi + ARB + Aliskiren)
  {
    id: 'RULE_10_DUAL_RAAS_BLOCKADE',
    sideA: ['ACE_INHIBITORS'],
    sideB: ['ARBS', 'RENIN_INHIBITORS'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — CONTRAINDICATED',
    type: 'Dual RAAS Blockade',
    title: 'Acute Renal Failure, Hyperkalemia & Refractory Hypotension (Dual RAAS Blockade)',
    description:
      'Combining an ACE Inhibitor with an ARB or Aliskiren causes excessive efferent glomerular arteriole dilation, acute kidney injury, hyperkalemia, and severe hypotension without cardiovascular mortality benefit (ONTARGET / ALTITUDE trials).',
    clinicalAdvice:
      'Prescription blocked. Select a single RAAS agent (either an ACE inhibitor OR an ARB).',
  },
  {
    id: 'RULE_10B_ARB_ALISKIREN',
    sideA: ['ARBS'],
    sideB: ['RENIN_INHIBITORS'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — CONTRAINDICATED',
    type: 'Dual RAAS Blockade',
    title: 'Contraindicated Dual RAAS Blockade (ARB + Aliskiren)',
    description:
      'Concurrent ARB and Aliskiren therapy markedly elevates risks of acute kidney failure, hyperkalemia, and stroke.',
    clinicalAdvice: 'Prescription blocked. Do not co-administer Aliskiren with ARBs or ACE inhibitors.',
  },

  // 11. Methotrexate + Renal Clearance Blockers
  {
    id: 'RULE_11_METHOTREXATE_TOXICITY',
    sideA: ['METHOTREXATE'],
    sideB: [
      'NSAIDS',
      'DRUG:aspirin',
      'SULFONAMIDES_TMP_SMX',
      'PENICILLINS',
      'DRUG:probenecid',
      'PPIs',
    ],
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL RISK (95%) — FATAL TOXICITY',
    type: 'OAT1/OAT3 Clearance Inhibition & Synergistic Antifolate Toxicity',
    title: 'Fatal Pancytopenia, Bone Marrow Suppression & Nephrotoxicity (Methotrexate)',
    description:
      'NSAIDs, Penicillins, Probenecid, and PPIs competitively block renal tubular OAT1/OAT3 secretion of Methotrexate, while TMP-SMX compounds dihydrofolate reductase inhibition—resulting in catastrophic myelosuppression, mucositis, hepatotoxicity, and acute kidney injury.',
    clinicalAdvice:
      'Prescription strictly blocked. Avoid co-administration and consult oncology/rheumatology before prescribing.',
  },

  // 12. Opioids + Benzodiazepines / Gabapentinoids / Z-drugs (FDA BLACK BOX)
  {
    id: 'RULE_12_OPIOID_CNS_DEPRESSION',
    sideA: ['OPIOIDS'],
    sideB: ['BENZODIAZEPINES', 'CNS_SLEEP_GABAPENTINOIDS'],
    severity: 'Red',
    riskPercentage: 98,
    riskLabel: 'CRITICAL BLACK BOX RISK (98%) — FATAL OVERDOSE',
    type: 'FDA Black Box Respiratory Depression',
    title: 'FDA Black Box Warning: Profound Sedation, Respiratory Depression & Coma',
    description:
      'Concurrent Opioid and Benzodiazepine (or Gabapentinoid/Z-drug) therapy produces synergistic medullary respiratory center suppression, leading to fatal hypoxia, respiratory arrest, and coma.',
    clinicalAdvice:
      'Prescription blocked under FDA Black Box Safety Lock. Utilize non-opioid / non-benzodiazepine alternatives and ensure Naloxone rescue availability.',
  },

  // 13. QT-Prolonging Combinations
  {
    id: 'RULE_13_QT_PROLONGATION',
    sideA: ['QT_PROLONGING_AGENTS'],
    sideB: ['QT_PROLONGING_AGENTS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL ARRHYTHMIA RISK (95%) — MAJOR',
    type: 'Additive hERG Potassium Channel Blockade',
    title: 'Torsades de Pointes & Sudden Cardiac Death Risk (Dual QT-Prolonging Agents)',
    description:
      'Co-administering two or more QT-prolonging agents additively blocks cardiac hERG (IKr) potassium channels, prolonging ventricular repolarization (QTc > 500 ms) and precipitating fatal polymorphic ventricular tachycardia (Torsades de Pointes).',
    clinicalAdvice:
      'Prescription blocked. Substitute at least one agent with a non-QT-prolonging drug or require cardiology telemetry + baseline/serial ECG monitoring.',
  },

  // 14. Beta-Blockers + Non-DHP CCBs / Digoxin / Clonidine
  {
    id: 'RULE_14_AV_NODE_BLOCK',
    sideA: ['BETA_BLOCKERS'],
    sideB: ['CALCIUM_CHANNEL_BLOCKERS_NON_DHP', 'CARDIAC_GLYCOSIDES_DIGOXIN', 'DRUG:clonidine'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL CARDIAC RISK (92%) — MAJOR',
    type: 'Additive AV Nodal & Negative Inotropic Suppression',
    title: 'Severe Bradycardia, Complete AV Heart Block & Cardiogenic Shock Risk',
    description:
      'Combining Beta-Blockers with non-dihydropyridine Calcium Channel Blockers (Verapamil, Diltiazem) or Digoxin causes profound SA/AV nodal depression and reduced contractility; combining with Clonidine risks life-threatening rebound hypertension upon Clonidine withdrawal.',
    clinicalAdvice:
      'Prescription blocked. Switch Verapamil/Diltiazem to a dihydropyridine CCB (e.g., Amlodipine) or obtain specialist electrophysiology supervision.',
  },

  // 15. Carbapenems + Valproate (Depakine)
  {
    id: 'RULE_15_CARBAPENEM_VALPROATE',
    sideA: ['CARBAPENEMS'],
    sideB: ['VALPROATE'],
    severity: 'Red',
    riskPercentage: 98,
    riskLabel: 'CRITICAL RISK (98%) — CONTRAINDICATED',
    type: 'Acylpeptide Hydrolase Inhibition',
    title: 'Rapid 60–90% Drop in Valproate Levels & Breakthrough Status Epilepticus',
    description:
      'Carbapenems (Meropenem, Imipenem, Ertapenem) irreversibly inhibit valproate glucuronide hydrolysis and suppress intestinal absorption, plummeting serum Valproate concentrations by 60–90% within 24 hours and provoking refractory seizures.',
    clinicalAdvice:
      'Prescription strictly blocked. Select a non-carbapenem antibiotic (dose adjustments of Valproate cannot overcome this interaction).',
  },

  // 16. Lithium + NSAIDs / Thiazides / ACEi / ARBs / Metronidazole
  {
    id: 'RULE_16_LITHIUM_TOXICITY',
    sideA: ['LITHIUM'],
    sideB: ['NSAIDS', 'THIAZIDE_DIURETICS', 'ACE_INHIBITORS', 'ARBS', 'DRUG:metronidazole'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — MAJOR TOXICITY',
    type: 'Decreased Renal Lithium Clearance',
    title: 'Severe Lithium Neurotoxicity, Ataxia & Renal Failure Risk',
    description:
      'Thiazide diuretics, NSAIDs, ACE inhibitors/ARBs, and Metronidazole enhance proximal tubular sodium/lithium reabsorption, spiking serum Lithium (>1.5–2.0 mEq/L) and causing coarse tremor, delirium, seizures, and nephrotoxicity.',
    clinicalAdvice:
      'Prescription blocked. Avoid concurrent nephrotoxic/clearance-reducing drugs or verify immediate Lithium level monitoring and dose reduction.',
  },

  // 17. Theophylline + CYP1A2 Inhibitors
  {
    id: 'RULE_17_THEOPHYLLINE_TOXICITY',
    sideA: ['THEOPHYLLINE'],
    sideB: ['DRUG:ciprofloxacin', 'DRUG:clarithromycin', 'DRUG:erythromycin', 'DRUG:fluvoxamine'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — MAJOR TOXICITY',
    type: 'CYP1A2 Clearance Inhibition',
    title: 'Fatal Theophylline Seizures & Refractory Tachyarrhythmias',
    description:
      'Ciprofloxacin, Fluvoxamine, and Macrolides inhibit CYP1A2-mediated Theophylline clearance, causing acute plasma accumulation that manifests as intractable vomiting, seizures, and ventricular arrhythmias.',
    clinicalAdvice:
      'Prescription blocked. Use an alternative non-CYP1A2 antibiotic (e.g., Levofloxacin or Amoxicillin) or reduce Theophylline by 50% with serum monitoring.',
  },

  // 18. Clopidogrel + CYP2C19 Inhibitors
  {
    id: 'RULE_18_CLOPIDOGREL_CYP2C19',
    sideA: ['DRUG:clopidogrel'],
    sideB: ['CYP2C19_INHIBITORS'],
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — FDA WARNING',
    type: 'CYP2C19 Prodrug Bioactivation Failure',
    title: 'Loss of Antiplatelet Efficacy & Coronary Stent Thrombosis Risk',
    description:
      'Omeprazole, Esomeprazole, Fluoxetine, and Fluvoxamine inhibit hepatic CYP2C19 conversion of Clopidogrel into its active thiol metabolite, sharply elevating risks of myocardial infarction, stent thrombosis, and ischemic stroke.',
    clinicalAdvice:
      'Prescription blocked. Switch PPI gastroprotection to Pantoprazole or Famotidine (H2 blocker).',
  },

  // 19. Fluoroquinolones + Systemic Corticosteroids
  {
    id: 'RULE_19_FQ_TENDON_RUPTURE',
    sideA: ['FLUOROQUINOLONES'],
    sideB: ['CORTICOSTEROIDS'],
    severity: 'Red',
    riskPercentage: 88,
    riskLabel: 'HIGH CLINICAL RISK (88%) — FDA BLACK BOX',
    type: 'Synergistic Collagen Degradation',
    title: 'FDA Black Box Warning: Severe Tendinitis & Achilles Tendon Rupture',
    description:
      'Co-administration of Fluoroquinolones (Ciprofloxacin, Levofloxacin, Moxifloxacin) with Systemic Corticosteroids dramatically accelerates matrix metalloproteinase collagen breakdown, causing acute Achilles and shoulder tendon rupture.',
    clinicalAdvice:
      'Prescription blocked. Select a non-fluoroquinolone antibiotic unless no alternative exists.',
  },

  // 20. Fluoroquinolones / Tetracyclines + Multivalent Cations
  {
    id: 'RULE_20_ANTIBIOTIC_CHELATION',
    sideA: ['FLUOROQUINOLONES', 'TETRACYCLINES'],
    sideB: ['MULTIVALENT_CATIONS'],
    severity: 'Yellow',
    riskPercentage: 65,
    riskLabel: 'MODERATE RISK (65%) — TREATMENT FAILURE',
    type: 'Gastrointestinal Chelation Complexation',
    title: 'Up to 90% Loss of Antibiotic Absorption via Cation Chelation',
    description:
      'Di- and trivalent cations (Calcium, Iron, Magnesium/Aluminum antacids, Sucralfate, Zinc) bind Fluoroquinolones and Tetracyclines in the GI tract to form insoluble chelates, leading to subtherapeutic antibiotic levels and clinical treatment failure.',
    clinicalAdvice:
      'Requires acknowledgment & counseling: Administer the antibiotic at least 2 hours before or 4–6 hours after any cation supplement/antacid.',
  },

  // 21. Sulfonylureas / Insulin + Severe Hypoglycemia Potentiators
  {
    id: 'RULE_21_SEVERE_HYPOGLYCEMIA',
    sideA: ['SULFONYLUREAS_INSULIN'],
    sideB: [
      'DRUG:fluconazole',
      'SULFONAMIDES_TMP_SMX',
      'FLUOROQUINOLONES',
      'NON_SELECTIVE_BETA_BLOCKERS',
    ],
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — MAJOR HYPOGLYCEMIA',
    type: 'CYP2C9 Inhibition / Insulin Secretion Surge / Masked Symptoms',
    title: 'Severe Life-Threatening Hypoglycemia & Neuroglycopenic Coma Risk',
    description:
      'Fluconazole and TMP-SMX inhibit CYP2C9 clearance of sulfonylureas, Fluoroquinolones directly stimulate pancreatic beta-cell insulin release, and non-selective Beta-Blockers mask adrenergic warning signs (tachycardia/tremor) while impairing hepatic glycogenolysis.',
    clinicalAdvice:
      'Prescription blocked. Substitute antibiotic or require intensified capillary blood glucose monitoring and prophylactic hypoglycemic dose reduction.',
  },

  // 22. Ergot Alkaloids + Triptans / Macrolides / Azoles
  {
    id: 'RULE_22_ERGOT_VASOSPASM',
    sideA: ['ERGOT_ALKALOIDS'],
    sideB: ['TRIPTANS', 'MACROLIDES', 'AZOLE_ANTIFUNGALS', 'DRUG:ritonavir'],
    severity: 'Red',
    riskPercentage: 98,
    riskLabel: 'CRITICAL RISK (98%) — CONTRAINDICATED',
    type: 'Severe Peripheral & Cerebral Vasospasm',
    title: 'Ergotism, Gangrene & Cerebral/Myocardial Ischemia Risk',
    description:
      'CYP3A4 inhibition (Macrolides, Azoles, Ritonavir) or additive 5-HT1B/1D vasoconstriction (Triptans within 24h) alongside Ergotamine produces fulminant arterial vasospasm, limb ischemia, and stroke.',
    clinicalAdvice:
      'Prescription strictly blocked. Contraindicated together; separate Ergotamine and Triptans by at least 24 hours.',
  },

  // 23. Duplicate Therapy / Same Drug Class Overdose
  {
    id: 'RULE_23A_DUPLICATE_ACETAMINOPHEN',
    sideA: ['ACETAMINOPHEN'],
    sideB: ['ACETAMINOPHEN'],
    allowDifferentDrugsOnly: false,
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL TOXICITY RISK (92%) — OVERDOSE',
    type: 'Therapeutic Duplication — Hepatotoxicity',
    title: 'Duplicate Acetaminophen / Paracetamol Overdose & Acute Liver Failure Risk',
    description:
      'Prescribing another Acetaminophen/Paracetamol-containing product alongside an active Paracetamol regimen exceeds safe daily NAPQI glutathione detoxification capacity (>4g/day), risking fulminant hepatic necrosis.',
    clinicalAdvice:
      'Prescription blocked. Consolidate to a single Acetaminophen product or choose a distinct non-hepatotoxic analgesic.',
  },
  {
    id: 'RULE_23B_DUPLICATE_NSAID',
    sideA: ['NSAIDS'],
    sideB: ['NSAIDS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — DUPLICATE THERAPY',
    type: 'Therapeutic Duplication Toxicity',
    title: 'Duplicate NSAID Therapy — Severe GI Perforation & Acute Kidney Injury Risk',
    description:
      'Combining two systemic NSAIDs provides zero additional analgesia while multiplicatively elevating risks of gastric perforation, GI bleeding, and acute renal failure.',
    clinicalAdvice:
      'Prescription blocked. Discontinue the existing NSAID before initiating another.',
  },
  {
    id: 'RULE_23C_DUPLICATE_SSRI',
    sideA: ['SSRIs_SNRIs'],
    sideB: ['SSRIs_SNRIs'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — DUPLICATE THERAPY',
    type: 'Therapeutic Duplication — Serotonin Syndrome',
    title: 'Duplicate Serotonergic Antidepressant Therapy (Serotonin Toxicity)',
    description:
      'Co-prescribing two SSRI/SNRI antidepressants triggers Serotonin Syndrome, agitation, autonomic instability, and QT prolongation without therapeutic benefit.',
    clinicalAdvice:
      'Prescription blocked. Cross-taper properly when switching antidepressants instead of co-prescribing.',
  },
  {
    id: 'RULE_23D_DUPLICATE_ANTICOAGULANT',
    sideA: ['ANTICOAGULANTS_VK_DOAC'],
    sideB: ['ANTICOAGULANTS_VK_DOAC'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 98,
    riskLabel: 'CRITICAL RISK (98%) — FATAL HEMORRHAGE',
    type: 'Therapeutic Duplication — Anticoagulation Overdose',
    title: 'Duplicate Systemic Anticoagulant Overdose Risk',
    description:
      'Concurrent administration of two therapeutic anticoagulants (e.g., Warfarin + Rivaroxaban or Apixaban + Dabigatran) creates an extreme risk of catastrophic internal hemorrhage.',
    clinicalAdvice:
      'Prescription strictly blocked unless executing a time-limited parenteral bridge protocol under inpatient hematology supervision.',
  },
  {
    id: 'RULE_23E_DUPLICATE_ACEI',
    sideA: ['ACE_INHIBITORS'],
    sideB: ['ACE_INHIBITORS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — DUPLICATE THERAPY',
    type: 'Therapeutic Duplication Toxicity',
    title: 'Duplicate ACE Inhibitor Therapy (Hypotension, Hyperkalemia & AKI)',
    description:
      'Prescribing two ACE inhibitors simultaneously causes excessive bradykinin accumulation (angioedema risk), severe hypotension, and acute renal impairment.',
    clinicalAdvice: 'Prescription blocked. Titrate a single ACE inhibitor instead.',
  },
  {
    id: 'RULE_23F_DUPLICATE_ARB',
    sideA: ['ARBS'],
    sideB: ['ARBS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — DUPLICATE THERAPY',
    type: 'Therapeutic Duplication Toxicity',
    title: 'Duplicate Angiotensin Receptor Blocker (ARB) Therapy',
    description:
      'Prescribing two ARBs concurrently compounds hypotension, hyperkalemia, and renal dysfunction without added benefit.',
    clinicalAdvice: 'Prescription blocked. Use a single ARB agent.',
  },
  {
    id: 'RULE_24_LOOP_AMINOGLYCOSIDE_OTOTOXICITY',
    sideA: ['LOOP_DIURETICS'],
    sideB: ['AMINOGLYCOSIDES_OTOTOXIC'],
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL TOXICITY RISK (92%) — IRREVERSIBLE OTOTOXICITY',
    type: 'Synergistic Ototoxicity & Nephrotoxicity',
    title: 'Irreversible Ototoxicity (Sensorineural Deafness) & Acute Nephrotoxicity',
    description:
      'Combining Loop Diuretics (Furosemide, Bumetanide, Torsemide) with Aminoglycosides (Amikacin, Gentamicin, Tobramycin) or Vancomycin causes synergistic stria vascularis and cochlear hair-cell damage, resulting in permanent deafness alongside severe acute kidney injury.',
    clinicalAdvice:
      'Prescription blocked. Choose a non-ototoxic antibiotic or obtain inpatient audiology + therapeutic drug monitoring.',
  },
  {
    id: 'RULE_23G_DUPLICATE_STATIN',
    sideA: ['STATINS_ALL'],
    sideB: ['STATINS_ALL'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 88,
    riskLabel: 'HIGH CLINICAL RISK (88%) — DUPLICATE THERAPY',
    type: 'Therapeutic Duplication — Myopathy',
    title: 'Duplicate Statin Therapy — Hepatotoxicity & Rhabdomyolysis Risk',
    description:
      'Combining two HMG-CoA reductase inhibitors causes additive skeletal muscle toxicity and elevated hepatic transaminases.',
    clinicalAdvice: 'Prescription blocked. Discontinue the prior statin when switching intensity.',
  },
  {
    id: 'RULE_23H_DUPLICATE_BETA_BLOCKER',
    sideA: ['BETA_BLOCKERS'],
    sideB: ['BETA_BLOCKERS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — DUPLICATE THERAPY',
    type: 'Therapeutic Duplication — Bradycardia',
    title: 'Duplicate Beta-Blocker Therapy — Severe Bradycardia & Heart Block',
    description:
      'Co-administering two systemic beta-blockers markedly increases risks of symptomatic bradycardia, hypotension, and bronchospasm.',
    clinicalAdvice: 'Prescription blocked. Consolidate to a single beta-blocker.',
  },
  {
    id: 'RULE_23I_DUPLICATE_OPIOID',
    sideA: ['OPIOIDS'],
    sideB: ['OPIOIDS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 95,
    riskLabel: 'CRITICAL RISK (95%) — RESPIRATORY ARREST',
    type: 'Therapeutic Duplication — Opioid Overdose',
    title: 'Duplicate Opioid Analgesic Therapy — Severe Respiratory Depression Risk',
    description:
      'Stacking two systemic mu-opioid agonists rapidly increases cumulative morphine milligram equivalents (MME) and triggers fatal respiratory arrest.',
    clinicalAdvice: 'Prescription blocked. Reconcile active opioid analgesia prior to prescribing.',
  },
  {
    id: 'RULE_23J_DUPLICATE_BENZO',
    sideA: ['BENZODIAZEPINES'],
    sideB: ['BENZODIAZEPINES'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 90,
    riskLabel: 'HIGH CLINICAL RISK (90%) — CNS OVERDOSE',
    type: 'Therapeutic Duplication — CNS Depression',
    title: 'Duplicate Benzodiazepine Therapy — Excessive Sedation & Fall/Apnea Risk',
    description:
      'Simultaneous prescription of multiple benzodiazepines risks profound psychomotor impairment, delirium, falls, and respiratory depression.',
    clinicalAdvice: 'Prescription blocked. Use a single lowest-effective-dose benzodiazepine.',
  },
  {
    id: 'RULE_23K_DUPLICATE_NITRATE_PDE5',
    sideA: ['NITRATES'],
    sideB: ['NITRATES'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 88,
    riskLabel: 'HIGH CLINICAL RISK (88%) — HYPOTENSION',
    type: 'Therapeutic Duplication — Severe Vasodilation',
    title: 'Duplicate Long-Acting Nitrate Therapy (Severe Hypotension & Tolerance)',
    description: 'Multiple nitrate formulations compound venous pooling, syncope, and nitrate tolerance.',
    clinicalAdvice: 'Verify if PRN sublingual rescue is intended alongside maintenance nitrate.',
  },
  {
    id: 'RULE_23L_DUPLICATE_PDE5',
    sideA: ['PDE5_INHIBITORS'],
    sideB: ['PDE5_INHIBITORS'],
    allowDifferentDrugsOnly: true,
    severity: 'Red',
    riskPercentage: 92,
    riskLabel: 'CRITICAL RISK (92%) — HYPOTENSION & PRIAPISM',
    type: 'Therapeutic Duplication — Vasodilatory Collapse',
    title: 'Duplicate PDE5 Inhibitor Therapy (Severe Hypotension & Priapism Risk)',
    description: 'Combining two PDE5 inhibitors (e.g., Sildenafil + Tadalafil) risks severe hypotension, syncope, visual loss (NAION), and priapism.',
    clinicalAdvice: 'Prescription blocked. Choose a single PDE5 inhibitor.',
  },

  // --- Classic Moderate (Yellow) Interactions Preserved ---
  {
    id: 'MOD_NSAID_ACEI_ARB',
    sideA: ['NSAIDS'],
    sideB: ['ACE_INHIBITORS', 'ARBS'],
    severity: 'Yellow',
    riskPercentage: 65,
    riskLabel: 'MODERATE RISK (65%) — RENAL & BP MONITORING',
    type: 'Drug-Drug Interaction',
    title: 'Attenuated Antihypertensive Effect & Acute Kidney Injury ("Triple Whammy" Risk)',
    description:
      'NSAID-mediated prostaglandin inhibition constricts afferent renal arterioles while ACE inhibitors/ARBs dilate efferent arterioles, reducing glomerular filtration pressure and blunting antihypertensive efficacy.',
    clinicalAdvice:
      'Monitor blood pressure, serum creatinine (eGFR), and potassium closely; minimize NSAID duration.',
  },
  {
    id: 'MOD_ASPIRIN_IBUPROFEN',
    sideA: ['DRUG:aspirin'],
    sideB: ['NSAIDS'],
    severity: 'Yellow',
    riskPercentage: 60,
    riskLabel: 'MODERATE RISK (60%) — DOSE TIMING REQUIRED',
    type: 'Drug-Drug Interaction',
    title: 'Competitive COX-1 Blockade & Mucosal Ulceration',
    description:
      'Systemic NSAIDs sterically hinder low-dose Aspirin from irreversibly acetylating platelet COX-1, reducing cardioprotection while elevating upper GI ulcer risk.',
    clinicalAdvice:
      'Administer immediate-release Aspirin at least 2 hours prior to the NSAID or switch to Acetaminophen.',
  },
  {
    id: 'MOD_ASPIRIN_CLOPIDOGREL',
    sideA: ['DRUG:aspirin'],
    sideB: ['P2Y12_INHIBITORS'],
    severity: 'Yellow',
    riskPercentage: 65,
    riskLabel: 'MODERATE RISK (65%) — DUAL ANTIPLATELET BLEEDING',
    type: 'Dual Antiplatelet Synergy (DAPT)',
    title: 'Increased Systemic & GI Bleeding Risk (Dual Antiplatelet Therapy)',
    description:
      'Combining Aspirin with Clopidogrel, Ticagrelor, or Prasugrel markedly increases major bleeding tendency; valid only when specifically indicated post-ACS / coronary stent.',
    clinicalAdvice:
      'Confirm Cardiology DAPT directive and consider gastroprotective PPI (Pantoprazole — never Omeprazole with Clopidogrel).',
  },
  {
    id: 'MOD_SSRI_ASPIRIN_OR_NSAID',
    sideA: ['SSRIs_SNRIs'],
    sideB: ['DRUG:aspirin', 'NSAIDS'],
    severity: 'Yellow',
    riskPercentage: 65,
    riskLabel: 'MODERATE RISK (65%) — GI BLEEDING HAZARD',
    type: 'Platelet Serotonin Depletion + COX Inhibition',
    title: 'Synergistic Upper GI Bleeding Risk (SSRI + Aspirin/NSAID)',
    description:
      'SSRIs deplete platelet serotonin stores needed for hemostasis; combined with COX-1 inhibition from Aspirin or NSAIDs, upper GI hemorrhage risk rises 3-fold.',
    clinicalAdvice:
      'Add PPI gastroprotection and monitor for melena, bruising, or epigastric pain.',
  },
  {
    id: 'MOD_SSRI_WARFARIN',
    sideA: ['SSRIs_SNRIs'],
    sideB: ['WARFARIN'],
    severity: 'Yellow',
    riskPercentage: 70,
    riskLabel: 'MODERATE-HIGH RISK (70%) — INR & BLEED MONITOR',
    type: 'Drug-Drug Interaction',
    title: 'Potentiated Anticoagulation & Platelet Serotonin Depletion',
    description:
      'SSRIs impair platelet serotonin uptake and inhibit CYP2C9 (especially Fluoxetine/Fluvoxamine), increasing bleeding risk with Warfarin.',
    clinicalAdvice:
      'Check INR closely within 5–7 days of starting or titrating therapy.',
  },
  {
    id: 'MOD_STATIN_WARFARIN',
    sideA: ['STATINS_ALL'],
    sideB: ['WARFARIN'],
    severity: 'Yellow',
    riskPercentage: 55,
    riskLabel: 'MODERATE RISK (55%) — INR MONITORING',
    type: 'Drug-Drug Interaction',
    title: 'Transient Prothrombin Time (INR) Alteration',
    description:
      'Certain statins (Atorvastatin, Simvastatin, Rosuvastatin) can alter Warfarin plasma binding or CYP metabolism during the first 1–2 weeks of co-therapy.',
    clinicalAdvice: 'Check PT/INR within 5–7 days of initiating or changing statin dosage.',
  },
]

/**
 * Evaluates whether a CLASS_DDI_MATRIX rule matches two drug profiles.
 */
export function evaluateClassMatrixRule(rule, profileA, profileB) {
  const forwardMatch =
    rule.sideA.some((sel) => matchesSelector(profileA, sel)) &&
    rule.sideB.some((sel) => matchesSelector(profileB, sel))

  const reverseMatch =
    rule.sideA.some((sel) => matchesSelector(profileB, sel)) &&
    rule.sideB.some((sel) => matchesSelector(profileA, sel))

  if (!forwardMatch && !reverseMatch) return false

  if (rule.allowDifferentDrugsOnly) {
    // Same exact active ingredient (e.g. Ibuprofen 200 vs Ibuprofen 400): skip this rule
    // unless distinct drugs share the class
    if (profileA.primaryKey && profileB.primaryKey && profileA.primaryKey === profileB.primaryKey) {
      return false
    }
  }

  return true
}

/**
 * Canonical Drug-to-Disease Contraindication Rules (Class-aware)
 */
export const DRUG_DISEASE_RULES = [
  {
    selectors: ['NSAIDS'],
    conditionKeywords: ['peptic ulcer', 'ulcer', 'gi bleed', 'gastritis'],
    severity: 'Red',
    riskPercentage: 95,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Peptic Ulcer / GI Bleeding Disease',
    description:
      'Patient’s Medical Form reports Peptic Ulcer / GI Bleeding history. Systemic NSAIDs inhibit protective gastric prostaglandins (COX-1), risking acute ulcer perforation and hemorrhage.',
    clinicalAdvice:
      'Prescription blocked by patient condition profile. Avoid all systemic NSAIDs.',
  },
  {
    selectors: ['NSAIDS'],
    conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd'],
    severity: 'Red',
    riskPercentage: 92,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Chronic Kidney Disease (Nephrotoxic)',
    description:
      'Patient’s Medical Form reports Chronic Kidney Disease. NSAIDs constrict afferent renal arterioles and precipitate acute-on-chronic renal failure.',
    clinicalAdvice:
      'Prescription blocked. Select a renally safe non-NSAID analgesic (e.g., Acetaminophen).',
  },
  {
    selectors: ['NSAIDS'],
    conditionKeywords: ['heart failure', 'cardiac failure', 'chf'],
    severity: 'Red',
    riskPercentage: 90,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Heart Failure (Fluid Retention)',
    description:
      'Patient’s Medical Form reports Heart Failure. NSAIDs promote sodium/water retention and raise systemic vascular resistance, risking acute decompensation.',
    clinicalAdvice:
      'Prescription blocked. Avoid systemic NSAIDs in patients with heart failure.',
  },
  {
    selectors: ['NSAIDS'],
    conditionKeywords: ['hypertension', 'high blood pressure'],
    severity: 'Yellow',
    riskPercentage: 60,
    drugsComCategory: 'Moderate',
    type: 'Drug-Disease Precaution',
    title: 'Caution in Hypertension — Blood Pressure Elevation',
    description:
      'Patient’s Medical Form reports Hypertension. NSAIDs can raise mean arterial pressure by 3–6 mmHg and antagonize antihypertensive therapy.',
    clinicalAdvice:
      'Use lowest effective dose for shortest duration and monitor blood pressure daily.',
  },
  {
    selectors: ['NSAIDS', 'DRUG:aspirin'],
    conditionKeywords: ['asthma', 'bronchospasm', 'copd'],
    severity: 'Yellow',
    riskPercentage: 68,
    drugsComCategory: 'Moderate',
    type: 'Drug-Disease Precaution',
    title: 'Caution in Asthma / Reactive Airway — Bronchospasm Risk (AERD)',
    description:
      'Patient’s Medical Form reports Asthma/COPD. COX-1 inhibition shunts arachidonic acid toward leukotriene synthesis, risking acute bronchospasm.',
    clinicalAdvice:
      'Verify patient has no history of Aspirin-Exacerbated Respiratory Disease (AERD) before dispensing.',
  },
  {
    selectors: ['NON_SELECTIVE_BETA_BLOCKERS'],
    conditionKeywords: ['asthma', 'bronchospasm', 'copd'],
    severity: 'Red',
    riskPercentage: 92,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Asthma (Non-Selective Beta-Blockade Bronchospasm)',
    description:
      'Patient’s Medical Form reports Asthma/COPD. Non-selective Beta-2 receptor blockade precipitates severe, refractory bronchoconstriction.',
    clinicalAdvice:
      'Prescription blocked. If a beta-blocker is compellingly indicated, switch to a cardioselective beta-1 agent (e.g., Bisoprolol/Nebivolol) under pulmonology oversight.',
  },
  {
    selectors: ['DRUG:aspirin'],
    conditionKeywords: ['peptic ulcer', 'ulcer', 'gi bleed'],
    severity: 'Red',
    riskPercentage: 92,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Active Peptic Ulcer / GI Bleed',
    description:
      'Patient’s Medical Form reports Peptic Ulcer. Aspirin irreversibly inhibits platelet aggregation and damages gastric mucosa.',
    clinicalAdvice:
      'Prescription blocked unless co-prescribed with high-dose PPI under cardiology directive.',
  },
  {
    selectors: ['DRUG:metformin'],
    conditionKeywords: [
      'chronic kidney disease',
      'kidney',
      'renal',
      'ckd',
      'liver disease',
      'hepatic',
    ],
    severity: 'Yellow',
    riskPercentage: 70,
    drugsComCategory: 'Moderate',
    type: 'Drug-Disease Precaution',
    title: 'Lactic Acidosis Risk in Renal / Hepatic Impairment',
    description:
      'Patient’s Medical Form indicates renal or hepatic impairment. Metformin clearance is reduced, increasing the risk of metformin-associated lactic acidosis (MALA).',
    clinicalAdvice:
      'Verify eGFR > 30 mL/min/1.73m² (contraindicated if eGFR < 30; reduce max dose if eGFR 30–45).',
  },
  {
    selectors: ['STATINS_ALL'],
    conditionKeywords: ['liver disease', 'hepatic', 'cirrhosis'],
    severity: 'Red',
    riskPercentage: 90,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Contraindicated in Active Hepatic Disease',
    description:
      'Patient’s Medical Form reports Liver Disease. HMG-CoA reductase inhibitors (Statins) are contraindicated in active hepatic decompensation or unexplained persistent transaminase elevation.',
    clinicalAdvice:
      'Prescription blocked. Evaluate baseline ALT/AST and consult hepatology.',
  },
  {
    selectors: ['ANTICOAGULANTS_VK_DOAC'],
    conditionKeywords: ['peptic ulcer', 'liver disease', 'hepatic', 'bleeding'],
    severity: 'Red',
    riskPercentage: 92,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'High Hemorrhagic Risk with Active Ulcer / Severe Hepatic Disease',
    description:
      'Patient’s Medical Form reports Peptic Ulcer or Liver Disease, creating a severe bleeding hazard with anticoagulant therapy.',
    clinicalAdvice:
      'Prescription blocked. Requires specialist hematology/gastroenterology clearance.',
  },
  {
    selectors: ['DRUG:potassium', 'POTASSIUM_SPARING_DIURETICS'],
    conditionKeywords: ['chronic kidney disease', 'kidney', 'renal', 'ckd', 'hyperkalemia'],
    severity: 'Red',
    riskPercentage: 92,
    drugsComCategory: 'Major',
    type: 'Drug-Disease Contraindication',
    title: 'Hyperkalemia Hazard in Chronic Kidney Disease',
    description:
      'Patient’s Medical Form reports Chronic Kidney Disease. Potassium supplementation or potassium-sparing diuretics risk fatal hyperkalemia when renal potassium excretion is impaired.',
    clinicalAdvice: 'Prescription blocked. Verify serum potassium and eGFR before use.',
  },
]

/**
 * Drug-to-Allergy Class Cross-Reactivity Rules
 */
export const DRUG_ALLERGY_RULES = [
  {
    selectors: ['PENICILLINS'],
    allergyKeywords: ['penicillin', 'amoxicillin', 'ampicillin', 'beta-lactam', 'augmentin'],
    severity: 'Red',
    riskPercentage: 98,
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Penicillin / Beta-Lactam Anaphylaxis Risk',
    description:
      'Patient’s Medical Form documents a Penicillin/Beta-Lactam allergy. Prescribing this penicillin carries a high risk of IgE-mediated anaphylaxis or severe hypersensitivity.',
    clinicalAdvice:
      'Prescription strictly blocked. Select a non-beta-lactam alternative.',
  },
  {
    selectors: ['SULFONAMIDES_TMP_SMX', 'SULFONYLUREAS_INSULIN', 'DRUG:celecoxib', 'DRUG:furosemide', 'THIAZIDE_DIURETICS'],
    allergyKeywords: ['sulfa', 'sulfonamide', 'bactrim', 'septrin', 'sulfamethoxazole'],
    severity: 'Red',
    riskPercentage: 92,
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Sulfonamide Hypersensitivity / Stevens-Johnson Risk',
    description:
      'Patient’s Medical Form documents a Sulfa / Sulfonamide allergy. Risk of severe hypersensitivity, urticaria, or Stevens-Johnson Syndrome (SJS).',
    clinicalAdvice: 'Prescription blocked. Select a non-sulfonamide agent.',
  },
  {
    selectors: ['DRUG:aspirin', 'NSAIDS'],
    allergyKeywords: ['aspirin', 'nsaid', 'salicylate', 'ibuprofen', 'diclofenac', 'naproxen'],
    severity: 'Red',
    riskPercentage: 95,
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: NSAID / Aspirin Cross-Reactivity',
    description:
      'Patient’s Medical Form documents an Aspirin/NSAID allergy. High risk of cross-reactive angioedema, urticaria, or anaphylactoid bronchospasm.',
    clinicalAdvice:
      'Prescription strictly blocked. Use Acetaminophen/Paracetamol instead.',
  },
  {
    selectors: ['FLUOROQUINOLONES'],
    allergyKeywords: ['fluoroquinolone', 'ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
    severity: 'Red',
    riskPercentage: 95,
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Fluoroquinolone Class Hypersensitivity',
    description:
      'Patient’s Medical Form documents a Fluoroquinolone allergy. High risk of immediate systemic hypersensitivity.',
    clinicalAdvice: 'Prescription blocked. Select an alternative antibiotic class.',
  },
  {
    selectors: ['MACROLIDES'],
    allergyKeywords: ['macrolide', 'azithromycin', 'clarithromycin', 'erythromycin'],
    severity: 'Red',
    riskPercentage: 95,
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Macrolide Class Hypersensitivity',
    description: 'Patient’s Medical Form documents a Macrolide allergy.',
    clinicalAdvice: 'Prescription blocked. Select a non-macrolide antibiotic.',
  },
  {
    selectors: ['OPIOIDS'],
    allergyKeywords: ['opioid', 'codeine', 'morphine', 'tramadol', 'oxycodone'],
    severity: 'Red',
    riskPercentage: 95,
    drugsComCategory: 'Major',
    type: 'Allergy Contraindication',
    title: 'SEVERE ALLERGY ALERT: Opioid Analgesic Hypersensitivity',
    description: 'Patient’s Medical Form documents an Opioid allergy/intolerance.',
    clinicalAdvice: 'Prescription blocked. Use non-opioid multimodal analgesia.',
  },
]

/**
 * Drugs.com Laboratory Test Interference ("Lab Interaction") Database
 */
export const DRUGS_COM_LAB_INTERACTIONS = {
  ibuprofen: [
    {
      drug: 'Ibuprofen',
      category: 'Moderate',
      labTest: 'Urine Drug Screen (Cannabinoids / THC & Barbiturates Immunoassay)',
      effect: 'False-Positive Urine Drug Test Result',
      summary:
        'Ibuprofen and its urinary metabolites can cross-react with EMIT/FPIA immunoassay screening assays, causing a false-positive urine drug test for Cannabinoids (THC) or Barbiturates.',
      recommendation:
        'Confirm any unexpected positive immunoassay toxicology screen with Gas Chromatography–Mass Spectrometry (GC-MS).',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  amoxicillin: [
    {
      drug: 'Amoxicillin',
      category: 'Moderate',
      labTest: 'Urine Glucose Assay (Copper Reduction: Clinitest / Benedict’s)',
      effect: 'False-Positive Urine Glucose Reading',
      summary:
        'High urinary concentrations of Amoxicillin reduce copper ions in non-enzymatic urine glucose tests, producing a false-positive glycosuria reading.',
      recommendation:
        'Use enzymatic glucose oxidase tests (e.g., Clinistix) when monitoring urine glucose.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  metformin: [
    {
      drug: 'Metformin',
      category: 'Moderate',
      labTest: 'Iodinated Radiocontrast Studies, FDG-PET Scans & Serum Vitamin B12',
      effect: 'Contrast-Induced Lactic Acidosis Risk & Intense Bowel FDG-PET Uptake',
      summary:
        'Intravascular iodinated contrast can precipitate Metformin-Associated Lactic Acidosis (MALA), and Metformin increases colonic 18F-FDG uptake while lowering Vitamin B12.',
      recommendation:
        'Hold Metformin at the time of iodinated contrast imaging in eGFR 30–60 and recheck eGFR 48 hours post-procedure.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  omeprazole: [
    {
      drug: 'Omeprazole',
      category: 'Moderate',
      labTest: 'Serum Chromogranin A (CgA), H. pylori Urea Breath Test & Urine THC',
      effect: 'False-Positive CgA / THC & False-Negative H. pylori Assay',
      summary:
        'PPI acid suppression raises Chromogranin A (false-positive neuroendocrine workup) and suppresses H. pylori density (false-negative breath/stool assays).',
      recommendation:
        'Discontinue PPI for 14 days prior to Chromogranin A or H. pylori testing.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  warfarin: [
    {
      drug: 'Warfarin',
      category: 'Major',
      labTest: 'Protein C, Protein S & Lupus Anticoagulant Thrombophilia Panels',
      effect: 'False-Positive Thrombophilia & Coagulation Factor Deficiency',
      summary:
        'Warfarin depletes Vitamin K-dependent Protein C and Protein S and prolongs phospholipid-dependent clotting times.',
      recommendation:
        'Defer hypercoagulability panels until Warfarin has been discontinued for at least 2–4 weeks.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  aspirin: [
    {
      drug: 'Aspirin',
      category: 'Minor',
      labTest: 'Urine 5-HIAA (Serotonin Metabolite) & Serum Uric Acid Assays',
      effect: 'Analytical Assay Interference & Biphasic Uric Acid Shift',
      summary:
        'Salicylates interfere with fluorometric urine 5-HIAA assays and alter renal urate excretion.',
      recommendation: 'Withhold salicylates 48–72 hours prior to 24-hour urine 5-HIAA collection.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  lisinopril: [
    {
      drug: 'Lisinopril',
      category: 'Minor',
      labTest: 'Basic Metabolic Panel (Serum Creatinine & Potassium)',
      effect: 'Expected Creatinine Elevation (+10–25%) & Hyperkalemia Shift',
      summary:
        'ACE inhibition reduces efferent glomerular tone and aldosterone secretion, mildly raising creatinine and potassium.',
      recommendation: 'Check BMP within 2 weeks of initiation; monitor if Cr rises >30% or K+ >5.5 mEq/L.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  atorvastatin: [
    {
      drug: 'Atorvastatin',
      category: 'Minor',
      labTest: 'Hepatic Transaminases (ALT / AST) & Serum Creatine Kinase (CK)',
      effect: 'Asymptomatic Transaminase & Creatine Kinase Elevation',
      summary:
        'Statins may elevate ALT/AST and Creatine Kinase, especially alongside CYP3A4 inhibitors.',
      recommendation: 'Verify baseline hepatic panel; check CK promptly if myalgia develops.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
  simvastatin: [
    {
      drug: 'Simvastatin',
      category: 'Minor',
      labTest: 'Hepatic Transaminases (ALT / AST) & Serum Creatine Kinase (CK)',
      effect: 'Elevated Creatine Kinase / Myopathy Biomarker Sensitivity',
      summary:
        'Simvastatin carries higher CYP3A4 myopathy sensitivity than hydrophilic statins; baseline ALT/AST and symptomatic CK monitoring apply.',
      recommendation: 'Obtain immediate CK if unexplained muscle pain, tenderness, or dark urine occurs.',
      sourceUrl: 'https://www.drugs.com/drug_interactions.html',
    },
  ],
}
