export const SOUND_EFFECTS = [
  'tap',
  'navigate',
  'select',
  'back',
  'save',
  'unsave',
  'send',
  'success',
  'error',
  'carouselTick',
  'confirm',
] as const

export type SoundEffect = (typeof SOUND_EFFECTS)[number]

const SILENCE = 0.0001
const MAX_ACTIVE_VOICES = 14

const MIN_INTERVAL: Record<SoundEffect, number> = {
  tap: 0.055,
  navigate: 0.09,
  select: 0.065,
  back: 0.09,
  save: 0.16,
  unsave: 0.16,
  send: 0.18,
  success: 0.24,
  error: 0.24,
  carouselTick: 0.055,
  confirm: 0.24,
}

interface ToneOptions {
  at?: number
  duration: number
  from: number
  to: number
  type?: OscillatorType
  volume: number
  attack?: number
}

interface NoiseOptions {
  at?: number
  duration: number
  volume: number
  frequency: number
  sweepTo?: number
}

type AudioContextConstructor = typeof AudioContext

function getAudioContextConstructor(): AudioContextConstructor | null {
  const safariWindow = window as Window & { webkitAudioContext?: AudioContextConstructor }
  return window.AudioContext ?? safariWindow.webkitAudioContext ?? null
}

/** One shared, bounded Web Audio graph for the app's storybook sound palette. */
export class SoundEngine {
  private context: AudioContext | null = null
  private output: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private enabled: boolean
  private activeVoices = 0
  private readonly lastPlayed = new Map<SoundEffect, number>()

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  unlock() {
    if (!this.enabled) return
    const context = this.ensureContext()
    if (context?.state === 'suspended') void context.resume()
  }

  play(effect: SoundEffect) {
    if (!this.enabled) return
    const context = this.ensureContext()
    if (!context || context.state === 'closed') return
    if (context.state === 'suspended') void context.resume()

    const now = context.currentTime
    const lastPlayed = this.lastPlayed.get(effect) ?? -Infinity
    if (now - lastPlayed < MIN_INTERVAL[effect]) return
    this.lastPlayed.set(effect, now)

    switch (effect) {
      case 'tap':
        this.tone({ from: 430, to: 210, duration: 0.058, volume: 0.082, type: 'triangle', attack: 0.004 })
        this.noise({ duration: 0.035, volume: 0.018, frequency: 1250, sweepTo: 620 })
        break
      case 'navigate':
        this.tone({ from: 392, to: 466, duration: 0.105, volume: 0.068, type: 'sine' })
        this.tone({ at: 0.055, from: 587, to: 554, duration: 0.13, volume: 0.055, type: 'sine' })
        break
      case 'select':
        this.tone({ from: 540, to: 310, duration: 0.085, volume: 0.072, type: 'triangle', attack: 0.003 })
        this.tone({ at: 0.035, from: 660, to: 590, duration: 0.09, volume: 0.038, type: 'sine' })
        break
      case 'back':
        this.tone({ from: 470, to: 294, duration: 0.13, volume: 0.064, type: 'sine' })
        this.noise({ duration: 0.045, volume: 0.012, frequency: 900, sweepTo: 430 })
        break
      case 'save':
        this.tone({ from: 523.25, to: 554.37, duration: 0.16, volume: 0.074, type: 'sine' })
        this.tone({ at: 0.075, from: 783.99, to: 830.61, duration: 0.2, volume: 0.068, type: 'sine' })
        break
      case 'unsave':
        this.tone({ from: 659.25, to: 622.25, duration: 0.12, volume: 0.055, type: 'sine' })
        this.tone({ at: 0.055, from: 440, to: 349.23, duration: 0.15, volume: 0.052, type: 'sine' })
        break
      case 'send':
        this.noise({ duration: 0.16, volume: 0.032, frequency: 720, sweepTo: 2400 })
        this.tone({ at: 0.045, from: 440, to: 740, duration: 0.18, volume: 0.066, type: 'sine' })
        break
      case 'success':
        this.tone({ from: 523.25, to: 523.25, duration: 0.2, volume: 0.062, type: 'sine' })
        this.tone({ at: 0.075, from: 659.25, to: 659.25, duration: 0.22, volume: 0.064, type: 'sine' })
        this.tone({ at: 0.15, from: 783.99, to: 830.61, duration: 0.28, volume: 0.07, type: 'sine' })
        break
      case 'error':
        this.tone({ from: 196, to: 155.56, duration: 0.15, volume: 0.065, type: 'triangle', attack: 0.006 })
        this.tone({ at: 0.07, from: 174.61, to: 138.59, duration: 0.16, volume: 0.048, type: 'sine' })
        break
      case 'carouselTick':
        this.tone({ from: 440, to: 190, duration: 0.06, volume: 0.082, type: 'triangle', attack: 0.003 })
        this.noise({ duration: 0.032, volume: 0.014, frequency: 1100, sweepTo: 540 })
        break
      case 'confirm':
        this.tone({ at: 0.008, from: 523.25, to: 493.88, duration: 0.22, volume: 0.088, type: 'sine' })
        this.tone({ at: 0.093, from: 659.25, to: 622.25, duration: 0.25, volume: 0.08, type: 'sine' })
        break
    }
  }

  close() {
    const context = this.context
    this.context = null
    this.output = null
    this.noiseBuffer = null
    this.activeVoices = 0
    this.lastPlayed.clear()
    if (context && context.state !== 'closed') void context.close()
  }

  private ensureContext() {
    if (this.context && this.context.state !== 'closed') return this.context
    const Context = getAudioContextConstructor()
    if (!Context) return null

    const context = new Context()
    const master = context.createGain()
    const compressor = context.createDynamicsCompressor()
    master.gain.value = 0.82
    compressor.threshold.value = -20
    compressor.knee.value = 14
    compressor.ratio.value = 6
    compressor.attack.value = 0.003
    compressor.release.value = 0.16
    master.connect(compressor)
    compressor.connect(context.destination)

    this.context = context
    this.output = master
    return context
  }

  private tone(options: ToneOptions) {
    const context = this.context
    const output = this.output
    if (!context || !output || !this.reserveVoice()) return

    const start = context.currentTime + (options.at ?? 0)
    const end = start + options.duration
    const attackEnd = start + Math.min(options.attack ?? 0.008, options.duration * 0.2)
    const oscillator = context.createOscillator()
    const envelope = context.createGain()

    oscillator.type = options.type ?? 'sine'
    oscillator.frequency.setValueAtTime(options.from, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), end)
    envelope.gain.setValueAtTime(SILENCE, start)
    envelope.gain.exponentialRampToValueAtTime(options.volume, attackEnd)
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end)
    oscillator.connect(envelope)
    envelope.connect(output)
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect()
      envelope.disconnect()
      this.activeVoices = Math.max(0, this.activeVoices - 1)
    }, { once: true })
    oscillator.start(start)
    oscillator.stop(end + 0.01)
  }

  private noise(options: NoiseOptions) {
    const context = this.context
    const output = this.output
    if (!context || !output || !this.reserveVoice()) return

    const start = context.currentTime + (options.at ?? 0)
    const end = start + options.duration
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()

    source.buffer = this.getNoiseBuffer(context)
    filter.type = 'bandpass'
    filter.Q.value = 0.75
    filter.frequency.setValueAtTime(options.frequency, start)
    filter.frequency.exponentialRampToValueAtTime(Math.max(options.sweepTo ?? options.frequency, 1), end)
    envelope.gain.setValueAtTime(SILENCE, start)
    envelope.gain.exponentialRampToValueAtTime(options.volume, start + Math.min(0.006, options.duration * 0.2))
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(output)
    source.addEventListener('ended', () => {
      source.disconnect()
      filter.disconnect()
      envelope.disconnect()
      this.activeVoices = Math.max(0, this.activeVoices - 1)
    }, { once: true })
    source.start(start)
    source.stop(end + 0.01)
  }

  private reserveVoice() {
    if (this.activeVoices >= MAX_ACTIVE_VOICES) return false
    this.activeVoices += 1
    return true
  }

  private getNoiseBuffer(context: AudioContext) {
    if (this.noiseBuffer) return this.noiseBuffer
    const length = Math.ceil(context.sampleRate * 0.35)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1
    }
    this.noiseBuffer = buffer
    return buffer
  }
}

export function isSoundEffect(value: string): value is SoundEffect {
  return (SOUND_EFFECTS as readonly string[]).includes(value)
}
