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
  Pill,
  Calendar,
} from 'lucide-react'

export default function PatientLogin({ onSuccess }) {
  const { signIn, signUp, signOut, loading, error: authError } = useAuth()

  // 'signin' or 'signup'
  const [authMode, setAuthMode] = useState('signin')

  // Form states
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
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
      setFormError('Please enter both email and password.')
      return
    }

    if (authMode === 'signup' && !fullName.trim()) {
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
        setFormError(error.message || 'Invalid credentials. Please verify your email and password.')
      } else if (data?.user) {
        const userRole = data.user.user_metadata?.role || data.user.role
        if (userRole === 'pharmacist') {
          await signOut()
          setFormError('Access restricted: Clinician accounts must sign in via the Doctor Portal.')
          return
        }

        setFormSuccess('Signed in successfully! Loading your Patient Portal…')
        if (onSuccess) onSuccess(data.user)
      }
    } else {
      const { data, error } = await signUp({
        email,
        password,
        fullName,
        role: 'patient',
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
      })

      if (error) {
        setFormError(error.message || 'Failed to create patient account. Please try again.')
      } else {
        setFormSuccess('Account created with your unique PHM Patient ID! Opening your dashboard…')
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

        {/* Main Card */}
        <div className="bg-white/95 dark:bg-[#0d2232]/95 backdrop-blur-xl border-2 border-mint-200/80 dark:border-mint-800/60 rounded-3xl p-6 sm:p-9 shadow-soft-xl transition-all relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-mint via-teal-400 to-brand-mint" />

          {/* Patient Welcome Note */}
          <div className="mb-6 p-4 rounded-2xl border flex items-center gap-3 text-xs bg-mint-50/70 dark:bg-mint-950/60 border-mint-200/80 dark:border-mint-800/60">
            <div className="w-9 h-9 rounded-xl bg-brand-mint/15 text-brand-mint flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="font-black text-slate-800 dark:text-slate-200 block">
                Your Personal Medication &amp; Health Record
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Sign in or create an account to receive a unique PHM Medical ID for your doctor.
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
                  ? 'border-brand-mint text-brand-mint dark:text-mint-300'
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
                  ? 'border-brand-mint text-brand-mint dark:text-mint-300'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Create Patient Account / حساب جديد
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
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name *
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
                      placeholder="Enter your full name"
                      className="w-full ps-10 pe-4 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Optional Age & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Age (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 34"
                        className="w-full ps-10 pe-3 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner font-tabular"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Gender (Optional)
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
                    >
                      <option value="">Select…</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address *
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
                  placeholder="name@example.com"
                  className="w-full ps-10 pe-4 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
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
                  className="w-full ps-10 pe-11 py-3 rounded-2xl text-sm border border-slate-200 dark:border-dark-teal-800/80 bg-slate-50 dark:bg-dark-teal-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:bg-white dark:focus:bg-dark-teal-900 transition-all shadow-inner"
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
              className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-brand-mint hover:bg-mint-500 text-dark-teal-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-brand-mint/25 transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{authMode === 'signin' ? 'Signing In…' : 'Creating Patient Account…'}</span>
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
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-mint" />
          <span>Protected Healthcare Portal • Supabase Row Level Security</span>
        </div>
      </motion.div>
    </div>
  )
}
