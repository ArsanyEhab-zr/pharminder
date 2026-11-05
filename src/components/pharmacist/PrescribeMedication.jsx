import React, { useState, useEffect, useMemo } from 'react'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { checkDrugInteractions, EXTERNAL_INTERACTION_SOURCES } from '../../utils/interactionChecker'
import { parseClinicalIntake } from '../../utils/patientMedicalNotes'
import DrugInformationPanel from './DrugInformationPanel'
import GlobalDrugAutocomplete from '../common/GlobalDrugAutocomplete'
import { 
  FilePlus, 
  User, 
  Pill, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle,
  Ban,
  Info,
  Zap,
  ClipboardList,
  ExternalLink,
  FlaskConical,
  BookOpen,
  Globe
} from 'lucide-react'

export default function PrescribeMedication({ preselectedPatient, onPrescriptionSuccess }) {
  const [patients, setPatients] = useState([])
  const [medications, setMedications] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatient?.id || '')
  const [selectedMedicationId, setSelectedMedicationId] = useState('')
  const [dosageInstructions, setDosageInstructions] = useState('')
  const [frequency, setFrequency] = useState('Every 8 hours (3 times daily)')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [durationDays, setDurationDays] = useState('14')
  const [customEndDate, setCustomEndDate] = useState('')

  // Patient active meds & medical form context for clinical awareness
  const [patientActivePrescriptions, setPatientActivePrescriptions] = useState([])
  const [patientMedicalRecord, setPatientMedicalRecord] = useState(null)
  const [simulatedConditions, setSimulatedConditions] = useState(null)
  const [loadingActiveMeds, setLoadingActiveMeds] = useState(false)

  // PDR.net Modal Inspection State (when clicking any medication in active regimen or formulary)
  const [inspectedPdrMedName, setInspectedPdrMedName] = useState(null)

  // Status
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const frequencyOptions = [
    'Every 8 hours (3 times daily)',
    'Every 12 hours (2 times daily)',
    'Once daily in the morning',
    'Once daily with evening meal',
    'Once daily at bedtime',
    'Every 4 to 6 hours as needed (PRN)',
    'Once weekly'
  ]

  const durationPresets = [
    { label: '5 Days', value: '5' },
    { label: '7 Days', value: '7' },
    { label: '14 Days', value: '14' },
    { label: '30 Days', value: '30' },
    { label: '90 Days', value: '90' },
    { label: 'Custom', value: 'custom' },
  ]

  // Load Patients and Medications using supabaseAdmin
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true)
        const client = supabaseAdmin || supabase

        // 1. Fetch Patients with their medical records
        const { data: patientsData, error: patientsErr } = await client
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            patients_data (
              age,
              gender,
              height,
              weight,
              chronic_diseases,
              family_history
            )
          `)
          .eq('role', 'patient')
          .order('full_name')

        if (patientsErr) throw patientsErr
        setPatients(patientsData || [])

        // 2. Fetch Medications
        const { data: medsData, error: medsErr } = await client
          .from('medications')
          .select('id, name, description, category, dosage_form')
          .order('name')

        if (medsErr) throw medsErr
        setMedications(medsData || [])

        if (preselectedPatient?.id) {
          setSelectedPatientId(preselectedPatient.id)
        } else if (patientsData && patientsData.length > 0) {
          setSelectedPatientId(patientsData[0].id)
        }

        if (medsData && medsData.length > 0) {
          setSelectedMedicationId(medsData[0].id)
          setDosageInstructions(
            `Take 1 ${
              medsData[0].dosage_form?.toLowerCase().includes('capsule') ? 'capsule' : 'tablet'
            } with water`
          )
        }
      } catch (err) {
        console.error('Error loading prescription dependencies:', err)
        setFormError('Failed to load patients or medication database.')
      } finally {
        setLoadingInitial(false)
      }
    }

    loadData()
  }, [preselectedPatient])

  // Load selected patient's active prescriptions & latest medical form whenever patient changes
  useEffect(() => {
    if (!selectedPatientId) return

    setSimulatedConditions(null)

    const fetchPatientClinicalContext = async () => {
      try {
        setLoadingActiveMeds(true)
        const client = supabaseAdmin || supabase

        const [rxRes, medFormRes] = await Promise.all([
          client
            .from('prescriptions')
            .select(`
              id,
              dosage_instructions,
              frequency,
              start_date,
              end_date,
              status,
              medication:medication_id (
                id,
                name,
                category,
                dosage_form
              )
            `)
            .eq('patient_id', selectedPatientId)
            .eq('status', 'active'),
          client
            .from('patients_data')
            .select('*')
            .eq('user_id', selectedPatientId)
            .maybeSingle(),
        ])

        if (!rxRes.error && rxRes.data) {
          setPatientActivePrescriptions(rxRes.data)
        }
        if (!medFormRes.error && medFormRes.data) {
          setPatientMedicalRecord(medFormRes.data)
        } else {
          setPatientMedicalRecord(null)
        }
      } catch (err) {
        console.error('Error fetching patient clinical context:', err)
      } finally {
        setLoadingActiveMeds(false)
      }
    }

    fetchPatientClinicalContext()
  }, [selectedPatientId])

  const selectedMed = medications.find((m) => m.id === selectedMedicationId)
  const selectedPat = patients.find((p) => p.id === selectedPatientId)
  const selectedMedName = selectedMed?.name

  const parsedIntake = useMemo(
    () => parseClinicalIntake(patientMedicalRecord?.family_history || ''),
    [patientMedicalRecord]
  )

  const activeChronicDiseases = useMemo(() => {
    if (simulatedConditions) return simulatedConditions
    return patientMedicalRecord?.chronic_diseases || []
  }, [patientMedicalRecord, simulatedConditions])

  // Real-time Drugs.com DDI (Major/Moderate/Minor) + Disease + Allergy + Lab Interaction Evaluation
  const ddiResult = useMemo(() => {
    if (!selectedMedName) {
      return {
        severity: 'Green',
        drugsComCategory: 'Minor',
        title: 'Formulary Ready',
        description: 'Select a medication to evaluate clinical drug, disease & lab interactions.',
        isBlocked: false,
        interactions: [],
        labInteractions: [],
      }
    }
    return checkDrugInteractions(
      selectedMedName,
      patientActivePrescriptions,
      activeChronicDiseases,
      parsedIntake.allergyTags
    )
  }, [selectedMedName, patientActivePrescriptions, activeChronicDiseases, parsedIntake.allergyTags])

  const handleMedicationChange = (medId) => {
    setSelectedMedicationId(medId)
    const med = medications.find((m) => m.id === medId)
    if (med) {
      const form = med.dosage_form?.toLowerCase().includes('capsule') ? 'capsule' : 'tablet'
      setDosageInstructions(`Take 1 ${form} with full glass of water`)
    }
  }

  // Handles selection from the NIH RxTerms Global Medication Autocomplete
  const handleSelectGlobalMedication = (globalMedObj) => {
    setFormError('')
    setFormSuccess('')

    // Check if already in local state by exact name match
    const existing = medications.find(
      (m) => m.name.toLowerCase() === globalMedObj.name.toLowerCase()
    )

    if (existing) {
      setSelectedMedicationId(existing.id)
      const form = existing.dosage_form?.toLowerCase().includes('capsule') ? 'capsule' : 'tablet'
      setDosageInstructions(`Take 1 ${form} with full glass of water`)
      return
    }

    const tempId = globalMedObj.id || `global-${Date.now()}`
    const newMedRecord = {
      id: tempId,
      name: globalMedObj.name,
      description: 'Global Formulary Medication (NIH NLM RxTerms)',
      category: globalMedObj.category || 'Global NIH RxTerms Formulary',
      dosage_form: globalMedObj.dosage_form || 'Oral Tablet / Capsule',
      isGlobalTemp: true,
    }

    setMedications((prev) => [newMedRecord, ...prev])
    setSelectedMedicationId(tempId)

    const form = newMedRecord.dosage_form?.toLowerCase().includes('capsule') ? 'capsule' : 'tablet'
    setDosageInstructions(`Take 1 ${form} as directed with water`)
  }

  const handleApplyPdrDoseAdjustment = (considerationItem) => {
    setDosageInstructions(
      `[PDR.net ${considerationItem.conditionLabel} Adjusted Dose]: ${considerationItem.directive.slice(0, 140)}…`
    )
    setFormSuccess(
      `Applied PDR.net Dosing Consideration for "${considerationItem.conditionLabel}" into dosage instructions.`
    )
    if (inspectedPdrMedName) {
      setInspectedPdrMedName(null)
    }
  }

  const calculateEndDate = () => {
    if (durationDays === 'custom') {
      return customEndDate || null
    }
    const days = parseInt(durationDays, 10)
    if (isNaN(days)) return null
    const date = new Date(startDate)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const handlePrescribe = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      if (!selectedPatientId) {
        throw new Error('Please select a patient.')
      }
      if (!selectedMedicationId) {
        throw new Error('Please select a medication.')
      }

      if (ddiResult.isBlocked) {
        throw new Error(
          `Action Blocked: Major Contraindication detected (${ddiResult.title}). You cannot prescribe this medication due to clinical safety lock.`
        )
      }

      if (!dosageInstructions.trim()) {
        throw new Error('Please specify dosage instructions.')
      }

      const computedEndDate = calculateEndDate()
      const client = supabaseAdmin || supabase

      // 0. If the selected medication is a newly searched global drug (from NIH RxTerms API),
      // persist it into `public.medications` first so we have a valid PostgreSQL UUID foreign key.
      let finalMedicationId = selectedMedicationId
      const isTemporaryGlobalId =
        selectedMed?.isGlobalTemp ||
        String(selectedMedicationId).startsWith('rxterms-') ||
        String(selectedMedicationId).startsWith('custom-') ||
        String(selectedMedicationId).startsWith('global-') ||
        String(selectedMedicationId).startsWith('fallback-')

      if (isTemporaryGlobalId && selectedMed) {
        const { data: existingDbMed } = await client
          .from('medications')
          .select('id, name, description, category, dosage_form')
          .ilike('name', selectedMed.name)
          .maybeSingle()

        if (existingDbMed?.id) {
          finalMedicationId = existingDbMed.id
        } else {
          const { data: insertedMed, error: insertMedErr } = await client
            .from('medications')
            .insert({
              name: selectedMed.name,
              description:
                selectedMed.description || 'Global Formulary Medication (NIH RxTerms)',
              category: selectedMed.category || 'Global NIH RxTerms Formulary',
              dosage_form: selectedMed.dosage_form || 'Oral Tablet',
            })
            .select()
            .single()

          if (insertMedErr) throw insertMedErr
          finalMedicationId = insertedMed.id

          setMedications((prev) =>
            prev.map((m) => (m.id === selectedMedicationId ? insertedMed : m))
          )
          setSelectedMedicationId(insertedMed.id)
        }
      }

      // 1. Insert into prescriptions
      const { data: newRx, error: rxErr } = await client
        .from('prescriptions')
        .insert({
          patient_id: selectedPatientId,
          medication_id: finalMedicationId,
          dosage_instructions: dosageInstructions.trim(),
          frequency: frequency,
          start_date: startDate,
          end_date: computedEndDate,
          status: 'active',
        })
        .select(`
          id,
          dosage_instructions,
          frequency,
          start_date,
          end_date,
          status,
          medication:medication_id (
            id,
            name,
            category,
            dosage_form
          )
        `)
        .single()

      if (rxErr) throw rxErr

      // 2. Generate initial dose logs for the first 3 scheduled doses
      const doseTimes = [
        new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      ]

      await client.from('dose_logs').insert(
        doseTimes.map((t) => ({
          prescription_id: newRx.id,
          scheduled_time: t,
          status: 'pending',
        }))
      )

      setFormSuccess(
        `Successfully prescribed ${selectedMed?.name || 'medication'} to ${
          selectedPat?.full_name || 'patient'
        }! Synced to Patient Portal (/patient).`
      )

      const { data: refreshedActive } = await client
        .from('prescriptions')
        .select(`
          id,
          dosage_instructions,
          frequency,
          start_date,
          end_date,
          status,
          medication:medication_id (
            id,
            name,
            category,
            dosage_form
          )
        `)
        .eq('patient_id', selectedPatientId)
        .eq('status', 'active')

      if (refreshedActive) setPatientActivePrescriptions(refreshedActive)

      if (onPrescriptionSuccess) {
        onPrescriptionSuccess(newRx)
      }
    } catch (err) {
      console.error('Prescription failed:', err)
      setFormError(err.message || 'Failed to submit prescription.')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick test case simulator: test Major DDI, Disease Contraindication, Moderate + Lab Alert, Minor/Safe
  const simulateDdiTestCase = (testCase) => {
    setFormError('')
    setFormSuccess('')

    if (testCase === 'RED_DDI') {
      setSimulatedConditions([])
      const aspirinMed = medications.find((m) => m.name.toLowerCase().includes('aspirin'))
      if (aspirinMed) setSelectedMedicationId(aspirinMed.id)
      setPatientActivePrescriptions([
        {
          id: 'mock-warfarin',
          status: 'active',
          dosage_instructions: 'Take 1 tablet daily at 6 PM',
          frequency: 'Once daily in evening',
          medication: { name: 'Warfarin 5mg', category: 'Anticoagulant', dosage_form: '5 mg Tablet' },
        },
      ])
    } else if (testCase === 'RED_DISEASE') {
      const ibuprofenMed = medications.find((m) => m.name.toLowerCase().includes('ibuprofen'))
      if (ibuprofenMed) setSelectedMedicationId(ibuprofenMed.id)
      setSimulatedConditions(['Peptic Ulcer', 'Chronic Kidney Disease'])
      setPatientActivePrescriptions([])
    } else if (testCase === 'YELLOW_LAB') {
      // Ibuprofen + Lisinopril + Hypertension -> Moderate DDI + Lab Interaction (False-Positive THC Drug Screen!)
      setSimulatedConditions(['Hypertension', 'Chronic Kidney Disease'])
      const ibuprofenMed = medications.find((m) => m.name.toLowerCase().includes('ibuprofen'))
      const metfMed = medications.find((m) => m.name.toLowerCase().includes('metformin'))
      if (ibuprofenMed) {
        setSelectedMedicationId(ibuprofenMed.id)
        setSimulatedConditions(['Hypertension'])
      } else if (metfMed) {
        setSelectedMedicationId(metfMed.id)
      }
      setPatientActivePrescriptions([
        {
          id: 'mock-lisinopril',
          status: 'active',
          dosage_instructions: 'Take 1 tablet every morning',
          frequency: 'Once daily in the morning',
          medication: { name: 'Lisinopril 10mg', category: 'Antihypertensive', dosage_form: '10 mg Tablet' },
        },
      ])
    } else if (testCase === 'KIDNEY_DOSING') {
      // Metformin + Chronic Kidney Disease -> Highlights PDR.net Renal Dosing Consideration & Moderate Alert
      const metfMed = medications.find((m) => m.name.toLowerCase().includes('metformin'))
      if (metfMed) setSelectedMedicationId(metfMed.id)
      setSimulatedConditions(['Chronic Kidney Disease', 'Type 2 Diabetes'])
      setPatientActivePrescriptions([])
    } else if (testCase === 'GREEN') {
      setSimulatedConditions(['Type 2 Diabetes'])
      const amoxMed = medications.find((m) => m.name.toLowerCase().includes('amoxicillin'))
      if (amoxMed) setSelectedMedicationId(amoxMed.id)
      setPatientActivePrescriptions([
        {
          id: 'mock-omeprazole',
          status: 'active',
          dosage_instructions: 'Take 1 capsule 30 min before breakfast',
          frequency: 'Once daily in the morning',
          medication: { name: 'Omeprazole 20mg', category: 'Gastrointestinal', dosage_form: '20 mg Capsule' },
        },
      ])
    } else if (testCase === 'GLOBAL_DRUG') {
      setSimulatedConditions(['Type 2 Diabetes'])
      handleSelectGlobalMedication({
        id: 'rxterms-apixaban-5mg',
        name: 'Apixaban (5 mg Tab)',
        cleanName: 'Apixaban',
        dosage_form: '5 mg Oral Tablet',
        category: 'Global NIH RxTerms Formulary',
      })
    }
  }

  if (loadingInitial) {
    return (
      <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-slate-500">
        <Loader2 className="w-7 h-7 text-brand-mint animate-spin" />
        <p className="text-xs sm:text-sm font-semibold">Loading clinical formulary, Drugs.com & PDR.net engines…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Interactive Simulator Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Prescribe & Clinical Intelligence Center
            </h2>
            <a
              href={EXTERNAL_INTERACTION_SOURCES.source1.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 dark:bg-mint-950 dark:text-mint-300 font-extrabold border border-mint-200 dark:border-mint-800 hover:underline"
            >
              <span>Drugs.com Checker</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={EXTERNAL_INTERACTION_SOURCES.source2.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-dark-teal-50 text-brand-teal dark:bg-dark-teal-950 dark:text-mint-300 font-extrabold border border-dark-teal-200 dark:border-dark-teal-800 hover:underline"
            >
              <span>PDR.net Reference</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Powered by <strong>Drugs.com</strong> (Major / Moderate / Minor DDI + Lab Interference) and <strong>PDR.net</strong> (Renal & Disease Dosing Monographs)
          </p>
        </div>

        {/* 1-Click Interactive Test Scenarios */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/80 text-xs shadow-soft-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Test Cases:
          </span>
          <button
            type="button"
            onClick={() => simulateDdiTestCase('RED_DDI')}
            className="px-2.5 py-1.5 rounded-xl font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:brightness-95 active:scale-95 transition-all text-[11px] cursor-pointer"
            title="Aspirin + Warfarin (Drugs.com MAJOR Bleeding Risk)"
          >
            Major (Red): DDI
          </button>
          <button
            type="button"
            onClick={() => simulateDdiTestCase('RED_DISEASE')}
            className="px-2.5 py-1.5 rounded-xl font-extrabold bg-rose-600 text-white hover:brightness-95 active:scale-95 transition-all text-[11px] cursor-pointer"
            title="Ibuprofen + Peptic Ulcer / Kidney Disease (Major Contraindication)"
          >
            Major: Disease
          </button>
          <button
            type="button"
            onClick={() => simulateDdiTestCase('YELLOW_LAB')}
            className="px-2.5 py-1.5 rounded-xl font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:brightness-95 active:scale-95 transition-all text-[11px] cursor-pointer"
            title="Ibuprofen + Lisinopril (Moderate DDI + False-Positive Urine Drug Test Lab Alert)"
          >
            Moderate + Lab Alert
          </button>
          <button
            type="button"
            onClick={() => simulateDdiTestCase('KIDNEY_DOSING')}
            className="px-2.5 py-1.5 rounded-xl font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 hover:brightness-95 active:scale-95 transition-all text-[11px] cursor-pointer"
            title="Metformin + Chronic Kidney Disease (PDR.net Renal Dose Adjustment)"
          >
            CKD / Renal Dosing
          </button>
          <button
            type="button"
            onClick={() => simulateDdiTestCase('GREEN')}
            className="px-2.5 py-1.5 rounded-xl font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:brightness-95 active:scale-95 transition-all text-[11px] cursor-pointer"
            title="Amoxicillin + Omeprazole (Minor / Safe)"
          >
            Minor (Green)
          </button>
          <button
            type="button"
            onClick={() => simulateDdiTestCase('GLOBAL_DRUG')}
            className="px-2.5 py-1.5 rounded-xl font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 hover:brightness-95 active:scale-95 transition-all text-[11px] cursor-pointer"
            title="Apixaban 5mg (Global NIH RxTerms Drug -> Grey/Blue Alert)"
          >
            Global Drug (Blue)
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-2xl bg-mint-50 dark:bg-mint-950/60 border border-mint-200 dark:border-mint-800 flex items-start gap-3 text-xs font-semibold text-mint-900 dark:text-mint-200 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-brand-mint" />
          <span>{formSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prescription Form + Drugs.com DDI & Lab Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handlePrescribe} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-5">
            {/* 1. Patient Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-teal dark:text-mint-300" />
                Select Patient *
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-semibold shadow-inner"
              >
                {patients.length === 0 ? (
                  <option value="">No patients registered yet</option>
                ) : (
                  patients.map((pat) => (
                    <option key={pat.id} value={pat.id}>
                      {pat.full_name} ({pat.email || 'No email'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Global Medication Search (NIH RxTerms API) + Quick Formulary Selector */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-brand-mint" />
                  <span>Search Any Global Medication or Select from Formulary *</span>
                </label>
                {selectedMedName && (
                  <button
                    type="button"
                    onClick={() => setInspectedPdrMedName(selectedMedName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-teal-50 dark:bg-dark-teal-950 text-brand-teal dark:text-mint-300 border border-dark-teal-200 dark:border-dark-teal-800 text-[11px] font-black hover:bg-dark-teal-100 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Open Full-Screen PDR.net Drug Summary</span>
                  </button>
                )}
              </div>

              {/* Real Global Drug Autocomplete API (NIH NLM RxTerms) */}
              <GlobalDrugAutocomplete
                label=""
                selectedMedicationName={selectedMedName}
                onSelectMedication={handleSelectGlobalMedication}
                placeholder="Search ANY drug in the world via NIH RxTerms (e.g., Apixaban, Ozempic, Vancomycin, Levothyroxine)…"
              />

              <select
                value={selectedMedicationId}
                onChange={(e) => handleMedicationChange(e.target.value)}
                required
                aria-label="Clinical Formulary Select"
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-semibold shadow-inner"
              >
                {medications.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.name} • {med.dosage_form} ({med.category})
                  </option>
                ))}
              </select>

              {/* Clickable Formulary Medication Pills (Click any drug to select & inspect PDR.net Monograph) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
                  Quick Select & View PDR.net:
                </span>
                {medications.slice(0, 10).map((med) => {
                  const isCurrent = med.id === selectedMedicationId
                  return (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleMedicationChange(med.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-brand-teal text-white border-brand-teal shadow-2xs'
                          : 'bg-slate-50 dark:bg-dark-teal-950/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-teal-800 hover:border-brand-mint'
                      }`}
                    >
                      {med.name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Real-Time Drugs.com Interaction Checker Alert (Major [Red] / Moderate [Yellow] / Minor [Green]) */}
            <div className="space-y-3 pt-1">
              {ddiResult.severity === 'Red' && (
                <div className="p-5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/70 border-2 border-rose-400 dark:border-rose-800 shadow-soft-md shadow-rose-500/10 space-y-3.5 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Ban className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-600 text-white">
                            DRUGS.COM: {ddiResult.drugsComCategory?.toUpperCase() || 'MAJOR'} INTERACTION (RED)
                          </span>
                          {ddiResult.interactions?.[0]?.type && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200/80 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                              {ddiResult.interactions[0].type}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-sm sm:text-base text-rose-950 dark:text-rose-100 mt-1">
                          {ddiResult.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                    {ddiResult.description}
                  </p>

                  {ddiResult.interactions?.length > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                        All Detected Drugs.com Conflicts ({ddiResult.interactions.length}):
                      </span>
                      {ddiResult.interactions.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-2.5 rounded-xl bg-rose-100/70 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 font-semibold flex items-center justify-between"
                        >
                          <span>
                            {item.drugA} + {item.drugB}: {item.title}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                            {item.drugsComCategory || item.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-white/90 dark:bg-dark-teal-950/80 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1.5 shadow-xs">
                    <div className="font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Drugs.com Clinical Safety Directive:</span>
                    </div>
                    <p className="text-rose-900/95 dark:text-rose-300/95 text-xs font-medium">
                      {ddiResult.clinicalAdvice}
                    </p>
                    <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest pt-1">
                      ⛔ Prescription button is hard-locked due to Major interaction.
                    </p>
                  </div>
                </div>
              )}

              {ddiResult.severity === 'Yellow' && (
                <div className="p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 shadow-soft-xs space-y-3.5 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white">
                            DRUGS.COM: {ddiResult.drugsComCategory?.toUpperCase() || 'MODERATE'} INTERACTION (YELLOW)
                          </span>
                          {ddiResult.interactions?.[0]?.type && (
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              {ddiResult.interactions[0].type}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-sm sm:text-base text-amber-950 dark:text-amber-100 mt-1">
                          {ddiResult.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                    {ddiResult.description}
                  </p>

                  <div className="p-3.5 rounded-xl bg-white/90 dark:bg-dark-teal-950/80 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1.5 shadow-xs">
                    <div className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600" />
                      <span>Pharmacist Counseling & Monitoring Recommendation:</span>
                    </div>
                    <p className="text-amber-900/95 dark:text-amber-300/95 text-xs font-medium">
                      {ddiResult.clinicalAdvice}
                    </p>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 block pt-0.5 uppercase tracking-wide">
                      ✓ Moderate interaction — Clinical override permitted with close monitoring.
                    </span>
                  </div>
                </div>
              )}

              {ddiResult.severity === 'Green' && (
                <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 shadow-soft-xs flex items-center gap-3.5 animate-fade-in">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200">
                        DRUGS.COM: {ddiResult.drugsComCategory?.toUpperCase() || 'MINOR'} / SAFE (GREEN)
                      </span>
                      <h4 className="font-black text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">
                        {ddiResult.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 font-medium">
                      {ddiResult.description}
                    </p>
                  </div>
                </div>
              )}

              {/* 3A-Global. Graceful Grey/Blue Alert for Global NIH RxTerms Drugs outside local rule cache */}
              {ddiResult.severity === 'Blue' && (
                <div className="p-5 rounded-2xl bg-sky-50/95 dark:bg-slate-900/80 border-2 border-sky-300 dark:border-sky-800 shadow-soft-xs space-y-3 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-sky-600 text-white">
                            GLOBAL NIH RXTERMS FORMULARY (GREY / BLUE ALERT)
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-sky-300">
                            External Verification Recommended
                          </span>
                        </div>
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-sky-100 mt-1">
                          {ddiResult.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-sky-200 leading-relaxed font-bold">
                    {ddiResult.description}
                  </p>

                  <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0d2232]/90 border border-sky-200 dark:border-sky-800/70 text-xs space-y-2 shadow-2xs">
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      {ddiResult.clinicalAdvice}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setInspectedPdrMedName(selectedMedName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-teal text-white font-extrabold text-[11px] hover:bg-dark-teal-900 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                        <span>Consult PDR.net Panel</span>
                      </button>
                      <a
                        href={ddiResult.sourceUrl || EXTERNAL_INTERACTION_SOURCES.source1.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700 font-extrabold text-[11px] hover:underline"
                      >
                        <span>Verify on Drugs.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* 3B. Drugs.com Laboratory Test Interference ("Lab Interaction") Warning Feature */}
              {ddiResult.labInteractions && ddiResult.labInteractions.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 shadow-soft-xs space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                            DRUGS.COM LAB INTERACTION WARNING
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            Pathology & Toxicology Assay Interference
                          </span>
                        </div>
                        <h4 className="font-black text-xs sm:text-sm text-indigo-950 dark:text-indigo-100 mt-0.5">
                          {ddiResult.labInteractions[0].effect} ({ddiResult.labInteractions[0].drug})
                        </h4>
                      </div>
                    </div>
                    <a
                      href="https://www.drugs.com/drug_interactions.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Drugs.com Lab Ref</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="space-y-2">
                    {ddiResult.labInteractions.map((lab, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/90 dark:bg-[#0d2232]/90 border border-indigo-200/70 dark:border-indigo-800/60 text-xs space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-black text-indigo-950 dark:text-indigo-200">
                            🔬 Test Affected: {lab.labTest}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                            {lab.category} Lab Alert
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {lab.summary}
                        </p>
                        <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 pt-0.5">
                          Clinical Action: {lab.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Dosage Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Dosage & Administration Instructions *
              </label>
              <input
                type="text"
                required
                value={dosageInstructions}
                onChange={(e) => setDosageInstructions(e.target.value)}
                placeholder="e.g. Take 1 tablet by mouth twice daily with breakfast and dinner"
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint shadow-inner font-medium"
              />
            </div>

            {/* 5. Frequency Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-teal dark:text-mint-300" />
                Administration Frequency Interval *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-semibold shadow-inner"
              >
                {frequencyOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Start Date & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-tabular shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Treatment Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {durationPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDurationDays(preset.value)}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        durationDays === preset.value
                          ? 'bg-brand-teal text-white border-brand-teal dark:bg-mint-500 dark:text-dark-teal-950 shadow-xs'
                          : 'bg-slate-50 dark:bg-dark-teal-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-teal-800 hover:bg-slate-100 dark:hover:bg-dark-teal-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {durationDays === 'custom' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-tabular"
                />
              </div>
            )}

            {/* Calculated Treatment Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-teal-950/60 border border-slate-200/80 dark:border-dark-teal-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Scheduled End Date:</span>
              <span className="font-black text-slate-800 dark:text-slate-200 font-tabular">
                {calculateEndDate() || 'Ongoing / Indefinite'}
              </span>
            </div>

            {/* Submit Button: DISABLED IF MAJOR RED ALERT */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || ddiResult.isBlocked || patients.length === 0}
                className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
                  ddiResult.isBlocked
                    ? 'bg-slate-100 dark:bg-dark-teal-950 text-slate-400 dark:text-slate-500 cursor-not-allowed border-2 border-dashed border-rose-300 dark:border-rose-900/60 shadow-none'
                    : 'text-white shadow-lg shadow-brand-teal/20 hover:brightness-110 active:scale-[0.98]'
                }`}
                style={{
                  backgroundColor: ddiResult.isBlocked ? undefined : '#1B4965',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing & Authorizing Prescription…</span>
                  </>
                ) : ddiResult.isBlocked ? (
                  <>
                    <Ban className="w-5 h-5 text-rose-500 stroke-[2.5]" />
                    <span className="text-rose-600 dark:text-rose-400 font-black">
                      Prescription Blocked (Drugs.com Major Contraindication)
                    </span>
                  </>
                ) : (
                  <>
                    <FilePlus className="w-5 h-5 text-brand-mint stroke-[2.5]" />
                    <span>
                      {ddiResult.severity === 'Yellow'
                        ? 'Authorize with Moderate Clinical Precaution'
                        : 'Authorize & Issue Prescription'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 7. Embedded PDR.net Drug Information Panel for Selected Medication */}
          {selectedMedName && (
            <DrugInformationPanel
              medicationName={selectedMedName}
              patientName={selectedPat?.full_name || 'Patient'}
              patientChronicDiseases={activeChronicDiseases}
              onApplyDoseAdjustment={handleApplyPdrDoseAdjustment}
            />
          )}
        </div>

        {/* Right Col: Patient Medical Form Context + Active Regimen + External Intelligence Sources */}
        <div className="space-y-5">
          {/* 1. Patient-Submitted Medical Intake Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-brand-mint" />
                <span>Patient Medical Form</span>
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-mint-50 dark:bg-mint-950 text-brand-mint border border-mint-200 dark:border-mint-800">
                Synced from /patient
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Chronic Conditions (Screened by Drugs.com & PDR.net):
                </span>
                {activeChronicDiseases.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activeChronicDiseases.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 text-[11px]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No chronic conditions reported</span>
                )}
              </div>

              {parsedIntake.currentSymptoms && (
                <div className="pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Reported Symptoms / Complaints:
                  </span>
                  <p className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 font-semibold leading-snug">
                    {parsedIntake.currentSymptoms}
                  </p>
                </div>
              )}

              {parsedIntake.allergies && (
                <div className="pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Documented Drug / Food Allergies:
                  </span>
                  <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-teal-950 border border-slate-200 dark:border-dark-teal-800 text-slate-800 dark:text-slate-200 font-bold">
                    ⚠️ {parsedIntake.allergies}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Patient Active Regimen Context (Click any active medication to view PDR.net Monograph!) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-teal dark:text-mint-300" />
                <span>Patient’s Active Regimen</span>
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-dark-teal-950 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-teal-800/60">
                {patientActivePrescriptions.length} Active
              </span>
            </div>

            {loadingActiveMeds ? (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-mint" />
                <span>Fetching existing regimen…</span>
              </div>
            ) : patientActivePrescriptions.length === 0 ? (
              <div className="p-5 text-center rounded-2xl bg-slate-50 dark:bg-dark-teal-950/50 text-xs text-slate-500 font-medium">
                No active medications found for this patient.
              </div>
            ) : (
              <div className="space-y-2.5">
                {patientActivePrescriptions.map((rx) => {
                  const medTitle = rx.medication?.name || rx.name
                  return (
                    <div
                      key={rx.id}
                      onClick={() => setInspectedPdrMedName(medTitle)}
                      title="Click to inspect PDR.net Drug Summary"
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-dark-teal-800/50 bg-slate-50/70 dark:bg-dark-teal-950/60 hover:border-brand-mint transition-all flex items-start justify-between gap-2.5 shadow-xs cursor-pointer group"
                    >
                      <div>
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200 group-hover:text-brand-teal dark:group-hover:text-mint-300 flex items-center gap-1.5">
                          <span>{medTitle}</span>
                          <BookOpen className="w-3 h-3 text-brand-mint opacity-80" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
                          {rx.dosage_instructions}
                        </p>
                        <span className="text-[10px] text-brand-mint font-extrabold block pt-0.5">
                          {rx.frequency} • Click for PDR.net Summary
                        </span>
                      </div>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-mint-50 dark:bg-mint-950 text-brand-mint border border-mint-200 dark:border-mint-800 shrink-0">
                        Active
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. Connected Medical Knowledge Sources Status Card (Drugs.com + PDR.net) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-dark-teal-900 to-brand-teal text-white space-y-3.5 shadow-soft-lg shadow-brand-teal/20 border border-white/10">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-brand-mint" />
              <h4 className="font-black text-sm">Connected Medical Intelligence</h4>
            </div>
            <p className="text-xs text-white/85 leading-relaxed font-medium">
              Every prescription is cross-checked against two authoritative clinical pharmacology references:
            </p>
            <div className="space-y-2.5 pt-1 text-xs text-white/95">
              <a
                href={EXTERNAL_INTERACTION_SOURCES.source1.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
              >
                <div>
                  <span className="flex items-center gap-1.5 font-black text-brand-mint">
                    <span>1. Drugs.com Checker</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  <span className="text-[10px] text-white/75 block">
                    Major / Moderate / Minor DDI + Lab Interference
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-mint text-dark-teal-950">
                  Active
                </span>
              </a>

              <a
                href={EXTERNAL_INTERACTION_SOURCES.source2.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
              >
                <div>
                  <span className="flex items-center gap-1.5 font-black text-brand-mint">
                    <span>2. PDR.net Reference</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  <span className="text-[10px] text-white/75 block">
                    Drug Summaries & Renal / CKD Dosing Adjustments
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-mint text-dark-teal-950">
                  Active
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal PDR.net Drug Summary when clicking any medication in active regimen or full-screen button */}
      {inspectedPdrMedName && (
        <DrugInformationPanel
          isModal
          medicationName={inspectedPdrMedName}
          patientName={selectedPat?.full_name || 'Patient'}
          patientChronicDiseases={activeChronicDiseases}
          onApplyDoseAdjustment={handleApplyPdrDoseAdjustment}
          onClose={() => setInspectedPdrMedName(null)}
        />
      )}
    </div>
  )
}
