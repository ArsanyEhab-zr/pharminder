import React from 'react'
import { motion } from 'framer-motion'

export default function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.992 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 26,
        mass: 0.85,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

