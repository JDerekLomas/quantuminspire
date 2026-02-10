// Complex arithmetic
export type Complex = [number, number]

export const cAdd = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]]
export const cSub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]]
export const cMul = (a: Complex, b: Complex): Complex => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
]
export const cScale = (s: number, a: Complex): Complex => [s * a[0], s * a[1]]
export const cConj = (a: Complex): Complex => [a[0], -a[1]]
export const cMag = (a: Complex): number => Math.sqrt(a[0] * a[0] + a[1] * a[1])
export const cMagSq = (a: Complex): number => a[0] * a[0] + a[1] * a[1]
export const cPhase = (a: Complex): number => Math.atan2(a[1], a[0])
