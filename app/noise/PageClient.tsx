'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// DATA — From real hardware experiments
// ============================================================

// Typical transmon coherence (Tuna-9 / IBM Torino range)
const DEFAULT_T1 = 35 // μs
const DEFAULT_T2 = 22 // μs

// Cross-platform noise signatures from our experiments
const PLATFORM_NOISE = [
  {
    name: 'QI Tuna-9',
    qubits: 9,
    t1: '20–50 μs',
    t2: '15–35 μs',
    dominant: 'Dephasing',
    signature: 'Z-errors 3–5x more likely than X-errors. Readout asymmetric (|1⟩→|0⟩ dominant).',
    bell: 93.5,
    color: '#ff8c42',
  },
  {
    name: 'IQM Garnet',
    qubits: 20,
    t1: '30–60 μs',
    t2: '20–40 μs',
    dominant: 'Dephasing',
    signature: 'Similar Z-bias. Best Bell 98.4% (pair-dependent). CZ native gate.',
    bell: 98.4,
    color: '#8b5cf6',
  },
  {
    name: 'IBM Torino',
    qubits: 133,
    t1: '200–300 μs',
    t2: '100–200 μs',
    dominant: 'Depolarizing',
    signature: 'More balanced X/Y/Z error rates. Longer coherence but complex crosstalk at scale.',
    bell: 99.05,
    color: '#00d4ff',
  },
]

// ============================================================
// HELPERS
// ============================================================

function MetaphorCallout({ title, children, accent = '#00d4ff' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: `${accent}20`, backgroundColor: `${accent}05` }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: accent }}>Metaphor</span>
      <p className="text-sm text-gray-300 mt-1">
        <span className="font-semibold text-white">{title}</span> — {children}
      </p>
    </div>
  )
}

function InsightCallout({ children, accent = '#00ff88' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: `${accent}20`, backgroundColor: `${accent}05` }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: accent }}>From our experiments</span>
      <p className="text-sm text-gray-300 mt-1">{children}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 mb-3">{children}</span>
  )
}

// ============================================================
// SVG COMPONENTS
// ============================================================

// Bloch sphere projection showing how noise affects the state
function BlochNoiseSVG({ t1, t2, channel }: { t1: number; t2: number; channel: 'relaxation' | 'dephasing' | 'depolarizing' }) {
  const cx = 200, cy = 200, r = 150
  // Time parameter (0 to 3*T2 gives good visual range)
  const tMax = Math.max(t1, t2) * 3

  // Generate trajectory points
  const points: { x: number; y: number; opacity: number }[] = []
  const nPts = 80

  for (let i = 0; i <= nPts; i++) {
    const t = (i / nPts) * tMax
    let bx = 0, by = 0, bz = 0

    // Start at |+⟩ state (equator, x-axis)
    const x0 = 1, y0 = 0, z0 = 0

    if (channel === 'relaxation') {
      // T1: spiral down to |0⟩ (north pole in our convention)
      const decay = Math.exp(-t / t1)
      bx = x0 * decay
      by = y0 * decay
      bz = 1 - (1 - z0) * Math.exp(-t / t1) // approaches +1
      // Add precession
      const angle = t * 2 * Math.PI * 0.15 // slow precession for visibility
      const rx = bx * Math.cos(angle) - by * Math.sin(angle)
      const ry = bx * Math.sin(angle) + by * Math.cos(angle)
      bx = rx
      by = ry
    } else if (channel === 'dephasing') {
      // T2 (pure dephasing): shrink in x-y plane, z stays
      const decay = Math.exp(-t / t2)
      const angle = t * 2 * Math.PI * 0.15
      bx = x0 * decay * Math.cos(angle)
      by = x0 * decay * Math.sin(angle)
      bz = z0
    } else {
      // Depolarizing: uniform shrink toward center
      const tEff = Math.min(t1, t2)
      const decay = Math.exp(-t / tEff)
      const angle = t * 2 * Math.PI * 0.15
      bx = x0 * decay * Math.cos(angle)
      by = x0 * decay * Math.sin(angle)
      bz = z0 * decay
    }

    // Project to 2D (simple oblique projection)
    const px = cx + r * (bx * 0.87 + by * 0.5)
    const py = cy - r * (bz * 0.8 + by * 0.2)
    points.push({ x: px, y: py, opacity: 0.3 + 0.7 * (i / nPts) })
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const channelColor = channel === 'relaxation' ? '#00d4ff' : channel === 'dephasing' ? '#ff6b9d' : '#8b5cf6'
  const endPt = points[points.length - 1]
  const startPt = points[0]

  // Destination label
  const destLabel = channel === 'relaxation' ? '|0⟩' : channel === 'dephasing' ? 'equator center' : 'origin'

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[400px] mx-auto">
      {/* Sphere outline */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r} fill="none" stroke="#1f2937" strokeWidth={1} />
      {/* Equator ellipse */}
      <ellipse cx={cx} cy={cy} rx={r * 0.87} ry={r * 0.25} fill="none" stroke="#1f293780" strokeWidth={0.5} strokeDasharray="4 4" />
      {/* Vertical axis */}
      <line x1={cx} y1={cy - r * 0.85} x2={cx} y2={cy + r * 0.85} stroke="#1f293780" strokeWidth={0.5} strokeDasharray="4 4" />

      {/* Axis labels */}
      <text x={cx} y={cy - r - 12} textAnchor="middle" fill="#6b7280" fontSize={11} fontFamily="monospace">|0⟩</text>
      <text x={cx} y={cy + r + 20} textAnchor="middle" fill="#6b7280" fontSize={11} fontFamily="monospace">|1⟩</text>
      <text x={cx + r + 8} y={cy + 4} textAnchor="start" fill="#6b7280" fontSize={9} fontFamily="monospace">x</text>

      {/* Trajectory */}
      <path d={pathD} fill="none" stroke={channelColor} strokeWidth={2} strokeLinecap="round" opacity={0.8} />

      {/* Start point */}
      <circle cx={startPt.x} cy={startPt.y} r={5} fill={channelColor} stroke="white" strokeWidth={1.5} />
      <text x={startPt.x + 10} y={startPt.y - 8} fill="white" fontSize={10} fontFamily="monospace">|+⟩</text>

      {/* End point */}
      <circle cx={endPt.x} cy={endPt.y} r={4} fill={channelColor} opacity={0.5} />
      <text x={endPt.x + 8} y={endPt.y + 4} fill="#6b7280" fontSize={9} fontFamily="monospace">→ {destLabel}</text>

      {/* Channel label */}
      <text x={cx} y={30} textAnchor="middle" fill={channelColor} fontSize={13} fontWeight="bold" fontFamily="monospace">
        {channel === 'relaxation' ? 'T₁ Relaxation' : channel === 'dephasing' ? 'T₂ Dephasing' : 'Depolarizing'}
      </text>
    </svg>
  )
}

// Decay curves for T1 and T2
function DecayCurvesSVG({ t1, t2 }: { t1: number; t2: number }) {
  const W = 700, H = 280
  const pad = { l: 55, r: 20, t: 30, b: 40 }
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b
  const tMax = Math.max(t1, t2) * 3

  function toX(t: number) { return pad.l + (t / tMax) * pw }
  function toY(p: number) { return pad.t + (1 - p) * ph }

  // T1 decay: P(|1⟩) = e^(-t/T1)
  const t1Path: string[] = []
  // T2 decay: coherence = e^(-t/T2)
  const t2Path: string[] = []
  const N = 100
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * tMax
    const p1 = Math.exp(-t / t1)
    const p2 = Math.exp(-t / t2)
    t1Path.push(`${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(p1).toFixed(1)}`)
    t2Path.push(`${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(p2).toFixed(1)}`)
  }

  // 1/e markers
  const t1e = toX(t1), t2e = toX(t2)
  const ye = toY(1 / Math.E)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(v => (
        <g key={v}>
          <line x1={pad.l} y1={toY(v)} x2={W - pad.r} y2={toY(v)} stroke="#1f2937" strokeWidth={0.5} />
          <text x={pad.l - 8} y={toY(v) + 3} textAnchor="end" fill="#4b5563" fontSize={10} fontFamily="monospace">
            {v.toFixed(v === 0 || v === 1 ? 0 : 2)}
          </text>
        </g>
      ))}

      {/* T1 curve */}
      <path d={t1Path.join(' ')} fill="none" stroke="#00d4ff" strokeWidth={2.5} />
      {/* T2 curve */}
      <path d={t2Path.join(' ')} fill="none" stroke="#ff6b9d" strokeWidth={2.5} />

      {/* 1/e line */}
      <line x1={pad.l} y1={ye} x2={W - pad.r} y2={ye} stroke="#ffffff15" strokeWidth={1} strokeDasharray="4 4" />
      <text x={W - pad.r + 2} y={ye + 3} fill="#6b7280" fontSize={8} fontFamily="monospace">1/e</text>

      {/* T1 marker */}
      <line x1={t1e} y1={ye} x2={t1e} y2={toY(0)} stroke="#00d4ff" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
      <circle cx={t1e} cy={ye} r={4} fill="#00d4ff" />
      <text x={t1e} y={toY(0) + 14} textAnchor="middle" fill="#00d4ff" fontSize={10} fontFamily="monospace">
        T₁ = {t1} μs
      </text>

      {/* T2 marker */}
      <line x1={t2e} y1={ye} x2={t2e} y2={toY(0)} stroke="#ff6b9d" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
      <circle cx={t2e} cy={ye} r={4} fill="#ff6b9d" />
      <text x={t2e} y={toY(0) + 14} textAnchor="middle" fill="#ff6b9d" fontSize={10} fontFamily="monospace">
        T₂ = {t2} μs
      </text>

      {/* Axis labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="monospace">Time (μs)</text>
      <text x={14} y={H / 2} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="monospace" transform={`rotate(-90, 14, ${H / 2})`}>Signal</text>

      {/* Legend */}
      <line x1={pad.l + 10} y1={14} x2={pad.l + 30} y2={14} stroke="#00d4ff" strokeWidth={2} />
      <text x={pad.l + 35} y={18} fill="#00d4ff" fontSize={10} fontFamily="monospace">T₁ (energy decay)</text>
      <line x1={pad.l + 170} y1={14} x2={pad.l + 190} y2={14} stroke="#ff6b9d" strokeWidth={2} />
      <text x={pad.l + 195} y={18} fill="#ff6b9d" fontSize={10} fontFamily="monospace">T₂ (coherence decay)</text>
    </svg>
  )
}

// Error channel comparison — probability distribution over Pauli errors
function PauliErrorBarsSVG({ channel }: { channel: 'relaxation' | 'dephasing' | 'depolarizing' }) {
  const W = 320, H = 200
  const pad = { l: 30, r: 10, t: 30, b: 30 }

  // Pauli error probabilities for each channel
  let pI: number, pX: number, pY: number, pZ: number
  if (channel === 'relaxation') {
    // T1: mostly |1⟩→|0⟩ flips (like X but only downward)
    pI = 0.60; pX = 0.20; pY = 0.05; pZ = 0.15
  } else if (channel === 'dephasing') {
    // Pure dephasing: only Z errors
    pI = 0.70; pX = 0.0; pY = 0.0; pZ = 0.30
  } else {
    // Depolarizing: equal X, Y, Z
    pI = 0.70; pX = 0.10; pY = 0.10; pZ = 0.10
  }

  const bars = [
    { label: 'I', prob: pI, color: '#4b5563' },
    { label: 'X', prob: pX, color: '#00d4ff' },
    { label: 'Y', prob: pY, color: '#8b5cf6' },
    { label: 'Z', prob: pZ, color: '#ff6b9d' },
  ]

  const barW = (W - pad.l - pad.r - 40) / 4
  const maxH = H - pad.t - pad.b

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={16} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold" fontFamily="monospace">
        {channel === 'relaxation' ? 'Relaxation' : channel === 'dephasing' ? 'Dephasing' : 'Depolarizing'}
      </text>
      {bars.map((bar, i) => {
        const x = pad.l + 10 + i * (barW + 10)
        const h = bar.prob * maxH
        const y = pad.t + maxH - h
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barW} height={h} fill={bar.color} rx={3} opacity={0.8} />
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill={bar.color} fontSize={10} fontFamily="monospace">
              {(bar.prob * 100).toFixed(0)}%
            </text>
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill="#9ca3af" fontSize={12} fontWeight="bold" fontFamily="monospace">
              {bar.label}
            </text>
          </g>
        )
      })}
      {/* Baseline */}
      <line x1={pad.l} y1={pad.t + maxH} x2={W - pad.r} y2={pad.t + maxH} stroke="#374151" strokeWidth={0.5} />
    </svg>
  )
}

// Error budget pie (simplified as stacked bar)
function ErrorBudgetSVG() {
  const W = 700, H = 60
  const sources = [
    { name: 'Readout', pct: 80, color: '#00d4ff' },
    { name: 'Decoherence', pct: 12, color: '#8b5cf6' },
    { name: 'Gates', pct: 5, color: '#ff6b9d' },
    { name: 'State prep', pct: 3, color: '#ff8c42' },
  ]

  let cumX = 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {sources.map(s => {
        const w = (s.pct / 100) * W
        const x = cumX
        cumX += w
        return (
          <g key={s.name}>
            <rect x={x} y={0} width={w} height={30} fill={s.color} opacity={0.7} />
            {w > 50 && (
              <text x={x + w / 2} y={20} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold" fontFamily="monospace">
                {s.name} {s.pct}%
              </text>
            )}
            <text x={x + w / 2} y={50} textAnchor="middle" fill={s.color} fontSize={9} fontFamily="monospace">
              {s.pct < 10 ? `${s.name} ${s.pct}%` : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Bell fidelity comparison across platforms
function FidelityComparisonSVG() {
  const W = 700, H = 160
  const pad = { l: 100, r: 30, t: 10, b: 20 }
  const barH = 28, gap = 12

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {PLATFORM_NOISE.map((p, i) => {
        const y = pad.t + i * (barH + gap)
        const maxW = W - pad.l - pad.r
        const w = (p.bell / 100) * maxW

        return (
          <g key={p.name}>
            <text x={pad.l - 8} y={y + barH / 2 + 4} textAnchor="end" fill="#9ca3af" fontSize={11} fontFamily="monospace">
              {p.name}
            </text>
            <rect x={pad.l} y={y} width={maxW} height={barH} fill="#111827" rx={4} />
            <rect x={pad.l} y={y} width={w} height={barH} fill={p.color} rx={4} opacity={0.7} />
            <text x={pad.l + w - 6} y={y + barH / 2 + 4} textAnchor="end" fill="white" fontSize={11} fontWeight="bold" fontFamily="monospace">
              {p.bell}%
            </text>
            <text x={pad.l + maxW + 4} y={y + barH / 2 + 4} textAnchor="start" fill="#6b7280" fontSize={9} fontFamily="monospace">
              {p.dominant}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function NoisePage() {
  const [t1, setT1] = useState(DEFAULT_T1)
  const [t2, setT2] = useState(DEFAULT_T2)
  const [selectedChannel, setSelectedChannel] = useState<'relaxation' | 'dephasing' | 'depolarizing'>('dephasing')

  // Enforce T2 <= 2*T1 (physical constraint)
  const effectiveT2 = Math.min(t2, 2 * t1)

  const handleT1Change = useCallback((v: number) => {
    setT1(v)
  }, [])

  const handleT2Change = useCallback((v: number) => {
    setT2(v)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav section="Learn" />

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-16">
          <SectionLabel>Interactive Explainer</SectionLabel>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[0.95] mb-4">
            Noise Channels
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            Every quantum computation is a race against noise. Three fundamental channels
            corrupt qubit states in different ways — understanding which one dominates
            your hardware determines which mitigation strategy works.
          </p>
        </div>

        {/* ── Section 1: The Three Channels ── */}
        <section className="mb-20">
          <SectionLabel>The Three Channels</SectionLabel>
          <h2 className="text-2xl font-bold mb-4">How qubits lose information</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-2xl">
            A perfect qubit holds any point on the Bloch sphere indefinitely.
            Real qubits drift, shrink, and collapse. The trajectory depends on which
            noise channel dominates.
          </p>

          {/* Channel selector */}
          <div className="flex gap-3 mb-8">
            {(['relaxation', 'dephasing', 'depolarizing'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={`px-4 py-2 rounded-lg text-sm font-mono border transition-all ${
                  selectedChannel === ch
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
              >
                {ch === 'relaxation' ? 'T₁ Relaxation' : ch === 'dephasing' ? 'T₂ Dephasing' : 'Depolarizing'}
              </button>
            ))}
          </div>

          {/* Bloch sphere + Pauli bars side by side */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <BlochNoiseSVG t1={t1} t2={effectiveT2} channel={selectedChannel} />
            </div>
            <div>
              <PauliErrorBarsSVG channel={selectedChannel} />
              <div className="mt-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                {selectedChannel === 'relaxation' && (
                  <>
                    <h3 className="text-sm font-bold text-[#00d4ff] mb-1">T₁ Relaxation (Energy Decay)</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      The qubit loses energy and falls from |1⟩ to |0⟩. Like a ball rolling downhill.
                      The Bloch vector spirals down to the north pole. Causes X-type bit-flip errors.
                      Rate: 1/T₁.
                    </p>
                  </>
                )}
                {selectedChannel === 'dephasing' && (
                  <>
                    <h3 className="text-sm font-bold text-[#ff6b9d] mb-1">T₂ Dephasing (Phase Randomization)</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      The qubit&apos;s phase drifts randomly — the x-y plane shrinks while z stays fixed.
                      Like a spinning top wobbling. Only causes Z-type phase errors. This is why
                      Tuna-9 shows 3–5x more Z errors than X errors.
                    </p>
                  </>
                )}
                {selectedChannel === 'depolarizing' && (
                  <>
                    <h3 className="text-sm font-bold text-[#8b5cf6] mb-1">Depolarizing (Uniform Shrinkage)</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      The qubit state shrinks uniformly toward the center of the Bloch sphere —
                      the maximally mixed state. Equal probability of X, Y, and Z errors.
                      This is IBM Torino&apos;s dominant noise model. Simple but hard to mitigate.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <MetaphorCallout title="Ice cube on a table" accent={selectedChannel === 'relaxation' ? '#00d4ff' : selectedChannel === 'dephasing' ? '#ff6b9d' : '#8b5cf6'}>
            {selectedChannel === 'relaxation'
              ? 'T₁ is like an ice cube melting — energy slowly leaks out. The cube (|1⟩) eventually becomes a puddle (|0⟩). You can slow it down with better insulation, but you can\'t stop it.'
              : selectedChannel === 'dephasing'
              ? 'T₂ is like a crowd of clocks that started synchronized but gradually drift apart. Each clock still ticks, but they lose their shared rhythm. The average of all the clock hands shrinks to zero.'
              : 'Depolarizing noise is like shaking a snow globe. Everything blurs equally in all directions until you can\'t tell what the original scene was.'
            }
          </MetaphorCallout>
        </section>

        {/* ── Section 2: Decay Curves ── */}
        <section className="mb-20">
          <SectionLabel>Coherence Times</SectionLabel>
          <h2 className="text-2xl font-bold mb-4">T₁ and T₂: the qubit&apos;s clock</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Every qubit has two lifetimes. T₁ measures how long it holds energy (|1⟩ → |0⟩).
            T₂ measures how long it holds phase coherence. T₂ is always ≤ 2T₁ — you can&apos;t
            maintain phase if you&apos;ve already lost the energy.
          </p>

          <DecayCurvesSVG t1={t1} t2={effectiveT2} />

          {/* Sliders */}
          <div className="grid sm:grid-cols-2 gap-6 mt-6 p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-mono text-[#00d4ff]">T₁ (energy lifetime)</span>
                <span className="text-xs font-mono text-[#00d4ff]">{t1} μs</span>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                value={t1}
                onChange={e => handleT1Change(Number(e.target.value))}
                className="w-full accent-[#00d4ff]"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                <span>5 μs (noisy)</span>
                <span>200 μs (IBM Torino)</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-mono text-[#ff6b9d]">T₂ (coherence time)</span>
                <span className="text-xs font-mono text-[#ff6b9d]">{effectiveT2} μs{effectiveT2 < t2 ? ' (capped at 2T₁)' : ''}</span>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                value={t2}
                onChange={e => handleT2Change(Number(e.target.value))}
                className="w-full accent-[#ff6b9d]"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                <span>1 μs</span>
                <span>200 μs</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-8 mt-4">
            <div>
              <div className="text-lg font-black font-mono text-[#00d4ff]">{t1} μs</div>
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">T₁</div>
            </div>
            <div>
              <div className="text-lg font-black font-mono text-[#ff6b9d]">{effectiveT2} μs</div>
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">T₂</div>
            </div>
            <div>
              <div className="text-lg font-black font-mono text-gray-400">{(effectiveT2 / t1).toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">T₂/T₁ ratio</div>
            </div>
            <div>
              <div className="text-lg font-black font-mono text-gray-400">{(effectiveT2 / (2 * t1) * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">of 2T₁ limit</div>
            </div>
          </div>

          <InsightCallout>
            On Tuna-9, T₂/T₁ ≈ 0.6 — well below the 2T₁ limit. This means pure dephasing
            (not relaxation) is the dominant decoherence mechanism. That&apos;s why Z-errors
            outnumber X-errors 3–5x in our Bell experiments.
          </InsightCallout>
        </section>

        {/* ── Section 3: The Error Budget ── */}
        <section className="mb-20">
          <SectionLabel>Where Errors Come From</SectionLabel>
          <h2 className="text-2xl font-bold mb-4">The error budget</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Not all errors are equal. On Tuna-9, we proved through systematic experiments
            (ZNE gate folding, readout calibration) that 80% of error comes from
            measurement — not from the quantum gates themselves.
          </p>

          <ErrorBudgetSVG />

          <div className="grid sm:grid-cols-4 gap-4 mt-6">
            {[
              { name: 'Readout', pct: 80, color: '#00d4ff', desc: 'Measuring |1⟩ as |0⟩ (or vice versa). Asymmetric on Tuna-9: 8.5% for |1⟩→|0⟩ vs 0.7% for |0⟩→|1⟩.' },
              { name: 'Decoherence', pct: 12, color: '#8b5cf6', desc: 'Qubit state decays during the circuit. Worse for longer circuits and qubits with short T₂.' },
              { name: 'Gate errors', pct: 5, color: '#ff6b9d', desc: 'Imperfect rotations and entangling operations. Our ZNE experiment showed adding 4 extra CNOTs only added ~1 kcal/mol.' },
              { name: 'State prep', pct: 3, color: '#ff8c42', desc: 'Qubit doesn\'t start perfectly in |0⟩. Small but systematic — affects every shot the same way.' },
            ].map(s => (
              <div key={s.name} className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className="text-xs font-mono ml-auto" style={{ color: s.color }}>{s.pct}%</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <MetaphorCallout title="Faulty speedometer" accent="#00d4ff">
            Readout error is like a speedometer that reads 55 when you&apos;re going 60.
            The car (quantum state) is fine — it&apos;s the measurement that&apos;s wrong.
            That&apos;s why readout error mitigation (calibrating the &quot;speedometer&quot;) works so well,
            giving us a 119x improvement on IBM with TREX.
          </MetaphorCallout>
        </section>

        {/* ── Section 4: Gate Time vs Coherence ── */}
        <section className="mb-20">
          <SectionLabel>The Race</SectionLabel>
          <h2 className="text-2xl font-bold mb-4">Gate speed vs coherence time</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Quantum computing is a race: finish the computation before the qubit forgets.
            The ratio of coherence time to gate time determines how many operations you
            can perform.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-500 font-mono text-xs">Platform</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-mono text-xs">1q gate</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-mono text-xs">2q gate</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-mono text-xs">T₂</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-mono text-xs">Ops before T₂</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-mono text-xs">RB fidelity</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Tuna-9', g1: '20 ns', g2: '40 ns', t2: '22 μs', ops: '~550', rb: '99.82%', color: '#ff8c42' },
                  { name: 'IQM Garnet', g1: '32 ns', g2: '72 ns', t2: '30 μs', ops: '~420', rb: '99.7%', color: '#8b5cf6' },
                  { name: 'IBM Torino', g1: '30 ns', g2: '68 ns', t2: '150 μs', ops: '~2200', rb: '99.5%', color: '#00d4ff' },
                ].map(p => (
                  <tr key={p.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-mono font-bold" style={{ color: p.color }}>{p.name}</td>
                    <td className="py-2 px-3 text-right text-gray-400 font-mono">{p.g1}</td>
                    <td className="py-2 px-3 text-right text-gray-400 font-mono">{p.g2}</td>
                    <td className="py-2 px-3 text-right text-gray-400 font-mono">{p.t2}</td>
                    <td className="py-2 px-3 text-right text-white font-mono font-bold">{p.ops}</td>
                    <td className="py-2 px-3 text-right text-gray-400 font-mono">{p.rb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InsightCallout>
            IBM Torino has 4x the operations budget of Tuna-9 (2200 vs 550 before T₂),
            but its raw Bell fidelity is lower (86.5% vs 93.5%). Why? Because IBM uses
            default qubit placement, while we hand-picked the best Tuna-9 pair.
            Knowing your chip beats having more qubits.
          </InsightCallout>
        </section>

        {/* ── Section 5: Noise on Real Hardware ── */}
        <section className="mb-20">
          <SectionLabel>Across Three Chips</SectionLabel>
          <h2 className="text-2xl font-bold mb-4">Same circuit, different noise</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            We ran identical Bell-state circuits on all three platforms. The dominant
            noise channel determines both the error rate and which mitigation works.
          </p>

          <FidelityComparisonSVG />

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {PLATFORM_NOISE.map(p => (
              <div key={p.name} className="p-4 rounded-lg border" style={{ borderColor: `${p.color}20`, backgroundColor: `${p.color}03` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className="text-[10px] font-mono text-gray-600 ml-auto">{p.qubits}q</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div><span className="text-gray-400">T₁:</span> {p.t1}</div>
                  <div><span className="text-gray-400">T₂:</span> {p.t2}</div>
                  <div><span className="text-gray-400">Dominant:</span> <span style={{ color: p.color }}>{p.dominant}</span></div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{p.signature}</p>
              </div>
            ))}
          </div>

          <MetaphorCallout title="Three kitchens, one recipe" accent="#ff8c42">
            Running a circuit on different chips is like cooking the same recipe
            in three kitchens. One has a hot oven (depolarizing — burns everything equally).
            Another has a drafty door (dephasing — only the souffl&eacute; collapses).
            The mitigation is different: you don&apos;t fix a draft with oven mitts.
          </MetaphorCallout>
        </section>

        {/* ── Section 6: Noise vs Mitigation ── */}
        <section className="mb-20">
          <SectionLabel>Matching Mitigation to Noise</SectionLabel>
          <h2 className="text-2xl font-bold mb-4">The right tool for the right noise</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Our key finding: mitigation strategy must match the dominant error source.
            TREX (readout correction) achieves 119x improvement when readout dominates.
            ZNE (gate noise extrapolation) fails completely when gates aren&apos;t the bottleneck.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-500 font-mono text-xs">Noise Source</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-mono text-xs">Best Mitigation</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-mono text-xs">Why It Works</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-mono text-xs">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { source: 'Readout errors', mit: 'TREX / REM', why: 'Calibrates measurement, doesn\'t touch circuit', imp: '119x', color: '#00ff88' },
                  { source: 'Dephasing (T₂)', mit: 'Post-selection', why: 'Catches parity violations from phase flips', imp: '3.7x', color: '#8b5cf6' },
                  { source: 'Gate errors', mit: 'ZNE', why: 'Amplify gate noise, extrapolate to zero', imp: '1.3x*', color: '#ff6b9d' },
                  { source: 'Decoherence (T₁)', mit: 'Dynamical decoupling', why: 'Refocusing pulses during idle time', imp: '~2x', color: '#ff8c42' },
                ].map(r => (
                  <tr key={r.source} className="border-b border-white/5">
                    <td className="py-2 px-3 text-gray-300 font-mono">{r.source}</td>
                    <td className="py-2 px-3 font-mono font-bold" style={{ color: r.color }}>{r.mit}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs">{r.why}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: r.color }}>{r.imp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-600 font-mono mt-2">
            *ZNE 1.3x on IBM kicked Ising (gate-noise-dominated circuit). For our shallow VQE circuit, ZNE gives only 2x because gates aren&apos;t the bottleneck.
          </p>
        </section>

        {/* ── Section 7: Key Terms ── */}
        <section className="mb-20">
          <SectionLabel>Key Terms</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { term: 'T₁ (Relaxation time)', def: 'Time for the qubit to lose energy and decay from |1⟩ to |0⟩. Sets the ultimate coherence limit.' },
              { term: 'T₂ (Dephasing time)', def: 'Time for the qubit to lose phase coherence. Always T₂ ≤ 2T₁. Determines frequency selectivity.' },
              { term: 'Depolarizing channel', def: 'Noise that applies random Pauli errors (X, Y, Z) with equal probability. Shrinks the Bloch vector uniformly.' },
              { term: 'Dephasing channel', def: 'Noise that only applies Z errors. Shrinks the equatorial (x-y) plane while preserving the z component.' },
              { term: 'Amplitude damping', def: 'Physical process of T₁ decay. The qubit spontaneously emits a photon and falls to |0⟩.' },
              { term: 'Readout error', def: 'Misidentifying |0⟩ as |1⟩ or vice versa during measurement. Often asymmetric (|1⟩→|0⟩ more common).' },
              { term: 'Pauli error rate', def: 'Probability of a random X, Y, or Z error per gate. Measured by randomized benchmarking (RB).' },
              { term: 'Error budget', def: 'Breakdown of total circuit error by source. Guides which mitigation technique to apply first.' },
              { term: 'Confusion matrix', def: 'Calibration data showing readout error rates. Prep |0⟩ and |1⟩, measure, count misidentifications.' },
              { term: 'TREX', def: 'Twirled Readout EXtraction. IBM\'s readout mitigation that randomly flips measurement basis across shots and classically corrects.' },
            ].map(t => (
              <div key={t.term} className="py-2 border-b border-white/5">
                <dt className="text-sm font-semibold text-white">{t.term}</dt>
                <dd className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.def}</dd>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 8: References ── */}
        <section className="mb-20">
          <SectionLabel>References</SectionLabel>
          <div className="space-y-3">
            {[
              { title: 'A Quantum Engineer\'s Guide to Superconducting Qubits', authors: 'Krantz et al.', link: 'https://arxiv.org/abs/1904.06560', detail: 'Comprehensive review of transmon physics, noise, and readout' },
              { title: 'Quantum Error Mitigation', authors: 'Endo, Cai, Benjamin, Li', link: 'https://arxiv.org/abs/2210.00921', detail: 'Survey of error mitigation techniques' },
              { title: 'Our error mitigation experiments', authors: '', link: '/error-mitigation', detail: '15 techniques ranked on real hardware data' },
              { title: 'Our coherence module', authors: '', link: '/how-qubits-work/coherence', detail: 'Interactive T₁/T₂ curves and linewidth' },
            ].map(r => (
              <a
                key={r.title}
                href={r.link}
                target={r.link.startsWith('http') ? '_blank' : undefined}
                rel={r.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="block p-3 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all"
              >
                <span className="text-sm text-white font-medium">{r.title}</span>
                {r.authors && <span className="text-xs text-gray-600 ml-2">{r.authors}</span>}
                <span className="block text-[11px] text-gray-500 mt-0.5">{r.detail}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Explore More ── */}
        <section className="mb-12">
          <SectionLabel>Explore More</SectionLabel>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { href: '/error-mitigation', label: 'Error Mitigation', desc: '15 techniques ranked', color: '#00ff88' },
              { href: '/resonance', label: 'Resonance', desc: 'Spectroscopy & linewidth', color: '#00d4ff' },
              { href: '/entanglement', label: 'Entanglement', desc: 'Bell states & hardware', color: '#8b5cf6' },
              { href: '/how-qubits-work/coherence', label: 'Coherence', desc: 'T₁, T₂, and linewidth', color: '#ff6b9d' },
            ].map(c => (
              <Link
                key={c.href}
                href={c.href}
                className="p-4 rounded-lg border transition-all hover:scale-[1.02]"
                style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}03` }}
              >
                <span className="text-sm font-bold text-white">{c.label}</span>
                <span className="block text-[11px] text-gray-500 mt-1">{c.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/50 py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono">haiqu — TU Delft / QuTech</p>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-[#00d4ff] transition-colors">Home</Link>
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <Link href="/learn" className="hover:text-[#8b5cf6] transition-colors">Learn</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
