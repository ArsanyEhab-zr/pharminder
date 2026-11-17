import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pill, Clock, Calendar, ShieldCheck, BellRing, Plus, X, RotateCcw } from 'lucide-react'
import {
  getEffectiveAlarmTimesForRx,
  getDefaultTimesForFrequency,
  formatHHMMDisplay,
  isValidHHMM,
} from '../../utils/alarmSchedules'

export default function ActiveMedicationsList({
  prescriptions = [],
  loading = false,
  customTimesMap = {},
  onUpdateCustomTimes,
  onTriggerAlarmTest,
}) {
  const { t } = useTranslation()
  const [currentTimestamp] = useState(() => Date.now())
  const [editingRxId, setEditingRxId] = useState(null)
  const [draftTimes, setDraftTimes] = useState([])
  const [newTimeInput, setNewTimeInput] = useState('14:30')

  const openEditorForRx = (rx) => {
    const current = getEffectiveAlarmTimesForRx(rx, customTimesMap)
    setDraftTimes(current)
    setNewTimeInput('14:30')
    setEditingRxId(rx.id)
  }

  const handleAddDraftTime = () => {
    if (!isValidHHMM(newTimeInput)) return
    if (!draftTimes.includes(newTimeInput)) {
      setDraftTimes([...draftTimes, newTimeInput].sort())
    }
  }

  const handleRemoveDraftTime = (timeStr) => {
    setDraftTimes(draftTimes.filter((item) => item !== timeStr))
  }

  const handleSaveTimes = async (rxId) => {
    if (onUpdateCustomTimes) {
      await onUpdateCustomTimes(rxId, draftTimes)
    }
    setEditingRxId(null)
  }

  const handleResetDefaultTimes = async (rx) => {
    const defaults = getDefaultTimesForFrequency(rx.frequency)
    setDraftTimes(defaults)
    if (onUpdateCustomTimes) {
      await onUpdateCustomTimes(rx.id, defaults)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs sm:text-sm text-slate-400 animate-pulse font-medium">
        Loading your active medication regimens…
      </div>
    )
  }

  if (prescriptions.length === 0) {
    return (
      <div className="p-10 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm space-y-3.5 animate-fade-in">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-mint-50 dark:bg-mint-950/80 text-brand-mint flex items-center justify-center shadow-inner">
          <Pill className="w-7 h-7 rotate-[-20deg]" />
        </div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
          {t('medicationsList.noActive')}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          {t('medicationsList.noActiveDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span>{t('medicationsList.title')}</span>
            <span className="text-xs px-3 py-0.5 rounded-full bg-mint-100 text-mint-900 dark:bg-mint-950 dark:text-mint-300 font-extrabold border border-mint-200 dark:border-mint-800 shadow-xs">
              {prescriptions.length} {t('medicationsList.activeBadge')}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {t('medicationsList.subtitle')}
          </p>
        </div>

        {onTriggerAlarmTest && (
          <button
            type="button"
            onClick={() => onTriggerAlarmTest()}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-mint text-dark-teal-950 text-xs font-black shadow-sm hover:brightness-105 transition-all cursor-pointer"
          >
            <BellRing className="w-4 h-4 shrink-0" />
            <span>{t('patient.testAlarm')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {prescriptions.map((rx) => {
          const med = rx.medication || {}
          const activeTimes = getEffectiveAlarmTimesForRx(rx, customTimesMap)
          const isEditing = editingRxId === rx.id

          let remainingDaysText = t('medicationsList.ongoing')
          let percentElapsed = 0

          if (rx.start_date && rx.end_date) {
            const start = new Date(rx.start_date).getTime()
            const end = new Date(rx.end_date).getTime()
            const now = currentTimestamp

            const totalDurationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
            const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

            if (daysRemaining <= 0) {
              remainingDaysText = t('medicationsList.completedToday')
              percentElapsed = 100
            } else {
              remainingDaysText = `${daysRemaining} ${t('medicationsList.daysRemaining')}`
              const elapsed = totalDurationDays - daysRemaining
              percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDurationDays) * 100)))
            }
          }

          return (
            <div
              key={rx.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d2232] border border-slate-200/80 dark:border-dark-teal-800/60 shadow-soft-sm hover-lift flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-50 to-dark-teal-50 dark:from-mint-950 dark:to-dark-teal-950 text-brand-mint flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
                      <Pill className="w-6 h-6 rotate-[-20deg]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 group-hover:text-brand-teal dark:group-hover:text-mint-300 transition-colors leading-snug truncate">
                        {med.name || 'Prescription'}
                      </h3>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate block">
                        {med.dosage_form || 'Tablet / Capsule'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-mint-50 dark:bg-mint-950 text-brand-mint border border-mint-200 dark:border-mint-800 shadow-xs shrink-0 self-start sm:self-auto">
                    {med.category || 'Medication'}
                  </span>
                </div>

                {/* Instructions */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-teal-950/70 border border-slate-100 dark:border-dark-teal-800/60 space-y-1.5 shadow-inner">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    How to Take:
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    {rx.dosage_instructions}
                  </p>
                </div>

                {/* Custom & Scheduled Alarm Times Editor */}
                <div className="p-3.5 rounded-2xl bg-dark-teal-50/60 dark:bg-dark-teal-950/60 border border-dark-teal-200/70 dark:border-dark-teal-800/70 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-teal dark:text-mint-300 inline-flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-brand-mint" />
                      <span>{t('alarm.customTimesLabel')}</span>
                    </span>
                    {!isEditing && onUpdateCustomTimes && (
                      <button
                        type="button"
                        onClick={() => openEditorForRx(rx)}
                        className="text-[11px] font-extrabold text-brand-teal dark:text-mint-300 hover:underline cursor-pointer"
                      >
                        {t('alarm.editAlarmTimes')}
                      </button>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeTimes.map((hhmm) => (
                        <span
                          key={hhmm}
                          dir="ltr"
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-[#0d2232] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-dark-teal-700 shadow-2xs"
                        >
                          <Clock className="w-3 h-3 text-brand-mint shrink-0" />
                          <span>{formatHHMMDisplay(hhmm)}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {draftTimes.map((hhmm) => (
                          <span
                            key={hhmm}
                            dir="ltr"
                            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-brand-teal text-white"
                          >
                            <span>{formatHHMMDisplay(hhmm)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftTime(hhmm)}
                              aria-label={`Remove ${hhmm}`}
                              className="hover:text-rose-200 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={newTimeInput}
                          onChange={(e) => setNewTimeInput(e.target.value)}
                          className="flex-1 min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-dark-teal-700 bg-white dark:bg-[#0d2232] text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={handleAddDraftTime}
                          className="min-h-[38px] px-3 py-1 rounded-xl bg-dark-teal-950 dark:bg-brand-mint text-white dark:text-dark-teal-950 text-xs font-black inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('alarm.addAlarmTime')}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleResetDefaultTimes(rx)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t('alarm.resetDefaultTimes')}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingRxId(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveTimes(rx.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                          >
                            {t('alarm.saveAlarmTimes')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Frequency & Dates */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-brand-teal dark:text-mint-300" />
                      Frequency:
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {rx.frequency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Schedule:
                    </span>
                    <span className="font-bold text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                      {rx.start_date} &rarr; {rx.end_date || 'Ongoing'}
                    </span>
                  </div>
                </div>

                {/* Treatment Progress Bar */}
                {rx.end_date && (
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Treatment Course</span>
                      <span className="font-extrabold text-brand-mint">{remainingDaysText}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-dark-teal-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50 dark:border-dark-teal-800/50">
                      <div
                        className="bg-gradient-to-r from-brand-teal to-brand-mint h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentElapsed}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Pharmacist Verified Badge + Instant Alarm Test */}
              <div className="pt-3.5 border-t border-slate-100 dark:border-dark-teal-800/50 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-brand-mint" />
                  Prescribed by Care Team
                </span>
                {onTriggerAlarmTest ? (
                  <button
                    type="button"
                    onClick={() =>
                      onTriggerAlarmTest({
                        prescriptionId: rx.id,
                        medicationName: med.name || 'Medication',
                        dosageInstructions: rx.dosage_instructions,
                        dosageForm: med.dosage_form || 'Tablet',
                      })
                    }
                    className="inline-flex items-center gap-1 text-brand-teal dark:text-mint-300 font-extrabold hover:underline cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{t('patient.testAlarm')}</span>
                  </button>
                ) : (
                  <span className="text-brand-teal dark:text-mint-300 font-extrabold">
                    Verified Safe
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
