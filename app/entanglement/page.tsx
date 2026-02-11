'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// DATA — All from our actual experiments
// ============================================================

const BELL_STATES = [
  {
    name: '\u03A6+', symbol: '(|00\u27E9+|11\u27E9)/\u221A2',
    amps: [1, 0, 0, 1], signs: [1, 0, 0, 1],
    desc: 'Both qubits always agree',
    corr: 'If q0 is 0, q1 is 0. If q0 is 1, q1 is 1.',
    circuit: 'H on q0, then CNOT',
    color: '#00ff88',
  },
  {
    name: '\u03A6\u2212', symbol: '(|00\u27E9\u2212|11\u27E9)/\u221A2',
    amps: [1, 0, 0, 1], signs: [1, 0, 0, -1],
    desc: 'Agree, with a hidden phase flip',
    corr: 'If q0 is 0, q1 is 0. If q0 is 1, q1 is 1. But the |11\u27E9 amplitude carries a minus sign.',
    circuit: 'Z on q0, then H, then CNOT',
    color: '#00d4ff',
  },
  {
    name: '\u03A8+', symbol: '(|01\u27E9+|10\u27E9)/\u221A2',
    amps: [0, 1, 1, 0], signs: [0, 1, 1, 0],
    desc: 'Always disagree',
    corr: 'If q0 is 0, q1 is 1. If q0 is 1, q1 is 0.',
    circuit: 'X on q1, then H on q0, then CNOT',
    color: '#8b5cf6',
  },
  {
    name: '\u03A8\u2212', symbol: '(|01\u27E9\u2212|10\u27E9)/\u221A2',
    amps: [0, 1, 1, 0], signs: [0, 1, -1, 0],
    desc: 'Disagree, with a phase flip (singlet)',
    corr: 'If q0 is 0, q1 is 1. If q0 is 1, q1 is 0. The singlet state \u2014 rotationally invariant.',
    circuit: 'X on q1, Z on q0, then H, then CNOT',
    color: '#ff6b9d',
  },
]

const BELL_FIDELITY = [
  { label: 'Emulator', fidelity: 100.0, color: '#00ff88', sub: '' },
  { label: 'IBM Torino', fidelity: 99.05, color: '#ff8c42', sub: 'default qubits' },
  { label: 'IQM Garnet', fidelity: 98.4, color: '#8b5cf6', sub: 'best pair' },
  { label: 'IQM mean', fidelity: 96.3, color: '#8b5cf6', sub: '22 pairs swept' },
  { label: 'Tuna-9 q[2,4]', fidelity: 96.6, color: '#00d4ff', sub: 'best pair' },
  { label: 'Tuna-9 q[4,6]', fidelity: 93.5, color: '#00d4ff', sub: '' },
  { label: 'IQM worst', fidelity: 91.2, color: '#8b5cf6', sub: '' },
  { label: 'Tuna-9 q[0,1]', fidelity: 87.0, color: '#00d4ff', sub: 'worst pair' },
]

const GHZ_SCALING = [
  { n: 3, emu: 100, ibm: 98.1, iqm: 93.9, tuna: 88.9 },
  { n: 5, emu: 100, ibm: 76.6, iqm: 81.8, tuna: 83.8 },
  { n: 10, emu: 100, ibm: 62.2, iqm: 54.7, tuna: null },
  { n: 50, emu: 100, ibm: 8.5, iqm: null, tuna: null },
]

// ============================================================
// HELPERS
// ============================================================

function MetaphorCallout({ title, children, accent = '#ff6b9d' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: `${accent}20`, backgroundColor: `${accent}05` }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: accent }}>Metaphor</span>
      <p className="text-sm text-gray-300 mt-1">
        <span className="font-semibold text-white">{title}</span> {children}
      </p>
    </div>
  )
}

// ============================================================
// SVG: Bell Circuit Diagram
// ============================================================

function BellCircuitSVG() {
  const W = 700, H = 200
  const y0 = 70, y1 = 140 // wire positions
  const gateSize = 32

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Qubit labels */}
      <text x={30} y={y0 + 5} textAnchor="end" fill="#94a3b8" fontSize={13} fontFamily="monospace">|0\u27E9</text>
      <text x={30} y={y1 + 5} textAnchor="end" fill="#94a3b8" fontSize={13} fontFamily="monospace">|0\u27E9</text>

      {/* Wires */}
      <line x1={40} y1={y0} x2={520} y2={y0} stroke="#334155" strokeWidth={2} />
      <line x1={40} y1={y1} x2={520} y2={y1} stroke="#334155" strokeWidth={2} />

      {/* H gate */}
      <rect x={140 - gateSize/2} y={y0 - gateSize/2} width={gateSize} height={gateSize} fill="#111827" stroke="#00d4ff" strokeWidth={2} rx={4} />
      <text x={140} y={y0 + 5} textAnchor="middle" fill="#00d4ff" fontSize={16} fontWeight="bold">H</text>

      {/* CNOT */}
      <line x1={280} y1={y0} x2={280} y2={y1} stroke="#ff6b9d" strokeWidth={2} />
      <circle cx={280} cy={y0} r={6} fill="#ff6b9d" />
      <circle cx={280} cy={y1} r={14} fill="none" stroke="#ff6b9d" strokeWidth={2} />
      <line x1={280 - 10} y1={y1} x2={280 + 10} y2={y1} stroke="#ff6b9d" strokeWidth={2} />
      <line x1={280} y1={y1 - 10} x2={280} y2={y1 + 10} stroke="#ff6b9d" strokeWidth={2} />

      {/* Measurement */}
      <rect x={420 - gateSize/2} y={y0 - gateSize/2} width={gateSize} height={gateSize} fill="#111827" stroke="#64748b" strokeWidth={1.5} rx={4} />
      <path d={`M${420-8} ${y0+6} Q${420} ${y0-10} ${420+8} ${y0+6}`} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <line x1={420} y1={y0 - 2} x2={420 + 6} y2={y0 - 10} stroke="#64748b" strokeWidth={1.5} />

      <rect x={420 - gateSize/2} y={y1 - gateSize/2} width={gateSize} height={gateSize} fill="#111827" stroke="#64748b" strokeWidth={1.5} rx={4} />
      <path d={`M${420-8} ${y1+6} Q${420} ${y1-10} ${420+8} ${y1+6}`} fill="none" stroke="#64748b" strokeWidth={1.5} />
      <line x1={420} y1={y1 - 2} x2={420 + 6} y2={y1 - 10} stroke="#64748b" strokeWidth={1.5} />

      {/* State annotations */}
      <text x={90} y={28} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace">|00\u27E9</text>
      <text x={210} y={28} textAnchor="middle" fill="#00d4ff" fontSize={10} fontFamily="monospace">(|0\u27E9+|1\u27E9)|0\u27E9/\u221A2</text>
      <text x={350} y={28} textAnchor="middle" fill="#ff6b9d" fontSize={10} fontFamily="monospace">(|00\u27E9+|11\u27E9)/\u221A2</text>
      <text x={480} y={28} textAnchor="middle" fill="#00ff88" fontSize={10} fontFamily="monospace">00 or 11</text>

      {/* Stage arrows */}
      <line x1={130} y1={38} x2={130} y2={y0 - 20} stroke="#1e293b" strokeWidth={1} strokeDasharray="2,2" />
      <line x1={210} y1={38} x2={210} y2={y0 - 20} stroke="#1e293b" strokeWidth={1} strokeDasharray="2,2" />
      <line x1={350} y1={38} x2={350} y2={y0 - 20} stroke="#1e293b" strokeWidth={1} strokeDasharray="2,2" />

      {/* Labels */}
      <text x={140} y={H - 15} textAnchor="middle" fill="#00d4ff" fontSize={9} fontFamily="monospace">Superposition</text>
      <text x={280} y={H - 15} textAnchor="middle" fill="#ff6b9d" fontSize={9} fontFamily="monospace">Entangle</text>
      <text x={420} y={H - 15} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">Measure</text>
    </svg>
  )
}

// ============================================================
// SVG: Bell State Amplitude Bars
// ============================================================

function BellAmplitudesSVG({ bellIdx }: { bellIdx: number }) {
  const W = 700, H = 160
  const bell = BELL_STATES[bellIdx]
  const labels = ['|00\u27E9', '|01\u27E9', '|10\u27E9', '|11\u27E9']
  const barW = 80, gap = 40, maxH = 100
  const startX = (W - 4 * barW - 3 * gap) / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {labels.map((label, i) => {
        const x = startX + i * (barW + gap)
        const hasAmp = bell.amps[i] > 0
        const sign = bell.signs[i]
        const h = hasAmp ? maxH * 0.7 : 0
        const color = sign < 0 ? '#ff6b9d' : bell.color

        return (
          <g key={i}>
            {/* Bar */}
            <rect x={x} y={H - 35 - h} width={barW} height={Math.max(h, 0)} fill={color} opacity={hasAmp ? 0.8 : 0.1} rx={4} />
            {/* Amplitude label */}
            {hasAmp && (
              <text x={x + barW/2} y={H - 35 - h - 8} textAnchor="middle" fill={color} fontSize={12} fontWeight="bold" fontFamily="monospace">
                {sign > 0 ? '+' : '\u2212'}1/\u221A2
              </text>
            )}
            {/* Basis label */}
            <text x={x + barW/2} y={H - 14} textAnchor="middle" fill="#94a3b8" fontSize={12} fontFamily="monospace">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================
// SVG: Separability Slider
// ============================================================

function SeparabilitySVG({ theta }: { theta: number }) {
  const W = 700, H = 240
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  const concurrence = Math.abs(Math.sin(2 * theta))
  const p0 = cosT * cosT
  const p1 = sinT * sinT
  const entropy = (p0 > 1e-10 && p1 > 1e-10)
    ? -p0 * Math.log2(p0) - p1 * Math.log2(p1)
    : 0

  const labels = ['|00\u27E9', '|01\u27E9', '|10\u27E9', '|11\u27E9']
  const probs = [p0, 0, 0, p1]
  const barW = 60, gap = 25, maxH = 120
  const startX = 50

  // Gauge positions
  const gaugeX = 480, gaugeW = 180

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Amplitude bars */}
      {labels.map((label, i) => {
        const x = startX + i * (barW + gap)
        const h = probs[i] * maxH

        return (
          <g key={i}>
            <rect x={x} y={H - 50 - maxH} width={barW} height={maxH} fill="#ffffff" opacity={0.02} rx={4} />
            <rect x={x} y={H - 50 - h} width={barW} height={Math.max(h, 0)} fill={i === 0 ? '#00d4ff' : '#ff6b9d'} opacity={0.8} rx={4} />
            {probs[i] > 0.01 && (
              <text x={x + barW/2} y={H - 50 - h - 8} textAnchor="middle" fill="white" fontSize={11} fontFamily="monospace">
                {(probs[i] * 100).toFixed(0)}%
              </text>
            )}
            <text x={x + barW/2} y={H - 30} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="monospace">{label}</text>
          </g>
        )
      })}

      {/* Concurrence gauge */}
      <text x={gaugeX} y={40} fill="white" fontSize={12} fontWeight="bold">Concurrence</text>
      <rect x={gaugeX} y={50} width={gaugeW} height={16} fill="#ffffff" opacity={0.05} rx={8} />
      <rect x={gaugeX} y={50} width={gaugeW * concurrence} height={16} fill="#ff6b9d" opacity={0.8} rx={8} />
      <text x={gaugeX + gaugeW + 8} y={62} fill="#ff6b9d" fontSize={12} fontWeight="bold" fontFamily="monospace">{concurrence.toFixed(2)}</text>

      {/* Entropy gauge */}
      <text x={gaugeX} y={100} fill="white" fontSize={12} fontWeight="bold">Entropy</text>
      <rect x={gaugeX} y={110} width={gaugeW} height={16} fill="#ffffff" opacity={0.05} rx={8} />
      <rect x={gaugeX} y={110} width={gaugeW * entropy} height={16} fill="#8b5cf6" opacity={0.8} rx={8} />
      <text x={gaugeX + gaugeW + 8} y={122} fill="#8b5cf6" fontSize={12} fontWeight="bold" fontFamily="monospace">{entropy.toFixed(2)}</text>

      {/* State label */}
      <text x={gaugeX} y={165} fill="#94a3b8" fontSize={11}>
        {concurrence < 0.01 ? 'Separable (product state)' : concurrence > 0.99 ? 'Maximally entangled (Bell state)' : 'Partially entangled'}
      </text>

      {/* Entangled indicator */}
      <circle cx={gaugeX + gaugeW - 10} cy={160} r={6} fill={concurrence > 0.01 ? '#ff6b9d' : '#334155'} opacity={concurrence > 0.01 ? 0.9 : 0.5} />

      {/* State formula */}
      <text x={gaugeX} y={195} fill="#64748b" fontSize={10} fontFamily="monospace">
        {cosT.toFixed(2)}|00\u27E9 + {sinT.toFixed(2)}|11\u27E9
      </text>
    </svg>
  )
}

// ============================================================
// SVG: GHZ vs W Comparison
// ============================================================

function GHZvsWSVG() {
  const W = 700, H = 260
  const mid = W / 2

  // Triangle positions for 3 qubits
  const tri = (cx: number, cy: number, r: number) => [
    { x: cx, y: cy - r },
    { x: cx - r * 0.866, y: cy + r * 0.5 },
    { x: cx + r * 0.866, y: cy + r * 0.5 },
  ]

  const leftTri = tri(mid / 2, 110, 55)
  const rightTri = tri(mid + mid / 2, 110, 55)

  const drawTriangle = (pts: { x: number; y: number }[], edgeColor: string, edgeOpacity: number[], labels: string[], qColor: string) => (
    <>
      {/* Edges */}
      {[[0, 1], [1, 2], [0, 2]].map(([a, b], i) => (
        <line key={`e${i}`} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y}
          stroke={edgeColor} strokeWidth={edgeOpacity[i] > 0 ? 2 + edgeOpacity[i] * 2 : 1}
          opacity={edgeOpacity[i] > 0 ? edgeOpacity[i] : 0.15}
          strokeDasharray={edgeOpacity[i] <= 0 ? '4,4' : 'none'}
        />
      ))}
      {/* Nodes */}
      {pts.map((p, i) => (
        <g key={`n${i}`}>
          <circle cx={p.x} cy={p.y} r={18} fill="#111827" stroke={qColor} strokeWidth={2} />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold" fontFamily="monospace">{labels[i]}</text>
        </g>
      ))}
    </>
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Divider */}
      <line x1={mid} y1={20} x2={mid} y2={H - 10} stroke="#1e293b" strokeWidth={1} strokeDasharray="4,4" />

      {/* GHZ title */}
      <text x={mid / 2} y={25} textAnchor="middle" fill="#00ff88" fontSize={14} fontWeight="bold">GHZ State</text>
      <text x={mid / 2} y={42} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace">(|000\u27E9+|111\u27E9)/\u221A2</text>

      {/* W title */}
      <text x={mid + mid / 2} y={25} textAnchor="middle" fill="#ff8c42" fontSize={14} fontWeight="bold">W State</text>
      <text x={mid + mid / 2} y={42} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace">(|001\u27E9+|010\u27E9+|100\u27E9)/\u221A3</text>

      {/* GHZ triangle — all edges equal strength */}
      {drawTriangle(leftTri, '#00ff88', [1, 1, 1], ['q0', 'q1', 'q2'], '#00ff88')}

      {/* W triangle — weighted edges */}
      {drawTriangle(rightTri, '#ff8c42', [0.7, 0.7, 0.7], ['q0', 'q1', 'q2'], '#ff8c42')}

      {/* Lose a qubit annotation */}
      <text x={mid / 2} y={195} textAnchor="middle" fill="#94a3b8" fontSize={10}>Lose one qubit:</text>
      <text x={mid / 2} y={212} textAnchor="middle" fill="#ff6b9d" fontSize={11} fontWeight="bold">All entanglement lost</text>
      <text x={mid / 2} y={228} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">Concurrence = 0</text>

      <text x={mid + mid / 2} y={195} textAnchor="middle" fill="#94a3b8" fontSize={10}>Lose one qubit:</text>
      <text x={mid + mid / 2} y={212} textAnchor="middle" fill="#00ff88" fontSize={11} fontWeight="bold">Entanglement survives</text>
      <text x={mid + mid / 2} y={228} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">Concurrence = 2/3</text>

      {/* X marks on GHZ */}
      <text x={leftTri[0].x + 25} y={leftTri[0].y - 5} fill="#ff6b9d" fontSize={16} fontWeight="bold">\u2717</text>
      {/* Check on W */}
      <text x={rightTri[0].x + 25} y={rightTri[0].y - 5} fill="#00ff88" fontSize={16} fontWeight="bold">\u2713</text>
    </svg>
  )
}

// ============================================================
// SVG: Bell Fidelity Bar Chart
// ============================================================

function BellFidelityChart() {
  const W = 700, H = BELL_FIDELITY.length * 32 + 50
  const labelW = 140, barMaxW = 480

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {BELL_FIDELITY.map((d, i) => {
        const y = 25 + i * 32
        const w = ((d.fidelity - 80) / 20) * barMaxW // Scale: 80-100%
        const barH = 22
        return (
          <g key={i}>
            <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize={10} fontFamily="monospace">{d.label}</text>
            <rect x={labelW} y={y} width={Math.max(w, 4)} height={barH} fill={d.color} opacity={0.8} rx={3} />
            <text x={labelW + w + 8} y={y + barH / 2 + 4} fill="white" fontSize={11} fontWeight="bold" fontFamily="monospace">
              {d.fidelity.toFixed(1)}%
            </text>
            {d.sub && (
              <text x={labelW + w + 55} y={y + barH / 2 + 4} fill="#64748b" fontSize={9} fontFamily="monospace">{d.sub}</text>
            )}
          </g>
        )
      })}
      {/* Scale markers */}
      {[80, 85, 90, 95, 100].map(v => {
        const x = labelW + ((v - 80) / 20) * barMaxW
        return (
          <g key={v}>
            <line x1={x} y1={15} x2={x} y2={H - 5} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2,4" />
            <text x={x} y={12} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">{v}%</text>
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================
// SVG: GHZ Scaling Chart
// ============================================================

function GHZScalingChart() {
  const W = 700, H = 260
  const px = 80, py = 30, pw = 540, ph = 180

  const xPositions = { 3: 0, 5: 0.15, 10: 0.45, 50: 1.0 }
  const scaleX = (n: number) => px + (xPositions[n as keyof typeof xPositions] ?? 0) * pw
  const scaleY = (f: number) => py + ph - (f / 100) * ph

  const platforms = [
    { key: 'emu' as const, name: 'Emulator', color: '#00ff88' },
    { key: 'ibm' as const, name: 'IBM Torino', color: '#ff8c42' },
    { key: 'iqm' as const, name: 'IQM Garnet', color: '#8b5cf6' },
    { key: 'tuna' as const, name: 'Tuna-9', color: '#00d4ff' },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Axes */}
      <line x1={px} y1={py} x2={px} y2={py + ph} stroke="#1e293b" strokeWidth={1} />
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} stroke="#1e293b" strokeWidth={1} />

      {/* Y axis */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <text x={px - 8} y={scaleY(v) + 4} textAnchor="end" fill="#64748b" fontSize={9} fontFamily="monospace">{v}%</text>
          <line x1={px} y1={scaleY(v)} x2={px + pw} y2={scaleY(v)} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2,4" />
        </g>
      ))}

      {/* X axis labels */}
      {GHZ_SCALING.map(d => (
        <text key={d.n} x={scaleX(d.n)} y={py + ph + 18} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace">{d.n}q</text>
      ))}
      <text x={px + pw / 2} y={py + ph + 35} textAnchor="middle" fill="#64748b" fontSize={10}>GHZ qubits</text>

      {/* Lines and points for each platform */}
      {platforms.map(plat => {
        const points = GHZ_SCALING
          .filter(d => d[plat.key] !== null)
          .map(d => ({ x: scaleX(d.n), y: scaleY(d[plat.key] as number), val: d[plat.key] as number }))

        if (points.length < 2) return null

        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

        return (
          <g key={plat.key}>
            <path d={pathD} fill="none" stroke={plat.color} strokeWidth={2} opacity={0.7} />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={4} fill={plat.color} opacity={0.9} />
                <text x={p.x + (plat.key === 'tuna' ? -8 : 8)} y={p.y + (plat.key === 'ibm' ? 14 : -8)}
                  textAnchor={plat.key === 'tuna' ? 'end' : 'start'}
                  fill={plat.color} fontSize={9} fontFamily="monospace" opacity={0.8}>
                  {p.val.toFixed(1)}%
                </text>
              </g>
            ))}
          </g>
        )
      })}

      {/* Legend */}
      {platforms.map((p, i) => (
        <g key={p.key} transform={`translate(${px + 10 + i * 130}, ${H - 15})`}>
          <rect width={8} height={8} fill={p.color} opacity={0.7} rx={2} />
          <text x={12} y={8} fill="#94a3b8" fontSize={9} fontFamily="monospace">{p.name}</text>
        </g>
      ))}
    </svg>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function EntanglementPage() {
  const [selectedBell, setSelectedBell] = useState(0)
  const [theta, setTheta] = useState(Math.PI / 4) // 0 = product, π/4 = Bell

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav section="Learn" />

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-16">
          <span className="font-mono text-xs text-[#ff6b9d] tracking-[0.2em] uppercase">Learn</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
            <span className="gradient-text-pink">Entanglement</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            The correlation that has no classical explanation. Two entangled qubits
            share a fate &mdash; measure one and you instantly know the other, no matter the distance.
            This is quantum computing&apos;s most powerful resource.
          </p>
        </div>

        {/* ============================================ */}
        {/* SECTION 1: What is Entanglement? */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">What Makes It Strange</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Two classical coins can both show heads &mdash; but that&apos;s just because each was heads
            independently. Entangled qubits are different: <em>neither one has a definite value</em> until
            measured, yet their outcomes are perfectly correlated. Einstein called this
            &ldquo;spooky action at a distance.&rdquo;
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg border border-[#1e293b] bg-[#111827]/40">
              <span className="font-mono text-xs text-[#64748b] tracking-wider uppercase">Classical</span>
              <p className="text-white font-semibold mt-2 mb-1">Correlated coins</p>
              <p className="text-gray-400 text-sm">
                Two coins in separate boxes. You peek at one &mdash; it&apos;s heads. The other might be
                heads or tails. Each coin had a definite state all along. Boring.
              </p>
            </div>
            <div className="p-5 rounded-lg border" style={{ borderColor: '#ff6b9d20', backgroundColor: '#ff6b9d05' }}>
              <span className="font-mono text-xs text-[#ff6b9d] tracking-wider uppercase">Quantum</span>
              <p className="text-white font-semibold mt-2 mb-1">Entangled qubits</p>
              <p className="text-gray-400 text-sm">
                Neither qubit is 0 or 1 until measured. But when you measure one, the
                other&apos;s outcome is <em>instantly determined</em>. Not because it was predetermined &mdash;
                because they share a single quantum state.
              </p>
            </div>
          </div>

          <MetaphorCallout title="Two dice that always sum to 7 &mdash;" accent="#ff6b9d">
            but neither die has a value until you look. And it doesn&apos;t matter if they&apos;re
            on opposite sides of the universe. The correlation isn&apos;t hidden information &mdash;
            it&apos;s the fundamental nature of the quantum state.
          </MetaphorCallout>
        </section>

        {/* ============================================ */}
        {/* SECTION 2: Creating a Bell State */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Creating Entanglement</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            A Bell state is the simplest entangled state &mdash; two qubits, maximally correlated.
            It takes just two gates: a Hadamard (H) to create superposition, then a CNOT to entangle.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <BellCircuitSVG />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { step: '1', gate: 'H gate', desc: 'Puts q0 into superposition: equal chance of 0 or 1.', color: '#00d4ff' },
              { step: '2', gate: 'CNOT', desc: 'Flips q1 if q0 is 1. Now their fates are linked.', color: '#ff6b9d' },
              { step: '3', gate: 'Measure', desc: 'Always get 00 or 11. Never 01 or 10. That\'s entanglement.', color: '#00ff88' },
            ].map(s => (
              <div key={s.step} className="p-4 rounded-lg border" style={{ borderColor: `${s.color}20`, backgroundColor: `${s.color}05` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold" style={{ color: s.color }}>Step {s.step}</span>
                  <span className="text-white text-sm font-semibold">{s.gate}</span>
                </div>
                <p className="text-gray-400 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 3: The Four Bell States */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">The Four Bell States</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            There are exactly four maximally entangled two-qubit states. They differ in which outcomes
            are correlated and whether there&apos;s a relative phase. Click to explore each one.
          </p>

          {/* Bell state selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {BELL_STATES.map((b, i) => (
              <button
                key={i}
                onClick={() => setSelectedBell(i)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  i === selectedBell
                    ? 'bg-white/5 border-white/20'
                    : 'bg-white/[0.02] border-[#1e293b] hover:border-white/10'
                }`}
              >
                <span className="font-mono text-lg font-bold" style={{ color: b.color }}>|{b.name}\u27E9</span>
                <p className="text-gray-500 text-xs mt-0.5 font-mono">{b.symbol}</p>
              </button>
            ))}
          </div>

          {/* Amplitude visualization */}
          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <BellAmplitudesSVG bellIdx={selectedBell} />
          </div>

          {/* Description */}
          <div className="mt-4 p-4 rounded-lg border border-[#1e293b] bg-[#111827]/60">
            <p className="text-white text-sm font-semibold">{BELL_STATES[selectedBell].desc}</p>
            <p className="text-gray-400 text-sm mt-1">{BELL_STATES[selectedBell].corr}</p>
            <p className="text-gray-600 text-xs mt-2 font-mono">Circuit: {BELL_STATES[selectedBell].circuit}</p>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 4: Separability Slider */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">From Product to Bell</h2>
          <p className="text-gray-400 mb-4 max-w-2xl">
            Entanglement isn&apos;t binary &mdash; states can be partially entangled. Drag the slider
            to smoothly transition from a separable product state |00\u27E9 to a maximally
            entangled Bell state |\u03A6+\u27E9. Watch the concurrence climb from 0 to 1.
          </p>

          {/* Slider */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-gray-500 text-xs font-mono">|00\u27E9</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(theta / (Math.PI / 4) * 100)}
              onChange={e => setTheta((parseFloat(e.target.value) / 100) * Math.PI / 4)}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #00d4ff, #ff6b9d)` }}
            />
            <span className="text-gray-500 text-xs font-mono">|\u03A6+\u27E9</span>
          </div>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <SeparabilitySVG theta={theta} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-lg bg-[#111827]/50 border border-[#1e293b]">
              <span className="text-gray-400 text-xs">Concurrence</span>
              <p className="font-mono text-lg font-bold text-[#ff6b9d]">{Math.abs(Math.sin(2 * theta)).toFixed(3)}</p>
              <span className="text-gray-600 text-xs">0 = separable, 1 = max entangled</span>
            </div>
            <div className="p-3 rounded-lg bg-[#111827]/50 border border-[#1e293b]">
              <span className="text-gray-400 text-xs">von Neumann entropy</span>
              <p className="font-mono text-lg font-bold text-[#8b5cf6]">
                {(() => {
                  const c = Math.cos(theta), s = Math.sin(theta)
                  const p0 = c*c, p1 = s*s
                  return (p0 > 1e-10 && p1 > 1e-10) ? (-p0*Math.log2(p0) - p1*Math.log2(p1)).toFixed(3) : '0.000'
                })()}
              </p>
              <span className="text-gray-600 text-xs">0 = pure subsystem, 1 = maximally mixed</span>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 5: GHZ vs W */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Two Kinds of Multi-Qubit Entanglement</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            With three or more qubits, entanglement comes in fundamentally different flavors.
            GHZ and W states can&apos;t be converted into each other, even with local operations.
            They represent two distinct classes of quantum correlation.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <GHZvsWSVG />
          </div>

          {/* Comparison table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left py-2 text-gray-400 font-mono text-xs">Property</th>
                  <th className="text-left py-2 font-mono text-xs" style={{ color: '#00ff88' }}>GHZ</th>
                  <th className="text-left py-2 font-mono text-xs" style={{ color: '#ff8c42' }}>W</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                {[
                  ['State', '(|000⟩+|111⟩)/√2', '(|001⟩+|010⟩+|100⟩)/√3'],
                  ['Entanglement', 'All-or-nothing', 'Distributed'],
                  ['Lose 1 qubit', 'All entanglement gone', '2/3 entanglement survives'],
                  ['Use case', 'Quantum error detection', 'Quantum networks'],
                  ['Fragility', 'Extremely fragile', 'Robust to qubit loss'],
                  ['Our data', 'GHZ-3: 88.9% (Tuna-9)', 'Not yet tested on hardware'],
                ].map(([prop, ghz, w], i) => (
                  <tr key={i} className="border-b border-[#1e293b]/50">
                    <td className="py-2 text-gray-500 font-mono text-xs">{prop}</td>
                    <td className="py-2 text-xs">{ghz}</td>
                    <td className="py-2 text-xs">{w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <MetaphorCallout title="A chain vs a web &mdash;" accent="#ff8c42">
            GHZ entanglement is a chain: break any link and the whole thing fails.
            W entanglement is a web: cut a strand and the rest holds. Both are useful
            for different things.
          </MetaphorCallout>
        </section>

        {/* ============================================ */}
        {/* SECTION 6: Entanglement on Real Hardware */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Entanglement on Real Hardware</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Bell state fidelity &mdash; the probability of getting the correct correlated outcome &mdash;
            is the simplest measure of how well a quantum processor can create entanglement.
            We tested it across three processors, sweeping qubit pairs and circuit sizes.
          </p>

          {/* Bell fidelity */}
          <h3 className="text-lg font-semibold mb-3 text-white">Bell State Fidelity</h3>
          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6 mb-8">
            <BellFidelityChart />
          </div>

          {/* GHZ scaling */}
          <h3 className="text-lg font-semibold mb-3 text-white">GHZ Scaling: How Fast Does Entanglement Decay?</h3>
          <p className="text-gray-400 mb-4 text-sm max-w-2xl">
            As you entangle more qubits, fidelity drops. At 50 qubits, IBM Torino achieves
            only 8.5% &mdash; barely above random noise. This decay rate is a key metric for
            quantum error correction readiness.
          </p>
          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <GHZScalingChart />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Best Bell pair', value: '99.05%', detail: 'IBM Torino', color: '#ff8c42' },
              { label: 'Most pairs swept', value: '22/29', detail: 'IQM Garnet (96.3% mean)', color: '#8b5cf6' },
              { label: 'Largest GHZ', value: '50 qubits', detail: '8.5% fidelity (IBM)', color: '#00d4ff' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#111827]/50 border border-[#1e293b] text-center">
                <span className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
                <p className="text-gray-500 text-xs mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 7: Why It Matters */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Why Entanglement Matters</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Entanglement isn&apos;t just a curiosity &mdash; it&apos;s the resource that makes quantum computing
            more powerful than classical computing. Every quantum advantage relies on it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Quantum Advantage',
                desc: 'Simulating a highly entangled state of n qubits requires 2^n classical resources. At ~50 qubits, no supercomputer can keep up. Entanglement IS the exponential.',
                link: '/experiments',
                color: '#00ff88',
              },
              {
                title: 'VQE & Chemistry',
                desc: 'Electron correlation in molecules is entanglement by another name. The CNOT in our H\u2082 circuit creates the entanglement that captures correlation energy. Without it, we get Hartree-Fock \u2014 no chemical accuracy.',
                link: '/hamiltonians',
                color: '#00d4ff',
              },
              {
                title: 'Quantum Teleportation',
                desc: 'A Bell pair is a quantum communication channel. Consume one Bell pair + 2 classical bits to teleport any qubit state. The entanglement is used up in the process.',
                link: '/teleportation',
                color: '#8b5cf6',
              },
              {
                title: 'Error Correction',
                desc: 'Logical qubits are encoded across many entangled physical qubits. The entanglement lets you detect and correct errors without measuring (and destroying) the data. Our [[4,2,2]] experiments encode 2 logical qubits in 4 entangled physicals.',
                link: '/error-mitigation',
                color: '#ff8c42',
              },
            ].map(c => (
              <Link key={c.title} href={c.link} className="p-5 rounded-lg border transition-all hover:bg-white/[0.03] group" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}05` }}>
                <span className="font-bold text-white group-hover:underline">{c.title}</span>
                <p className="text-gray-400 text-sm mt-2">{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* KEY TERMS */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">Key Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { term: 'Bell state', def: 'One of four maximally entangled two-qubit states (\u03A6+, \u03A6\u2212, \u03A8+, \u03A8\u2212). The simplest entangled states.' },
              { term: 'Concurrence', def: 'A measure of two-qubit entanglement from 0 (separable) to 1 (maximally entangled). For pure states: C = |sin(2\u03B8)|.' },
              { term: 'von Neumann entropy', def: 'Entropy of the reduced density matrix. S = 0 for a pure (unentangled) subsystem, S = 1 for maximally mixed (maximally entangled).' },
              { term: 'GHZ state', def: '(|000...0\u27E9+|111...1\u27E9)/\u221A2. All-or-nothing entanglement. Fragile: losing one qubit destroys all entanglement.' },
              { term: 'W state', def: 'Equal superposition of single-excitation states. Robust: entanglement partially survives qubit loss. Concurrence 2/3 after tracing out one qubit.' },
              { term: 'Separable state', def: 'A state that can be written as a product |a\u27E9\u2297|b\u27E9. No entanglement. Local measurements are independent.' },
              { term: 'Density matrix', def: '\u03C1 = |\u03C8\u27E9\u27E8\u03C8|. Encodes both probabilities (diagonal) and coherence (off-diagonal). Partial trace reveals entanglement.' },
              { term: 'Bell inequality', def: 'Classical correlations are bounded by Bell\'s inequality. Quantum entanglement violates it \u2014 proving correlations have no classical explanation.' },
              { term: 'Monogamy', def: 'Entanglement is monogamous: if A is maximally entangled with B, A cannot be entangled with C at all. Constrains multi-party entanglement.' },
              { term: 'LOCC', def: 'Local Operations and Classical Communication. The operations you can do without sharing quantum states. GHZ and W can\'t be converted under LOCC.' },
            ].map(t => (
              <div key={t.term} className="p-3 rounded-lg bg-[#111827]/60 border border-[#1e293b]">
                <span className="text-white font-semibold text-sm">{t.term}</span>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{t.def}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* REFERENCES */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">References</h2>
          <div className="space-y-2 text-sm">
            {[
              { id: 1, text: 'Einstein, Podolsky & Rosen, "Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?" Phys. Rev. 47, 777 (1935)' },
              { id: 2, text: 'Bell, "On the Einstein Podolsky Rosen Paradox," Physics 1, 195 (1964)' },
              { id: 3, text: 'Aspect, Dalibard & Roger, "Experimental Realization of Bell\'s Inequalities," Phys. Rev. Lett. 49, 1804 (1982)' },
              { id: 4, text: 'Greenberger, Horne & Zeilinger, "Going Beyond Bell\'s Theorem," in Bell\'s Theorem, Quantum Theory, and Conceptions of the Universe (1989)' },
              { id: 5, text: 'D\u00FCr, Vidal & Cirac, "Three qubits can be entangled in two inequivalent ways," Phys. Rev. A 62, 062314 (2000)' },
              { id: 6, text: 'Our experimental data: Bell and GHZ fidelity across IBM Torino, QI Tuna-9, and IQM Garnet (2025-2026)' },
            ].map(r => (
              <p key={r.id} className="text-gray-500">
                <span className="text-gray-400 font-mono mr-2">[{r.id}]</span>
                {r.text}
              </p>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* EXPLORE MORE */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">Explore More</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/teleportation', label: 'Teleportation', desc: 'Use entanglement as a quantum channel' },
              { href: '/error-mitigation', label: 'Error Mitigation', desc: '15 techniques ranked on real hardware' },
              { href: '/hamiltonians', label: 'H\u2082 Hamiltonian', desc: 'How entanglement captures correlation' },
              { href: '/resonance', label: 'Resonance', desc: 'How qubits couple to create entanglement' },
              { href: '/bloch-sphere', label: 'Bloch Sphere', desc: 'Single-qubit states and gates' },
              { href: '/state-vector', label: 'State Vectors', desc: 'Multi-qubit amplitudes' },
              { href: '/experiments/bell-calibration', label: 'Bell Experiments', desc: 'All our Bell fidelity data' },
              { href: '/platforms', label: 'Platform Comparison', desc: 'Three chips, one benchmark suite' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="p-4 rounded-lg border border-[#1e293b] bg-[#111827]/30 hover:bg-[#111827]/60 transition-all group"
              >
                <span className="text-white text-sm font-medium group-hover:text-[#ff6b9d] transition-colors">{link.label}</span>
                <span className="block text-gray-500 text-xs mt-0.5">{link.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/50 py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono">haiqu \u2014 TU Delft / QuTech</p>
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
