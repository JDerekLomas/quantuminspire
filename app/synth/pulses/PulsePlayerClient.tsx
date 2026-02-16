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

// ─── Constants ──────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 44100
const TIME_STRETCH = 1e7 // 50ns → 0.5s

// Qubit parameters — 3 qubits with distinct frequencies
const QUBIT_PARAMS = [
  { driveFreqGHz: 5.0, audioBaseHz: 440, color: '#00d4ff', label: 'Q0' },
  { driveFreqGHz: 5.2, audioBaseHz: 484, color: '#8b5cf6', label: 'Q1' },
  { driveFreqGHz: 5.4, audioBaseHz: 528, color: '#00ff88', label: 'Q2' },
]

// Gate colors
const GATE_COLORS: Record<GateType, string> = {
  Ry: '#00d4ff',
  Rz: '#f59e0b',
  CZ: '#ff6b9d',
  X: '#8b5cf6',
  Measure: '#00ff88',
}

// Gate durations in seconds (after time stretch)
const GATE_DURATIONS: Record<GateType, number> = {
  Ry: 0.5,   // 50ns DRAG pulse → 0.5s
  Rz: 0.05,  // Virtual gate — brief click
  CZ: 0.6,   // 60ns flux pulse → 0.6s
  X: 0.5,    // Same as Ry (π rotation)
  Measure: 0.8, // 80ns readout → 0.8s
}

const GAP_DURATION = 0.05 // 50ms silence between gates

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

// ─── Pulse Generation ───────────────────────────────────────────────────────────

function generateDRAGPulse(qubitIdx: number, durationS: number, angle: number = Math.PI / 2): Float32Array {
  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const buffer = new Float32Array(numSamples)
  const audioFreq = QUBIT_PARAMS[qubitIdx].audioBaseHz
  const omega = 2 * Math.PI * audioFreq
  const sigma = durationS * 0.18
  const t0 = durationS / 2
  const beta = 0.4
  const ampScale = Math.abs(angle) / (Math.PI / 2) // scale amplitude by rotation angle

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const dt = t - t0
    // Gaussian envelope
    const I = ampScale * Math.exp(-0.5 * (dt / sigma) ** 2)
    // DRAG derivative correction
    const Q = beta * (-dt / (sigma * sigma)) * I
    // IQ modulation at qubit audio frequency
    buffer[i] = I * Math.cos(omega * t) - Q * Math.sin(omega * t)
  }

  return buffer
}

function generateCZPulse(qubitIdx: number, controlIdx: number, durationS: number): Float32Array {
  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const buffer = new Float32Array(numSamples)
  // Net-zero flux pulse: positive lobe + negative lobe (baseband)
  const carrierFreq = 100 // Low bass carrier for flux
  const omega = 2 * Math.PI * carrierFreq
  const sigma = durationS * 0.15
  const t1 = durationS * 0.3  // center of positive lobe
  const t2 = durationS * 0.7  // center of negative lobe

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const posLobe = Math.exp(-0.5 * ((t - t1) / sigma) ** 2)
    const negLobe = -Math.exp(-0.5 * ((t - t2) / sigma) ** 2)
    const envelope = posLobe + negLobe
    buffer[i] = envelope * Math.cos(omega * t)
  }

  return buffer
}

function generateRzClick(durationS: number): Float32Array {
  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const buffer = new Float32Array(numSamples)
  // Decaying click — no physical pulse, just a marker
  const freq = 1200
  const omega = 2 * Math.PI * freq
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    buffer[i] = 0.6 * Math.exp(-t / 0.008) * Math.sin(omega * t)
  }
  return buffer
}

function generateMeasurePulse(qubitIdx: number, durationS: number): Float32Array {
  const numSamples = Math.round(durationS * SAMPLE_RATE)
  const buffer = new Float32Array(numSamples)
  // Readout frequency is ~1.4x drive frequency
  const readoutFreq = QUBIT_PARAMS[qubitIdx].audioBaseHz * 1.4
  const omega = 2 * Math.PI * readoutFreq
  const rampTime = durationS * 0.15

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    // Flat-top with Gaussian ramps
    let envelope = 1
    if (t < rampTime) {
      envelope = Math.exp(-0.5 * ((t - rampTime) / (rampTime * 0.4)) ** 2)
    } else if (t > durationS - rampTime) {
      envelope = Math.exp(-0.5 * ((t - (durationS - rampTime)) / (rampTime * 0.4)) ** 2)
    }
    buffer[i] = 0.7 * envelope * Math.cos(omega * t)
  }

  return buffer
}

function generateGatePulse(gate: GateInstance): Float32Array {
  const duration = GATE_DURATIONS[gate.type]
  switch (gate.type) {
    case 'Ry':
      return generateDRAGPulse(gate.qubit, duration, gate.angle ?? Math.PI / 2)
    case 'X':
      return generateDRAGPulse(gate.qubit, duration, Math.PI)
    case 'CZ':
      return generateCZPulse(gate.qubit, gate.controlQubit ?? 0, duration)
    case 'Rz':
      return generateRzClick(duration)
    case 'Measure':
      return generateMeasurePulse(gate.qubit, duration)
  }
}

// Generate silence gap
function generateSilence(durationS: number): Float32Array {
  return new Float32Array(Math.round(durationS * SAMPLE_RATE))
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

  // Pre-compute gate pulses
  const gatePulses = useMemo(() => circuit.gates.map(generateGatePulse), [circuit])

  // Gate I/Q channels for visualization (pre-compute separately)
  const gateIQData = useMemo(() => circuit.gates.map(gate => {
    const duration = GATE_DURATIONS[gate.type]
    const numSamples = Math.round(duration * SAMPLE_RATE)
    const I = new Float32Array(numSamples)
    const Q = new Float32Array(numSamples)

    if (gate.type === 'Ry' || gate.type === 'X') {
      const sigma = duration * 0.18
      const t0 = duration / 2
      const beta = 0.4
      const ampScale = gate.type === 'X' ? 2 : Math.abs(gate.angle ?? Math.PI / 2) / (Math.PI / 2)
      for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE
        const dt = t - t0
        I[i] = ampScale * Math.exp(-0.5 * (dt / sigma) ** 2)
        Q[i] = beta * (-dt / (sigma * sigma)) * I[i]
      }
    } else if (gate.type === 'CZ') {
      const sigma = duration * 0.15
      const t1 = duration * 0.3
      const t2 = duration * 0.7
      for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE
        I[i] = Math.exp(-0.5 * ((t - t1) / sigma) ** 2) - Math.exp(-0.5 * ((t - t2) / sigma) ** 2)
        Q[i] = 0
      }
    } else if (gate.type === 'Measure') {
      const rampTime = duration * 0.15
      for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE
        let envelope = 1
        if (t < rampTime) {
          envelope = Math.exp(-0.5 * ((t - rampTime) / (rampTime * 0.4)) ** 2)
        } else if (t > duration - rampTime) {
          envelope = Math.exp(-0.5 * ((t - (duration - rampTime)) / (rampTime * 0.4)) ** 2)
        }
        I[i] = 0.7 * envelope
        Q[i] = 0
      }
    } else if (gate.type === 'Rz') {
      for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE
        I[i] = 0.6 * Math.exp(-t / 0.008)
        Q[i] = 0
      }
    }

    return { I, Q }
  }), [circuit])

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
    const totalDuration = offset / speed
    const lastSource = sources[sources.length - 1]
    if (lastSource) {
      lastSource.onended = () => {
        if (loopingRef.current && playingRef.current) {
          // Re-trigger
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

  // Track current gate during playback
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
          break
        }
      }
      if (gateIdx === -1 && elapsed < timings[timings.length - 1].end + GAP_DURATION) {
        // In a gap — show the next gate
        for (let i = 0; i < timings.length; i++) {
          if (elapsed < timings[i].start) { gateIdx = i; break }
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

  useEffect(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let alive = true

    function draw() {
      if (!alive || !ctx || !canvas) return

      const w = canvas.width
      const h = canvas.height

      // Background
      ctx.fillStyle = '#05050f'
      ctx.fillRect(0, 0, w, h)

      if (playing && analyserRef.current && timeDomainRef.current) {
        // Live waveform from analyser
        analyserRef.current.getFloatTimeDomainData(timeDomainRef.current)
        const data = timeDomainRef.current
        const len = data.length

        // I-channel (cyan) — the raw waveform
        ctx.strokeStyle = '#00d4ff'
        ctx.lineWidth = 2 * dpr
        ctx.beginPath()
        for (let i = 0; i < len; i++) {
          const x = (i / len) * w
          const y = h / 2 - data[i] * h * 0.4
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Glow effect
        ctx.save()
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur = 8
        ctx.strokeStyle = 'rgba(0,212,255,0.3)'
        ctx.lineWidth = 4 * dpr
        ctx.beginPath()
        for (let i = 0; i < len; i++) {
          const x = (i / len) * w
          const y = h / 2 - data[i] * h * 0.4
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      } else if (currentGateIdx === -1) {
        // Show idle state — draw the I/Q envelopes of the first gate as preview
        const iq = gateIQData[0]
        if (iq) {
          drawIQEnvelope(ctx, w, h, iq.I, iq.Q, dpr)
        }
      }

      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()

      // Gate info overlay
      if (currentGateIdx >= 0 && currentGateIdx < circuit.gates.length) {
        const gate = circuit.gates[currentGateIdx]
        ctx.fillStyle = GATE_COLORS[gate.type]
        ctx.font = `bold ${14 * dpr}px monospace`
        ctx.textAlign = 'left'
        ctx.fillText(gate.label, 12 * dpr, 24 * dpr)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.font = `${10 * dpr}px monospace`
        ctx.fillText(`${QUBIT_PARAMS[gate.qubit]?.label ?? `Q${gate.qubit}`}`, 12 * dpr, 42 * dpr)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [playing, currentGateIdx, circuit, gateIQData])

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
            DRAG pulses for rotations, flux pulses for entanglement, flat-top readout pulses
            for measurement. These are the actual waveforms — mapped to audible frequencies.
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs font-mono text-gray-500">
            <span>Time-stretched 10,000,000{'\u00d7'}</span>
            <span>&middot;</span>
            <span>50 ns {'\u2192'} 0.5 s</span>
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
            <CRTMonitor label="Waveform" rightLabel={playing ? 'LIVE' : 'PREVIEW'}>
              {playing && (
                <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-red-400">LIVE</span>
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
              className="text-xs font-mono px-3 py-2 rounded-lg border bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
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
                Real pulses: ~50 ns at ~5 GHz. We stretch time 10M{'\u00d7'} so 50 ns becomes 0.5 s,
                and 5 GHz becomes ~440 Hz.
              </div>
            </div>
          </div>
        </div>

        {/* Gate Legend */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-4">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Gate Types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <GateLegendItem type="Ry" desc="DRAG pulse: Gaussian I-channel + derivative Q-channel. Rotates qubit on the Bloch sphere." />
            <GateLegendItem type="X" desc="Pi-rotation DRAG. Same shape, double amplitude. Flips |0⟩ to |1⟩." />
            <GateLegendItem type="CZ" desc="Net-zero flux pulse. Tunes qubit frequency to an avoided crossing. Deep bass." />
            <GateLegendItem type="Rz" desc="Virtual gate — phase update in software. No physical pulse. Just a click." />
            <GateLegendItem type="Measure" desc="Flat-top readout at 1.4x drive frequency. Gaussian ramp-up and ramp-down." />
          </div>
        </div>

        {/* Qubit Frequencies */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Qubit Frequencies</h3>
          <div className="grid grid-cols-3 gap-4">
            {QUBIT_PARAMS.slice(0, circuit.numQubits).map((q, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: q.color }} />
                <div>
                  <div className="text-xs font-mono text-white">{q.label}: {q.driveFreqGHz} GHz {'\u2192'} {q.audioBaseHz} Hz</div>
                  <div className="text-[10px] text-gray-500">Readout: {(q.driveFreqGHz * 1.4).toFixed(1)} GHz {'\u2192'} {Math.round(q.audioBaseHz * 1.4)} Hz</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-400">
            <div>
              <p className="text-white font-bold mb-1">Real Physics</p>
              <p>
                Every pulse shape comes from actual superconducting qubit physics.
                DRAG (Derivative Removal by Adiabatic Gate) corrects for leakage
                to the |2{'\u27E9'} state. The Q-channel carries the derivative correction.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">IQ Modulation</p>
              <p>
                In hardware, pulses are I/Q modulated onto a microwave carrier at the
                qubit frequency: s(t) = I(t)cos({'\u03C9'}t) - Q(t)sin({'\u03C9'}t). We do the
                same thing, but at audible frequencies instead of ~5 GHz.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">Time Stretching</p>
              <p>
                Real gate pulses last ~50 ns. We stretch time by 10{'\u2077'}{'\u00d7'}, mapping
                nanoseconds to tenths of seconds and GHz to hundreds of Hz.
                Speed control changes playback rate — shorter pulses sound higher,
                just like in real hardware (bandwidth {'\u221D'} 1/duration).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function drawIQEnvelope(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  I: Float32Array, Q: Float32Array,
  dpr: number,
) {
  const len = I.length
  const step = Math.max(1, Math.floor(len / (w / dpr)))

  // I-channel (cyan)
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 1.5 * dpr
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  for (let i = 0; i < len; i += step) {
    const x = (i / len) * w
    const y = h / 2 - I[i] * h * 0.35
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Q-channel (purple)
  if (Q.some(v => Math.abs(v) > 0.001)) {
    ctx.strokeStyle = '#8b5cf6'
    ctx.beginPath()
    for (let i = 0; i < len; i += step) {
      const x = (i / len) * w
      const y = h / 2 - Q[i] * h * 0.35
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function GateLegendItem({ type, desc }: { type: GateType; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: GATE_COLORS[type] }} />
      <div>
        <div className="text-xs font-mono font-bold text-white">{type}</div>
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

  // Calculate gate X positions
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
