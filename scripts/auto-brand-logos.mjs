import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const sourceLogo = path.join(publicDir, 'logo.png')

// Helper to build multi-size Windows .ico files from PNG buffers
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4) // Count

  let dataOffset = 6 + images.length * 16
  const dirEntries = []

  for (const img of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1)
    entry.writeUInt8(0, 2) // Color palette
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Planes
    entry.writeUInt16LE(32, 6) // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8)
    entry.writeUInt32LE(dataOffset, 12)
    dirEntries.push(entry)
    dataOffset += img.buffer.length
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.buffer)])
}

// Generate PWA sizes for a given branded logo
async function generatePwaSizes(sourceFile, variant) {
  console.log(`\n📦 Generating PWA icons for variant: [${variant}]...`)

  // 1. icon-192
  const icon192Path = path.join(publicDir, `icon-${variant}-192.png`)
  await sharp(sourceFile)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(icon192Path)
  console.log(`  ✅ ${path.basename(icon192Path)} (192x192)`)

  // 2. icon-512
  const icon512Path = path.join(publicDir, `icon-${variant}-512.png`)
  await sharp(sourceFile)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(icon512Path)
  console.log(`  ✅ ${path.basename(icon512Path)} (512x512)`)

  // 3. apple-touch-icon
  const appleTouchPath = path.join(publicDir, `apple-touch-icon-${variant}.png`)
  await sharp(sourceFile)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(appleTouchPath)
  console.log(`  ✅ ${path.basename(appleTouchPath)} (180x180)`)

  // 4. favicon.png (32x32)
  const faviconPngPath = path.join(publicDir, `favicon-${variant}.png`)
  await sharp(sourceFile)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(faviconPngPath)
  console.log(`  ✅ ${path.basename(faviconPngPath)} (32x32)`)

  // 5. favicon.ico (16, 32, 48 multi-size)
  const faviconIcoPath = path.join(publicDir, `favicon-${variant}.ico`)
  const icoSizes = [16, 32, 48]
  const icoImages = []
  for (const size of icoSizes) {
    const buf = await sharp(sourceFile)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    icoImages.push({ size, buffer: buf })
  }
  const icoBuffer = buildIco(icoImages)
  fs.writeFileSync(faviconIcoPath, icoBuffer)
  console.log(`  ✅ ${path.basename(faviconIcoPath)} (16/32/48 multi-size ICO)`)
}

async function main() {
  console.log('==================================================================')
  console.log('🎨 PROGRAMMATIC BRAND LOGO GENERATOR (SHARP & SVG COMPOSITING)')
  console.log('==================================================================\n')

  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Base logo not found at: ${sourceLogo}`)
  }

  const meta = await sharp(sourceLogo).metadata()
  console.log(`Source base logo: ${meta.width}x${meta.height}, format=${meta.format}, alpha=${meta.hasAlpha}`)

  const CANVAS_SIZE = 1024

  // Trim transparent padding from original logo to fit accurately
  const trimmedBuffer = await sharp(sourceLogo)
    .trim()
    .resize(840, 720, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const trimmedMeta = await sharp(trimmedBuffer).metadata()
  const logoTop = 50
  const logoLeft = Math.round((CANVAS_SIZE - trimmedMeta.width) / 2)

  // -------------------------------------------------------------------------
  // 1. DOCTOR / RX BRAND LOGO (Dark Teal #1B4965 + Mint Accent)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Generating Doctor Branded Logo (logo-doctor.png) ---')
  const doctorBadgeSvg = Buffer.from(`
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1B4965" />
          <stop offset="100%" stop-color="#0b2434" />
        </linearGradient>
        <filter id="docShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>
      
      <!-- Doctor Badge Pill -->
      <g filter="url(#docShadow)">
        <rect x="222" y="800" width="580" height="150" rx="75" fill="url(#docGrad)" stroke="#2EC4B6" stroke-width="8" />
        
        <!-- Medical Cross / Rx Accent Disc -->
        <circle cx="312" cy="875" r="44" fill="#2EC4B6" />
        <!-- Cross shape -->
        <rect x="306" y="847" width="12" height="56" rx="4" fill="#1B4965" />
        <rect x="284" y="869" width="56" height="12" rx="4" fill="#1B4965" />

        <!-- Doctor Text -->
        <text x="540" y="890" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" letter-spacing="4" text-anchor="middle">
          DOCTOR · RX
        </text>
      </g>
    </svg>
  `)

  const doctorLogoPath = path.join(publicDir, 'logo-doctor.png')
  await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: trimmedBuffer, top: logoTop, left: logoLeft },
      { input: doctorBadgeSvg, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(doctorLogoPath)

  console.log(`✅ Saved ${doctorLogoPath} (1024x1024 with transparent alpha)`)

  // -------------------------------------------------------------------------
  // 2. PATIENT BRAND LOGO (Mint Green #2EC4B6 + White / Dark Teal)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Generating Patient Branded Logo (logo-patient.png) ---')
  const patientBadgeSvg = Buffer.from(`
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="patGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2EC4B6" />
          <stop offset="100%" stop-color="#1ea89b" />
        </linearGradient>
        <filter id="patShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
        </filter>
      </defs>

      <!-- Patient Badge Pill -->
      <g filter="url(#patShadow)">
        <rect x="252" y="800" width="520" height="150" rx="75" fill="url(#patGrad)" stroke="#FFFFFF" stroke-width="8" />

        <!-- Heart / Care Icon Disc -->
        <circle cx="340" cy="875" r="44" fill="#FFFFFF" />
        <!-- Heart Path -->
        <path d="M340 892l-3.2-2.9C325.4 878.8 318 872.1 318 863.8c0-6.7 5.3-12 12-12 3.8 0 7.4 1.8 9.8 4.6 2.4-2.8 6-4.6 9.8-4.6 6.7 0 12 5.3 12 12 0 8.3-7.4 15-18.8 25.3l-2.8 2.9z" fill="#2EC4B6" />

        <!-- Patient Text -->
        <text x="548" y="890" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="52" font-weight="900" fill="#072233" letter-spacing="4" text-anchor="middle">
          PATIENT
        </text>
      </g>
    </svg>
  `)

  const patientLogoPath = path.join(publicDir, 'logo-patient.png')
  await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: trimmedBuffer, top: logoTop, left: logoLeft },
      { input: patientBadgeSvg, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(patientLogoPath)

  console.log(`✅ Saved ${patientLogoPath} (1024x1024 with transparent alpha)`)

  // -------------------------------------------------------------------------
  // 3. GENERATE PWA ICONS FOR BOTH DOCTOR & PATIENT
  // -------------------------------------------------------------------------
  await generatePwaSizes(doctorLogoPath, 'doctor')
  await generatePwaSizes(patientLogoPath, 'patient')

  console.log('\n🎉 ALL BRANDED LOGOS AND PWA ASSETS GENERATED SUCCESSFULLY!')
}

main().catch((err) => {
  console.error('Fatal error in auto-brand-logos:', err)
  process.exit(1)
})

