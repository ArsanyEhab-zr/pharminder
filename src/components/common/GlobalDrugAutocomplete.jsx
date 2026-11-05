import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { searchGlobalMedications } from '../../utils/globalDrugApi'
import { KNOWN_LOCAL_DRUGS, normalizeDrugKey } from '../../utils/interactionChecker'
import {
  Search,
  Pill,
  Globe,
  Loader2,
  CheckCircle2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'

/**
 * Reusable Async Global Medication Autocomplete
 * Powered by the live NIH NLM RxTerms API (`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=`)
 *
 * Used in:
 * - Pharmacist Portal (`PrescribeMedication.jsx`) to search & prescribe ANY drug in the world
 * - Patient Portal (`PatientMedicalProfileForm.jsx`) to search & add ANY global medication or drug allergy
 */
export default function GlobalDrugAutocomplete({
  onSelectMedication,
  selectedMedicationName = '',
  placeholder = 'Search any medication in the world (e.g., Ozempic, Apixaban, Vancomycin, Levothyroxine)…',
  label = 'Global Medication Search (NIH RxTerms API)',
  compact = false,
  clearOnSelect = false,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced live fetch from NIH RxTerms API
  useEffect(() => {
    let isCancelled = false

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const items = await searchGlobalMedications(query, 10)
        if (!isCancelled) {
          setResults(items)
          setActiveIndex(0)
        }
      } catch (err) {
        console.error('Error searching global medications:', err)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }, 200)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const handleChooseItem = (item, chosenStrength = null) => {
    const baseCleanName = item.cleanName || item.name
    const strengthToUse =
      chosenStrength ||
      (item.strengths && item.strengths.length > 0 ? item.strengths[0] : '')
    const finalDisplayName = strengthToUse
      ? `${baseCleanName} (${strengthToUse})`
      : baseCleanName

    const normalizedKey = normalizeDrugKey(baseCleanName)
    const isLocalIndexed = KNOWN_LOCAL_DRUGS.has(normalizedKey)

    if (onSelectMedication) {
      onSelectMedication({
        ...item,
        name: finalDisplayName,
        cleanName: baseCleanName,
        dosage_form: strengthToUse || item.dosage_form || 'Oral Tablet / Capsule',
        category: item.category || 'Global NIH RxTerms Formulary',
        isGlobalApi: !isLocalIndexed,
      })
    }

    if (clearOnSelect) {
      setQuery('')
    } else {
      setQuery(finalDisplayName)
    }
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev - 1 < 0 ? Math.max(results.length - 1, 0) : prev - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIndex]) {
        handleChooseItem(results[activeIndex])
      } else if (query.trim()) {
        handleChooseItem({
          id: `custom-${query.trim().toLowerCase()}`,
          name: query.trim(),
          cleanName: query.trim(),
          dosage_form: 'Oral Tablet / Capsule',
          category: 'Custom Global Medication',
          strengths: [],
        })
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-brand-mint" />
            <span>{label}</span>
          </label>
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Sparkles className="w-2.5 h-2.5" />
            Live NIH NLM RxTerms API
          </span>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-11 pr-10 ${
            compact ? 'py-2.5 min-h-[44px]' : 'py-3 min-h-[48px]'
          } rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-dark-teal-800 bg-slate-50 dark:bg-dark-teal-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-mint transition-all shadow-inner`}
        />

        {loading ? (
          <Loader2 className="w-4 h-4 text-brand-mint animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setIsOpen(true)
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
            aria-label="Clear medication search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Selected Global Medication Pill Indicator */}
      {!clearOnSelect && selectedMedicationName && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-mint-50/80 dark:bg-mint-950/50 border border-mint-200/80 dark:border-mint-800/70 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
            <Pill className="w-3.5 h-3.5 text-brand-mint shrink-0" />
            <span>Active Selection:</span>
            <span className="font-black text-brand-teal dark:text-mint-300">
              {selectedMedicationName}
            </span>
          </div>
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
              KNOWN_LOCAL_DRUGS.has(normalizeDrugKey(selectedMedicationName))
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200'
                : 'bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200'
            }`}
          >
            {KNOWN_LOCAL_DRUGS.has(normalizeDrugKey(selectedMedicationName))
              ? 'Local + Global Rules'
              : 'Global NIH RxTerms'}
          </span>
        </div>
      )}

      {/* Async Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-40 left-0 right-0 mt-1.5 max-h-80 overflow-y-auto rounded-2xl bg-white dark:bg-[#0b1f2e] border border-slate-200 dark:border-dark-teal-700 shadow-2xl divide-y divide-slate-100 dark:divide-dark-teal-800/60"
          >
            <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-dark-teal-950/90 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <span>
                {query.trim()
                  ? `NIH RxTerms Global Results for "${query}"`
                  : 'Popular & Global Formulary Suggestions'}
              </span>
              <span>Click drug or specific strength</span>
            </div>

            {results.map((item, idx) => {
              const isLocal = KNOWN_LOCAL_DRUGS.has(
                normalizeDrugKey(item.cleanName || item.name)
              )
              const isHighlighted = idx === activeIndex

              return (
                <div
                  key={item.id || item.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`p-3 transition-colors ${
                    isHighlighted
                      ? 'bg-mint-50/80 dark:bg-dark-teal-900/70'
                      : 'hover:bg-slate-50 dark:hover:bg-dark-teal-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleChooseItem(item)}
                      className="text-left flex-1 flex items-start gap-2.5 cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isLocal
                            ? 'bg-mint-100 dark:bg-mint-950 text-brand-teal dark:text-mint-300'
                            : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                        }`}
                      >
                        {isLocal ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {item.dosage_form} • {item.category}
                        </div>
                      </div>
                    </button>

                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                        isLocal
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                      }`}
                    >
                      {isLocal ? 'Local Rules' : 'Global API'}
                    </span>
                  </div>

                  {/* Clickable NIH RxTerms Dosage Strengths */}
                  {item.strengths && item.strengths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-9">
                      <span className="text-[10px] font-bold text-slate-400">
                        Strengths:
                      </span>
                      {item.strengths.slice(0, 5).map((str) => (
                        <button
                          key={str}
                          type="button"
                          onClick={() => handleChooseItem(item, str)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-dark-teal-950 border border-slate-200 dark:border-dark-teal-700 text-slate-700 dark:text-slate-200 hover:border-brand-mint hover:text-brand-teal dark:hover:text-mint-300 transition-colors cursor-pointer"
                        >
                          {str}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Always allow adding/selecting ANY custom medication string */}
            {query.trim().length > 1 && (
              <button
                type="button"
                onClick={() =>
                  handleChooseItem({
                    id: `custom-${query.trim().toLowerCase()}`,
                    name: query.trim(),
                    cleanName: query.trim(),
                    dosage_form: 'Oral Tablet / Capsule',
                    category: 'Global Custom Medication',
                    strengths: [],
                  })
                }
                className="w-full p-3 text-left bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100/70 dark:hover:bg-sky-900/50 flex items-center justify-between gap-2 text-xs font-extrabold text-sky-800 dark:text-sky-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Use Global / Custom Medication: &ldquo;{query.trim()}&rdquo;</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-sky-600 text-white">
                  Press Enter
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

