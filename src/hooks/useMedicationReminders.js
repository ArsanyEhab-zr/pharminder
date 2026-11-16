import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { subscribeToMissedDosePings } from '../utils/clinicalAlerts'
import {
  startAlarmChime,
  stopAlarmChime,
  triggerAlarmVibration,
} from '../utils/alarmSound'
import {
  loadAllCustomAlarmTimes,
  getEffectiveAlarmTimesForRx,
  formatHHMMDisplay,
  buildTodaySlotDate,
  ALARM_SCHEDULE_UPDATED_EVENT,
} from '../utils/alarmSchedules'

export function useMedicationReminders({
  prescriptions = [],
  onDoseTaken,
  patientId = null,
  customTimesMap = null,
}) {
  const [activeAlertDose, setActiveAlertDose] = useState(null)
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)
  const [snoozedNotice, setSnoozedNotice] = useState('')
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )
  const [localSchedules, setLocalSchedules] = useState(() =>
    loadAllCustomAlarmTimes(patientId)
  )

  const effectiveSchedules = customTimesMap || localSchedules
  const alertedSlotsRef = useRef(new Set())
  const snoozedQueueRef = useRef([]) // [{ dose, triggerAtMs }]

  useEffect(() => {
    setLocalSchedules(loadAllCustomAlarmTimes(patientId))
    if (typeof window === 'undefined') return undefined

    const handleScheduleUpdate = (evt) => {
      if (!patientId || evt?.detail?.patientId === patientId) {
        setLocalSchedules(evt?.detail?.schedules || loadAllCustomAlarmTimes(patientId))
      }
    }
    window.addEventListener(ALARM_SCHEDULE_UPDATED_EVENT, handleScheduleUpdate)
    return () => {
      window.removeEventListener(ALARM_SCHEDULE_UPDATED_EVENT, handleScheduleUpdate)
    }
  }, [patientId])

  useEffect(() => {
    return () => {
      stopAlarmChime()
    }
  }, [])

  // Request Notification permissions cleanly
  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission()
        setNotificationPermission(result)
        return result
      } catch (err) {
        console.warn('Failed to request notification permission:', err)
      }
    }
    return 'denied'
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestPermission()
    }
  }, [requestPermission])

  const stopAlarm = useCallback(() => {
    stopAlarmChime()
    setIsAlarmPlaying(false)
  }, [])

  const startAlarm = useCallback(() => {
    startAlarmChime()
    triggerAlarmVibration()
    setIsAlarmPlaying(true)
  }, [])

  // Trigger Service Worker Push / Local Notification + Notification API fallback
  const sendNotification = useCallback(async (dose) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const title = dose.isCareTeamPing
      ? 'Urgent: Care Team Medication Alert'
      : `Pharminder: Time for ${dose.medicationName}`
    const bodyText = dose.isCareTeamPing
      ? `${dose.urgentNote || 'You missed a scheduled dose.'} Please take ${dose.medicationName}.`
      : `${dose.medicationName} — ${dose.dosageInstructions || 'Take your prescribed dose now.'}`

    const options = {
      body: bodyText,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [400, 150, 400, 150, 600],
      tag: dose.slotKey || 'medication-reminder',
      requireInteraction: true,
      renotify: true,
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
        ])
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, options)
          return
        }
      }

      const notification = new Notification(title, options)
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (err) {
      console.warn('Browser/SW notification error:', err)
    }
  }, [])

  // Real-Time Listener for Care Team Missed Dose Pings
  useEffect(() => {
    const unsubscribe = subscribeToMissedDosePings(patientId, (ping) => {
      const matchedRx = (prescriptions || []).find((r) => r.id === ping.prescriptionId) || prescriptions?.[0]

      const pingDoseItem = {
        slotKey: `care-team-${ping.pingId || Date.now()}`,
        prescriptionId: ping.prescriptionId || matchedRx?.id || null,
        medicationName: ping.medicationName || matchedRx?.medication?.name || 'Prescribed Medication',
        dosageInstructions: ping.dosageInstructions || matchedRx?.dosage_instructions || 'Take 1 dose immediately with water',
        dosageForm: ping.dosageForm || matchedRx?.medication?.dosage_form || 'Tablet',
        timeDisplay: 'Urgent Care Team Alert',
        scheduledIso: ping.scheduledTime || new Date().toISOString(),
        isCareTeamPing: true,
        doctorName: ping.doctorName || 'Dr. Sarah Smith, PharmD',
        urgentNote: ping.urgentNote || 'Urgent message from your Pharmacist/Doctor: You missed a dose. Please take it immediately.',
        sentAt: ping.timestamp || new Date().toISOString(),
        pingId: ping.pingId,
      }

      setActiveAlertDose(pingDoseItem)
      startAlarm()
      sendNotification(pingDoseItem)
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [patientId, prescriptions, sendNotification, startAlarm])

  // Check active medication schedules & snoozed reminders every 10 seconds
  const checkDueDoses = useCallback(() => {
    const now = new Date()
    const nowMs = now.getTime()

    // 1. Check snoozed alerts ready to re-fire
    if (snoozedQueueRef.current.length > 0) {
      const readyIdx = snoozedQueueRef.current.findIndex((entry) => entry.triggerAtMs <= nowMs)
      if (readyIdx !== -1) {
        const [readyEntry] = snoozedQueueRef.current.splice(readyIdx, 1)
        const snoozedDose = {
          ...readyEntry.dose,
          slotKey: `${readyEntry.dose.slotKey}-snoozed-${nowMs}`,
        }
        setActiveAlertDose(snoozedDose)
        startAlarm()
        sendNotification(snoozedDose)
        return
      }
    }

    if (!prescriptions || prescriptions.length === 0) return

    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const todayStr = now.toISOString().split('T')[0]

    for (const rx of prescriptions) {
      const medName = rx.medication?.name || 'Prescribed Medication'
      const dosage = rx.dosage_instructions || 'Take as directed'
      const hhmmSlots = getEffectiveAlarmTimesForRx(rx, effectiveSchedules)

      for (let i = 0; i < hhmmSlots.length; i++) {
        const hhmm = hhmmSlots[i]
        const [hoursStr, minutesStr] = hhmm.split(':')
        const hours = Number.parseInt(hoursStr, 10)
        const minutes = Number.parseInt(minutesStr, 10)
        const slotKey = `${rx.id}-${todayStr}-${hhmm}`

        // Trigger within current minute match or +/- 1 min margin cleanly once per slot
        const totalNowMin = currentHours * 60 + currentMinutes
        const totalSlotMin = hours * 60 + minutes
        if (
          Math.abs(totalNowMin - totalSlotMin) <= 1 &&
          !alertedSlotsRef.current.has(slotKey)
        ) {
          alertedSlotsRef.current.add(slotKey)
          const scheduledDate = buildTodaySlotDate(hhmm)
          const dueDoseItem = {
            slotKey,
            prescriptionId: rx.id,
            medicationName: medName,
            dosageInstructions: dosage,
            dosageForm: rx.medication?.dosage_form || 'Tablet',
            timeDisplay: formatHHMMDisplay(hhmm),
            scheduledIso: scheduledDate.toISOString(),
          }

          setActiveAlertDose(dueDoseItem)
          startAlarm()
          sendNotification(dueDoseItem)
          return
        }
      }
    }
  }, [prescriptions, effectiveSchedules, sendNotification, startAlarm])

  // Real-time 10-second alarm loop check
  useEffect(() => {
    checkDueDoses()
    const timer = setInterval(checkDueDoses, 10000)
    return () => clearInterval(timer)
  }, [checkDueDoses])

  // Manual trigger to verify live chime, vibration, SW notification, and modal immediately
  const triggerTestReminder = useCallback((customDose = null) => {
    const fallbackDose = prescriptions[0] || {
      id: 'demo-test-rx',
      dosage_instructions: 'Take 1 capsule by mouth with water',
      frequency: 'Every 8 hours (3 times daily)',
      medication: {
        name: 'Amoxicillin 500mg',
        dosage_form: 'Capsule',
        category: 'Antibiotic',
      },
    }

    const nowTimeDisplay = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    const testDoseItem = {
      slotKey: `test-${Date.now()}`,
      prescriptionId: customDose?.prescriptionId || fallbackDose.id,
      medicationName: customDose?.medicationName || fallbackDose.medication?.name || 'Amoxicillin 500mg',
      dosageInstructions: customDose?.dosageInstructions || fallbackDose.dosage_instructions,
      dosageForm: customDose?.dosageForm || fallbackDose.medication?.dosage_form || 'Capsule',
      timeDisplay: customDose?.timeDisplay || nowTimeDisplay,
      scheduledIso: new Date().toISOString(),
    }

    setActiveAlertDose(testDoseItem)
    startAlarm()
    sendNotification(testDoseItem)
  }, [prescriptions, sendNotification, startAlarm])

  // Handle Mark Taken from Modal
  const handleTakeDoseFromModal = useCallback(async (dose) => {
    stopAlarm()
    setActiveAlertDose(null)

    if (!dose?.prescriptionId || String(dose.prescriptionId).startsWith('demo-')) {
      if (onDoseTaken) onDoseTaken()
      return
    }

    try {
      const nowIso = new Date().toISOString()
      const scheduledIso = dose.scheduledIso || nowIso
      const client = supabaseAdmin || supabase

      const { data: existingLog } = await client
        .from('dose_logs')
        .select('id')
        .eq('prescription_id', dose.prescriptionId)
        .eq('scheduled_time', scheduledIso)
        .maybeSingle()

      if (existingLog?.id) {
        await client
          .from('dose_logs')
          .update({
            taken_time: nowIso,
            status: 'taken',
          })
          .eq('id', existingLog.id)
      } else {
        await client.from('dose_logs').insert({
          prescription_id: dose.prescriptionId,
          scheduled_time: scheduledIso,
          taken_time: nowIso,
          status: 'taken',
        })
      }

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('pharminder-clinical-sync')
          bc.postMessage({ type: 'DOSE_TAKEN', prescriptionId: dose.prescriptionId })
          bc.close()
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Error recording dose log from modal:', err)
    }

    if (onDoseTaken) onDoseTaken()
  }, [onDoseTaken, stopAlarm])

  // Real 10-minute snooze reschedule
  const snoozeAlarm = useCallback((minutes = 10) => {
    const currentDose = activeAlertDose
    stopAlarm()
    setActiveAlertDose(null)
    if (currentDose) {
      const triggerAtMs = Date.now() + minutes * 60 * 1000
      snoozedQueueRef.current.push({ dose: currentDose, triggerAtMs })
      const snoozeTimeStr = new Date(triggerAtMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      setSnoozedNotice(snoozeTimeStr)
      setTimeout(() => setSnoozedNotice(''), 6000)
    }
  }, [activeAlertDose, stopAlarm])

  // Dismiss silently
  const dismissModal = useCallback(() => {
    stopAlarm()
    setActiveAlertDose(null)
  }, [stopAlarm])

  return {
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
  }
}
