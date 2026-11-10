import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { 
  HeartPulse, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Pill
} from 'lucide-react'

export default function PatientLogin({ onSuccess }) {
  const { signIn, signUp, signOut, loading, error: authError } = useAuth()
  
  // 'signin' or 'signup'
  const [authMode, setAuthMode] = useState('signin')

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!email || !password) {
      setFormError('Please enter both email and password.')
      return
    }

    if (authMode === 'signup' && !fullName) {
      setFormError('Please provide your full name.')
      return
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }

    if (authMode === 'signin') {
      const { data, error } = await signIn({
        email,
        password,
        expectedRole: 'patient',
      })

      if (error) {
        setFormError(error.message || 'Failed to sign in. Please verify your patient credentials.')
      } else if (data?.user) {
        const userRole = data.user.user_metadata?.role || data.user.role
        // Strict role validation: Ensure clinicians cannot enter the patient portal
        if (userRole === 'pharmacist') {
          await signOut()
          setFormError('Access restricted: This account is registered with Doctor credentials. Please use your patient account.')
          return
        }

        setFormSuccess('Signed in successfully! Loading your medication schedule…')
        if (onSuccess) onSuccess(data.user)
      }
    } else {
      const { data, error } = await signUp({
        email,
        password,
        fullName,
        role: 'patient',
      })

      if (error) {
        setFormError(error.message || 'Failed to create patient account. Please try again.')
      } else {
        setFormSuccess('Patient account created successfully! Redirecting…')
        if (onSuccess && data?.user) {
          onSuccess(data.user)
        } else {
          setAuthMode('signin')
        }
      }
    }
  }

  const fillPatientDemo = () => {
    setEmail('jane.patient@pharminder.app')
    setPassword('PharminderDemo123!')
    if (authMode === 'signup') {
      setFullName('Jane Doe')
    }
    setFormError('')
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-lg space-y-6 sm:space-y-8"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <img 
            src="/logo-patient.png" 
            alt="Pharminder Patient Logo" 
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300 mb-1" 
          />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-teal dark:text-mint-300">
            pharminder
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Patient Medication Companion &amp; Health Intake
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-50/90 dark:bg-mint-950/80 border border-mint-200 dark:border-mint-800 text-brand-mint text-xs font-black shadow-xs">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Dedicated Patient Portal</span>
          </div>
        </div>

        {/* Main Card with Mint Green Accents */}
        <div className="bg-white/95 dark:bg-[#0d2232]/95 backdrop-blur-xl border-2 border-mint-200/80 dark:border-mint-800/60 rounded-3xl p-6 sm:p-9 shadow-soft-xl transition-all relative overflow-hidden">
          {/* Subtle Top Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-mint via-teal-400 to-brand-mint" />

          {/* Patient Welcome Note */}
          <div className="mb-6 p-4 rounded-2xl border flex items-center gap-3 text-xs bg-mint-50/70 dark:bg-mint-950/60 border-mint-200/80 dark:border-mint-800/60">
            <div className="w-9 h-9 rounded-xl bg-brand-mint/15 text-brand-mint flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-slate-800 dark:text-slate-200 block">
                Welcome to your daily health companion
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Log your doses, review prescriptions, and share medical history with your care team.
              </span>
            </div>
          </div>

          {/* Sign In / Sign Up Mode Switcher */}
          <div className="flex border-b border-slate-200 dark:border-dark-teal-800/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin')
                setFormError('')
                setFormSuccess('')
              }}
              className={`pb-3 text-sm font-extrabold flex-1 text-center border-b-2 transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'border-brand-mint text-brand-mint dark:text-mint-300'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Patient Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup')
                setFormError('')
                setFormSuccess('')
              }}
              className={`pb-3 text-sm font-extrabold flex-1 text-center border-b-2 transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'border-brand-mint text-brand-mint dark:text-mint-300'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error and Success Banners */}
          {(formError || authError) && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{formError || authError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="mb-5 p-3.5 rounded-2xl bg-mint-50 dark:bg-mint-950/60 border border-mint-200 dark:border-mint-800 flex items-start gap-3 text-xs font-semibold text-mint-900 dark:text-mint-200 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-brand-mint" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Sign Up only) */}
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Patient Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@pharminder.app"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button (Mint Theme) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-mint hover:bg-mint-500 text-dark-teal-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-brand-mint/25 transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{authMode === 'signin' ? 'Authenticating Patient…' : 'Creating Account…'}</span>
                </>
              ) : (
                <>
                  <span>
                    {authMode === 'signin'
                      ? 'Sign In to Patient Portal'
                      : 'Create Patient Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill Chip (Patient Only) */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-dark-teal-800/60">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                Quick Demo Access
              </span>
              <span className="text-[11px] text-slate-400">1-Tap Fill</span>
            </div>
            <button
              type="button"
              onClick={fillPatientDemo}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold border border-mint-200 dark:border-mint-800 hover:bg-mint-50/60 dark:hover:bg-dark-teal-900/60 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <User className="w-3.5 h-3.5 text-brand-mint" />
              <span>Fill Patient Demo (Jane Doe)</span>
            </button>
          </div>
        </div>

        {/* Security & HIPAA Notice */}
        <div className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-mint" />
          <span>Protected Healthcare Portal • Supabase Row Level Security</span>
        </div>
      </motion.div>
    </div>
  )
}

