// lib/sonification.ts — Quantum circuit sonification engine
// No React. Web Audio API wrapper + multiple voice/mapping strategies.
//
// Prior art: VQH (Itaborai et al. 2023), Sound of Decoherence (Christie 2024),
// Entanglement Dynamics sonification (2025), Q1Synth (Hamido et al. 2023)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Partial {
  bitstring: string
  frequency: number
  amplitude: number
  probability: number
}

export interface SonificationStep {
  label: string
  partials: Partial[]
  meta?: Record<string, any>
}

export type SonificationMode = 'chord' | 'multi_basis' | 'bond_sweep' | 'qaoa_sweep' | 'comparison'

/** The different sonification voices — each maps quantum data to sound differently */
export type Voice =
  | 'harmonic'   // bitstring int → linear freq (original)
  | 'musical'    // bitstring → pentatonic scale notes (always consonant)
  | 'resonance'  // sawtooth + resonant filter shaped by distribution
  | 'beating'    // ideal vs measured energy as two tones (VQE only)
  | 'molecular'  // energy → pitch, hear the potential energy surface

export const VOICE_INFO: Record<Voice, { label: string; description: string }> = {
  harmonic:  { label: 'Harmonic', description: 'Bitstring value maps linearly to frequency. Simple additive synthesis.' },
  musical:   { label: 'Pentatonic', description: 'Bitstrings map to notes on a pentatonic scale. Always consonant — noise adds notes, not dissonance.' },
  resonance: { label: 'Resonance', description: 'Rich harmonics through a resonant filter. Peaked distributions ring clearly; noisy ones sound diffuse.' },
  beating:   { label: 'Beating', description: 'Ideal and measured energy as two close tones. Error = beat frequency. Chemical accuracy is a slow pulse.' },
  molecular: { label: 'Molecular', description: 'Energy maps directly to pitch. Hear the potential energy surface as you stretch the bond.' },
}

// ---------------------------------------------------------------------------
// Frequency mapping strategies
// ---------------------------------------------------------------------------

const FREQ_LO = 220 // A3
const FREQ_HI = 880 // A5

// Pentatonic scale in A minor: A B C E F (repeating across octaves)
// These intervals sound good in any combination
const PENTATONIC_RATIOS = [1, 9/8, 6/5, 3/2, 8/5] // relative to root
function buildPentatonicFreqs(numQubits: number): number[] {
  const n = 1 << numQubits
  const freqs: number[] = []
  const baseFreq = 220 // A3
  for (let i = 0; i < n; i++) {
    const octave = Math.floor(i / PENTATONIC_RATIOS.length)
    const degree = i % PENTATONIC_RATIOS.length
    freqs.push(baseFreq * PENTATONIC_RATIOS[degree] * Math.pow(2, octave))
  }
  return freqs
}

export function bitstringToFrequency(bitstring: string, numQubits: number, voice: Voice = 'harmonic'): number {
  const value = parseInt(bitstring, 2)
  const maxValue = (1 << numQubits) - 1

  if (voice === 'musical') {
    const scale = buildPentatonicFreqs(numQubits)
    return scale[Math.min(value, scale.length - 1)]
  }

  // Default linear mapping
  if (maxValue === 0) return FREQ_LO
  return FREQ_LO + (value / maxValue) * (FREQ_HI - FREQ_LO)
}

// ---------------------------------------------------------------------------
// Histogram → partials
// ---------------------------------------------------------------------------

export function countsToPartials(
  counts: Record<string, number>,
  numQubits: number,
  voice: Voice = 'harmonic',
): Partial[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total === 0) return []

  return Object.entries(counts)
    .map(([bitstring, count]) => ({
      bitstring,
      frequency: bitstringToFrequency(bitstring, numQubits, voice),
      amplitude: count / total,
      probability: count / total,
    }))
    .filter(p => p.probability >= 0.005) // filter <0.5%
    .sort((a, b) => b.amplitude - a.amplitude)
}

// ---------------------------------------------------------------------------
// Hardware bitstring extraction
// ---------------------------------------------------------------------------

/** Extract logical qubit bits from full-width hardware bitstrings.
 *  MSB-first: bit for qubit q in N-bit string s is s[N-1-q]. */
export function extractLogicalCounts(
  rawCounts: Record<string, number>,
  qubits: number[],
): Record<string, number> {
  const result: Record<string, number> = {}
  const sorted = [...qubits].sort((a, b) => b - a) // MSB first

  for (const [bitstring, count] of Object.entries(rawCounts)) {
    const n = bitstring.length
    let logicalBits = ''
    for (const q of sorted) {
      const idx = n - 1 - q
      logicalBits += idx >= 0 && idx < n ? bitstring[idx] : '0'
    }
    result[logicalBits] = (result[logicalBits] || 0) + count
  }
  return result
}

// ---------------------------------------------------------------------------
// Unified counts accessor
// ---------------------------------------------------------------------------

export function getEffectiveCounts(
  rawCounts: Record<string, any>,
  qubits?: number[],
  basis?: string,
): Record<string, number> {
  let counts: Record<string, number>

  // Multi-basis: pick the specified basis or default to z_basis
  if ('z_basis' in rawCounts && typeof rawCounts.z_basis === 'object') {
    const key = basis || 'z_basis'
    counts = rawCounts[key] as Record<string, number>
    if (!counts) counts = rawCounts.z_basis as Record<string, number>
  } else {
    // Flat counts or nested single-key
    const first = Object.values(rawCounts)[0]
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      counts = first as Record<string, number>
    } else {
      counts = rawCounts as Record<string, number>
    }
  }

  // Extract logical qubits if needed (hardware bitstrings wider than expected)
  if (qubits && qubits.length > 0) {
    const sampleKey = Object.keys(counts)[0]
    if (sampleKey && sampleKey.length > qubits.length) {
      return extractLogicalCounts(counts, qubits)
    }
  }

  return counts
}

// ---------------------------------------------------------------------------
// QAOA sweep extraction
// ---------------------------------------------------------------------------

export interface QAOAStep {
  gammaIdx: number
  betaIdx: number
  label: string
  counts: Record<string, number>
}

export function extractQAOASteps(rawCounts: Record<string, any>): QAOAStep[] {
  const steps: QAOAStep[] = []
  for (const [key, value] of Object.entries(rawCounts)) {
    const match = key.match(/^qaoa_g(\d+)_b(\d+)$/)
    if (match) {
      steps.push({
        gammaIdx: parseInt(match[1]),
        betaIdx: parseInt(match[2]),
        label: `g${match[1]}_b${match[2]}`,
        counts: value as Record<string, number>,
      })
    }
  }
  return steps.sort((a, b) => a.gammaIdx * 100 + a.betaIdx - (b.gammaIdx * 100 + b.betaIdx))
}

// ---------------------------------------------------------------------------
// Mode classification
// ---------------------------------------------------------------------------

export function getSonificationMode(result: {
  type: string
  raw_counts: Record<string, any>
  parameters?: Record<string, any>
}): SonificationMode {
  const rc = result.raw_counts
  if (!rc || Object.keys(rc).length === 0) return 'chord'
  if (Object.keys(rc).some(k => k.startsWith('qaoa_g'))) return 'qaoa_sweep'
  if ('z_basis' in rc && 'x_basis' in rc) return 'multi_basis'
  return 'chord'
}

// ---------------------------------------------------------------------------
// Qubit count helper
// ---------------------------------------------------------------------------

export function getNumQubits(result: {
  raw_counts: Record<string, any>
  parameters?: Record<string, any>
}): number {
  const qubits = result.parameters?.qubits as number[] | undefined
  if (qubits && qubits.length > 0) return qubits.length
  const nq = result.parameters?.num_qubits as number | undefined
  if (nq) return nq

  const rc = result.raw_counts
  if (!rc) return 2
  let counts = rc
  if ('z_basis' in rc) counts = rc.z_basis
  else {
    const first = Object.values(rc)[0]
    if (typeof first === 'object' && first !== null) counts = first as Record<string, any>
  }
  const firstKey = Object.keys(counts)[0]
  return firstKey ? firstKey.length : 2
}

// ---------------------------------------------------------------------------
// SonificationEngine — Web Audio API wrapper with multiple voices
// ---------------------------------------------------------------------------

export class SonificationEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeNodes: (OscillatorNode | AudioBufferSourceNode)[] = []
  private activeGains: GainNode[] = []
  private sequenceTimer: number | null = null
  private _playing = false

  get playing(): boolean {
    return this._playing
  }

  /** Must be called from a user gesture (click handler) */
  init(): void {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.5
    this.masterGain.connect(this.ctx.destination)
  }

  setVolume(v: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx!.currentTime, 0.02)
    }
  }

  // ─── Voice: Harmonic / Musical (additive sine synthesis) ───────────────

  playChord(partials: Partial[], duration: number = 1.5, pan?: number): void {
    if (!this.ctx || !this.masterGain) return
    this.stopAll()
    this._playing = true
    const now = this.ctx.currentTime

    for (const p of partials.slice(0, 16)) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = p.frequency

      const amp = p.amplitude * 0.6
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(amp, now + 0.05)
      gain.gain.setValueAtTime(amp, now + duration - 0.2)
      gain.gain.linearRampToValueAtTime(0, now + duration)

      if (pan !== undefined) {
        const panner = this.ctx.createStereoPanner()
        panner.pan.value = Math.max(-1, Math.min(1, pan))
        osc.connect(gain).connect(panner).connect(this.masterGain!)
      } else {
        osc.connect(gain).connect(this.masterGain!)
      }

      osc.start(now)
      osc.stop(now + duration + 0.05)
      this.activeNodes.push(osc)
    }

    this.scheduleEnd(duration)
  }

  // ─── Voice: Resonance (sawtooth + filter shaped by distribution) ───────

  playResonance(partials: Partial[], duration: number = 2): void {
    if (!this.ctx || !this.masterGain) return
    this.stopAll()
    this._playing = true
    const now = this.ctx.currentTime

    // Compute distribution statistics for filter parameters
    const totalProb = partials.reduce((s, p) => s + p.probability, 0)
    const meanFreq = partials.reduce((s, p) => s + p.frequency * p.probability, 0) / (totalProb || 1)
    // Spread: std dev of frequency distribution
    const variance = partials.reduce((s, p) => s + p.probability * Math.pow(p.frequency - meanFreq, 2), 0) / (totalProb || 1)
    const spread = Math.sqrt(variance)

    // Q inversely proportional to spread: peaked dist = high Q = ringing
    // spread ~0 (perfect) → Q=30, spread ~300 (noisy) → Q=1
    const Q = Math.max(1, Math.min(30, 30 / (1 + spread / 30)))

    // Sawtooth oscillator as rich harmonic source
    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = meanFreq * 0.5 // fundamental half the center freq

    // Resonant bandpass filter
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = Q

    // Sweep the filter center frequency through the distribution
    // Start low, sweep up through mean, back down — a resonance scan
    const sweepLo = Math.max(100, meanFreq - spread * 2)
    const sweepHi = Math.min(2000, meanFreq + spread * 2)
    filter.frequency.setValueAtTime(sweepLo, now)
    filter.frequency.linearRampToValueAtTime(sweepHi, now + duration * 0.4)
    filter.frequency.linearRampToValueAtTime(meanFreq, now + duration * 0.7)
    filter.frequency.linearRampToValueAtTime(sweepLo, now + duration)

    const gain = this.ctx.createGain()
    const amp = 0.4
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(amp, now + 0.08)
    gain.gain.setValueAtTime(amp, now + duration - 0.3)
    gain.gain.linearRampToValueAtTime(0, now + duration)

    osc.connect(filter).connect(gain).connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + duration + 0.05)
    this.activeNodes.push(osc)
    this.activeGains.push(gain)

    // Add quiet clicks at the peak frequencies (like resonance peaks being excited)
    for (const p of partials.slice(0, 6)) {
      const peakOsc = this.ctx.createOscillator()
      const peakGain = this.ctx.createGain()
      peakOsc.type = 'sine'
      peakOsc.frequency.value = p.frequency

      // Brief ping when the sweep passes through this frequency
      const peakTime = now + duration * 0.4 * ((p.frequency - sweepLo) / (sweepHi - sweepLo || 1))
      const pingDur = 0.3
      const pingAmp = p.amplitude * 0.25
      peakGain.gain.setValueAtTime(0, now)
      peakGain.gain.setValueAtTime(0, Math.max(now, peakTime - 0.02))
      peakGain.gain.linearRampToValueAtTime(pingAmp, peakTime + 0.02)
      peakGain.gain.linearRampToValueAtTime(0, peakTime + pingDur)

      peakOsc.connect(peakGain).connect(this.masterGain!)
      peakOsc.start(now)
      peakOsc.stop(now + duration + 0.1)
      this.activeNodes.push(peakOsc)
    }

    this.scheduleEnd(duration)
  }

  // ─── Voice: Beating (ideal vs measured energy) ─────────────────────────
  // Maps energy difference to audible beat frequency.
  // E = hf in quantum mechanics. We map Hartree energy to ~Hz directly.
  // Chemical accuracy (0.0016 Ha) → ~1 Hz slow pulse. 0.01 Ha → ~6 Hz buzz.

  playBeating(
    measuredEnergy: number,
    idealEnergy: number,
    duration: number = 3,
  ): void {
    if (!this.ctx || !this.masterGain) return
    this.stopAll()
    this._playing = true
    const now = this.ctx.currentTime

    // Base frequency: map the ideal energy to audible range
    // H2 energies are around -1.1 Ha. Map [-2, 0] → [200, 600] Hz
    const baseFreq = 400 + idealEnergy * 200

    // Beat offset: map energy error to Hz
    // 0.0016 Ha (chem accuracy) → 1 Hz beat
    // 0.04 Ha (25 kcal/mol) → 25 Hz buzz
    const errorHa = Math.abs(measuredEnergy - idealEnergy)
    const beatHz = errorHa * 625 // 1.6 mHa → 1 Hz

    // Two slightly detuned sine waves create beating
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain1 = this.ctx.createGain()
    const gain2 = this.ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.value = baseFreq
    osc2.frequency.value = baseFreq + beatHz

    // Label them with stereo: ideal (left), measured (right)
    const pan1 = this.ctx.createStereoPanner()
    const pan2 = this.ctx.createStereoPanner()
    pan1.pan.value = -0.5
    pan2.pan.value = 0.5

    const amp = 0.35
    for (const g of [gain1, gain2]) {
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(amp, now + 0.1)
      g.gain.setValueAtTime(amp, now + duration - 0.4)
      g.gain.linearRampToValueAtTime(0, now + duration)
    }

    osc1.connect(gain1).connect(pan1).connect(this.masterGain!)
    osc2.connect(gain2).connect(pan2).connect(this.masterGain!)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + duration + 0.05)
    osc2.stop(now + duration + 0.05)

    this.activeNodes.push(osc1, osc2)
    this.activeGains.push(gain1, gain2)

    this.scheduleEnd(duration)
  }

  // ─── Voice: Molecular (energy → pitch for sweeps) ─────────────────────
  // Each bond distance plays a tone whose pitch tracks the energy.
  // Lower energy = lower pitch. The equilibrium "well" is the deepest note.

  playMolecularSweep(
    steps: { energy: number; bondDistance: number; label: string }[],
    stepDuration: number,
    onStep?: (index: number) => void,
  ): void {
    if (!this.ctx || !this.masterGain) return
    this.stop()
    this._playing = true

    // Map energy range to pitch range
    const energies = steps.map(s => s.energy)
    const minE = Math.min(...energies)
    const maxE = Math.max(...energies)
    const range = maxE - minE || 0.1

    let i = 0
    const playNext = () => {
      if (i >= steps.length || !this._playing) {
        this._playing = false
        return
      }
      onStep?.(i)
      const s = steps[i]

      // Lower energy = lower pitch (the well is deep and resonant)
      // Map [-1.2, -0.5] → [150, 500] Hz approximately
      const t = (s.energy - minE) / range // 0 = min energy (well bottom), 1 = max
      const freq = 150 + t * 350

      // Timbre shifts with bond distance: compressed bonds (small R) = bright (triangle)
      // stretched bonds (large R) = dark (sine)
      const dur = stepDuration * 0.85

      if (this.ctx) {
        this.stopAll()
        const now = this.ctx.currentTime

        const osc = this.ctx.createOscillator()
        osc.type = s.bondDistance < 0.8 ? 'triangle' : 'sine'
        osc.frequency.value = freq

        // Add a sub-octave for richness at the equilibrium
        const sub = this.ctx.createOscillator()
        sub.type = 'sine'
        sub.frequency.value = freq * 0.5

        const oscGain = this.ctx.createGain()
        const subGain = this.ctx.createGain()

        const amp = 0.35
        const subAmp = 0.15 * (1 - t) // sub-bass stronger at well bottom
        for (const [g, a] of [[oscGain, amp], [subGain, subAmp]] as [GainNode, number][]) {
          g.gain.setValueAtTime(0, now)
          g.gain.linearRampToValueAtTime(a, now + 0.04)
          g.gain.setValueAtTime(a, now + dur - 0.15)
          g.gain.linearRampToValueAtTime(0, now + dur)
        }

        osc.connect(oscGain).connect(this.masterGain!)
        sub.connect(subGain).connect(this.masterGain!)
        osc.start(now)
        sub.start(now)
        osc.stop(now + dur + 0.05)
        sub.stop(now + dur + 0.05)
        this.activeNodes.push(osc, sub)
        this.activeGains.push(oscGain, subGain)
      }

      i++
      this.sequenceTimer = window.setTimeout(playNext, stepDuration * 1000)
    }
    playNext()
  }

  // ─── Stereo comparison ─────────────────────────────────────────────────

  playStereoComparison(
    leftPartials: Partial[],
    rightPartials: Partial[],
    duration: number = 2,
  ): void {
    if (!this.ctx || !this.masterGain) return
    this.stop()
    this._playing = true

    this.playChordInternal(leftPartials, duration, -0.8)
    this.playChordInternal(rightPartials, duration, 0.8)

    this.scheduleEnd(duration)
  }

  // ─── Sequence player (for sweeps with additive voices) ─────────────────

  playSequence(
    steps: SonificationStep[],
    stepDuration: number,
    onStep?: (index: number) => void,
  ): void {
    if (!this.ctx || !this.masterGain) return
    this.stop()
    this._playing = true
    let i = 0

    const playNext = () => {
      if (i >= steps.length || !this._playing) {
        this._playing = false
        return
      }
      onStep?.(i)
      this.playChord(steps[i].partials, stepDuration * 0.9)
      i++
      this.sequenceTimer = window.setTimeout(playNext, stepDuration * 1000)
    }
    playNext()
  }

  // ─── Sequence with resonance voice ─────────────────────────────────────

  playResonanceSequence(
    steps: SonificationStep[],
    stepDuration: number,
    onStep?: (index: number) => void,
  ): void {
    if (!this.ctx || !this.masterGain) return
    this.stop()
    this._playing = true
    let i = 0

    const playNext = () => {
      if (i >= steps.length || !this._playing) {
        this._playing = false
        return
      }
      onStep?.(i)
      this.playResonance(steps[i].partials, stepDuration * 0.9)
      i++
      this.sequenceTimer = window.setTimeout(playNext, stepDuration * 1000)
    }
    playNext()
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private playChordInternal(partials: Partial[], duration: number, pan: number): void {
    if (!this.ctx || !this.masterGain) return
    const now = this.ctx.currentTime

    for (const p of partials.slice(0, 16)) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const panner = this.ctx.createStereoPanner()

      osc.type = 'sine'
      osc.frequency.value = p.frequency
      panner.pan.value = pan

      const amp = p.amplitude * 0.5
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(amp, now + 0.05)
      gain.gain.setValueAtTime(amp, now + duration - 0.2)
      gain.gain.linearRampToValueAtTime(0, now + duration)

      osc.connect(gain).connect(panner).connect(this.masterGain!)
      osc.start(now)
      osc.stop(now + duration + 0.05)
      this.activeNodes.push(osc)
    }
  }

  private scheduleEnd(duration: number): void {
    setTimeout(() => {
      this._playing = false
      this.activeNodes = []
      this.activeGains = []
    }, duration * 1000 + 100)
  }

  stop(): void {
    this._playing = false
    if (this.sequenceTimer !== null) {
      clearTimeout(this.sequenceTimer)
      this.sequenceTimer = null
    }
    this.stopAll()
  }

  private stopAll(): void {
    for (const node of this.activeNodes) {
      try { node.stop() } catch { /* already stopped */ }
    }
    this.activeNodes = []
    this.activeGains = []
  }

  dispose(): void {
    this.stop()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
      this.masterGain = null
    }
  }
}
