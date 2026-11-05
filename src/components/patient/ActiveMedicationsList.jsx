import React, { useState } from 'react'
import { Pill, Clock, Calendar, ShieldCheck } from 'lucide-react'

export default function ActiveMedicationsList({ prescriptions = [], loading = false }) {
  const [currentTimestamp] = useState(() => Date.now())

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
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">No Active Prescriptions</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Your pharmacist has not prescribed any active medications yet, or your previous courses have concluded.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span>My Active Medications</span>
            <span className="text-xs px-3 py-0.5 rounded-full bg-mint-100 text-mint-900 dark:bg-mint-950 dark:text-mint-300 font-extrabold border border-mint-200 dark:border-mint-800 shadow-xs">
              {prescriptions.length} Active
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Current prescribed treatments, dosage instructions, and course progress
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {prescriptions.map((rx) => {
          const med = rx.medication || {}
          
          // Calculate remaining duration
          let remainingDaysText = 'Ongoing therapy'
          let percentElapsed = 0

          if (rx.start_date && rx.end_date) {
            const start = new Date(rx.start_date).getTime()
            const end = new Date(rx.end_date).getTime()
            const now = currentTimestamp

            const totalDurationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
            const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

            if (daysRemaining <= 0) {
              remainingDaysText = 'Course completed today'
              percentElapsed = 100
            } else {
              remainingDaysText = `${daysRemaining} days remaining`
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-mint-50 to-dark-teal-50 dark:from-mint-950 dark:to-dark-teal-950 text-brand-mint flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
                      <Pill className="w-6 h-6 rotate-[-20deg]" />
                    </div>
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 group-hover:text-brand-teal dark:group-hover:text-mint-300 transition-colors leading-snug">
                        {med.name || 'Prescription'}
                      </h3>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {med.dosage_form || 'Tablet / Capsule'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-mint-50 dark:bg-mint-950 text-brand-mint border border-mint-200 dark:border-mint-800 shadow-xs">
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

              {/* Card Footer: Pharmacist Verified Badge */}
              <div className="pt-3.5 border-t border-slate-100 dark:border-dark-teal-800/50 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-brand-mint" />
                  Prescribed by Care Team
                </span>
                <span className="text-brand-teal dark:text-mint-300 font-extrabold">
                  Verified Safe
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
