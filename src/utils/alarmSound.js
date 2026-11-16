/**
 * Web Audio API Alarm & Chime Sound Engine + Device Haptics
 * Produces a distinct, audible ascending clinical chime loop for real-time medication alarms
 * without external audio assets so PWA notifications and alarms work reliably offline.
 */

class AlarmSoundManager {
  constructor() {
    this.ctx = null
    this.intervalId = null
    this.isPlaying = false
    this.unlockBound = false
    this.bindAudioUnlock()
  }

  getContext() {
    if (typeof window === 'undefined') return null
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    if (!this.ctx) {
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  bindAudioUnlock() {
    if (typeof window === 'undefined' || this.unlockBound) return
    this.unlockBound = true
    const unlock = () => {
      try {
        const ctx = this.getContext()
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {})
        }
      } catch {
        // Ignore audio unlock errors on restricted environments
      }
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock, { once: true, passive: true })
    window.addEventListener('keydown', unlock, { once: true, passive: true })
  }

  playTone(ctx, freq, startOffset, duration, peakGain = 0.22, waveType = 'triangle') {
    const osc = ctx.createOscillator()
    const subOsc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = waveType
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset)

    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(freq * 2, ctx.currentTime + startOffset)

    const startTime = ctx.currentTime + startOffset
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    osc.connect(gain)
    subOsc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    subOsc.start(startTime)
    osc.stop(startTime + duration + 0.04)
    subOsc.stop(startTime + duration + 0.04)
  }

  playChimeSequence() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      // Distinct, elderly-audible ascending chime: C5 -> E5 -> G5 -> C6
      this.playTone(ctx, 523.25, 0.0, 0.24, 0.22)
      this.playTone(ctx, 659.25, 0.2, 0.24, 0.24)
      this.playTone(ctx, 783.99, 0.4, 0.26, 0.25)
      this.playTone(ctx, 1046.5, 0.64, 0.52, 0.28)
    } catch {
      // Ignore Web Audio errors when hardware audio is unavailable
    }
  }

  startLoop() {
    if (this.isPlaying) return
    this.isPlaying = true
    this.playChimeSequence()
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playChimeSequence()
      }
    }, 2400)
  }

  stop() {
    this.isPlaying = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

export const alarmSoundEngine = new AlarmSoundManager()

export function startAlarmChime() {
  alarmSoundEngine.startLoop()
}

export function stopAlarmChime() {
  alarmSoundEngine.stop()
}

export function playSingleChime() {
  alarmSoundEngine.playChimeSequence()
}

export function triggerAlarmVibration() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([400, 150, 400, 150, 600])
    }
  } catch {
    // Ignore vibration errors on unsupported browsers
  }
}
