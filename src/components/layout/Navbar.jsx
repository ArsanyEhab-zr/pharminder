import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { changeAppLanguage } from '../../i18n'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import { 
  Pill, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  LogOut,
  LogIn,
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Download,
  Lock,
  HeartPulse,
  Languages
} from 'lucide-react'
import { getBrandLogo } from '../../utils/brandAssets'

const APP_MODE = import.meta.env.VITE_APP_MODE // 'patient' | 'pharmacist' | undefined

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { isDark, toggleTheme } = useTheme()
  const { user, profile, role, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar'
    changeAppLanguage(nextLang)
  }

  // Listen for PWA install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleSignOut = async () => {
    setMobileMenuOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  // Assigned portal path based on environment mode and role
  const assignedPortalPath =
    APP_MODE === 'pharmacist'
      ? user && role === 'pharmacist' ? '/pharmacist' : '/'
      : APP_MODE === 'patient'
        ? user && role === 'patient' ? '/patient' : '/'
        : user && role === 'pharmacist'
          ? '/pharmacist'
          : user && role === 'patient'
            ? '/patient'
            : '/'

  // Dynamic subtitle based on environment mode
  const appSubtitle =
    APP_MODE === 'patient'
      ? t('nav.brandSubtitlePatient')
      : APP_MODE === 'pharmacist'
        ? t('nav.brandSubtitleDoctor')
        : t('nav.brandSubtitleDual')

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 dark:bg-[#071520]/85 border-b border-slate-200/80 dark:border-dark-teal-800/50 pt-[env(safe-area-inset-top,0px)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              to={assignedPortalPath}
              className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-brand-mint/60 rounded-2xl p-1.5 transition-transform duration-200 active:scale-95"
            >
              <img 
                src={getBrandLogo(role)} 
                alt="Pharminder Logo" 
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm shrink-0" 
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-brand-teal dark:text-mint-300 font-sans">
                    pharminder
                  </span>
                  <span className="w-2 h-2 rounded-full bg-brand-mint animate-pulse" />
                </div>
                <p className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 hidden sm:block">
                  {appSubtitle}
                </p>
              </div>
            </Link>
          </div>

          {/* Center Portal Indicator (Strict RBAC - Zero cross-portal leakage) */}
          <div className="hidden md:flex items-center">
            {APP_MODE === 'pharmacist' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-teal-50/90 dark:bg-dark-teal-950/90 border border-dark-teal-200 dark:border-dark-teal-800 text-brand-teal dark:text-mint-300 text-xs font-black shadow-xs">
                <Stethoscope className="w-3.5 h-3.5 text-brand-mint" />
                <span>Doctor &amp; Pharmacist Command Center</span>
              </div>
            ) : APP_MODE === 'patient' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mint-50/90 dark:bg-mint-950/80 border border-mint-200 dark:border-mint-800 text-mint-900 dark:text-mint-200 text-xs font-black shadow-xs">
                <HeartPulse className="w-3.5 h-3.5 text-brand-mint" />
                <span>Patient Health &amp; Medication Portal</span>
              </div>
            ) : (
              // Dual mode fallback in local dev
              <>
                {user && role === 'pharmacist' && (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-dark-teal-50/90 dark:bg-dark-teal-950/90 border border-dark-teal-200 dark:border-dark-teal-800 text-brand-teal dark:text-mint-300 text-xs font-extrabold shadow-xs">
                    <Stethoscope className="w-4 h-4 text-brand-mint" />
                    <span>Doctor Command Center</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-brand-teal text-white flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-brand-mint" />
                      /pharmacist
                    </span>
                  </div>
                )}

                {user && role === 'patient' && (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-mint-50/90 dark:bg-mint-950/80 border border-mint-200 dark:border-mint-800 text-mint-900 dark:text-mint-200 text-xs font-extrabold shadow-xs">
                    <Pill className="w-4 h-4 text-brand-mint" />
                    <span>Patient Companion</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-brand-mint text-dark-teal-950 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      /patient
                    </span>
                  </div>
                )}

                {!user && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/80 dark:bg-dark-teal-950/70 border border-slate-200/70 dark:border-dark-teal-800/60 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-brand-mint" />
                    <span>Role-Protected Healthcare Portals</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Action Controls: PWA Install, Theme Toggle, Auth Profile & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* PWA Install Button when browser fires beforeinstallprompt */}
            {deferredPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold bg-brand-mint text-dark-teal-950 hover:bg-mint-400 shadow-sm shadow-brand-mint/20 transition-all active:scale-95 cursor-pointer"
                title="Install Pharminder PWA to your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            {/* System-wide Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border border-slate-200/80 dark:border-dark-teal-800/60 bg-white/80 dark:bg-dark-teal-950/60 text-slate-700 dark:text-slate-200 hover:border-brand-mint/40 dark:hover:border-mint-400/40 transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-90" />
                  <span className="hidden xl:inline font-semibold">{t('nav.themeLight')}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-brand-teal transition-transform duration-300 hover:-rotate-45" />
                  <span className="hidden xl:inline font-semibold">{t('nav.themeDark')}</span>
                </>
              )}
            </button>

            {/* Bilingual Language Switcher (🌐 En / ع) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border border-slate-200/80 dark:border-dark-teal-800/60 bg-white/80 dark:bg-dark-teal-950/60 text-slate-700 dark:text-slate-200 hover:border-brand-mint/40 dark:hover:border-mint-400/40 transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
              aria-label={`Switch language to ${i18n.language === 'ar' ? 'English' : 'العربية'}`}
              title={`Switch language to ${i18n.language === 'ar' ? 'English' : 'العربية'}`}
            >
              <Languages className="w-4 h-4 text-brand-mint shrink-0" />
              <span className="font-extrabold tracking-tight">
                {i18n.language === 'ar' ? 'English' : 'العربية'}
              </span>
            </button>

            {/* User Profile / Auth State Badge */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-dark-teal-800/60">
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-mint">
                    {role === 'pharmacist' ? 'Doctor / PharmD' : 'Patient Account'}
                  </span>
                </div>

                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                    role === 'pharmacist'
                      ? 'bg-gradient-to-br from-brand-teal to-dark-teal-900'
                      : 'bg-gradient-to-br from-brand-mint to-teal-600'
                  }`}
                >
                  {role === 'pharmacist' ? (
                    <Stethoscope className="w-4 h-4 text-brand-mint" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-white" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 transition-colors cursor-pointer"
                  title="Sign out of current portal"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              location.pathname !== '/login' && location.pathname !== '/login/patient' && location.pathname !== '/login/pharmacist' && (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-teal to-dark-teal-900 hover:from-dark-teal-800 hover:to-dark-teal-950 text-white shadow-md shadow-brand-teal/20 transition-all duration-200 active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-brand-mint" />
                  <span>
                    {APP_MODE === 'pharmacist' ? 'Doctor Sign In' : APP_MODE === 'patient' ? 'Patient Sign In' : 'Sign In'}
                  </span>
                </Link>
              )
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-teal-950 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200/80 dark:border-dark-teal-800/40 space-y-3 animate-fade-in-up">
            {user ? (
              <div className="px-2 space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-teal-950 border border-slate-200/80 dark:border-dark-teal-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      Authenticated Session
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {profile?.full_name || user.email}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-brand-mint/20 text-brand-teal dark:text-mint-300">
                    {role === 'pharmacist' ? 'Doctor Portal' : 'Patient Portal'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-dark-teal-950 text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 border border-slate-200 dark:border-dark-teal-800 cursor-pointer"
                >
                  <Languages className="w-4 h-4 text-brand-mint" />
                  <span>
                    {i18n.language === 'ar' ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
                  </span>
                </button>

                {deferredPrompt && !isInstalled && (
                  <button
                    type="button"
                    onClick={() => {
                      handleInstallPwa()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl text-xs font-black bg-brand-mint text-dark-teal-950 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('nav.installApp')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-extrabold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.signOut')}</span>
                </button>
              </div>
            ) : (
              <div className="px-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-2xl text-sm font-bold bg-brand-teal text-white flex items-center justify-center gap-2 shadow-md shadow-brand-teal/20"
                >
                  <LogIn className="w-4 h-4 text-brand-mint" />
                  <span>
                    {APP_MODE === 'pharmacist' ? 'Doctor Sign In' : APP_MODE === 'patient' ? 'Patient Sign In' : 'Sign In'}
                  </span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
