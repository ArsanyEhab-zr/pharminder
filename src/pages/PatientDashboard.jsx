import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useMedicationReminders } from '../hooks/useMedicationReminders'
import { parseClinicalIntake } from '../utils/patientMedicalNotes'
import {
  loadAllCustomAlarmTimes,
  updatePrescriptionScheduledTimes,
  getEffectiveAlarmTimesForRx,
  formatHHMMDisplay,
} from '../utils/alarmSchedules'
import ActiveMedicationsList from '../components/patient/ActiveMedicationsList'
import DoseScheduleTimeline from '../components/patient/DoseScheduleTimeline'
import DoseAlertModal from '../components/patient/DoseAlertModal'
import PatientMedicalProfileForm from '../components/patient/PatientMedicalProfileForm'
import PatientGuidedTour, { PATIENT_TOUR_STEPS } from '../components/patient/PatientGuidedTour'
import { 
  Pill, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  HeartPulse, 
  Stethoscope, 
  PhoneCall, 
  BellRing,
  Volume2,
  ClipboardList,
  AlertCircle,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react'

const bentoContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const bentoItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
}

export default function PatientDashboard() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()

  const [activeTab, setActiveTab] = useState('schedule') // 'schedule' | 'profile' | 'medications'
  const [prescriptions, setPrescriptions] = useState([])
  const [patientData, setPatientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [customTimesMap, setCustomTimesMap] = useState(() => loadAllCustomAlarmTimes(user?.id))

  useEffect(() => {
    setCustomTimesMap(loadAllCustomAlarmTimes(user?.id))
  }, [user?.id])

  const handleUpdateCustomTimes = useCallback(
    async (rxId, times) => {
      try {
        const targetRx = prescriptions.find((p) => p.id === rxId) || { id: rxId }
        const savedTimes = await updatePrescriptionScheduledTimes(user?.id, targetRx, times)
        setPrescriptions((prev) =>
          prev.map((rx) => (rx.id === rxId ? { ...rx, scheduled_times: savedTimes } : rx))
        )
        setCustomTimesMap((prev) => ({ ...prev, [rxId]: savedTimes }))
        setStatusMessage('Medication alarm times updated in database.')
        setTimeout(() => setStatusMessage(''), 3000)
      } catch (err) {
        console.error('Error saving prescription scheduled_times:', err)
        setStatusMessage('Failed to save alarm times. Please try again.')
        setTimeout(() => setStatusMessage(''), 4000)
      }
    },
    [user?.id, prescriptions]
  )

  const handleCopyPatientCode = async () => {
    if (!profile?.patient_code) return
    try {
      await navigator.clipboard?.writeText(profile.patient_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // Ignore clipboard restrictions
    }
  }

  // Interactive 3-Step Guided Tour State
  const [isTourOpen, setIsTourOpen] = useState(() => {
    try {
      return !localStorage.getItem('pharminder_patient_tour_completed_v1')
    } catch {
      return false
    }
  })
  const [tourStepIndex, setTourStepIndex] = useState(0)

  const handleTourStepChange = (stepIdx) => {
    setTourStepIndex(stepIdx)
    const targetStep = PATIENT_TOUR_STEPS[stepIdx]
    if (targetStep?.tabKey) {
      setActiveTab(targetStep.tabKey)
    }
  }

  const handleOpenGuidedTour = () => {
    setTourStepIndex(0)
    setActiveTab('profile')
    setIsTourOpen(true)
  }

  const handleCompleteTour = () => {
    try {
      localStorage.setItem('pharminder_patient_tour_completed_v1', 'true')
    } catch {
      // Ignore storage restrictions
    }
    setIsTourOpen(false)
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('patient.greetingMorning')
    if (hour < 17) return t('patient.greetingAfternoon')
    return t('patient.greetingEvening')
  }, [t])

  // Fetch Prescriptions & Clinical Data for Logged-In Patient using strict user.id isolation
  const loadPatientData = useCallback(async () => {
    if (!user?.id) {
      setPrescriptions([])
      setPatientData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const client = supabaseAdmin || supabase

      // 1. Fetch Active Prescriptions strictly filtered by patient_id = user.id
      const { data: rxData, error: rxErr } = await client
        .from('prescriptions')
        .select(`
          id,
          patient_id,
          medication_id,
          dosage_instructions,
          frequency,
          scheduled_times,
          start_date,
          end_date,
          status,
          created_at,
          medication:medication_id (
            id,
            name,
            description,
            category,
            dosage_form
          )
        `)
        .eq('patient_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!rxErr && Array.isArray(rxData)) {
        const isolatedRxs = rxData.filter(
          (rx) => String(rx.patient_id) === String(user.id)
        )
        setPrescriptions(isolatedRxs)
      } else {
        setPrescriptions([])
      }

      // 2. Fetch Patient Clinical Data strictly filtered by user_id = user.id
      const { data: pRows, error: pErr } = await client
        .from('patients_data')
        .select('*')
        .eq('user_id', user.id)

      if (!pErr && Array.isArray(pRows)) {
        const matchingRows = pRows.filter(
          (row) => String(row.user_id) === String(user.id)
        )
        setPatientData(
          matchingRows.length > 0 ? matchingRows[matchingRows.length - 1] : null
        )
      } else {
        setPatientData(null)
      }
    } catch (err) {
      console.error('Error fetching patient dashboard data:', err)
      setPrescriptions([])
      setPatientData(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Reset state immediately when user.id changes before fetching new user data
  useEffect(() => {
    setPrescriptions([])
    setPatientData(null)
    loadPatientData()

    if (!user?.id) return
    const realtimeClient = supabaseAdmin || supabase
    const channel = realtimeClient
      .channel(`patient-portal-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${user.id}` },
        () => loadPatientData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients_data', filter: `user_id=eq.${user.id}` },
        () => loadPatientData()
      )
      .subscribe()

    return () => {
      realtimeClient.removeChannel(channel)
    }
  }, [loadPatientData, user?.id])

  const parsedIntake = useMemo(
    () => parseClinicalIntake(patientData?.family_history || ''),
    [patientData]
  )

  const displayedPrescriptions = prescriptions

  // Medication Reminder & Notification Hook (Web Audio API Chime + Vibration + SW Notification + Realtime Pings)
  const {
    activeAlertDose,
    isAlarmPlaying,
    snoozedNotice,
    notificationPermission,
    requestPermission,
    triggerTestReminder,
    stopAlarm,
    handleTakeDoseFromModal,
    snoozeAlarm,
    dismissModal,
  } = useMedicationReminders({
    prescriptions: displayedPrescriptions,
    onDoseTaken: loadPatientData,
    patientId: user?.id,
    customTimesMap,
  })

  const nextScheduledDoseLabel = useMemo(() => {
    if (displayedPrescriptions.length === 0) return '—'
    const allSlots = []
    for (const rx of displayedPrescriptions) {
      const times = getEffectiveAlarmTimesForRx(rx, customTimesMap)
      allSlots.push(...times)
    }
    const sorted = Array.from(new Set(allSlots)).sort()
    if (sorted.length === 0) return '—'
    const now = new Date()
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const upcoming = sorted.find((hhmm) => hhmm >= currentHHMM) || sorted[0]
    return formatHHMMDisplay(upcoming)
  }, [displayedPrescriptions, customTimesMap])

  const chronicList = Array.isArray(patientData?.chronic_diseases)
    ? patientData.chronic_diseases
    : []

  return (
    <div className="space-y-6 sm:space-y-8 relative">
      {/* 1. Warm Gradient Patient Companion Header with Animated Floating Blobs */}
      <section className="p-6 sm:p-9 rounded-3xl bg-gradient-to-br from-white via-mint-50/50 to-amber-50/40 dark:from-[#0d2232] dark:via-[#091b28] dark:to-mint-950/35 border-2 border-mint-200/80 dark:border-mint-800/60 shadow-soft-lg relative overflow-hidden backdrop-blur-md">
        {/* Animated floating warm atmospheric blurs */}
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, -24, 0], y: [0, 18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-16 -top-16 w-80 h-80 bg-brand-mint/25 dark:bg-brand-mint/15 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, 20, 0], y: [0, -16, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-300/15 dark:bg-brand-teal/20 rounded-full blur-3xl pointer-events-none"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 min-w-0">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
            <motion.div
              whileHover={{ rotate: [-5, 5, 0], scale: 1.05 }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/80 dark:bg-dark-teal-950/80 border border-mint-200 dark:border-mint-800/80 flex items-center justify-center p-2.5 shrink-0 shadow-sm"
            >
              <img src="/logo-patient.png" alt="Pharminder Patient Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-mint text-dark-teal-950 shadow-xs">
                  <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('patient.portalBadge')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/90 dark:bg-dark-teal-950 text-brand-teal dark:text-mint-300 border border-mint-200 dark:border-mint-800/80 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-mint shrink-0" />
                  <span>{t('patient.connectedDoctor')}</span>
                </span>
                {profile?.patient_code && (
                  <button
                    type="button"
                    onClick={handleCopyPatientCode}
                    className="inline-flex items-center gap-2 min-h-[34px] text-xs font-mono font-black px-3.5 py-1 rounded-full bg-dark-teal-950 text-white dark:bg-brand-mint dark:text-dark-teal-950 shadow-sm hover:brightness-110 transition-all cursor-pointer"
                    title={t('patient.copyId')}
                  >
                    <span className="font-sans font-bold text-[10px] uppercase tracking-wider opacity-80">
                      {t('patient.patientIdLabel')}:
                    </span>
                    <span dir="ltr">{profile.patient_code}</span>
                    {copiedCode ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-extrabold text-brand-mint dark:text-dark-teal-950">
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('patient.copiedId')}</span>
                      </span>
                    ) : (
                      <Copy className="w-3.5 h-3.5 opacity-80 shrink-0" />
                    )}
                  </button>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {greeting}, {profile?.full_name || user?.email?.split('@')[0] || 'Patient'}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed break-words">
                {t('patient.welcomeSubtitle')}
              </p>

              {/* Patient Clinical Summary Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="px-3.5 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>
                    {t('patient.chronicConditions')}:{' '}
                    {chronicList.length > 0 ? chronicList.join(', ') : 'None Reported'}
                  </span>
                </span>

                {parsedIntake.currentSymptoms && (
                  <span className="px-3.5 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{t('patient.reportedSymptoms')}: {parsedIntake.currentSymptoms}</span>
                  </span>
                )}

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="px-3.5 py-1.5 rounded-2xl bg-brand-teal text-white font-extrabold hover:bg-dark-teal-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-brand-mint shrink-0" />
                  <span>{t('patient.editMedicalForm')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleOpenGuidedTour}
                  className="px-3.5 py-1.5 rounded-2xl bg-mint-100 dark:bg-mint-950/90 text-brand-teal dark:text-mint-300 border border-brand-mint/70 font-extrabold hover:bg-mint-200/70 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-brand-mint shrink-0" />
                  <span>{t('patient.guidedTour')}</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Quick Action / Refresh, Demo Tools & Notification Trigger */}
          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col items-stretch lg:items-end gap-2.5 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => triggerTestReminder()}
              className="min-h-[48px] inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-mint to-teal-400 hover:from-mint-400 hover:to-teal-500 text-dark-teal-950 text-xs sm:text-sm font-black shadow-md shadow-brand-mint/25 transition-all cursor-pointer"
              title="Test chime sound and pop-up modal immediately"
            >
              <BellRing className="w-4 h-4 animate-bounce shrink-0" />
              <span>{t('patient.testAlarm')}</span>
            </motion.button>

            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestPermission}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t('patient.enableAlerts')}</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-mint-50 dark:bg-mint-950/70 border border-mint-200 dark:border-mint-800 text-brand-teal dark:text-mint-300 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-brand-mint animate-ping shrink-0" />
                  <span>{t('patient.audioRemindersOn')}</span>
                </div>
              )}

              <button
                type="button"
                onClick={loadPatientData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-dark-teal-900/80 border border-slate-200 dark:border-dark-teal-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-teal-800 shadow-xs transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-brand-mint ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        </div>

        {(statusMessage || snoozedNotice) && (
          <div className="mt-4 space-y-2">
            {statusMessage && (
              <div className="p-3.5 rounded-2xl bg-mint-100/90 dark:bg-mint-950/90 text-mint-900 dark:text-mint-200 text-xs font-bold flex items-center gap-2.5 border border-mint-200 dark:border-mint-800 animate-fade-in shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            {snoozedNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 text-xs font-bold flex items-center gap-2.5 border border-amber-300 dark:border-amber-800 animate-fade-in shadow-xs">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
                <span>
                  {t('alarm.snoozedNotice')} ({snoozedNotice})
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Stagger-Animated Bento Summary Metrics */}
      <motion.section
        variants={bentoContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        <motion.div
          variants={bentoItemVariants}
          whileHover={{ y: -4 }}
          onClick={() => setActiveTab('schedule')}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-start justify-between cursor-pointer"
        >
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{t('patient.nextDose')}</p>
            <h3 dir="ltr" className="text-2xl sm:text-3xl font-black mt-1.5 text-slate-900 dark:text-slate-100 font-tabular">
              {nextScheduledDoseLabel}
            </h3>
            <p className="text-xs text-brand-mint font-bold mt-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {t('patient.dailyFollowUp')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-mint-50 dark:bg-mint-950/80 flex items-center justify-center text-brand-mint shadow-inner">
            <Pill className="w-6 h-6 rotate-[-20deg]" />
          </div>
        </motion.div>

        <motion.div
          variants={bentoItemVariants}
          whileHover={{ y: -4 }}
          onClick={() => setActiveTab('medications')}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-start justify-between cursor-pointer"
        >
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{t('patient.activeRegimens')}</p>
            <h3 className="text-2xl sm:text-3xl font-black mt-1.5 text-brand-teal dark:text-mint-300 font-tabular">
              {displayedPrescriptions.length} {t('patient.meds')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" /> {t('patient.supervisedByDoctor')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-dark-teal-50 dark:bg-dark-teal-950/80 flex items-center justify-center text-brand-teal dark:text-mint-300 shadow-inner">
            <Activity className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          variants={bentoItemVariants}
          whileHover={{ y: -4 }}
          onClick={() => setActiveTab('profile')}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-start justify-between cursor-pointer"
        >
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{t('patient.reportedConditions')}</p>
            <h3 className="text-2xl sm:text-3xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-tabular">
              {chronicList.length} Active
            </h3>
            <p className="text-xs text-brand-mint font-bold mt-1.5 flex items-center gap-1">
              <span>{t('patient.tapToUpdate')}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 flex items-center justify-center text-rose-500 shadow-inner">
            <ClipboardList className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          variants={bentoItemVariants}
          whileHover={{ y: -4 }}
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm flex items-start justify-between"
        >
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{t('patient.doctorLine')}</p>
            <h3 className="text-xl sm:text-2xl font-black mt-1.5 text-slate-900 dark:text-slate-100">
              {t('patient.careTeam')}
            </h3>
            <p className="text-xs text-brand-mint font-bold mt-1.5 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" /> {t('patient.extNumber')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-brand-teal dark:text-mint-300 shadow-inner">
            <Stethoscope className="w-6 h-6" />
          </div>
        </motion.div>
      </motion.section>

      {/* 3. Large Accessible Navigation Tabs for Patient Portal (Min 52px Touch Targets) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2 rounded-3xl bg-white/90 dark:bg-[#0d2232]/90 border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-xs">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`min-h-[52px] py-3 px-5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-brand-mint text-dark-teal-950 shadow-md shadow-brand-mint/25'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900/50'
          }`}
        >
          <Clock className="w-5 h-5 shrink-0" />
          <span>{t('patient.tabSchedule')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`min-h-[52px] py-3 px-5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-brand-mint text-dark-teal-950 shadow-md shadow-brand-mint/25'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900/50'
          }`}
        >
          <ClipboardList className="w-5 h-5 shrink-0" />
          <span>{t('patient.tabProfile')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('medications')}
          className={`min-h-[52px] py-3 px-5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'medications'
              ? 'bg-brand-mint text-dark-teal-950 shadow-md shadow-brand-mint/25'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900/50'
          }`}
        >
          <Pill className="w-5 h-5 shrink-0" />
          <span>{t('patient.tabMedications')}</span>
        </button>
      </div>

      {/* Animated Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'schedule' && (
          <motion.section
            key="schedule-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <DoseScheduleTimeline
              prescriptions={displayedPrescriptions}
              onDoseLogged={loadPatientData}
              customTimesMap={customTimesMap}
            />
          </motion.section>
        )}

        {activeTab === 'profile' && (
          <motion.section
            key="profile-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <PatientMedicalProfileForm
              key={user?.id || 'guest'}
              user={user}
              profile={profile}
              patientData={patientData}
              activePrescriptions={prescriptions}
              onProfileSaved={async () => {
                await refreshProfile()
                await loadPatientData()
              }}
            />
          </motion.section>
        )}

        {activeTab === 'medications' && (
          <motion.section
            key="medications-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <ActiveMedicationsList
              prescriptions={displayedPrescriptions}
              loading={loading}
              customTimesMap={customTimesMap}
              onUpdateCustomTimes={handleUpdateCustomTimes}
              onTriggerAlarmTest={triggerTestReminder}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Real-Time Medication Dose Alert Modal */}
      {activeAlertDose && (
        <DoseAlertModal
          dose={activeAlertDose}
          isAlarmPlaying={isAlarmPlaying}
          onTakeDose={() => handleTakeDoseFromModal(activeAlertDose)}
          onSnooze={() => snoozeAlarm(10)}
          onDismiss={dismissModal}
          onStopAlarm={stopAlarm}
        />
      )}

      {/* Interactive 3-Step Patient Onboarding Guided Tour */}
      <PatientGuidedTour
        isOpen={isTourOpen}
        currentStepIndex={tourStepIndex}
        onStepChange={handleTourStepChange}
        onClose={handleCompleteTour}
        onComplete={handleCompleteTour}
        onTriggerTestAlarm={triggerTestReminder}
      />
    </div>
  )
}
