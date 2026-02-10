import { describe, it, expect } from "vitest"

import {
  applyCNOT,
  applySingleQubitGate,
  bellState,
  blochCoords,
  blochFromDensity,
  concurrence,
  densityMatrix,
  H_GATE,
  probabilities,
  X_GATE,
  zeroState,
} from "../lib/quantum"

const EPS = 1e-6

function close(a: number, b: number, eps = EPS) {
  expect(Math.abs(a - b)).toBeLessThan(eps)
}

describe("quantum library", () => {
  it("applies single-qubit gates correctly", () => {
    const init = zeroState(1)
    const flipped = applySingleQubitGate(X_GATE, 0, init, 1)
    close(flipped[0][0], 0)
    close(flipped[0][1], 0)
    close(flipped[1][0], 1)
    close(flipped[1][1], 0)

    const plus = applySingleQubitGate(H_GATE, 0, init, 1)
    close(plus[0][0], Math.SQRT1_2)
    close(plus[1][0], Math.SQRT1_2)
  })

  it("produces expected Bloch vectors for basis and |+> states", () => {
    const ket0 = zeroState(1)
    const ket1 = applySingleQubitGate(X_GATE, 0, zeroState(1), 1)
    const plus = applySingleQubitGate(H_GATE, 0, zeroState(1), 1)

    expect(blochCoords(ket0)).toEqual([0, 0, 1])
    expect(blochCoords(ket1)).toEqual([0, 0, -1])

    const [x, y, z] = blochCoords(plus)
    close(x, 1)
    close(y, 0)
    close(z, 0)
  })

  it("creates Bell state with correct amplitudes and entanglement", () => {
    const bell = bellState()
    const probs = probabilities(bell)
    close(probs[0], 0.5)
    close(probs[3], 0.5)
    close(probs[1], 0)
    close(probs[2], 0)

    // Concurrence of a maximally entangled Bell pair should be 1
    close(concurrence(bell), 1)
  })

  it("CNOT on |+0> matches Bell probabilities", () => {
    const init = zeroState(2)
    const plus0 = applySingleQubitGate(H_GATE, 0, init, 2)
    const bellViaCnot = applyCNOT(0, 1, plus0, 2)
    const probs = probabilities(bellViaCnot)
    close(probs[0], 0.5)
    close(probs[3], 0.5)
  })

  it("extracts Bloch vector from density matrix", () => {
    const plus = applySingleQubitGate(H_GATE, 0, zeroState(1), 1)
    const rho = densityMatrix(plus)
    const [x, y, z] = blochFromDensity(rho)
    close(x, 1)
    close(y, 0)
    close(z, 0)
  })
})
