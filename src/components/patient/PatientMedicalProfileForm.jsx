import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { parseClinicalIntake, serializeClinicalIntake } from '../../utils/patientMedicalNotes'
import DynamicTagInput from '../common/DynamicTagInput'
import GlobalDrugAutocomplete from '../common/GlobalDrugAutocomplete'
import { upsertMedicationWithRxCui } from '../../utils/globalDrugApi'
import {
  User,
  HeartPulse,
  Activity,
  Ruler,
  Weight,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
  ClipboardList,
  Stethoscope,
  ShieldAlert,
  Sparkles,
  FileText,
  Phone,
  ChevronRight,
  ChevronLeft,
  Layers,
  Pill,
} from 'lucide-react'

const CHRONIC_DISEASE_PRESETS = [
  'Hypertension',
  'Type 2 Diabetes',
  'Asthma',
  'Chronic Kidney Disease',
  'Peptic Ulcer',
  'Liver Disease',
  'Heart Failure',
  'Hyperlipidemia',
  'Cardiovascular Disease',
  'GERD / Acid Reflux',
  'Arthritis',
  'Atrial Fibrillation',
]

const GLOBAL_DISEASE_SUGGESTIONS = [
  'Hypothyroidism',
  'Hyperthyroidism (Graves Disease)',
  'Rheumatoid Arthritis',
  'Osteoporosis',
  'COPD (Chronic Obstructive Pulmonary Disease)',
  'Crohn’s Disease',
  'Ulcerative Colitis',
  'Celiac Disease',
  'Systemic Lupus Erythematosus (SLE)',
  'Psoriasis',
  'Migraine Disorder',
  'Epilepsy / Seizure Disorder',
  'Gout',
  'Glaucoma',
  'Polycystic Ovary Syndrome (PCOS)',
  'Sleep Apnea',
  'Iron-Deficiency Anemia',
  'Multiple Sclerosis',
  'Parkinson’s Disease',
]

const SYMPTOM_PRESETS = [
  'Mild Morning Dizziness',
  'Occasional Dry Cough',
  'Stomach Discomfort / Heartburn',
  'Fatigue / Low Energy',
  'Headache',
  'Shortness of Breath',
  'Joint Stiffness',
  'Muscle Ache / Myalgia',
  'Nausea after Meals',
  'Insomnia',
]

const GLOBAL_SYMPTOM_SUGGESTIONS = [
  'Palpitations / Rapid Heartbeat',
  'Ankle Swelling / Peripheral Edema',
  'Blurred Vision',
  'Tinnitus (Ringing in Ears)',
  'Dry Mouth (Xerostomia)',
  'Tingling / Numbness in Hands or Feet',
  'Night Sweats',
  'Loss of Appetite',
  'Constipation',
  'Acid Regurgitation',
  'Lightheadedness on Standing',
  'Skin Rash / Itching',
]

const ALLERGY_PRESETS = [
  'Penicillin / Amoxicillin',
  'Aspirin / NSAIDs',
  'Sulfa Drugs',
  'Cephalosporins',
  'Codeine',
  'Shellfish',
  'Peanuts',
  'Latex',
]

const GLOBAL_ALLERGY_SUGGESTIONS = [
  'Ibuprofen',
  'Naproxen',
  'Ciprofloxacin / Fluoroquinolones',
  'Azithromycin / Macrolides',
  'Tetracycline / Doxycycline',
  'Contrast Dye (Iodinated)',
  'Morphine / Opioids',
  'Lisinopril / ACE Inhibitors',
  'Tree Nuts',
  'Soy',
  'Dairy / Lactose',
  'Bee Venom',
]

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

const ONBOARDING_STEPS = [
  { id: 1, title: 'Personal & Vitals', subtitle: 'Height, weight & blood type', icon: User },
  { id: 2, title: 'Chronic Conditions', subtitle: 'Dynamic disease tagging', icon: HeartPulse },
  { id: 3, title: 'Current Symptoms', subtitle: 'Dynamic symptom chips', icon: Stethoscope },
  { id: 4, title: 'Allergies & Global Meds', subtitle: 'NIH RxTerms & family history', icon: ShieldAlert },
]

export default function PatientMedicalProfileForm({
  user,
  profile,
  patientData,
  onProfileSaved,
}) {
  const { t } = useTranslation()
  const parsedIntake = useMemo(
    () => parseClinicalIntake(patientData?.family_history || ''),
    [patientData]
  )

  // Onboarding Mode: 'wizard' (animated step-by-step) or 'expanded' (all 4 sections visible)
  const [viewMode, setViewMode] = useState('wizard')
  const [currentStep, setCurrentStep] = useState(1)

  // 1. Personal & Vitals State (Strictly isolated to current user — zero demo defaults)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [age, setAge] = useState(patientData?.age ?? '')
  const [gender, setGender] = useState(patientData?.gender || 'Female')
  const [bloodType, setBloodType] = useState(parsedIntake.bloodType || 'O+')
  const [height, setHeight] = useState(patientData?.height ?? '')
  const [weight, setWeight] = useState(patientData?.weight ?? '')
  const [emergencyContact, setEmergencyContact] = useState(
    parsedIntake.emergencyContact || ''
  )

  // 2. Chronic Diseases State (Dynamic Tags — strictly isolated per patient)
  const [chronicDiseases, setChronicDiseases] = useState(
    Array.isArray(patientData?.chronic_diseases)
      ? patientData.chronic_diseases
      : []
  )

  // 3. Current Symptoms & Complaints State (Dynamic Tags + Notes — strictly isolated per patient)
  const [selectedSymptoms, setSelectedSymptoms] = useState(
    Array.isArray(parsedIntake.symptomTags) ? parsedIntake.symptomTags : []
  )
  const [customSymptomNotes, setCustomSymptomNotes] = useState(
    parsedIntake.currentSymptoms || ''
  )

  // 4. Allergies, Global Drug Search & Family History State (Strictly isolated per patient)
  const [selectedAllergies, setSelectedAllergies] = useState(
    Array.isArray(parsedIntake.allergyTags) ? parsedIntake.allergyTags : []
  )
  const [globalSearchMode, setGlobalSearchMode] = useState('allergy') // 'allergy' | 'home_med'
  const [addingHomeMed, setAddingHomeMed] = useState(false)
  const [homeMedFeedback, setHomeMedFeedback] = useState('')
  const [familyHistory, setFamilyHistory] = useState(
    parsedIntake.familyHistory || ''
  )

  // Submission State
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)

  // Strict State Sync & Reset whenever user.id, profile, or patientData changes
  useEffect(() => {
    setFullName(profile?.full_name || '')
    if (patientData) {
      setAge(patientData.age ?? '')
      setGender(patientData.gender || 'Female')
      setHeight(patientData.height ?? '')
      setWeight(patientData.weight ?? '')
      setChronicDiseases(
        Array.isArray(patientData.chronic_diseases)
          ? patientData.chronic_diseases
          : []
      )
      const intake = parseClinicalIntake(patientData.family_history || '')
      setBloodType(intake.bloodType || 'O+')
      setEmergencyContact(intake.emergencyContact || '')
      setSelectedSymptoms(Array.isArray(intake.symptomTags) ? intake.symptomTags : [])
      setCustomSymptomNotes(intake.currentSymptoms || '')
      setSelectedAllergies(Array.isArray(intake.allergyTags) ? intake.allergyTags : [])
      setFamilyHistory(intake.familyHistory || '')
    } else {
      // Explicitly reset all medical fields if patient has no record yet
      setAge('')
      setGender('Female')
      setHeight('')
      setWeight('')
      setChronicDiseases([])
      setBloodType('O+')
      setEmergencyContact('')
      setSelectedSymptoms([])
      setCustomSymptomNotes('')
      setSelectedAllergies([])
      setFamilyHistory('')
    }
  }, [user?.id, profile, patientData])

  // Auto-calculated BMI & clinical interpretation
  const bmiInfo = useMemo(() => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (!h || !w || h <= 40 || w <= 10) {
      return { value: '—', label: 'Enter Height & Weight', color: 'text-slate-400 bg-slate-100' }
    }
    const bmiVal = w / Math.pow(h / 100, 2)
    const rounded = bmiVal.toFixed(1)
    if (bmiVal < 18.5) {
      return { value: rounded, label: 'Underweight', color: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 border-amber-300' }
    }
    if (bmiVal < 25) {
      return { value: rounded, label: 'Healthy Normal', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' }
    }
    if (bmiVal < 30) {
      return { value: rounded, label: 'Overweight', color: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 border-amber-300' }
    }
    return { value: rounded, label: 'Clinical Obesity', color: 'text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 border-rose-300' }
  }, [height, weight])

  const handleSymptomsChange = (newTags) => {
    setSelectedSymptoms(newTags)
    setCustomSymptomNotes(newTags.join(', '))
  }

  // Handles selection from NIH RxTerms Global Medication Autocomplete in Patient Portal
  const handlePatientSelectGlobalDrug = async (globalMedObj) => {
    const medName = globalMedObj.cleanName || globalMedObj.name

    if (globalSearchMode === 'allergy') {
      if (!selectedAllergies.some((a) => a.toLowerCase() === medName.toLowerCase())) {
        setSelectedAllergies((prev) => [...prev, medName])
      }
      setHomeMedFeedback(`Added "${medName}" to your Known Drug Allergies list!`)
      setTimeout(() => setHomeMedFeedback(''), 4000)
      return
    }

    // If 'home_med' mode: add this global medication directly to the patient's active medications in Supabase!
    if (!user?.id) return
    try {
      setAddingHomeMed(true)
      setHomeMedFeedback('')
      const client = supabaseAdmin || supabase

      // 1. Upsert medication with its resolved NIH RxCUI into public.medications
      const persistedMed = await upsertMedicationWithRxCui(client, {
        name: globalMedObj.name,
        rxcui: globalMedObj.rxcui,
        ingredientRxcui: globalMedObj.ingredientRxcui,
        description:
          globalMedObj.description ||
          'Patient-reported medication via NIH RxTerms Global Formulary',
        category: globalMedObj.category || 'NIH RxTerms Formulary',
        dosage_form: globalMedObj.dosage_form || 'Oral Tablet',
      })
      const medicationId = persistedMed.id

      // 2. Insert into public.prescriptions as an active patient-reported regimen
      const todayIso = new Date().toISOString().split('T')[0]
      const endThirtyIso = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

      const { error: rxErr } = await client.from('prescriptions').insert({
        patient_id: user.id,
        medication_id: medicationId,
        dosage_instructions: `Patient-reported regimen (${globalMedObj.dosage_form || 'Oral'}${
          persistedMed.rxcui ? ` • RxCUI: ${persistedMed.rxcui}` : ''
        }) — Take as directed`,
        frequency: 'Once daily in the morning',
        start_date: todayIso,
        end_date: endThirtyIso,
        status: 'active',
      })

      if (rxErr) throw rxErr

      setHomeMedFeedback(
        `Added "${globalMedObj.name}"${
          persistedMed.rxcui ? ` (RxCUI: ${persistedMed.rxcui})` : ''
        } to your Active Medications & synced with your Doctor!`
      )
      if (onProfileSaved) {
        await onProfileSaved()
      }
    } catch (err) {
      console.error('Failed to add patient global medication:', err)
      setHomeMedFeedback('Added to profile notes.')
    } finally {
      setAddingHomeMed(false)
      setTimeout(() => setHomeMedFeedback(''), 5000)
    }
  }

  // Save complete medical profile to Supabase + emit instant Realtime/BroadcastChannel sync
  const handleSaveMedicalProfile = async (e) => {
    e.preventDefault()
    if (!user?.id) return

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const client = supabaseAdmin || supabase

      // 1. Strictly update/upsert public.profiles for this exact user.id
      const { error: profErr } = await client
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName.trim() || 'Patient',
          email: user.email,
          role: 'patient',
        })
        .eq('id', user.id)

      if (profErr) throw profErr

      // 2. Serialize symptoms, allergies, blood type, emergency contact, and family history
      const combinedSymptoms =
        selectedSymptoms.length > 0
          ? selectedSymptoms.join(', ')
          : customSymptomNotes.trim()
      const combinedAllergies = selectedAllergies.join(', ')

      const serializedIntake = serializeClinicalIntake({
        currentSymptoms: combinedSymptoms,
        allergies: combinedAllergies,
        bloodType,
        emergencyContact,
        familyHistory,
      })

      // 3. Check if row(s) exist for user_id in patients_data and strictly filter by user.id
      const { data: existingRows } = await client
        .from('patients_data')
        .select('user_id')
        .eq('user_id', user.id)

      const payload = {
        user_id: user.id,
        age: age ? parseInt(age, 10) : null,
        gender,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        chronic_diseases: chronicDiseases,
        family_history: serializedIntake,
      }

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const { error: updateErr } = await client
          .from('patients_data')
          .update(payload)
          .eq('user_id', user.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await client
          .from('patients_data')
          .insert(payload)
        if (insertErr) throw insertErr
      }

      // 4. Broadcast live sync event so Pharmacist Dashboard updates immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pharminder_last_medical_profile_update', String(Date.now()))
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('pharminder-clinical-sync')
            bc.postMessage({
              type: 'PATIENT_MEDICAL_PROFILE_SAVED',
              userId: user.id,
              timestamp: Date.now(),
            })
            bc.close()
          }
        } catch {
          // Ignore storage errors in private browsing
        }
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLastSavedAt(nowStr)
      setSaveSuccess(
        'Your Medical Profile, Chronic Conditions & Current Symptoms have been saved to Supabase and synced live with your Doctor/Pharmacist!'
      )

      if (onProfileSaved) {
        await onProfileSaved()
      }
    } catch (err) {
      console.error('Failed to save patient medical profile:', err)
      setSaveError(err.message || 'Could not save medical profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const showSection = (stepNumber) => viewMode === 'expanded' || currentStep === stepNumber

  return (
    <div className="space-y-6">
      {/* Header Banner with Warm Gradients */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-mint-50 via-white to-amber-50/40 dark:from-[#0d2232] dark:via-[#091b28] dark:to-mint-950/35 border-2 border-mint-200/80 dark:border-mint-800/60 shadow-soft-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-mint text-dark-teal-950 shadow-xs">
              <ClipboardList className="w-3.5 h-3.5" />
              Interactive Medical Intake Flow
            </span>
            <span className="text-xs font-bold text-brand-teal dark:text-mint-300 bg-white/90 dark:bg-dark-teal-950 px-3 py-1 rounded-full border border-slate-200 dark:border-dark-teal-800">
              Synced Live with Doctor Portal (/pharmacist)
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('profileForm.title')}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed">
            {t('profileForm.subtitle')}
          </p>
        </div>

        {/* BMI Live Badge Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-teal-950/90 border border-slate-200/80 dark:border-dark-teal-800 shadow-soft-xs flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-mint-50 dark:bg-mint-950 text-brand-mint flex items-center justify-center font-black shadow-inner">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Calculated Body Mass Index
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-tabular">
                {bmiInfo.value}
              </span>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${bmiInfo.color}`}
              >
                {bmiInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Stepper Bar & View Mode Toggle */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-brand-teal dark:text-mint-300">
              {viewMode === 'wizard' ? `Guided Onboarding • Step ${currentStep} of 4` : 'All 4 Clinical Sections Expanded'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'wizard' ? 'expanded' : 'wizard'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-dark-teal-950 text-slate-700 dark:text-slate-200 hover:bg-mint-50 dark:hover:bg-dark-teal-900 border border-slate-200 dark:border-dark-teal-800 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Layers className="w-3.5 h-3.5 text-brand-mint" />
            <span>{viewMode === 'wizard' ? 'Expand All 4 Sections at Once' : 'Switch to Guided Step-by-Step'}</span>
          </button>
        </div>

        {/* 4 Interactive Step Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ONBOARDING_STEPS.map((step) => {
            const StepIcon = step.icon
            const isActive = viewMode === 'wizard' && currentStep === step.id
            const isCompleted = viewMode === 'expanded' || currentStep > step.id

            return (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                key={step.id}
                type="button"
                onClick={() => {
                  setViewMode('wizard')
                  setCurrentStep(step.id)
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-mint/20 to-teal-500/10 border-brand-mint text-slate-900 dark:text-white shadow-xs'
                    : isCompleted
                      ? 'bg-mint-50/50 dark:bg-dark-teal-950/70 border-mint-200/80 dark:border-dark-teal-800 text-slate-700 dark:text-slate-200'
                      : 'bg-slate-50 dark:bg-dark-teal-950/40 border-slate-200/60 dark:border-dark-teal-800/40 text-slate-500 dark:text-slate-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                    isActive
                      ? 'bg-brand-mint text-dark-teal-950 shadow-xs'
                      : isCompleted
                        ? 'bg-brand-teal text-brand-mint'
                        : 'bg-slate-200/70 dark:bg-dark-teal-900 text-slate-500'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">
                    {step.id}. {step.title}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {step.subtitle}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Feedback Toast Banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 sm:p-5 rounded-2xl bg-mint-50 dark:bg-mint-950/80 border-2 border-brand-mint text-mint-950 dark:text-mint-100 flex items-start gap-3 shadow-md"
          >
            <CheckCircle2 className="w-6 h-6 text-brand-mint shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-black text-sm sm:text-base">
                Medical Record Updated & Shared with Clinical Team!
              </h4>
              <p className="text-xs sm:text-sm font-medium opacity-90">{saveSuccess}</p>
              {lastSavedAt && (
                <span className="text-[11px] font-bold text-brand-teal dark:text-mint-300 block">
                  Last synced at {lastSavedAt}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 text-xs sm:text-sm font-bold">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveMedicalProfile} className="space-y-6">
        <div className={viewMode === 'expanded' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6'}>
          {/* SECTION 1: Personal Information & Biometric Vitals */}
          {showSection(1) && (
            <motion.div
              key="section-1"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-dark-teal-800/60 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-mint-50 dark:bg-mint-950 text-brand-mint flex items-center justify-center shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                    {t('profileForm.personalVitals')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('profileForm.vitalsDesc')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    {t('profileForm.fullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl text-sm sm:text-base font-bold border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    {t('profileForm.age')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl text-sm sm:text-base font-bold font-tabular border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    {t('profileForm.gender')}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl text-sm sm:text-base font-bold border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  >
                    <option value="Female">{t('profileForm.female')}</option>
                    <option value="Male">{t('profileForm.male')}</option>
                    <option value="Other">{t('profileForm.other')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-brand-mint" />
                    <span>{t('profileForm.height')}</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl text-sm sm:text-base font-bold font-tabular border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Weight className="w-4 h-4 text-brand-mint" />
                    <span>{t('profileForm.weight')}</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl text-sm sm:text-base font-bold font-tabular border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    {t('profileForm.bloodType')}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BLOOD_TYPES.map((bt) => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBloodType(bt)}
                        className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          bloodType === bt
                            ? 'bg-brand-mint text-dark-teal-950 border-brand-mint shadow-xs'
                            : 'bg-slate-50 dark:bg-dark-teal-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-teal-800'
                        }`}
                      >
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-mint" />
                    <span>{t('profileForm.emergencyContact')}</span>
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder={t('profileForm.emergencyPlaceholder')}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>
              </div>

              {viewMode === 'wizard' && (
                <div className="pt-4 border-t border-slate-100 dark:border-dark-teal-800/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-teal text-white text-xs sm:text-sm font-extrabold hover:bg-dark-teal-900 transition-all cursor-pointer"
                  >
                    <span>Next: Chronic Conditions</span>
                    <ChevronRight className="w-4 h-4 text-brand-mint" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 2: Dynamic Chronic Diseases & Diagnosed Conditions Tagger */}
          {showSection(2) && (
            <motion.div
              key="section-2"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-teal-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center shadow-xs">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                      {t('profileForm.chronicSection')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t('profileForm.chronicDesc')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {chronicDiseases.length} Active
                </span>
              </div>

              <DynamicTagInput
                label="Add Any Chronic Disease or Medical Condition"
                helperText="Type any condition & press Enter"
                tags={chronicDiseases}
                onChangeTags={setChronicDiseases}
                presets={CHRONIC_DISEASE_PRESETS}
                globalSuggestions={GLOBAL_DISEASE_SUGGESTIONS}
                accentColor="rose"
                placeholder={t('profileForm.chronicPlaceholder')}
              />

              {viewMode === 'wizard' && (
                <div className="pt-4 border-t border-slate-100 dark:border-dark-teal-800/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-dark-teal-950 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-teal text-white text-xs sm:text-sm font-extrabold hover:bg-dark-teal-900 transition-all cursor-pointer"
                  >
                    <span>Next: Current Symptoms</span>
                    <ChevronRight className="w-4 h-4 text-brand-mint" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 3: Dynamic Current Symptoms & What You Are Feeling Today */}
          {showSection(3) && (
            <motion.div
              key="section-3"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-dark-teal-800/60 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-xs">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                    {t('profileForm.symptomsSection')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('profileForm.symptomsDesc')}
                  </p>
                </div>
              </div>

              <DynamicTagInput
                label="Add Any Symptom or Side Effect"
                helperText="Type any symptom & press Enter"
                tags={selectedSymptoms}
                onChangeTags={handleSymptomsChange}
                presets={SYMPTOM_PRESETS}
                globalSuggestions={GLOBAL_SYMPTOM_SUGGESTIONS}
                accentColor="amber"
                placeholder={t('profileForm.symptomsPlaceholder')}
              />

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  {t('profileForm.symptomsNotes')}
                </label>
                <textarea
                  rows={2}
                  value={customSymptomNotes}
                  onChange={(e) => setCustomSymptomNotes(e.target.value)}
                  placeholder={t('profileForm.symptomsNotesPlaceholder')}
                  className="w-full p-4 rounded-2xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint leading-relaxed"
                />
              </div>

              {viewMode === 'wizard' && (
                <div className="pt-4 border-t border-slate-100 dark:border-dark-teal-800/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-dark-teal-950 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-teal text-white text-xs sm:text-sm font-extrabold hover:bg-dark-teal-900 transition-all cursor-pointer"
                  >
                    <span>Next: Allergies & Global Meds</span>
                    <ChevronRight className="w-4 h-4 text-brand-mint" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 4: Dynamic Drug/Food Allergies, NIH RxTerms Global Drug Search & Family History */}
          {showSection(4) && (
            <motion.div
              key="section-4"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-5"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-dark-teal-800/60 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-dark-teal-50 dark:bg-dark-teal-950 text-brand-teal dark:text-mint-300 flex items-center justify-center shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                    {t('profileForm.allergiesSection')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('profileForm.allergiesDesc')}
                  </p>
                </div>
              </div>

              {/* Real Global Drug Autocomplete API (NIH RxTerms) inside Patient Medical Profile Form */}
              <div className="p-4 rounded-2xl bg-mint-50/50 dark:bg-dark-teal-950/60 border border-mint-200/80 dark:border-dark-teal-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-brand-mint" />
                    <span>{t('profileForm.globalDrugSearchTitle')}</span>
                  </span>
                  <div className="inline-flex rounded-xl p-0.5 bg-white dark:bg-[#0d2232] border border-slate-200 dark:border-dark-teal-800 text-[11px] font-extrabold">
                    <button
                      type="button"
                      onClick={() => setGlobalSearchMode('allergy')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        globalSearchMode === 'allergy'
                          ? 'bg-brand-teal text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t('profileForm.addAsAllergy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalSearchMode('home_med')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        globalSearchMode === 'home_med'
                          ? 'bg-brand-mint text-dark-teal-950'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t('profileForm.addToActiveMeds')}
                    </button>
                  </div>
                </div>

                <GlobalDrugAutocomplete
                  label=""
                  compact
                  clearOnSelect
                  onSelectMedication={handlePatientSelectGlobalDrug}
                  placeholder={
                    globalSearchMode === 'allergy'
                      ? t('profileForm.searchAllergyPlaceholder')
                      : t('profileForm.searchHomeMedPlaceholder')
                  }
                />

                {addingHomeMed && (
                  <p className="text-xs font-bold text-brand-teal dark:text-mint-300 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing global medication to your active profile…</span>
                  </p>
                )}

                {homeMedFeedback && (
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint" />
                    <span>{homeMedFeedback}</span>
                  </p>
                )}
              </div>

              {/* Dynamic Creatable Tag Input for Known Drug & Food Allergies */}
              <DynamicTagInput
                label={t('profileForm.knownAllergiesLabel')}
                helperText="Type any allergy & press Enter"
                tags={selectedAllergies}
                onChangeTags={setSelectedAllergies}
                presets={ALLERGY_PRESETS}
                globalSuggestions={GLOBAL_ALLERGY_SUGGESTIONS}
                accentColor="teal"
                badgePrefix="⚠️ "
                placeholder={t('profileForm.knownAllergiesPlaceholder')}
              />

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-mint" />
                  <span>{t('profileForm.familyHistoryLabel')}</span>
                </label>
                <textarea
                  rows={3}
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                  placeholder={t('profileForm.familyHistoryPlaceholder')}
                  className="w-full p-4 rounded-2xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint leading-relaxed"
                />
              </div>

              {viewMode === 'wizard' && (
                <div className="pt-4 border-t border-slate-100 dark:border-dark-teal-800/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-dark-teal-950 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <span className="text-xs font-bold text-brand-mint">
                    Step 4 of 4 Complete — Click Save below!
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Save Bar */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border-2 border-mint-200 dark:border-mint-800/70 shadow-soft-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint-50 dark:bg-mint-950 text-brand-mint flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                {t('profileForm.saveBarTitle')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('profileForm.saveBarDesc')}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={saving}
            className="min-h-[54px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-mint to-teal-400 hover:from-mint-400 hover:to-teal-500 text-dark-teal-950 font-black text-sm sm:text-base shadow-lg shadow-brand-mint/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('profileForm.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 stroke-[2.5]" />
                <span>{t('profileForm.saveButton')}</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  )
}
