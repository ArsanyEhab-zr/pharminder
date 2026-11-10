import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop Component
 * Listens for react-router pathname changes and instantly resets window scroll
 * position to (0, 0), ensuring mobile & desktop SPAs never remain stuck at the bottom.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Instant scroll to the absolute top of the viewport
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  }, [pathname])

  return null
}

