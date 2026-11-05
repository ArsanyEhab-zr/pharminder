import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appMode = env.VITE_APP_MODE || process.env.VITE_APP_MODE

  const isDoctor = appMode === 'pharmacist'
  const isPatient = appMode === 'patient'

  const pwaName = isDoctor
    ? 'Pharminder Doctor — Clinical Safety & Prescribing'
    : isPatient
      ? 'Pharminder Patient — Medication Companion & Health Intake'
      : 'pharminder — Clinical & Patient Companion PWA'

  const pwaShortName = isDoctor
    ? 'Pharminder Rx'
    : isPatient
      ? 'Pharminder'
      : 'pharminder'

  const pwaDescription = isDoctor
    ? 'Doctor & Clinical Pharmacist Prescribing, Drug-Disease Contraindication Screening & Compliance Monitoring'
    : isPatient
      ? 'Patient Medication Companion, Health Intake Form & Daily Dose Reminders'
      : 'Role-Locked Clinical Prescribing, Drug-Disease Contraindication Screening & Patient Medication Reminder PWA'

  const pwaThemeColor = isDoctor
    ? '#1B4965'
    : isPatient
      ? '#2EC4B6'
      : '#1B4965'

  const pwaIcon192 = isDoctor
    ? '/icon-doctor-192.png'
    : isPatient
      ? '/icon-patient-192.png'
      : '/icon-192x192.png'

  const pwaIcon512 = isDoctor
    ? '/icon-doctor-512.png'
    : isPatient
      ? '/icon-patient-512.png'
      : '/icon-512x512.png'

  return {
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
    },
    plugins: [
      react(),
      tailwindcss(),
      // Custom plugin to dynamically inject branded assets and meta tags into index.html
      {
        name: 'html-transform-branding',
        transformIndexHtml(html) {
          if (isDoctor) {
            return html
              .replace(/href="\/favicon\.ico"/g, 'href="/favicon-doctor.ico"')
              .replace(/href="\/icon-192x192\.png"/g, 'href="/icon-doctor-192.png"')
              .replace(/href="\/icon-512x512\.png"/g, 'href="/icon-doctor-512.png"')
              .replace(/href="\/apple-touch-icon\.png"/g, 'href="/apple-touch-icon-doctor.png"')
              .replace(/<title>.*<\/title>/, '<title>Pharminder Doctor — Clinical Safety & Prescribing</title>')
              .replace(/content="pharminder"/g, 'content="Pharminder Doctor"')
              .replace(/content="#1B4965"/g, 'content="#1B4965"')
          }
          if (isPatient) {
            return html
              .replace(/href="\/favicon\.ico"/g, 'href="/favicon-patient.ico"')
              .replace(/href="\/icon-192x192\.png"/g, 'href="/icon-patient-192.png"')
              .replace(/href="\/icon-512x512\.png"/g, 'href="/icon-patient-512.png"')
              .replace(/href="\/apple-touch-icon\.png"/g, 'href="/apple-touch-icon-patient.png"')
              .replace(/<title>.*<\/title>/, '<title>Pharminder Patient — Medication Companion & Intake</title>')
              .replace(/content="pharminder"/g, 'content="Pharminder Patient"')
              .replace(/content="#1B4965"/g, 'content="#2EC4B6"')
          }
          return html
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-doctor.ico',
          'favicon-patient.ico',
          'favicon-doctor.png',
          'favicon-patient.png',
          'apple-touch-icon.png',
          'apple-touch-icon-doctor.png',
          'apple-touch-icon-patient.png',
          'icon-192x192.png',
          'icon-512x512.png',
          'icon-doctor-192.png',
          'icon-doctor-512.png',
          'icon-patient-192.png',
          'icon-patient-512.png',
          'logo.png',
          'logo-doctor.png',
          'logo-patient.png',
        ],
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        manifest: {
          id: '/',
          name: pwaName,
          short_name: pwaShortName,
          description: pwaDescription,
          theme_color: pwaThemeColor,
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['medical', 'health', 'lifestyle'],
          icons: [
            {
              src: pwaIcon192,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: pwaIcon512,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: true,
          navigateFallback: 'index.html',
        },
      }),
    ],
  }
})
