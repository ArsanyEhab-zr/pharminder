/**
 * Custom Per-Medication Clock Schedule Helpers
 * Lets patients & caregivers configure exact HH:mm alarm times per active prescription
 * and keeps DoseScheduleTimeline + useMedicationReminders synchronized instantaneously.
 */

const STORAGE_PREFIX = 'pharminder_alarm_times_'
export const ALARM_SCHEDULE_UPDATED_EVENT = 'pharminder:alarm-times-updated'

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidHHMM(timeStr) {
  return typeof timeStr === 'string' && HHMM_REGEX.test(timeStr.trim())
}

export function formatHHMMDisplay(timeStr) {
  if (!isValidHHMM(timeStr)) return timeStr || ''
  const [hStr, mStr] = timeStr.split(':')
  const h = Number.parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${String(hour12).padStart(2, '0')}:${mStr} ${period}`
}

export function getDefaultTimesForFrequency(frequency = '') {
  const f = (frequency || '').toLowerCase()
  if (f.includes('4x') || f.includes('q6h') || f.includes('four')) {
    return ['08:00', '12:00', '18:00', '22:00']
  }
  if (f.includes('three') || f.includes('thrice') || f.includes('3x') || f.includes('tid')) {
    return ['08:00', '14:00', '20:00']
  }
  if (f.includes('twice') || f.includes('2x') || f.includes('bid') || f.includes('12h')) {
    return ['08:00', '20:00']
  }
  if (f.includes('evening') || f.includes('bedtime') || f.includes('night') || f.includes('qhs')) {
    return ['21:00']
  }
  return ['08:00']
}

export function loadAllCustomAlarmTimes(patientId) {
  if (typeof window === 'undefined' || !patientId) return {}
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${patientId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export function saveCustomAlarmTimes(patientId, rxId, times) {
  if (typeof window === 'undefined' || !patientId || !rxId) return {}
  const cleaned = Array.from(
    new Set(
      (times || [])
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(isValidHHMM)
    )
  ).sort()

  const existing = loadAllCustomAlarmTimes(patientId)
  const next = { ...existing }

  if (cleaned.length > 0) {
    next[rxId] = cleaned
  } else {
    delete next[rxId]
  }

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${patientId}`, JSON.stringify(next))
    window.dispatchEvent(
      new CustomEvent(ALARM_SCHEDULE_UPDATED_EVENT, {
        detail: { patientId, schedules: next },
      })
    )
  } catch {
    // Ignore storage quota errors
  }

  return next
}

export function getEffectiveAlarmTimesForRx(rx, customSchedulesMap = {}) {
  const custom = rx?.id && Array.isArray(customSchedulesMap?.[rx.id])
    ? customSchedulesMap[rx.id].filter(isValidHHMM)
    : []
  if (custom.length > 0) {
    return [...custom].sort()
  }
  return getDefaultTimesForFrequency(rx?.frequency)
}

/**
 * Generates an HH:mm scheduled label -> Date timestamp for today in local time
 */
export function buildTodaySlotDate(hhmm) {
  if (!isValidHHMM(hhmm)) return new Date()
  const [hStr, mStr] = hhmm.split(':')
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hStr), Number(mStr), 0, 0)
  return d
}
