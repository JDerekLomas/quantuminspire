import { Complex, cAdd, cConj, cMag, cMagSq, cMul, cPhase, cSub } from './math'
import { Gate, H_GATE, X_GATE, Z_GATE } from './gates'

export type StateVector = Complex[]

export function zeroState(nQubits: number): StateVector {
  const state: StateVector = Array.from({ length: 1 << nQubits }, () => [0, 0] as Complex)
  state[0] = [1, 0]
  return state
}

export function numQubits(state: StateVector): number {
  return Math.round(Math.log2(state.length))
}

export function probabilities(state: StateVector): number[] {
  return state.map(cMagSq)
}

export function amplitudeInfo(state: StateVector): { mag: number; phase: number }[] {
  return state.map(c => ({ mag: cMag(c), phase: cPhase(c) }))
}

export function basisLabel(index: number, nQubits: number): string {
  return '|' + index.toString(2).padStart(nQubits, '0') + '\u27E9'
}

// --- Gate application ---

export function applySingleQubitGate(
  gate: Gate, target: number, state: StateVector, nQubits: number
): StateVector {
  const n = 1 << nQubits
  const result: StateVector = state.map(c => [...c] as Complex)
  const step = 1 << target

  for (let i = 0; i < n; i++) {
    if (i & step) continue
    const j = i | step
    const a = state[i], b = state[j]
    result[i] = cAdd(cMul(gate[0][0], a), cMul(gate[0][1], b))
    result[j] = cAdd(cMul(gate[1][0], a), cMul(gate[1][1], b))
  }
  return result
}

export function applyCNOT(
  control: number, target: number, state: StateVector, nQubits: number
): StateVector {
  const n = 1 << nQubits
  const result: StateVector = state.map(c => [...c] as Complex)
  const cBit = 1 << control, tBit = 1 << target

  for (let i = 0; i < n; i++) {
    if (!(i & cBit)) continue  // only act when control is |1⟩
    if (i & tBit) continue     // only process each pair once (target=0 side)
    const j = i | tBit         // partner with target=1
    result[i] = [...state[j]]
    result[j] = [...state[i]]
  }
  return result
}

export function measure(state: StateVector): number {
  const probs = probabilities(state)
  const r = Math.random()
  let cum = 0
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i]
    if (r < cum) return i
  }
  return probs.length - 1
}

// --- Density matrix & entanglement ---

export function densityMatrix(state: StateVector): Complex[][] {
  return Array.from({ length: state.length }, (_, i) =>
    Array.from({ length: state.length }, (_, j) => cMul(state[i], cConj(state[j])))
  )
}

function insertBit(index: number, position: number, bit: number): number {
  const mask = (1 << position) - 1
  return ((index & ~mask) << 1) | (bit << position) | (index & mask)
}

export function partialTrace(rho: Complex[][], qubit: number, nQubits: number): Complex[][] {
  const dim = 1 << (nQubits - 1)
  const result: Complex[][] = Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => [0, 0] as Complex)
  )
  for (let i = 0; i < dim; i++)
    for (let j = 0; j < dim; j++)
      for (let k = 0; k < 2; k++)
        result[i][j] = cAdd(result[i][j], rho[insertBit(i, qubit, k)][insertBit(j, qubit, k)])
  return result
}

export function blochFromDensity(rho: Complex[][]): [number, number, number] {
  // Extract Bloch vector from 2x2 density matrix (works for mixed states)
  const x = 2 * rho[0][1][0]  // 2 * Re(rho_01)
  const y = 2 * rho[0][1][1]  // 2 * Im(rho_01) ... note sigma_y sign
  const z = rho[0][0][0] - rho[1][1][0]  // rho_00 - rho_11
  return [x, -y, z]  // sigma_y gives -2*Im
}

export function blochCoords(state: StateVector): [number, number, number] {
  if (state.length !== 2) throw new Error('blochCoords requires single-qubit state')
  const magA = cMag(state[0]), magB = cMag(state[1])
  if (magB < 1e-10) return [0, 0, 1]
  if (magA < 1e-10) return [0, 0, -1]
  const theta = 2 * Math.acos(Math.min(1, magA))
  const phi = cPhase(state[1]) - cPhase(state[0])
  return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)]
}

// --- Entanglement metrics ---

export function vonNeumannEntropy2x2(rho: Complex[][]): number {
  const a = rho[0][0][0], d = rho[1][1][0]
  const bRe = rho[0][1][0], bIm = rho[0][1][1]
  const trace = a + d
  const det = a * d - (bRe * bRe + bIm * bIm)
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det))
  const l1 = (trace + disc) / 2, l2 = (trace - disc) / 2
  const e = (l: number) => (l > 1e-12 ? -l * Math.log2(l) : 0)
  return e(l1) + e(l2)
}

export function concurrence(state: StateVector): number {
  if (state.length !== 4) throw new Error('concurrence requires 2-qubit state')
  return 2 * cMag(cSub(cMul(state[0], state[3]), cMul(state[1], state[2])))
}

// --- Grover's algorithm ---

export function uniformSuperposition(nQubits: number): StateVector {
  const n = 1 << nQubits
  const amp: Complex = [1 / Math.sqrt(n), 0]
  return Array.from({ length: n }, () => [...amp] as Complex)
}

export function groverOracle(state: StateVector, target: number): StateVector {
  return state.map((c, i) => i === target ? [-c[0], -c[1]] as Complex : [...c] as Complex)
}

export function groverDiffusion(state: StateVector): StateVector {
  const n = state.length
  let mRe = 0, mIm = 0
  for (const c of state) { mRe += c[0]; mIm += c[1] }
  mRe /= n; mIm /= n
  return state.map(c => [2 * mRe - c[0], 2 * mIm - c[1]] as Complex)
}

export function groverStep(state: StateVector, target: number): StateVector {
  return groverDiffusion(groverOracle(state, target))
}

export function optimalGroverIterations(nQubits: number): number {
  return Math.round(Math.PI / 4 * Math.sqrt(1 << nQubits))
}

// --- Pre-built states ---

export function bellState(variant: 0 | 1 | 2 | 3 = 0): StateVector {
  let s = zeroState(2)
  s = applySingleQubitGate(H_GATE, 0, s, 2)
  s = applyCNOT(0, 1, s, 2)
  if (variant === 1) s = applySingleQubitGate(Z_GATE, 0, s, 2)
  if (variant === 2) s = applySingleQubitGate(X_GATE, 0, s, 2)
  if (variant === 3) { s = applySingleQubitGate(X_GATE, 0, s, 2); s = applySingleQubitGate(Z_GATE, 0, s, 2) }
  return s
}

export function ghzState(nQubits: number): StateVector {
  let s = zeroState(nQubits)
  s = applySingleQubitGate(H_GATE, 0, s, nQubits)
  for (let i = 1; i < nQubits; i++) s = applyCNOT(0, i, s, nQubits)
  return s
}

export function wState(nQubits: number): StateVector {
  const state: StateVector = Array.from({ length: 1 << nQubits }, () => [0, 0] as Complex)
  const amp = 1 / Math.sqrt(nQubits)
  for (let i = 0; i < nQubits; i++) state[1 << i] = [amp, 0]
  return state
}

// --- Teleportation utilities ---

export function projectAndCollapse(
  state: StateVector, measurements: [number, number][], nQubits: number
): StateVector {
  // Project state onto measurement outcomes and renormalize
  const n = 1 << nQubits
  const result: StateVector = state.map(c => [...c] as Complex)
  let norm = 0
  for (let i = 0; i < n; i++) {
    let keep = true
    for (const [qubit, outcome] of measurements) {
      const bit = (i >> qubit) & 1
      if (bit !== outcome) { keep = false; break }
    }
    if (!keep) { result[i] = [0, 0] }
    else { norm += cMagSq(result[i]) }
  }
  if (norm > 1e-14) {
    const s = 1 / Math.sqrt(norm)
    for (let i = 0; i < n; i++) { result[i] = [result[i][0] * s, result[i][1] * s] }
  }
  return result
}
