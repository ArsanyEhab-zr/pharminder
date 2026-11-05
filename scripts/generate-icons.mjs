import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const sourceLogo = path.join(publicDir, 'logo.png')

async function generateIcons() {
  console.log('--- Generating Brand Icons from public/logo.png ---')

  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Source logo not found at ${sourceLogo}`)
  }

  const meta = await sharp(sourceLogo).metadata()
  console.log(`Source Logo Metadata: ${meta.width}x${meta.height}, format: ${meta.format}, channels: ${meta.channels}, alpha: ${meta.hasAlpha}`)

  // 1. Generate icon-192x192.png (PWA Standard)
  const icon192Path = path.join(publicDir, 'icon-192x192.png')
  await sharp(sourceLogo)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(icon192Path)
  console.log('✅ Generated public/icon-192x192.png (192x192 transparent)')

  // 2. Generate icon-512x512.png (PWA Splash Screen & Store)
  const icon512Path = path.join(publicDir, 'icon-512x512.png')
  await sharp(sourceLogo)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(icon512Path)
  console.log('✅ Generated public/icon-512x512.png (512x512 transparent)')

  // 3. Generate apple-touch-icon.png (iOS Home Screen & Safari)
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png')
  await sharp(sourceLogo)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(appleTouchPath)
  console.log('✅ Generated public/apple-touch-icon.png (180x180 transparent)')

  // 4. Generate favicon.ico (Multi-size 16x16, 32x32, 48x48 PNG-embedded ICO)
  const faviconIcoPath = path.join(publicDir, 'favicon.ico')
  const icoSizes = [16, 32, 48]
  const icoImages = []

  for (const size of icoSizes) {
    const pngBuffer = await sharp(sourceLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer()
    icoImages.push({ size, buffer: pngBuffer })
  }

  // Build binary ICO structure
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type: 1 = ICO
  header.writeUInt16LE(icoImages.length, 4) // Number of images

  let dataOffset = 6 + icoImages.length * 16
  const dirEntries = []

  for (const img of icoImages) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0) // Width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1) // Height
    entry.writeUInt8(0, 2) // Color palette (0 = no palette)
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Color planes
    entry.writeUInt16LE(32, 6) // Bits per pixel (32 = RGBA)
    entry.writeUInt32LE(img.buffer.length, 8) // Image data size
    entry.writeUInt32LE(dataOffset, 12) // Data offset
    dirEntries.push(entry)
    dataOffset += img.buffer.length
  }

  const finalIcoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...icoImages.map((img) => img.buffer),
  ])
  fs.writeFileSync(faviconIcoPath, finalIcoBuffer)
  console.log('✅ Generated public/favicon.ico (Multi-size 16/32/48 transparent ICO)')

  // 5. Remove old placeholder SVGs and PNGs
  const filesToDelete = [
    'favicon.svg',
    'pwa-192x192.svg',
    'pwa-512x512.svg',
    'apple-touch-icon.svg',
    'icons.svg',
    'pwa-192x192.png',
    'pwa-512x512.png',
  ]

  for (const file of filesToDelete) {
    const target = path.join(publicDir, file)
    if (fs.existsSync(target)) {
      fs.unlinkSync(target)
      console.log(`🗑️  Deleted old placeholder: public/${file}`)
    }
  }

  console.log('\n🎉 All brand assets successfully generated with full alpha transparency preserved!')
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})

