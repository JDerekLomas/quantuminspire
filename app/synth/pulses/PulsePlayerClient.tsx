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

// ─── Pulse Scheduling ────────────────────────────────────────────────────────────
// Places gates on a timeline allowing parallelism across qubits.
// In real hardware, gates on independent qubits execute simultaneously.

const GATE_GAP_NS = 4 // ~4 ns buffer between sequential gates (hardware scheduling granularity)

interface ScheduledGate {
  gateIdx: number
  gate: GateInstance
  startNs: number
  endNs: number
  startAudio: number  // seconds (time-stretched for audio playback)
  endAudio: number
  channels: number[]  // qubit indices this gate occupies
}

function scheduleCircuit(circuit: CircuitDefinition): { scheduled: ScheduledGate[]; totalNs: number } {
  const qubitAvail: number[] = new Array(circuit.numQubits).fill(0)
  const scheduled: ScheduledGate[] = []

  for (let i = 0; i < circuit.gates.length; i++) {
    const gate = circuit.gates[i]
    const durationNs = REAL_DURATIONS_NS[gate.type]

    // Affected qubits
    const qubits = gate.type === 'CZ' && gate.controlQubit !== undefined
      ? [gate.qubit, gate.controlQubit]
      : [gate.qubit]

    // Earliest start: max availability across affected qubits
    let startNs = Math.max(...qubits.map(q => qubitAvail[q]))

    // Add gap after previous gate (skip for first gate or virtual gates)
    if (startNs > 0 && durationNs > 0) startNs += GATE_GAP_NS

    const endNs = startNs + durationNs

    // Update availability
    const nextAvail = durationNs > 0 ? endNs : startNs // Rz doesn't block
    for (const q of qubits) {
      qubitAvail[q] = nextAvail
    }

    scheduled.push({
      gateIdx: i,
      gate,
      startNs,
      endNs,
      startAudio: startNs * TIME_STRETCH / 1e9,
      endAudio: startNs * TIME_STRETCH / 1e9 + GATE_DURATIONS[gate.type],
      channels: qubits,
    })
  }

  const maxEnd = scheduled.length > 0 ? Math.max(...scheduled.map(sg => sg.endNs)) : 1
  return { scheduled, totalNs: Math.max(maxEnd, 1) }
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

  // Refs
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const playbackRef = useRef<{ startTime: number } | null>(null)
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number>(0)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const loopingRef = useRef(looping)
  loopingRef.current = looping
  const playingRef = useRef(playing)
  playingRef.current = playing

  const circuit = CIRCUITS[circuitIdx]

  // Schedule gates on timeline (parallel where possible)
  const { scheduled: scheduledGates, totalNs } = useMemo(() => scheduleCircuit(circuit), [circuit])

  // Pre-compute envelopes and audio buffers
  const gateEnvelopes = useMemo(() => circuit.gates.map(generateEnvelope), [circuit])
  const gatePulses = useMemo(
    () => circuit.gates.map((gate, i) => modulateToAudio(gateEnvelopes[i], gate)),
    [circuit, gateEnvelopes],
  )

  // Total audio duration (accounts for parallel scheduling)
  const totalAudioDuration = useMemo(() => {
    if (scheduledGates.length === 0) return 0
    return Math.max(...scheduledGates.map(sg => {
      const audioDur = gatePulses[sg.gateIdx].length / SAMPLE_RATE
      return sg.startAudio + audioDur
    }))
  }, [scheduledGates, gatePulses])

  // Audio setup
  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      masterRef.current = ctxRef.current.createGain()
      masterRef.current.gain.value = volume
      masterRef.current.connect(ctxRef.current.destination)
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [volume])

  // Stop all playback
  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop() } catch {} })
    sourcesRef.current = []
    playbackRef.current = null
    if (endTimerRef.current) { clearTimeout(endTimerRef.current); endTimerRef.current = null }
    setPlaying(false)
    setCurrentGateIdx(-1)
  }, [])

  // Schedule and play circuit with parallel timing
  const playCircuit = useCallback(() => {
    const ctx = ensureCtx()
    stopPlayback()

    const sources: AudioBufferSourceNode[] = []
    const baseTime = ctx.currentTime + 0.05

    for (let i = 0; i < scheduledGates.length; i++) {
      const sg = scheduledGates[i]
      const pulse = gatePulses[sg.gateIdx]

      const audioBuffer = ctx.createBuffer(1, pulse.length, SAMPLE_RATE)
      audioBuffer.getChannelData(0).set(pulse)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.playbackRate.value = speed
      source.connect(masterRef.current!)

      // Start at scheduled time — parallel gates play simultaneously
      source.start(baseTime + sg.startAudio / speed)
      sources.push(source)
    }

    // End-of-playback timer
    endTimerRef.current = setTimeout(() => {
      if (loopingRef.current && playingRef.current) {
        playCircuit()
      } else {
        setPlaying(false)
        setCurrentGateIdx(-1)
        playbackRef.current = null
      }
    }, (totalAudioDuration / speed + 0.15) * 1000)

    sourcesRef.current = sources
    playbackRef.current = { startTime: baseTime }
    setPlaying(true)
    setCurrentGateIdx(0)
  }, [ensureCtx, stopPlayback, scheduledGates, gatePulses, speed, totalAudioDuration])

  // Track current gate during playback
  useEffect(() => {
    if (!playing || !playbackRef.current) return

    let alive = true
    function tick() {
      if (!alive || !playbackRef.current || !ctxRef.current) return
      const elapsed = (ctxRef.current.currentTime - playbackRef.current.startTime) * speed

      // Find the most recently started gate
      let activeIdx = -1
      for (let i = scheduledGates.length - 1; i >= 0; i--) {
        const sg = scheduledGates[i]
        if (elapsed >= sg.startAudio && elapsed < sg.endAudio + 0.03) {
          activeIdx = sg.gateIdx
          break
        }
      }
      setCurrentGateIdx(activeIdx)
      requestAnimationFrame(tick)
    }
    tick()
    return () => { alive = false }
  }, [playing, speed, scheduledGates])

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
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
      sourcesRef.current.forEach(s => { try { s.stop() } catch {} })
      ctxRef.current?.close()
    }
  }, [])

  // ─── Pulse Schedule Canvas ──────────────────────────────────────────────────
  // Multi-qubit view: each qubit gets a horizontal lane, pulses placed at
  // their scheduled time positions with actual envelope shapes.

  const currentGateIdxRef = useRef(currentGateIdx)
  currentGateIdxRef.current = currentGateIdx
  const scheduledGatesRef = useRef(scheduledGates)
  scheduledGatesRef.current = scheduledGates
  const gateEnvelopesRef = useRef(gateEnvelopes)
  gateEnvelopesRef.current = gateEnvelopes
  const circuitRef = useRef(circuit)
  circuitRef.current = circuit
  const totalNsRef = useRef(totalNs)
  totalNsRef.current = totalNs

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
      const circ = circuitRef.current
      const sched = scheduledGatesRef.current
      const envelopes = gateEnvelopesRef.current
      const tNs = totalNsRef.current
      const nQ = circ.numQubits

      // Background
      ctx2d.fillStyle = '#05050f'
      ctx2d.fillRect(0, 0, w, h)

      // Layout
      const marginLeft = 52 * dpr
      const marginRight = 16 * dpr
      const marginTop = 8 * dpr
      const marginBottom = 28 * dpr
      const plotW = w - marginLeft - marginRight
      const plotH = h - marginTop - marginBottom
      const laneH = plotH / nQ
      const envHalf = laneH * 0.38

      // Time mapping
      const displayNs = Math.max(tNs * 1.04, 10) // 4% right padding
      const nsToX = (ns: number) => marginLeft + (ns / displayNs) * plotW

      // ── Channel lanes ──
      for (let q = 0; q < nQ; q++) {
        const laneTop = marginTop + q * laneH
        const centerY = laneTop + laneH / 2

        // Alternating background
        if (q % 2 === 1) {
          ctx2d.fillStyle = 'rgba(255,255,255,0.012)'
          ctx2d.fillRect(marginLeft, laneTop, plotW, laneH)
        }

        // Zero line
        ctx2d.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx2d.lineWidth = 1
        ctx2d.beginPath()
        ctx2d.moveTo(marginLeft, centerY)
        ctx2d.lineTo(w - marginRight, centerY)
        ctx2d.stroke()

        // Lane separator
        if (q > 0) {
          ctx2d.strokeStyle = 'rgba(255,255,255,0.04)'
          ctx2d.beginPath()
          ctx2d.moveTo(marginLeft, laneTop)
          ctx2d.lineTo(w - marginRight, laneTop)
          ctx2d.stroke()
        }

        // Qubit label
        const qp = QUBIT_PARAMS[q]
        ctx2d.fillStyle = qp?.color ?? '#666'
        ctx2d.font = `bold ${11 * dpr}px monospace`
        ctx2d.textAlign = 'right'
        ctx2d.textBaseline = 'middle'
        ctx2d.fillText(qp?.label ?? `Q${q}`, marginLeft - 10 * dpr, centerY - 6 * dpr)

        // Frequency
        ctx2d.fillStyle = 'rgba(255,255,255,0.18)'
        ctx2d.font = `${8 * dpr}px monospace`
        ctx2d.fillText(`${qp?.driveFreqGHz ?? '?'}G`, marginLeft - 10 * dpr, centerY + 8 * dpr)
      }

      // ── Gate envelopes ──
      for (const sg of sched) {
        const env = envelopes[sg.gateIdx]
        if (!env) continue

        const gate = sg.gate
        const color = GATE_COLORS[gate.type]
        const isActive = sg.gateIdx === currentGateIdxRef.current
        const q = gate.qubit
        const centerY = marginTop + q * laneH + laneH / 2

        const x1 = nsToX(sg.startNs)
        const x2 = nsToX(sg.endNs)
        const gateW = x2 - x1

        // ── Virtual Rz: dashed marker ──
        if (gate.type === 'Rz') {
          ctx2d.strokeStyle = isActive ? color : `${color}70`
          ctx2d.lineWidth = 2 * dpr
          ctx2d.setLineDash([4 * dpr, 3 * dpr])
          ctx2d.beginPath()
          ctx2d.moveTo(x1, centerY - envHalf * 0.8)
          ctx2d.lineTo(x1, centerY + envHalf * 0.8)
          ctx2d.stroke()
          ctx2d.setLineDash([])

          // Label
          ctx2d.fillStyle = isActive ? color : `${color}50`
          ctx2d.font = `${8 * dpr}px monospace`
          ctx2d.textAlign = 'center'
          ctx2d.textBaseline = 'bottom'
          ctx2d.fillText('Rz', x1, centerY - envHalf * 0.8 - 2 * dpr)
          continue
        }

        // ── CZ connection line ──
        if (gate.type === 'CZ' && gate.controlQubit !== undefined) {
          const ctrlCenterY = marginTop + gate.controlQubit * laneH + laneH / 2
          const midX = (x1 + x2) / 2

          // Dashed connection
          ctx2d.strokeStyle = isActive ? `${color}70` : `${color}25`
          ctx2d.lineWidth = 2 * dpr
          ctx2d.setLineDash([3 * dpr, 3 * dpr])
          ctx2d.beginPath()
          ctx2d.moveTo(midX, Math.min(centerY, ctrlCenterY) - envHalf * 0.3)
          ctx2d.lineTo(midX, Math.max(centerY, ctrlCenterY) + envHalf * 0.3)
          ctx2d.stroke()
          ctx2d.setLineDash([])

          // Control dot
          ctx2d.beginPath()
          ctx2d.arc(midX, ctrlCenterY, 4 * dpr, 0, Math.PI * 2)
          ctx2d.fillStyle = isActive ? color : `${color}50`
          ctx2d.fill()
        }

        // ── Envelope shape ──
        const { I } = env
        const len = I.length

        // Find max for normalization
        let maxAbs = 0
        for (let s = 0; s < len; s++) {
          if (Math.abs(I[s]) > maxAbs) maxAbs = Math.abs(I[s])
        }
        maxAbs = Math.max(maxAbs, 0.01)

        // Active glow
        if (isActive) {
          ctx2d.save()
          ctx2d.shadowColor = color
          ctx2d.shadowBlur = 10 * dpr
          ctx2d.fillStyle = `${color}10`
          ctx2d.fillRect(x1, centerY - envHalf, gateW, envHalf * 2)
          ctx2d.restore()
        }

        // Filled envelope path
        const pixStep = Math.max(1, Math.floor(len / Math.max(gateW / dpr, 1)))
        ctx2d.beginPath()
        ctx2d.moveTo(x1, centerY)
        for (let s = 0; s < len; s += pixStep) {
          const x = x1 + (s / len) * gateW
          const y = centerY - (I[s] / maxAbs) * envHalf
          ctx2d.lineTo(x, y)
        }
        ctx2d.lineTo(x2, centerY)
        ctx2d.closePath()

        ctx2d.fillStyle = isActive ? `${color}35` : `${color}18`
        ctx2d.fill()

        // Envelope stroke
        ctx2d.strokeStyle = isActive ? color : `${color}70`
        ctx2d.lineWidth = (isActive ? 2 : 1.5) * dpr
        ctx2d.beginPath()
        for (let s = 0; s < len; s += pixStep) {
          const x = x1 + (s / len) * gateW
          const y = centerY - (I[s] / maxAbs) * envHalf
          if (s === 0) ctx2d.moveTo(x, y)
          else ctx2d.lineTo(x, y)
        }
        ctx2d.stroke()

        // CZ: mirror envelope on control qubit lane (smaller)
        if (gate.type === 'CZ' && gate.controlQubit !== undefined) {
          const ctrlCenterY = marginTop + gate.controlQubit * laneH + laneH / 2
          const smallHalf = envHalf * 0.5

          ctx2d.beginPath()
          ctx2d.moveTo(x1, ctrlCenterY)
          for (let s = 0; s < len; s += pixStep) {
            const x = x1 + (s / len) * gateW
            const y = ctrlCenterY - (I[s] / maxAbs) * smallHalf
            ctx2d.lineTo(x, y)
          }
          ctx2d.lineTo(x2, ctrlCenterY)
          ctx2d.closePath()
          ctx2d.fillStyle = isActive ? `${color}20` : `${color}0c`
          ctx2d.fill()
        }

        // Gate label
        if (gateW > 20 * dpr) {
          ctx2d.fillStyle = isActive ? '#fff' : `${color}80`
          ctx2d.font = `${(isActive ? 10 : 9) * dpr}px monospace`
          ctx2d.textAlign = 'center'
          ctx2d.textBaseline = 'bottom'
          ctx2d.fillText(gate.label, (x1 + x2) / 2, centerY - envHalf - 3 * dpr)
        }
      }

      // ── Time axis ──
      const axisY = h - marginBottom
      ctx2d.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx2d.lineWidth = 1
      ctx2d.beginPath()
      ctx2d.moveTo(marginLeft, axisY)
      ctx2d.lineTo(w - marginRight, axisY)
      ctx2d.stroke()

      // Tick marks
      const nTicks = Math.min(10, Math.max(3, Math.floor(plotW / (70 * dpr))))
      const rawStep = tNs / nTicks
      const niceStep = rawStep < 10 ? Math.ceil(rawStep) :
                       rawStep < 50 ? Math.ceil(rawStep / 5) * 5 :
                       rawStep < 100 ? Math.ceil(rawStep / 10) * 10 :
                       rawStep < 500 ? Math.ceil(rawStep / 50) * 50 :
                       Math.ceil(rawStep / 100) * 100

      ctx2d.fillStyle = 'rgba(255,255,255,0.25)'
      ctx2d.font = `${9 * dpr}px monospace`
      ctx2d.textBaseline = 'top'

      for (let ns = 0; ns <= tNs + niceStep * 0.5; ns += Math.max(niceStep, 1)) {
        const x = nsToX(ns)
        if (x > w - marginRight + 5 * dpr) break

        // Tick
        ctx2d.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx2d.beginPath()
        ctx2d.moveTo(x, axisY)
        ctx2d.lineTo(x, axisY + 4 * dpr)
        ctx2d.stroke()

        // Grid line
        ctx2d.strokeStyle = 'rgba(255,255,255,0.025)'
        ctx2d.beginPath()
        ctx2d.moveTo(x, marginTop)
        ctx2d.lineTo(x, axisY)
        ctx2d.stroke()

        // Label
        ctx2d.fillStyle = 'rgba(255,255,255,0.25)'
        ctx2d.textAlign = 'center'
        ctx2d.fillText(`${ns}`, x, axisY + 5 * dpr)
      }

      // Unit label
      ctx2d.textAlign = 'right'
      ctx2d.fillStyle = 'rgba(255,255,255,0.2)'
      ctx2d.fillText('ns', w - marginRight, axisY + 5 * dpr)

      // Total duration annotation
      ctx2d.textAlign = 'left'
      ctx2d.fillStyle = 'rgba(255,255,255,0.2)'
      ctx2d.font = `${8 * dpr}px monospace`
      const seqNs = circuit.gates.reduce((s, g) => s + REAL_DURATIONS_NS[g.type] + GATE_GAP_NS, 0)
      const speedup = seqNs > 0 ? (seqNs / tNs).toFixed(1) : '1.0'
      ctx2d.fillText(
        `${tNs} ns total` + (nQ > 1 ? ` (${speedup}× vs sequential)` : ''),
        marginLeft, h - 2 * dpr,
      )

      // ── Playhead ──
      if (playing && playbackRef.current && ctxRef.current) {
        const elapsed = (ctxRef.current.currentTime - playbackRef.current.startTime) * speed
        const elapsedNs = elapsed * 1e9 / TIME_STRETCH
        if (elapsedNs >= 0 && elapsedNs <= displayNs) {
          const x = nsToX(elapsedNs)

          // Glow
          ctx2d.save()
          ctx2d.shadowColor = 'rgba(255,255,255,0.6)'
          ctx2d.shadowBlur = 10 * dpr
          ctx2d.strokeStyle = 'rgba(255,255,255,0.7)'
          ctx2d.lineWidth = 2 * dpr
          ctx2d.beginPath()
          ctx2d.moveTo(x, marginTop)
          ctx2d.lineTo(x, axisY)
          ctx2d.stroke()
          ctx2d.restore()

          // Timestamp
          ctx2d.fillStyle = 'rgba(255,255,255,0.4)'
          ctx2d.font = `${8 * dpr}px monospace`
          ctx2d.textAlign = 'center'
          ctx2d.textBaseline = 'bottom'
          ctx2d.fillText(`${Math.round(elapsedNs)} ns`, x, marginTop - 1 * dpr)
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [playing, currentGateIdx, circuit, gateEnvelopes, scheduledGates, totalNs])

  // ─── Render ───────────────────────────────────────────────────────────────────

  const canvasHeight = Math.max(280, circuit.numQubits * 120 + 40)

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
            The schedule shows how pulses play across multiple qubits simultaneously —
            gates on independent qubits overlap in time, just like real hardware.
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
            {circuit.numQubits > 1 && (
              <span className="text-gray-600 ml-1">
                &middot; {scheduledGates.filter((sg, i, arr) =>
                  arr.some((other, j) => j !== i && sg.startNs < other.endNs && other.startNs < sg.endNs)
                ).length} parallel
              </span>
            )}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-4">{circuit.description}</p>

        {/* Pulse Schedule */}
        <div className="mb-4">
          <CRTMonitor label="Pulse Schedule" rightLabel={`${totalNs} ns`}>
            {playing && (
              <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-mono text-red-400">PLAYING</span>
              </div>
            )}
            <canvas ref={waveCanvasRef} className="w-full" style={{ height: `${canvasHeight}px` }} />
          </CRTMonitor>
        </div>

        {/* Circuit diagram */}
        <div className="mb-4">
          <CRTMonitor label="Circuit" rightLabel={circuit.name}>
            <div className="p-4" style={{ height: '180px', overflow: 'hidden' }}>
              <CircuitDiagram
                circuit={circuit}
                currentGateIdx={currentGateIdx}
              />
            </div>
          </CRTMonitor>
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
              <p className="text-white font-bold mb-1">Parallel Scheduling</p>
              <p>
                Gates on independent qubits execute simultaneously, just like real hardware.
                The schedule shows how a {circuit.numQubits > 1 ? `${circuit.numQubits}-qubit` : 'single-qubit'} circuit
                maps to physical pulses. CZ gates block both qubits; single-qubit gates only block one.
                {circuit.numQubits > 1 && ` This circuit takes ${totalNs} ns — shorter than
                sequential because parallel gates overlap.`}
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">DRAG Pulses</p>
              <p>
                Derivative Removal by Adiabatic Gate (Motzoi et al., 2009).
                The I-channel is a Gaussian truncated at {'\u00b1'}4{'\u03c3'}, lifted so edges
                are exactly zero. The Q-channel carries {'\u03b2'}{'\u00d7'}dG/dt, a derivative
                correction that suppresses leakage to the transmon{'\u2019'}s |2{'\u27E9'} state.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">SNZ Flux Pulses</p>
              <p>
                Sudden Net-Zero CZ (Negirneac et al., 2021). Two rectangular flux
                lobes of opposite polarity, separated by an idle gap. The {'\u201C'}sudden{'\u201D'}
                shape intentionally maximizes leakage per lobe — then the two lobes
                destructively interfere, canceling leakage while accumulating a
                conditional {'\u03C0'}-phase.
              </p>
            </div>
          </div>
        </div>

        {/* Why these frequencies */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-4">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Why These Frequencies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-400">
            <div>
              <p className="text-white font-bold mb-1">Resonance</p>
              <p>
                These pulses only work because the microwave frequency matches the qubit{'\u2019'}s
                energy gap: E = h{'\u00d7'}f. A 5 GHz qubit absorbs 5 GHz photons. Off-resonance,
                the pulse bounces off. This is the same physics as tuning a radio — you pick up
                the station that matches your antenna{'\u2019'}s resonant frequency.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">Frequency Multiplexing</p>
              <p>
                Each qubit is fabricated at a slightly different frequency (5.0, 5.2, 5.4 GHz).
                A pulse at 5.0 GHz rotates Q0 without disturbing Q1 or Q2 — like
                speaking to one person in a room by using their name. This is why you hear
                different pitches for each qubit.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">Explore Further</p>
              <p className="mb-2">
                The Resonance module covers spectroscopy, Lorentzian peaks, and
                avoided crossings — the physics that determines these frequencies.
              </p>
              <a
                href="/resonance"
                className="inline-flex items-center gap-1.5 text-[#f59e0b] hover:underline font-mono"
              >
                Resonance {'\u2192'}
              </a>
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
  const wireY = (q: number) => 30 + q * 50
  const gateWidth = 44
  const gateGap = 12
  const startX = 60

  const gatePositions = circuit.gates.map((_, i) => startX + i * (gateWidth + gateGap))
  const totalWidth = Math.max(400, startX + circuit.gates.length * (gateWidth + gateGap) + 40)

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${30 + circuit.numQubits * 50}`}
      className="w-full h-full"
      style={{ maxHeight: '160px' }}
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
