import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPdrDrugMonograph, PDR_REFERENCE_URL } from '../../utils/pdrDrugDatabase'
import {
  BookOpen,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Pill,
  Activity,
  FlaskConical,
  Stethoscope,
  Sparkles,
  X,
  HeartPulse,
  Info,
  RefreshCw
} from 'lucide-react'

export default function DrugInformationPanel({
  medicationName,
  patientName = 'Selected Patient',
  patientChronicDiseases = [],
  onApplyDoseAdjustment,
  onClose,
  isModal = false,
}) {
  const [simulatingFetch, setSimulatingFetch] = useState(false)

  // Simulate brief PDR.net monograph lookup when medication changes
  useEffect(() => {
    if (!medicationName) return
    setSimulatingFetch(true)
    const timer = setTimeout(() => setSimulatingFetch(false), 240)
    return () => clearTimeout(timer)
  }, [medicationName])

  const monograph = useMemo(
    () => getPdrDrugMonograph(medicationName, patientChronicDiseases),
    [medicationName, patientChronicDiseases]
  )

  if (!medicationName) return null

  const content = (
    <div className="rounded-3xl bg-white dark:bg-[#0d2232] border-2 border-dark-teal-200/90 dark:border-dark-teal-700/80 shadow-soft-xl overflow-hidden">
      {/* Top PDR.net Official Reference Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1B4965] via-dark-teal-900 to-dark-teal-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-brand-mint/15 blur-2xl pointer-events-none"
        />

        <div className="flex items-start gap-3.5 relative z-10 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-brand-mint shrink-0 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-mint text-dark-teal-950">
                PDR.net Clinical Drug Summary
              </span>
              <a
                href={monograph.pdrUrl || PDR_REFERENCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-mint-200 hover:text-white underline underline-offset-2 transition-colors truncate max-w-full"
              >
                <span>Prescribers’ Digital Reference (pdr.net)</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1 break-words">
              {medicationName}{' '}
              <span className="text-xs sm:text-sm font-bold text-mint-300/90">
                ({monograph.genericName})
              </span>
            </h3>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              Class: {monograph.therapeuticClass}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 self-end sm:self-center">
          {simulatingFetch && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 text-mint-200">
              <RefreshCw className="w-3 h-3 animate-spin text-brand-mint" />
              Syncing PDR.net…
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close PDR.net Drug Summary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Monograph Body */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* 1. Common Brand Names Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-dark-teal-950/70 border border-slate-200/80 dark:border-dark-teal-800/60">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-brand-teal dark:text-mint-300" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Common Brand Names (PDR.net):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {monograph.commonBrandNames.map((brand) => (
              <span
                key={brand}
                className="px-3 py-1 rounded-xl text-xs font-extrabold bg-white dark:bg-dark-teal-900 text-brand-teal dark:text-mint-300 border border-slate-200 dark:border-dark-teal-700 shadow-2xs"
              >
                {brand}®
              </span>
            ))}
          </div>
        </div>

        {/* 2. Dosing Considerations (CRITICAL: Highlights Patient's Chronic Diseases & Kidney Disease Adjustments) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-mint" />
              <span>Dosing Considerations & Renal / Organ Adjustments</span>
            </h4>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-mint-50 dark:bg-mint-950 text-brand-teal dark:text-mint-300 border border-mint-200 dark:border-mint-800">
              Screened against {patientName}’s Medical Profile
            </span>
          </div>

          <div className="space-y-3">
            {monograph.dosingConsiderations.map((item, index) => {
              const isHighlighted = item.isPatientMatch
              const isKidney = item.isKidneyRelated

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-2.5 ${
                    isHighlighted
                      ? 'bg-amber-50/95 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 shadow-md'
                      : isKidney
                        ? 'bg-mint-50/50 dark:bg-dark-teal-950/80 border-brand-mint/60 dark:border-mint-800/80'
                        : 'bg-slate-50/80 dark:bg-dark-teal-950/40 border-slate-200/80 dark:border-dark-teal-800/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isHighlighted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-2xs">
                          <AlertTriangle className="w-3 h-3" />
                          Patient Condition Match: {item.matchedPatientConditions.join(', ')}
                        </span>
                      ) : isKidney ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-brand-teal text-brand-mint">
                          <HeartPulse className="w-3 h-3" />
                          Renal / Kidney Dosing Protocol
                        </span>
                      ) : null}

                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        {item.conditionLabel}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        item.alertLevel.toLowerCase().includes('contraindicated') ||
                        item.alertLevel.toLowerCase().includes('boxed')
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          : item.alertLevel.toLowerCase().includes('adjustment') ||
                              item.alertLevel.toLowerCase().includes('critical')
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      {item.alertLevel}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                    {item.directive}
                  </p>

                  {onApplyDoseAdjustment && (isHighlighted || isKidney) && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onApplyDoseAdjustment(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-teal hover:bg-dark-teal-900 text-white text-[11px] font-extrabold shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-brand-mint" />
                        <span>Apply PDR.net Dosing Note to Prescription</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Grid for Dosage & Indications + Administration + Mechanism of Action + Adverse Reactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 3. Dosage and Indications */}
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-dark-teal-950/60 border border-slate-200/80 dark:border-dark-teal-800/60 space-y-3">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-teal dark:text-mint-300 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-brand-mint" />
              <span>Dosage and Indications</span>
            </h4>
            <div className="space-y-2.5">
              {monograph.dosageAndIndications.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-[#0d2232] border border-slate-200/60 dark:border-dark-teal-800/60 space-y-1"
                >
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                    {item.indication}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-snug">
                    {item.adultDose}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Administration & 6. Mechanism of Action */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-dark-teal-950/60 border border-slate-200/80 dark:border-dark-teal-800/60 space-y-2">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-teal dark:text-mint-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-mint" />
                <span>Administration Guidelines</span>
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {monograph.administration}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-dark-teal-950/60 border border-slate-200/80 dark:border-dark-teal-800/60 space-y-2">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-teal dark:text-mint-300 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-brand-mint" />
                <span>Mechanism of Action</span>
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {monograph.mechanismOfAction}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Adverse Reactions */}
        <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-dark-teal-950/60 border border-slate-200/80 dark:border-dark-teal-800/60 space-y-3">
          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Adverse Reactions Profile (PDR.net)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Common / Frequent Adverse Effects:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {monograph.adverseReactions.common.map((reaction) => (
                  <span
                    key={reaction}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0d2232] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-dark-teal-800"
                  >
                    {reaction}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Serious / Severe Adverse Reactions:
              </span>
              <ul className="space-y-1 text-rose-800 dark:text-rose-300 font-semibold">
                {monograph.adverseReactions.serious.map((seriousItem) => (
                  <li key={seriousItem} className="flex items-start gap-1.5">
                    <span className="text-rose-500 mt-0.5">•</span>
                    <span>{seriousItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl"
          >
            {content}
          </motion.div>
        </div>
      </AnimatePresence>
    )
  }

  return content
}

