import {
  getEffectiveAlarmTimesForRx,
  formatHHMMDisplay,
} from './alarmSchedules'

/**
 * Dose Status Evaluation Engine
 * Single source of truth for medication schedule compliance.
 *
 * Rules:
 * 1. Default state of any scheduled dose is "pending".
 * 2. ONLY marked as "taken" if the patient explicitly marks/clicks "Take Dose".
 * 3. If current time is past scheduled_time by 30+ minutes and no 'taken' record exists,
 *    it is evaluated and visually displayed as "missed".
 */

export const OVERDUE_GRACE_PERIOD_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Evaluates whether a single dose slot is 'taken', 'missed', or 'pending'.
 *
 * @param {string|Date} scheduledTime - The scheduled time ISO string or Date
 * @param {Object|null} doseLog - The dose log from Supabase (if any)
 * @param {Date} [now=new Date()] - Reference timestamp (default: current system time)
 * @returns {'taken'|'missed'|'pending'}
 */
export function getDoseStatus(scheduledTime, doseLog, now = new Date()) {
  if (doseLog && doseLog.status === 'taken') {
    return 'taken'
  }

  if (doseLog && doseLog.status === 'missed') {
    return 'missed'
  }

  const schedMs = new Date(scheduledTime).getTime()
  const nowMs = new Date(now).getTime()

  // If 30+ minutes past scheduled time and not taken => Missed
  if (nowMs - schedMs >= OVERDUE_GRACE_PERIOD_MS) {
    return 'missed'
  }

  return 'pending'
}

/**
 * Checks if a scheduled dose is past due by 30+ minutes.
 */
export function isDoseOverdue(scheduledTime, doseLog, now = new Date()) {
  return getDoseStatus(scheduledTime, doseLog, now) === 'missed'
}

/**
 * Parses a prescription frequency and returns standard schedule times for a given day.
 *
 * @param {Object} prescription - Prescription record
 * @param {Date} [targetDate=new Date()] - The date to generate slots for
 * @returns {Array<Object>} List of schedule slot items
 */
export function generatePrescriptionSlots(prescription, targetDate = new Date()) {
  if (!prescription) return []

  const dateStr = targetDate.toISOString().split('T')[0]
  const effectiveHHMMs = getEffectiveAlarmTimesForRx(prescription)

  return effectiveHHMMs.map((hhmm, index) => {
    const [hStr, mStr] = hhmm.split(':')
    const hours = Number.parseInt(hStr, 10)
    const minutes = Number.parseInt(mStr, 10) || 0

    const slotDate = new Date(targetDate)
    slotDate.setHours(hours, minutes, 0, 0)

    const slotKey = `${prescription.id}-${dateStr}-${hhmm}`

    return {
      slotKey,
      prescriptionId: prescription.id,
      medicationName: prescription.medication?.name || 'Medication',
      dosageInstructions: prescription.dosage_instructions || 'Take as prescribed',
      dosageForm: prescription.medication?.dosage_form || 'Tablet',
      timeDisplay: formatHHMMDisplay(hhmm),
      hhmm,
      timeIndex: index,
      scheduledHours: hours,
      scheduledMinutes: minutes,
      scheduledDate: slotDate,
      scheduledIso: slotDate.toISOString(),
    }
  })
}

/**
 * Matches a schedule slot with an existing log from Supabase.
 */
export function findMatchingLog(slot, doseLogs) {
  if (!Array.isArray(doseLogs) || doseLogs.length === 0) return null

  return (
    doseLogs.find((log) => {
      if (log.prescription_id !== slot.prescriptionId) return false

      if (log.slot_key && log.slot_key === slot.slotKey) return true

      if (log.scheduled_time) {
        const logDate = new Date(log.scheduled_time)
        const slotDate = new Date(slot.scheduledDate)
        const isSameDay = logDate.toDateString() === slotDate.toDateString()
        if (!isSameDay) return false

        // Within 1.5 hours window
        return Math.abs(logDate.getHours() - slot.scheduledHours) <= 1
      }

      return false
    }) || null
  )
}

