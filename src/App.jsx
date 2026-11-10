import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AppLayout from './components/layout/AppLayout'
import PageWrapper from './components/layout/PageWrapper'
import PharmacistLogin from './pages/PharmacistLogin'
import PatientLogin from './pages/PatientLogin'
import Landing from './pages/Landing'
import PharmacistDashboard from './pages/PharmacistDashboard'
import PatientDashboard from './pages/PatientDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { applyDocumentDirection } from './i18n'

// Read the build-time environment variable to separate Vercel deployments
const APP_MODE = import.meta.env.VITE_APP_MODE // 'patient' | 'pharmacist' | undefined

// Pharmacist Portal Authentication Route
function PharmacistLoginRoute() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && role === 'pharmacist') {
      navigate('/pharmacist', { replace: true })
    }
  }, [user, role, navigate])

  return (
    <PageWrapper>
      <PharmacistLogin 
        onSuccess={() => {
          navigate('/pharmacist', { replace: true })
        }} 
      />
    </PageWrapper>
  )
}

// Patient Portal Authentication Route
function PatientLoginRoute() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && role === 'patient') {
      navigate('/patient', { replace: true })
    }
  }, [user, role, navigate])

  return (
    <PageWrapper>
      <PatientLogin 
        onSuccess={() => {
          navigate('/patient', { replace: true })
        }} 
      />
    </PageWrapper>
  )
}

// Dual-Mode Smart Login Route (used when APP_MODE is undefined)
function SmartLoginRoute() {
  const { user, role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const defaultRole = location.state?.defaultRole || (role === 'pharmacist' ? 'pharmacist' : 'patient')

  useEffect(() => {
    if (user && role) {
      if (role === 'pharmacist') {
        navigate('/pharmacist', { replace: true })
      } else {
        navigate('/patient', { replace: true })
      }
    }
  }, [user, role, navigate])

  return (
    <PageWrapper>
      {defaultRole === 'pharmacist' ? (
        <PharmacistLogin 
          onSuccess={() => navigate('/pharmacist', { replace: true })} 
        />
      ) : (
        <PatientLogin 
          onSuccess={() => navigate('/patient', { replace: true })} 
        />
      )}
    </PageWrapper>
  )
}

export default function App() {
  const location = useLocation()
  const { user, role } = useAuth()
  const { i18n } = useTranslation()

  useEffect(() => {
    applyDocumentDirection(i18n.language)
  }, [i18n.language])

  // =========================================================================
  // 1. DEDICATED PHARMACIST / DOCTOR DEPLOYMENT (VITE_APP_MODE === 'pharmacist')
  // Patient routes are completely excluded. Users only ever see the Clinical Portal.
  // =========================================================================
  if (APP_MODE === 'pharmacist') {
    return (
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Root Route: If authenticated, open Dashboard; otherwise PharmacistLogin */}
            <Route 
              path="/" 
              element={
                user && role === 'pharmacist' ? (
                  <Navigate to="/pharmacist" replace />
                ) : (
                  <PharmacistLoginRoute />
                )
              } 
            />

            {/* Direct Login Route */}
            <Route path="/login" element={<PharmacistLoginRoute />} />

            {/* Clinical Command Center Dashboard */}
            <Route 
              path="/pharmacist" 
              element={
                <ProtectedRoute allowedRoles={['pharmacist']}>
                  <PageWrapper>
                    <PharmacistDashboard />
                  </PageWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Strict Isolation Fallback: Any unknown route redirects to /pharmacist or / */}
            <Route 
              path="*" 
              element={<Navigate to={user && role === 'pharmacist' ? '/pharmacist' : '/'} replace />} 
            />
          </Routes>
        </AnimatePresence>
      </AppLayout>
    )
  }

  // =========================================================================
  // 2. DEDICATED PATIENT DEPLOYMENT (VITE_APP_MODE === 'patient')
  // Pharmacist routes are completely excluded. Users only ever see the Patient Portal.
  // =========================================================================
  if (APP_MODE === 'patient') {
    return (
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Root Route: If authenticated, open Dashboard; otherwise PatientLogin */}
            <Route 
              path="/" 
              element={
                user && role === 'patient' ? (
                  <Navigate to="/patient" replace />
                ) : (
                  <PatientLoginRoute />
                )
              } 
            />

            {/* Direct Login Route */}
            <Route path="/login" element={<PatientLoginRoute />} />

            {/* Patient Medication & Health Dashboard */}
            <Route 
              path="/patient" 
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PageWrapper>
                    <PatientDashboard />
                  </PageWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Strict Isolation Fallback: Any unknown route redirects to /patient or / */}
            <Route 
              path="*" 
              element={<Navigate to={user && role === 'patient' ? '/patient' : '/'} replace />} 
            />
          </Routes>
        </AnimatePresence>
      </AppLayout>
    )
  }

  // =========================================================================
  // 3. LOCAL DEVELOPMENT / DUAL PORTAL MODE (VITE_APP_MODE is undefined)
  // Provides Landing page selector at `/` and supports both portals for easy testing.
  // =========================================================================
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Root Gateway Hub */}
          <Route path="/" element={<Landing />} />

          {/* Unified & Dedicated Login Endpoints */}
          <Route path="/login" element={<SmartLoginRoute />} />
          <Route path="/login/patient" element={<PatientLoginRoute />} />
          <Route path="/login/pharmacist" element={<PharmacistLoginRoute />} />

          {/* Patient Portal (/patient) */}
          <Route 
            path="/patient" 
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageWrapper>
                  <PatientDashboard />
                </PageWrapper>
              </ProtectedRoute>
            } 
          />

          {/* Doctor / Pharmacist Portal (/pharmacist) */}
          <Route 
            path="/pharmacist" 
            element={
              <ProtectedRoute allowedRoles={['pharmacist']}>
                <PageWrapper>
                  <PharmacistDashboard />
                </PageWrapper>
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  )
}
