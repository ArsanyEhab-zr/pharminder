import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PatientManagement from '../components/pharmacist/PatientManagement'
import PrescribeMedication from '../components/pharmacist/PrescribeMedication'
import PatientAdherenceModal from '../components/pharmacist/PatientAdherenceModal'
import DrugInformationPanel from '../components/pharmacist/DrugInformationPanel'
import { useAuth } from '../hooks/useAuth'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { 
  Stethoscope, 
  Users, 
  FileText, 
  PlusCircle, 
  Clock, 
  Activity, 
  ShieldCheck, 
  TrendingUp,
  RefreshCw,
  ClipboardList,
  Radio,
  BookOpen
} from 'lucide-react'

// Smooth count-up number animation for KPI cards
function AnimatedNumber({ value, suffix = '' }) {
  const numericTarget = typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let frameId
    const duration = 750
    const startTime = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(eased * numericTarget))
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [numericTarget])

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  )
}

// Professional Medical SVG Illustration for Empty States
function MedicalPrescriptionIllustration() {
  return (
    <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-teal/15 via-brand-mint/20 to-transparent blur-xl animate-pulse-soft" />
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-28 h-28 relative z-10 drop-shadow-sm"
      >
        {/* Clipboard Base */}
        <rect x="34" y="24" width="92" height="114" rx="16" className="fill-slate-100 dark:fill-dark-teal-900 stroke-brand-teal dark:stroke-mint-400" strokeWidth="3.5" />
        <rect x="56" y="14" width="48" height="20" rx="8" className="fill-brand-teal dark:fill-brand-mint" />
        {/* Medical Cross Badge */}
        <circle cx="80" cy="60" r="18" className="fill-mint-100 dark:fill-dark-teal-950 stroke-brand-mint" strokeWidth="2.5" />
        <path d="M80 51V69M71 60H89" className="stroke-brand-teal dark:stroke-brand-mint" strokeWidth="4" strokeLinecap="round" />
        {/* ECG Heartbeat Line */}
        <path
          d="M48 94H64L70 82L78 106L85 88L91 94H112"
          className="stroke-brand-mint"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Rx Lines */}
        <line x1="52" y1="114" x2="108" y2="114" className="stroke-slate-300 dark:stroke-dark-teal-700" strokeWidth="4" strokeLinecap="round" />
        <line x1="62" y1="124" x2="98" y2="124" className="stroke-slate-300 dark:stroke-dark-teal-700" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

const kpiContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const kpiItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
}

const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const listItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 24 },
  },
}

export default function PharmacistDashboard() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('patients') // 'patients' | 'prescribe' | 'prescriptions'
  const [preselectedPatient, setPreselectedPatient] = useState(null)
  const [selectedPatientForAudit, setSelectedPatientForAudit] = useState(null)
  const [selectedMedicationForPdr, setSelectedMedicationForPdr] = useState(null)
  const [liveSyncPulse, setLiveSyncPulse] = useState(false)
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePrescriptions: 0,
    totalDosesLogged: 0,
    complianceRate: 98,
  })
  const [allPrescriptions, setAllPrescriptions] = useState([])
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false)

  const fetchDashboardStats = useCallback(async () => {
    try {
      const client = supabaseAdmin || supabase

      // 1. Count patients
      const { count: patCount } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient')

      // 2. Count active prescriptions
      const { count: rxCount } = await client
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // 3. Count total dose logs and taken count
      const { count: doseCount } = await client
        .from('dose_logs')
        .select('*', { count: 'exact', head: true })

      const { count: takenCount } = await client
        .from('dose_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'taken')

      const rate = doseCount && doseCount > 0 
        ? Math.round(((takenCount || 0) / doseCount) * 100)
        : 100

      setStats({
        totalPatients: patCount || 0,
        activePrescriptions: rxCount || 0,
        totalDosesLogged: doseCount || 0,
        complianceRate: rate,
      })
    } catch (err) {
      console.error('Error fetching pharmacist stats:', err)
    }
  }, [])

  const fetchAllPrescriptions = useCallback(async () => {
    try {
      setLoadingPrescriptions(true)
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('prescriptions')
        .select(`
          id,
          dosage_instructions,
          frequency,
          start_date,
          end_date,
          status,
          created_at,
          patient:patient_id (
            id,
            full_name,
            email
          ),
          medication:medication_id (
            id,
            name,
            category,
            dosage_form
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAllPrescriptions(data)
      }
    } catch (err) {
      console.error('Error fetching all prescriptions:', err)
    } finally {
      setLoadingPrescriptions(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardStats()
    fetchAllPrescriptions()

    // Live Realtime + Cross-Tab Sync so Patient Form saves reflect immediately without hard refresh
    const triggerSync = () => {
      setLiveSyncPulse(true)
      fetchDashboardStats()
      fetchAllPrescriptions()
      setTimeout(() => setLiveSyncPulse(false), 1800)
    }

    const realtimeClient = supabaseAdmin || supabase
    const channel = realtimeClient
      .channel('pharmacist-command-center-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients_data' }, triggerSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, triggerSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, triggerSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dose_logs' }, triggerSync)
      .subscribe()

    let bc = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('pharminder-clinical-sync')
      bc.onmessage = () => triggerSync()
    }

    const handleFocus = () => triggerSync()
    window.addEventListener('focus', handleFocus)

    return () => {
      realtimeClient.removeChannel(channel)
      if (bc) bc.close()
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchDashboardStats, fetchAllPrescriptions])

  const handleSelectPatientForPrescription = (patient) => {
    setPreselectedPatient(patient)
    setActiveTab('prescribe')
  }

  const handlePrescriptionSuccess = () => {
    fetchDashboardStats()
    fetchAllPrescriptions()
  }

  const displayDoctorName = profile?.full_name
    ? profile.full_name.startsWith('Dr.')
      ? profile.full_name
      : `Dr. ${profile.full_name}`
    : 'Dr. Sarah Smith, PharmD'

  return (
    <div className="space-y-6 sm:space-y-8 relative">
      {/* 1. Doctor & Pharmacist Clinical Command Center Header with Animated Mesh Blobs */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-brand-teal via-dark-teal-900 to-dark-teal-950 text-white shadow-soft-xl shadow-brand-teal/20 relative overflow-hidden border border-white/10 backdrop-blur-md">
        {/* Animated floating mesh blobs */}
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, 24, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-12 -top-12 w-96 h-96 bg-brand-mint/20 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, -20, 0], y: [0, 16, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-20 -bottom-24 w-80 h-80 bg-mint-400/15 rounded-full blur-3xl pointer-events-none"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <motion.div
              whileHover={{ rotate: [-5, 5, 0], scale: 1.05 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2.5 shrink-0 shadow-inner"
            >
              <img src="/logo-doctor.png" alt="Pharminder Doctor Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-widest px-3 py-0.5 rounded-full bg-brand-mint text-dark-teal-950 shadow-xs">
                  Doctor & Pharmacist Portal (/pharmacist)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-mint-200 font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15">
                  <Radio className={`w-3 h-3 text-brand-mint ${liveSyncPulse ? 'animate-ping' : 'animate-pulse'}`} />
                  <span>Realtime Patient Sync Active</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mt-1.5 text-white tracking-tight">
                {displayDoctorName}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1 font-medium">
                Patient Medical Form Review, Drug-Disease Contraindication Screening & Adherence Audit
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => {
                fetchDashboardStats()
                fetchAllPrescriptions()
              }}
              className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-brand-mint ${loadingPrescriptions ? 'animate-spin' : ''}`} />
              <span>Sync Records</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => {
                setPreselectedPatient(null)
                setActiveTab('prescribe')
              }}
              className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold bg-brand-mint text-dark-teal-950 hover:bg-mint-400 transition-all duration-200 shadow-md shadow-brand-mint/25 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Prescribe & Check Interactions</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* 2. Clinical Overview & Count-Up KPI Cards */}
      <motion.section
        variants={kpiContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5"
      >
        <motion.div
          variants={kpiItemVariants}
          whileHover={{ y: -4 }}
          onClick={() => setActiveTab('patients')}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest block">Patients & Forms</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 text-slate-900 dark:text-slate-100 font-tabular">
              <AnimatedNumber value={stats.totalPatients} />
            </h3>
            <p className="text-xs text-brand-mint font-bold mt-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Medical records
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-mint-50 dark:bg-mint-950/80 text-brand-mint flex items-center justify-center shadow-inner">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          variants={kpiItemVariants}
          whileHover={{ y: -4 }}
          onClick={() => setActiveTab('prescriptions')}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest block">Active Prescriptions</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 text-brand-teal dark:text-mint-300 font-tabular">
              <AnimatedNumber value={stats.activePrescriptions} />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5" /> Dispensed regimens
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-dark-teal-50 dark:bg-dark-teal-950/80 text-brand-teal dark:text-mint-300 flex items-center justify-center shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          variants={kpiItemVariants}
          whileHover={{ y: -4 }}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest block">Doses Logged</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 text-slate-900 dark:text-slate-100 font-tabular">
              <AnimatedNumber value={stats.totalDosesLogged} />
            </h3>
            <p className="text-xs text-brand-mint font-bold mt-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> <AnimatedNumber value={stats.complianceRate} suffix="%" /> adherence
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-mint-50 dark:bg-mint-950/80 text-brand-mint flex items-center justify-center shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          variants={kpiItemVariants}
          whileHover={{ y: -4 }}
          onClick={() => setActiveTab('prescribe')}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-center justify-between cursor-pointer"
        >
          <div>
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest block">Safety Engine</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 text-brand-mint">DDI + Disease</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" /> Dual guard active
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </motion.div>
      </motion.section>

      {/* 3. High-Density Clinical Command Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2 rounded-3xl bg-white/90 dark:bg-[#0d2232]/90 border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-xs">
        <button
          type="button"
          onClick={() => setActiveTab('patients')}
          className={`min-h-[48px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'patients'
              ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900/50'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-brand-mint" />
          <span>1. Patients & Medical Forms ({stats.totalPatients})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prescribe')}
          className={`min-h-[48px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'prescribe'
              ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900/50'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-brand-mint" />
          <span>2. Prescribe & Interaction Checker</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prescriptions')}
          className={`min-h-[48px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'prescriptions'
              ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900/50'
          }`}
        >
          <FileText className="w-4 h-4 text-brand-mint" />
          <span>3. Dispensed Orders & Follow-Up ({allPrescriptions.length})</span>
        </button>
      </div>

      {/* Active Tab View */}
      <AnimatePresence mode="wait">
        {activeTab === 'patients' && (
          <motion.section
            key="patients-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <PatientManagement onSelectPatientForPrescription={handleSelectPatientForPrescription} />
          </motion.section>
        )}

        {activeTab === 'prescribe' && (
          <motion.section
            key="prescribe-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <PrescribeMedication 
              preselectedPatient={preselectedPatient}
              onPrescriptionSuccess={handlePrescriptionSuccess}
            />
          </motion.section>
        )}

        {activeTab === 'prescriptions' && (
          <motion.div
            key="prescriptions-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Active & Historic Prescriptions Roster
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Click any patient to inspect their 7-day dose adherence matrix
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 font-tabular bg-slate-100 dark:bg-dark-teal-950 px-3 py-1 rounded-full border border-slate-200/60 dark:border-dark-teal-800/60">
                {allPrescriptions.length} total orders
              </span>
            </div>

            {loadingPrescriptions ? (
              <div className="p-12 text-center text-xs sm:text-sm text-slate-400 animate-pulse font-medium">
                Loading clinical prescriptions…
              </div>
            ) : allPrescriptions.length === 0 ? (
              <div className="p-10 sm:p-14 text-center rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 text-slate-500 shadow-soft-sm space-y-4">
                <MedicalPrescriptionIllustration />
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    No Clinical Prescriptions Issued Yet
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Use the &ldquo;Prescribe &amp; Interaction Checker&rdquo; tab to screen against Drug-Drug and Drug-Disease contraindications and issue your first regimen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('prescribe')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-teal text-white text-xs font-extrabold shadow-sm hover:bg-dark-teal-900 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-brand-mint" />
                  <span>Create First Prescription</span>
                </button>
              </div>
            ) : (
              <motion.div
                variants={listContainerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
              >
                {allPrescriptions.map((rx) => (
                  <motion.div
                    variants={listItemVariants}
                    whileHover={{ y: -3 }}
                    key={rx.id}
                    className="p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-teal dark:text-mint-300 block mb-1">
                          Patient: {rx.patient?.full_name || 'Patient'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMedicationForPdr(rx.medication?.name)}
                          className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 hover:text-brand-teal dark:hover:text-mint-300 transition-colors text-left flex items-center gap-2 cursor-pointer"
                        >
                          <span>{rx.medication?.name} • {rx.medication?.dosage_form}</span>
                          <BookOpen className="w-4 h-4 text-brand-mint shrink-0" />
                        </button>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium leading-snug">
                          {rx.dosage_instructions}
                        </p>
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-mint-50 dark:bg-mint-950 text-brand-mint border border-mint-200 dark:border-mint-800 shadow-xs">
                        {rx.status}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-dark-teal-800/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-bold text-brand-teal dark:text-mint-300">
                        <Clock className="w-3.5 h-3.5" />
                        {rx.frequency}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {rx.medication?.name && (
                          <button
                            type="button"
                            onClick={() => setSelectedMedicationForPdr(rx.medication?.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mint-50 dark:bg-mint-950 text-mint-900 dark:text-mint-300 border border-mint-200 dark:border-mint-800 font-bold hover:bg-mint-100 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                            <span>PDR.net Summary</span>
                          </button>
                        )}
                        {rx.patient && (
                          <button
                            type="button"
                            onClick={() => setSelectedPatientForAudit(rx.patient)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-teal-50 dark:bg-dark-teal-950 text-brand-teal dark:text-mint-300 font-bold hover:bg-dark-teal-100 transition-colors cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5 text-brand-mint" />
                            <span>Audit Adherence</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMedicationForPdr && (
        <DrugInformationPanel
          isModal
          medicationName={selectedMedicationForPdr}
          onClose={() => setSelectedMedicationForPdr(null)}
        />
      )}

      {selectedPatientForAudit && (
        <PatientAdherenceModal
          patient={selectedPatientForAudit}
          onClose={() => setSelectedPatientForAudit(null)}
          onPrescribeNew={(pt) => {
            setSelectedPatientForAudit(null)
            handleSelectPatientForPrescription(pt)
          }}
        />
      )}
    </div>
  )
}
