import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { subscribeToMissedDosePings } from '../utils/clinicalAlerts'

// Web Audio API Melodic Healthcare Chime
class ChimeSound {
  constructor() {
    this.ctx = null
    this.intervalId = null
    this.isPlaying = false
  }

  playTone(freq, duration, delay, type = 'sine') {
    if (!this.ctx) return
    try {
      const now = this.ctx.currentTime + delay
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(freq, now)

      // Peaceful soft envelope
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    } catch (e) {
      console.warn('Tone playback error:', e)
    }
  }

  playMelody() {
    // Calming 4-tone ascending healthcare chime (C5 -> E5 -> G5 -> C6)
    this.playTone(523.25, 0.45, 0.0)
    this.playTone(659.25, 0.45, 0.18)
    this.playTone(783.99, 0.55, 0.36)
    this.playTone(1046.50, 0.9, 0.54)
  }

  start() {
    if (this.isPlaying) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      this.isPlaying = true
      this.playMelody()

      // Repeat chime periodically like a gentle alarm until taken or silenced
      this.intervalId = setInterval(() => {
        if (this.isPlaying && this.ctx) {
          this.playMelody()
        }
      }, 3500)
    } catch (err) {
      console.warn('AudioContext initialization error:', err)
    }
  }

  stop() {
    this.isPlaying = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.ctx) {
      try {
        this.ctx.close()
      } catch (_e) {
        // ignore
      }
      this.ctx = null
    }
  }
}

export function useMedicationReminders({ prescriptions = [], onDoseTaken, patientId = null }) {
  const [activeAlertDose, setActiveAlertDose] = useState(null)
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const chimeRef = useRef(null)
  const alertedSlotsRef = useRef(new Set())

  // Initialize Audio player ref
  useEffect(() => {
    chimeRef.current = new ChimeSound()
    return () => {
      if (chimeRef.current) {
        chimeRef.current.stop()
      }
    }
  }, [])

  // Auto-request Notification permissions if supported and default
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

  // Stop Chime sound
  const stopAlarm = useCallback(() => {
    if (chimeRef.current) {
      chimeRef.current.stop()
    }
    setIsAlarmPlaying(false)
  }, [])

  // Start Chime sound
  const startAlarm = useCallback(() => {
    if (chimeRef.current) {
      chimeRef.current.start()
      setIsAlarmPlaying(true)
    }
  }, [])

  // Trigger browser notification
  const sendNotification = useCallback((dose) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = dose.isCareTeamPing 
          ? '⚠️ Urgent: Care Team Medication Alert!' 
          : 'Time for your medication!'
        const bodyText = dose.isCareTeamPing
          ? `${dose.urgentNote || 'You missed a scheduled dose.'} Please take ${dose.medicationName}.`
          : `Time to take ${dose.medicationName}. ${dose.dosageInstructions || ''}`

        const notification = new Notification(title, {
          body: bodyText,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: dose.slotKey || 'medication-reminder',
          requireInteraction: true,
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch (err) {
        console.warn('Browser notification error:', err)
      }
    }
  }, [])

  // Real-Time Listener for Care Team Missed Dose Pings
  useEffect(() => {
    const unsubscribe = subscribeToMissedDosePings(patientId, (ping) => {
      // Find matching prescription details if available
      const matchedRx = (prescriptions || []).find((r) => r.id === ping.prescriptionId) || prescriptions?.[0]

      const pingDoseItem = {
        slotKey: `care-team-${ping.pingId || Date.now()}`,
        prescriptionId: ping.prescriptionId || matchedRx?.id || null,
        medicationName: ping.medicationName || matchedRx?.medication?.name || 'Prescribed Medication',
        dosageInstructions: ping.dosageInstructions || matchedRx?.dosage_instructions || 'Take 1 dose immediately with water',
        dosageForm: ping.dosageForm || matchedRx?.medication?.dosage_form || 'Tablet',
        timeDisplay: 'Missed Dose — Urgent Care Team Alert',
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

  // Check schedule for matching dose times
  const checkDueDoses = useCallback(() => {
    if (!prescriptions || prescriptions.length === 0) return

    const now = new Date()
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const todayStr = now.toISOString().split('T')[0]

    for (const rx of prescriptions) {
      const medName = rx.medication?.name || 'Prescribed Medication'
      const dosage = rx.dosage_instructions || 'Take as directed'
      const freq = (rx.frequency || '').toLowerCase()

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
      }

      for (let i = 0; i < slots.length; i++) {
        const slotTime = slots[i]
        const clean = slotTime.replace(' (As Needed)', '').replace(' (Weekly)', '')
        const [rawTime, modifier] = clean.split(' ')
        let [hours, minutes] = rawTime.split(':').map(Number)
        if (modifier === 'PM' && hours !== 12) hours += 12
        if (modifier === 'AM' && hours === 12) hours = 0

        const slotKey = `${rx.id}-${todayStr}-${i}`

        // Trigger if within 1-minute window and not yet alerted in this session
        if (
          hours === currentHours &&
          Math.abs((minutes || 0) - currentMinutes) <= 1 &&
          !alertedSlotsRef.current.has(slotKey)
        ) {
          alertedSlotsRef.current.add(slotKey)

          const dueDoseItem = {
            slotKey,
            prescriptionId: rx.id,
            medicationName: medName,
            dosageInstructions: dosage,
            dosageForm: rx.medication?.dosage_form || 'Tablet',
            timeDisplay: slotTime,
            scheduledIso: now.toISOString(),
          }

          setActiveAlertDose(dueDoseItem)
          startAlarm()
          sendNotification(dueDoseItem)
          break
        }
      }
    }
  }, [prescriptions, sendNotification, startAlarm])

  // Periodic timer check (every 30 seconds)
  useEffect(() => {
    checkDueDoses()
    const timer = setInterval(checkDueDoses, 30000)
    return () => clearInterval(timer)
  }, [checkDueDoses])

  // Manual trigger to simulate & demo the alarm instantly for project presentation
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

    const testDoseItem = {
      slotKey: `test-${Date.now()}`,
      prescriptionId: customDose?.prescriptionId || fallbackDose.id,
      medicationName: customDose?.medicationName || fallbackDose.medication?.name || 'Amoxicillin 500mg',
      dosageInstructions: customDose?.dosageInstructions || fallbackDose.dosage_instructions,
      dosageForm: customDose?.dosageForm || fallbackDose.medication?.dosage_form || 'Capsule',
      timeDisplay: customDose?.timeDisplay || 'Now (Demo Trigger)',
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

    if (!dose?.prescriptionId) {
      if (onDoseTaken) onDoseTaken()
      return
    }

    try {
      const nowIso = new Date().toISOString()
      const scheduledIso = dose.scheduledIso || nowIso

      const client = supabaseAdmin || supabase

      // Check if a missed log already exists for this prescription/time slot
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

      // Broadcast instant dose sync to update Pharmacist adherence view
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('pharminder-clinical-sync')
          bc.postMessage({ type: 'DOSE_TAKEN', prescriptionId: dose.prescriptionId })
          bc.close()
        } catch (_bcErr) {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Error recording dose log from modal:', err)
    }

    if (onDoseTaken) onDoseTaken()
  }, [onDoseTaken, stopAlarm])

  // Dismiss / Snooze modal
  const dismissModal = useCallback(() => {
    stopAlarm()
    setActiveAlertDose(null)
  }, [stopAlarm])

  return {
    activeAlertDose,
    isAlarmPlaying,
    notificationPermission,
    requestPermission,
    triggerTestReminder,
    stopAlarm,
    handleTakeDoseFromModal,
    dismissModal,
  }
}
