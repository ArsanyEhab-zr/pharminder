import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslations from './locales/en.json'
import arTranslations from './locales/ar.json'

const STORAGE_KEY = 'pharminder_language'

// Detect stored language or fallback to 'en'
const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ar' || saved === 'en') return saved
    // Fallback to browser language if Arabic
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('ar')) {
      return 'ar'
    }
  } catch {
    // Ignore storage restrictions
  }
  return 'en'
}

const initialLang = getInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })

// Sync HTML document direction (RTL/LTR) and lang attribute
export const applyDocumentDirection = (lng) => {
  if (typeof document === 'undefined') return
  const isRtl = lng === 'ar'
  document.documentElement.lang = lng
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr'

  if (isRtl) {
    document.documentElement.classList.add('rtl-mode')
  } else {
    document.documentElement.classList.remove('rtl-mode')
  }
}

// Global language switcher function
export const changeAppLanguage = (lng) => {
  const targetLang = lng === 'ar' ? 'ar' : 'en'
  i18n.changeLanguage(targetLang)
  try {
    localStorage.setItem(STORAGE_KEY, targetLang)
  } catch {
    // Ignore storage restrictions
  }
  applyDocumentDirection(targetLang)
}

// Apply immediately on initialization
applyDocumentDirection(initialLang)

export default i18n
