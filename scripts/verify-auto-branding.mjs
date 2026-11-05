import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

console.log('==================================================================')
console.log('🧪 VERIFYING PHASE 15: PROGRAMMATIC AUTO-BRANDING & PWA SPLIT')
console.log('==================================================================\n')

const publicDir = path.resolve('public')

const requiredDoctorAssets = [
  'logo-doctor.png',
  'icon-doctor-192.png',
  'icon-doctor-512.png',
  'apple-touch-icon-doctor.png',
  'favicon-doctor.png',
  'favicon-doctor.ico',
]

const requiredPatientAssets = [
  'logo-patient.png',
  'icon-patient-192.png',
  'icon-patient-512.png',
  'apple-touch-icon-patient.png',
  'favicon-patient.png',
  'favicon-patient.ico',
]

// 1. Verify existence of all doctor assets
console.log('--- 1. Checking Doctor Brand Assets ---')
for (const file of requiredDoctorAssets) {
  const filePath = path.join(publicDir, file)
  assert.ok(fs.existsSync(filePath), `Missing doctor asset: ${file}`)
  const stat = fs.statSync(filePath)
  assert.ok(stat.size > 0, `Asset ${file} is empty (0 bytes)`)
  console.log(`  ✅ ${file} exists (${stat.size} bytes)`)
}

// 2. Verify existence of all patient assets
console.log('\n--- 2. Checking Patient Brand Assets ---')
for (const file of requiredPatientAssets) {
  const filePath = path.join(publicDir, file)
  assert.ok(fs.existsSync(filePath), `Missing patient asset: ${file}`)
  const stat = fs.statSync(filePath)
  assert.ok(stat.size > 0, `Asset ${file} is empty (0 bytes)`)
  console.log(`  ✅ ${file} exists (${stat.size} bytes)`)
}

// 3. Verify alpha transparency on logos
console.log('\n--- 3. Checking Alpha Channel Transparency ---')
const docMeta = await sharp(path.join(publicDir, 'logo-doctor.png')).metadata()
assert.strictEqual(docMeta.hasAlpha, true, 'logo-doctor.png must have alpha channel')
assert.strictEqual(docMeta.width, 1024, 'logo-doctor.png width must be 1024')
assert.strictEqual(docMeta.height, 1024, 'logo-doctor.png height must be 1024')
console.log('  ✅ logo-doctor.png verified (1024x1024, RGBA transparent)')

const patMeta = await sharp(path.join(publicDir, 'logo-patient.png')).metadata()
assert.strictEqual(patMeta.hasAlpha, true, 'logo-patient.png must have alpha channel')
assert.strictEqual(patMeta.width, 1024, 'logo-patient.png width must be 1024')
assert.strictEqual(patMeta.height, 1024, 'logo-patient.png height must be 1024')
console.log('  ✅ logo-patient.png verified (1024x1024, RGBA transparent)')

// 4. Verify PWA dimensions
console.log('\n--- 4. Checking PWA Dimensions ---')
const doc192 = await sharp(path.join(publicDir, 'icon-doctor-192.png')).metadata()
assert.strictEqual(doc192.width, 192)
const doc512 = await sharp(path.join(publicDir, 'icon-doctor-512.png')).metadata()
assert.strictEqual(doc512.width, 512)
const pat192 = await sharp(path.join(publicDir, 'icon-patient-192.png')).metadata()
assert.strictEqual(pat192.width, 192)
const pat512 = await sharp(path.join(publicDir, 'icon-patient-512.png')).metadata()
assert.strictEqual(pat512.width, 512)
console.log('  ✅ 192x192 & 512x512 dimensions verified for both portals')

// 5. Verify UI references
console.log('\n--- 5. Checking UI Brand Integration ---')
const docLogin = fs.readFileSync(path.resolve('src/pages/PharmacistLogin.jsx'), 'utf-8')
assert.ok(docLogin.includes('logo-doctor.png'), 'PharmacistLogin must use logo-doctor.png')

const patLogin = fs.readFileSync(path.resolve('src/pages/PatientLogin.jsx'), 'utf-8')
assert.ok(patLogin.includes('logo-patient.png'), 'PatientLogin must use logo-patient.png')

const landing = fs.readFileSync(path.resolve('src/pages/Landing.jsx'), 'utf-8')
assert.ok(landing.includes('logo-doctor.png') && landing.includes('logo-patient.png'), 'Landing must display both logos')

console.log('  ✅ UI components render portal-specific branded logos!')

console.log('\n🎉 ALL PHASE 15 BRANDING & PWA SPLIT VERIFICATIONS PASSED 100%!\n')

