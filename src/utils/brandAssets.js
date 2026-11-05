/**
 * Dynamic Brand Assets Helper for Multi-Tenant / Split Portal Deployments
 */

const APP_MODE = import.meta.env.VITE_APP_MODE // 'patient' | 'pharmacist' | undefined

/**
 * Returns the appropriate logo path based on deployment mode or active user role.
 *
 * @param {string} [role] Optional active user role ('pharmacist' | 'patient')
 * @returns {string} Path to the corresponding branded logo
 */
export function getBrandLogo(role) {
  if (APP_MODE === 'pharmacist') return '/logo-doctor.png'
  if (APP_MODE === 'patient') return '/logo-patient.png'
  if (role === 'pharmacist') return '/logo-doctor.png'
  if (role === 'patient') return '/logo-patient.png'
  return '/logo.png'
}

