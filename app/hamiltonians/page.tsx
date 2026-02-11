'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// PES DATA (from vqe-h2-sweep-reference.json)
// ============================================================

interface PESPoint {
  R: number
  fci: number
  hf: number
  theta: number
  g0: number
  g1: number
  g2: number
  g3: number
  g4: number
  g5: number
}

const PES_DATA: PESPoint[] = [
  { R: 0.3, fci: -0.601804, hf: -0.593828, theta: -0.049555, g0: 1.02347, g1: 0.808649, g2: -0.808649, g3: 0.0, g4: 0.080409, g5: 0.080409 },
  { R: 0.4, fci: -0.91415, hf: -0.904361, theta: -0.059428, g0: 0.473277, g1: 0.688819, g2: -0.688819, g3: 0.0, g4: 0.082258, g5: 0.082258 },
  { R: 0.5, fci: -1.05516, hf: -1.042996, theta: -0.071905, g0: 0.123163, g1: 0.58308, g2: -0.58308, g3: 0.0, g4: 0.084435, g5: 0.084435 },
  { R: 0.6, fci: -1.116286, hf: -1.101128, theta: -0.087029, g0: -0.113101, g1: 0.494014, g2: -0.494014, g3: 0.0, g4: 0.086865, g5: 0.086865 },
  { R: 0.7, fci: -1.136189, hf: -1.117349, theta: -0.104868, g0: -0.276438, g1: 0.420456, g2: -0.420456, g3: 0.0, g4: 0.0895, g5: 0.0895 },
  { R: 0.735, fci: -1.137306, hf: -1.116999, theta: -0.111769, g0: -0.321124, g1: 0.397937, g2: -0.397937, g3: 0.0, g4: 0.090466, g5: 0.090466 },
  { R: 0.8, fci: -1.134148, hf: -1.11085, theta: -0.125523, g0: -0.390932, g1: 0.359959, g2: -0.359959, g3: 0.0, g4: 0.092313, g5: 0.092313 },
  { R: 0.9, fci: -1.12056, hf: -1.091914, theta: -0.149201, g0: -0.472339, g1: 0.309787, g2: -0.309787, g3: 0.0, g4: 0.095286, g5: 0.095286 },
  { R: 1.0, fci: -1.10115, hf: -1.066109, theta: -0.17622, g0: -0.531051, g1: 0.267529, g2: -0.267529, g3: 0.0, g4: 0.098395, g5: 0.098395 },
  { R: 1.2, fci: -1.056741, hf: -1.005107, theta: -0.241325, g0: -0.604728, g1: 0.20019, g2: -0.20019, g3: 0.0, g4: 0.104896, g5: 0.104896 },
  { R: 1.5, fci: -0.998149, hf: -0.910874, theta: -0.363345, g0: -0.652671, g1: 0.129101, g2: -0.129101, g3: 0.0, g4: 0.114768, g5: 0.114768 },
  { R: 2.0, fci: -0.948641, hf: -0.783793, theta: -0.56657, g0: -0.662537, g1: 0.060628, g2: -0.060628, g3: 0.0, g4: 0.129569, g5: 0.129569 },
  { R: 2.5, fci: -0.936055, hf: -0.702944, theta: -0.690407, g0: -0.648674, g1: 0.027135, g2: -0.027135, g3: 0.0, g4: 0.141105, g5: 0.141105 },
  { R: 3.0, fci: -0.933632, hf: -0.656048, theta: -0.747919, g0: -0.633578, g1: 0.011235, g2: -0.011235, g3: 0.0, g4: 0.149606, g5: 0.149606 },
]

// ============================================================
// INTERPOLATION HELPERS
// ============================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function interpolatePES(R: number): PESPoint {
  if (R <= PES_DATA[0].R) return PES_DATA[0]
  if (R >= PES_DATA[PES_DATA.length - 1].R) return PES_DATA[PES_DATA.length - 1]
  for (let i = 0; i < PES_DATA.length - 1; i++) {
    if (R >= PES_DATA[i].R && R <= PES_DATA[i + 1].R) {
      const t = (R - PES_DATA[i].R) / (PES_DATA[i + 1].R - PES_DATA[i].R)
      const a = PES_DATA[i]
      const b = PES_DATA[i + 1]
      return {
        R,
        fci: lerp(a.fci, b.fci, t),
        hf: lerp(a.hf, b.hf, t),
        theta: lerp(a.theta, b.theta, t),
        g0: lerp(a.g0, b.g0, t),
        g1: lerp(a.g1, b.g1, t),
        g2: lerp(a.g2, b.g2, t),
        g3: lerp(a.g3, b.g3, t),
        g4: lerp(a.g4, b.g4, t),
        g5: lerp(a.g5, b.g5, t),
      }
    }
  }
  return PES_DATA[0]
}

function vqeEnergy(theta: number, p: PESPoint): number {
  return p.g0 - p.g3 + (p.g2 - p.g1) * Math.cos(theta) + (p.g4 + p.g5) * Math.sin(theta)
}

// ============================================================
// PAULI TERM INFO
// ============================================================

interface PauliTerm {
  id: string
  label: string
  category: 'identity' | 'z-diagonal' | 'entangling'
  color: string
  physical: string
  basis: string
  getCoeff: (p: PESPoint) => number
}

const PAULI_TERMS: PauliTerm[] = [
  { id: 'g0', label: 'I', category: 'identity', color: '#6b7280', physical: 'Energy offset', basis: 'None', getCoeff: p => p.g0 },
  { id: 'g1', label: 'Z\u2080', category: 'z-diagonal', color: '#00d4ff', physical: 'Qubit 0 occupation', basis: 'Z (computational)', getCoeff: p => p.g1 },
  { id: 'g2', label: 'Z\u2081', category: 'z-diagonal', color: '#22d3ee', physical: 'Qubit 1 occupation', basis: 'Z (computational)', getCoeff: p => p.g2 },
  { id: 'g3', label: 'Z\u2080Z\u2081', category: 'z-diagonal', color: '#06b6d4', physical: 'Qubit correlation (Z)', basis: 'Z (computational)', getCoeff: p => p.g3 },
  { id: 'g4', label: 'X\u2080X\u2081', category: 'entangling', color: '#ff6b9d', physical: 'Exchange interaction', basis: 'X (Hadamard rotation)', getCoeff: p => p.g4 },
  { id: 'g5', label: 'Y\u2080Y\u2081', category: 'entangling', color: '#a78bfa', physical: 'Exchange interaction', basis: 'Y (S\u2020 + Hadamard)', getCoeff: p => p.g5 },
]

// ============================================================
// MOLECULE SCALING DATA
// ============================================================

const MOLECULES = [
  { name: 'H\u2082', formula: 'H-H', qubits: 2, qubitsRaw: 4, terms: 6, color: '#00d4ff', difficulty: 'Solved' },
  { name: 'HeH\u207A', formula: 'He-H\u207A', qubits: 2, qubitsRaw: 4, terms: 6, color: '#8b5cf6', difficulty: 'Solved' },
  { name: 'LiH', formula: 'Li-H', qubits: 4, qubitsRaw: 12, terms: 631, color: '#ff6b9d', difficulty: 'Challenging' },
  { name: 'H\u2082O', formula: 'O-H\u2082', qubits: 8, qubitsRaw: 14, terms: 1086, color: '#ff8c42', difficulty: 'Hard' },
  { name: 'N\u2082', formula: 'N\u2261N', qubits: 10, qubitsRaw: 20, terms: 2951, color: '#ef4444', difficulty: 'Frontier' },
]

// ============================================================
// METAPHOR CALLOUT COMPONENT
// ============================================================

function MetaphorCallout({ children, accent = '#00d4ff' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="mt-4 rounded-lg border p-4 text-sm text-gray-300 leading-relaxed"
      style={{ borderColor: accent + '30', backgroundColor: accent + '08' }}
    >
      {children}
    </div>
  )
}

// ============================================================
// SECTION 1: PIPELINE SVG
// ============================================================

function PipelineSVG() {
  const stages = [
    { x: 60, label: 'Molecule', sub: 'H\u2082 at R \u00c5' },
    { x: 260, label: 'Integrals', sub: '1- & 2-electron' },
    { x: 460, label: 'Hamiltonian', sub: '6 Pauli terms' },
    { x: 660, label: 'Circuit', sub: 'Ry + CNOT' },
  ]

  return (
    <svg viewBox="0 0 780 180" className="w-full max-w-4xl mx-auto">
      {/* Arrows between stages */}
      {[0, 1, 2].map(i => {
        const x1 = stages[i].x + 70
        const x2 = stages[i + 1].x - 10
        const cy = 70
        return (
          <g key={`arrow-${i}`}>
            <path
              d={`M ${x1} ${cy} C ${x1 + 30} ${cy}, ${x2 - 30} ${cy}, ${x2} ${cy}`}
              fill="none"
              stroke="#4b5563"
              strokeWidth={1.5}
              markerEnd="url(#arrowhead)"
            />
            <text x={(x1 + x2) / 2} y={cy - 12} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
              {['PySCF', 'Jordan-Wigner', 'Compile'][i]}
            </text>
          </g>
        )
      })}

      {/* Arrowhead marker */}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
        </marker>
      </defs>

      {/* Stage 1: Molecule (two H atoms) */}
      <circle cx={stages[0].x + 20} cy={60} r={14} fill="#00d4ff" opacity={0.3} stroke="#00d4ff" strokeWidth={1.5} />
      <text x={stages[0].x + 20} y={64} fill="white" fontSize="11" fontFamily="monospace" textAnchor="middle">H</text>
      <line x1={stages[0].x + 36} y1={60} x2={stages[0].x + 44} y2={60} stroke="#00d4ff" strokeWidth={2} opacity={0.6} />
      <circle cx={stages[0].x + 58} cy={60} r={14} fill="#00d4ff" opacity={0.3} stroke="#00d4ff" strokeWidth={1.5} />
      <text x={stages[0].x + 58} y={64} fill="white" fontSize="11" fontFamily="monospace" textAnchor="middle">H</text>

      {/* Stage 2: Integral heatmap (4x4 grid) */}
      {[0, 1, 2, 3].map(row =>
        [0, 1, 2, 3].map(col => {
          const intensity = [
            [0.8, 0.2, 0.1, 0.0],
            [0.2, 0.6, 0.0, 0.1],
            [0.1, 0.0, 0.5, 0.3],
            [0.0, 0.1, 0.3, 0.4],
          ][row][col]
          return (
            <rect
              key={`grid-${row}-${col}`}
              x={stages[1].x + col * 16}
              y={42 + row * 16}
              width={14}
              height={14}
              rx={2}
              fill="#00d4ff"
              opacity={intensity * 0.7 + 0.05}
            />
          )
        })
      )}

      {/* Stage 3: Coefficient bars */}
      {[
        { h: 28, color: '#6b7280' },
        { h: 35, color: '#00d4ff' },
        { h: 35, color: '#22d3ee' },
        { h: 0, color: '#06b6d4' },
        { h: 12, color: '#ff6b9d' },
        { h: 12, color: '#a78bfa' },
      ].map((bar, i) => (
        <rect
          key={`bar-${i}`}
          x={stages[2].x + i * 12}
          y={80 - bar.h}
          width={9}
          height={Math.max(bar.h, 1)}
          rx={1}
          fill={bar.color}
          opacity={0.8}
        />
      ))}

      {/* Stage 4: Circuit wires */}
      <line x1={stages[3].x} y1={52} x2={stages[3].x + 60} y2={52} stroke="#4b5563" strokeWidth={1} />
      <line x1={stages[3].x} y1={72} x2={stages[3].x + 60} y2={72} stroke="#4b5563" strokeWidth={1} />
      {/* Ry gate */}
      <rect x={stages[3].x + 8} y={42} width={18} height={18} rx={3} fill="#00d4ff" opacity={0.3} stroke="#00d4ff" strokeWidth={1} />
      <text x={stages[3].x + 17} y={55} fill="white" fontSize="7" fontFamily="monospace" textAnchor="middle">Ry</text>
      {/* CNOT */}
      <circle cx={stages[3].x + 38} cy={52} r={3} fill="#00d4ff" />
      <line x1={stages[3].x + 38} y1={55} x2={stages[3].x + 38} y2={72} stroke="#00d4ff" strokeWidth={1.5} />
      <circle cx={stages[3].x + 38} cy={72} r={6} fill="none" stroke="#00d4ff" strokeWidth={1.5} />
      <line x1={stages[3].x + 32} y1={72} x2={stages[3].x + 44} y2={72} stroke="#00d4ff" strokeWidth={1} />

      {/* Labels */}
      {stages.map((s, i) => (
        <g key={`label-${i}`}>
          <text x={s.x + 35} y={120} fill="white" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">
            {s.label}
          </text>
          <text x={s.x + 35} y={136} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
            {s.sub}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ============================================================
// SECTION 2: ANATOMY BAR CHART
// ============================================================

function AnatomyBarChart({
  pesPoint,
  hoverTerm,
  onHoverTerm,
}: {
  pesPoint: PESPoint
  hoverTerm: string | null
  onHoverTerm: (id: string | null) => void
}) {
  const W = 700
  const H = 300
  const PAD = { top: 20, right: 40, bottom: 80, left: 40 }
  const centerX = W / 2

  const maxAbsCoeff = useMemo(() => {
    return Math.max(...PAULI_TERMS.map(t => Math.abs(t.getCoeff(pesPoint))), 0.01)
  }, [pesPoint])

  const barScale = (val: number) => {
    const range = (W - PAD.left - PAD.right) / 2 - 20
    return (val / maxAbsCoeff) * range
  }

  const barH = 28
  const barGap = 12
  const startY = PAD.top + 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Center line */}
      <line x1={centerX} y1={PAD.top} x2={centerX} y2={H - PAD.bottom + 10} stroke="#1e293b" strokeWidth={1} />
      <text x={centerX} y={H - PAD.bottom + 25} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">0</text>

      {/* Bars */}
      {PAULI_TERMS.map((term, i) => {
        const coeff = term.getCoeff(pesPoint)
        const barWidth = Math.abs(barScale(coeff))
        const y = startY + i * (barH + barGap)
        const isHovered = hoverTerm === term.id
        const isDimmed = hoverTerm !== null && !isHovered

        return (
          <g
            key={term.id}
            onMouseEnter={() => onHoverTerm(term.id)}
            onMouseLeave={() => onHoverTerm(null)}
            style={{ cursor: 'pointer' }}
            opacity={isDimmed ? 0.25 : 1}
          >
            {/* Hover highlight */}
            {isHovered && (
              <rect
                x={PAD.left - 5}
                y={y - 3}
                width={W - PAD.left - PAD.right + 10}
                height={barH + 6}
                rx={4}
                fill="white"
                opacity={0.04}
              />
            )}

            {/* Bar */}
            <rect
              x={coeff >= 0 ? centerX : centerX - barWidth}
              y={y}
              width={Math.max(barWidth, 1)}
              height={barH}
              rx={3}
              fill={term.color}
              opacity={isHovered ? 1 : 0.8}
            />

            {/* Label left */}
            <text
              x={PAD.left}
              y={y + barH / 2 + 4}
              fill={isHovered ? 'white' : '#9ca3af'}
              fontSize="12"
              fontFamily="monospace"
              fontWeight={isHovered ? '600' : '400'}
            >
              {term.label}
            </text>

            {/* Coefficient value */}
            <text
              x={coeff >= 0 ? centerX + barWidth + 6 : centerX - barWidth - 6}
              y={y + barH / 2 + 4}
              fill={term.color}
              fontSize="11"
              fontFamily="monospace"
              textAnchor={coeff >= 0 ? 'start' : 'end'}
            >
              {coeff >= 0 ? '+' : ''}{coeff.toFixed(4)}
            </text>

            {/* Physical meaning (right side) */}
            <text
              x={W - PAD.right}
              y={y + barH / 2 + 4}
              fill="#6b7280"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="end"
            >
              {term.physical}
            </text>
          </g>
        )
      })}

      {/* Category legend */}
      {[
        { label: 'Identity', color: '#6b7280' },
        { label: 'Z-diagonal (easy measurement)', color: '#00d4ff' },
        { label: 'Entangling (basis rotation needed)', color: '#ff6b9d' },
      ].map((cat, i) => (
        <g key={cat.label}>
          <rect x={PAD.left + i * 220} y={H - 30} width={10} height={10} rx={2} fill={cat.color} opacity={0.7} />
          <text x={PAD.left + i * 220 + 16} y={H - 21} fill="#9ca3af" fontSize="10" fontFamily="monospace">{cat.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ============================================================
// SECTION 3: COMPRESSION DIAGRAM
// ============================================================

function CompressionDiagram() {
  return (
    <svg viewBox="0 0 800 260" className="w-full max-w-4xl mx-auto">
      {/* Left: 4 spin-orbitals */}
      {[
        { y: 40, label: '1s\u03B1', occ: true },
        { y: 100, label: '1s\u03B2', occ: true },
        { y: 160, label: '2s\u03B1', occ: false },
        { y: 220, label: '2s\u03B2', occ: false },
      ].map((orb, i) => (
        <g key={`orb-${i}`}>
          <circle
            cx={100}
            cy={orb.y}
            r={22}
            fill={orb.occ ? '#00d4ff15' : '#1e293b'}
            stroke={orb.occ ? '#00d4ff' : '#4b5563'}
            strokeWidth={orb.occ ? 2 : 1}
          />
          <text x={100} y={orb.y + 4} fill={orb.occ ? '#00d4ff' : '#6b7280'} fontSize="11" fontFamily="monospace" textAnchor="middle">
            {orb.label}
          </text>
          {orb.occ && (
            <text x={100} y={orb.y - 28} fill="#00ff88" fontSize="9" fontFamily="monospace" textAnchor="middle">occupied</text>
          )}
        </g>
      ))}
      <text x={100} y={260} fill="#9ca3af" fontSize="11" textAnchor="middle">4 spin-orbitals</text>

      {/* Arrow + labels */}
      <line x1={170} y1={130} x2={530} y2={130} stroke="#4b5563" strokeWidth={1.5} markerEnd="url(#arrowhead2)" />
      <defs>
        <marker id="arrowhead2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
        </marker>
      </defs>

      {/* Transformation labels */}
      <text x={350} y={100} fill="white" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        Jordan-Wigner + Tapering
      </text>

      {/* Symmetry icons */}
      {[
        { x: 270, label: 'Parity', icon: '\u00B1' },
        { x: 350, label: 'Spin', icon: '\u2191\u2193' },
        { x: 430, label: 'N\u2091', icon: '2' },
      ].map((sym) => (
        <g key={sym.label}>
          <rect x={sym.x - 18} y={140} width={36} height={28} rx={6} fill="#8b5cf620" stroke="#8b5cf6" strokeWidth={1} />
          <text x={sym.x} y={158} fill="#8b5cf6" fontSize="12" fontFamily="monospace" textAnchor="middle">{sym.icon}</text>
          <text x={sym.x} y={182} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">{sym.label}</text>
        </g>
      ))}

      {/* Right: 2 qubits */}
      {[
        { y: 90, label: 'q\u2080', state: '|1\u27E9' },
        { y: 170, label: 'q\u2081', state: '|0\u27E9' },
      ].map((q, i) => (
        <g key={`q-${i}`}>
          <circle
            cx={630}
            cy={q.y}
            r={28}
            fill="#00ff8815"
            stroke="#00ff88"
            strokeWidth={2}
          />
          <text x={630} y={q.y + 5} fill="#00ff88" fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="600">
            {q.label}
          </text>
          <text x={630} y={q.y + 42} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
            HF: {q.state}
          </text>
        </g>
      ))}
      <text x={630} y={255} fill="#9ca3af" fontSize="11" textAnchor="middle">2 qubits</text>

      {/* Compression ratio label */}
      <rect x={680} y={118} width={80} height={28} rx={6} fill="#00ff8815" stroke="#00ff88" strokeWidth={1} />
      <text x={720} y={136} fill="#00ff88" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        4x smaller
      </text>
    </svg>
  )
}

// ============================================================
// SECTION 4: INTERACTIVE BOND STRETCHING
// ============================================================

function MoleculeViz({ R }: { R: number }) {
  const W = 400
  const H = 100
  const centerY = 50
  const maxSep = 140
  const minSep = 30
  const sep = minSep + ((R - 0.3) / (3.0 - 0.3)) * (maxSep - minSep)
  const leftX = W / 2 - sep / 2
  const rightX = W / 2 + sep / 2

  const regime = R < 0.5 ? 'Repulsive' : R < 1.2 ? 'Equilibrium' : 'Dissociation'
  const regimeColor = R < 0.5 ? '#ff6b9d' : R < 1.2 ? '#00ff88' : '#ff8c42'
  const bondOpacity = Math.max(0, 1 - (R - 0.8) / 2.2)
  const dashArray = R > 1.5 ? '4 4' : 'none'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Bond line */}
      <line
        x1={leftX + 14}
        y1={centerY}
        x2={rightX - 14}
        y2={centerY}
        stroke="#00d4ff"
        strokeWidth={Math.max(1, 3 - R)}
        opacity={bondOpacity}
        strokeDasharray={dashArray}
      />

      {/* H atoms */}
      {[leftX, rightX].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy={centerY} r={14} fill="#00d4ff" opacity={0.25} stroke="#00d4ff" strokeWidth={1.5} />
          <text x={cx} y={centerY + 4} fill="white" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">H</text>
        </g>
      ))}

      {/* Regime label */}
      <text x={W / 2} y={90} fill={regimeColor} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        {regime}
      </text>

      {/* R label */}
      <text x={W / 2} y={20} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
        R = {R.toFixed(2)} &Aring;
      </text>
    </svg>
  )
}

function CoefficientBarChart({
  pesPoint,
  hoverTerm,
  onHoverTerm,
}: {
  pesPoint: PESPoint
  hoverTerm: string | null
  onHoverTerm: (id: string | null) => void
}) {
  const W = 700
  const H = 220
  const PAD = { top: 30, right: 20, bottom: 50, left: 20 }
  const barW = 60
  const gap = 30
  const totalW = PAULI_TERMS.length * barW + (PAULI_TERMS.length - 1) * gap
  const startX = (W - totalW) / 2
  const zeroY = PAD.top + (H - PAD.top - PAD.bottom) * 0.55

  const maxAbs = 1.1

  const barScale = (val: number) => {
    const range = H - PAD.top - PAD.bottom
    return -(val / maxAbs) * (range * 0.45)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Zero line */}
      <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke="#1e293b" strokeWidth={1} />

      {/* Bars */}
      {PAULI_TERMS.map((term, i) => {
        const coeff = term.getCoeff(pesPoint)
        const barHeight = barScale(coeff)
        const x = startX + i * (barW + gap)
        const isHovered = hoverTerm === term.id
        const isDimmed = hoverTerm !== null && !isHovered

        return (
          <g
            key={term.id}
            onMouseEnter={() => onHoverTerm(term.id)}
            onMouseLeave={() => onHoverTerm(null)}
            style={{ cursor: 'pointer' }}
            opacity={isDimmed ? 0.25 : 1}
          >
            <rect
              x={x}
              y={barHeight < 0 ? zeroY : zeroY + barHeight}
              width={barW}
              height={Math.max(Math.abs(barHeight), 1)}
              rx={4}
              fill={term.color}
              opacity={isHovered ? 1 : 0.75}
            >
              <animate attributeName="height" dur="0.3s" fill="freeze" />
            </rect>

            {/* Value label */}
            <text
              x={x + barW / 2}
              y={zeroY + barHeight + (coeff >= 0 ? -6 : 16)}
              fill={term.color}
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {coeff >= 0 ? '+' : ''}{coeff.toFixed(3)}
            </text>

            {/* Term label */}
            <text
              x={x + barW / 2}
              y={H - PAD.bottom + 18}
              fill={isHovered ? 'white' : '#9ca3af'}
              fontSize="11"
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight={isHovered ? '600' : '400'}
            >
              {term.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DynamicEnergyLandscape({
  pesPoint,
  hoverTheta,
  onHover,
}: {
  pesPoint: PESPoint
  hoverTheta: number | null
  onHover: (t: number | null) => void
}) {
  const W = 700
  const H = 350
  const PAD = { top: 30, right: 30, bottom: 50, left: 70 }

  const xMin = -Math.PI
  const xMax = Math.PI

  const { yMin, yMax } = useMemo(() => {
    let lo = Infinity, hi = -Infinity
    for (let i = 0; i <= 200; i++) {
      const theta = xMin + (i / 200) * (xMax - xMin)
      const e = vqeEnergy(theta, pesPoint)
      if (e < lo) lo = e
      if (e > hi) hi = e
    }
    const margin = (hi - lo) * 0.15
    return { yMin: lo - margin, yMax: hi + margin }
  }, [pesPoint])

  const xScale = useCallback((theta: number) =>
    PAD.left + ((theta - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right), [yMin, yMax])
  const yScale = useCallback((energy: number) =>
    PAD.top + ((yMax - energy) / (yMax - yMin)) * (H - PAD.top - PAD.bottom), [yMin, yMax])

  const points = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const theta = xMin + (i / 200) * (xMax - xMin)
      const e = vqeEnergy(theta, pesPoint)
      pts.push(`${xScale(theta).toFixed(1)},${yScale(e).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [pesPoint, xScale, yScale])

  const xTicks = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI]
  const xLabels = ['-\u03C0', '-\u03C0/2', '0', '\u03C0/2', '\u03C0']

  const yTicks = useMemo(() => {
    const range = yMax - yMin
    const step = range < 0.5 ? 0.1 : range < 1 ? 0.2 : 0.5
    const ticks: number[] = []
    const start = Math.ceil(yMin / step) * step
    for (let v = start; v <= yMax; v += step) {
      ticks.push(Math.round(v * 1000) / 1000)
    }
    return ticks
  }, [yMin, yMax])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const svgX = ((e.clientX - rect.left) / rect.width) * W
      const theta = xMin + ((svgX - PAD.left) / (W - PAD.left - PAD.right)) * (xMax - xMin)
      if (theta >= xMin && theta <= xMax) {
        onHover(theta)
      }
    },
    [onHover]
  )

  const optTheta = pesPoint.theta
  const fciE = pesPoint.fci
  const hfE = pesPoint.hf

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    >
      {/* Grid */}
      {yTicks.map(y => (
        <line key={`gy-${y}`} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)} stroke="#1e293b" strokeWidth={0.5} />
      ))}
      {xTicks.map(x => (
        <line key={`gx-${x}`} x1={xScale(x)} y1={PAD.top} x2={xScale(x)} y2={H - PAD.bottom} stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Chemical accuracy band */}
      {yScale(fciE + 0.0016) >= PAD.top && yScale(fciE - 0.0016) <= H - PAD.bottom && (
        <>
          <rect
            x={PAD.left}
            y={yScale(fciE + 0.0016)}
            width={W - PAD.left - PAD.right}
            height={Math.max(yScale(fciE - 0.0016) - yScale(fciE + 0.0016), 1)}
            fill="#00ff88"
            opacity={0.06}
          />
          <text x={PAD.left + 4} y={yScale(fciE + 0.0016) - 3} fill="#00ff88" fontSize="8" fontFamily="monospace" opacity={0.4}>
            chemical accuracy
          </text>
        </>
      )}

      {/* FCI line */}
      <line x1={PAD.left} y1={yScale(fciE)} x2={W - PAD.right} y2={yScale(fciE)} stroke="#00ff88" strokeWidth={1} strokeDasharray="6 3" opacity={0.6} />
      <text x={W - PAD.right + 2} y={yScale(fciE) + 3} fill="#00ff88" fontSize="9" fontFamily="monospace" opacity={0.8}>FCI</text>

      {/* HF line */}
      <line x1={PAD.left} y1={yScale(hfE)} x2={W - PAD.right} y2={yScale(hfE)} stroke="#ff8c42" strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
      <text x={W - PAD.right + 2} y={yScale(hfE) + 3} fill="#ff8c42" fontSize="9" fontFamily="monospace" opacity={0.6}>HF</text>

      {/* Energy curve */}
      <polyline points={points} fill="none" stroke="#00d4ff" strokeWidth={2.5} />

      {/* Optimal theta dot */}
      <circle cx={xScale(optTheta)} cy={yScale(vqeEnergy(optTheta, pesPoint))} r={5} fill="#00d4ff" stroke="white" strokeWidth={1.5} />

      {/* Hover crosshair */}
      {hoverTheta !== null && (() => {
        const cx = xScale(hoverTheta)
        const energy = vqeEnergy(hoverTheta, pesPoint)
        const cy = yScale(energy)
        const flipLeft = cx > W - PAD.right - 140
        const tx = flipLeft ? cx - 128 : cx + 8
        return (
          <g>
            <line x1={cx} y1={PAD.top} x2={cx} y2={H - PAD.bottom} stroke="white" strokeWidth={0.5} opacity={0.3} />
            <circle cx={cx} cy={cy} r={4} fill="white" fillOpacity={0.3} stroke="white" strokeWidth={1} />
            <rect x={tx} y={cy - 22} width={120} height={30} rx={4} fill="#111827" stroke="#1e293b" strokeWidth={1} />
            <text x={tx + 6} y={cy - 8} fill="white" fontSize="9" fontFamily="monospace">
              {'\u03B8'} = {hoverTheta.toFixed(3)}
            </text>
            <text x={tx + 6} y={cy + 4} fill="#00d4ff" fontSize="9" fontFamily="monospace">
              E = {energy.toFixed(4)} Ha
            </text>
          </g>
        )
      })()}

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {xTicks.map((x, i) => (
        <text key={`xl-${i}`} x={xScale(x)} y={H - PAD.bottom + 18} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
          {xLabels[i]}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} fill="#9ca3af" fontSize="11" textAnchor="middle">{'\u03B8'} (rad)</text>

      {/* Y labels */}
      {yTicks.map(y => (
        <text key={`yl-${y}`} x={PAD.left - 8} y={yScale(y) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="end">
          {y.toFixed(1)}
        </text>
      ))}
      <text x={15} y={(PAD.top + H - PAD.bottom) / 2} fill="#9ca3af" fontSize="11" textAnchor="middle"
        transform={`rotate(-90, 15, ${(PAD.top + H - PAD.bottom) / 2})`}>
        Energy (Ha)
      </text>
    </svg>
  )
}

// ============================================================
// PAGE
// ============================================================

export default function HamiltoniansPage() {
  const [selectedR, setSelectedR] = useState(0.735)
  const [hoverTerm, setHoverTerm] = useState<string | null>(null)
  const [hoverTheta, setHoverTheta] = useState<number | null>(null)

  const pesPoint = useMemo(() => interpolatePES(selectedR), [selectedR])

  const correlationEnergy = useMemo(() => {
    return ((pesPoint.hf - pesPoint.fci) * 627.509).toFixed(1) // Ha to kcal/mol
  }, [pesPoint])

  return (
    <div className="min-h-screen bg-quantum-bg text-white">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-gray-400 hover:text-quantum-accent transition-colors mb-4 inline-block">
            &larr; back
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Hamiltonians</span> Explorer
          </h1>
          <p className="text-gray-400 max-w-2xl">
            The{' '}
            <Link href="/learn" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              Hamiltonian
            </Link>{' '}
            defines <em>what</em> a quantum computer measures &mdash; while the{' '}
            <Link href="/ansatz" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              ansatz
            </Link>{' '}
            defines <em>how</em>. This page explores how molecular Hamiltonians are built,
            compressed, and how they transform as you stretch a chemical bond.
          </p>
        </div>

        {/* ======================================= */}
        {/* SECTION 1: What is a Hamiltonian?       */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">What is a Hamiltonian?</h2>
          <p className="text-sm text-gray-500 mb-6">
            A quantum chemistry{' '}
            <Link href="/learn" className="text-quantum-accent/60 hover:text-quantum-accent">Hamiltonian</Link>{' '}
            encodes a molecule&apos;s energy structure as a sum of Pauli operators.
            Building one is a four-stage pipeline: from atoms, through electron integrals,
            to qubit operators, to a circuit you can run.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <PipelineSVG />
          </div>

          <MetaphorCallout>
            <span className="text-quantum-accent font-semibold">Think of it as a recipe.</span>{' '}
            The Hamiltonian tells the quantum computer what energy to measure.
            Each Pauli term is an ingredient &mdash; Z terms, X terms, Y terms &mdash; and
            the coefficients (g0, g1, ...) are the amounts. Change the bond distance, and
            the recipe changes: different amounts of each ingredient produce a different dish.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 2: Anatomy of H2                */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Anatomy of H{'\u2082'}</h2>
          <p className="text-sm text-gray-500 mb-6">
            The 2-qubit H{'\u2082'} Hamiltonian at R={selectedR.toFixed(3)} &Aring; has six Pauli terms.
            Bars grow left (negative) or right (positive). Hover a term to highlight it.
            This chart is linked to the bond-stretching slider below.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <AnatomyBarChart pesPoint={pesPoint} hoverTerm={hoverTerm} onHoverTerm={setHoverTerm} />
          </div>

          <MetaphorCallout accent="#22d3ee">
            <span style={{ color: '#22d3ee' }} className="font-semibold">Measurement channels.</span>{' '}
            Z terms are the easy station &mdash; just read each qubit directly in the computational basis.
            X{'\u2080'}X{'\u2081'} and Y{'\u2080'}Y{'\u2081'} require tuning the radio: you rotate into
            a different measurement basis (Hadamard for X, S{'\u2020'}+Hadamard for Y) before reading.
            Those extra gates are why entangling terms contribute more noise on real hardware.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 3: From 4 Qubits to 2           */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">From 4 Qubits to 2</h2>
          <p className="text-sm text-gray-500 mb-6">
            H{'\u2082'} in the STO-3G basis has 4 spin-orbitals, giving a 4-qubit Hamiltonian via
            the{' '}
            <Link href="/learn" className="text-quantum-accent/60 hover:text-quantum-accent">Jordan-Wigner transform</Link>.
            Symmetry reduction (parity, spin, particle number) compresses it to just 2 qubits
            &mdash; no information lost.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <CompressionDiagram />
          </div>

          <MetaphorCallout accent="#8b5cf6">
            <span style={{ color: '#8b5cf6' }} className="font-semibold">Translation + Compression.</span>{' '}
            Jordan-Wigner is translation &mdash; converting from the language of electrons (creation/annihilation operators)
            to the language of qubits (Pauli matrices).
            Tapering is compression &mdash; symmetries let you zip the file smaller without losing the music.
            Every symmetry you exploit halves the Hilbert space. For H{'\u2082'}, three symmetries turn
            16 dimensions into 2.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 4: Stretching the Bond           */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Stretching the Bond</h2>
          <p className="text-sm text-gray-500 mb-6">
            Drag the slider to stretch the H{'\u2082'} bond from 0.3 to 3.0 &Aring;. Watch how
            the Hamiltonian coefficients, energy landscape, and correlation energy all transform
            in real time. Three views, one control.
          </p>

          {/* Slider */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <div className="flex items-center gap-4 mb-2">
              <label className="text-sm font-mono text-gray-400 whitespace-nowrap">
                R = <span className="text-white font-semibold">{selectedR.toFixed(2)}</span> &Aring;
              </label>
              <input
                type="range"
                min={0.3}
                max={3.0}
                step={0.01}
                value={selectedR}
                onChange={(e) => setSelectedR(parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00d4ff ${((selectedR - 0.3) / 2.7) * 100}%, #1e293b ${((selectedR - 0.3) / 2.7) * 100}%)`,
                }}
              />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 text-xs font-mono text-gray-400">
              <span>FCI: <span className="text-green-400">{pesPoint.fci.toFixed(4)} Ha</span></span>
              <span>HF: <span className="text-orange-400">{pesPoint.hf.toFixed(4)} Ha</span></span>
              <span>Correlation gap: <span className="text-quantum-accent">{correlationEnergy} kcal/mol</span></span>
              <span>Optimal {'\u03B8'}: <span className="text-white">{pesPoint.theta.toFixed(4)}</span></span>
            </div>
          </div>

          {/* Molecule viz */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-4 mb-4">
            <MoleculeViz R={selectedR} />
          </div>

          {/* Coefficient bars */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Hamiltonian Coefficients</h3>
            <CoefficientBarChart pesPoint={pesPoint} hoverTerm={hoverTerm} onHoverTerm={setHoverTerm} />
          </div>

          {/* Energy landscape */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Energy Landscape E({'\u03B8'})</h3>
            <DynamicEnergyLandscape pesPoint={pesPoint} hoverTheta={hoverTheta} onHover={setHoverTheta} />

            {/* Legend */}
            <div className="flex flex-wrap gap-6 mt-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-quantum-accent" />
                <span className="text-gray-400">E({'\u03B8'}) ideal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-green-400" />
                <span className="text-gray-400">FCI = {pesPoint.fci.toFixed(4)} Ha</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-orange-400" />
                <span className="text-gray-400">HF = {pesPoint.hf.toFixed(4)} Ha</span>
              </div>
            </div>
          </div>

          <MetaphorCallout accent="#ff8c42">
            <span style={{ color: '#ff8c42' }} className="font-semibold">A dial on nature.</span>{' '}
            Turn the slider and watch the molecule&apos;s quantum fingerprint transform in real time.
            At small R, Z terms dominate (g{'\u2081'} {'\u2248'} 0.8) and the energy curve is nearly flat &mdash;
            easy optimization but kinetic energy amplifies Z-measurement noise.
            At large R, X{'\u2080'}X{'\u2081'}/Y{'\u2080'}Y{'\u2081'} grow (g{'\u2084'} {'\u2248'} 0.15)
            and the minimum shifts &mdash; harder optimization, and Hartree-Fock completely fails.
            The correlation energy ({correlationEnergy} kcal/mol at R={selectedR.toFixed(2)}) is
            the gap HF can&apos;t see: the classical approximation misses the dance between electrons.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 5: Beyond H2                     */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Beyond H{'\u2082'}</h2>
          <p className="text-sm text-gray-500 mb-6">
            H{'\u2082'} is the simplest molecule. Bigger molecules explode in complexity.
            Each doubling of qubits roughly quadruples the number of Pauli terms.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {MOLECULES.map((mol) => {
              const logTerms = Math.log10(mol.terms)
              const maxLog = Math.log10(3000)
              const barWidth = (logTerms / maxLog) * 100
              return (
                <div
                  key={mol.name}
                  className="bg-quantum-card rounded-lg border border-quantum-border p-4"
                  style={{ borderColor: mol.color + '30' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold" style={{ color: mol.color }}>{mol.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ backgroundColor: mol.color + '20', color: mol.color }}>
                      {mol.difficulty}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-mono text-gray-400 mb-3">
                    <div>Raw qubits: <span className="text-white">{mol.qubitsRaw}</span></div>
                    <div>Tapered: <span className="text-white">{mol.qubits}</span></div>
                    <div>Pauli terms: <span className="text-white">{mol.terms.toLocaleString()}</span></div>
                  </div>
                  {/* Log-scale bar */}
                  <div className="h-2 bg-quantum-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: mol.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <MetaphorCallout accent="#ef4444">
            <span style={{ color: '#ef4444' }} className="font-semibold">The exponential wall.</span>{' '}
            H{'\u2082'} has 6 terms on 2 qubits. N{'\u2082'} has nearly 3,000 terms on 10 qubits.
            Each measurement term requires separate circuit runs. Tapering isn&apos;t a nicety &mdash;
            it&apos;s the difference between tractable and impossible. This is why
            the{' '}
            <Link href="/ansatz" className="text-quantum-accent hover:underline">ansatz</Link>{' '}
            matters so much: you need a circuit expressive enough to capture the physics,
            but shallow enough to survive hardware noise.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 6: Key Terms                     */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Key Terms</h2>
          <p className="text-sm text-gray-500 mb-6">
            See the full{' '}
            <Link href="/learn" className="text-quantum-accent hover:underline">glossary</Link>{' '}
            for more definitions.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                term: 'Hamiltonian',
                definition: 'The operator encoding a system\u2019s total energy. In quantum chemistry, H = \u2211 g\u1D62 P\u1D62 where P\u1D62 are Pauli strings and g\u1D62 are real coefficients derived from electron integrals.',
              },
              {
                term: 'Pauli Operator',
                definition: 'One of {I, X, Y, Z} acting on a qubit. Multi-qubit Pauli strings like X\u2080X\u2081 describe correlated measurements on multiple qubits simultaneously.',
              },
              {
                term: 'Jordan-Wigner Transform',
                definition: 'Maps fermionic creation/annihilation operators to qubit Pauli operators. Preserves anti-commutation relations at the cost of O(N) Pauli weight (long Z-strings).',
              },
              {
                term: 'Bravyi-Kitaev Transform',
                definition: 'An alternative fermion-to-qubit mapping with O(log N) Pauli weight. More efficient than Jordan-Wigner for large systems, but the resulting terms are harder to interpret physically.',
              },
              {
                term: 'Qubit Tapering',
                definition: 'Uses molecular symmetries (parity, spin, particle number) to eliminate qubits. Each Z\u2082 symmetry halves the Hilbert space. H\u2082 goes from 4 qubits to 2.',
              },
              {
                term: 'Full Configuration Interaction',
                definition: 'FCI \u2014 the exact solution within a given basis set. Exponentially expensive classically. For H\u2082/STO-3G, FCI = -1.1373 Ha at equilibrium.',
              },
              {
                term: 'Hartree-Fock',
                definition: 'A classical mean-field approximation that treats electrons independently. Misses correlation energy. The gap between HF and FCI is exactly what VQE must capture.',
              },
              {
                term: 'Bond Dissociation',
                definition: 'Stretching a bond until it breaks. At large R, electrons become strongly correlated, HF fails catastrophically, and quantum advantage is most pronounced.',
              },
              {
                term: 'Spin-Orbital',
                definition: 'A spatial orbital combined with a spin label (\u03B1 or \u03B2). H\u2082 in STO-3G has 2 spatial orbitals \u00D7 2 spins = 4 spin-orbitals.',
              },
              {
                term: 'Expectation Value',
                definition: '\u27E8\u03C8|H|\u03C8\u27E9 \u2014 the average energy measured when running the circuit. VQE minimizes this over parameters \u03B8. Each Pauli term requires separate measurement circuits.',
              },
              {
                term: 'Chemical Accuracy',
                definition: '1 kcal/mol (1.6 mHa) \u2014 the precision threshold needed for quantum chemistry to predict reaction outcomes. Our best hardware result is 4.1 kcal/mol on Tuna-9.',
              },
              {
                term: 'Correlation Energy',
                definition: 'E_FCI - E_HF: the energy that mean-field theory misses. Grows dramatically during bond dissociation. For H\u2082 at R=3.0\u00c5, it reaches 174 kcal/mol.',
              },
            ].map((item) => (
              <div key={item.term} className="bg-quantum-card/60 rounded-lg border border-quantum-border p-4">
                <h3 className="text-sm font-semibold text-quantum-accent mb-1">{item.term}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.definition}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 7: References                    */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">References</h2>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quantum Chemistry</h3>
          <div className="space-y-3 text-sm mb-8">
            {[
              {
                id: 'C1',
                text: 'S. McArdle, S. Endo, A. Aspuru-Guzik, S.C. Benjamin, X. Yuan, \u201cQuantum computational chemistry,\u201d Rev. Mod. Phys. 92, 015003 (2020).',
                url: 'https://arxiv.org/abs/1808.10402',
                urlLabel: 'arXiv:1808.10402',
              },
              {
                id: 'C2',
                text: 'A. Szabo & N.S. Ostlund, Modern Quantum Chemistry: Introduction to Advanced Electronic Structure Theory, Dover (1996).',
                url: '',
                urlLabel: '',
              },
              {
                id: 'C3',
                text: 'S. Bravyi, J.M. Gambetta, A. Mezzacapo, K. Temme, \u201cTapering off qubits to simulate fermionic Hamiltonians,\u201d arXiv:1701.08213 (2017).',
                url: 'https://arxiv.org/abs/1701.08213',
                urlLabel: 'arXiv:1701.08213',
              },
            ].map((ref) => (
              <div key={ref.id} className="flex gap-3 bg-quantum-card/40 rounded border border-quantum-border/50 p-4">
                <span className="text-quantum-accent font-mono text-xs mt-0.5">[{ref.id}]</span>
                <div className="flex-1">
                  <p className="text-gray-300">{ref.text}</p>
                  {ref.url && (
                    <a href={ref.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-quantum-accent transition-colors mt-1 inline-block">
                      {ref.urlLabel} &nearr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Our Replications</h3>
          <div className="space-y-3 text-sm">
            {[
              {
                id: 'R1',
                paper: 'Sagastizabal 2019',
                title: 'H\u2082 VQE with symmetry verification',
                result: '6.2 kcal/mol on Tuna-9 (3/4 claims pass)',
                href: '/replications/sagastizabal2019',
              },
              {
                id: 'R2',
                paper: 'Peruzzo 2014',
                title: 'HeH\u207A VQE bond sweep (first VQE paper)',
                result: 'Emulator PASS, IBM 91 kcal/mol (3/5 pass)',
                href: '/replications/peruzzo2014',
              },
              {
                id: 'R3',
                paper: 'Kandala 2017',
                title: 'H\u2082 PES with hardware-efficient ansatz',
                result: '10/10 chemical accuracy on emulator (3/3 pass)',
                href: '/replications/kandala2017',
              },
            ].map((ref) => (
              <div key={ref.id} className="flex gap-3 bg-quantum-card/40 rounded border border-quantum-border/50 p-4">
                <span className="text-quantum-accent font-mono text-xs mt-0.5">[{ref.id}]</span>
                <div className="flex-1">
                  <p className="text-gray-300">
                    <span className="font-semibold">{ref.paper}</span> &mdash; {ref.title}.{' '}
                    <span className="text-gray-500">{ref.result}</span>
                  </p>
                  <Link href={ref.href} className="text-xs text-gray-500 hover:text-quantum-accent transition-colors mt-1 inline-block">
                    View replication &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 8: Explore More + Footer         */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Explore More</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/ansatz', title: 'Ansatz Explorer', desc: 'Circuit architectures from 4 papers, mapped to 3 quantum processors' },
              { href: '/replications', title: 'Paper Replications', desc: '5 papers, 19 claims tested across emulator, Tuna-9, Garnet, and IBM' },
              { href: '/experiments', title: 'Experiment Dashboard', desc: '50+ experiments: Bell, GHZ, VQE, QAOA, QV, RB results' },
              { href: '/learn', title: 'Quantum Glossary', desc: '37 terms across 7 categories with clear definitions' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-quantum-card rounded-lg border border-quantum-border p-4 hover:border-quantum-accent/40 transition-colors group"
              >
                <h3 className="text-sm font-semibold text-white group-hover:text-quantum-accent transition-colors mb-1">
                  {link.title} &rarr;
                </h3>
                <p className="text-xs text-gray-500">{link.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t border-quantum-border">
          Part of the{' '}
          <Link href="/" className="text-quantum-accent hover:underline">haiqu</Link>{' '}
          research initiative at TU Delft / QuTech.
          All coefficients computed from{' '}
          <Link href="/experiments" className="text-quantum-accent hover:underline">PySCF + OpenFermion</Link>{' '}
          with STO-3G basis.
        </footer>
      </div>
    </div>
  )
}
