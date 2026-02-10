// lib/sonification.ts — Pure utility for quantum circuit sonification
// No React. Web Audio API wrapper + histogram→frequency mapping.

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

// ---------------------------------------------------------------------------
// Frequency mapping
// ---------------------------------------------------------------------------

const FREQ_LO = 220 // A3
const FREQ_HI = 880 // A5

export function bitstringToFrequency(bitstring: string, numQubits: number): number {
  const value = parseInt(bitstring, 2)
  const maxValue = (1 << numQubits) - 1
  if (maxValue === 0) return FREQ_LO
  return FREQ_LO + (value / maxValue) * (FREQ_HI - FREQ_LO)
}

// ---------------------------------------------------------------------------
// Histogram → partials
// ---------------------------------------------------------------------------

export function countsToPartials(counts: Record<string, number>, numQubits: number): Partial[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total === 0) return []

  return Object.entries(counts)
    .map(([bitstring, count]) => ({
      bitstring,
      frequency: bitstringToFrequency(bitstring, numQubits),
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
  // Sort row by row (gamma outer, beta inner)
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

  // QAOA sweep
  if (Object.keys(rc).some(k => k.startsWith('qaoa_g'))) return 'qaoa_sweep'

  // Multi-basis VQE
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
  // From parameters
  const qubits = result.parameters?.qubits as number[] | undefined
  if (qubits && qubits.length > 0) return qubits.length
  const nq = result.parameters?.num_qubits as number | undefined
  if (nq) return nq

  // Infer from bitstring length
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
// SonificationEngine — Web Audio API wrapper
// ---------------------------------------------------------------------------

export class SonificationEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeOscillators: OscillatorNode[] = []
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

  /** Play a single chord from histogram partials */
  playChord(partials: Partial[], duration: number = 1.5, pan?: number): void {
    if (!this.ctx || !this.masterGain) return
    this.stopOscillators()
    this._playing = true
    const now = this.ctx.currentTime

    for (const p of partials.slice(0, 16)) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = p.frequency

      // Envelope: 50ms attack, sustain, 200ms release
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
      this.activeOscillators.push(osc)
    }

    // Auto-cleanup
    setTimeout(() => {
      this._playing = false
      this.activeOscillators = []
    }, duration * 1000 + 100)
  }

  /** Play a sequence of steps (for sweeps) */
  playSequence(
    steps: SonificationStep[],
    stepDuration: number,
    onStep?: (index: number) => void,
    numQubits?: number,
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

  /** Play two histograms in stereo: left vs right */
  playStereoComparison(
    leftPartials: Partial[],
    rightPartials: Partial[],
    duration: number = 2,
  ): void {
    if (!this.ctx || !this.masterGain) return
    this.stop()
    this._playing = true

    // Play left channel
    this.playChordInternal(leftPartials, duration, -0.8)
    // Play right channel
    this.playChordInternal(rightPartials, duration, 0.8)

    setTimeout(() => {
      this._playing = false
      this.activeOscillators = []
    }, duration * 1000 + 100)
  }

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
      this.activeOscillators.push(osc)
    }
  }

  stop(): void {
    this._playing = false
    if (this.sequenceTimer !== null) {
      clearTimeout(this.sequenceTimer)
      this.sequenceTimer = null
    }
    this.stopOscillators()
  }

  private stopOscillators(): void {
    for (const osc of this.activeOscillators) {
      try { osc.stop() } catch { /* already stopped */ }
    }
    this.activeOscillators = []
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
