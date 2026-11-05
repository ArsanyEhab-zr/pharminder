import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { parseClinicalIntake } from '../../utils/patientMedicalNotes'
import PatientAdherenceModal from './PatientAdherenceModal'
import { 
  UserPlus, 
  Search, 
  Activity, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  FileText,
  Weight,
  Ruler,
  X,
  Radio
} from 'lucide-react'

// Professional Medical SVG Illustration for Empty Patient Registry
function ClinicalPatientRegistryIllustration() {
  return (
    <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-mint/20 via-brand-teal/15 to-transparent blur-xl animate-pulse-soft" />
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-28 h-28 relative z-10"
      >
        {/* Medical Folder Card */}
        <rect x="26" y="34" width="108" height="96" rx="18" className="fill-slate-100 dark:fill-dark-teal-900 stroke-brand-teal dark:stroke-mint-400" strokeWidth="3.5" />
        {/* Avatar Circle */}
        <circle cx="62" cy="74" r="16" className="fill-mint-100 dark:fill-dark-teal-950 stroke-brand-mint" strokeWidth="3" />
        <circle cx="62" cy="69" r="6" className="fill-brand-teal dark:fill-brand-mint" />
        <path d="M50 85C53 79 71 79 74 85" className="stroke-brand-teal dark:stroke-brand-mint" strokeWidth="3" strokeLinecap="round" />
        {/* Medical Vitals Lines */}
        <line x1="88" y1="64" x2="118" y2="64" className="stroke-brand-teal dark:stroke-mint-300" strokeWidth="4" strokeLinecap="round" />
        <line x1="88" y1="76" x2="112" y2="76" className="stroke-slate-300 dark:stroke-dark-teal-700" strokeWidth="4" strokeLinecap="round" />
        {/* Heartbeat Pulse Bar */}
        <path
          d="M44 108H68L74 96L82 118L89 102L95 108H116"
          className="stroke-brand-mint"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

const patientGridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.065 },
  },
}

const patientCardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}

export default function PatientManagement({ onSelectPatientForPrescription }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [selectedPatientForAdherence, setSelectedPatientForAdherence] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [liveUpdateBanner, setLiveUpdateBanner] = useState(false)

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('Female')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [diseaseInput, setDiseaseInput] = useState('')
  const [chronicDiseases, setChronicDiseases] = useState([])
  const [familyHistory, setFamilyHistory] = useState('')

  const commonDiseases = [
    'Hypertension',
    'Type 2 Diabetes',
    'Asthma',
    'Hyperlipidemia',
    'Cardiovascular Disease',
    'Arthritis'
  ]

  const fetchPatients = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const client = supabaseAdmin || supabase
      const { data: profilesData, error: profilesErr } = await client
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          patients_data (
            age,
            gender,
            height,
            weight,
            chronic_diseases,
            family_history
          ),
          prescriptions:prescriptions_patient_id_fkey (
            id,
            status,
            dosage_instructions,
            frequency,
            medication:medication_id (
              name,
              category
            )
          )
        `)
        .eq('role', 'patient')
        .order('created_at', { ascending: false })

      if (profilesErr) throw profilesErr
      setPatients(profilesData || [])
    } catch (err) {
      console.error('Error fetching patients:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients(false)

    // Subscribe to realtime updates on patients_data & profiles so saved Patient Medical Forms appear immediately
    const handleRealtimeRefresh = () => {
      setLiveUpdateBanner(true)
      fetchPatients(true)
      setTimeout(() => setLiveUpdateBanner(false), 3000)
    }

    const realtimeClient = supabaseAdmin || supabase
    const channel = realtimeClient
      .channel('patient-registry-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients_data' }, handleRealtimeRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, handleRealtimeRefresh)
      .subscribe()

    let bc = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('pharminder-clinical-sync')
      bc.onmessage = () => handleRealtimeRefresh()
    }

    const handleStorage = (e) => {
      if (e.key === 'pharminder_last_medical_profile_update') {
        handleRealtimeRefresh()
      }
    }

    const handleFocus = () => fetchPatients(true)

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)

    return () => {
      realtimeClient.removeChannel(channel)
      if (bc) bc.close()
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchPatients])

  const handleAddDisease = (disease) => {
    const trimmed = disease.trim()
    if (trimmed && !chronicDiseases.includes(trimmed)) {
      setChronicDiseases([...chronicDiseases, trimmed])
      setDiseaseInput('')
    }
  }

  const handleRemoveDisease = (diseaseToRemove) => {
    setChronicDiseases(chronicDiseases.filter((d) => d !== diseaseToRemove))
  }

  const handleRegisterPatient = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      if (!fullName.trim()) {
        throw new Error('Please enter patient full name.')
      }

      const generatedId = crypto.randomUUID()
      const patientEmail = email.trim() || `patient.${Date.now()}@pharminder.local`

      // 1. Insert into profiles table with role='patient' using supabaseAdmin
      const { error: profileError } = await (supabaseAdmin || supabase)
        .from('profiles')
        .insert({
          id: generatedId,
          full_name: fullName.trim(),
          email: patientEmail,
          role: 'patient',
        })

      if (profileError) throw profileError

      // 2. Insert into patients_data table using supabaseAdmin
      const { error: patientDataError } = await (supabaseAdmin || supabase)
        .from('patients_data')
        .insert({
          user_id: generatedId,
          age: age ? parseInt(age, 10) : null,
          gender: gender,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          chronic_diseases: chronicDiseases,
          family_history: familyHistory.trim() || null,
        })

      if (patientDataError) {
        console.warn('Patient medical data insert warning:', patientDataError.message)
      }

      setFormSuccess(`Patient "${fullName}" successfully registered!`)
      
      // Reset form
      setFullName('')
      setEmail('')
      setAge('')
      setHeight('')
      setWeight('')
      setChronicDiseases([])
      setFamilyHistory('')

      await fetchPatients(true)

      setTimeout(() => {
        setIsRegisterModalOpen(false)
        setFormSuccess('')
      }, 1500)
    } catch (err) {
      console.error('Registration failed:', err)
      setFormError(err.message || 'Failed to register patient.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter patients by search query
  const filteredPatients = patients.filter((p) => {
    const nameMatch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const emailMatch = p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const pData = Array.isArray(p.patients_data) ? p.patients_data[0] : p.patients_data
    const diseaseMatch = pData?.chronic_diseases?.some((d) =>
      d.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return nameMatch || emailMatch || diseaseMatch
  })

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Clinical Patient Registry
            </h2>
            <span className="text-xs px-3 py-0.5 rounded-full bg-dark-teal-50 text-brand-teal dark:bg-dark-teal-950 dark:text-mint-300 font-extrabold border border-dark-teal-200 dark:border-dark-teal-800 font-tabular shadow-xs">
              {patients.length} Registered
            </span>
            {liveUpdateBanner && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-mint-100 text-mint-900 dark:bg-mint-950 dark:text-mint-300 border border-mint-300 dark:border-mint-700 animate-fade-in">
                <Radio className="w-3 h-3 text-brand-mint animate-ping" />
                Patient Medical Form Synced Live
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Review active patient cohorts, chronic disease forms, allergies, and adherence track records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-white shadow-md shadow-brand-teal/20 bg-gradient-to-r from-brand-teal to-dark-teal-900 hover:from-dark-teal-800 hover:to-dark-teal-950 transition-all duration-200 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-brand-mint" />
            <span>Register New Patient</span>
          </motion.button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patients by name, email, or chronic conditions…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200/80 dark:border-dark-teal-800/80 bg-white dark:bg-[#0d2232] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint shadow-soft-xs transition-all"
        />
      </div>

      {/* Patient List */}
      {loading ? (
        <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-slate-500">
          <Loader2 className="w-7 h-7 text-brand-mint animate-spin" />
          <p className="text-xs sm:text-sm font-semibold">Loading clinical patient registry from database…</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="p-10 sm:p-14 text-center rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4">
          <ClinicalPatientRegistryIllustration />
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">No Patients Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery 
              ? 'No patient records matched your search query.' 
              : 'You have not registered any patients yet. Register your first patient to begin prescribing medication.'}
          </p>
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-brand-teal dark:text-mint-300 border border-brand-teal/20 dark:border-mint-400/20 hover:bg-slate-50 dark:hover:bg-dark-teal-900/50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-brand-mint" />
            <span>Register First Patient</span>
          </button>
        </div>
      ) : (
        <motion.div
          variants={patientGridVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
        >
          {filteredPatients.map((patient) => {
            const pData = Array.isArray(patient.patients_data) 
              ? patient.patients_data[0] 
              : patient.patients_data
            const activePrescriptions = (patient.prescriptions || []).filter(
              (rx) => rx.status === 'active'
            )
            const intake = parseClinicalIntake(pData?.family_history || '')

            // BMI calculation if height and weight exist
            const bmi = (pData?.height && pData?.weight)
              ? (pData.weight / Math.pow(pData.height / 100, 2)).toFixed(1)
              : null

            return (
              <motion.div
                variants={patientCardVariants}
                whileHover={{ y: -4 }}
                key={patient.id}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Patient Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-50 to-dark-teal-50 dark:from-mint-950 dark:to-dark-teal-950 text-brand-mint flex items-center justify-center shrink-0 font-black text-base shadow-inner group-hover:scale-105 transition-transform duration-200">
                        {patient.full_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 group-hover:text-brand-teal dark:group-hover:text-mint-300 transition-colors leading-snug">
                          {patient.full_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[210px] font-medium">
                          {patient.email || 'No email provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-teal-950/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-dark-teal-800/60">
                        {pData?.gender || 'Unspecified'} {pData?.age ? `• ${pData.age} yrs` : ''}
                      </span>
                      {intake.bloodType && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                          Blood: {intake.bloodType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vitals Summary Pills */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-dark-teal-800/60 grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-dark-teal-950/60 border border-slate-100 dark:border-dark-teal-800/40">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                        <Ruler className="w-3 h-3" /> Height
                      </span>
                      <p className="font-black text-slate-800 dark:text-slate-200 mt-1 font-tabular">
                        {pData?.height ? `${pData.height} cm` : '—'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-dark-teal-950/60 border border-slate-100 dark:border-dark-teal-800/40">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                        <Weight className="w-3 h-3" /> Weight
                      </span>
                      <p className="font-black text-slate-800 dark:text-slate-200 mt-1 font-tabular">
                        {pData?.weight ? `${pData.weight} kg` : '—'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-dark-teal-950/60 border border-slate-100 dark:border-dark-teal-800/40">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                        <Activity className="w-3 h-3" /> BMI
                      </span>
                      <p className="font-black text-brand-mint mt-1 font-tabular">
                        {bmi ? bmi : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Chronic Diseases Tags */}
                  {pData?.chronic_diseases && pData.chronic_diseases.length > 0 && (
                    <div className="mt-3.5 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Chronic Conditions (Patient Medical Form)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {pData.chronic_diseases.map((disease) => (
                          <span
                            key={disease}
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50"
                          >
                            {disease}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient-Reported Current Symptoms & Allergies from Medical Form */}
                  {(intake.currentSymptoms || intake.allergies || intake.familyHistory) && (
                    <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/90 dark:bg-dark-teal-950/60 border border-slate-100 dark:border-dark-teal-800/60 space-y-1.5 text-xs">
                      {intake.currentSymptoms && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                            Symptoms:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                            {intake.currentSymptoms}
                          </span>
                        </div>
                      )}
                      {intake.allergies && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                            Allergies:
                          </span>
                          <span className="font-bold text-rose-700 dark:text-rose-300 leading-snug">
                            ⚠️ {intake.allergies}
                          </span>
                        </div>
                      )}
                      {intake.familyHistory && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">
                            History:
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 leading-snug line-clamp-1">
                            {intake.familyHistory}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Prescriptions Count */}
                  <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileText className="w-3.5 h-3.5 text-brand-teal dark:text-mint-300" />
                      Active Prescriptions:
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      {activePrescriptions.length} {activePrescriptions.length === 1 ? 'medication' : 'medications'}
                    </span>
                  </div>
                </div>

                {/* Card Actions: Adherence Audit & Prescribe */}
                <div className="pt-3.5 border-t border-slate-100 dark:border-dark-teal-800/60 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPatientForAdherence(patient)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-brand-teal dark:text-mint-300 bg-dark-teal-50 hover:bg-dark-teal-100 dark:bg-dark-teal-950/70 dark:hover:bg-dark-teal-900 border border-dark-teal-200/60 dark:border-dark-teal-800 transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Activity className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Adherence & History</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectPatientForPrescription) {
                        onSelectPatientForPrescription(patient)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-dark-teal-950 bg-brand-mint hover:bg-mint-400 shadow-md shadow-brand-mint/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Prescribe</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Register Patient Modal with Glassmorphism */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[#0d2232] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-dark-teal-800/80 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-teal-800/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-dark-teal-100 dark:bg-dark-teal-950 flex items-center justify-center text-brand-teal dark:text-mint-300 shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100 tracking-tight">
                    Register New Clinical Patient
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Creates user profile and clinical health records
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-teal-950 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-2xl bg-mint-50 dark:bg-mint-950/60 border border-mint-200 dark:border-mint-800 flex items-start gap-2.5 text-xs font-semibold text-mint-900 dark:text-mint-200 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-brand-mint" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Johnathan Miller"
                    className="w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Patient Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                </div>
              </div>

              {/* Age, Gender, Height, Weight */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="52"
                    className="w-full px-3 py-2 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-tabular"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    className="w-full px-3 py-2 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-tabular"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="78"
                    className="w-full px-3 py-2 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint font-tabular"
                  />
                </div>
              </div>

              {/* Chronic Diseases Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Chronic Diseases & Conditions
                </label>
                
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {commonDiseases.map((disease) => {
                    const isSelected = chronicDiseases.includes(disease)
                    return (
                      <button
                        key={disease}
                        type="button"
                        onClick={() => {
                          if (isSelected) handleRemoveDisease(disease)
                          else handleAddDisease(disease)
                        }}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold ${
                          isSelected
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-xs'
                            : 'bg-slate-50 dark:bg-dark-teal-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-teal-800 hover:bg-slate-100 dark:hover:bg-dark-teal-900'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{disease}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Disease Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={diseaseInput}
                    onChange={(e) => setDiseaseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddDisease(diseaseInput)
                      }
                    }}
                    placeholder="Add other disease (press enter)…"
                    className="flex-1 px-3.5 py-2 rounded-2xl text-xs border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDisease(diseaseInput)}
                    className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-slate-200 dark:bg-dark-teal-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Family Clinical History */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Family Medical History & Notes
                </label>
                <textarea
                  rows={2}
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                  placeholder="e.g. Maternal history of diabetes; paternal hypertension…"
                  className="w-full px-4 py-2.5 rounded-2xl text-xs border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-dark-teal-800/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-dark-teal-950 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl text-xs font-extrabold text-white shadow-md shadow-brand-teal/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: '#1B4965' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Patient…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Save Patient Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Adherence Audit & Dose History Modal */}
      {selectedPatientForAdherence && (
        <PatientAdherenceModal
          patient={selectedPatientForAdherence}
          onClose={() => setSelectedPatientForAdherence(null)}
          onPrescribeNew={(pt) => {
            setSelectedPatientForAdherence(null)
            if (onSelectPatientForPrescription) onSelectPatientForPrescription(pt)
          }}
        />
      )}
    </div>
  )
}
