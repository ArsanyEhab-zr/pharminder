import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, HelpCircle } from 'lucide-react'

/**
 * Reusable, Accessible Tooltip Component
 * Supports desktop hover/focus and mobile touch-to-toggle with smooth spring animation.
 */
export default function Tooltip({
  text,
  children,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  icon = 'info', // 'info' | 'help' | 'none'
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef(null)

  // Close tooltip on outside click (for mobile touch interactions)
  useEffect(() => {
    if (!isVisible) return

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsVisible(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [isVisible])

  if (!text) return children || null

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-dark-teal-950 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-dark-teal-950 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-dark-teal-950 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-dark-teal-950 border-y-transparent border-l-transparent',
  }

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsVisible((prev) => !prev)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              e.preventDefault()
              setIsVisible((prev) => !prev)
            }
          }}
          className="cursor-help inline-flex items-center"
        >
          {children}
        </span>
      ) : (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsVisible((prev) => !prev)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              e.preventDefault()
              setIsVisible((prev) => !prev)
            }
          }}
          className="p-1 rounded-full text-slate-400 hover:text-brand-mint focus:text-brand-mint focus:outline-none transition-colors cursor-help inline-flex items-center justify-center select-none"
          aria-label="More information"
        >
          {icon === 'help' ? (
            <HelpCircle className="w-3.5 h-3.5" />
          ) : (
            <Info className="w-3.5 h-3.5" />
          )}
        </span>
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, scale: 0.94, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 ${positionStyles[position] || positionStyles.top} pointer-events-none w-max max-w-xs sm:max-w-sm`}
          >
            <div className="relative px-3.5 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-[#07131d]/95 text-white border border-slate-700/80 dark:border-dark-teal-700/80 shadow-2xl backdrop-blur-md text-xs font-semibold leading-relaxed text-center sm:text-left">
              {text}
              <div
                className={`absolute w-0 h-0 border-4 pointer-events-none ${arrowStyles[position] || arrowStyles.top}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

