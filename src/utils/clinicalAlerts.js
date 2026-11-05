import { supabase, supabaseAdmin } from '../lib/supabase'

export const CLINICAL_ALERTS_CHANNEL = 'pharminder-clinical-alerts'
export const EVENT_MISSED_DOSE_PING = 'MISSED_DOSE_PING'
export const LOCAL_STORAGE_PING_KEY = 'pharminder_latest_clinical_ping'
export const BROADCAST_CHANNEL_NAME = 'pharminder-clinical-channel'
export const CUSTOM_EVENT_NAME = 'pharminder:missed-dose-ping'

/**
 * Broadcasts an urgent missed-dose alert ping from doctor/pharmacist to patient.
 * Uses Supabase Realtime Broadcast with local fallback transports (BroadcastChannel, storage, CustomEvent).
 *
 * @param {Object} options
 * @param {string} options.patientId - Target patient UUID (required)
 * @param {string} [options.doctorName] - Name of doctor/pharmacist sending the ping
 * @param {string} [options.prescriptionId] - Prescription UUID
 * @param {string} [options.medicationName] - Name of medication (e.g. "Metformin 850mg")
 * @param {string} [options.dosageInstructions] - Instructions (e.g. "Take 1 tablet with food")
 * @param {string} [options.dosageForm] - Dosage form (e.g. "Tablet", "Capsule")
 * @param {string} [options.scheduledTime] - Scheduled time string or ISO
 * @param {string} [options.urgentNote] - Urgent clinical note from care team
 * @returns {Promise<{ success: boolean, payload: Object }>}
 */
export async function broadcastMissedDosePing({
  patientId,
  doctorName = 'Dr. Sarah Smith, PharmD',
  prescriptionId = null,
  medicationName = 'Prescribed Medication',
  dosageInstructions = 'Take 1 dose immediately with water',
  dosageForm = 'Tablet',
  scheduledTime = new Date().toISOString(),
  urgentNote = 'Urgent message from your Pharmacist/Doctor: You missed a dose. Please take it immediately.',
}) {
  if (!patientId) {
    console.warn('broadcastMissedDosePing called without patientId')
    return { success: false, error: 'patientId is required' }
  }

  const pingId = `ping-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const payload = {
    pingId,
    patientId,
    doctorName,
    prescriptionId,
    medicationName,
    dosageInstructions,
    dosageForm,
    scheduledTime,
    urgentNote,
    timestamp: new Date().toISOString(),
  }

  // 1. Send via Supabase Realtime WebSocket broadcast
  try {
    const client = supabaseAdmin || supabase
    const channel = client.channel(CLINICAL_ALERTS_CHANNEL, {
      config: { broadcast: { ack: true } },
    })

    // Ensure channel is ready before or while sending
    await channel.send({
      type: 'broadcast',
      event: EVENT_MISSED_DOSE_PING,
      payload,
    })
  } catch (err) {
    console.warn('Supabase Realtime broadcast warning:', err)
  }

  // 2. Send via Web BroadcastChannel API (instant same-device, cross-tab delivery)
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      bc.postMessage({ type: EVENT_MISSED_DOSE_PING, payload })
      bc.close()
    } catch (bcErr) {
      console.warn('BroadcastChannel error:', bcErr)
    }
  }

  // 3. LocalStorage cross-tab delivery trigger
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_PING_KEY,
        JSON.stringify({ ...payload, _ts: Date.now() })
      )
    } catch (storageErr) {
      console.warn('LocalStorage alert dispatch error:', storageErr)
    }
  }

  // 4. In-page CustomEvent dispatch
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(CUSTOM_EVENT_NAME, {
          detail: payload,
        })
      )
    } catch (eventErr) {
      console.warn('CustomEvent alert dispatch error:', eventErr)
    }
  }

  return { success: true, payload }
}

/**
 * Subscribes to real-time missed dose alerts for a patient.
 * Deduplicates multiple transport deliveries using pingId cache.
 *
 * @param {string|null} targetPatientId - The patient ID to listen for (or null for all)
 * @param {Function} onPingReceived - Callback invoked when a ping arrives
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToMissedDosePings(targetPatientId, onPingReceived) {
  if (typeof onPingReceived !== 'function') {
    return () => {}
  }

  const seenPings = new Set()

  const handleIncomingPayload = (payload) => {
    if (!payload || !payload.pingId) return

    // Verify recipient matches target patient if specified
    if (targetPatientId && payload.patientId && payload.patientId !== targetPatientId) {
      return
    }

    // Deduplicate against multiple simultaneous carriers
    if (seenPings.has(payload.pingId)) {
      return
    }
    seenPings.add(payload.pingId)

    // Clear after 30 seconds
    setTimeout(() => {
      seenPings.delete(payload.pingId)
    }, 30000)

    onPingReceived(payload)
  }

  // 1. Supabase Realtime Channel
  const client = supabaseAdmin || supabase
  const realtimeChannel = client
    .channel(CLINICAL_ALERTS_CHANNEL, {
      config: { broadcast: { ack: true } },
    })
    .on('broadcast', { event: EVENT_MISSED_DOSE_PING }, (eventData) => {
      if (eventData?.payload) {
        handleIncomingPayload(eventData.payload)
      }
    })
    .subscribe()

  // 2. Web BroadcastChannel
  let broadcastChannel = null
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === EVENT_MISSED_DOSE_PING && event.data?.payload) {
          handleIncomingPayload(event.data.payload)
        }
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel subscribe error:', bcErr)
    }
  }

  // 3. Storage event listener (cross-tab / storage updates)
  const handleStorageEvent = (event) => {
    if (event.key === LOCAL_STORAGE_PING_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue)
        handleIncomingPayload(parsed)
      } catch (err) {
        console.warn('Failed parsing storage alert payload:', err)
      }
    }
  }

  // 4. Custom event listener (in-app communication)
  const handleCustomEvent = (event) => {
    if (event.detail) {
      handleIncomingPayload(event.detail)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent)
  }

  // Return comprehensive unsubscription function
  return () => {
    try {
      client.removeChannel(realtimeChannel)
    } catch (_err) {
      // ignore
    }

    if (broadcastChannel) {
      try {
        broadcastChannel.close()
      } catch (_err) {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent)
    }
  }
}

