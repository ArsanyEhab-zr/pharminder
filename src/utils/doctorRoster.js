import { supabase, supabaseAdmin } from '../lib/supabase'

/**
 * Fetches ordered linked patient IDs for a specific doctor/pharmacist
 * from public.doctor_patients so each clinician's roster is strictly isolated.
 */
export async function fetchLinkedPatientIds(doctorId) {
  if (!doctorId) return []
  const client = supabaseAdmin || supabase
  const { data, error } = await client
    .from('doctor_patients')
    .select('patient_id, linked_at')
    .eq('doctor_id', doctorId)
    .order('linked_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row) => row.patient_id).filter(Boolean)
}

/**
 * Fetches full profile rows exclusively for patients linked to doctorId.
 */
export async function fetchLinkedPatientProfiles(doctorId) {
  const linkedIds = await fetchLinkedPatientIds(doctorId)
  if (linkedIds.length === 0) return []

  const client = supabaseAdmin || supabase
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, patient_code, created_at')
    .eq('role', 'patient')
    .in('id', linkedIds)

  if (error) throw error

  const byId = new Map((data || []).map((p) => [p.id, p]))
  return linkedIds.map((id) => byId.get(id)).filter(Boolean)
}

/**
 * Looks up a patient by exact case-insensitive patient_code (e.g. PHM-265756).
 * Uses the SECURITY DEFINER RPC first so RLS stays strict without exposing unlinked rows.
 */
export async function lookupPatientByExactCode(rawCode, doctorId) {
  const normalized = (rawCode || '').trim().toUpperCase()
  if (!normalized) {
    return { patient: null, error: null }
  }

  // 1. Authenticated RPC path (works cleanly under strict RLS)
  try {
    const { data, error } = await supabase.rpc('lookup_patient_by_code', {
      p_code: normalized,
    })
    if (!error && Array.isArray(data)) {
      return { patient: data[0] || null, error: null }
    }
  } catch {
    // Fall back to direct lookup if RPC session unavailable
  }

  // 2. Fallback when supabaseAdmin is configured in local dev without user JWT
  if (supabaseAdmin) {
    const { data: pat, error: patErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, patient_code')
      .eq('role', 'patient')
      .ilike('patient_code', normalized)
      .maybeSingle()

    if (patErr) return { patient: null, error: patErr }
    if (!pat) return { patient: null, error: null }

    let alreadyLinked = false
    if (doctorId) {
      const { data: linkRow } = await supabaseAdmin
        .from('doctor_patients')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('patient_id', pat.id)
        .maybeSingle()
      alreadyLinked = Boolean(linkRow)
    }

    return {
      patient: { ...pat, already_linked: alreadyLinked },
      error: null,
    }
  }

  return { patient: null, error: new Error('Unable to look up patient code.') }
}

/**
 * Links an existing patient to a doctor's isolated roster in public.doctor_patients.
 */
export async function linkPatientToDoctor(doctorId, patientId) {
  if (!doctorId || !patientId) {
    throw new Error('Doctor ID and Patient ID are required to link patient.')
  }

  const client = supabaseAdmin || supabase
  const { error } = await client
    .from('doctor_patients')
    .insert({
      doctor_id: doctorId,
      patient_id: patientId,
    })

  if (error && error.code !== '23505') {
    throw error
  }
}
