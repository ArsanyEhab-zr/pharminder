import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { fetchLinkedPatientProfiles } from '../../utils/doctorRoster'
import {
  verifyLiveDrugInteractions,
  checkMultiDrugCombination,
  EXTERNAL_INTERACTION_SOURCES,
} from '../../utils/interactionChecker'
import {
  upsertMedicationWithRxCui,
  extractRxCui,
} from '../../utils/globalDrugApi'
import { parseClinicalIntake } from '../../utils/patientMedicalNotes'
import DrugInformationPanel from './DrugInformationPanel'
import GlobalDrugAutocomplete from '../common/GlobalDrugAutocomplete'
import Tooltip from '../common/Tooltip'
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
  OctagonAlert,
  AlertTriangle,
  Ban,
  Info,
  ClipboardList,
  ExternalLink,
  FlaskConical,
  BookOpen,
  Lock,
  Hash,
  X,
  Activity,
  Zap,
  ChevronDown,
  Lightbulb,
} from 'lucide-react'

const createEmptyDdiResult = () => ({
  severity: 'Green',
  rxNavSeverity: 'None',
  drugsComCategory: 'Minor',
  riskPercentage: 0,
  riskLabel: 'READY FOR CLINICAL SCREENING',
  layerUsed: '',
  title: 'Ready for Clinical Verification',
  description:
    'Search and select a medication to run Universal 3-Layer Clinical DDI Screening (RxNorm + Pharmacological Matrix + Live OpenFDA Labels) for this patient.',
  isBlocked: false,
  requiresAcknowledgment: false,
  interactions: [],
  diseaseAlerts: [],
  allergyAlerts: [],
  labInteractions: [],
  queriedRxcuis: [],
})

export default function PrescribeMedication({
  preselectedPatient,
  onPrescriptionSuccess,
}) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const doctorId = profile?.id || user?.id
  const [patients, setPatients] = useState([])
  const [medications, setMedications] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState(
    preselectedPatient?.id || ''
  )
  const [selectedMedicationId, setSelectedMedicationId] = useState('')
  const [dosageInstructions, setDosageInstructions] = useState('')
  const [frequency, setFrequency] = useState('Every 8 hours (3 times daily)')
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [durationDays, setDurationDays] = useState('14')
  const [customEndDate, setCustomEndDate] = useState('')

  // Strictly isolated per-patient clinical state arrays (reset on every patient switch)
  const [activePrescriptions, setActivePrescriptions] = useState([])
  const [chronicConditions, setChronicConditions] = useState([])
  const [currentSymptoms, setCurrentSymptoms] = useState([])
  const [patientAllergies, setPatientAllergies] = useState([])
  const [profileHomeMeds, setProfileHomeMeds] = useState([])
  const [interactions, setInteractions] = useState([])
  const [patientMedicalRecord, setPatientMedicalRecord] = useState(null)
  const [loadingActiveMeds, setLoadingActiveMeds] = useState(false)

  // Live Multi-Drug Interaction Sandbox State (3-Layer Clinical Verifier)
  const [sandboxMedA, setSandboxMedA] = useState('')
  const [sandboxMedB, setSandboxMedB] = useState('')
  const [sandboxExtraMeds, setSandboxExtraMeds] = useState('')
  const [sandboxResult, setSandboxResult] = useState(null)
  const [runningSandbox, setRunningSandbox] = useState(false)

  // Aliases for downstream UI rendering
  const patientActivePrescriptions = activePrescriptions
  const activeChronicDiseases = chronicConditions

  // Live Interaction Verification State
  const [isVerifyingInteractions, setIsVerifyingInteractions] = useState(false)
  const [ddiResult, setDdiResult] = useState(createEmptyDdiResult)
  const [acknowledgeModerateRisk, setAcknowledgeModerateRisk] = useState(false)
  const [showHardLockModal, setShowHardLockModal] = useState(false)
  const [showInlineClinicalDetails, setShowInlineClinicalDetails] = useState(false)
  const [showModalClinicalDetails, setShowModalClinicalDetails] = useState(false)

  // PDR.net Modal Inspection State
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
    'Once weekly',
  ]

  const durationPresets = [
    { label: '5 Days', value: '5' },
    { label: '7 Days', value: '7' },
    { label: '14 Days', value: '14' },
    { label: '30 Days', value: '30' },
    { label: '90 Days', value: '90' },
    { label: 'Custom', value: 'custom' },
  ]

  // Load strictly linked doctor_patients roster and Previously Prescribed Medications from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true)
        const client = supabaseAdmin || supabase

        // 1. Fetch strictly isolated Patients linked to logged-in doctor via doctor_patients
        const linkedPatients = doctorId ? await fetchLinkedPatientProfiles(doctorId) : []
        const isolatedPatients = linkedPatients
          .filter((p) => p.role === 'patient')
          .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
        setPatients(isolatedPatients)

        // 2. Fetch existing Medications from Supabase
        const { data: medsData, error: medsErr } = await client
          .from('medications')
          .select('*')
          .order('name')

        if (medsErr) throw medsErr
        const enrichedMeds = (medsData || []).map((m) => ({
          ...m,
          rxcui: extractRxCui(m),
        }))
        setMedications(enrichedMeds)

        if (preselectedPatient?.id && isolatedPatients.some((p) => p.id === preselectedPatient.id)) {
          setSelectedPatientId(preselectedPatient.id)
        } else if (isolatedPatients.length > 0) {
          setSelectedPatientId(isolatedPatients[0].id)
        } else {
          setSelectedPatientId('')
        }
      } catch (err) {
        console.error('Error loading prescription dependencies:', err)
        setFormError('Failed to load patients or medication database.')
      } finally {
        setLoadingInitial(false)
      }
    }

    loadData()
  }, [preselectedPatient?.id, doctorId])

  // Load selected patient's active prescriptions & latest medical form whenever selectedPatientId changes
  useEffect(() => {
    let isCancelled = false

    // CRITICAL STATE RESET: Clear ALL previous patient state immediately before fetching
    setActivePrescriptions([])
    setChronicConditions([])
    setInteractions([])
    setCurrentSymptoms([])
    setPatientAllergies([])
    setProfileHomeMeds([])
    setPatientMedicalRecord(null)
    setSelectedMedicationId('')
    setDosageInstructions('')
    setInspectedPdrMedName(null)
    setAcknowledgeModerateRisk(false)
    setShowHardLockModal(false)
    setFormError('')
    setFormSuccess('')
    setDdiResult(createEmptyDdiResult())

    if (!selectedPatientId) {
      setLoadingActiveMeds(false)
      return
    }

    const fetchPatientClinicalContext = async () => {
      try {
        setLoadingActiveMeds(true)
        const client = supabaseAdmin || supabase

        const [rxRes, medFormRes] = await Promise.all([
          client
            .from('prescriptions')
            .select(`
              id,
              patient_id,
              dosage_instructions,
              frequency,
              start_date,
              end_date,
              status,
              medication:medication_id (
                id,
                name,
                description,
                category,
                dosage_form
              )
            `)
            .eq('patient_id', selectedPatientId)
            .eq('status', 'active'),
          client
            .from('patients_data')
            .select('*')
            .eq('user_id', selectedPatientId),
        ])

        if (isCancelled) return

        // Strictly isolate active prescriptions to selectedPatientId
        if (!rxRes.error && Array.isArray(rxRes.data)) {
          const isolatedRx = rxRes.data.filter(
            (rx) => String(rx.patient_id) === String(selectedPatientId)
          )
          setActivePrescriptions(isolatedRx)
        } else {
          setActivePrescriptions([])
        }

        // Strictly isolate patients_data to selectedPatientId
        if (!medFormRes.error && Array.isArray(medFormRes.data)) {
          const matchingRows = medFormRes.data.filter(
            (row) => String(row.user_id) === String(selectedPatientId)
          )
          const latestRecord =
            matchingRows.length > 0
              ? matchingRows[matchingRows.length - 1]
              : null

          setPatientMedicalRecord(latestRecord)
          setChronicConditions(
            Array.isArray(latestRecord?.chronic_diseases)
              ? [...latestRecord.chronic_diseases]
              : []
          )

          const intake = parseClinicalIntake(latestRecord?.family_history || '')
          setCurrentSymptoms(
            Array.isArray(intake.symptomTags) ? [...intake.symptomTags] : []
          )
          setPatientAllergies(
            Array.isArray(intake.allergyTags) ? [...intake.allergyTags] : []
          )
          setProfileHomeMeds(
            Array.isArray(intake.homeMedTags) ? [...intake.homeMedTags] : []
          )
        } else {
          setPatientMedicalRecord(null)
          setChronicConditions([])
          setCurrentSymptoms([])
          setPatientAllergies([])
          setProfileHomeMeds([])
        }
      } catch (err) {
        console.error('Error fetching patient clinical context:', err)
        if (!isCancelled) {
          setActivePrescriptions([])
          setChronicConditions([])
          setCurrentSymptoms([])
          setPatientAllergies([])
          setPatientMedicalRecord(null)
        }
      } finally {
        if (!isCancelled) {
          setLoadingActiveMeds(false)
        }
      }
    }

    fetchPatientClinicalContext()

    return () => {
      isCancelled = true
    }
  }, [selectedPatientId])

  const selectedMed = medications.find((m) => m.id === selectedMedicationId)
  const selectedPat = patients.find((p) => p.id === selectedPatientId)
  const selectedMedName = selectedMed?.name
  const selectedMedRxcui = extractRxCui(selectedMed)

  const parsedIntake = useMemo(() => {
    const base = parseClinicalIntake(patientMedicalRecord?.family_history || '')
    return {
      ...base,
      symptomTags: currentSymptoms,
      currentSymptoms:
        currentSymptoms.length > 0
          ? currentSymptoms.join(', ')
          : base.currentSymptoms,
      allergyTags: patientAllergies,
      allergies:
        patientAllergies.length > 0
          ? patientAllergies.join(', ')
          : base.allergies,
    }
  }, [patientMedicalRecord, currentSymptoms, patientAllergies])

  // Live Asynchronous Interaction Verification whenever drug or patient context changes
  useEffect(() => {
    let isCancelled = false

    // Reset moderate risk acknowledgment whenever medication or patient context changes
    setAcknowledgeModerateRisk(false)
    setShowHardLockModal(false)

    if (!selectedMed || !selectedPatientId) {
      setIsVerifyingInteractions(false)
      setInteractions([])
      setDdiResult(createEmptyDdiResult())
      return
    }

    const runLiveVerification = async () => {
      setIsVerifyingInteractions(true)
      try {
        const result = await verifyLiveDrugInteractions(
          selectedMed,
          activePrescriptions,
          chronicConditions,
          patientAllergies,
          profileHomeMeds
        )

        if (!isCancelled) {
          setDdiResult(result)
          setInteractions(Array.isArray(result.interactions) ? result.interactions : [])
          if (result.severity === 'Red' || result.isBlocked) {
            setShowHardLockModal(true)
          }
          // Backfill resolved RxCUI into local medication state if newly resolved
          if (result.candidateRxcui && !selectedMed.rxcui) {
            setMedications((prev) =>
              prev.map((m) =>
                m.id === selectedMed.id
                  ? { ...m, rxcui: result.candidateRxcui }
                  : m
              )
            )
          }
        }
      } catch (err) {
        console.error('Interaction verification error:', err)
      } finally {
        if (!isCancelled) {
          setIsVerifyingInteractions(false)
        }
      }
    }

    runLiveVerification()

    return () => {
      isCancelled = true
    }
  }, [
    selectedPatientId,
    selectedMed?.id,
    selectedMed?.name,
    activePrescriptions,
    chronicConditions,
    patientAllergies,
    profileHomeMeds,
  ])

  const handleMedicationChange = (medId) => {
    setSelectedMedicationId(medId)
    const med = medications.find((m) => m.id === medId)
    if (med) {
      const form = med.dosage_form?.toLowerCase().includes('capsule')
        ? 'capsule'
        : 'tablet'
      setDosageInstructions(`Take 1 ${form} with full glass of water`)
    }
  }

  // Handles selection from the Live NIH RxTerms Global Medication Autocomplete
  const handleSelectGlobalMedication = (globalMedObj) => {
    setFormError('')
    setFormSuccess('')

    // Check if already in local state by exact name match
    const existing = medications.find(
      (m) => m.name.toLowerCase() === globalMedObj.name.toLowerCase()
    )

    if (existing) {
      // Ensure RxCUI is attached if newly fetched from RxTerms
      if (globalMedObj.rxcui && !existing.rxcui) {
        setMedications((prev) =>
          prev.map((m) =>
            m.id === existing.id
              ? {
                  ...m,
                  rxcui: globalMedObj.rxcui,
                  ingredientRxcui: globalMedObj.ingredientRxcui,
                }
              : m
          )
        )
      }
      setSelectedMedicationId(existing.id)
      const form = existing.dosage_form?.toLowerCase().includes('capsule')
        ? 'capsule'
        : 'tablet'
      setDosageInstructions(`Take 1 ${form} with full glass of water`)
      return
    }

    const tempId = globalMedObj.id || `rxterms-${Date.now()}`
    const newMedRecord = {
      id: tempId,
      name: globalMedObj.name,
      cleanName: globalMedObj.cleanName,
      rxcui: globalMedObj.rxcui || null,
      ingredientRxcui:
        globalMedObj.ingredientRxcui || globalMedObj.rxcui || null,
      description:
        globalMedObj.description ||
        'Global Formulary Medication (NIH NLM RxTerms)',
      category: globalMedObj.category || 'NIH RxTerms Formulary',
      dosage_form: globalMedObj.dosage_form || 'Oral Tablet / Capsule',
      isGlobalTemp: true,
    }

    setMedications((prev) => [newMedRecord, ...prev])
    setSelectedMedicationId(tempId)

    const form = newMedRecord.dosage_form?.toLowerCase().includes('capsule')
      ? 'capsule'
      : 'tablet'
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

  // Compute strict clinical lock states
  const isHardLocked = Boolean(
    ddiResult.isBlocked || ddiResult.severity === 'Red'
  )
  const isModerateUnacknowledged = Boolean(
    ddiResult.severity === 'Yellow' && !acknowledgeModerateRisk
  )
  const isSubmitDisabled =
    submitting ||
    isVerifyingInteractions ||
    isHardLocked ||
    isModerateUnacknowledged ||
    patients.length === 0 ||
    !selectedMedicationId

  const handlePrescribe = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (isVerifyingInteractions) {
      setFormError(
        'Please wait for live NIH RxNav clinical interaction verification to finish.'
      )
      return
    }

    if (isHardLocked) {
      setShowHardLockModal(true)
      setFormError(
        `HARD LOCK: High/Major clinical interaction detected (${ddiResult.title}). Prescription is strictly blocked.`
      )
      return
    }

    if (isModerateUnacknowledged) {
      setFormError(
        'Moderate clinical interaction detected. You must check "I acknowledge the clinical risk." before prescribing.'
      )
      return
    }

    setSubmitting(true)

    try {
      if (!selectedPatientId) {
        throw new Error('Please select a patient.')
      }
      if (!selectedMedicationId || !selectedMed) {
        throw new Error('Please select a medication.')
      }
      if (!dosageInstructions.trim()) {
        throw new Error('Please specify dosage instructions.')
      }

      const computedEndDate = calculateEndDate()
      const client = supabaseAdmin || supabase

      // 1. Persist the medication and its fetched NIH RxCUI into Supabase `public.medications`
      const persistedMed = await upsertMedicationWithRxCui(client, {
        ...selectedMed,
        rxcui:
          selectedMed.rxcui ||
          ddiResult.candidateRxcui ||
          extractRxCui(selectedMed),
      })

      const finalMedicationId = persistedMed.id

      setMedications((prev) =>
        prev.map((m) => (m.id === selectedMedicationId ? persistedMed : m))
      )
      setSelectedMedicationId(finalMedicationId)

      // 2. Insert into prescriptions
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
            description,
            category,
            dosage_form
          )
        `)
        .single()

      if (rxErr) throw rxErr

      // 3. Generate initial pending dose logs for the first 3 scheduled doses
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
        `Successfully prescribed ${persistedMed.name}${
          persistedMed.rxcui ? ` (RxCUI: ${persistedMed.rxcui})` : ''
        } to ${
          selectedPat?.full_name || 'patient'
        }! Synced to Patient Portal.`
      )

      const { data: refreshedActive } = await client
        .from('prescriptions')
        .select(`
          id,
          patient_id,
          dosage_instructions,
          frequency,
          start_date,
          end_date,
          status,
          medication:medication_id (
            id,
            name,
            description,
            category,
            dosage_form
          )
        `)
        .eq('patient_id', selectedPatientId)
        .eq('status', 'active')

      if (Array.isArray(refreshedActive)) {
        const isolatedRefreshed = refreshedActive.filter(
          (rx) => String(rx.patient_id) === String(selectedPatientId)
        )
        setActivePrescriptions(isolatedRefreshed)
      }

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

  const handleRunSandbox = async (e) => {
    e?.preventDefault()
    const rawDrugs = [
      sandboxMedA,
      sandboxMedB,
      ...sandboxExtraMeds.split(','),
    ]
      .map((s) => s.trim())
      .filter(Boolean)

    if (rawDrugs.length < 2) {
      setSandboxResult({
        severity: 'Yellow',
        riskPercentage: 0,
        riskLabel: 'ENTER AT LEAST 2 MEDICATIONS',
        title: 'Enter 2 or more global or brand medications to run 3-Layer screening',
        interactions: [],
      })
      return
    }

    setRunningSandbox(true)
    try {
      const result = await checkMultiDrugCombination(
        rawDrugs,
        chronicConditions,
        patientAllergies
      )
      setSandboxResult(result)
    } catch (err) {
      console.error('Sandbox interaction check failed:', err)
    } finally {
      setRunningSandbox(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-slate-500">
        <Loader2 className="w-7 h-7 text-brand-mint animate-spin" />
        <p className="text-xs sm:text-sm font-semibold">
          Connecting to Live NIH RxNav, RxTerms &amp; FDA Clinical Engines…
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {t('pharmacist.prescribeTitle')}
            </h2>
            <Tooltip text={t('tooltips.rxnavEngine')} />
            <a
              href={EXTERNAL_INTERACTION_SOURCES.source1.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-900 dark:bg-mint-950 dark:text-mint-300 font-extrabold border border-mint-200 dark:border-mint-800 hover:underline"
            >
              <span>Drugs.com Interaction Checker</span>
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
            {t('pharmacist.prescribeSubtitle')}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/80 text-xs font-extrabold text-brand-teal dark:text-mint-300 shadow-soft-xs">
          <Activity className="w-4 h-4 text-brand-mint animate-pulse" />
          <span>{t('pharmacist.apiConnected')}</span>
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
        {/* Left 2 Cols: Prescription Form + Live RxNav Interaction Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handlePrescribe}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-5"
          >
            {/* 1. Patient Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-teal dark:text-mint-300" />
                {t('pharmacist.selectPatient')}
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-semibold shadow-inner"
              >
                {patients.length === 0 ? (
                  <option value="">No linked patients yet — add a patient by ID in Tab 1</option>
                ) : (
                  patients.map((pat) => (
                    <option key={pat.id} value={pat.id}>
                      {pat.full_name} {pat.patient_code ? `(${pat.patient_code})` : `(${pat.email || 'No ID'})`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Live NIH RxTerms Medication Search */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-brand-mint" />
                  <span>
                    {t('pharmacist.searchMedication')}
                  </span>
                </label>
                {selectedMedName && (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectedPdrMedName(selectedMedName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-teal-50 dark:bg-dark-teal-950 text-brand-teal dark:text-mint-300 border border-dark-teal-200 dark:border-dark-teal-800 text-[11px] font-black hover:bg-dark-teal-100 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Open Full-Screen PDR.net Drug Summary</span>
                    </button>
                    <Tooltip text={t('tooltips.pdrMonograph')} />
                  </div>
                )}
              </div>

              {/* Live Global Drug Autocomplete API (NIH NLM RxTerms) */}
              <GlobalDrugAutocomplete
                key={selectedPatientId || 'no-patient'}
                label=""
                selectedMedicationName={selectedMedName || ''}
                selectedMedicationRxcui={
                  selectedMedRxcui || ddiResult.candidateRxcui || ''
                }
                onSelectMedication={handleSelectGlobalMedication}
                placeholder="Search ANY drug in the world via live NIH RxTerms (e.g., Warfarin, Aspirin, Ibuprofen, Clopidogrel, Omeprazole, Apixaban)…"
              />

              {medications.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Previously Saved / Prescribed Medications in Database:
                  </span>
                  <select
                    value={selectedMedicationId}
                    onChange={(e) => handleMedicationChange(e.target.value)}
                    aria-label="Saved Database Medications"
                    className="w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-semibold shadow-inner"
                  >
                    <option value="">
                      -- Select a medication from database or search above --
                    </option>
                    {medications.map((med) => {
                      const medCui = extractRxCui(med)
                      return (
                        <option key={med.id} value={med.id}>
                          {med.name}
                          {medCui ? ` [RxCUI: ${medCui}]` : ''} •{' '}
                          {med.dosage_form}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* 3. Live NIH RxNav Interaction Verification Spinner & Clinical Lock Banner */}
            <div className="space-y-3 pt-1">
              {isVerifyingInteractions ? (
                <div className="p-5 rounded-2xl bg-sky-50/90 dark:bg-dark-teal-950/90 border-2 border-brand-mint/60 shadow-soft-sm flex items-center gap-4 animate-pulse">
                  <div className="w-11 h-11 rounded-2xl bg-brand-teal text-brand-mint flex items-center justify-center shrink-0 shadow-sm">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-brand-teal text-white">
                        CLINICAL SAFETY VERIFICATION
                      </span>
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        Clinically Verifying...
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Screening <strong>{selectedMedName}</strong>{' '}
                      against {patientActivePrescriptions.length} active
                      medication(s) &amp; patient clinical profile via Drugs.com &amp; PDR.net…
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* HIGH / MAJOR INTERACTION -> HARD LOCK RED ALERT */}
                  {isHardLocked && (
                    <motion.div
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: [0, -8, 8, -5, 5, -2, 2, 0] }}
                      transition={{ duration: 0.45 }}
                      className="p-4 sm:p-5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/80 border-2 border-rose-500 dark:border-rose-700 ring-4 ring-red-500/20 shadow-soft-lg space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.6 }}
                            className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md"
                          >
                            <OctagonAlert className="w-6 h-6 stroke-[2.5]" />
                          </motion.div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-600 text-white">
                                {ddiResult.riskPercentage || 95}% Critical Risk — Hard Lock
                              </span>
                              {interactions[0]?.type && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-950 dark:text-rose-200">
                                  {interactions[0].type}
                                </span>
                              )}
                            </div>
                            <h4 className="font-black text-sm sm:text-base text-rose-950 dark:text-rose-100 mt-1 break-words">
                              {ddiResult.title}
                            </h4>
                            {interactions[0] && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-black text-rose-950 dark:text-rose-100">
                                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-rose-900/70 border border-rose-200 dark:border-rose-700">
                                  {interactions[0].drugA}
                                </span>
                                <Zap className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-rose-900/70 border border-rose-200 dark:border-rose-700">
                                  {interactions[0].drugB}
                                </span>
                              </div>
                            )}
                            <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed line-clamp-2">
                              {interactions[0]?.clinicalAdvice || interactions[0]?.description || ddiResult.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-stretch gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setShowModalClinicalDetails(false)
                              setShowHardLockModal(true)
                            }}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black shadow-xs transition-colors cursor-pointer"
                          >
                            View Alert Modal
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowInlineClinicalDetails((v) => !v)}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>
                              {showInlineClinicalDetails
                                ? t('pharmacist.clinicalMechanismHide')
                                : t('pharmacist.clinicalMechanismToggle')}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                showInlineClinicalDetails ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showInlineClinicalDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-2.5 pt-2 border-t border-rose-200/80 dark:border-rose-800/70"
                          >
                            {interactions.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl bg-white/95 dark:bg-[#091824]/95 border border-rose-300 dark:border-rose-800 space-y-2 text-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 font-black text-rose-950 dark:text-rose-100">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span>{item.drugA}</span>
                                    <Zap className="w-3.5 h-3.5 text-rose-600" />
                                    <span>{item.drugB}</span>
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                    {item.riskLabel || `${item.rxNavSeverity || 'High'} (${item.riskPercentage || 95}%)`}
                                  </span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                  {item.description}
                                </p>
                                {item.clinicalAdvice && (
                                  <p className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100 font-semibold">
                                    {item.clinicalAdvice}
                                  </p>
                                )}
                              </div>
                            ))}

                            {ddiResult.queriedRxcuis?.length > 0 && (
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-rose-800 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-900/40 px-3 py-2 rounded-xl">
                                <span>RxNav Query: rxcuis={ddiResult.queriedRxcuis.join('+')}</span>
                                <span className="inline-flex items-center gap-1 font-sans font-black uppercase">
                                  <Ban className="w-3.5 h-3.5" />
                                  Prescribing Hard-Locked
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* MODERATE / YELLOW INTERACTION -> REQUIRES RISK ACKNOWLEDGMENT CHECKBOX */}
                  {ddiResult.severity === 'Yellow' && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-700 shadow-soft-md space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500 text-white">
                                {ddiResult.riskPercentage || 60}% Moderate Precaution
                              </span>
                              <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300">
                                Override Requires Acknowledgment
                              </span>
                            </div>
                            <h4 className="font-black text-sm sm:text-base text-amber-950 dark:text-amber-100 mt-1 break-words">
                              {ddiResult.title}
                            </h4>
                            <p className="mt-1 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium line-clamp-2">
                              {interactions[0]?.clinicalAdvice || interactions[0]?.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowInlineClinicalDetails((v) => !v)}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>
                            {showInlineClinicalDetails
                              ? t('pharmacist.clinicalMechanismHide')
                              : t('pharmacist.clinicalMechanismToggle')}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              showInlineClinicalDetails ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <AnimatePresence>
                        {showInlineClinicalDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-2 pt-2 border-t border-amber-200 dark:border-amber-800"
                          >
                            {interactions.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-white/95 dark:bg-[#091824]/95 border border-amber-300 dark:border-amber-800 space-y-1.5 text-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 font-black text-amber-950 dark:text-amber-200">
                                  <span>{item.drugA} + {item.drugB}</span>
                                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500 text-white">
                                    {item.riskLabel || `Moderate (${item.riskPercentage || 60}%)`}
                                  </span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                  {item.description}
                                </p>
                                {item.clinicalAdvice && (
                                  <p className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-semibold">
                                    {item.clinicalAdvice}
                                  </p>
                                )}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Mandatory Pharmacist Risk Acknowledgment Checkbox */}
                      <label className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-100/90 dark:bg-amber-900/50 border-2 border-amber-500 dark:border-amber-600 cursor-pointer select-none transition-all hover:brightness-98">
                        <input
                          type="checkbox"
                          checked={acknowledgeModerateRisk}
                          onChange={(e) =>
                            setAcknowledgeModerateRisk(e.target.checked)
                          }
                          className="w-5 h-5 rounded border-amber-600 text-brand-teal focus:ring-brand-teal cursor-pointer"
                        />
                        <div className="text-xs sm:text-sm">
                          <span className="font-black text-amber-950 dark:text-amber-100 block">
                            {t('pharmacist.acknowledgeCheckbox')}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            Check this box to confirm clinical monitoring and unlock prescription authorization.
                          </span>
                        </div>
                      </label>
                    </motion.div>
                  )}

                  {/* GREEN / VERIFIED SAFE */}
                  {ddiResult.severity === 'Green' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 shadow-soft-xs flex items-center gap-3.5 animate-fade-in">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200">
                            DRUGS.COM &amp; PDR.NET VERIFIED SAFE
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

                  {/* BLUE / GLOBAL DRUG VERIFIED */}
                  {ddiResult.severity === 'Blue' && (
                    <div className="p-4 rounded-2xl bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 shadow-soft-xs flex items-center gap-3.5 animate-fade-in">
                      <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200">
                            GLOBAL FORMULARY REFERENCE
                          </span>
                          <h4 className="font-black text-xs sm:text-sm text-sky-950 dark:text-sky-100">
                            {ddiResult.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5 font-medium">
                          {ddiResult.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Laboratory Test Interference Warning */}
                  {ddiResult.labInteractions &&
                    ddiResult.labInteractions.length > 0 && (
                      <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 shadow-soft-xs space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2.5">
                          <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                            Drugs.com Laboratory Test Interference Note (
                            {ddiResult.labInteractions[0].drug})
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          <strong>{ddiResult.labInteractions[0].labTest}:</strong>{' '}
                          {ddiResult.labInteractions[0].summary}
                        </p>
                        {ddiResult.labInteractions[0].recommendation && (
                          <p className="inline-flex items-start gap-1.5 text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold">
                            <Lightbulb className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <span>Recommendation: {ddiResult.labInteractions[0].recommendation}</span>
                          </p>
                        )}
                      </div>
                    )}
                </>
              )}
            </div>

            {/* 4. Dosage Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('pharmacist.dosageInstructions')}
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
                {t('pharmacist.frequency')}
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
                  {t('pharmacist.startDate')}
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
                  {t('pharmacist.duration')}
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
              <span className="text-slate-500 font-medium">
                {t('pharmacist.scheduledEndDate')}
              </span>
              <span className="font-black text-slate-800 dark:text-slate-200 font-tabular">
                {calculateEndDate() || 'Ongoing / Indefinite'}
              </span>
            </div>

            {/* Submit Button: ABSOLUTE HARD-LOCK ON HIGH/MAJOR OR UNACKNOWLEDGED MODERATE */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-4 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 ${
                  isHardLocked
                    ? 'bg-slate-200 dark:bg-slate-900 text-slate-400 dark:text-slate-500 cursor-not-allowed border-2 border-dashed border-rose-400 dark:border-rose-800 shadow-none opacity-75'
                    : isVerifyingInteractions || isModerateUnacknowledged
                      ? 'bg-slate-200 dark:bg-dark-teal-950 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-dark-teal-800'
                      : 'text-white shadow-lg shadow-brand-teal/20 hover:brightness-110 active:scale-[0.98] cursor-pointer'
                }`}
                style={{
                  backgroundColor:
                    isHardLocked ||
                    isVerifyingInteractions ||
                    isModerateUnacknowledged
                      ? undefined
                      : '#1B4965',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('pharmacist.signingPrescription')}</span>
                  </>
                ) : isVerifyingInteractions ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-brand-mint" />
                    <span>{t('pharmacist.verifyingInteractions')}</span>
                  </>
                ) : isHardLocked ? (
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-rose-600 stroke-[2.5]" />
                    <span className="text-rose-600 dark:text-rose-400 font-black">
                      {t('pharmacist.hardLockedButton')}
                    </span>
                  </div>
                ) : isModerateUnacknowledged ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500 stroke-[2.5]" />
                    <span className="text-amber-700 dark:text-amber-300 font-black">
                      {t('pharmacist.acknowledgeRequiredNotice')}
                    </span>
                  </>
                ) : (
                  <>
                    <FilePlus className="w-5 h-5 text-brand-mint stroke-[2.5]" />
                    <span>
                      {ddiResult.severity === 'Yellow'
                        ? `${t('pharmacist.authorizeButton')} (Clinical Risk Acknowledged)`
                        : t('pharmacist.authorizeButton')}
                    </span>
                  </>
                )}
              </button>

              {isHardLocked && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold pt-1">
                  <span>Prescription blocked by clinical interaction rules</span>
                  <Tooltip text={t('tooltips.hardLock')} />
                </div>
              )}
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
                <span>{t('pharmacist.patientMedicalForm')}</span>
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-mint-50 dark:bg-mint-950 text-brand-mint border border-mint-200 dark:border-mint-800">
                {t('pharmacist.liveProfile')}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Chronic Conditions:
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
                  <span className="text-slate-400 italic">
                    No chronic conditions reported
                  </span>
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
                  <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-teal-950 border border-slate-200 dark:border-dark-teal-800 text-slate-800 dark:text-slate-200 font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{parsedIntake.allergies}</span>
                  </p>
                </div>
              )}

              {parsedIntake.homeMedTags?.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Patient-Reported Outside / Home Medications (Screened Automatically):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedIntake.homeMedTags.map((hm) => (
                      <span
                        key={hm}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-bold text-[11px]"
                      >
                        <Pill className="w-3 h-3" />
                        <span>{hm}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Patient Active Regimen Context with RxCUIs */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-teal dark:text-mint-300" />
                <span className="flex items-center gap-1.5">
                  <span>{t('pharmacist.patientActiveRegimen')}</span>
                  <Tooltip text={t('tooltips.rxcuiCode')} />
                </span>
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
                  const rxCui = extractRxCui(rx.medication || rx)
                  return (
                    <div
                      key={rx.id}
                      onClick={() => setInspectedPdrMedName(medTitle)}
                      title="Click to inspect PDR.net Drug Summary"
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-dark-teal-800/50 bg-slate-50/70 dark:bg-dark-teal-950/60 hover:border-brand-mint transition-all flex items-start justify-between gap-2.5 shadow-xs cursor-pointer group"
                    >
                      <div>
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200 group-hover:text-brand-teal dark:group-hover:text-mint-300 flex flex-wrap items-center gap-1.5">
                          <span>{medTitle}</span>
                          {rxCui && (
                            <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-teal/15 dark:bg-mint-400/15 text-brand-teal dark:text-mint-300">
                              RxCUI: {rxCui}
                            </span>
                          )}
                          <BookOpen className="w-3 h-3 text-brand-mint opacity-80" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium mt-0.5">
                          {rx.dosage_instructions}
                        </p>
                        <span className="text-[10px] text-brand-mint font-extrabold block pt-0.5">
                          {rx.frequency}
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

          {/* 3. Connected Medical Knowledge Sources Status Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-dark-teal-900 to-brand-teal text-white space-y-3.5 shadow-soft-lg shadow-brand-teal/20 border border-white/10">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-brand-mint" />
              <h4 className="font-black text-sm">
                Connected Clinical Knowledge Engines
              </h4>
            </div>
            <p className="text-xs text-white/85 leading-relaxed font-medium">
              Every medication selection is verified in real time against clinical DDI rules and patient profiles:
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
                    <span>1. Drugs.com Interaction &amp; Lab Checker</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  <span className="text-[10px] text-white/75 block">
                    DDI Evaluation, Hard-Locks &amp; Lab Test Interferences
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
                    Drug Summaries &amp; Renal / CKD Dosing Adjustments
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-mint text-dark-teal-950">
                  Active
                </span>
              </a>
            </div>
          </div>

          {/* 4. Universal 3-Layer Multi-Drug Interaction Sandbox */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-brand-teal dark:text-mint-300" />
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  Quick Multi-Drug Interaction Sandbox
                </h4>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-teal/10 text-brand-teal dark:bg-mint-500/15 dark:text-mint-300">
                3-Layer Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-medium">
              Screen any combination of global generics, US/Egyptian brands (e.g., Viagra + Nitrostat, Marevan + Brufen, Cataflam + Zestril), or dosage strings instantly.
            </p>
            <form onSubmit={handleRunSandbox} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={sandboxMedA}
                  onChange={(e) => setSandboxMedA(e.target.value)}
                  placeholder="Drug 1 (e.g. Viagra 50mg)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-teal-700 bg-slate-50 dark:bg-dark-teal-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                />
                <input
                  type="text"
                  value={sandboxMedB}
                  onChange={(e) => setSandboxMedB(e.target.value)}
                  placeholder="Drug 2 (e.g. Nitrostat)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-teal-700 bg-slate-50 dark:bg-dark-teal-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                />
              </div>
              <input
                type="text"
                value={sandboxExtraMeds}
                onChange={(e) => setSandboxExtraMeds(e.target.value)}
                placeholder="Optional extra drugs (comma-separated, e.g. Lasix, Zocor)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-teal-700 bg-slate-50 dark:bg-dark-teal-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
              />
              <button
                type="submit"
                disabled={runningSandbox}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-teal hover:bg-dark-teal-900 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {runningSandbox ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running RxNorm + Class Matrix + OpenFDA…</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Verify Multi-Drug Combination</span>
                  </>
                )}
              </button>
            </form>

            {sandboxResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                  sandboxResult.severity === 'Red'
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                    : sandboxResult.severity === 'Yellow'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-black uppercase text-[10px]">
                    {sandboxResult.riskLabel || sandboxResult.severity}
                  </span>
                  {sandboxResult.layerUsed && (
                    <span className="text-[10px] font-bold opacity-80">
                      {sandboxResult.layerUsed}
                    </span>
                  )}
                </div>
                <p className="font-black">{sandboxResult.title}</p>
                {sandboxResult.description && (
                  <p className="leading-relaxed opacity-90">{sandboxResult.description}</p>
                )}
                {sandboxResult.clinicalAdvice && (
                  <p className="font-semibold pt-0.5">
                    Clinical Advice: {sandboxResult.clinicalAdvice}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HIGH-IMPACT MOBILE-RESPONSIVE ANIMATED HARD-LOCK MODAL */}
      <AnimatePresence>
        {showHardLockModal && isHardLocked && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="hard-lock-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, x: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, -10, 10, -8, 8, -4, 4, 0],
              }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{
                x: { duration: 0.55, ease: 'easeInOut' },
                opacity: { duration: 0.2 },
                scale: { duration: 0.22 },
              }}
              className="w-[95vw] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-white dark:bg-[#0b1d2a] border-2 border-rose-500 ring-4 ring-red-500/30 shadow-2xl space-y-4"
            >
              {/* Uncluttered Hazard Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-200/70 dark:border-rose-900/60">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/35 ring-4 ring-red-500/25"
                  >
                    <OctagonAlert className="w-7 h-7 stroke-[2.5]" />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600 text-white">
                        <ShieldAlert className="w-3 h-3 shrink-0" />
                        <span>{ddiResult.riskPercentage || 95}% Critical Risk</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Hard Lock Active
                      </span>
                    </div>
                    <h3
                      id="hard-lock-modal-title"
                      className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1.5 leading-snug break-words"
                    >
                      {ddiResult.title || 'Severe Drug Interaction Blocked'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHardLockModal(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-dark-teal-900 hover:bg-slate-200 dark:hover:bg-dark-teal-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                  aria-label="Close modal to select alternative medication"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conflicting Pair + Concise 2-Line Clinical Summary */}
              {interactions[0] && (
                <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-rose-900/70 text-rose-800 dark:text-rose-100 border border-rose-200 dark:border-rose-700">
                      {interactions[0].drugA}
                    </span>
                    <Zap className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-rose-900/70 text-rose-800 dark:text-rose-100 border border-rose-200 dark:border-rose-700">
                      {interactions[0].drugB}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-rose-950 dark:text-rose-100 font-semibold leading-relaxed line-clamp-2">
                    {interactions[0].clinicalAdvice || interactions[0].description}
                  </p>
                </div>
              )}

              {/* Expandable Clinical Mechanism & Lab Interference Accordion */}
              <div className="rounded-2xl border border-slate-200 dark:border-dark-teal-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowModalClinicalDetails((v) => !v)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-teal-950/80 hover:bg-slate-100 dark:hover:bg-dark-teal-900/70 flex items-center justify-between gap-2 text-xs font-black text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>التفاصيل العلمية الكاملة / Clinical Mechanism</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      showModalClinicalDetails ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {showModalClinicalDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-slate-200 dark:border-dark-teal-800"
                    >
                      <div className="p-3.5 space-y-3 text-xs bg-white dark:bg-[#07131d]">
                        {interactions.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-[#0d2232] border border-slate-200 dark:border-dark-teal-800 space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1.5 font-black text-rose-700 dark:text-rose-300">
                              <span>
                                {item.drugA} + {item.drugB}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                {item.source || 'Universal 3-Layer DDI Engine'}
                              </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                              {item.description}
                            </p>
                            {item.clinicalAdvice && (
                              <p className="text-rose-900 dark:text-rose-200 font-semibold pt-1">
                                Management: {item.clinicalAdvice}
                              </p>
                            )}
                          </div>
                        ))}

                        {ddiResult.labInteractions?.length > 0 && (
                          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-1">
                            <span className="font-black text-indigo-900 dark:text-indigo-200 block">
                              Lab Interference: {ddiResult.labInteractions[0].labTest}
                            </span>
                            <p className="text-indigo-800 dark:text-indigo-300">
                              {ddiResult.labInteractions[0].summary}
                            </p>
                          </div>
                        )}

                        {ddiResult.queriedRxcuis?.length > 0 && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                            RxNav Query: rxcuis={ddiResult.queriedRxcuis.join('+')}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Clean Mobile-Friendly Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-dark-teal-800">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Prescribing locked until safe alternative chosen</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowHardLockModal(false)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-teal hover:bg-dark-teal-900 text-white text-xs sm:text-sm font-black transition-colors cursor-pointer shrink-0"
                >
                  Select Alternative Medication
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
