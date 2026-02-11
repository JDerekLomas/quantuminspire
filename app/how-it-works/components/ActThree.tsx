'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import QubitDot from './QubitDot'
import { useAudio } from './AudioEngine'
import { ghzToHz, HARDWARE_FREQS, lorentzian, F0 } from '../lib/scroll-physics'
import InfoBox from './InfoBox'

function subScene(globalProgress: number, numScenes: number): [number, number] {
  const idx = Math.min(numScenes - 1, Math.floor(globalProgress * numScenes))
  const local = (globalProgress * numScenes) - idx
  return [idx + 1, Math.max(0, Math.min(1, local))]
}

const TUNA9 = HARDWARE_FREQS.tuna9

// Tuna-9 topology: connected pairs with Bell fidelity
const TUNA9_EDGES: [number, number, number][] = [
  [0, 1, 87.0], [0, 2, 85.8], [1, 3, 91.3], [1, 4, 89.8],
  [2, 4, 92.3], [2, 5, 91.4], [3, 6, 87.1], [4, 6, 93.5],
  [6, 8, 91.3], [7, 8, 88.3],
]

// Layout positions for topology graph (normalized 0-1)
const TUNA9_POS: Record<number, [number, number]> = {
  0: [0.1, 0.15], 1: [0.35, 0.15], 3: [0.6, 0.15],
  2: [0.1, 0.55], 4: [0.35, 0.55], 6: [0.6, 0.55], 8: [0.85, 0.55],
  5: [0.1, 0.9], 7: [0.85, 0.9],
}

// ─── Scene 1: Frequency Ruler ────────────────────────────────────────────────
function FrequencyRuler({ progress }: { progress: number }) {
  const visibleCount = Math.min(9, Math.ceil(progress * 10))
  const showTopology = progress > 0.85

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-white/90 mb-2">Act III: The Orchestra</h2>
      <p className="text-sm text-gray-400 max-w-md text-center">
        A real quantum computer is an ensemble of qubits, each deliberately tuned to a different
        frequency so they can be individually controlled. This is QuTech's Tuna-9 — a 9-qubit
        transmon chip that we've been running experiments on throughout this project.
      </p>
      <div className="relative w-full max-w-lg h-32">
        {/* Frequency axis */}
        <div className="absolute bottom-8 left-0 right-0 h-px bg-gray-600" />
        <div className="absolute bottom-2 left-0 text-[10px] font-mono text-gray-500">4.9 GHz</div>
        <div className="absolute bottom-2 right-0 text-[10px] font-mono text-gray-500">6.9 GHz</div>

        {/* Qubit dots */}
        {TUNA9.slice(0, visibleCount).map((qd, i) => {
          const xPct = ((qd.freq - 4.9) / (6.9 - 4.9)) * 100
          return (
            <div
              key={qd.q}
              className="absolute bottom-10 -translate-x-1/2 flex flex-col items-center"
              style={{
                left: `${xPct}%`,
                opacity: Math.min(1, (progress * 10 - i) * 2),
                transform: `translateX(-50%) translateY(${Math.max(0, 20 - (progress * 10 - i) * 40)}px)`,
                transition: 'opacity 0.2s, transform 0.2s',
              }}
            >
              <QubitDot excitation={0} size={16} glow />
              <span className="text-[9px] font-mono text-gray-500 mt-1">Q{qd.q}</span>
            </div>
          )
        })}
      </div>

      {/* Topology graph — appears once all qubits visible */}
      {showTopology && (
        <div className="w-full max-w-sm" style={{ opacity: Math.min(1, (progress - 0.85) * 7) }}>
          <p className="text-[11px] font-mono text-gray-500 text-center mb-2">
            chip topology — not all qubits are connected
          </p>
          <svg viewBox="0 0 300 160" className="w-full h-auto">
            {/* Edges */}
            {TUNA9_EDGES.map(([a, b, fid]) => {
              const [x1, y1] = TUNA9_POS[a]
              const [x2, y2] = TUNA9_POS[b]
              const brightness = (fid - 80) / 20
              return (
                <line
                  key={`${a}-${b}`}
                  x1={x1 * 300} y1={y1 * 160}
                  x2={x2 * 300} y2={y2 * 160}
                  stroke={`rgba(0,212,255,${0.2 + brightness * 0.5})`}
                  strokeWidth={1 + brightness * 1.5}
                />
              )
            })}
            {/* Nodes */}
            {Object.entries(TUNA9_POS).map(([q, [x, y]]) => (
              <g key={q}>
                <circle cx={x * 300} cy={y * 160} r={10} fill="#111" stroke="#00d4ff" strokeWidth={1.5} />
                <text x={x * 300} y={y * 160 + 3.5} textAnchor="middle" fill="#00d4ff" fontSize="8" fontFamily="monospace">
                  Q{q}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {visibleCount >= 9 && !showTopology && (
        <p className="text-[11px] font-mono text-gray-500">
          9 qubits, 9 frequencies, 9 notes in a chord
        </p>
      )}
      {showTopology && (
        <InfoBox title="Explore the hardware" link={{ href: '/platforms', label: 'Compare 3 quantum chips' }}>
          Tuna-9 has 10 connections between 9 qubits. The best pair (Q4-Q6) achieves 93.5% Bell state fidelity.
          We've characterized the full topology using autonomous experiments.
          Connectivity matters: non-adjacent qubits need SWAP gates, which add noise.
        </InfoBox>
      )}
    </div>
  )
}

// ─── Scene 2: Selective Addressing ───────────────────────────────────────────
function SelectiveAddressing({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Highlight qubit index based on progress
  const targetIdx = Math.min(8, Math.floor(progress * 9))
  const targetFreq = TUNA9[targetIdx].freq

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = 500, h = 180
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    // Draw all Lorentzians
    const omega = 3, t2 = 40
    for (const qd of TUNA9) {
      const isTarget = qd.q === TUNA9[targetIdx].q
      ctx.beginPath()
      ctx.strokeStyle = isTarget ? '#00ff88' : '#333'
      ctx.fillStyle = isTarget ? 'rgba(0,255,136,0.1)' : 'transparent'
      ctx.lineWidth = isTarget ? 2 : 1

      const points: [number, number][] = []
      for (let x = 0; x < w; x++) {
        const freq = 4.8 + (x / w) * 2.2
        const delta = (freq - qd.freq) * 1000
        const gamma = 1 / (Math.PI * t2)
        const resp = (omega * omega) / (omega * omega + delta * delta + gamma * gamma)
        const y = h - 20 - resp * (h - 40)
        points.push([x, y])
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      if (isTarget) {
        ctx.lineTo(w, h - 20)
        ctx.lineTo(0, h - 20)
        ctx.fill()
      }
    }

    // Target label
    ctx.fillStyle = '#00ff88'
    ctx.font = '12px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    const labelX = ((targetFreq - 4.8) / 2.2) * w
    ctx.fillText(`Q${TUNA9[targetIdx].q}: ${targetFreq.toFixed(2)} GHz`, labelX, 15)
  }, [progress, targetIdx, targetFreq])

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        Because each qubit resonates at a different frequency, you can address them individually —
        like calling someone by name in a crowd. Send a microwave pulse at 5.12 GHz and only that
        qubit responds. The others ignore it completely.
      </p>
      <canvas ref={canvasRef} style={{ width: 500, height: 180 }} className="rounded" />
      <p className="text-[11px] font-mono text-gray-500">
        Frequency-selective addressing — each qubit responds only to its own note
      </p>
    </div>
  )
}

// ─── Scene 3: Pulse Sequence (Piano Roll) ────────────────────────────────────
function PulseSequence({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cursor, setCursor] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const LOOP_DURATION = 4 // seconds per loop

  // A simple quantum circuit as pulse events
  const pulses = useRef([
    { q: 0, t: 0.0, dur: 0.1, type: 'X', color: '#00d4ff' },
    { q: 2, t: 0.05, dur: 0.1, type: 'H', color: '#8b5cf6' },
    { q: 2, t: 0.2, dur: 0.15, type: 'CNOT', color: '#00ff88', target: 4 },
    { q: 4, t: 0.4, dur: 0.15, type: 'CNOT', color: '#00ff88', target: 6 },
    { q: 0, t: 0.5, dur: 0.1, type: 'Ry', color: '#ff8c42' },
    { q: 6, t: 0.6, dur: 0.1, type: 'H', color: '#8b5cf6' },
    { q: 2, t: 0.7, dur: 0.1, type: 'M', color: '#ff6b9d' },
    { q: 4, t: 0.75, dur: 0.1, type: 'M', color: '#ff6b9d' },
    { q: 6, t: 0.8, dur: 0.1, type: 'M', color: '#ff6b9d' },
  ]).current

  // Time-based cursor that loops
  useEffect(() => {
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      setCursor((elapsed % LOOP_DURATION) / LOOP_DURATION)
      rafRef.current = requestAnimationFrame(animate)
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = 500, h = 200
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const qubits = [0, 2, 4, 6]
    const rowH = h / (qubits.length + 1)
    const margin = 40

    // Draw qubit lines
    for (let i = 0; i < qubits.length; i++) {
      const y = (i + 1) * rowH
      ctx.beginPath()
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.moveTo(margin, y)
      ctx.lineTo(w - 10, y)
      ctx.stroke()
      ctx.fillStyle = '#555'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`Q${qubits[i]}`, margin - 5, y + 4)
    }

    // Playback cursor (time-based)
    const cursorX = margin + cursor * (w - margin - 10)
    ctx.beginPath()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.5
    ctx.moveTo(cursorX, 0)
    ctx.lineTo(cursorX, h)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Draw pulses
    for (const pulse of pulses) {
      const qi = qubits.indexOf(pulse.q)
      if (qi === -1) continue
      const y = (qi + 1) * rowH
      const x = margin + pulse.t * (w - margin - 10)
      const pw = pulse.dur * (w - margin - 10)

      const isPast = cursor >= pulse.t
      ctx.globalAlpha = isPast ? 1 : 0.3
      ctx.fillStyle = pulse.color
      ctx.fillRect(x, y - 8, pw, 16)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(pulse.type, x + pw / 2, y + 3)

      // CNOT connection line
      if ('target' in pulse && pulse.target !== undefined) {
        const ti = qubits.indexOf(pulse.target)
        if (ti !== -1) {
          const ty = (ti + 1) * rowH
          ctx.beginPath()
          ctx.strokeStyle = pulse.color
          ctx.lineWidth = 1.5
          ctx.setLineDash(isPast ? [] : [3, 3])
          ctx.moveTo(x + pw / 2, y + 8)
          ctx.lineTo(x + pw / 2, ty - 8)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }
    ctx.globalAlpha = 1
  }, [cursor, pulses])

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        Every gate is a microwave pulse sent at a qubit's resonant frequency. The pulse duration
        sets the rotation: a pi pulse flips the qubit (X gate), a half-pi pulse creates superposition
        (H gate), and a partial rotation gives you Ry. Two-qubit gates like CNOT work differently —
        you drive one qubit at the <em>other</em> qubit's frequency, activating the coupling between them.
        A quantum algorithm is the full score: which qubit, which gate, in what order.
      </p>
      <canvas ref={canvasRef} style={{ width: 500, height: 200 }} className="rounded" />
      <p className="text-[11px] font-mono text-gray-500">
        Same frequency, different duration = different gate. Different frequency = different qubit.
      </p>
    </div>
  )
}

// ─── Scene 4: Scale ──────────────────────────────────────────────────────────
function Scale({ progress }: { progress: number }) {
  // Interpolate: 9 → 20 → 133 dots
  const t = progress
  let count: number, label: string, color: string
  if (t < 0.33) {
    count = 9; label = 'Tuna-9 (QuTech)'; color = '#00d4ff'
  } else if (t < 0.66) {
    count = 20; label = 'IQM Garnet'; color = '#f59e0b'
  } else {
    count = 133; label = 'IBM Torino'; color = '#8b5cf6'
  }

  // Arrange dots in a grid
  const cols = Math.ceil(Math.sqrt(count * 1.5))
  const rows = Math.ceil(count / cols)
  const dotSize = count > 50 ? 6 : count > 15 ? 10 : 14

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        The orchestra grows. Each generation of chips adds more qubits — and with them,
        exponentially more quantum states to work with. 9 qubits can represent 512 states simultaneously.
        133 qubits? More states than atoms in the visible universe.
      </p>
      <div className="text-center mb-2">
        <span className="text-lg font-bold font-mono" style={{ color }}>{count} qubits</span>
        <span className="text-sm text-gray-500 ml-2">— {label}</span>
      </div>
      <div
        className="flex flex-wrap justify-center gap-1 max-w-md"
        style={{ transition: 'all 0.3s' }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.6 + Math.random() * 0.4,
              boxShadow: `0 0 ${dotSize * 0.4}px ${color}40`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Scene 5: Coda — Decoherence ─────────────────────────────────────────────
function Coda({ progress }: { progress: number }) {
  const [decay, setDecay] = useState(0)
  const [flicker, setFlicker] = useState<number[]>(new Array(9).fill(1))
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const DECAY_DURATION = 6 // seconds to full decoherence

  useEffect(() => {
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      const d = Math.min(1, elapsed / DECAY_DURATION)
      setDecay(d)

      // Random flickering for alive qubits
      setFlicker(TUNA9.map((_, i) => {
        const alive = d < 0.3 + i * 0.08
        if (!alive) return 0
        // More flicker as decay increases
        const flickerChance = d * 0.3
        return Math.random() > flickerChance ? 1 : 0.3
      }))

      if (d < 1) rafRef.current = requestAnimationFrame(animate)
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const t2Timer = Math.max(0, 100 - decay * 100).toFixed(0)

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-sm text-gray-400 max-w-md text-center">
        But qubits are fragile. Energy leaks out (T1 relaxation), phase drifts randomly (T2 dephasing),
        and stray fields corrupt the signal. This is decoherence. Every quantum computer races against it.
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-sm">
        {TUNA9.map((qd, i) => {
          const alive = decay < 0.3 + i * 0.08
          return (
            <div key={qd.q} className="flex flex-col items-center">
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: alive ? '#00d4ff' : '#333',
                  opacity: alive ? flicker[i] * (1 - decay * 0.3) : 0.2,
                  boxShadow: alive ? '0 0 8px #00d4ff40' : 'none',
                  transition: 'background-color 0.3s',
                }}
              />
              <span className="text-[8px] font-mono text-gray-600 mt-0.5">Q{qd.q}</span>
            </div>
          )
        })}
      </div>
      {/* T2 countdown */}
      <div className="text-center">
        <span className="text-3xl font-mono font-bold" style={{ color: decay > 0.7 ? '#ff6b6b' : '#00d4ff', opacity: 1 - decay * 0.5 }}>
          T₂ = {t2Timer} μs
        </span>
      </div>
      {decay > 0.8 && (
        <div className="text-center space-y-2 mt-4" style={{ opacity: Math.min(1, (decay - 0.8) * 5) }}>
          <p className="text-white/80 text-lg">Every quantum computation is a race against time.</p>
          <p className="text-gray-500 text-sm">
            That's why error correction, mitigation, and fast gates all matter.
          </p>
          <InfoBox title="How we fight decoherence" link={{ href: '/replications', label: 'See error mitigation results' }}>
            T1 (energy relaxation) sets the absolute limit — typically 50-200 &micro;s on current hardware.
            T2 (dephasing) is often shorter. We use error mitigation techniques like TREX, post-selection,
            and readout correction to extract accurate results despite noise.
            On IBM Torino, TREX achieved 0.22 kcal/mol — chemical accuracy for H2.
          </InfoBox>
        </div>
      )}
    </div>
  )
}

// ─── Act III Audio ───────────────────────────────────────────────────────────
function useActThreeAudio(scene: number, progress: number) {
  const { getCtx, getMasterGain, initialized } = useAudio()
  const oscsRef = useRef<OscillatorNode[]>([])
  const gainsRef = useRef<GainNode[]>([])
  const decayStartRef = useRef<number | null>(null)
  const melodyTimerRef = useRef<number | null>(null)
  const melodyIdxRef = useRef(0)
  const prevSceneRef = useRef(0)

  const ensureOscs = useCallback(() => {
    const ctx = getCtx()
    const mg = getMasterGain()
    if (!ctx || !mg || oscsRef.current.length > 0) return

    for (let i = 0; i < 9; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = ghzToHz(TUNA9[i].freq)
      const gain = ctx.createGain()
      gain.gain.value = 0
      const pan = ctx.createStereoPanner()
      pan.pan.value = -0.8 + (i / 8) * 1.6
      osc.connect(gain).connect(pan).connect(mg)
      osc.start()
      oscsRef.current.push(osc)
      gainsRef.current.push(gain)
    }
  }, [getCtx, getMasterGain])

  useEffect(() => {
    if (!initialized) return
    ensureOscs()
  }, [initialized, ensureOscs])

  // Scene 5: schedule decoherence audio on entry
  useEffect(() => {
    const ctx = getCtx()
    if (!ctx || oscsRef.current.length === 0) return

    if (scene === 5 && prevSceneRef.current !== 5) {
      // Schedule decoherence: all oscs start at 0.06, each fades + detunes over 6s
      const now = ctx.currentTime
      decayStartRef.current = now
      for (let i = 0; i < 9; i++) {
        const g = gainsRef.current[i]
        const o = oscsRef.current[i]
        const deathTime = 0.3 + i * 0.08 // normalized 0-1, scale to 6s
        const deathSec = deathTime * 6
        g.gain.cancelScheduledValues(now)
        g.gain.setValueAtTime(0.06, now)
        g.gain.linearRampToValueAtTime(0.06 * 0.7, now + deathSec * 0.5)
        g.gain.linearRampToValueAtTime(0, now + deathSec)
        // Detune
        o.detune.cancelScheduledValues(now)
        o.detune.setValueAtTime(0, now)
        o.detune.linearRampToValueAtTime((i % 2 === 0 ? 1 : -1) * 30, now + deathSec)
      }
    }

    // Scene 3: start melody loop on entry
    if (scene === 3 && prevSceneRef.current !== 3) {
      const melodyOrder = [0, 2, 2, 4, 4, 0, 6, 2, 4, 6]
      melodyIdxRef.current = 0
      const playNext = () => {
        if (oscsRef.current.length === 0) return
        const ctx2 = getCtx()
        if (!ctx2) return
        const now2 = ctx2.currentTime
        const qIdx = melodyOrder[melodyIdxRef.current % melodyOrder.length]
        for (let i = 0; i < 9; i++) {
          gainsRef.current[i].gain.setTargetAtTime(i === qIdx ? 0.15 : 0.02, now2, 0.02)
        }
        melodyIdxRef.current++
        melodyTimerRef.current = window.setTimeout(playNext, 450)
      }
      playNext()
    }
    if (scene !== 3 && melodyTimerRef.current !== null) {
      clearTimeout(melodyTimerRef.current)
      melodyTimerRef.current = null
    }

    prevSceneRef.current = scene
  }, [scene, getCtx])

  // Scenes 1, 2, 4: still scroll-driven (controls which qubit is highlighted, chord build-up)
  useEffect(() => {
    const ctx = getCtx()
    if (!ctx || oscsRef.current.length === 0) return
    const now = ctx.currentTime

    if (scene === 1) {
      const visibleCount = Math.min(9, Math.ceil(progress * 10))
      for (let i = 0; i < 9; i++) {
        gainsRef.current[i].gain.setTargetAtTime(i < visibleCount ? 0.06 : 0, now, 0.05)
        oscsRef.current[i].detune.setTargetAtTime(0, now, 0.05)
      }
    } else if (scene === 2) {
      const targetIdx = Math.min(8, Math.floor(progress * 9))
      for (let i = 0; i < 9; i++) {
        gainsRef.current[i].gain.setTargetAtTime(i === targetIdx ? 0.2 : 0.02, now, 0.03)
        oscsRef.current[i].detune.setTargetAtTime(0, now, 0.05)
      }
    } else if (scene === 4) {
      for (let i = 0; i < 9; i++) {
        gainsRef.current[i].gain.setTargetAtTime(0.06, now, 0.05)
        oscsRef.current[i].detune.setTargetAtTime(0, now, 0.05)
      }
    } else if (scene !== 3 && scene !== 5) {
      for (let i = 0; i < 9; i++) {
        gainsRef.current[i].gain.setTargetAtTime(0, now, 0.1)
      }
    }
  }, [scene, progress, getCtx])

  useEffect(() => {
    return () => {
      if (melodyTimerRef.current !== null) clearTimeout(melodyTimerRef.current)
      for (const o of oscsRef.current) {
        try { o.stop() } catch {}
      }
      oscsRef.current = []
      gainsRef.current = []
    }
  }, [])
}

// ─── Act III Composite ───────────────────────────────────────────────────────
export default function ActThree({ progress }: { progress: number }) {
  const [scene, localP] = subScene(progress, 5)
  useActThreeAudio(scene, localP)

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {scene === 1 && <FrequencyRuler progress={localP} />}
      {scene === 2 && <SelectiveAddressing progress={localP} />}
      {scene === 3 && <PulseSequence progress={localP} />}
      {scene === 4 && <Scale progress={localP} />}
      {scene === 5 && <Coda progress={localP} />}
    </div>
  )
}
