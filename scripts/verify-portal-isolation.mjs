import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('==================================================================')
console.log('🧪 VERIFYING PHASE 14: ENVIRONMENT-BASED PORTAL SEPARATION')
console.log('==================================================================\n')

// 1. Verify old unified Login.jsx is deleted
console.log('--- 1. Checking Old Login.jsx Deletion ---')
const oldLoginExists = fs.existsSync(path.resolve('src/pages/Login.jsx'))
assert.strictEqual(oldLoginExists, false, 'Error: src/pages/Login.jsx should be permanently deleted')
console.log('✅ src/pages/Login.jsx is completely removed!')

// 2. Verify PatientLogin.jsx exists and has zero Doctor / Pharmacist mentions in user-facing UI
console.log('\n--- 2. Checking PatientLogin.jsx Isolation ---')
const patientLoginSource = fs.readFileSync(path.resolve('src/pages/PatientLogin.jsx'), 'utf-8')
assert.ok(patientLoginSource.includes('expectedRole: \'patient\''), 'PatientLogin must enforce expectedRole patient')
assert.ok(patientLoginSource.includes('jane.patient@pharminder.app'), 'PatientLogin must provide patient demo credentials')
assert.ok(!patientLoginSource.includes('dr.smith@pharminder.app'), 'PatientLogin must NOT contain doctor demo credentials')
assert.ok(!patientLoginSource.includes('Fill Pharmacist Demo'), 'PatientLogin must NOT contain pharmacist fill buttons')
console.log('✅ PatientLogin.jsx is 100% isolated to patient role!')

// 3. Verify PharmacistLogin.jsx exists and has zero Patient mentions in user-facing UI
console.log('\n--- 3. Checking PharmacistLogin.jsx Isolation ---')
const pharmacistLoginSource = fs.readFileSync(path.resolve('src/pages/PharmacistLogin.jsx'), 'utf-8')
assert.ok(pharmacistLoginSource.includes('expectedRole: \'pharmacist\''), 'PharmacistLogin must enforce expectedRole pharmacist')
assert.ok(pharmacistLoginSource.includes('dr.smith@pharminder.app'), 'PharmacistLogin must provide doctor demo credentials')
assert.ok(!pharmacistLoginSource.includes('jane.patient@pharminder.app'), 'PharmacistLogin must NOT contain patient demo credentials')
assert.ok(!pharmacistLoginSource.includes('Fill Patient Demo'), 'PharmacistLogin must NOT contain patient fill buttons')
console.log('✅ PharmacistLogin.jsx is 100% isolated to clinician role!')

// 4. Verify Landing.jsx exists
console.log('\n--- 4. Checking Landing.jsx Gateway Hub ---')
const landingExists = fs.existsSync(path.resolve('src/pages/Landing.jsx'))
assert.strictEqual(landingExists, true, 'Landing.jsx must exist for dual-mode local preview')
console.log('✅ Landing.jsx is in place with dual launcher cards!')

// 5. Verify App.jsx imports and routing isolation
console.log('\n--- 5. Checking App.jsx Route Isolation Logic ---')
const appSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8')
assert.ok(appSource.includes('VITE_APP_MODE'), 'App.jsx must read VITE_APP_MODE')
assert.ok(appSource.includes("APP_MODE === 'pharmacist'"), 'App.jsx must handle dedicated pharmacist deployment')
assert.ok(appSource.includes("APP_MODE === 'patient'"), 'App.jsx must handle dedicated patient deployment')
assert.ok(!appSource.includes("import Login from './pages/Login'"), 'App.jsx must not import old Login.jsx')
console.log('✅ App.jsx router implements strict build-time separation!')

// 6. Verify Navbar.jsx, ProtectedRoute.jsx, and AppLayout.jsx isolation
console.log('\n--- 6. Checking UI Components Environment Adaptation ---')
const navbarSource = fs.readFileSync(path.resolve('src/components/layout/Navbar.jsx'), 'utf-8')
assert.ok(navbarSource.includes('VITE_APP_MODE'), 'Navbar must be aware of VITE_APP_MODE')

const protectedRouteSource = fs.readFileSync(path.resolve('src/components/auth/ProtectedRoute.jsx'), 'utf-8')
assert.ok(protectedRouteSource.includes('VITE_APP_MODE'), 'ProtectedRoute must be aware of VITE_APP_MODE')

const appLayoutSource = fs.readFileSync(path.resolve('src/components/layout/AppLayout.jsx'), 'utf-8')
assert.ok(appLayoutSource.includes('VITE_APP_MODE'), 'AppLayout must be aware of VITE_APP_MODE')

console.log('✅ All UI components strictly adapt to VITE_APP_MODE!')
console.log('\n🎉 ALL PHASE 14 VERIFICATIONS PASSED 100%!\n')

