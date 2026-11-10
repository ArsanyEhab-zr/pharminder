import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { getDoseStatus, findMatchingLog } from '../../utils/doseStatus'
import { 
  CheckCircle2, 
  Clock, 
  Check, 
  Sparkles, 
  Award, 
  PartyPopper,
  XCircle,
  X,
  AlertTriangle
} from 'lucide-react'

const timelineContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const timelineItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}

export default function DoseScheduleTimeline({ prescriptions = [], onDoseLogged }) {
  const { t } = useTranslation()
  const [doseLogs, setDoseLogs] = useState([])
  const [updatingDoseId, setUpdatingDoseId] = useState(null)
  const [celebratingSlotKey, setCelebratingSlotKey] = useState(null)
  const [todayDate] = useState(() => new Date())
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Periodically refresh current time every 30 seconds to recalculate 30-min overdue threshold
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const todayStr = useMemo(() => todayDate.toISOString().split('T')[0], [todayDate])
  const todayFormatted = useMemo(() => {
    return todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }, [todayDate])

  // Generate today's schedule items based on active prescriptions
  const todayScheduleItems = useMemo(() => {
    const items = []

    prescriptions.forEach((rx) => {
      const medName = rx.medication?.name || 'Medication'
      const dosage = rx.dosage_instructions || 'Take as prescribed'
      const freq = (rx.frequency || '').toLowerCase()

      const parseSlotDate = (timeStr) => {
        const clean = timeStr.replace(' (As Needed)', '').replace(' (Weekly)', '')
        const [rawTime, modifier] = clean.split(' ')
        let [hours, minutes] = rawTime.split(':').map(Number)
        if (modifier === 'PM' && hours !== 12) hours += 12
        if (modifier === 'AM' && hours === 12) hours = 0
        const d = new Date(todayDate)
        d.setHours(hours, minutes || 0, 0, 0)
        return d
      }

      let slots = ['08:00 AM']
      if (freq.includes('8 hour') || freq.includes('3 time') || freq.includes('tid')) {
        slots = ['08:00 AM', '02:00 PM', '08:00 PM']
      } else if (freq.includes('12 hour') || freq.includes('2 time') || freq.includes('bid')) {
        slots = ['08:00 AM', '08:00 PM']
      } else if (freq.includes('morning')) {
        slots = ['08:00 AM']
      } else if (freq.includes('evening') || freq.includes('dinner')) {
        slots = ['07:00 PM']
      } else if (freq.includes('bedtime') || freq.includes('night')) {
        slots = ['10:00 PM']
      } else if (freq.includes('as needed') || freq.includes('prn')) {
        slots = ['12:00 PM (As Needed)']
      } else if (freq.includes('weekly')) {
        slots = ['09:00 AM (Weekly)']
      }

      slots.forEach((slotTime, index) => {
        const slotKey = `${rx.id}-${todayStr}-${index}`
        const slotDate = parseSlotDate(slotTime)

        items.push({
          slotKey,
          prescriptionId: rx.id,
          medicationName: medName,
          dosageInstructions: dosage,
          dosageForm: rx.medication?.dosage_form || 'Dose',
          timeDisplay: slotTime,
          timeIndex: index,
          date: todayStr,
          scheduledHours: slotDate.getHours(),
          scheduledMinutes: slotDate.getMinutes(),
          scheduledDate: slotDate,
          scheduledIso: slotDate.toISOString(),
        })
      })
    })

    return items.sort((a, b) => {
      const toMinutes = (timeStr) => {
        const clean = timeStr.replace(' (As Needed)', '').replace(' (Weekly)', '')
        const [rawTime, modifier] = clean.split(' ')
        let [hours, minutes] = rawTime.split(':').map(Number)
        if (modifier === 'PM' && hours !== 12) hours += 12
        if (modifier === 'AM' && hours === 12) hours = 0
        return hours * 60 + (minutes || 0)
      }
      return toMinutes(a.timeDisplay) - toMinutes(b.timeDisplay)
    })
  }, [prescriptions, todayDate, todayStr])

  // Fetch dose logs for today
  const fetchTodayLogs = useCallback(async () => {
    if (prescriptions.length === 0) {
      setDoseLogs([])
      return
    }

    const rxIds = prescriptions.map((p) => p.id)
    const todayStart = new Date(todayDate)
    todayStart.setHours(0, 0, 0, 0)

    try {
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('dose_logs')
        .select('*')
        .in('prescription_id', rxIds)
        .gte('created_at', todayStart.toISOString())

      if (!error && data) {
        setDoseLogs(data)
      }
    } catch (err) {
      console.error('Error fetching today dose logs:', err)
    }
  }, [prescriptions, todayDate])

  useEffect(() => {
    fetchTodayLogs()
  }, [fetchTodayLogs])

  // Get matching log for an item
  const getSlotLog = useCallback((item) => {
    return findMatchingLog(item, doseLogs)
  }, [doseLogs])

  // Calculate status: 'taken' | 'missed' | 'pending'
  const getItemStatus = useCallback((item) => {
    const log = getSlotLog(item)
    return getDoseStatus(item.scheduledIso, log, currentTime)
  }, [getSlotLog, currentTime])

  const getDoseTakenTime = useCallback((item) => {
    const log = getSlotLog(item)
    if (log?.taken_time) {
      const d = new Date(log.taken_time)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return null
  }, [getSlotLog])

  // Handle Mark Taken Toggle with celebratory popping checkmark animation
  const handleToggleTaken = async (item) => {
    setUpdatingDoseId(item.slotKey)
    const status = getItemStatus(item)
    const currentlyTaken = status === 'taken'

    try {
      const client = supabaseAdmin || supabase
      const existingLog = getSlotLog(item)
      const nowIso = new Date().toISOString()
      const scheduledTimeIso = item.scheduledIso || nowIso

      if (currentlyTaken) {
        // Undo: set status back to pending or remove log
        if (existingLog) {
          await client
            .from('dose_logs')
            .update({ status: 'pending', taken_time: null })
            .eq('id', existingLog.id)

          setDoseLogs((prev) =>
            prev.map((l) =>
              l.id === existingLog.id ? { ...l, status: 'pending', taken_time: null } : l
            )
          )
        }
      } else {
        // Patient explicitly clicked "Take Dose" => set status: 'taken'
        setCelebratingSlotKey(item.slotKey)
        setTimeout(() => {
          setCelebratingSlotKey((prev) => (prev === item.slotKey ? null : prev))
        }, 2400)

        if (existingLog?.id) {
          const { data: updatedLog } = await client
            .from('dose_logs')
            .update({
              status: 'taken',
              taken_time: nowIso,
            })
            .eq('id', existingLog.id)
            .select()
            .single()

          if (updatedLog) {
            setDoseLogs((prev) =>
              prev.map((l) => (l.id === existingLog.id ? updatedLog : l))
            )
          }
        } else {
          const { data: newLog, error } = await client
            .from('dose_logs')
            .insert({
              prescription_id: item.prescriptionId,
              scheduled_time: scheduledTimeIso,
              taken_time: nowIso,
              status: 'taken',
            })
            .select()
            .single()

          if (!error && newLog) {
            setDoseLogs((prev) => [...prev, { ...newLog, slot_key: item.slotKey }])
          } else {
            setDoseLogs((prev) => [
              ...prev,
              {
                id: `demo-log-${Date.now()}`,
                prescription_id: item.prescriptionId,
                scheduled_time: scheduledTimeIso,
                taken_time: nowIso,
                status: 'taken',
                slot_key: item.slotKey,
              },
            ])
          }
        }
      }

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('pharminder-clinical-sync')
        bc.postMessage({ type: 'DOSE_LOGGED', timestamp: Date.now() })
        bc.close()
      }

      if (onDoseLogged) onDoseLogged()
    } catch (err) {
      console.error('Failed to log dose:', err)
    } finally {
      setUpdatingDoseId(null)
    }
  }

  // Count taken, missed, and pending
  const totalDosesToday = todayScheduleItems.length
  const takenDosesCount = todayScheduleItems.filter((i) => getItemStatus(i) === 'taken').length
  const missedDosesCount = todayScheduleItems.filter((i) => getItemStatus(i) === 'missed').length
  const pendingDosesCount = todayScheduleItems.filter((i) => getItemStatus(i) === 'pending').length
  const adherencePercent = totalDosesToday > 0 ? Math.round((takenDosesCount / totalDosesToday) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Daily Progress & Warm Gradient Adherence Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-white via-mint-50/45 to-amber-50/35 dark:from-[#0d2232] dark:via-[#091b28] dark:to-mint-950/40 border-2 border-mint-200/80 dark:border-mint-800/60 shadow-soft-md space-y-5 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <motion.div
              key={adherencePercent}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                missedDosesCount > 0 && takenDosesCount === 0
                  ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-rose-500/25'
                  : 'bg-gradient-to-br from-brand-mint to-teal-500 text-dark-teal-950 shadow-brand-mint/25'
              }`}
            >
              {missedDosesCount > 0 && takenDosesCount === 0 ? (
                <XCircle className="w-7 h-7 stroke-[2.5]" />
              ) : (
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              )}
            </motion.div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('timeline.todayAdherence')}
                </h3>
                <span className="text-xs px-3 py-0.5 rounded-full font-black bg-mint-100 dark:bg-mint-950 text-mint-900 dark:text-mint-300 border border-mint-300 dark:border-mint-700 shadow-xs font-tabular">
                  {adherencePercent}% {t('timeline.complete')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-bold mt-1">
                <span className="inline-flex items-center gap-1 text-brand-mint">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> {takenDosesCount} {t('timeline.taken')}
                </span>
                {missedDosesCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-500">
                    <X className="w-3.5 h-3.5 stroke-[3]" /> {missedDosesCount} {t('timeline.missedOverdue')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> {pendingDosesCount} {t('timeline.pending')}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left rtl:text-right sm:text-right rtl:sm:text-left sm:border-l rtl:sm:border-r rtl:sm:border-l-0 sm:pl-6 rtl:sm:pr-6 rtl:sm:pl-0 border-slate-200 dark:border-dark-teal-800/60">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
              {t('timeline.dailyStatus')}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {takenDosesCount === totalDosesToday && totalDosesToday > 0 ? (
                <motion.span
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1.5 text-brand-mint"
                >
                  <Award className="w-5 h-5" /> {t('timeline.allTaken')}
                </motion.span>
              ) : missedDosesCount > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {missedDosesCount} {t('timeline.overdueDetected')}
                </span>
              ) : (
                `${pendingDosesCount} ${t('timeline.scheduledForToday')}`
              )}
            </span>
          </div>
        </div>

        {/* Animated Adherence Progress Bar with warm glow */}
        <div className="w-full bg-slate-200/80 dark:bg-dark-teal-950/90 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200/60 dark:border-dark-teal-800/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${adherencePercent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`h-full rounded-full shadow-sm ${
              missedDosesCount > 0 && takenDosesCount === 0
                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                : 'bg-gradient-to-r from-brand-teal via-brand-mint to-emerald-400'
            }`}
          />
        </div>
      </motion.div>

      {/* Timeline Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{t('timeline.title')}</span>
              <span className="text-xs font-bold text-brand-teal dark:text-mint-300 bg-dark-teal-50 dark:bg-dark-teal-950/80 px-2.5 py-1 rounded-xl border border-dark-teal-200/60 dark:border-dark-teal-800/60">
                {todayFormatted}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {t('timeline.scheduledPendingNotice')}
            </p>
          </div>
        </div>

        {todayScheduleItems.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 text-slate-500 text-xs sm:text-sm shadow-soft-sm">
            {t('timeline.noActiveDoses')}
          </div>
        ) : (
          <motion.div
            variants={timelineContainerVariants}
            initial="hidden"
            animate="show"
            className="relative pl-6 sm:pl-8 rtl:pl-0 rtl:pr-6 rtl:sm:pr-8 border-l-2 rtl:border-r-2 rtl:border-l-0 border-mint-300 dark:border-dark-teal-800/80 space-y-5 my-3"
          >
            {todayScheduleItems.map((item) => {
              const status = getItemStatus(item)
              const taken = status === 'taken'
              const missed = status === 'missed'
              const takenAt = getDoseTakenTime(item)
              const isUpdating = updatingDoseId === item.slotKey
              const isCelebrating = celebratingSlotKey === item.slotKey

              return (
                <motion.div
                  variants={timelineItemVariants}
                  key={item.slotKey}
                  className="relative group"
                >
                  {/* Animated Timeline Node Bullet */}
                  <motion.div
                    animate={
                      taken
                        ? { scale: [1, 1.35, 1.12], rotate: [0, 12, 0] }
                        : missed
                          ? { scale: [1, 1.25, 1.05] }
                          : { scale: 1, rotate: 0 }
                    }
                    transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                    className={`absolute -left-[31px] sm:-left-[39px] rtl:left-auto rtl:-right-[31px] rtl:sm:-right-[39px] top-6 w-5 h-5 rounded-full border-3 flex items-center justify-center transition-colors ${
                      taken
                        ? 'bg-brand-mint border-white dark:border-[#071520] shadow-glow-mint'
                        : missed
                          ? 'bg-rose-500 border-white dark:border-[#071520] shadow-md shadow-rose-500/30'
                          : 'bg-white dark:bg-[#071520] border-slate-300 dark:border-dark-teal-700'
                    }`}
                  >
                    {taken && <Check className="w-3 h-3 text-dark-teal-950 stroke-[3.5]" />}
                    {missed && <X className="w-3 h-3 text-white stroke-[3.5]" />}
                  </motion.div>

                  {/* Main Accessible Dose Card */}
                  <motion.div
                    layout
                    whileHover={{ y: -2 }}
                    className={`p-5 sm:p-6 rounded-3xl border transition-colors duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden ${
                      taken
                        ? 'bg-gradient-to-r from-mint-50/90 via-emerald-50/40 to-white dark:from-mint-950/35 dark:via-dark-teal-950/50 dark:to-[#0d2232] border-brand-mint/60 dark:border-mint-700/60 shadow-soft-sm'
                        : missed
                          ? 'bg-gradient-to-r from-rose-50/90 via-amber-50/30 to-white dark:from-rose-950/40 dark:via-dark-teal-950/50 dark:to-[#0d2232] border-2 border-rose-300 dark:border-rose-800 shadow-soft-sm'
                          : 'bg-white dark:bg-[#0d2232] border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm hover:border-brand-mint/60'
                    }`}
                  >
                    {/* Celebratory Popping Banner when just taken */}
                    <AnimatePresence>
                      {isCelebrating && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -10 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                          className="
                            absolute top-3 right-4 rtl:right-auto rtl:left-4 z-20 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full
                            bg-gradient-to-r from-brand-mint to-emerald-400 text-dark-teal-950 text-xs font-black shadow-lg
                          "
                        >
                          <PartyPopper className="w-3.5 h-3.5" />
                          <span>{t('timeline.goodJobSync')}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                      {/* Big readable clock pill for older demographics */}
                      <div
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[80px] sm:min-w-[92px] shadow-xs border transition-colors ${
                          taken
                            ? 'bg-brand-mint text-dark-teal-950 border-mint-300 font-black'
                            : missed
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-200 dark:border-rose-800 font-black'
                              : 'bg-dark-teal-50 text-brand-teal dark:bg-dark-teal-950 dark:text-mint-300 border-dark-teal-100 dark:border-dark-teal-800'
                        }`}
                      >
                        <Clock className="w-4 h-4 mb-0.5 stroke-[2.5]" />
                        <span className="font-black text-xs sm:text-base tracking-tight font-tabular">
                          {item.timeDisplay.split(' ')[0]}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {item.timeDisplay.split(' ')[1] || 'DOSE'}
                        </span>
                      </div>

                      {/* Medication Info & Visual Status Badge */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight break-words">
                            {item.medicationName}
                          </h4>
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-dark-teal-900/80 text-slate-600 dark:text-slate-300 font-bold border border-slate-200/60 dark:border-dark-teal-800/60 shrink-0">
                            {item.dosageForm}
                          </span>

                          {/* Dynamic Compliance Status Pill */}
                          {taken ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-mint-100 dark:bg-mint-900/80 text-brand-mint border border-brand-mint shadow-xs shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t('timeline.taken')}
                            </span>
                          ) : missed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs shrink-0">
                              <XCircle className="w-3.5 h-3.5" /> {t('timeline.missedOverdue')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-dark-teal-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-teal-800 shrink-0">
                              <Clock className="w-3.5 h-3.5" /> {t('timeline.pending')}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-snug break-words">
                          {item.dosageInstructions}
                        </p>

                        {taken && (
                          <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-mint-300 font-extrabold pt-0.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                            <span>{t('timeline.loggedTakenAt')} {takenAt || t('timeline.loggedTakenToday')}</span>
                          </motion.div>
                        )}

                        {missed && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold pt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('timeline.overdueWarning')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Big Accessible Action Button with Popping Checkmark */}
                    <div className="sm:shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.93 }}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleTaken(item)}
                        aria-label={`Mark ${item.medicationName} at ${item.timeDisplay} as ${taken ? 'not taken' : 'taken'}`}
                        className={`w-full sm:w-auto min-h-[54px] px-6 sm:px-7 py-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-colors duration-200 shadow-md cursor-pointer ${
                          taken
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-mint-200 border-2 border-brand-mint'
                            : missed
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white shadow-rose-500/25'
                              : 'bg-gradient-to-r from-brand-mint to-teal-400 hover:from-mint-400 hover:to-teal-500 text-dark-teal-950 shadow-brand-mint/25'
                        }`}
                      >
                        {isUpdating ? (
                          <span className="animate-pulse">{t('timeline.saving')}</span>
                        ) : taken ? (
                          <>
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: [0, 1.35, 1], rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                              className="w-7 h-7 rounded-full bg-brand-mint text-dark-teal-950 flex items-center justify-center shadow-sm"
                            >
                              <Check className="w-4 h-4 stroke-[3.5]" />
                            </motion.div>
                            <span>{t('timeline.doseTaken')}</span>
                            <span className="text-[11px] opacity-75 ml-0.5 font-bold">{t('timeline.undo')}</span>
                          </>
                        ) : missed ? (
                          <>
                            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center font-black text-xs">
                              !
                            </div>
                            <span>{t('timeline.takeMissedNow')}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded-full border-2 border-dark-teal-950/60 flex items-center justify-center" />
                            <span>{t('timeline.takeDoseNow')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
