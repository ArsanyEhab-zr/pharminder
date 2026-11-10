import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  searchGlobalMedications,
  resolveDrugRxCui,
  extractRxCui,
} from '../../utils/globalDrugApi'
import {
  Search,
  Pill,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  X,
  Hash,
  AlertCircle,
} from 'lucide-react'

/**
 * Reusable Async Global Medication Autocomplete
 * Exclusively powered by the live NIH NLM RxTerms API:
 * https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=
 *
 * Fetches real Concept Unique Identifiers (RxCUI) alongside drug names and strengths.
 */
export default function GlobalDrugAutocomplete({
  onSelectMedication,
  selectedMedicationName = '',
  selectedMedicationRxcui = '',
  placeholder = 'Search any medication via live NIH RxTerms (e.g., Warfarin, Aspirin, Apixaban, Metformin)…',
  label = 'Global Medication Search (NIH RxTerms API)',
  compact = false,
  clearOnSelect = false,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
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
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      setApiError('')
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setApiError('')
        const items = await searchGlobalMedications(trimmed, 12)
        if (!isCancelled) {
          setResults(items)
          setActiveIndex(0)
        }
      } catch (err) {
        console.error('Error searching NIH RxTerms API:', err)
        if (!isCancelled) {
          setApiError('Unable to reach NIH RxTerms API. Check your connection.')
          setResults([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }, 220)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const handleChooseItem = async (item, chosenStrength = null) => {
    const baseCleanName = item.cleanName || item.baseName || item.name
    const strengthToUse =
      chosenStrength ||
      (item.strengths && item.strengths.length > 0 ? item.strengths[0] : '')

    const finalDisplayName = strengthToUse
      ? `${baseCleanName} (${strengthToUse})`
      : baseCleanName

    // Pick the exact RxCUI for the chosen strength, or fallback to primary/ingredient RxCUI
    let specificRxcui =
      (chosenStrength && item.strengthToRxcuiMap?.[chosenStrength.trim()]) ||
      item.rxcui ||
      item.ingredientRxcui ||
      extractRxCui(item)

    let ingredientRxcui = item.ingredientRxcui || specificRxcui

    if (!specificRxcui) {
      setLoading(true)
      try {
        const resolved = await resolveDrugRxCui(baseCleanName)
        specificRxcui = resolved.rxcui
        ingredientRxcui = resolved.ingredientRxcui || resolved.rxcui
      } finally {
        setLoading(false)
      }
    }

    if (onSelectMedication) {
      onSelectMedication({
        ...item,
        name: finalDisplayName,
        cleanName: baseCleanName,
        rxcui: specificRxcui || null,
        ingredientRxcui: ingredientRxcui || specificRxcui || null,
        dosage_form: strengthToUse || item.dosage_form || 'Oral Tablet / Capsule',
        category: item.category || 'NIH RxTerms Formulary',
        isGlobalApi: true,
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
      } else if (query.trim().length >= 2) {
        handleChooseItem({
          id: `rxterms-custom-${query.trim().toLowerCase()}`,
          name: query.trim(),
          cleanName: query.trim(),
          dosage_form: 'Oral Tablet / Capsule',
          category: 'NIH RxNav Resolved Medication',
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
              setResults([])
              setIsOpen(true)
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
            aria-label="Clear medication search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Selected Global Medication Pill Indicator with RxCUI */}
      {!clearOnSelect && selectedMedicationName && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-mint-50/80 dark:bg-mint-950/50 border border-mint-200/80 dark:border-mint-800/70 text-xs min-w-0">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 min-w-0 flex-1">
            <Pill className="w-3.5 h-3.5 text-brand-mint shrink-0" />
            <span className="shrink-0">Active Selection:</span>
            <span className="font-black text-brand-teal dark:text-mint-300 truncate">
              {selectedMedicationName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {selectedMedicationRxcui && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-brand-teal text-white">
                <Hash className="w-2.5 h-2.5 text-brand-mint" />
                RxCUI: {selectedMedicationRxcui}
              </span>
            )}
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200">
              NIH RxTerms Live
            </span>
          </div>
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
                {query.trim().length >= 2
                  ? `Live NIH RxTerms Results for "${query.trim()}"`
                  : 'Type 2+ characters to query Live NIH RxTerms API'}
              </span>
              <span>RxCUI Indexed</span>
            </div>

            {query.trim().length < 2 && (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                Start typing any drug name (e.g., <strong>Warfarin</strong>, <strong>Aspirin</strong>, <strong>Ibuprofen</strong>, <strong>Clopidogrel</strong>, <strong>Omeprazole</strong>, <strong>Sildenafil</strong>) to fetch live NIH RxTerms formulations &amp; RxCUI codes.
              </div>
            )}

            {apiError && (
              <div className="p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {query.trim().length >= 2 && !loading && results.length === 0 && !apiError && (
              <div className="p-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                No exact NIH RxTerms match for &ldquo;{query.trim()}&rdquo;. Press Enter below to resolve RxCUI via NIH RxNav.
              </div>
            )}

            {results.map((item, idx) => {
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
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                        <Globe className="w-4 h-4" />
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

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {item.rxcui && (
                        <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-brand-teal text-white">
                          RxCUI: {item.rxcui}
                        </span>
                      )}
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                        NIH RxTerms
                      </span>
                    </div>
                  </div>

                  {/* Clickable NIH RxTerms Dosage Strengths with specific RxCUIs */}
                  {item.strengths && item.strengths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-9">
                      <span className="text-[10px] font-bold text-slate-400">
                        Strengths:
                      </span>
                      {item.strengths.slice(0, 6).map((str) => {
                        const strRxcui = item.strengthToRxcuiMap?.[str.trim()]
                        return (
                          <button
                            key={str}
                            type="button"
                            onClick={() => handleChooseItem(item, str)}
                            title={strRxcui ? `RxCUI: ${strRxcui}` : undefined}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-dark-teal-950 border border-slate-200 dark:border-dark-teal-700 text-slate-700 dark:text-slate-200 hover:border-brand-mint hover:text-brand-teal dark:hover:text-mint-300 transition-colors cursor-pointer"
                          >
                            {str}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Resolve via NIH RxNav if user typed a custom drug string */}
            {query.trim().length > 1 && (
              <button
                type="button"
                onClick={() =>
                  handleChooseItem({
                    id: `rxterms-custom-${query.trim().toLowerCase()}`,
                    name: query.trim(),
                    cleanName: query.trim(),
                    dosage_form: 'Oral Tablet / Capsule',
                    category: 'NIH RxNav Resolved Medication',
                    strengths: [],
                  })
                }
                className="w-full p-3 text-left bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100/70 dark:hover:bg-sky-900/50 flex items-center justify-between gap-2 text-xs font-extrabold text-sky-800 dark:text-sky-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Resolve RxCUI via NIH RxNav: &ldquo;{query.trim()}&rdquo;</span>
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
