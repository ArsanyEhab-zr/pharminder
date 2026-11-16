import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  BellRing,
  Pill,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  ShieldAlert,
  X,
  UserCheck,
} from 'lucide-react'

export default function DoseAlertModal({
  dose,
  isAlarmPlaying,
  onTakeDose,
  onSnooze,
  onDismiss,
  onStopAlarm,
}) {
  const { t, i18n } = useTranslation()
  if (!dose) return null

  const isCareTeamPing = Boolean(dose.isCareTeamPing)
  const isArabic = i18n.language === 'ar'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dose-alert-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className={`w-[95vw] max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0d2232] border-2 shadow-2xl transition-all ${
          isCareTeamPing
            ? 'border-rose-500 ring-4 ring-rose-500/30 shadow-rose-500/30'
            : 'border-emerald-500/80 ring-4 ring-emerald-500/20 shadow-emerald-500/25'
        }`}
      >
        {/* High-Contrast Elderly-Readable Top Bar */}
        <div
          className={`p-5 sm:p-6 text-white flex items-center justify-between gap-3 ${
            isCareTeamPing
              ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600'
              : 'bg-gradient-to-r from-dark-teal-950 via-brand-teal to-emerald-600'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner"
            >
              <BellRing className="w-8 h-8 text-white" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-extrabold uppercase tracking-wider block opacity-90 truncate">
                {isCareTeamPing ? t('alarm.urgentDoctorPing') : t('alarm.activeDoseDue')}
              </span>
              <h2
                id="dose-alert-title"
                className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight mt-0.5"
              >
                {isCareTeamPing
                  ? isArabic
                    ? t('alarm.urgentDoctorPing')
                    : 'Urgent: Missed Dose Alert!'
                  : t('alarm.activeDoseDue')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAlarmPlaying && onStopAlarm && (
              <button
                type="button"
                onClick={onStopAlarm}
                className="min-h-[44px] px-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                aria-label="Mute chime"
              >
                <VolumeX className="w-5 h-5" />
                <span className="hidden sm:inline">Mute</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              aria-label="Close reminder"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Clean Elderly-Friendly Body */}
        <div className="p-5 sm:p-7 space-y-5">
          {isAlarmPlaying && (
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-bold ${
                isCareTeamPing
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Volume2
                  className={`w-5 h-5 animate-pulse ${
                    isCareTeamPing ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
                <span>{isArabic ? 'المنبه الصوتي يعمل الآن' : 'Audio Chime Active'}</span>
              </span>
              <span
                className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg ${
                  isCareTeamPing ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {dose.timeDisplay || 'Now'}
              </span>
            </div>
          )}

          {isCareTeamPing && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>{dose.doctorName || 'Dr. Sarah Smith, PharmD'}</span>
                </span>
                <p className="text-sm sm:text-base font-bold leading-snug">
                  {dose.urgentNote ||
                    'Urgent message from your Pharmacist/Doctor: You missed a dose. Please take it immediately.'}
                </p>
              </div>
            </div>
          )}

          {/* Extra-Large Readable Medication & Dose Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-dark-teal-950/85 border-2 border-slate-200 dark:border-dark-teal-800 space-y-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md ${
                  isCareTeamPing
                    ? 'bg-gradient-to-br from-rose-600 to-amber-600'
                    : 'bg-gradient-to-br from-brand-teal to-emerald-600'
                }`}
              >
                <Pill className="w-8 h-8" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-teal dark:text-mint-300 block">
                  {dose.dosageForm || 'Medication'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight break-words">
                  {dose.medicationName}
                </h3>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-dark-teal-800/80 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white dark:bg-[#0d2232] border border-slate-200 dark:border-dark-teal-700 text-sm font-black text-slate-800 dark:text-slate-100">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-brand-mint" />
                <span>
                  {t('alarm.scheduledTime')}: {dose.timeDisplay || 'Now'}
                </span>
              </div>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed">
                {dose.dosageInstructions || 'Take 1 dose now with a full glass of water.'}
              </p>
            </div>
          </div>

          {/* Two Giant Elderly-Friendly Action Buttons (min-h-[60px] text-lg font-bold) */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={onTakeDose}
              className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-7 h-7 shrink-0 stroke-[2.5]" />
              <span>
                {isCareTeamPing && !isArabic ? 'Take Now' : t('alarm.takeNow')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => (onSnooze ? onSnooze(10) : onDismiss())}
              className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 border-2 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 text-lg font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <Clock className="w-6 h-6 text-amber-700 dark:text-amber-300 shrink-0" />
              <span>{t('alarm.snooze10Min')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
