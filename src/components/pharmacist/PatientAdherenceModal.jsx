import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { broadcastMissedDosePing } from '../../utils/clinicalAlerts'
import { getDoseStatus, generatePrescriptionSlots, findMatchingLog } from '../../utils/doseStatus'
import { 
  X, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pill, 
  Calendar, 
  Sparkles, 
  HeartPulse, 
  Flame, 
  Check, 
  BellRing, 
  CheckCheck,
  AlertTriangle
} from 'lucide-react'

export default function PatientAdherenceModal({ patient, onClose, onPrescribeNew }) {
  const [loading, setLoading] = useState(true)
  const [prescriptions, setPrescriptions] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [filterMedId, setFilterMedId] = useState('all')
  const [nowDate] = useState(() => new Date())
  const [pingingDoseId, setPingingDoseId] = useState(null)
  const [pingSuccessMap, setPingSuccessMap] = useState({})
  const [toastMessage, setToastMessage] = useState(null)

  const patientData = Array.isArray(patient?.patients_data) 
    ? patient?.patients_data[0] 
    : patient?.patients_data

  // Fetch patient prescriptions & dose logs from Supabase
  const fetchPatientAdherenceData = useCallback(async () => {
    if (!patient?.id) return

    try {
      setLoading(true)
      const client = supabaseAdmin || supabase

      // 1. Fetch all prescriptions for this patient
      const { data: rxData, error: rxErr } = await client
        .from('prescriptions')
        .select(`
          id,
          dosage_instructions,
          frequency,
          start_date,
          end_date,
          status,
          created_at,
          medication:medication_id (
            id,
            name,
            category,
            dosage_form
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

      if (rxErr) throw rxErr
      const fetchedRxs = rxData || []
      setPrescriptions(fetchedRxs)

      // 2. Fetch all dose logs for these prescriptions
      if (fetchedRxs.length > 0) {
        const rxIds = fetchedRxs.map((r) => r.id)
        const { data: logsData, error: logsErr } = await client
          .from('dose_logs')
          .select('*')
          .in('prescription_id', rxIds)
          .order('scheduled_time', { ascending: false })

        if (logsErr) throw logsErr
        setDoseLogs(logsData || [])
      } else {
        setDoseLogs([])
      }
    } catch (err) {
      console.error('Error loading patient adherence history:', err)
    } finally {
      setLoading(false)
    }
  }, [patient])

  useEffect(() => {
    fetchPatientAdherenceData()

    // Realtime channel for live sync when patient marks a dose as taken
    const client = supabaseAdmin || supabase
    const channel = client
      .channel(`adherence-modal-live-${patient?.id || 'sync'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dose_logs' },
        () => fetchPatientAdherenceData()
      )
      .subscribe()

    // Cross-tab immediate sync
    let bc = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('pharminder-clinical-sync')
      bc.onmessage = () => fetchPatientAdherenceData()
    }

    return () => {
      try {
        client.removeChannel(channel)
      } catch (_err) {
        // ignore
      }
      if (bc) {
        try {
          bc.close()
        } catch (_err) {
          // ignore
        }
      }
    }
  }, [fetchPatientAdherenceData, patient?.id])

  // Helper to generate a realistic 7-day demo history if database has 0 records
  const handleSeedDemoAdherence = async () => {
    if (!patient?.id) return

    try {
      setSeedingDemo(true)
      const client = supabaseAdmin || supabase

      // 1. Ensure at least 1-2 prescriptions exist
      let targetRxId = prescriptions[0]?.id

      if (!targetRxId) {
        // Find existing medication
        const { data: meds } = await client.from('medications').select('id').limit(1)
        const medId = meds?.[0]?.id

        if (medId) {
          const { data: newRx } = await client
            .from('prescriptions')
            .insert({
              patient_id: patient.id,
              medication_id: medId,
              dosage_instructions: 'Take 1 tablet twice daily with food',
              frequency: 'Every 12 hours (2 times daily)',
              start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
              status: 'active',
            })
            .select()
            .single()

          targetRxId = newRx?.id
        }
      }

      if (targetRxId) {
        // Create 7 days of logs (morning and evening = 14 doses) with ~85% compliance for past days
        // TODAY (dayOffset === 0) is NEVER defaulted to taken!
        const simulatedLogs = []
        const now = Date.now()

        for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
          const dayDate = new Date(now - dayOffset * 86400000)
          const dateStr = dayDate.toISOString().split('T')[0]

          // Morning Dose (08:00 AM)
          const morningSched = new Date(`${dateStr}T08:00:00Z`).toISOString()
          const isMorningOverdue = Date.now() - new Date(morningSched).getTime() >= 30 * 60 * 1000

          if (dayOffset === 0) {
            // Today: never taken by default!
            simulatedLogs.push({
              prescription_id: targetRxId,
              scheduled_time: morningSched,
              taken_time: null,
              status: isMorningOverdue ? 'missed' : 'pending',
            })
          } else {
            // Past days: realistic historical record
            const morningTaken = dayOffset === 2 
              ? null // Missed on day 2
              : new Date(new Date(morningSched).getTime() + (Math.random() * 20 - 5) * 60000).toISOString()

            simulatedLogs.push({
              prescription_id: targetRxId,
              scheduled_time: morningSched,
              taken_time: morningTaken,
              status: morningTaken ? 'taken' : 'missed',
            })
          }

          // Evening Dose (08:00 PM)
          const eveningSched = new Date(`${dateStr}T20:00:00Z`).toISOString()
          const isEveningOverdue = Date.now() - new Date(eveningSched).getTime() >= 30 * 60 * 1000

          if (dayOffset === 0) {
            // Today: never taken by default!
            simulatedLogs.push({
              prescription_id: targetRxId,
              scheduled_time: eveningSched,
              taken_time: null,
              status: isEveningOverdue ? 'missed' : 'pending',
            })
          } else {
            // Past days: evening dose
            const eveningTaken = dayOffset === 5
              ? null // Missed on day 5
              : new Date(new Date(eveningSched).getTime() + (Math.random() * 25) * 60000).toISOString()

            simulatedLogs.push({
              prescription_id: targetRxId,
              scheduled_time: eveningSched,
              taken_time: eveningTaken,
              status: eveningTaken ? 'taken' : 'missed',
            })
          }
        }

        // Insert into database
        await client.from('dose_logs').insert(simulatedLogs)
      }

      await fetchPatientAdherenceData()
    } catch (err) {
      console.error('Failed to seed demo adherence data:', err)
    } finally {
      setSeedingDemo(false)
    }
  }

  // Handle Real-Time Missed Dose Ping to Patient Device
  const handlePingPatient = async (log) => {
    if (!patient?.id) return
    const logId = log?.id || log?.slot_key || 'summary-missed'
    const matchedRx = prescriptions.find((r) => r.id === log?.prescription_id) || prescriptions[0]
    const medName = matchedRx?.medication?.name || log?.medicationName || 'Prescribed Medication'
    const dosage = matchedRx?.dosage_instructions || log?.dosageInstructions || 'Take 1 dose immediately with water'
    const dosageForm = matchedRx?.medication?.dosage_form || log?.dosageForm || 'Tablet'

    try {
      setPingingDoseId(logId)
      const res = await broadcastMissedDosePing({
        patientId: patient.id,
        doctorName: 'Dr. Sarah Smith, PharmD',
        prescriptionId: matchedRx?.id || log?.prescription_id || null,
        medicationName: medName,
        dosageInstructions: dosage,
        dosageForm,
        scheduledTime: log?.scheduled_time || new Date().toISOString(),
        urgentNote: `Urgent message from your Pharmacist/Doctor: You missed a dose of ${medName}. Please take it immediately.`,
      })

      if (res?.success) {
        setPingSuccessMap((prev) => ({ ...prev, [logId]: true }))
        setToastMessage(`Urgent alert sent to ${patient?.full_name || 'patient'}’s device! Melodic alarm is ringing.`)
        setTimeout(() => setToastMessage(null), 5000)
        setTimeout(() => {
          setPingSuccessMap((prev) => ({ ...prev, [logId]: false }))
        }, 4000)
      }
    } catch (err) {
      console.error('Error broadcasting missed dose ping:', err)
      setToastMessage('Could not reach patient device. Please verify connection.')
      setTimeout(() => setToastMessage(null), 4000)
    } finally {
      setPingingDoseId(null)
    }
  }

  // Unified dose events list: combines today's expected prescription slots with logged history
  const allDoseEvents = useMemo(() => {
    const events = []
    const now = new Date()

    // 1. Generate today's expected slots for each active prescription
    prescriptions.forEach((rx) => {
      const slots = generatePrescriptionSlots(rx, nowDate)
      slots.forEach((slot) => {
        const matchingLog = findMatchingLog(slot, doseLogs)
        const status = getDoseStatus(slot.scheduledIso, matchingLog, now)

        events.push({
          id: matchingLog?.id || slot.slotKey,
          slot_key: slot.slotKey,
          prescription_id: rx.id,
          prescription: rx,
          scheduled_time: slot.scheduledIso,
          taken_time: matchingLog?.taken_time || null,
          status,
          medicationName: rx.medication?.name || 'Medication',
          dosageInstructions: rx.dosage_instructions || 'Take as prescribed',
          dosageForm: rx.medication?.dosage_form || 'Tablet',
          isToday: true,
          isSynthetic: !matchingLog,
        })
      })
    })

    // 2. Add past dose logs from previous calendar days
    doseLogs.forEach((log) => {
      const schedDate = new Date(log.scheduled_time || log.created_at)
      const isToday = schedDate.toDateString() === nowDate.toDateString()

      if (isToday) return // already represented in today's slots

      const matchedRx = prescriptions.find((r) => r.id === log.prescription_id)
      events.push({
        id: log.id,
        slot_key: log.slot_key || log.id,
        prescription_id: log.prescription_id,
        prescription: matchedRx,
        scheduled_time: log.scheduled_time || log.created_at,
        taken_time: log.taken_time || null,
        status: log.status || (log.taken_time ? 'taken' : 'missed'),
        medicationName: matchedRx?.medication?.name || 'Medication',
        dosageInstructions: matchedRx?.dosage_instructions || 'Take as prescribed',
        dosageForm: matchedRx?.medication?.dosage_form || 'Tablet',
        isToday: false,
        isSynthetic: false,
      })
    })

    // Sort newest scheduled time first
    return events.sort(
      (a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
    )
  }, [prescriptions, doseLogs, nowDate])

  // Active / filtered logs
  const filteredLogs = useMemo(() => {
    if (filterMedId === 'all') return allDoseEvents
    return allDoseEvents.filter((log) => log.prescription_id === filterMedId)
  }, [allDoseEvents, filterMedId])

  // Calculate Overall Adherence Score
  const stats = useMemo(() => {
    const total = filteredLogs.length
    if (total === 0) {
      return {
        total: 0,
        taken: 0,
        missed: 0,
        pending: 0,
        score: 100, // Default baseline
        streak: 0,
        status: 'Optimal',
      }
    }

    const taken = filteredLogs.filter((l) => l.status === 'taken').length
    const missed = filteredLogs.filter((l) => l.status === 'missed').length
    const pending = filteredLogs.filter((l) => l.status === 'pending').length

    // Score based on completed vs overdue doses
    const evaluatedTotal = taken + missed
    const score = evaluatedTotal > 0 ? Math.round((taken / evaluatedTotal) * 100) : 100

    // Calculate consecutive taken streak
    let streak = 0
    for (const log of filteredLogs) {
      if (log.status === 'taken') streak++
      else if (log.status === 'missed') break
    }

    let status = 'Excellent'
    if (score < 60) status = 'High Risk'
    else if (score < 80) status = 'Needs Attention'
    else if (score < 90) status = 'Good'

    return { total, taken, missed, pending, score, streak, status }
  }, [filteredLogs])

  // Group logs into the last 7 calendar days for the visual chart
  const last7DaysChartData = useMemo(() => {
    const days = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowDate)
      d.setDate(d.getDate() - i)
      const dayDateStr = d.toDateString()
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayNum = d.getDate()

      // Find logs recorded on this date
      const daysLogs = allDoseEvents.filter((item) => {
        const itemDate = new Date(item.scheduled_time).toDateString()
        return itemDate === dayDateStr
      })

      const dayTotal = daysLogs.length
      const dayTaken = daysLogs.filter((l) => l.status === 'taken').length
      const dayMissed = daysLogs.filter((l) => l.status === 'missed').length

      let dayStatus = 'none'
      if (dayTotal > 0) {
        if (dayMissed === 0 && dayTaken > 0) dayStatus = 'full'
        else if (dayTaken > 0 && dayMissed > 0) dayStatus = 'partial'
        else if (dayMissed > 0) dayStatus = 'missed'
        else dayStatus = 'pending'
      }

      days.push({
        dateStr: dayDateStr,
        dayName,
        dayNum,
        total: dayTotal,
        taken: dayTaken,
        missed: dayMissed,
        status: dayStatus,
      })
    }

    return days
  }, [allDoseEvents, nowDate])

  const scoreColor = stats.score >= 85 
    ? 'text-brand-mint' 
    : stats.score >= 70 
      ? 'text-amber-500' 
      : 'text-rose-500'

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adherence-modal-title"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-[#0d2232] rounded-3xl border border-slate-200/80 dark:border-dark-teal-800/80 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-in">
        {/* 1. Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-dark-teal-900 to-brand-teal text-white flex items-center justify-between border-b border-white/10 shrink-0 relative">
          {/* Real-time Toast Feedback Bar */}
          {toastMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 animate-fade-in px-4 py-2 rounded-xl bg-dark-teal-950 text-white border border-brand-mint shadow-xl flex items-center gap-2 max-w-sm sm:max-w-md">
              <CheckCheck className="w-4 h-4 text-brand-mint shrink-0" />
              <p className="text-xs font-extrabold text-slate-100 flex-1 truncate">
                {toastMessage}
              </p>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="p-1 rounded hover:bg-white/10 text-white/70"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-brand-mint font-black text-lg shadow-inner">
              {patient?.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-mint-200 bg-white/10 px-2 py-0.5 rounded-md">
                  Compliance Audit
                </span>
                <span className="text-xs text-white/70 font-semibold font-tabular">
                  ID: {patient?.id?.slice(0, 8)}
                </span>
              </div>
              <h2 id="adherence-modal-title" className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight">
                {patient?.full_name}’s Adherence Score & History
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Modal Scrollable Content */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Top Score & Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center p-6 rounded-3xl bg-gradient-to-br from-slate-50 via-mint-50/20 to-white dark:from-dark-teal-950/80 dark:via-dark-teal-900/40 dark:to-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm">
            {/* Score Radial Ring */}
            <div className="flex items-center gap-4.5 justify-center md:justify-start">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-slate-200 dark:text-dark-teal-900"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * stats.score) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className={`${scoreColor} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl sm:text-3xl font-black ${scoreColor} font-tabular`}>
                    {stats.score}%
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Adherence
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Clinical Compliance
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {stats.status}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-tabular">
                  Based on {stats.total} total expected dose intervals
                </p>
              </div>
            </div>

            {/* Compliance Breakdown Stat Pills */}
            <div className="grid grid-cols-3 gap-3 md:col-span-2">
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-xs text-center">
                <div className="flex items-center justify-center gap-1.5 text-brand-mint text-xs font-black mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Taken</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-tabular">
                  {stats.taken}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Doses on record</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-xs text-center">
                <div className="flex items-center justify-center gap-1.5 text-rose-500 text-xs font-black mb-1">
                  <XCircle className="w-4 h-4" />
                  <span>Missed</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-tabular">
                  {stats.missed}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Untaken intervals</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-xs text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-500 text-xs font-black mb-1">
                  <Flame className="w-4 h-4" />
                  <span>Streak</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-tabular">
                  {stats.streak}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Consecutive doses</span>
              </div>
            </div>
          </div>

          {/* 7-Day Visual Adherence Matrix */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-mint" />
                  <span>7-Day Dose Compliance Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Visual daily audit showing completed doses vs missed intervals
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-brand-mint shadow-xs" /> Taken
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" /> Missed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-dark-teal-900" /> No Dose
                </span>
              </div>
            </div>

            {/* Weekly Grid Visualization */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2">
              {last7DaysChartData.map((day) => {
                const isFull = day.status === 'full'
                const isPartial = day.status === 'partial'
                const isMissed = day.status === 'missed'

                return (
                  <div
                    key={day.dateStr}
                    className={`p-3 sm:p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[100px] shadow-soft-xs ${
                      isFull
                        ? 'bg-mint-50/80 dark:bg-mint-950/40 border-mint-200 dark:border-mint-800'
                        : isPartial
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : isMissed
                            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                            : 'bg-slate-50 dark:bg-dark-teal-950/50 border-slate-200 dark:border-dark-teal-800'
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      {day.dayName}
                    </span>

                    <div className="my-1.5">
                      {isFull ? (
                        <div className="w-8 h-8 rounded-full bg-brand-mint text-white flex items-center justify-center shadow-xs">
                          <Check className="w-4 h-4 stroke-[3.5]" />
                        </div>
                      ) : isPartial ? (
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs font-black text-xs font-tabular">
                          {day.taken}/{day.total}
                        </div>
                      ) : isMissed ? (
                        <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                          <X className="w-4 h-4 stroke-[3.5]" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-dark-teal-900 text-slate-400 flex items-center justify-center text-xs">
                          —
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 font-tabular">
                      {day.dayNum}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Missed Dose Priority Care Team Action Callout */}
          {stats.missed > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/60 to-rose-50 dark:from-rose-950/40 dark:via-dark-teal-950/60 dark:to-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/25">
                  <BellRing className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-md">
                      Clinical Action Required
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {stats.missed} Missed Dose{stats.missed > 1 ? 's' : ''} Identified
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    Send a real-time alarm alert to {patient?.full_name || 'patient'}’s device to immediately prompt adherence.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstMissed = filteredLogs.find((l) => l.status === 'missed') || { id: 'summary-missed' }
                  handlePingPatient(firstMissed)
                }}
                disabled={pingingDoseId === 'summary-missed'}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 active:scale-95 text-white text-xs font-black shadow-lg shadow-rose-500/25 transition-all cursor-pointer whitespace-nowrap"
              >
                <BellRing className={`w-4 h-4 ${pingingDoseId === 'summary-missed' ? 'animate-spin' : 'animate-bounce'}`} />
                <span>
                  {pingSuccessMap['summary-missed']
                    ? 'Alert Sent to Patient ✓'
                    : 'Ping Patient (Send Alert)'}
                </span>
              </button>
            </div>
          )}

          {/* Dose Log Records Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-teal dark:text-mint-300" />
                  <span>Recent Dose Event Logs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Granular timestamp logs recorded from patient’s daily timeline interactions
                </p>
              </div>

              {/* Medication Filter dropdown if multiple prescriptions */}
              {prescriptions.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Filter:</span>
                  <select
                    value={filterMedId}
                    onChange={(e) => setFilterMedId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint text-xs font-bold"
                  >
                    <option value="all">All Prescriptions ({prescriptions.length})</option>
                    {prescriptions.map((rx) => (
                      <option key={rx.id} value={rx.id}>
                        {rx.medication?.name || 'Medication'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-dark-teal-950/60 border border-slate-200 dark:border-dark-teal-800 space-y-3">
                <div className="w-11 h-11 mx-auto rounded-2xl bg-slate-200 dark:bg-dark-teal-900 flex items-center justify-center text-slate-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  No Dose Logs Found
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                  This patient has not logged any doses yet today. You can simulate a 7-day adherence history for graduation project testing.
                </p>
                <button
                  type="button"
                  onClick={handleSeedDemoAdherence}
                  disabled={seedingDemo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-dark-teal-950 text-xs font-extrabold hover:bg-mint-400 transition-colors shadow-md shadow-brand-mint/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{seedingDemo ? 'Simulating…' : 'Simulate 7-Day Adherence Log'}</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-dark-teal-800/60 text-slate-400 uppercase tracking-widest text-[10px]">
                      <th className="pb-3 font-extrabold">Scheduled Time</th>
                      <th className="pb-3 font-extrabold">Medication Regimen</th>
                      <th className="pb-3 font-extrabold">Taken Timestamp</th>
                      <th className="pb-3 font-extrabold">Compliance Status</th>
                      <th className="pb-3 font-extrabold text-right">Doctor Care Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-teal-800/50">
                    {filteredLogs.slice(0, 15).map((log) => {
                      const medName = log.medicationName || 'Medication'
                      const isTaken = log.status === 'taken'
                      const isMissed = log.status === 'missed'

                      const schedDate = log.scheduled_time ? new Date(log.scheduled_time) : null
                      const takenDate = log.taken_time ? new Date(log.taken_time) : null
                      const isToday = schedDate ? schedDate.toDateString() === nowDate.toDateString() : false
                      const rowKey = log.id || log.slot_key

                      return (
                        <tr key={rowKey} className="hover:bg-slate-50/80 dark:hover:bg-dark-teal-950/40 transition-colors">
                          <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200 font-tabular">
                            {schedDate ? (
                              <span>
                                {isToday ? (
                                  <span className="text-brand-teal dark:text-mint-300">
                                    {schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Today)
                                  </span>
                                ) : (
                                  schedDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                )}
                              </span>
                            ) : (
                              'Scheduled'
                            )}
                          </td>
                          <td className="py-3.5">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-brand-teal dark:text-mint-300" />
                              {medName}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-medium">
                              {log.dosageInstructions || 'Take as prescribed'}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-600 dark:text-slate-300 font-tabular font-medium">
                            {takenDate ? (
                              <span className="text-brand-mint font-bold">
                                {takenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : isMissed ? (
                              <span className="text-rose-600 dark:text-rose-400 font-extrabold italic">
                                Not recorded (Overdue)
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Scheduled today</span>
                            )}
                          </td>
                          <td className="py-3.5">
                            {isTaken ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-mint-50 dark:bg-mint-950/80 text-brand-mint border border-mint-200 dark:border-mint-800 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Taken
                              </span>
                            ) : isMissed ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shadow-xs">
                                <XCircle className="w-3.5 h-3.5" /> Missed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-dark-teal-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-teal-800 shadow-xs">
                                <Clock className="w-3.5 h-3.5 text-brand-teal" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            {isTaken ? (
                              <span className="text-[11px] text-slate-400 font-semibold font-tabular">Compliant ✓</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePingPatient(log)}
                                disabled={pingingDoseId === rowKey}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md active:scale-95 ${
                                  pingSuccessMap[rowKey]
                                    ? 'bg-mint-100 dark:bg-mint-900/80 text-dark-teal-950 dark:text-mint-200 border border-brand-mint'
                                    : isMissed
                                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white shadow-rose-500/25 ring-2 ring-rose-400/20'
                                      : 'bg-dark-teal-50 dark:bg-dark-teal-900 text-brand-teal dark:text-mint-300 border border-dark-teal-200 dark:border-dark-teal-800 hover:bg-dark-teal-100'
                                }`}
                                title={isMissed ? 'Ring urgent alarm on patient device' : 'Send medication reminder to patient'}
                              >
                                <BellRing
                                  className={`w-3.5 h-3.5 ${
                                    pingingDoseId === rowKey
                                      ? 'animate-spin'
                                      : pingSuccessMap[rowKey]
                                        ? ''
                                        : isMissed
                                          ? 'animate-bounce'
                                          : ''
                                  }`}
                                />
                                <span>
                                  {pingingDoseId === rowKey
                                    ? 'Pinging…'
                                    : pingSuccessMap[rowKey]
                                      ? 'Alert Sent ✓'
                                      : isMissed
                                        ? 'Ping Patient (Send Alert)'
                                        : 'Ping Patient'}
                                </span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-dark-teal-950/90 border-t border-slate-200 dark:border-dark-teal-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Pharmacist compliance audit synced with Supabase <code className="text-brand-teal dark:text-mint-300 font-mono">dose_logs</code>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onPrescribeNew) onPrescribeNew(patient)
              }}
              className="px-4.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-brand-teal text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-brand-teal/20 cursor-pointer"
            >
              Prescribe Medication
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-dark-teal-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-dark-teal-700 hover:bg-slate-100 dark:hover:bg-dark-teal-800 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
