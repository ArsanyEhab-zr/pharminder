import React from 'react'
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Loader2, ShieldAlert, Lock, LogOut, ArrowLeft } from 'lucide-react'

const APP_MODE = import.meta.env.VITE_APP_MODE // 'patient' | 'pharmacist' | undefined

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, profile, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const targetPortalRole =
    allowedRoles[0] || (location.pathname.includes('pharmacist') ? 'pharmacist' : 'patient')
  const isPharmacistPortal = targetPortalRole === 'pharmacist'

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg ${
            isPharmacistPortal
              ? 'bg-brand-teal text-brand-mint shadow-brand-teal/20'
              : 'bg-brand-mint text-dark-teal-950 shadow-brand-mint/25'
          }`}
        >
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Verifying Clinical Security Credentials…
          </p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Validating encrypted role permissions with Supabase
          </p>
        </div>
      </div>
    )
  }

  // 1. Unauthenticated users MUST sign in
  if (!user) {
    const loginTarget = 
      APP_MODE ? '/login' : targetPortalRole === 'pharmacist' ? '/login/pharmacist' : '/login/patient'
    return <Navigate to={loginTarget} state={{ from: location, defaultRole: targetPortalRole }} replace />
  }

  // 2. Strict Role-Based Access Control (RBAC):
  const hasMatchingRole =
    !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role)

  if (!hasMatchingRole) {
    const handleSignOutAndSwitch = async () => {
      await signOut()
      navigate('/login')
    }

    // In isolated single-portal mode (Vercel deployment)
    if (APP_MODE) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center py-8 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white/95 dark:bg-[#0d2232]/95 backdrop-blur-xl border-2 border-rose-200 dark:border-rose-900/70 p-7 sm:p-10 shadow-soft-xl space-y-6 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/80 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <ShieldAlert className="w-3.5 h-3.5" />
                Access Restricted
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {APP_MODE === 'pharmacist' ? 'Clinician Credentials Required' : 'Patient Account Required'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-medium">
                You are currently signed in as{' '}
                <strong className="text-slate-900 dark:text-white">
                  {profile?.full_name || user.email}
                </strong>{' '}
                with role <strong className="uppercase text-brand-mint">{role}</strong>. This deployment is restricted to{' '}
                <strong className="text-slate-900 dark:text-white">
                  {APP_MODE === 'pharmacist' ? 'physicians and clinical pharmacists' : 'patients'}
                </strong>.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSignOutAndSwitch}
                className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-brand-teal hover:bg-dark-teal-900 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-brand-teal/20 transition-all active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-brand-mint" />
                <span>Sign Out &amp; Log In with {APP_MODE === 'pharmacist' ? 'Doctor' : 'Patient'} Account</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Dual mode (local dev)
    const lockedPortalPath = role === 'pharmacist' ? '/pharmacist' : '/patient'
    const lockedPortalName =
      role === 'pharmacist' ? 'Doctor / Pharmacist Portal (/pharmacist)' : 'Patient Portal (/patient)'

    return (
      <div className="min-h-[70vh] flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-xl rounded-3xl bg-white/95 dark:bg-[#0d2232]/95 backdrop-blur-xl border-2 border-rose-200 dark:border-rose-900/70 p-7 sm:p-10 shadow-soft-xl space-y-6 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/80 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <ShieldAlert className="w-3.5 h-3.5" />
              Strict Role Boundary Enforced
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Access Restricted to Authorized {isPharmacistPortal ? 'Clinicians' : 'Patients'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-medium">
              You are currently authenticated as{' '}
              <strong className="text-slate-900 dark:text-white">
                {profile?.full_name || user.email}
              </strong>{' '}
              with the <strong className="uppercase text-brand-mint">{role}</strong> role. For clinical security, your session is locked to the{' '}
              <strong className="text-slate-900 dark:text-white">{lockedPortalName}</strong>. To access{' '}
              <code className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {location.pathname}
              </code>
              , you must explicitly sign out and log in with a {targetPortalRole} account.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to={lockedPortalPath}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-brand-teal hover:bg-dark-teal-900 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-brand-teal/20 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-brand-mint" />
              <span>Return to My Locked {role === 'pharmacist' ? 'Doctor' : 'Patient'} Portal ({lockedPortalPath})</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOutAndSwitch}
              className="w-full min-h-[48px] py-3 px-5 rounded-2xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out &amp; Log In with a {isPharmacistPortal ? 'Doctor / Pharmacist' : 'Patient'} Account</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}
