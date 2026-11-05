import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import PageWrapper from '../components/layout/PageWrapper'
import { 
  HeartPulse, 
  Stethoscope, 
  ArrowRight, 
  Lock, 
  ClipboardList, 
  CheckCircle2, 
  Pill, 
  ShieldCheck, 
  Activity,
  LogOut,
  ExternalLink
} from 'lucide-react'

export default function Landing() {
  const { user, role, profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <PageWrapper className="space-y-8 sm:space-y-12 py-3">
      {/* Hero Welcome Banner */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-white via-dark-teal-50/25 to-mint-50/35 dark:from-[#0d2232] dark:via-[#091b28] dark:to-dark-teal-950/75 border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-lg relative overflow-hidden">
        {/* Decorative background watermark */}
        <div aria-hidden="true" className="hidden lg:flex items-center justify-center absolute -right-8 -bottom-8 w-80 h-80 opacity-10 dark:opacity-15 pointer-events-none">
          <svg viewBox="0 0 240 240" className="w-full h-full text-brand-teal dark:text-brand-mint">
            <circle cx="120" cy="120" r="95" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="10 10" />
            <circle cx="120" cy="120" r="65" fill="currentColor" fillOpacity="0.15" />
            <path d="M90 120h60M120 90v60" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
          </svg>
        </div>

        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-teal dark:text-mint-300">
              Dual-Portal Healthcare Ecosystem
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-0.5 rounded-full bg-mint-100 text-mint-900 dark:bg-mint-950 dark:text-mint-300 border border-mint-200 dark:border-mint-800">
              <Lock className="w-3 h-3 text-brand-mint" />
              Role-Isolated Production Deployments
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Connected Prescribing, Medical Intake &amp; Dose Adherence
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium max-w-2xl">
            Pharminder operates as two strictly isolated portals: the <strong className="text-slate-900 dark:text-white">Patient Companion</strong> for intake forms and dose reminders, and the <strong className="text-slate-900 dark:text-white">Doctor &amp; Pharmacist Command Center</strong> for DDI and contraindication safety screening.
          </p>

          {/* Active Session Callout if already authenticated */}
          {user && (
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-dark-teal-900/80 border border-brand-mint/40 dark:border-mint-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                  role === 'pharmacist' ? 'bg-brand-teal' : 'bg-brand-mint text-dark-teal-950'
                }`}>
                  {role === 'pharmacist' ? <Stethoscope className="w-4 h-4 text-brand-mint" /> : <HeartPulse className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                    Signed in as {profile?.full_name || user.email}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Active Role: <span className="uppercase text-brand-mint font-black">{role}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(role === 'pharmacist' ? '/pharmacist' : '/patient')}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-brand-mint text-dark-teal-950 hover:bg-mint-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Active Portal ({role === 'pharmacist' ? '/pharmacist' : '/patient'})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="p-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!user && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => navigate('/login/patient')}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-brand-mint hover:bg-mint-500 text-dark-teal-950 font-black text-sm shadow-lg shadow-brand-mint/25 transition-all cursor-pointer"
              >
                <HeartPulse className="w-4 h-4" />
                <span>Launch Patient Portal</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => navigate('/login/pharmacist')}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-brand-teal hover:bg-dark-teal-900 text-white font-black text-sm shadow-lg shadow-brand-teal/25 transition-all cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-brand-mint" />
                <span>Launch Doctor Portal</span>
                <ArrowRight className="w-4 h-4 text-brand-mint" />
              </motion.button>
            </div>
          )}
        </div>
      </section>

      {/* Dual Portal Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* 1. Patient Portal Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 24 }}
          className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border-2 border-mint-200/80 dark:border-mint-800/60 shadow-soft-md hover-lift flex flex-col justify-between space-y-6 relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <img src="/logo-patient.png" alt="Patient Portal Logo" className="w-14 h-14 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
              <span className="font-mono text-xs font-black px-3 py-1 rounded-xl bg-mint-50 dark:bg-mint-950 text-mint-800 dark:text-mint-300 border border-mint-200 dark:border-mint-800">
                Patient URL: /patient
              </span>
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-mint block mb-1">
                For Patients &amp; Daily Care
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                Patient Health &amp; Medication Portal
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Complete your medical profile, report chronic conditions and current symptoms to your doctor, and track your daily medication schedule with audio/visual dose reminders.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
              <li className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-brand-mint shrink-0" />
                <span><strong>Self-Service Medical Intake:</strong> Chronic diseases, symptoms, allergies &amp; vitals</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                <span><strong>Daily Dose Timeline:</strong> 1-Tap dose logging with celebratory animations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Pill className="w-4 h-4 text-brand-mint shrink-0" />
                <span><strong>Audio &amp; Visual Chime Alerts:</strong> Never miss a scheduled dose</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/patient')}
              className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-brand-mint hover:bg-mint-500 text-dark-teal-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-md shadow-brand-mint/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Enter Patient Portal (/patient)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login/patient')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-mint" />
              <span>Go to Patient Login Screen (/login/patient)</span>
            </button>
          </div>
        </motion.div>

        {/* 2. Pharmacist / Doctor Portal Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 24 }}
          className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d2232] border-2 border-dark-teal-200/80 dark:border-dark-teal-700/60 shadow-soft-md hover-lift flex flex-col justify-between space-y-6 relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <img src="/logo-doctor.png" alt="Doctor Portal Logo" className="w-14 h-14 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
              <span className="font-mono text-xs font-black px-3 py-1 rounded-xl bg-dark-teal-50 dark:bg-dark-teal-950 text-brand-teal dark:text-mint-300 border border-dark-teal-200 dark:border-dark-teal-800">
                Doctor URL: /pharmacist
              </span>
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-teal dark:text-mint-300 block mb-1">
                For Doctors &amp; Clinical Pharmacists
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                Clinical Command Center
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Review patient-submitted medical forms in real time; prescribe medications with Drugs.com DDI screening and PDR.net monographs; and audit 7-day adherence with real-time pings.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
              <li className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4 text-brand-teal dark:text-mint-300 shrink-0" />
                <span><strong>Live Patient Intake Sync:</strong> Review chronic diseases &amp; symptom complaints</span>
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-teal dark:text-mint-300 shrink-0" />
                <span><strong>Dual Safety Engine:</strong> Drugs.com DDI + Disease Contraindication locks</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-brand-teal dark:text-mint-300 shrink-0" />
                <span><strong>Adherence Audit &amp; Pings:</strong> Real-time missed dose alerts to patients</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/pharmacist')}
              className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-brand-teal hover:bg-dark-teal-900 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md shadow-brand-teal/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Enter Doctor Portal (/pharmacist)</span>
              <ArrowRight className="w-4 h-4 text-brand-mint" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login/pharmacist')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-teal dark:text-mint-400" />
              <span>Go to Doctor Login Screen (/login/pharmacist)</span>
            </button>
          </div>
        </motion.div>
      </section>
    </PageWrapper>
  )
}

