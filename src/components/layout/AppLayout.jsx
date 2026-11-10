import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import { useAuth } from '../../hooks/useAuth'
import { 
  ShieldCheck, 
  Home, 
  Stethoscope, 
  Sparkles, 
  ClipboardList, 
  Lock, 
  LogOut, 
  LogIn 
} from 'lucide-react'
import { getBrandLogo } from '../../utils/brandAssets'

const APP_MODE = import.meta.env.VITE_APP_MODE // 'patient' | 'pharmacist' | undefined

export default function AppLayout({ children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, signOut } = useAuth()

  const handleMobileSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const footerTagline =
    APP_MODE === 'patient'
      ? '— Patient Health Intake & Medication Companion'
      : APP_MODE === 'pharmacist'
        ? '— Clinical Prescribing & Drug Interaction Command Center'
        : '— Production Role-Locked Clinical Healthcare & Patient Companion PWA'

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#071520] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative selection:bg-brand-mint selection:text-dark-teal-950 overflow-x-hidden">
      {/* Ambient Animated Mesh & Blob Background Accents */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-mint/12 dark:bg-brand-mint/10 blur-3xl animate-pulse-soft" />
        <div className="absolute top-1/4 -right-28 w-[28rem] h-[28rem] rounded-full bg-brand-teal/10 dark:bg-brand-teal/20 blur-3xl animate-pulse-soft" style={{ animationDelay: '1.2s' }} />
        <div className="absolute -bottom-32 left-1/3 w-[32rem] h-[24rem] rounded-full bg-mint-300/10 dark:bg-dark-teal-800/20 blur-3xl" />
      </div>

      {/* Top Navigation */}
      <Navbar />

      {/* Main Responsive Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-12 transition-all">
        {children}
      </main>

      {/* Mobile Sticky Bottom App Bar (Role-Isolated Navigation, 48px+ touch targets, PWA Safe Area Dock) */}
      <nav 
        aria-label="Mobile navigation" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#071520]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-dark-teal-800/40 px-3 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] shadow-soft-xl"
      >
        {user ? (
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
            {role === 'pharmacist' ? (
              <Link
                to="/pharmacist"
                className={`min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 transition-all ${
                  location.pathname === '/pharmacist'
                    ? 'text-white bg-brand-teal font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-dark-teal-950 font-bold'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-brand-mint shrink-0" />
                <span className="text-xs tracking-tight truncate min-w-0">{t('nav.doctorPortal')}</span>
                <Lock className="w-3 h-3 opacity-75 shrink-0" />
              </Link>
            ) : (
              <Link
                to="/patient"
                className={`min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 transition-all ${
                  location.pathname === '/patient'
                    ? 'text-dark-teal-950 bg-brand-mint font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-dark-teal-950 font-bold'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span className="text-xs tracking-tight truncate min-w-0">{t('nav.patientPortal')}</span>
                <Lock className="w-3 h-3 opacity-75 shrink-0" />
              </Link>
            )}

            <button
              type="button"
              onClick={handleMobileSignOut}
              className="min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="truncate min-w-0">{t('nav.signOut')}</span>
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            {APP_MODE === 'pharmacist' ? (
              <Link
                to="/login"
                className="w-full min-h-[48px] rounded-xl flex items-center justify-center gap-2 px-3 text-white bg-brand-teal font-black shadow-xs"
              >
                <LogIn className="w-4 h-4 text-brand-mint shrink-0" />
                <span className="text-xs tracking-tight">{t('nav.doctorSignIn')}</span>
              </Link>
            ) : APP_MODE === 'patient' ? (
              <Link
                to="/login"
                className="w-full min-h-[48px] rounded-xl flex items-center justify-center gap-2 px-3 text-dark-teal-950 bg-brand-mint font-black shadow-xs"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="text-xs tracking-tight">{t('nav.patientSignIn')}</span>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link 
                  to="/" 
                  className={`min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 transition-all ${
                    location.pathname === '/' 
                      ? 'text-brand-teal dark:text-mint-300 font-extrabold bg-slate-100/90 dark:bg-dark-teal-950/90' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span className="text-xs tracking-tight font-bold truncate min-w-0">Portal Hub</span>
                </Link>

                <Link 
                  to="/login" 
                  className={`min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 transition-all ${
                    location.pathname.startsWith('/login') 
                      ? 'text-white bg-brand-teal font-black shadow-xs' 
                      : 'text-dark-teal-950 bg-brand-mint font-extrabold'
                  }`}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="text-xs tracking-tight font-bold truncate min-w-0">{t('nav.signIn')}</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Desktop & Tablet Polished Clinical Footer */}
      <footer className="hidden md:block border-t border-slate-200/80 dark:border-dark-teal-800/40 bg-white/75 dark:bg-[#071520]/75 backdrop-blur-md transition-colors mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img 
              src={getBrandLogo(role)} 
              alt="Pharminder Logo" 
              className="w-7 h-7 object-contain drop-shadow-xs shrink-0" 
            />
            <span className="font-black text-sm tracking-tight text-brand-teal dark:text-mint-300">pharminder</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {footerTagline}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
              Role-Isolated Portal Security
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
              Live DDI &amp; Contraindication Engine
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
