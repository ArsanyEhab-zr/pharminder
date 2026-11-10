import React from 'react'
import { 
  BellRing, 
  Pill, 
  Check, 
  Clock, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  X,
  UserCheck
} from 'lucide-react'

export default function DoseAlertModal({
  dose,
  isAlarmPlaying,
  onTakeDose,
  onDismiss,
  onStopAlarm
}) {
  if (!dose) return null

  const isCareTeamPing = Boolean(dose.isCareTeamPing)

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dose-alert-title"
    >
      <div 
        className={`w-full max-w-lg rounded-3xl bg-white dark:bg-[#0d2232] border-2 shadow-2xl overflow-hidden animate-scale-in transition-all ${
          isCareTeamPing 
            ? 'border-rose-500/80 dark:border-rose-500/70 shadow-rose-500/30 ring-4 ring-rose-500/20' 
            : 'border-brand-mint/60 dark:border-brand-mint/50 shadow-brand-mint/25'
        }`}
      >
        {/* Top Decorative Alert Bar */}
        <div 
          className={`p-4 sm:p-6 text-white flex items-center justify-between transition-colors gap-3 ${
            isCareTeamPing
              ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600'
              : 'bg-gradient-to-r from-brand-teal via-teal-700 to-brand-mint'
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div 
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-white shadow-inner ${
                  isCareTeamPing ? 'bg-white/25 animate-bounce' : 'bg-white/20 animate-pulse'
                }`}
              >
                <BellRing className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-ping" />
            </div>

            <div className="min-w-0 flex-1">
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest block truncate ${
                isCareTeamPing ? 'text-rose-100' : 'text-mint-200'
              }`}>
                {isCareTeamPing ? 'Urgent Care Team Message' : 'Scheduled Reminder'}
              </span>
              <h2 id="dose-alert-title" className="text-lg sm:text-2xl font-black tracking-tight leading-tight truncate">
                {isCareTeamPing ? 'Urgent: Missed Dose Alert!' : 'Time for Your Dose!'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAlarmPlaying && onStopAlarm && (
              <button
                type="button"
                onClick={onStopAlarm}
                className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mute Chime"
                aria-label="Mute chime"
              >
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">Mute Sound</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
              aria-label="Close reminder"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Audio Chime Notice */}
          {isAlarmPlaying && (
            <div 
              className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold animate-fade-in shadow-xs ${
                isCareTeamPing
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-mint-50 dark:bg-mint-950/70 border-mint-200 dark:border-mint-800 text-mint-900 dark:text-mint-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 animate-pulse ${isCareTeamPing ? 'text-rose-500' : 'text-brand-mint'}`} />
                Melodic chime alarm is actively ringing
              </span>
              <span 
                className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-md ${
                  isCareTeamPing 
                    ? 'text-white bg-rose-600 animate-pulse' 
                    : 'text-brand-mint bg-mint-100 dark:bg-mint-900/80'
                }`}
              >
                Active Alarm
              </span>
            </div>
          )}

          {/* Care Team Specific Urgent Banner */}
          {isCareTeamPing && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100 flex items-start gap-3 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <ShieldAlert className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-300 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    {dose.doctorName || 'Dr. Sarah Smith, PharmD'}
                  </span>
                  <span className="text-[10px] font-bold text-rose-500 font-tabular">
                    Urgent Ping
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-black leading-snug text-rose-900 dark:text-rose-100">
                  {dose.urgentNote || 'Urgent message from your Pharmacist/Doctor: You missed a dose. Please take it immediately.'}
                </p>
              </div>
            </div>
          )}

          {/* Main Medication Highlight Card */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-dark-teal-950/80 border border-slate-200/80 dark:border-dark-teal-800/80 space-y-4 shadow-inner">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div 
                  className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md ${
                    isCareTeamPing
                      ? 'bg-gradient-to-br from-rose-500 to-amber-600'
                      : 'bg-gradient-to-br from-brand-teal to-dark-teal-950 text-brand-mint'
                  }`}
                >
                  <Pill className="w-7 h-7 rotate-[-20deg]" />
                </div>
                <div>
                  <span 
                    className={`text-xs font-extrabold uppercase tracking-wider block ${
                      isCareTeamPing ? 'text-rose-500' : 'text-brand-mint'
                    }`}
                  >
                    {dose.dosageForm || 'Oral Medication'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                    {dose.medicationName}
                  </h3>
                </div>
              </div>

              <div 
                className={`px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shrink-0 text-xs font-black font-tabular shadow-xs ${
                  isCareTeamPing
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                    : 'bg-dark-teal-50 dark:bg-dark-teal-900/80 text-brand-teal dark:text-mint-300 border border-dark-teal-200 dark:border-dark-teal-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{dose.timeDisplay || 'Due Now'}</span>
              </div>
            </div>

            {/* Dosage Instructions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-dark-teal-800/60">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                Instructions:
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-snug">
                {dose.dosageInstructions || 'Take 1 dose as prescribed with water.'}
              </p>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 px-1">
            <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${isCareTeamPing ? 'text-rose-500' : 'text-brand-mint'}`} />
            <p className="leading-relaxed">
              {isCareTeamPing 
                ? 'Your doctor noticed this dose was missed. Taking doses consistently is critical to treatment efficacy.' 
                : 'Please take this dose with a full glass of water. If you feel any dizziness or discomfort, inform your care team.'}
            </p>
          </div>

          {/* Large Accessible Action Buttons: 56px Height */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onTakeDose}
              className={`w-full min-h-[56px] py-4 px-6 rounded-2xl text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer ${
                isCareTeamPing
                  ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 shadow-rose-500/30'
                  : 'bg-gradient-to-r from-brand-mint to-teal-500 shadow-brand-mint/30 hover:shadow-glow-mint'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center shadow-xs">
                <Check className="w-4 h-4 stroke-[3.5]" />
              </div>
              <span>{isCareTeamPing ? 'Take Now' : 'Take Dose Now'}</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-teal-900/60 dark:hover:bg-dark-teal-800/80 text-slate-700 dark:text-slate-300 font-extrabold text-sm transition-colors cursor-pointer"
            >
              <span>{isCareTeamPing ? 'Dismiss / Acknowledge' : 'Remind Me Later / Snooze'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
