import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Sparkles, Tag } from 'lucide-react'

/**
 * Dynamic Creatable Multi-Select Tag Input
 * Allows patients to type ANY disease, symptom, or allergy in the world,
 * press `Enter` (or comma `,`), and add it as an interactive clinical chip/tag
 * alongside quick-select preset buttons.
 */
export default function DynamicTagInput({
  tags = [],
  onChangeTags,
  presets = [],
  globalSuggestions = [],
  placeholder = 'Type any condition and press Enter…',
  accentColor = 'rose', // 'rose' | 'amber' | 'teal'
  badgePrefix = '',
  label = '',
  helperText = 'Type anything and press Enter to add as a clinical tag',
}) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const colorStyles = {
    rose: {
      chipActive:
        'bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-500/20',
      chipTag:
        'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
      presetIdle:
        'bg-slate-50 dark:bg-dark-teal-950/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-teal-800 hover:border-rose-300',
      button: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    amber: {
      chipActive:
        'bg-amber-500 text-slate-950 border-amber-500 shadow-xs shadow-amber-500/20',
      chipTag:
        'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
      presetIdle:
        'bg-slate-50 dark:bg-dark-teal-950/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-teal-800 hover:border-amber-400',
      button: 'bg-amber-500 hover:bg-amber-600 text-slate-950',
    },
    teal: {
      chipActive:
        'bg-brand-teal text-white border-brand-teal dark:bg-brand-mint dark:text-dark-teal-950 shadow-xs',
      chipTag:
        'bg-mint-50 dark:bg-mint-950/80 text-brand-teal dark:text-mint-200 border-mint-200 dark:border-mint-800',
      presetIdle:
        'bg-slate-50 dark:bg-dark-teal-950/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-teal-800 hover:border-brand-mint',
      button: 'bg-brand-teal hover:bg-dark-teal-900 text-white',
    },
  }

  const theme = colorStyles[accentColor] || colorStyles.teal

  const allSuggestions = useMemo(() => {
    const merged = Array.from(new Set([...presets, ...globalSuggestions]))
    if (!inputValue.trim()) return []
    const q = inputValue.trim().toLowerCase()
    return merged
      .filter(
        (item) =>
          item.toLowerCase().includes(q) &&
          !tags.some((t) => t.toLowerCase() === item.toLowerCase())
      )
      .slice(0, 6)
  }, [inputValue, presets, globalSuggestions, tags])

  const addTag = (rawTag) => {
    const cleaned = String(rawTag || '')
      .replace(/,/g, '')
      .trim()
    if (!cleaned) return

    const exists = tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())
    if (!exists) {
      onChangeTags([...tags, cleaned])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove) => {
    onChangeTags(tags.filter((t) => t !== tagToRemove))
  }

  const togglePreset = (presetItem) => {
    if (tags.includes(presetItem)) {
      removeTag(presetItem)
    } else {
      onChangeTags([...tags, presetItem])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-1">
          <label className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-brand-mint" />
            <span>{label}</span>
          </label>
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-mint" />
            {helperText}
          </span>
        </div>
      )}

      {/* Creatable Multi-Select Tag Box */}
      <div className="relative">
        <div
          className={`p-2.5 rounded-2xl border bg-slate-50/90 dark:bg-dark-teal-950/90 transition-all ${
            isFocused
              ? 'border-brand-mint ring-2 ring-brand-mint/30'
              : 'border-slate-200 dark:border-dark-teal-800'
          }`}
        >
          {/* Active Clinical Tags Inside the Box */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <AnimatePresence initial={false}>
                {tags.map((tag) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border ${theme.chipTag}`}
                  >
                    <span>
                      {badgePrefix}
                      {tag}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={inputValue}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 180)}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-w-0 min-h-[42px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0d2232] text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200/70 dark:border-dark-teal-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${theme.button}`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Tag</span>
            </button>
          </div>
        </div>

        {/* Live Filtered Global Suggestions Dropdown */}
        {isFocused && (allSuggestions.length > 0 || inputValue.trim().length > 1) && (
          <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-2xl bg-white dark:bg-[#0b1f2e] border border-slate-200 dark:border-dark-teal-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-dark-teal-800/60">
            {allSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(suggestion)
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-mint-50 dark:hover:bg-dark-teal-900 flex items-center justify-between cursor-pointer"
              >
                <span>{suggestion}</span>
                <span className="text-[10px] font-extrabold text-brand-mint">
                  + Add Clinical Tag
                </span>
              </button>
            ))}

            {inputValue.trim() &&
              !allSuggestions.some(
                (s) => s.toLowerCase() === inputValue.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addTag(inputValue)
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-extrabold text-brand-teal dark:text-mint-300 bg-mint-50/60 dark:bg-dark-teal-950 hover:bg-mint-100/70 flex items-center justify-between cursor-pointer"
                >
                  <span>
                    + Create Custom Tag: &ldquo;{inputValue.trim()}&rdquo;
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-brand-mint text-dark-teal-950 font-black">
                    Enter ↵
                  </span>
                </button>
              )}
          </div>
        )}
      </div>

      {/* Quick-Select Preset Chips */}
      {presets.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            Quick-Select Common Presets (or type any custom tag above):
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const isSelected = tags.includes(preset)
              return (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  key={preset}
                  type="button"
                  onClick={() => togglePreset(preset)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected ? theme.chipActive : theme.presetIdle
                  }`}
                >
                  <span>{isSelected ? '✓' : '+'}</span>
                  <span>{preset}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

