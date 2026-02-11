// Types and data for the Ansatz Explorer page

export type AnsatzId = 'sp-vqe' | 'uccsd' | 'hw-efficient' | 'qaoa'
export type BackendId = 'tuna9' | 'garnet' | 'torino'

export interface QNode {
  id: number
  x: number
  y: number
  label: string
}

export interface QEdge {
  from: number
  to: number
  layer: number
  gateType: string
}

export interface Ansatz {
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

export interface HwEdge {
  from: number
  to: number
  fidelity: number
}

export interface Hardware {
  name: string
  fullName: string
  provider: string
  totalQubits: number
  nodes: QNode[]
  edges: HwEdge[]
  errorRates: Record<number, number>
}

export interface HwMapping {
  qubits: number[]
  edges: [number, number][]
  allNative: boolean
}

// ── Ansatz definitions ──────────────────────────────────────

export const ANSATZE: Record<AnsatzId, Ansatz> = {
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
    description: 'Ry(\u03b1) + CNOT + X preserves particle number in the {|01\u27e9, |10\u27e9} subspace. Minimal circuit for H\u2082 ground state.',
    circuit: 'q0: \u2500[Ry(\u03b1)]\u2500\u25cf\u2500[X]\u2500\nq1: \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2295\u2500\u2500\u2500\u2500\u2500',
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
    description: 'Chemistry-motivated. DoubleExcitation(\u03b8) on |1100\u27e9 reference. Exact for H\u2082 and HeH\u207a with one parameter.',
    circuit: 'q0: \u2500|1\u27e9\u2500\u2510\nq1: \u2500|1\u27e9\u2500\u2524 DoubleExc(\u03b8)\nq2: \u2500|0\u27e9\u2500\u2524\nq3: \u2500|0\u27e9\u2500\u2518',
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
    circuit: 'q0: \u2500[Ry][Rz]\u2500\u25cf\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nq1: \u2500[Ry][Rz]\u2500\u2295\u2500\u25cf\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nq2: \u2500[Ry][Rz]\u2500\u2500\u2500\u2500\u2295\u2500\u25cf\u2500\u2500\u2500\u2500\u2500\u2500\nq3: \u2500[Ry][Rz]\u2500\u2500\u2500\u2500\u2500\u2500\u2295\u2500\u2500\u2500\u2500\u2500\u2500',
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
    params: '2 (\u03b3, \u03b2)',
    cnots: 3,
    depth: 4,
    description: 'ZZ cost layer on problem graph edges, then Rx mixer. Topology matches the optimization problem, not the hardware.',
    circuit: 'All: \u2500[H]\u2500[ZZ(\u03b3)]\u2500[Rx(\u03b2)]\u2500\nCost on edges: (0,1)(0,2)(1,3)',
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

// ── Hardware topologies ─────────────────────────────────────

export const BACKENDS: Record<BackendId, Hardware> = {
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

// ── Hardware mappings (ansatz → hardware qubits) ────────────

export const HW_MAPPINGS: Record<BackendId, Record<AnsatzId, HwMapping>> = {
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

// ── H2 VQE energy landscape ────────────────────────────────

const G0 = -0.321124
const G1 = 0.397937
const G2 = -0.397937
const G3 = 0.0
const G4 = 0.090466
const G5 = 0.090466

export function vqeEnergy(theta: number): number {
  return G0 - G3 + (G2 - G1) * Math.cos(theta) + (G4 + G5) * Math.sin(theta)
}

export const HF_ENERGY = vqeEnergy(0)
export const FCI_ENERGY = -1.1373
export const THETA_OPT = -0.2235

export const HW_MEASUREMENTS = [
  { label: 'Emulator', energy: -1.1385, theta: THETA_OPT, color: '#00d4ff' },
  { label: 'IBM Torino', energy: -1.1226, theta: THETA_OPT, color: '#8b5cf6' },
  { label: 'Tuna-9 q[4,6]', energy: -1.1274, theta: THETA_OPT, color: '#ff8c42' },
]
