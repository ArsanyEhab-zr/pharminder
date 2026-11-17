import { supabase, supabaseAdmin } from '../lib/supabase'

/**
 * Medication Clock Schedule Helpers
 * Persists exact HH:mm alarm times in `public.prescriptions.scheduled_times` in Supabase,
 * using localStorage strictly as an offline cache mirror across devices/reloads.
 */

const STORAGE_PREFIX = 'pharminder_alarm_times_'
export const ALARM_SCHEDULE_UPDATED_EVENT = 'pharminder:alarm-times-updated'

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidHHMM(timeStr) {
  return typeof timeStr === 'string' && HHMM_REGEX.test(timeStr.trim())
}

export function normalizeHHMMArray(times = []) {
  return Array.from(
    new Set(
      (Array.isArray(times) ? times : [])
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(isValidHHMM)
    )
  ).sort()
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
  if (f.includes('4x') || f.includes('6 hour') || f.includes('q6h') || f.includes('four')) {
    return ['08:00', '12:00', '18:00', '22:00']
  }
  if (f.includes('8 hour') || f.includes('three') || f.includes('thrice') || f.includes('3') || f.includes('tid')) {
    return ['08:00', '14:00', '20:00']
  }
  if (f.includes('12 hour') || f.includes('twice') || f.includes('2') || f.includes('bid')) {
    return ['08:00', '20:00']
  }
  if (f.includes('evening') || f.includes('dinner')) {
    return ['19:00']
  }
  if (f.includes('bedtime') || f.includes('night') || f.includes('qhs')) {
    return ['21:00']
  }
  return ['09:00']
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
  const cleaned = normalizeHHMMArray(times)

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

/**
 * Authoritative resolution order for a prescription's daily alarm slots:
 * 1. `rx.scheduled_times` persisted on `public.prescriptions` in Supabase
 * 2. Local offline mirror cache (if DB hasn't synced yet)
 * 3. Standard clinical defaults derived from `rx.frequency`
 */
export function getEffectiveAlarmTimesForRx(rx, offlineCacheMap = {}) {
  const dbTimes = normalizeHHMMArray(rx?.scheduled_times)
  if (dbTimes.length > 0) {
    return dbTimes
  }

  const cached = rx?.id ? normalizeHHMMArray(offlineCacheMap?.[rx.id]) : []
  if (cached.length > 0) {
    return cached
  }

  return getDefaultTimesForFrequency(rx?.frequency)
}

/**
 * Persists updated `scheduled_times` directly to `public.prescriptions` in Supabase
 * and mirrors the result into offline cache storage.
 */
export async function updatePrescriptionScheduledTimes(patientId, rx, nextTimes) {
  const rxId = typeof rx === 'string' ? rx : rx?.id
  const cleaned = normalizeHHMMArray(nextTimes)
  const effectiveTimes = cleaned.length > 0
    ? cleaned
    : getDefaultTimesForFrequency(typeof rx === 'object' ? rx?.frequency : '')

  if (!rxId) {
    throw new Error('Prescription ID is required to update scheduled alarm times.')
  }

  // Persist directly to Supabase public.prescriptions.scheduled_times
  // Prefer authenticated supabase client first (exercises strict RLS); fall back if needed
  const { data: sessionRes } = await supabase.auth.getSession()
  const primaryClient = sessionRes?.session ? supabase : (supabaseAdmin || supabase)

  const { data, error } = await primaryClient
    .from('prescriptions')
    .update({ scheduled_times: effectiveTimes })
    .eq('id', rxId)
    .select('id, scheduled_times')
    .single()

  if (error) {
    throw error
  }

  const savedTimes = normalizeHHMMArray(data?.scheduled_times || effectiveTimes)
  if (patientId) {
    saveCustomAlarmTimes(patientId, rxId, savedTimes)
  }

  return savedTimes
}

/**
 * Generates an HH:mm scheduled label -> Date timestamp for today in local time
 */
export function buildTodaySlotDate(hhmm) {
  if (!isValidHHMM(hhmm)) return new Date()
  const [hStr, mStr] = hhmm.split(':')
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hStr), Number(mStr), 0, 0)
}
