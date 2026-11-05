import fs from 'fs'
import zlib from 'zlib'

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff]
  }
  return (c ^ -1) >>> 0
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  const combined = Buffer.concat([typeBuf, data])
  crcBuf.writeUInt32BE(crc32(combined), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createMedicalIconPng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const center = size / 2
  const radius = size * 0.42
  const crossArm = size * 0.09
  const crossLen = size * 0.24

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0 // filter type 0
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Dark Teal background (#1B4965 -> 27, 73, 101)
      let r = 27
      let g = 73
      let b = 101
      const a = 255

      // Inner Mint circle ring & medical cross (#2EC4B6 -> 46, 196, 182)
      const inCross =
        (Math.abs(dx) <= crossArm && Math.abs(dy) <= crossLen) ||
        (Math.abs(dy) <= crossArm && Math.abs(dx) <= crossLen)

      const inRing = Math.abs(dist - radius * 0.82) <= size * 0.025

      if (inCross || inRing) {
        r = 46
        g = 196
        b = 182
      } else if (dist < radius * 0.8) {
        // Slightly deeper teal inside circle (#13364C)
        r = 19
        g = 54
        b = 76
      }

      raw[idx] = r
      raw[idx + 1] = g
      raw[idx + 2] = b
      raw[idx + 3] = a
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = zlib.deflateSync(raw)
  const iend = Buffer.alloc(0)

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', iend),
  ])
}

fs.writeFileSync('public/pwa-192x192.png', createMedicalIconPng(192))
fs.writeFileSync('public/pwa-512x512.png', createMedicalIconPng(512))
console.log('✅ Generated public/pwa-192x192.png and public/pwa-512x512.png')

