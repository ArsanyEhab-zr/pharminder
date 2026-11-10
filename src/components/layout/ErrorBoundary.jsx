import React from 'react'
import { ShieldAlert, RefreshCw, Home } from 'lucide-react'
import { getBrandLogo } from '../../utils/brandAssets'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Pharminder ErrorBoundary Caught Runtime Exception]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReloadApplication = async () => {
    try {
      // Unregister any stale dev service workers that might hold mismatched Vite chunks
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.update()
        }
      }
    } catch {
      // Ignore service worker update errors
    }
    window.location.reload()
  }

  handleReturnHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#f8fafc] dark:bg-[#071520] text-slate-900 dark:text-slate-100 font-sans">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0d2232] border-2 border-dark-teal-200 dark:border-dark-teal-800 shadow-2xl p-6 sm:p-9 text-center space-y-6">
            {/* Brand Logo */}
            <img 
              src={getBrandLogo()} 
              alt="Pharminder Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain drop-shadow-md" 
            />

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-50 dark:bg-mint-950 text-[#1B4965] dark:text-[#2EC4B6] text-[11px] font-black uppercase tracking-widest border border-mint-200 dark:border-mint-800">
                <ShieldAlert className="w-3.5 h-3.5 text-[#2EC4B6]" />
                <span>Pharminder Clinical Guard</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Workspace Recovery Mode
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                A temporary rendering or navigation state interruption occurred (for example, after a browser cache update or back-swipe). Your clinical data and Supabase session remain 100% safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-dark-teal-950/90 border border-slate-200 dark:border-dark-teal-800 text-left overflow-x-auto">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Diagnostic Summary:
                </span>
                <code className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReloadApplication}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-[#2EC4B6] hover:bg-mint-500 text-[#071520] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2EC4B6]/25 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleReturnHome}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-2xl bg-[#1B4965] hover:bg-dark-teal-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#2EC4B6]" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

