import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import {
  Stethoscope,
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
  Activity,
  Award,
  FileCheck2,
} from 'lucide-react'

export default function PharmacistLogin({ onSuccess }) {
  const { signIn, signUp, signOut, loading, error: authError } = useAuth()

  // 'signin' or 'signup'
  const [authMode, setAuthMode] = useState('signin')

  // Form states
  const [fullName, setFullName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!email.trim() || !password) {
      setFormError('Please enter both clinical email and password.')
      return
    }

    if (authMode === 'signup' && !fullName.trim()) {
      setFormError('Please provide your full clinical name and title.')
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
        expectedRole: 'pharmacist',
      })

      if (error) {
        setFormError(error.message || 'Invalid credentials. Please check your clinical email and password.')
      } else if (data?.user) {
        const userRole = data.user.user_metadata?.role || data.user.role
        if (userRole === 'patient') {
          await signOut()
          setFormError('Access restricted: Patient accounts must sign in via the Patient Portal.')
          return
        }

        setFormSuccess('Clinical credentials verified. Loading Command Center…')
        if (onSuccess) onSuccess(data.user)
      }
    } else {
      const { data, error } = await signUp({
        email,
        password,
        fullName,
        role: 'pharmacist',
        specialty,
        licenseNumber,
      })

      if (error) {
        setFormError(error.message || 'Failed to register clinician account. Please try again.')
      } else {
        setFormSuccess('Clinician account registered! Opening your isolated Command Center…')
        if (onSuccess && data?.user) {
          onSuccess(data.user)
        } else {
          setAuthMode('signin')
        }
      }
    }
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
            src="/logo-doctor.png"
            alt="Pharminder Doctor Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300 mb-1"
          />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-teal dark:text-mint-300">
            pharminder
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Clinical Safety &amp; Prescribing Command Center
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-teal-50/90 dark:bg-dark-teal-950/80 border border-dark-teal-200 dark:border-dark-teal-800 text-brand-teal dark:text-mint-300 text-xs font-black shadow-xs">
            <Stethoscope className="w-3.5 h-3.5 text-brand-mint" />
            <span>Authorized Medical Personnel Only</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 dark:bg-[#0d2232]/95 backdrop-blur-xl border-2 border-dark-teal-200/80 dark:border-dark-teal-700/60 rounded-3xl p-6 sm:p-9 shadow-soft-xl transition-all relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-teal via-dark-teal-700 to-brand-mint" />

          {/* Clinician Access Note */}
          <div className="mb-6 p-4 rounded-2xl border flex items-center gap-3 text-xs bg-dark-teal-50/70 dark:bg-dark-teal-950/60 border-dark-teal-200/80 dark:border-dark-teal-800/60">
            <div className="w-9 h-9 rounded-xl bg-brand-teal/15 dark:bg-mint-400/10 text-brand-teal dark:text-mint-300 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-slate-800 dark:text-slate-200 block">
                Doctor &amp; Clinical Pharmacist Portal
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Link patients by PHM ID, prescribe safely with DDI hard-locks, and manage schedules.
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
              className={`pb-3 text-xs sm:text-sm font-extrabold flex-1 text-center border-b-2 transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'border-brand-teal dark:border-brand-mint text-brand-teal dark:text-mint-300'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Sign In / تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup')
                setFormError('')
                setFormSuccess('')
              }}
              className={`pb-3 text-xs sm:text-sm font-extrabold flex-1 text-center border-b-2 transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'border-brand-teal dark:border-brand-mint text-brand-teal dark:text-mint-300'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Create Clinician Account / حساب جديد
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
            {authMode === 'signup' && (
              <>
                {/* Full Name & Clinical Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name &amp; Clinical Title *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Ahmed Hassan, PharmD"
                      className="w-full ps-10 pe-4 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Medical Specialty & License Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Specialty (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="e.g. Clinical Pharmacy"
                        className="w-full ps-10 pe-3 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      License ID (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. MED-40291"
                        className="w-full ps-10 pe-3 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Clinical Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clinician@hospital.org"
                  className="w-full ps-10 pe-4 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full ps-10 pe-11 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-brand-teal hover:bg-dark-teal-900 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-brand-teal/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{authMode === 'signin' ? 'Authenticating Clinician…' : 'Creating Clinician Account…'}</span>
                </>
              ) : (
                <>
                  <span>
                    {authMode === 'signin'
                      ? 'Sign In to Doctor Portal'
                      : 'Create Clinician Account'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-brand-mint" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-mint" />
          <span>Integrated with Drugs.com &amp; PDR.net Clinical Reference Systems</span>
        </div>
      </motion.div>
    </div>
  )
}
