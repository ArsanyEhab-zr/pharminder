import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  Pill,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  BellRing,
  ShieldCheck,
} from 'lucide-react'

export const PATIENT_TOUR_STEPS = [
  {
    step: 1,
    tabKey: 'profile',
    badge: 'Step 1 of 3 • Clinical Safety First',
    headline: 'Start by filling out your Medical Profile',
    description:
      'Open the "Medical Form & Chronic Diseases" tab to enter your vitals and dynamically tag any chronic disease, symptom, or drug allergy in the world. Your doctor receives updates in real time to prevent harmful drug interactions.',
    actionLabel: 'View Medical Profile Form',
    tip: 'Pro Tip: Type any custom condition or allergy and press Enter to create a clinical tag!',
    icon: ClipboardList,
    accent: 'from-brand-mint to-teal-400',
  },
  {
    step: 2,
    tabKey: 'medications',
    badge: 'Step 2 of 3 • Your Prescriptions',
    headline: 'Check your Active Medications here',
    description:
      'Visit "My Active Medications" anytime to inspect all prescriptions authorized by Dr. Sarah Smith, PharmD—complete with dosage instructions, administration frequency, and remaining treatment days.',
    actionLabel: 'Inspect Active Medications',
    tip: 'Pro Tip: New prescriptions issued by your pharmacist appear here automatically without refreshing!',
    icon: Pill,
    accent: 'from-brand-teal to-sky-500',
  },
  {
    step: 3,
    tabKey: 'schedule',
    badge: 'Step 3 of 3 • Daily Adherence & Alarms',
    headline: 'Take your doses from this timeline when the alarm sounds.',
    description:
      'Follow "Today’s Follow-Up & Schedule" throughout the day. When a scheduled dose time arrives, an audio chime and alert pop-up will remind you. Tap "Mark Dose as Taken" to log your adherence live.',
    actionLabel: 'Go to Today’s Timeline',
    tip: 'Pro Tip: You can test the audio chime anytime using the "Test Dose Alarm & Chime" button in the header!',
    icon: Clock,
    accent: 'from-emerald-500 to-brand-mint',
  },
]

export default function PatientGuidedTour({
  isOpen,
  currentStepIndex = 0,
  onStepChange,
  onClose,
  onComplete,
  onTriggerTestAlarm,
}) {
  if (!isOpen) return null

  const activeStep = PATIENT_TOUR_STEPS[currentStepIndex] || PATIENT_TOUR_STEPS[0]
  const StepIcon = activeStep.icon
  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === PATIENT_TOUR_STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete?.()
    } else {
      onStepChange?.(currentStepIndex + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirst) {
      onStepChange?.(currentStepIndex - 1)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] bg-slate-950/65 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-guided-tour-title"
        >
          <motion.div
            key={activeStep.step}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0b1f2e] border-2 border-brand-mint/80 dark:border-mint-700 shadow-2xl overflow-hidden"
          >
            {/* Top Progress Bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-dark-teal-950 flex">
              {PATIENT_TOUR_STEPS.map((s, idx) => (
                <div
                  key={s.step}
                  className={`flex-1 transition-all duration-300 ${
                    idx <= currentStepIndex
                      ? 'bg-gradient-to-r from-brand-mint to-teal-400'
                      : 'bg-transparent'
                  }`}
                />
              ))}
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${activeStep.accent} text-dark-teal-950 flex items-center justify-center shadow-md shrink-0`}
                  >
                    <StepIcon className="w-7 h-7 stroke-[2.2] text-white" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full bg-mint-100 dark:bg-mint-950 text-brand-teal dark:text-mint-300 border border-mint-200 dark:border-mint-800">
                      <Sparkles className="w-3 h-3 text-brand-mint" />
                      {activeStep.badge}
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                      <img src="/logo-patient.png" alt="Pharminder Patient Logo" className="w-4 h-4 object-contain inline-block shrink-0" />
                      <span>Pharminder Interactive Patient Companion Tour</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-teal-900 transition-colors cursor-pointer"
                  aria-label="Close guided tour"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Step Headline & Explanation */}
              <div className="space-y-3">
                <h3
                  id="patient-guided-tour-title"
                  className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug"
                >
                  {activeStep.step}. &ldquo;{activeStep.headline}&rdquo;
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {activeStep.description}
                </p>
              </div>

              {/* Interactive Visual Stepper Pills (1, 2, 3) */}
              <div className="grid grid-cols-3 gap-2">
                {PATIENT_TOUR_STEPS.map((item, idx) => {
                  const Icon = item.icon
                  const isCurrent = idx === currentStepIndex
                  const isDone = idx < currentStepIndex
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => onStepChange?.(idx)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-mint-50 dark:bg-mint-950/70 border-brand-mint text-slate-900 dark:text-white shadow-xs'
                          : isDone
                            ? 'bg-slate-50 dark:bg-dark-teal-950/60 border-mint-300/60 dark:border-dark-teal-800 text-slate-700 dark:text-slate-300'
                            : 'bg-slate-50/60 dark:bg-dark-teal-950/30 border-slate-200/70 dark:border-dark-teal-800/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-mint">
                          Step {item.step}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint" />
                        ) : (
                          <Icon className="w-3.5 h-3.5 opacity-75" />
                        )}
                      </div>
                      <div className="text-[11px] font-extrabold line-clamp-2 leading-tight">
                        {item.headline}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Helpful Clinical Tip Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-teal-950/80 border border-slate-200/80 dark:border-dark-teal-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-brand-mint shrink-0 mt-0.5" />
                  <span>{activeStep.tip}</span>
                </div>

                {activeStep.step === 3 && onTriggerTestAlarm && (
                  <button
                    type="button"
                    onClick={() => {
                      onComplete?.()
                      onTriggerTestAlarm()
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-black text-[11px] shrink-0 flex items-center gap-1.5 hover:brightness-95 cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    <span>Try Alarm Now</span>
                  </button>
                )}
              </div>

              {/* Footer Navigation Controls */}
              <div className="pt-2 border-t border-slate-100 dark:border-dark-teal-800/70 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1.5 cursor-pointer"
                >
                  Skip Tour
                </button>

                <div className="flex items-center gap-2.5">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-dark-teal-950 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={handleNext}
                    className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-mint to-teal-400 text-dark-teal-950 text-xs sm:text-sm font-black shadow-md shadow-brand-mint/25 flex items-center gap-2 cursor-pointer"
                  >
                    <span>{isLast ? 'Finish Guided Tour' : 'Next Step'}</span>
                    {isLast ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
