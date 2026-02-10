'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

// ============================================================
// TYPES
// ============================================================

type AnsatzId = 'sp-vqe' | 'uccsd' | 'hw-efficient' | 'qaoa'
type BackendId = 'tuna9' | 'garnet' | 'torino'

interface QNode {
  id: number
  x: number
  y: number
  label: string
}

interface QEdge {
  from: number
  to: number
  layer: number
  gateType: string
}

interface Ansatz {
  name: string
  paper: string
  year: number
  paperUrl: string
  replicationId: string
  type: 'Chemistry' | 'Generic' | 'Optimization'
  color: string
  qubits: number
  params: string
  cnots: number
  depth: number
  description: string
  circuit: string
  nodes: QNode[]
  edges: QEdge[]
}

interface HwEdge {
  from: number
  to: number
  fidelity: number
}

interface Hardware {
  name: string
  fullName: string
  provider: string
  totalQubits: number
  nodes: QNode[]
  edges: HwEdge[]
  errorRates: Record<number, number>
}

interface HwMapping {
  qubits: number[] // hardware qubit IDs
  edges: [number, number][] // hardware qubit pairs needed
  allNative: boolean
}

// ============================================================
// ANSATZ DATA
// ============================================================

const ANSATZE: Record<AnsatzId, Ansatz> = {
  'sp-vqe': {
    name: 'Subspace-Preserving VQE',
    paper: 'Sagastizabal 2019',
    year: 2019,
    paperUrl: 'https://arxiv.org/abs/1902.11258',
    replicationId: 'sagastizabal2019',
    type: 'Chemistry',
    color: '#00d4ff',
    qubits: 2,
    params: '1',
    cnots: 1,
    depth: 3,
    description: 'Ry(α) + CNOT + X preserves particle number in the {|01⟩, |10⟩} subspace. Minimal circuit for H₂ ground state.',
    circuit: 'q0: ─[Ry(α)]─●─[X]─\nq1: ──────────⊕─────',
    nodes: [
      { id: 0, x: 100, y: 65, label: 'q0' },
      { id: 1, x: 100, y: 135, label: 'q1' },
    ],
    edges: [{ from: 0, to: 1, layer: 1, gateType: 'CNOT' }],
  },
  uccsd: {
    name: 'UCCSD (DoubleExcitation)',
    paper: 'Peruzzo 2014',
    year: 2014,
    paperUrl: 'https://arxiv.org/abs/1304.3061',
    replicationId: 'peruzzo2014',
    type: 'Chemistry',
    color: '#ff6b9d',
    qubits: 4,
    params: '1',
    cnots: 16,
    depth: 20,
    description: 'Chemistry-motivated. DoubleExcitation(θ) on |1100⟩ reference. Exact for H₂ and HeH⁺ with one parameter.',
    circuit: 'q0: ─|1⟩─┐\nq1: ─|1⟩─┤ DoubleExc(θ)\nq2: ─|0⟩─┤\nq3: ─|0⟩─┘',
    nodes: [
      { id: 0, x: 60, y: 60, label: 'q0' },
      { id: 1, x: 140, y: 60, label: 'q1' },
      { id: 2, x: 60, y: 140, label: 'q2' },
      { id: 3, x: 140, y: 140, label: 'q3' },
    ],
    edges: [
      { from: 0, to: 1, layer: 1, gateType: 'CNOT' },
      { from: 0, to: 2, layer: 2, gateType: 'CNOT' },
      { from: 2, to: 3, layer: 3, gateType: 'CNOT' },
      { from: 1, to: 3, layer: 2, gateType: 'CNOT' },
    ],
    // DoubleExcitation decomposition entangles all pairs
  },
  'hw-efficient': {
    name: 'Hardware-Efficient',
    paper: 'Kandala 2017',
    year: 2017,
    paperUrl: 'https://arxiv.org/abs/1704.05018',
    replicationId: 'kandala2017',
    type: 'Generic',
    color: '#8b5cf6',
    qubits: 4,
    params: '12/layer',
    cnots: 3,
    depth: 6,
    description: 'Ry-Rz on each qubit, then CNOT chain. Matches linear hardware connectivity. Risk of barren plateaus at depth.',
    circuit: 'q0: ─[Ry][Rz]─●──────────\nq1: ─[Ry][Rz]─⊕─●────────\nq2: ─[Ry][Rz]────⊕─●──────\nq3: ─[Ry][Rz]──────⊕──────',
    nodes: [
      { id: 0, x: 100, y: 40, label: 'q0' },
      { id: 1, x: 100, y: 80, label: 'q1' },
      { id: 2, x: 100, y: 120, label: 'q2' },
      { id: 3, x: 100, y: 160, label: 'q3' },
    ],
    edges: [
      { from: 0, to: 1, layer: 1, gateType: 'CNOT' },
      { from: 1, to: 2, layer: 1, gateType: 'CNOT' },
      { from: 2, to: 3, layer: 1, gateType: 'CNOT' },
    ],
  },
  qaoa: {
    name: 'QAOA MaxCut p=1',
    paper: 'Harrigan 2021',
    year: 2021,
    paperUrl: 'https://arxiv.org/abs/2004.04197',
    replicationId: 'harrigan2021',
    type: 'Optimization',
    color: '#00ff88',
    qubits: 4,
    params: '2 (γ, β)',
    cnots: 3,
    depth: 4,
    description: 'ZZ cost layer on problem graph edges, then Rx mixer. Topology matches the optimization problem, not the hardware.',
    circuit: 'All: ─[H]─[ZZ(γ)]─[Rx(β)]─\nCost on edges: (0,1)(0,2)(1,3)',
    nodes: [
      { id: 0, x: 100, y: 50, label: 'q0' },
      { id: 1, x: 55, y: 110, label: 'q1' },
      { id: 2, x: 145, y: 110, label: 'q2' },
      { id: 3, x: 55, y: 170, label: 'q3' },
    ],
    edges: [
      { from: 0, to: 1, layer: 1, gateType: 'ZZ' },
      { from: 0, to: 2, layer: 1, gateType: 'ZZ' },
      { from: 1, to: 3, layer: 1, gateType: 'ZZ' },
    ],
  },
}

// ============================================================
// HARDWARE TOPOLOGY DATA
// ============================================================

const BACKENDS: Record<BackendId, Hardware> = {
  tuna9: {
    name: 'Tuna-9',
    fullName: 'Quantum Inspire Tuna-9',
    provider: 'QuTech',
    totalQubits: 9,
    nodes: [
      { id: 5, x: 60, y: 50, label: 'q5' },
      { id: 2, x: 150, y: 50, label: 'q2' },
      { id: 0, x: 330, y: 50, label: 'q0' },
      { id: 4, x: 150, y: 150, label: 'q4' },
      { id: 1, x: 330, y: 150, label: 'q1' },
      { id: 6, x: 150, y: 250, label: 'q6' },
      { id: 3, x: 330, y: 250, label: 'q3' },
      { id: 8, x: 150, y: 350, label: 'q8' },
      { id: 7, x: 60, y: 350, label: 'q7' },
    ],
    edges: [
      { from: 0, to: 1, fidelity: 87.0 },
      { from: 0, to: 2, fidelity: 85.8 },
      { from: 1, to: 3, fidelity: 91.3 },
      { from: 1, to: 4, fidelity: 89.8 },
      { from: 2, to: 4, fidelity: 92.3 },
      { from: 2, to: 5, fidelity: 91.4 },
      { from: 3, to: 6, fidelity: 87.1 },
      { from: 4, to: 6, fidelity: 93.5 },
      { from: 6, to: 8, fidelity: 91.3 },
      { from: 7, to: 8, fidelity: 88.3 },
    ],
    errorRates: { 0: 12.3, 1: 3.2, 2: 1.6, 3: 3.8, 4: 1.9, 5: 1.6, 6: 2.9, 7: 4.1, 8: 3.5 },
  },
  garnet: {
    name: 'Garnet',
    fullName: 'IQM Garnet (20q)',
    provider: 'IQM Resonance',
    totalQubits: 20,
    nodes: [
      // 4x5 grid layout
      { id: 1, x: 60, y: 50, label: 'QB1' },
      { id: 2, x: 150, y: 50, label: 'QB2' },
      { id: 3, x: 240, y: 50, label: 'QB3' },
      { id: 4, x: 60, y: 130, label: 'QB4' },
      { id: 5, x: 150, y: 130, label: 'QB5' },
      { id: 6, x: 240, y: 130, label: 'QB6' },
      { id: 7, x: 330, y: 130, label: 'QB7' },
      { id: 8, x: 60, y: 210, label: 'QB8' },
      { id: 9, x: 150, y: 210, label: 'QB9' },
      { id: 10, x: 240, y: 210, label: 'QB10' },
      { id: 11, x: 330, y: 210, label: 'QB11' },
      { id: 14, x: 150, y: 290, label: 'QB14' },
      { id: 15, x: 240, y: 290, label: 'QB15' },
      { id: 16, x: 330, y: 290, label: 'QB16' },
      { id: 19, x: 240, y: 370, label: 'QB19' },
      { id: 20, x: 330, y: 370, label: 'QB20' },
    ],
    edges: [
      // Measured pairs with fidelities
      { from: 1, to: 2, fidelity: 98.1 },
      { from: 1, to: 4, fidelity: 97.0 },
      { from: 2, to: 5, fidelity: 95.5 },
      { from: 4, to: 5, fidelity: 96.9 },
      { from: 4, to: 8, fidelity: 92.0 },
      { from: 5, to: 6, fidelity: 95.0 },
      { from: 5, to: 9, fidelity: 93.0 },
      { from: 4, to: 9, fidelity: 88.4 },
      { from: 8, to: 9, fidelity: 89.6 },
      { from: 6, to: 7, fidelity: 94.0 },
      { from: 6, to: 10, fidelity: 94.0 },
      { from: 9, to: 10, fidelity: 93.0 },
      { from: 7, to: 11, fidelity: 94.0 },
      { from: 10, to: 11, fidelity: 94.5 },
      { from: 10, to: 15, fidelity: 94.0 },
      { from: 9, to: 14, fidelity: 93.0 },
      { from: 14, to: 15, fidelity: 95.0 },
      { from: 11, to: 16, fidelity: 94.0 },
      { from: 15, to: 16, fidelity: 94.0 },
      { from: 19, to: 20, fidelity: 95.0 },
      { from: 15, to: 19, fidelity: 94.0 },
      { from: 16, to: 20, fidelity: 94.0 },
    ],
    errorRates: { 1: 1.9, 2: 1.5, 4: 2.0, 5: 1.8, 8: 5.0, 9: 10.4 },
  },
  torino: {
    name: 'Torino',
    fullName: 'IBM Torino (133q)',
    provider: 'IBM Quantum',
    totalQubits: 133,
    // Show a section of the heavy-hex lattice
    nodes: [
      { id: 0, x: 60, y: 80, label: 'q0' },
      { id: 1, x: 150, y: 80, label: 'q1' },
      { id: 2, x: 240, y: 80, label: 'q2' },
      { id: 3, x: 330, y: 80, label: 'q3' },
      { id: 14, x: 105, y: 160, label: 'q14' },
      { id: 18, x: 195, y: 160, label: 'q18' },
      { id: 19, x: 285, y: 160, label: 'q19' },
      { id: 15, x: 60, y: 240, label: 'q15' },
      { id: 16, x: 150, y: 240, label: 'q16' },
      { id: 17, x: 240, y: 240, label: 'q17' },
      { id: 20, x: 330, y: 240, label: 'q20' },
    ],
    edges: [
      // Heavy-hex section
      { from: 0, to: 1, fidelity: 98.2 },
      { from: 1, to: 2, fidelity: 97.8 },
      { from: 2, to: 3, fidelity: 97.5 },
      { from: 0, to: 14, fidelity: 97.0 },
      { from: 1, to: 14, fidelity: 97.5 },
      { from: 2, to: 18, fidelity: 97.0 },
      { from: 18, to: 19, fidelity: 96.5 },
      { from: 3, to: 19, fidelity: 97.0 },
      { from: 14, to: 15, fidelity: 97.0 },
      { from: 14, to: 16, fidelity: 97.5 },
      { from: 18, to: 17, fidelity: 97.0 },
      { from: 19, to: 20, fidelity: 96.5 },
      { from: 15, to: 16, fidelity: 97.0 },
      { from: 16, to: 17, fidelity: 97.5 },
      { from: 17, to: 20, fidelity: 97.0 },
    ],
    errorRates: { 0: 0.5, 1: 0.4, 2: 0.5, 3: 0.6 },
  },
}

// ============================================================
// HARDWARE MAPPINGS (ansatz → hardware qubits)
// ============================================================

const HW_MAPPINGS: Record<BackendId, Record<AnsatzId, HwMapping>> = {
  tuna9: {
    'sp-vqe': { qubits: [4, 6], edges: [[4, 6]], allNative: true },
    uccsd: { qubits: [4, 1, 6, 3], edges: [[4, 1], [4, 6], [6, 3], [1, 3]], allNative: true },
    'hw-efficient': { qubits: [2, 4, 6, 8], edges: [[2, 4], [4, 6], [6, 8]], allNative: true },
    qaoa: { qubits: [2, 4, 5, 6], edges: [[2, 4], [2, 5], [4, 6]], allNative: true },
  },
  garnet: {
    'sp-vqe': { qubits: [1, 2], edges: [[1, 2]], allNative: true },
    uccsd: { qubits: [1, 2, 4, 5], edges: [[1, 2], [1, 4], [4, 5], [2, 5]], allNative: true },
    'hw-efficient': { qubits: [1, 2, 5, 6], edges: [[1, 2], [2, 5], [5, 6]], allNative: true },
    qaoa: { qubits: [14, 15, 10, 16], edges: [[14, 15], [14, 10], [15, 16]], allNative: true },
  },
  torino: {
    'sp-vqe': { qubits: [0, 1], edges: [[0, 1]], allNative: true },
    uccsd: { qubits: [0, 1, 14, 16], edges: [[0, 1], [0, 14], [14, 16], [1, 14]], allNative: true },
    'hw-efficient': { qubits: [0, 1, 2, 3], edges: [[0, 1], [1, 2], [2, 3]], allNative: true },
    qaoa: { qubits: [0, 1, 14, 2], edges: [[0, 1], [0, 14], [1, 2]], allNative: true },
  },
}

// ============================================================
// ENERGY LANDSCAPE DATA
// ============================================================

// H2 2-qubit VQE: E(θ) = g0 - g3 + (g2-g1)cos(θ) + (g4+g5)sin(θ)
const G0 = -0.321124
const G1 = 0.397937
const G2 = -0.397937
const G3 = 0.0
const G4 = 0.090466
const G5 = 0.090466

function vqeEnergy(theta: number): number {
  return G0 - G3 + (G2 - G1) * Math.cos(theta) + (G4 + G5) * Math.sin(theta)
}

const HF_ENERGY = vqeEnergy(0) // ~ -1.117
const FCI_ENERGY = -1.1373
const OPTIMAL_THETA = Math.atan2(-(G4 + G5), G2 - G1 < 0 ? -(G2 - G1) : G2 - G1)
// Properly: minimum at tan(θ) = -(g4+g5)/(g2-g1) but since g2-g1 < 0, we need to be careful
const THETA_OPT = -0.2235

const HW_MEASUREMENTS = [
  { label: 'Emulator', energy: -1.1385, theta: THETA_OPT, color: '#00d4ff' },
  { label: 'IBM Torino', energy: -1.1226, theta: THETA_OPT, color: '#8b5cf6' },
  { label: 'Tuna-9 q[4,6]', energy: -1.1274, theta: THETA_OPT, color: '#ff8c42' },
]

// ============================================================
// HELPER: fidelity → color
// ============================================================

function fidelityColor(f: number): string {
  if (f >= 95) return '#00ff88'
  if (f >= 90) return '#00d4ff'
  if (f >= 85) return '#ff8c42'
  return '#ff6b9d'
}

function fidelityColorDim(f: number): string {
  if (f >= 95) return 'rgba(0,255,136,0.25)'
  if (f >= 90) return 'rgba(0,212,255,0.25)'
  if (f >= 85) return 'rgba(255,140,66,0.25)'
  return 'rgba(255,107,157,0.25)'
}

// ============================================================
// COMPONENTS
// ============================================================

function AnsatzCard({
  id,
  ansatz,
  selected,
  onClick,
}: {
  id: AnsatzId
  ansatz: Ansatz
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition-all duration-200 ${
        selected
          ? 'border-quantum-accent bg-quantum-card shadow-lg shadow-quantum-accent/10'
          : 'border-quantum-border bg-quantum-card/60 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: ansatz.color + '20', color: ansatz.color }}
        >
          {ansatz.type}
        </span>
        <a
          href={ansatz.paperUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gray-500 hover:text-quantum-accent transition-colors"
          title={`View paper on arXiv`}
        >
          {ansatz.paper} &nearr;
        </a>
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{ansatz.name}</h3>

      {/* Mini topology graph */}
      <svg viewBox="0 0 200 200" className="w-full h-32 mb-3">
        {/* Edges */}
        {ansatz.edges.map((e, i) => {
          const from = ansatz.nodes.find((n) => n.id === e.from)!
          const to = ansatz.nodes.find((n) => n.id === e.to)!
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={ansatz.color}
              strokeWidth={selected ? 3 : 2}
              strokeOpacity={0.8}
            />
          )
        })}
        {/* Gate labels on edges */}
        {ansatz.edges.map((e, i) => {
          const from = ansatz.nodes.find((n) => n.id === e.from)!
          const to = ansatz.nodes.find((n) => n.id === e.to)!
          const mx = (from.x + to.x) / 2
          const my = (from.y + to.y) / 2
          return (
            <text
              key={`label-${i}`}
              x={mx + 12}
              y={my}
              fill={ansatz.color}
              fontSize="10"
              fontFamily="JetBrains Mono"
              opacity={0.7}
            >
              {e.gateType}
            </text>
          )
        })}
        {/* Nodes */}
        {ansatz.nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={16}
              fill="#111827"
              stroke={ansatz.color}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            <text
              x={n.x}
              y={n.y + 4}
              fill="white"
              fontSize="11"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
        <div className="text-gray-400">
          Qubits: <span className="text-white">{ansatz.qubits}</span>
        </div>
        <div className="text-gray-400">
          Params: <span className="text-white">{ansatz.params}</span>
        </div>
        <div className="text-gray-400">
          CNOTs: <span className="text-white">{ansatz.cnots}</span>
        </div>
        <div className="text-gray-400">
          Depth: <span className="text-white">{ansatz.depth}</span>
        </div>
      </div>
      <Link
        href={`/replications/${ansatz.replicationId}`}
        onClick={(e) => e.stopPropagation()}
        className="text-xs text-quantum-accent/70 hover:text-quantum-accent transition-colors"
      >
        See our replication &rarr;
      </Link>
    </button>
  )
}

function HardwareGraph({
  backend,
  mapping,
  ansatzColor,
}: {
  backend: Hardware
  mapping: HwMapping
  ansatzColor: string
}) {
  const nodeMap = useMemo(() => {
    const m: Record<number, QNode> = {}
    for (const n of backend.nodes) m[n.id] = n
    return m
  }, [backend])

  const activeQubits = new Set(mapping.qubits)

  // Check if a hardware edge is used by the ansatz
  const isActiveEdge = useCallback(
    (from: number, to: number) => {
      return mapping.edges.some(
        ([a, b]) => (a === from && b === to) || (a === to && b === from)
      )
    },
    [mapping]
  )

  return (
    <svg viewBox="0 0 400 420" className="w-full max-w-lg">
      {/* Background edges (all hardware connections) */}
      {backend.edges.map((e, i) => {
        const from = nodeMap[e.from]
        const to = nodeMap[e.to]
        if (!from || !to) return null
        const active = isActiveEdge(e.from, e.to)
        return (
          <g key={`edge-${i}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={active ? ansatzColor : fidelityColorDim(e.fidelity)}
              strokeWidth={active ? 4 : 2}
              strokeOpacity={active ? 1 : 0.4}
            />
            {/* Fidelity label */}
            <text
              x={(from.x + to.x) / 2 + 8}
              y={(from.y + to.y) / 2 - 5}
              fill={active ? ansatzColor : '#6b7280'}
              fontSize="9"
              fontFamily="JetBrains Mono"
              opacity={active ? 0.9 : 0.5}
            >
              {e.fidelity.toFixed(1)}%
            </text>
          </g>
        )
      })}

      {/* Nodes */}
      {backend.nodes.map((n) => {
        const active = activeQubits.has(n.id)
        const errRate = backend.errorRates[n.id]
        return (
          <g key={`node-${n.id}`}>
            {/* Glow ring for active qubits */}
            {active && (
              <circle
                cx={n.x}
                cy={n.y}
                r={22}
                fill="none"
                stroke={ansatzColor}
                strokeWidth={2}
                opacity={0.3}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={16}
              fill={active ? '#111827' : '#0a0a1a'}
              stroke={active ? ansatzColor : '#1e293b'}
              strokeWidth={active ? 2.5 : 1}
              opacity={active ? 1 : 0.4}
            />
            <text
              x={n.x}
              y={n.y + 4}
              fill={active ? 'white' : '#6b7280'}
              fontSize="9"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              {n.label}
            </text>
            {/* Error rate below node */}
            {errRate !== undefined && active && (
              <text
                x={n.x}
                y={n.y + 30}
                fill={errRate < 2 ? '#00ff88' : errRate < 5 ? '#ff8c42' : '#ff6b9d'}
                fontSize="8"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
                opacity={0.7}
              >
                {errRate}%
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function EnergyLandscape({ hoverTheta, onHover }: { hoverTheta: number | null; onHover: (t: number | null) => void }) {
  const W = 700
  const H = 350
  const PAD = { top: 30, right: 30, bottom: 50, left: 70 }

  const xMin = -Math.PI
  const xMax = Math.PI
  const yMin = -1.25
  const yMax = 0.55

  const xScale = (theta: number) => PAD.left + ((theta - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right)
  const yScale = (energy: number) => PAD.top + ((yMax - energy) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  // Generate curve points
  const points = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const theta = xMin + (i / 200) * (xMax - xMin)
      const e = vqeEnergy(theta)
      pts.push(`${xScale(theta).toFixed(1)},${yScale(e).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  // Axis ticks
  const xTicks = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI]
  const xLabels = ['-π', '-π/2', '0', 'π/2', 'π']
  const yTicks = [-1.2, -1.0, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4]

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

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    >
      {/* Grid lines */}
      {yTicks.map((y) => (
        <line
          key={`gy-${y}`}
          x1={PAD.left}
          y1={yScale(y)}
          x2={W - PAD.right}
          y2={yScale(y)}
          stroke="#1e293b"
          strokeWidth={0.5}
        />
      ))}
      {xTicks.map((x) => (
        <line
          key={`gx-${x}`}
          x1={xScale(x)}
          y1={PAD.top}
          x2={xScale(x)}
          y2={H - PAD.bottom}
          stroke="#1e293b"
          strokeWidth={0.5}
        />
      ))}

      {/* Chemical accuracy band (1.6 mHa = 1 kcal/mol) */}
      <rect
        x={PAD.left}
        y={yScale(FCI_ENERGY + 0.0016)}
        width={W - PAD.left - PAD.right}
        height={yScale(FCI_ENERGY - 0.0016) - yScale(FCI_ENERGY + 0.0016)}
        fill="#00ff88"
        opacity={0.06}
      />
      <text
        x={PAD.left + 4}
        y={yScale(FCI_ENERGY + 0.0016) - 3}
        fill="#00ff88"
        fontSize="8"
        fontFamily="JetBrains Mono"
        opacity={0.4}
      >
        chemical accuracy (1 kcal/mol)
      </text>

      {/* FCI energy line */}
      <line
        x1={PAD.left}
        y1={yScale(FCI_ENERGY)}
        x2={W - PAD.right}
        y2={yScale(FCI_ENERGY)}
        stroke="#00ff88"
        strokeWidth={1}
        strokeDasharray="6 3"
        opacity={0.6}
      />
      <text
        x={W - PAD.right + 2}
        y={yScale(FCI_ENERGY) + 3}
        fill="#00ff88"
        fontSize="9"
        fontFamily="JetBrains Mono"
        opacity={0.8}
      >
        FCI
      </text>

      {/* HF energy line */}
      <line
        x1={PAD.left}
        y1={yScale(HF_ENERGY)}
        x2={W - PAD.right}
        y2={yScale(HF_ENERGY)}
        stroke="#ff8c42"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.4}
      />
      <text
        x={W - PAD.right + 2}
        y={yScale(HF_ENERGY) + 3}
        fill="#ff8c42"
        fontSize="9"
        fontFamily="JetBrains Mono"
        opacity={0.6}
      >
        HF
      </text>

      {/* Energy curve */}
      <polyline points={points} fill="none" stroke="#00d4ff" strokeWidth={2.5} />

      {/* Optimal theta marker */}
      <line
        x1={xScale(THETA_OPT)}
        y1={PAD.top}
        x2={xScale(THETA_OPT)}
        y2={H - PAD.bottom}
        stroke="#00d4ff"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.3}
      />
      <circle
        cx={xScale(THETA_OPT)}
        cy={yScale(vqeEnergy(THETA_OPT))}
        r={5}
        fill="#00d4ff"
        stroke="white"
        strokeWidth={1.5}
      />

      {/* Hardware measurement points */}
      {HW_MEASUREMENTS.map((m, i) => (
        <g key={i}>
          <circle
            cx={xScale(m.theta)}
            cy={yScale(m.energy)}
            r={6}
            fill="none"
            stroke={m.color}
            strokeWidth={2}
          />
          <circle cx={xScale(m.theta)} cy={yScale(m.energy)} r={2} fill={m.color} />
          {/* Label */}
          <text
            x={xScale(m.theta) + (i === 0 ? -60 : i === 1 ? 10 : 10)}
            y={yScale(m.energy) + (i === 0 ? -10 : i === 1 ? -10 : 14)}
            fill={m.color}
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            {m.label}
          </text>
          <text
            x={xScale(m.theta) + (i === 0 ? -60 : i === 1 ? 10 : 10)}
            y={yScale(m.energy) + (i === 0 ? 2 : i === 1 ? 2 : 26)}
            fill={m.color}
            fontSize="8"
            fontFamily="JetBrains Mono"
            opacity={0.7}
          >
            {m.energy.toFixed(4)} Ha
          </text>
        </g>
      ))}

      {/* Hover crosshair */}
      {hoverTheta !== null && (() => {
        const cx = xScale(hoverTheta)
        const cy = yScale(vqeEnergy(hoverTheta))
        const flipLeft = cx > W - PAD.right - 140
        const tx = flipLeft ? cx - 128 : cx + 8
        return (
          <g>
            <line
              x1={cx}
              y1={PAD.top}
              x2={cx}
              y2={H - PAD.bottom}
              stroke="white"
              strokeWidth={0.5}
              opacity={0.3}
            />
            <circle
              cx={cx}
              cy={cy}
              r={4}
              fill="white"
              fillOpacity={0.3}
              stroke="white"
              strokeWidth={1}
            />
            <rect
              x={tx}
              y={cy - 22}
              width={120}
              height={30}
              rx={4}
              fill="#111827"
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={tx + 6}
              y={cy - 8}
              fill="white"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              θ = {hoverTheta.toFixed(3)}
            </text>
            <text
              x={tx + 6}
              y={cy + 4}
              fill="#00d4ff"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              E = {vqeEnergy(hoverTheta).toFixed(4)} Ha
            </text>
          </g>
        )
      })()}

      {/* Axes */}
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="#4b5563"
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={H - PAD.bottom}
        stroke="#4b5563"
        strokeWidth={1}
      />

      {/* X axis labels */}
      {xTicks.map((x, i) => (
        <text
          key={`xl-${i}`}
          x={xScale(x)}
          y={H - PAD.bottom + 18}
          fill="#9ca3af"
          fontSize="10"
          fontFamily="JetBrains Mono"
          textAnchor="middle"
        >
          {xLabels[i]}
        </text>
      ))}
      <text
        x={(PAD.left + W - PAD.right) / 2}
        y={H - 8}
        fill="#9ca3af"
        fontSize="11"
        textAnchor="middle"
      >
        θ (rad)
      </text>

      {/* Y axis labels */}
      {yTicks.map((y) => (
        <text
          key={`yl-${y}`}
          x={PAD.left - 8}
          y={yScale(y) + 3}
          fill="#9ca3af"
          fontSize="9"
          fontFamily="JetBrains Mono"
          textAnchor="end"
        >
          {y.toFixed(1)}
        </text>
      ))}
      <text
        x={15}
        y={(PAD.top + H - PAD.bottom) / 2}
        fill="#9ca3af"
        fontSize="11"
        textAnchor="middle"
        transform={`rotate(-90, 15, ${(PAD.top + H - PAD.bottom) / 2})`}
      >
        Energy (Ha)
      </text>
    </svg>
  )
}

// ============================================================
// PAGE
// ============================================================

export default function AnsatzPage() {
  const [selectedAnsatz, setSelectedAnsatz] = useState<AnsatzId>('sp-vqe')
  const [selectedBackend, setSelectedBackend] = useState<BackendId>('tuna9')
  const [hoverTheta, setHoverTheta] = useState<number | null>(null)

  const ansatz = ANSATZE[selectedAnsatz]
  const backend = BACKENDS[selectedBackend]
  const mapping = HW_MAPPINGS[selectedBackend][selectedAnsatz]

  return (
    <div className="min-h-screen bg-quantum-bg text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-quantum-accent transition-colors mb-4 inline-block"
          >
            &larr; back
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Ansatz Architecture</span> Explorer
          </h1>
          <p className="text-gray-400 max-w-2xl">
            An{' '}
            <Link href="/learn" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              ansatz
            </Link>{' '}
            is a parameterized quantum circuit used as a trial wavefunction in variational algorithms
            like{' '}
            <Link href="/learn" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              VQE
            </Link>{' '}
            and{' '}
            <Link href="/learn" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              QAOA
            </Link>.
            Different ansatz designs trade off expressibility, circuit depth, and hardware
            compatibility. This page compares four architectures from our{' '}
            <Link href="/replications" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              paper replications
            </Link>{' '}
            and maps them onto{' '}
            <Link href="/platforms" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              three quantum processors
            </Link>.
          </p>
        </div>

        {/* ======================================= */}
        {/* SECTION 1: Ansatz Topology Comparison   */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Entanglement Topologies</h2>
          <p className="text-sm text-gray-500 mb-6">
            Nodes are qubits. Edges are entangling gates (CNOT / ZZ). Select one to see its hardware mapping below.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(ANSATZE) as AnsatzId[]).map((id) => (
              <AnsatzCard
                key={id}
                id={id}
                ansatz={ANSATZE[id]}
                selected={selectedAnsatz === id}
                onClick={() => setSelectedAnsatz(id)}
              />
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 2: Hardware Mapping              */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Hardware Mapping</h2>
          <p className="text-sm text-gray-500 mb-6">
            How <span style={{ color: ansatz.color }}>{ansatz.name}</span> maps onto physical
            qubit connectivity. Bright edges are used by the ansatz; dim edges are available but unused.
          </p>

          {/* Backend tabs */}
          <div className="flex gap-2 mb-6">
            {(Object.keys(BACKENDS) as BackendId[]).map((id) => (
              <button
                key={id}
                onClick={() => setSelectedBackend(id)}
                className={`px-4 py-2 rounded text-sm font-mono transition-colors ${
                  selectedBackend === id
                    ? 'bg-quantum-accent/20 text-quantum-accent border border-quantum-accent/40'
                    : 'bg-quantum-card border border-quantum-border text-gray-400 hover:text-white'
                }`}
              >
                {BACKENDS[id].name}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Hardware graph */}
            <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{backend.fullName}</h3>
                  <p className="text-xs text-gray-500">
                    <Link href="/platforms" className="hover:text-quantum-accent transition-colors">
                      {backend.provider}
                    </Link>{' '}
                    &middot; {backend.totalQubits} qubits total
                  </p>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    mapping.allNative
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-orange-900/30 text-orange-400'
                  }`}
                >
                  {mapping.allNative ? 'All edges native' : 'Needs SWAP routing'}
                </span>
              </div>
              <HardwareGraph backend={backend} mapping={mapping} ansatzColor={ansatz.color} />
            </div>

            {/* Info panel */}
            <div className="space-y-4">
              {/* Ansatz description */}
              <div className="bg-quantum-card rounded-lg border border-quantum-border p-5">
                <h3 className="text-sm font-semibold mb-2" style={{ color: ansatz.color }}>
                  {ansatz.name}
                </h3>
                <p className="text-sm text-gray-300 mb-3">{ansatz.description}</p>
                <pre className="text-xs font-mono text-gray-400 bg-quantum-bg rounded p-3 overflow-x-auto">
                  {ansatz.circuit}
                </pre>
                <div className="flex gap-4 mt-3 text-xs">
                  <a
                    href={ansatz.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-quantum-accent transition-colors"
                  >
                    Paper (arXiv) &nearr;
                  </a>
                  <Link
                    href={`/replications/${ansatz.replicationId}`}
                    className="text-gray-500 hover:text-quantum-accent transition-colors"
                  >
                    Our replication &rarr;
                  </Link>
                  <Link
                    href="/experiments"
                    className="text-gray-500 hover:text-quantum-accent transition-colors"
                  >
                    All experiments &rarr;
                  </Link>
                </div>
              </div>

              {/* Mapping details */}
              <div className="bg-quantum-card rounded-lg border border-quantum-border p-5">
                <h3 className="text-sm font-semibold mb-3">Qubit Assignment</h3>
                <div className="space-y-2">
                  {mapping.qubits.map((hwQ, i) => {
                    const errRate = backend.errorRates[hwQ]
                    const ansatzLabel = ANSATZE[selectedAnsatz].nodes[i]?.label || `q${i}`
                    return (
                      <div key={i} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">
                          {ansatzLabel} &rarr;{' '}
                          <span className="text-white">{backend.nodes.find((n) => n.id === hwQ)?.label ?? `q${hwQ}`}</span>
                        </span>
                        {errRate !== undefined && (
                          <span
                            className={
                              errRate < 2
                                ? 'text-green-400'
                                : errRate < 5
                                  ? 'text-orange-400'
                                  : 'text-pink-400'
                            }
                          >
                            {errRate}% err
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Edge fidelities */}
              <div className="bg-quantum-card rounded-lg border border-quantum-border p-5">
                <h3 className="text-sm font-semibold mb-3">Connection Fidelities</h3>
                <div className="space-y-2">
                  {mapping.edges.map(([a, b], i) => {
                    const hwEdge = backend.edges.find(
                      (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a)
                    )
                    const fid = hwEdge?.fidelity ?? 0
                    const labelA = backend.nodes.find((n) => n.id === a)?.label ?? `q${a}`
                    const labelB = backend.nodes.find((n) => n.id === b)?.label ?? `q${b}`
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-gray-400 w-24">
                          {labelA} &harr; {labelB}
                        </span>
                        <div className="flex-1 h-2 bg-quantum-bg rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(0, (fid - 80) * 5)}%`,
                              backgroundColor: fidelityColor(fid),
                            }}
                          />
                        </div>
                        <span style={{ color: fidelityColor(fid) }}>{fid > 0 ? `${fid.toFixed(1)}%` : 'N/A'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 3: Parameter Landscape           */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Parameter Landscape</h2>
          <p className="text-sm text-gray-500 mb-6">
            E(θ) for the 2-qubit H₂{' '}
            <Link href="/learn" className="text-quantum-accent/60 hover:text-quantum-accent">VQE</Link>{' '}
            at R=0.735 &Aring;, from{' '}
            <a href="https://arxiv.org/abs/1902.11258" target="_blank" rel="noopener noreferrer"
              className="text-quantum-accent/60 hover:text-quantum-accent">Sagastizabal 2019</a>.
            The single parameter θ controls the superposition cos(θ/2)|10⟩ + sin(θ/2)|01⟩.
            Green band shows{' '}
            <Link href="/learn" className="text-quantum-accent/60 hover:text-quantum-accent">chemical accuracy</Link>{' '}
            (1 kcal/mol). Hover to explore.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <EnergyLandscape hoverTheta={hoverTheta} onHover={setHoverTheta} />

            {/* Legend */}
            <div className="flex flex-wrap gap-6 mt-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-quantum-accent" />
                <span className="text-gray-400">E(θ) ideal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-green-400" />
                <span className="text-gray-400">FCI = {FCI_ENERGY.toFixed(4)} Ha</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-orange-400" />
                <span className="text-gray-400">HF = {HF_ENERGY.toFixed(4)} Ha</span>
              </div>
              {HW_MEASUREMENTS.map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: m.color }} />
                  <span className="text-gray-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insight callout */}
          <div className="mt-4 bg-quantum-card/60 rounded-lg border border-quantum-border p-4 text-sm text-gray-300">
            <span className="text-quantum-accent font-semibold">Key insight:</span>{' '}
            The landscape has a single minimum at θ = {THETA_OPT.toFixed(4)} rad, giving E = {vqeEnergy(THETA_OPT).toFixed(4)} Ha
            (within 0.75 kcal/mol of{' '}
            <span className="text-gray-400" title="Full Configuration Interaction — exact solution within the basis set">FCI</span>).
            Hardware noise shifts measurements upward:{' '}
            <Link href="/platforms" className="text-purple-400 hover:underline">IBM Torino</Link>{' '}
            sees +9.2 kcal/mol error,{' '}
            <Link href="/platforms" className="text-orange-400 hover:underline">Tuna-9</Link>{' '}
            with{' '}
            <Link href="/replications/sagastizabal2019" className="text-gray-400 hover:text-white underline decoration-gray-600">
              error mitigation
            </Link>{' '}
            gets +6.2 kcal/mol. The smooth, convex landscape means VQE convergence is guaranteed —
            the challenge is purely noise, not optimization. Compare our{' '}
            <Link href="/experiments" className="text-quantum-accent/70 hover:text-quantum-accent">
              full VQE results across bond distances
            </Link>.
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 4: Comparison Table              */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Ansatz Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-quantum-border">
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs">Ansatz</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-mono text-xs">Type</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">Qubits</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">Params</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">CNOTs</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">Depth</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">Tuna-9</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">Garnet</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-mono text-xs">Torino</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(ANSATZE) as AnsatzId[]).map((id) => {
                  const a = ANSATZE[id]
                  return (
                    <tr
                      key={id}
                      className={`border-b border-quantum-border/50 cursor-pointer transition-colors ${
                        selectedAnsatz === id ? 'bg-quantum-accent/5' : 'hover:bg-quantum-card/40'
                      }`}
                      onClick={() => setSelectedAnsatz(id)}
                    >
                      <td className="py-3 px-4 font-medium" style={{ color: a.color }}>
                        {a.name}
                      </td>
                      <td className="py-3 px-4 text-gray-400">{a.type}</td>
                      <td className="py-3 px-4 text-center font-mono">{a.qubits}</td>
                      <td className="py-3 px-4 text-center font-mono">{a.params}</td>
                      <td className="py-3 px-4 text-center font-mono">{a.cnots}</td>
                      <td className="py-3 px-4 text-center font-mono">{a.depth}</td>
                      {(['tuna9', 'garnet', 'torino'] as BackendId[]).map((bId) => {
                        const m = HW_MAPPINGS[bId][id]
                        return (
                          <td key={bId} className="py-3 px-4 text-center">
                            <span
                              className={`text-xs font-mono px-2 py-0.5 rounded ${
                                m.allNative
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-orange-900/30 text-orange-400'
                              }`}
                            >
                              {m.allNative ? 'Native' : 'SWAP'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 5: Key Terms                    */}
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
                term: 'Ansatz',
                definition: 'A parameterized quantum circuit used as a trial wavefunction in variational algorithms. The name comes from German, meaning "approach" or "initial guess."',
                learnAnchor: 'Algorithms',
              },
              {
                term: 'VQE',
                definition: 'Variational Quantum Eigensolver — a hybrid quantum-classical algorithm that finds the ground state energy of a molecule by minimizing ⟨ψ(θ)|H|ψ(θ)⟩ over parameters θ.',
                learnAnchor: 'Algorithms',
              },
              {
                term: 'QAOA',
                definition: 'Quantum Approximate Optimization Algorithm — alternates cost and mixer layers to find approximate solutions to combinatorial problems like MaxCut.',
                learnAnchor: 'Algorithms',
              },
              {
                term: 'CNOT',
                definition: 'Controlled-NOT gate — a two-qubit entangling gate that flips the target qubit when the control is |1⟩. The primary source of noise in most circuits.',
                learnAnchor: 'Gates & Circuits',
              },
              {
                term: 'UCCSD',
                definition: 'Unitary Coupled Cluster Singles and Doubles — a chemistry-motivated ansatz derived from classical coupled cluster theory. Preserves particle number and spin symmetry.',
                learnAnchor: 'Algorithms',
              },
              {
                term: 'Circuit Depth',
                definition: 'The number of sequential gate layers in a circuit. Deeper circuits accumulate more noise from decoherence. Keeping depth low is critical on NISQ hardware.',
                learnAnchor: 'Gates & Circuits',
              },
              {
                term: 'Chemical Accuracy',
                definition: '1 kcal/mol (1.6 mHa) — the precision threshold needed for quantum chemistry to be practically useful. Achieving this on real hardware is a key benchmark.',
                learnAnchor: 'Metrics & Benchmarks',
              },
              {
                term: 'Fidelity',
                definition: 'How closely a measured quantum state matches the ideal target state. A Bell state fidelity of 93.5% means 93.5% of measurements agree with the expected entangled outcome.',
                learnAnchor: 'Metrics & Benchmarks',
              },
              {
                term: 'Native Gates',
                definition: 'The physical gate set a quantum processor can execute directly. Non-native gates must be decomposed, adding depth and noise. SWAP routing adds ~3 CNOTs per non-native connection.',
                learnAnchor: 'Gates & Circuits',
              },
              {
                term: 'Barren Plateau',
                definition: 'A region of parameter space where the cost function gradient vanishes exponentially with qubit count, making optimization intractable. Hardware-efficient ansatze are especially prone to this.',
                learnAnchor: 'Algorithms',
              },
            ].map((item) => (
              <div
                key={item.term}
                className="bg-quantum-card/60 rounded-lg border border-quantum-border p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-quantum-accent">{item.term}</h3>
                  <Link
                    href="/learn"
                    className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-mono"
                  >
                    {item.learnAnchor}
                  </Link>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{item.definition}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 6: References                    */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">References</h2>

          {/* Hardware Documentation */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Hardware Documentation</h3>
          <p className="text-xs text-gray-500 mb-4">
            The three quantum processors shown above are real, publicly accessible superconducting transmon chips.
            All topology and fidelity data on this page comes from our own measurements — verify the hardware specs below.
          </p>
          <div className="space-y-3 text-sm mb-10">
            {[
              {
                id: 'H1',
                name: 'Tuna-9',
                provider: 'QuTech / TU Delft',
                specs: '9-qubit transmon, diamond topology, 12 flux-tunable couplers. Fabricated by DiCarlo Lab at QuTech. Available since December 2025.',
                links: [
                  { label: 'Backends page', url: 'https://www.quantum-inspire.com/backends/' },
                  { label: 'Transmon details', url: 'https://www.quantum-inspire.com/backends/transmons/' },
                  { label: 'Quantum Inspire platform', url: 'https://www.quantum-inspire.com/' },
                ],
                color: '#ff8c42',
              },
              {
                id: 'H2',
                name: 'IQM Garnet',
                provider: 'IQM Quantum Computers',
                specs: '20-qubit transmon, square-lattice topology, 30 tunable couplers. CZ native gate with 99.51% median two-qubit fidelity. Quantum Volume 32.',
                links: [
                  { label: 'QPU specifications', url: 'https://meetiqm.com/technology/qpu/' },
                  { label: 'Whitepaper (arXiv:2408.12433)', url: 'https://arxiv.org/abs/2408.12433' },
                  { label: 'IQM Resonance access', url: 'https://www.meetiqm.com/products/iqm-resonance/' },
                ],
                color: '#8b5cf6',
              },
              {
                id: 'H3',
                name: 'IBM Torino',
                provider: 'IBM Quantum',
                specs: '133-qubit Heron r1 processor, heavy-hex topology. CZ + SX + RZ native gate set. Echoed cross-resonance entangling gates.',
                links: [
                  { label: 'Processor types guide', url: 'https://quantum.cloud.ibm.com/docs/en/guides/processor-types' },
                  { label: 'Live calibration data', url: 'https://quantum.cloud.ibm.com/computers?type=Heron' },
                  { label: 'IBM Quantum platform', url: 'https://quantum.cloud.ibm.com/' },
                ],
                color: '#00d4ff',
              },
            ].map((hw) => (
              <div
                key={hw.id}
                className="flex gap-3 bg-quantum-card/40 rounded border border-quantum-border/50 p-4"
              >
                <span className="font-mono text-xs mt-0.5" style={{ color: hw.color }}>[{hw.id}]</span>
                <div className="flex-1">
                  <p className="text-gray-300">
                    <span className="font-semibold" style={{ color: hw.color }}>{hw.name}</span>
                    {' '}&mdash; {hw.provider}.{' '}
                    <span className="text-gray-400">{hw.specs}</span>
                  </p>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs">
                    {hw.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-quantum-accent transition-colors"
                      >
                        {link.label} &nearr;
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Algorithm Papers */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Algorithm Papers</h3>
          <p className="text-xs text-gray-500 mb-4">
            The ansatz circuits above come from these published experiments, which we{' '}
            <Link href="/replications" className="text-quantum-accent hover:underline">replicated</Link>{' '}
            on all three backends.
          </p>
          <div className="space-y-3 text-sm">
            {[
              {
                id: 'A1',
                authors: 'R. Sagastizabal et al.',
                title: 'Experimental error mitigation via symmetry verification in a variational quantum eigensolver',
                journal: 'Phys. Rev. A 100, 010302(R)',
                year: 2019,
                arxiv: 'https://arxiv.org/abs/1902.11258',
                doi: 'https://doi.org/10.1103/PhysRevA.100.010302',
                replicationId: 'sagastizabal2019',
              },
              {
                id: 'A2',
                authors: 'A. Peruzzo et al.',
                title: 'A variational eigenvalue solver on a photonic quantum processor',
                journal: 'Nature Communications 5, 4213',
                year: 2014,
                arxiv: 'https://arxiv.org/abs/1304.3061',
                doi: 'https://doi.org/10.1038/ncomms5213',
                replicationId: 'peruzzo2014',
              },
              {
                id: 'A3',
                authors: 'A. Kandala et al.',
                title: 'Hardware-efficient variational quantum eigensolver for small molecules and quantum magnets',
                journal: 'Nature 549, 242-246',
                year: 2017,
                arxiv: 'https://arxiv.org/abs/1704.05018',
                doi: 'https://doi.org/10.1038/nature23879',
                replicationId: 'kandala2017',
              },
              {
                id: 'A4',
                authors: 'M.P. Harrigan et al.',
                title: 'Quantum approximate optimization of non-planar graph problems on a planar superconducting processor',
                journal: 'Nature Physics 17, 332-336',
                year: 2021,
                arxiv: 'https://arxiv.org/abs/2004.04197',
                doi: 'https://doi.org/10.1038/s41567-020-01105-y',
                replicationId: 'harrigan2021',
              },
              {
                id: 'A5',
                authors: 'A.W. Cross et al.',
                title: 'Validating quantum computers using randomized model circuits',
                journal: 'Phys. Rev. A 100, 032328',
                year: 2019,
                arxiv: 'https://arxiv.org/abs/1811.12926',
                doi: 'https://doi.org/10.1103/PhysRevA.100.032328',
                replicationId: 'cross2019',
              },
            ].map((ref) => (
              <div
                key={ref.id}
                className="flex gap-3 bg-quantum-card/40 rounded border border-quantum-border/50 p-4"
              >
                <span className="text-quantum-accent font-mono text-xs mt-0.5">[{ref.id}]</span>
                <div className="flex-1">
                  <p className="text-gray-300">
                    {ref.authors}, &ldquo;{ref.title},&rdquo;{' '}
                    <span className="text-gray-500 italic">{ref.journal}</span> ({ref.year}).
                  </p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <a
                      href={ref.arxiv}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-quantum-accent transition-colors"
                    >
                      arXiv &nearr;
                    </a>
                    <a
                      href={ref.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-quantum-accent transition-colors"
                    >
                      DOI &nearr;
                    </a>
                    <Link
                      href={`/replications/${ref.replicationId}`}
                      className="text-gray-500 hover:text-quantum-accent transition-colors"
                    >
                      Our replication &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 7: Explore More                  */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Explore More</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/platforms', title: 'Platform Comparison', desc: 'Tuna-9 vs Garnet vs Torino: fidelity, QV, noise fingerprints' },
              { href: '/replications', title: 'Paper Replications', desc: '5 papers, 19 claims tested across 3 quantum backends' },
              { href: '/experiments', title: 'Experiment Dashboard', desc: '50+ experiments: Bell, GHZ, VQE, QAOA, QV, RB' },
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
          <Link href="/" className="text-quantum-accent hover:underline">AI x Quantum</Link>{' '}
          research initiative at TU Delft / QuTech.
          All hardware data collected from{' '}
          <Link href="/platforms" className="text-quantum-accent hover:underline">three quantum processors</Link>.
        </footer>
      </div>
    </div>
  )
}
