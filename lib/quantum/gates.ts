import { Complex } from './math'

export type Gate = Complex[][]

const S2 = 1 / Math.sqrt(2)

export const I_GATE: Gate = [[[1, 0], [0, 0]], [[0, 0], [1, 0]]]
export const X_GATE: Gate = [[[0, 0], [1, 0]], [[1, 0], [0, 0]]]
export const Y_GATE: Gate = [[[0, 0], [0, -1]], [[0, 1], [0, 0]]]
export const Z_GATE: Gate = [[[1, 0], [0, 0]], [[0, 0], [-1, 0]]]
export const H_GATE: Gate = [[[S2, 0], [S2, 0]], [[S2, 0], [-S2, 0]]]
export const S_GATE: Gate = [[[1, 0], [0, 0]], [[0, 0], [0, 1]]]
export const T_GATE: Gate = [[[1, 0], [0, 0]], [[0, 0], [S2, S2]]]
export const SDG_GATE: Gate = [[[1, 0], [0, 0]], [[0, 0], [0, -1]]]
export const TDG_GATE: Gate = [[[1, 0], [0, 0]], [[0, 0], [S2, -S2]]]

export function Rx(theta: number): Gate {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2)
  return [[[c, 0], [0, -s]], [[0, -s], [c, 0]]]
}

export function Ry(theta: number): Gate {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2)
  return [[[c, 0], [-s, 0]], [[s, 0], [c, 0]]]
}

export function Rz(theta: number): Gate {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2)
  return [[[c, -s], [0, 0]], [[0, 0], [c, s]]]
}

export const GATES: Record<string, Gate> = {
  I: I_GATE, X: X_GATE, Y: Y_GATE, Z: Z_GATE,
  H: H_GATE, S: S_GATE, T: T_GATE,
  'S\u2020': SDG_GATE, 'T\u2020': TDG_GATE,
}
