'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Nav from '@/components/Nav'
import CRTMonitor from '@/components/CRTMonitor'

// ─── Types ──────────────────────────────────────────────────────────────────────

type GateType = 'Ry' | 'Rz' | 'CZ' | 'X' | 'Measure'

interface GateInstance {
  type: GateType
  qubit: number
  controlQubit?: number
  angle?: number
  label: string
}

interface CircuitDefinition {
  name: string
  description: string
  numQubits: number
  gates: GateInstance[]
}

// ─── Physical Constants ─────────────────────────────────────────────────────────
//
// References:
//   DRAG: Motzoi et al., PRL 103 110501 (2009); Gambetta et al., PRA 83 012308 (2011)
//   SNZ CZ: Negirneac et al., PRL 126 220502 (2021); Rol et al., PRL 123 120502 (2019)
//   GaussianSquare readout: Qiskit pulse library; standard in IBM/QuTech hardware
//   Virtual Rz: McKay et al., PRA 96 022330 (2017)

const SAMPLE_RATE = 44100

// Qubit parameters — 3 qubits with distinct transmon frequencies
// Typical transmon: 4.5–5.5 GHz drive, anharmonicity α/(2π) ≈ −200 to −330 MHz
const QUBIT_PARAMS = [
  { driveFreqGHz: 5.0, anharmonicityMHz: -300, audioBaseHz: 440, color: '#00d4ff', label: 'Q0' },
  { driveFreqGHz: 5.2, anharmonicityMHz: -310, audioBaseHz: 484, color: '#8b5cf6', label: 'Q1' },
  { driveFreqGHz: 5.4, anharmonicityMHz: -290, audioBaseHz: 528, color: '#00ff88', label: 'Q2' },
]

// Readout resonator: typically 6–8 GHz, ~1.4× qubit drive frequency
const READOUT_FREQ_RATIO = 1.4

// Gate colors
const GATE_COLORS: Record<GateType, string> = {
  Ry: '#00d4ff',
  Rz: '#f59e0b',
  CZ: '#ff6b9d',
  X: '#8b5cf6',
  Measure: '#00ff88',
}

// Physical gate durations (real ns), then time-stretched for audio
// Single-qubit: ~30 ns (IBM Heron-class), CZ: ~60–80 ns (SNZ), Readout: ~600 ns
const REAL_DURATIONS_NS: Record<GateType, number> = {
  Ry: 30,
  X: 30,
  Rz: 0,       // Virtual — zero duration in hardware
  CZ: 68,      // SNZ CZ on IBM Heron-class / QuTech Tuna-9
  Measure: 600, // Shortened from real ~1500 ns for listenability
}

const TIME_STRETCH = 1e7 // 1 ns → 0.01 s, so 30 ns → 0.3 s

// Computed audio durations
const GATE_DURATIONS: Record<GateType, number> = {
  Ry: REAL_DURATIONS_NS.Ry * TIME_STRETCH / 1e9,     // 0.3 s
  X: REAL_DURATIONS_NS.X * TIME_STRETCH / 1e9,        // 0.3 s
  Rz: 0.05,                                            // Brief click (virtual gate marker)
  CZ: REAL_DURATIONS_NS.CZ * TIME_STRETCH / 1e9,      // 0.68 s
  Measure: REAL_DURATIONS_NS.Measure * TIME_STRETCH / 1e9, // 6.0 s → cap at 1.2 s
}
// Cap readout duration for listenability
GATE_DURATIONS.Measure = Math.min(GATE_DURATIONS.Measure, 1.2)

const GAP_DURATION = 0.05 // 50 ms silence between gates

// ─── DRAG Pulse Parameters ──────────────────────────────────────────────────────
// Standard: truncation at ±4σ → σ = duration / 8
// Gaussian is "lifted" so first and last samples are exactly zero
// Q-channel: β × dG/dt / |α| where α is anharmonicity (rad/s)
// β ≈ 0.5 is DRAG-P regime (phase error minimization)

const N_SIGMA = 4  // Standard 4-sigma truncation
const DRAG_BETA = 0.5 // DRAG-P regime (Gambetta et al.)

// ─── Circuits ───────────────────────────────────────────────────────────────────

const CIRCUITS: CircuitDefinition[] = [
  {
    name: 'Bell State',
    description: 'Simplest entangling circuit: Ry(π/2) → CZ → Ry(π/2). Creates |00⟩+|11⟩.',
    numQubits: 2,
    gates: [
      { type: 'Ry', qubit: 0, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'CZ', qubit: 1, controlQubit: 0, label: 'CZ' },
      { type: 'Ry', qubit: 1, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'Measure', qubit: 0, label: 'M' },
      { type: 'Measure', qubit: 1, label: 'M' },
    ],
  },
  {
    name: 'GHZ-3',
    description: 'Three-qubit GHZ state: chain of Ry+CZ creates |000⟩+|111⟩.',
    numQubits: 3,
    gates: [
      { type: 'Ry', qubit: 0, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'CZ', qubit: 1, controlQubit: 0, label: 'CZ' },
      { type: 'Ry', qubit: 1, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'CZ', qubit: 2, controlQubit: 1, label: 'CZ' },
      { type: 'Ry', qubit: 2, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'Measure', qubit: 0, label: 'M' },
      { type: 'Measure', qubit: 1, label: 'M' },
      { type: 'Measure', qubit: 2, label: 'M' },
    ],
  },
  {
    name: 'H₂ VQE Ansatz',
    description: 'The actual circuit we run on Tuna-9 for hydrogen VQE. Native gate decomposition.',
    numQubits: 2,
    gates: [
      { type: 'X', qubit: 0, label: 'X' },
      { type: 'X', qubit: 1, label: 'X' },
      { type: 'Ry', qubit: 0, angle: 0.2, label: 'Ry(θ)' },
      { type: 'Ry', qubit: 1, angle: -Math.PI / 2, label: 'Ry(-π/2)' },
      { type: 'CZ', qubit: 1, controlQubit: 0, label: 'CZ' },
      { type: 'Ry', qubit: 1, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'Measure', qubit: 0, label: 'M' },
      { type: 'Measure', qubit: 1, label: 'M' },
    ],
  },
  {
    name: 'Single Gates',
    description: 'Hear each gate type in isolation: Ry, Rz, X, Measure.',
    numQubits: 1,
    gates: [
      { type: 'Ry', qubit: 0, angle: Math.PI / 2, label: 'Ry(π/2)' },
      { type: 'Rz', qubit: 0, angle: Math.PI / 4, label: 'Rz(π/4)' },
      { type: 'X', qubit: 0, label: 'X' },
      { type: 'Measure', qubit: 0, label: 'M' },
    ],
  },
]

// ─── Pulse Envelope Generation ──────────────────────────────────────────────────
// These return I and Q envelope arrays (baseband, no carrier).
// Audio generation modulates onto carrier separately.

interface PulseEnvelope {
  I: Float32Array
  Q: Float32Array
  duration: number
}

function generateDRAGEnvelope(qubitIdx: number, durationS: number, angle: number = Math.PI / 2): PulseEnvelope {
  // Motzoi et al., PRL 103 110501 (2009)
  // σ = duration / (2 × n_sigma), Gaussian truncated at ±4σ
  // Lifted so edges are exactly zero: g_lifted = (g - g_edge) / (1 - g_edge)
  // Q(t) = β × dG_lifted/dt, scaled by 1/|α| (anharmonicity)

  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const I = new Float32Array(numSamples)
  const Q = new Float32Array(numSamples)

  const sigma = durationS / (2 * N_SIGMA) // 4σ truncation
  const t0 = durationS / 2
  const ampScale = Math.abs(angle) / (Math.PI / 2)

  // Edge value for lifting (value of Gaussian at ±4σ from center = at t=0 and t=duration)
  const gEdge = Math.exp(-0.5 * N_SIGMA * N_SIGMA)
  const liftDenom = 1 - gEdge

  // Anharmonicity in rad/s (for Q-channel normalization)
  // In sonification we fold this into β_eff since we're at audio frequencies
  // Real: β/|α| where α ~ 2π × 300 MHz. We scale Q to be visually/audibly meaningful.
  const betaEff = DRAG_BETA * sigma // β_eff = β × σ (dimensionless Q amplitude relative to I)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const dt = t - t0

    // Raw Gaussian
    const g = Math.exp(-0.5 * (dt / sigma) ** 2)
    // Lifted Gaussian (starts and ends at zero)
    const gLifted = (g - gEdge) / liftDenom

    // I-channel: lifted Gaussian envelope
    I[i] = ampScale * Math.max(gLifted, 0)

    // Q-channel: DRAG correction = β × d(gLifted)/dt
    // d(gLifted)/dt = -(dt/σ²) × g / liftDenom
    const dgLifted = -(dt / (sigma * sigma)) * g / liftDenom
    Q[i] = ampScale * betaEff * dgLifted
  }

  return { I, Q, duration: durationS }
}

function generateSNZEnvelope(durationS: number): PulseEnvelope {
  // Sudden Net-Zero CZ (Negirneac et al., PRL 126 220502, 2021)
  // Two rectangular flux lobes of opposite polarity, separated by a short idle gap.
  // The "sudden" shape intentionally maximizes intermediate |02⟩ leakage per lobe,
  // which then destructively interferes between the two lobes.
  // Net-zero constraint: ∫Φ(t)dt = 0 → first lobe area = second lobe area.
  //
  // Structure: [+A for t_half] [idle for t_phi] [-A for t_half]
  // With short cosine ramps on edges (bandwidth-limiting, ~2 ns rise time → ~0.02s audio)

  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const I = new Float32Array(numSamples)
  const Q = new Float32Array(numSamples) // Flux pulses are baseband, Q=0

  // Timing: positive lobe 45%, idle 10%, negative lobe 45%
  const tHalf = durationS * 0.45
  const tPhi = durationS * 0.10  // idle gap (fine phase control)
  const rampTime = durationS * 0.03 // short cosine ramps on leading/trailing edges

  const t1Start = 0
  const t1End = tHalf
  const t2Start = tHalf + tPhi
  const t2End = t2Start + tHalf

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE

    if (t >= t1Start && t < t1End) {
      // Positive lobe
      let env = 1.0
      if (t < t1Start + rampTime) {
        env = 0.5 * (1 - Math.cos(Math.PI * (t - t1Start) / rampTime))
      } else if (t > t1End - rampTime) {
        env = 0.5 * (1 - Math.cos(Math.PI * (t1End - t) / rampTime))
      }
      I[i] = env
    } else if (t >= t2Start && t < t2End) {
      // Negative lobe (same amplitude, opposite sign — net-zero)
      let env = 1.0
      if (t < t2Start + rampTime) {
        env = 0.5 * (1 - Math.cos(Math.PI * (t - t2Start) / rampTime))
      } else if (t > t2End - rampTime) {
        env = 0.5 * (1 - Math.cos(Math.PI * (t2End - t) / rampTime))
      }
      I[i] = -env
    }
    // else: idle gap → I[i] = 0 (already initialized)
  }

  return { I, Q, duration: durationS }
}

function generateGaussianSquareEnvelope(qubitIdx: number, durationS: number): PulseEnvelope {
  // GaussianSquare readout pulse (standard in IBM/QuTech hardware)
  // Flat-top with Gaussian rise and fall ramps.
  // Ramp σ chosen so the ramp spans ~3σ for smooth transitions.
  // Real: duration ~1500 ns, ramp ~80 ns. We shorten for listenability.
  //
  // f(t) = exp(-0.5 × ((t - t_ramp) / σ_r)²)  for rising edge
  // f(t) = 1.0                                   for flat top
  // f(t) = exp(-0.5 × ((t - t_fall) / σ_r)²)   for falling edge

  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const I = new Float32Array(numSamples)
  const Q = new Float32Array(numSamples) // Readout is single-quadrature

  // Ramp is 12% of total duration on each side, flat top is 76%
  const rampFraction = 0.12
  const rampDuration = durationS * rampFraction
  const sigmaR = rampDuration / 3 // 3σ ramp → smooth transition
  const flatStart = rampDuration
  const flatEnd = durationS - rampDuration

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE

    if (t < flatStart) {
      // Rising Gaussian ramp: centered at flatStart, we're to the left
      I[i] = Math.exp(-0.5 * ((t - flatStart) / sigmaR) ** 2)
    } else if (t > flatEnd) {
      // Falling Gaussian ramp: centered at flatEnd, we're to the right
      I[i] = Math.exp(-0.5 * ((t - flatEnd) / sigmaR) ** 2)
    } else {
      // Flat top
      I[i] = 1.0
    }
  }

  return { I, Q, duration: durationS }
}

function generateRzEnvelope(durationS: number): PulseEnvelope {
  // McKay et al., PRA 96 022330 (2017): Rz is purely virtual.
  // No physical pulse — just a phase update to the software reference frame.
  // We play a brief click as an audio marker.

  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const I = new Float32Array(numSamples)
  const Q = new Float32Array(numSamples)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    I[i] = 0.6 * Math.exp(-t / 0.008)
    // No Q-channel — this is just an audio marker
  }

  return { I, Q, duration: durationS }
}

function generateEnvelope(gate: GateInstance): PulseEnvelope {
  const duration = GATE_DURATIONS[gate.type]
  switch (gate.type) {
    case 'Ry':
      return generateDRAGEnvelope(gate.qubit, duration, gate.angle ?? Math.PI / 2)
    case 'X':
      return generateDRAGEnvelope(gate.qubit, duration, Math.PI)
    case 'CZ':
      return generateSNZEnvelope(duration)
    case 'Rz':
      return generateRzEnvelope(duration)
    case 'Measure':
      return generateGaussianSquareEnvelope(gate.qubit, duration)
  }
}

// ─── Audio Buffer Generation ────────────────────────────────────────────────────
// Modulate I/Q envelopes onto carrier for audible playback

function modulateToAudio(envelope: PulseEnvelope, gate: GateInstance): Float32Array {
  const { I, Q } = envelope
  const numSamples = I.length
  const buffer = new Float32Array(numSamples)

  if (gate.type === 'CZ') {
    // Flux pulses are baseband — use a low carrier for audibility
    const carrierFreq = 100
    const omega = 2 * Math.PI * carrierFreq
    for (let i = 0; i < numSamples; i++) {
      const t = i / SAMPLE_RATE
      buffer[i] = I[i] * Math.cos(omega * t)
    }
  } else if (gate.type === 'Rz') {
    // Virtual gate click — modulate at a high frequency for a "tick" sound
    const omega = 2 * Math.PI * 1200
    for (let i = 0; i < numSamples; i++) {
      const t = i / SAMPLE_RATE
      buffer[i] = I[i] * Math.sin(omega * t)
    }
  } else if (gate.type === 'Measure') {
    // Readout at resonator frequency (1.4× qubit drive)
    const readoutHz = QUBIT_PARAMS[gate.qubit].audioBaseHz * READOUT_FREQ_RATIO
    const omega = 2 * Math.PI * readoutHz
    for (let i = 0; i < numSamples; i++) {
      const t = i / SAMPLE_RATE
      buffer[i] = 0.7 * I[i] * Math.cos(omega * t)
    }
  } else {
    // DRAG: proper IQ modulation → s(t) = I(t)cos(ωt) − Q(t)sin(ωt)
    const audioFreq = QUBIT_PARAMS[gate.qubit].audioBaseHz
    const omega = 2 * Math.PI * audioFreq
    for (let i = 0; i < numSamples; i++) {
      const t = i / SAMPLE_RATE
      buffer[i] = I[i] * Math.cos(omega * t) - Q[i] * Math.sin(omega * t)
    }
  }

  return buffer
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PulsePlayerClient() {
  // State
  const [circuitIdx, setCircuitIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentGateIdx, setCurrentGateIdx] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [volume, setVolume] = useState(0.5)
  const [looping, setLooping] = useState(false)
  const [iqMode, setIqMode] = useState<'overlay' | 'split'>('overlay')

  // Refs
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const playbackRef = useRef<{ startTime: number; gateTimings: { start: number; end: number }[] } | null>(null)
  const rafRef = useRef<number>(0)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const timeDomainRef = useRef<Float32Array<ArrayBuffer> | null>(null)
  const loopingRef = useRef(looping)
  loopingRef.current = looping
  const playingRef = useRef(playing)
  playingRef.current = playing

  const circuit = CIRCUITS[circuitIdx]

  // Pre-compute envelopes and audio buffers
  const gateEnvelopes = useMemo(() => circuit.gates.map(generateEnvelope), [circuit])
  const gatePulses = useMemo(
    () => circuit.gates.map((gate, i) => modulateToAudio(gateEnvelopes[i], gate)),
    [circuit, gateEnvelopes],
  )

  // Audio setup
  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      analyserRef.current = ctxRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.6
      masterRef.current = ctxRef.current.createGain()
      masterRef.current.gain.value = volume
      masterRef.current.connect(analyserRef.current)
      analyserRef.current.connect(ctxRef.current.destination)
      timeDomainRef.current = new Float32Array(analyserRef.current.fftSize) as Float32Array<ArrayBuffer>
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [volume])

  // Stop all playback
  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop() } catch {} })
    sourcesRef.current = []
    playbackRef.current = null
    setPlaying(false)
    setCurrentGateIdx(-1)
  }, [])

  // Schedule and play circuit
  const playCircuit = useCallback(() => {
    const ctx = ensureCtx()
    stopPlayback()

    const sources: AudioBufferSourceNode[] = []
    const gateTimings: { start: number; end: number }[] = []
    let offset = 0.05 // small initial delay

    for (let i = 0; i < gatePulses.length; i++) {
      const pulse = gatePulses[i]
      const duration = pulse.length / SAMPLE_RATE
      const audioBuffer = ctx.createBuffer(1, pulse.length, SAMPLE_RATE)
      audioBuffer.getChannelData(0).set(pulse)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.playbackRate.value = speed
      source.connect(masterRef.current!)

      const startTime = ctx.currentTime + offset / speed
      source.start(startTime)
      sources.push(source)

      gateTimings.push({
        start: offset,
        end: offset + duration,
      })

      offset += duration + GAP_DURATION
    }

    // Handle end of playback
    const lastSource = sources[sources.length - 1]
    if (lastSource) {
      lastSource.onended = () => {
        if (loopingRef.current && playingRef.current) {
          playCircuit()
        } else {
          setPlaying(false)
          setCurrentGateIdx(-1)
          playbackRef.current = null
        }
      }
    }

    sourcesRef.current = sources
    playbackRef.current = {
      startTime: ctx.currentTime,
      gateTimings,
    }
    setPlaying(true)
    setCurrentGateIdx(0)
  }, [ensureCtx, stopPlayback, gatePulses, speed])

  // Track current gate during playback + compute playhead position within gate
  const gateProgressRef = useRef(0)

  useEffect(() => {
    if (!playing || !playbackRef.current) return

    let alive = true
    function tick() {
      if (!alive || !playbackRef.current || !ctxRef.current) return
      const elapsed = (ctxRef.current.currentTime - playbackRef.current.startTime) * speed
      const timings = playbackRef.current.gateTimings

      let gateIdx = -1
      for (let i = 0; i < timings.length; i++) {
        if (elapsed >= timings[i].start && elapsed < timings[i].end + GAP_DURATION) {
          gateIdx = i
          // Compute progress within this gate (0–1)
          const gateDuration = timings[i].end - timings[i].start
          gateProgressRef.current = Math.min(1, (elapsed - timings[i].start) / gateDuration)
          break
        }
      }
      if (gateIdx === -1 && elapsed < timings[timings.length - 1].end + GAP_DURATION) {
        for (let i = 0; i < timings.length; i++) {
          if (elapsed < timings[i].start) { gateIdx = i; gateProgressRef.current = 0; break }
        }
      }
      setCurrentGateIdx(gateIdx)
      requestAnimationFrame(tick)
    }
    tick()
    return () => { alive = false }
  }, [playing, speed])

  // Volume update
  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.04)
    }
  }, [volume])

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      sourcesRef.current.forEach(s => { try { s.stop() } catch {} })
      ctxRef.current?.close()
    }
  }, [])

  // ─── Waveform Visualization ────────────────────────────────────────────────
  // Always shows I/Q envelopes of the current (or previewed) gate.
  // During playback: animated playhead sweeps across the envelope.
  // Split mode: I on top half, Q on bottom half.

  // Keep refs for RAF loop
  const currentGateIdxRef = useRef(currentGateIdx)
  currentGateIdxRef.current = currentGateIdx
  const iqModeRef = useRef(iqMode)
  iqModeRef.current = iqMode
  const gateEnvelopesRef = useRef(gateEnvelopes)
  gateEnvelopesRef.current = gateEnvelopes
  const circuitRef = useRef(circuit)
  circuitRef.current = circuit

  useEffect(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    let alive = true

    function draw() {
      if (!alive || !ctx2d || !canvas) return

      const w = canvas.width
      const h = canvas.height

      // Background
      ctx2d.fillStyle = '#05050f'
      ctx2d.fillRect(0, 0, w, h)

      // Determine which gate to show
      const gIdx = currentGateIdxRef.current
      const envelopes = gateEnvelopesRef.current
      const circ = circuitRef.current
      const showIdx = gIdx >= 0 && gIdx < envelopes.length ? gIdx : 0
      const env = envelopes[showIdx]
      const gate = circ.gates[showIdx]
      const mode = iqModeRef.current

      if (env) {
        const { I, Q: Qch } = env
        const len = I.length
        const step = Math.max(1, Math.floor(len / (w / dpr)))
        const hasQ = Qch.some(v => Math.abs(v) > 0.001)

        // Find max amplitude for scaling
        let maxI = 0, maxQ = 0
        for (let i = 0; i < len; i++) {
          if (Math.abs(I[i]) > maxI) maxI = Math.abs(I[i])
          if (Math.abs(Qch[i]) > maxQ) maxQ = Math.abs(Qch[i])
        }
        const maxVal = Math.max(maxI, maxQ, 0.01)

        if (mode === 'split' && hasQ) {
          // Split mode: I on top half, Q on bottom half
          const midY = h / 2

          // Divider line
          ctx2d.strokeStyle = 'rgba(255,255,255,0.08)'
          ctx2d.lineWidth = 1
          ctx2d.beginPath()
          ctx2d.moveTo(0, midY)
          ctx2d.lineTo(w, midY)
          ctx2d.stroke()

          // Labels
          ctx2d.fillStyle = 'rgba(0,212,255,0.4)'
          ctx2d.font = `${10 * dpr}px monospace`
          ctx2d.textAlign = 'right'
          ctx2d.fillText('I(t)', w - 8 * dpr, 16 * dpr)
          ctx2d.fillStyle = 'rgba(139,92,246,0.4)'
          ctx2d.fillText('Q(t)', w - 8 * dpr, midY + 16 * dpr)

          // I-channel (top half)
          drawEnvelopeLine(ctx2d, I, len, step, w, midY / 2, midY * 0.4, maxVal, '#00d4ff', dpr)

          // Q-channel (bottom half)
          drawEnvelopeLine(ctx2d, Qch, len, step, w, midY + midY / 2, midY * 0.4, maxVal, '#8b5cf6', dpr)

          // Center lines for each half
          for (const cy of [midY / 2, midY + midY / 2]) {
            ctx2d.strokeStyle = 'rgba(255,255,255,0.04)'
            ctx2d.lineWidth = 1
            ctx2d.beginPath()
            ctx2d.moveTo(0, cy)
            ctx2d.lineTo(w, cy)
            ctx2d.stroke()
          }
        } else {
          // Overlay mode: both on same axes
          const centerY = h / 2

          // I-channel (cyan)
          drawEnvelopeLine(ctx2d, I, len, step, w, centerY, h * 0.38, maxVal, '#00d4ff', dpr)

          // I-channel glow
          ctx2d.save()
          ctx2d.shadowColor = '#00d4ff'
          ctx2d.shadowBlur = 6 * dpr
          drawEnvelopeLine(ctx2d, I, len, step, w, centerY, h * 0.38, maxVal, 'rgba(0,212,255,0.15)', dpr, 4)
          ctx2d.restore()

          // Q-channel (purple) — only if present
          if (hasQ) {
            drawEnvelopeLine(ctx2d, Qch, len, step, w, centerY, h * 0.38, maxVal, '#8b5cf6', dpr)
            // Glow
            ctx2d.save()
            ctx2d.shadowColor = '#8b5cf6'
            ctx2d.shadowBlur = 6 * dpr
            drawEnvelopeLine(ctx2d, Qch, len, step, w, centerY, h * 0.38, maxVal, 'rgba(139,92,246,0.15)', dpr, 4)
            ctx2d.restore()
          }

          // Center line
          ctx2d.strokeStyle = 'rgba(255,255,255,0.05)'
          ctx2d.lineWidth = 1
          ctx2d.beginPath()
          ctx2d.moveTo(0, centerY)
          ctx2d.lineTo(w, centerY)
          ctx2d.stroke()

          // Legend
          ctx2d.fillStyle = 'rgba(0,212,255,0.5)'
          ctx2d.font = `${10 * dpr}px monospace`
          ctx2d.textAlign = 'right'
          ctx2d.fillText('I(t)', w - 8 * dpr, 16 * dpr)
          if (hasQ) {
            ctx2d.fillStyle = 'rgba(139,92,246,0.5)'
            ctx2d.fillText('Q(t)', w - 8 * dpr, 30 * dpr)
          }
        }

        // Playhead
        if (gIdx >= 0 && playing) {
          const progress = gateProgressRef.current
          const x = progress * w
          ctx2d.strokeStyle = 'rgba(255,255,255,0.5)'
          ctx2d.lineWidth = 2 * dpr
          ctx2d.beginPath()
          ctx2d.moveTo(x, 0)
          ctx2d.lineTo(x, h)
          ctx2d.stroke()

          // Playhead glow
          ctx2d.save()
          ctx2d.shadowColor = 'rgba(255,255,255,0.6)'
          ctx2d.shadowBlur = 8 * dpr
          ctx2d.strokeStyle = 'rgba(255,255,255,0.3)'
          ctx2d.beginPath()
          ctx2d.moveTo(x, 0)
          ctx2d.lineTo(x, h)
          ctx2d.stroke()
          ctx2d.restore()
        }

        // Gate info overlay
        if (gate) {
          const color = GATE_COLORS[gate.type]
          ctx2d.fillStyle = color
          ctx2d.font = `bold ${14 * dpr}px monospace`
          ctx2d.textAlign = 'left'
          ctx2d.fillText(gate.label, 12 * dpr, 24 * dpr)

          ctx2d.fillStyle = 'rgba(255,255,255,0.35)'
          ctx2d.font = `${10 * dpr}px monospace`
          const qLabel = QUBIT_PARAMS[gate.qubit]?.label ?? `Q${gate.qubit}`
          const realNs = REAL_DURATIONS_NS[gate.type]
          const durationLabel = realNs === 0 ? 'virtual (0 ns)' : `${realNs} ns`
          ctx2d.fillText(`${qLabel}  ${durationLabel}`, 12 * dpr, 42 * dpr)

          // Pulse type annotation
          const pulseType = gate.type === 'Ry' || gate.type === 'X' ? 'DRAG'
            : gate.type === 'CZ' ? 'SNZ flux'
            : gate.type === 'Measure' ? 'GaussianSquare'
            : 'Virtual'
          ctx2d.fillText(pulseType, 12 * dpr, 56 * dpr)
        }
      }

      // Time axis markers
      if (gateEnvelopesRef.current[currentGateIdxRef.current >= 0 ? currentGateIdxRef.current : 0]) {
        const env2 = gateEnvelopesRef.current[currentGateIdxRef.current >= 0 ? currentGateIdxRef.current : 0]
        const realNs = REAL_DURATIONS_NS[circuitRef.current.gates[currentGateIdxRef.current >= 0 ? currentGateIdxRef.current : 0].type]
        if (realNs > 0) {
          ctx2d.fillStyle = 'rgba(255,255,255,0.2)'
          ctx2d.font = `${9 * dpr}px monospace`
          ctx2d.textAlign = 'left'
          ctx2d.fillText('0 ns', 4 * dpr, h - 6 * dpr)
          ctx2d.textAlign = 'center'
          ctx2d.fillText(`${Math.round(realNs / 2)} ns`, w / 2, h - 6 * dpr)
          ctx2d.textAlign = 'right'
          ctx2d.fillText(`${realNs} ns`, w - 4 * dpr, h - 6 * dpr)
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [playing, currentGateIdx, circuit, gateEnvelopes, iqMode])

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav section="synth" />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-20">
        {/* Hero */}
        <section className="mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-3">Pulse Player</p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-3">
            Hear Quantum Gate Pulses
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
            Superconducting qubits are controlled by shaped microwave pulses at ~5 GHz.
            DRAG pulses for rotations, sudden net-zero flux pulses for entanglement,
            GaussianSquare readout for measurement. These are the real waveforms from the
            literature — time-stretched to audible frequencies.
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs font-mono text-gray-500">
            <span>Time-stretched 10{'\u2077'}{'\u00d7'}</span>
            <span>&middot;</span>
            <span>30 ns {'\u2192'} 0.3 s</span>
            <span>&middot;</span>
            <span>5 GHz {'\u2192'} 440 Hz</span>
            <span>&middot;</span>
            <span>Native gate set: Ry, Rz, CZ, X</span>
          </div>
        </section>

        {/* Circuit selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CIRCUITS.map((c, i) => (
            <button
              key={c.name}
              onClick={() => {
                if (playing) stopPlayback()
                setCircuitIdx(i)
                setCurrentGateIdx(-1)
              }}
              className={`text-xs font-mono px-4 py-2 rounded-lg border transition-all ${
                circuitIdx === i
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/[0.02] border-white/10 text-gray-500 hover:text-white hover:border-white/20'
              }`}
            >
              {c.name}
            </button>
          ))}
          <span className="text-xs font-mono text-gray-500 self-center ml-2">
            {circuit.numQubits} qubit{circuit.numQubits > 1 ? 's' : ''} &middot; {circuit.gates.length} gates
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-4">{circuit.description}</p>

        {/* Visualization — two CRT panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Circuit diagram */}
          <CRTMonitor label="Circuit" rightLabel={circuit.name}>
            <div className="p-4" style={{ height: '320px', overflow: 'hidden' }}>
              <CircuitDiagram
                circuit={circuit}
                currentGateIdx={currentGateIdx}
              />
            </div>
          </CRTMonitor>

          {/* Waveform display */}
          <div className="lg:col-span-2">
            <CRTMonitor label="Pulse Envelope" rightLabel={
              currentGateIdx >= 0 ? circuit.gates[currentGateIdx]?.label : 'Select a circuit'
            }>
              {playing && (
                <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-red-400">PLAYING</span>
                </div>
              )}
              <canvas ref={waveCanvasRef} className="w-full" style={{ height: '320px' }} />
            </CRTMonitor>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            {/* Play/Stop */}
            <button
              onClick={() => playing ? stopPlayback() : playCircuit()}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                playing
                  ? 'bg-red-500/20 border-2 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'
              }`}
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="4" height="12" rx="1" />
                  <rect x="9" y="2" width="4" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <polygon points="4,1 14,8 4,15" />
                </svg>
              )}
            </button>

            {/* Loop toggle */}
            <button
              onClick={() => setLooping(!looping)}
              className={`text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                looping
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              Loop
            </button>

            {/* I/Q toggle */}
            <button
              onClick={() => setIqMode(iqMode === 'overlay' ? 'split' : 'overlay')}
              className={`text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                iqMode === 'split'
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              I/Q: {iqMode}
            </button>

            <div className="flex-1" />

            {/* Current gate info */}
            {currentGateIdx >= 0 && currentGateIdx < circuit.gates.length && (
              <div className="text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GATE_COLORS[circuit.gates[currentGateIdx].type] }} />
                <span style={{ color: GATE_COLORS[circuit.gates[currentGateIdx].type] }}>
                  {circuit.gates[currentGateIdx].label}
                </span>
                <span className="text-gray-500">
                  on {QUBIT_PARAMS[circuit.gates[currentGateIdx].qubit]?.label ?? `Q${circuit.gates[currentGateIdx].qubit}`}
                </span>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Speed</label>
                <span className="text-xs font-mono text-gray-300">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range" min="0.5" max="2" step="0.1" value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <p className="text-[10px] text-gray-600 mt-0.5">Pitch shift is physically accurate</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Volume</label>
                <span className="text-xs font-mono text-gray-300">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="0.8" step="0.01" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full accent-white"
              />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Time Stretch</label>
                <span className="text-xs font-mono text-gray-300">10{'\u2077'}{'\u00d7'}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Real pulses: ~30 ns at ~5 GHz. We stretch time 10{'\u2077'}{'\u00d7'} so 30 ns becomes 0.3 s,
                and 5 GHz maps to ~440 Hz.
              </div>
            </div>
          </div>
        </div>

        {/* Gate Legend */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-4">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Gate Pulse Types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <GateLegendItem type="Ry" desc="DRAG pulse (Motzoi 2009): lifted Gaussian I-channel, β×derivative Q-channel. 4σ truncation suppresses spectral leakage to |2⟩." realNs={REAL_DURATIONS_NS.Ry} />
            <GateLegendItem type="X" desc="π-rotation DRAG. Same shape, scaled to full flip. I(t) = A×G(t), Q(t) = β×dG/dt." realNs={REAL_DURATIONS_NS.X} />
            <GateLegendItem type="CZ" desc="Sudden Net-Zero flux (Negirneac 2021): two rectangular lobes of opposite polarity. Leakage from each lobe destructively interferes." realNs={REAL_DURATIONS_NS.CZ} />
            <GateLegendItem type="Rz" desc="Virtual Z-gate (McKay 2017): phase update in software, zero duration, zero error. No physical pulse — just a frame rotation." realNs={REAL_DURATIONS_NS.Rz} />
            <GateLegendItem type="Measure" desc="GaussianSquare readout: flat-top pulse at resonator frequency with Gaussian rise/fall ramps to limit bandwidth." realNs={REAL_DURATIONS_NS.Measure} />
          </div>
        </div>

        {/* Qubit Frequencies */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Qubit Parameters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {QUBIT_PARAMS.slice(0, circuit.numQubits).map((q, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: q.color }} />
                <div>
                  <div className="text-xs font-mono text-white">{q.label}: {q.driveFreqGHz} GHz {'\u2192'} {q.audioBaseHz} Hz</div>
                  <div className="text-[10px] text-gray-500">
                    Readout: {(q.driveFreqGHz * READOUT_FREQ_RATIO).toFixed(1)} GHz {'\u2192'} {Math.round(q.audioBaseHz * READOUT_FREQ_RATIO)} Hz
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Anharmonicity: {q.anharmonicityMHz} MHz
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-4">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-400">
            <div>
              <p className="text-white font-bold mb-1">DRAG Pulses</p>
              <p>
                Derivative Removal by Adiabatic Gate (Motzoi et al., 2009).
                The I-channel is a Gaussian truncated at {'\u00b1'}4{'\u03c3'}, lifted so edges
                are exactly zero. The Q-channel carries {'\u03b2'}{'\u00d7'}dG/dt, a derivative
                correction that suppresses leakage to the transmon{'\u2019'}s |2{'\u27E9'} state.
                We use {'\u03b2'} = 0.5 (DRAG-P regime, Gambetta et al. 2011).
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">SNZ Flux Pulses</p>
              <p>
                Sudden Net-Zero CZ (Negirneac et al., 2021). Two rectangular flux
                lobes of opposite polarity, separated by an idle gap. The {'\u201C'}sudden{'\u201D'}
                shape intentionally maximizes leakage per lobe — then the two lobes
                destructively interfere, canceling leakage while accumulating a
                conditional {'\u03C0'}-phase. Net-zero constraint: {'\u222B'}{'\u03A6'}(t)dt = 0.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">IQ Modulation</p>
              <p>
                In hardware, baseband envelopes are IQ-modulated onto a microwave
                carrier: s(t) = I(t)cos({'\u03C9'}t) {'\u2212'} Q(t)sin({'\u03C9'}t). We do the same
                at audible frequencies. The display shows the baseband envelopes
                I(t) and Q(t); the audio is the modulated signal you{'\u2019'}d see on
                an oscilloscope at the qubit drive line.
              </p>
            </div>
          </div>
        </div>

        {/* References */}
        <details className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
          <summary className="px-6 py-3 text-xs font-mono text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
            References
          </summary>
          <div className="px-6 pb-4 text-xs text-gray-500 space-y-1.5 font-mono">
            <p>Motzoi et al., {'\u201C'}Simple pulses for elimination of leakage in weakly nonlinear qubits,{'\u201D'} PRL 103, 110501 (2009)</p>
            <p>Gambetta et al., {'\u201C'}Analytic control methods for high-fidelity unitary operations,{'\u201D'} PRA 83, 012308 (2011)</p>
            <p>McKay et al., {'\u201C'}Efficient Z gates for quantum computing,{'\u201D'} PRA 96, 022330 (2017)</p>
            <p>Rol et al., {'\u201C'}Fast, high-fidelity conditional-phase gate exploiting leakage interference,{'\u201D'} PRL 123, 120502 (2019)</p>
            <p>Negirneac et al., {'\u201C'}High-fidelity controlled-Z gate with maximal intermediate leakage,{'\u201D'} PRL 126, 220502 (2021)</p>
          </div>
        </details>
      </main>
    </div>
  )
}

// ─── Drawing Helpers ────────────────────────────────────────────────────────────

function drawEnvelopeLine(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  len: number,
  step: number,
  w: number,
  centerY: number,
  halfHeight: number,
  maxVal: number,
  color: string,
  dpr: number,
  lineWidth?: number,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = (lineWidth ?? 2) * dpr
  ctx.beginPath()
  for (let i = 0; i < len; i += step) {
    const x = (i / len) * w
    const y = centerY - (data[i] / maxVal) * halfHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function GateLegendItem({ type, desc, realNs }: { type: GateType; desc: string; realNs: number }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: GATE_COLORS[type] }} />
      <div>
        <div className="text-xs font-mono font-bold text-white">
          {type}
          <span className="text-gray-500 font-normal ml-1.5">
            {realNs === 0 ? '0 ns' : `${realNs} ns`}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function CircuitDiagram({ circuit, currentGateIdx }: { circuit: CircuitDefinition; currentGateIdx: number }) {
  const wireY = (q: number) => 40 + q * 70
  const gateWidth = 44
  const gateGap = 12
  const startX = 60

  const gatePositions = circuit.gates.map((_, i) => startX + i * (gateWidth + gateGap))
  const totalWidth = Math.max(400, startX + circuit.gates.length * (gateWidth + gateGap) + 40)

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${40 + circuit.numQubits * 70}`}
      className="w-full h-full"
      style={{ maxHeight: '280px' }}
    >
      {/* Qubit wires */}
      {Array.from({ length: circuit.numQubits }, (_, q) => (
        <g key={`wire-${q}`}>
          <line
            x1={10} y1={wireY(q)}
            x2={totalWidth - 10} y2={wireY(q)}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1.5}
          />
          <text
            x={8} y={wireY(q) + 4}
            fill={QUBIT_PARAMS[q]?.color ?? '#666'}
            fontSize={11}
            fontFamily="monospace"
            textAnchor="end"
          >
            {QUBIT_PARAMS[q]?.label ?? `Q${q}`}
          </text>
        </g>
      ))}

      {/* Gates */}
      {circuit.gates.map((gate, i) => {
        const x = gatePositions[i]
        const y = wireY(gate.qubit)
        const isActive = i === currentGateIdx
        const color = GATE_COLORS[gate.type]

        return (
          <g key={`gate-${i}`}>
            {/* CZ connection line */}
            {gate.type === 'CZ' && gate.controlQubit !== undefined && (
              <line
                x1={x + gateWidth / 2}
                y1={wireY(gate.controlQubit)}
                x2={x + gateWidth / 2}
                y2={wireY(gate.qubit)}
                stroke={isActive ? color : 'rgba(255,107,157,0.3)'}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
            )}

            {/* Control dot for CZ */}
            {gate.type === 'CZ' && gate.controlQubit !== undefined && (
              <circle
                cx={x + gateWidth / 2}
                cy={wireY(gate.controlQubit)}
                r={isActive ? 5 : 4}
                fill={isActive ? color : 'rgba(255,107,157,0.5)'}
              />
            )}

            {/* Gate glow when active */}
            {isActive && (
              <rect
                x={x - 4} y={y - 18}
                width={gateWidth + 8} height={36}
                rx={8}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={0.4}
                filter="url(#glow)"
              />
            )}

            {/* Gate box */}
            <rect
              x={x} y={y - 14}
              width={gateWidth} height={28}
              rx={4}
              fill={isActive ? `${color}30` : 'rgba(255,255,255,0.04)'}
              stroke={isActive ? color : 'rgba(255,255,255,0.12)'}
              strokeWidth={isActive ? 2 : 1}
            />

            {/* Gate label */}
            <text
              x={x + gateWidth / 2}
              y={y + 4}
              fill={isActive ? '#fff' : color}
              fontSize={gate.label.length > 5 ? 9 : 11}
              fontFamily="monospace"
              fontWeight={isActive ? 'bold' : 'normal'}
              textAnchor="middle"
            >
              {gate.label}
            </text>
          </g>
        )
      })}

      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
