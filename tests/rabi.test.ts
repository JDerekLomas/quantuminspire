import { describe, it, expect } from "vitest"
import {
  rabiP1,
  rabiSigmaZ,
  rabiBloch,
  rabiBlochXY,
} from "../lib/rabi"

const EPS = 1e-4

function close(a: number, b: number, eps = EPS) {
  expect(Math.abs(a - b)).toBeLessThan(eps)
}

describe("rabi helpers", () => {
  const omega = Math.PI // so that t = 1 gives a π-pulse on resonance

  it("computes excitation probability on resonance", () => {
    close(rabiP1(0, omega, 0, 0), 0)
    // π-pulse: full inversion
    close(rabiP1(1, omega, 0, 0), 1)
    // π/2-pulse: half population
    close(rabiP1(0.5, omega, 0, 0), 0.5)
  })

  it("reduces amplitude under detuning", () => {
    const det = omega // large detuning
    const omegaEff = Math.sqrt(omega * omega + det * det)
    const expectedMax = (omega / omegaEff) ** 2
    // Peak occurs at π/Ω_eff
    close(rabiP1(Math.PI / omegaEff, omega, det, 0), expectedMax)
    expect(expectedMax).toBeLessThan(0.6)
  })

  it("applies T2 decay envelope", () => {
    const t = 0.5
    const noDecay = rabiP1(t, omega, 0, 0)
    const decayed = rabiP1(t, omega, 0, 1) // finite T2
    expect(decayed).toBeLessThan(noDecay)
  })

  it("Bloch vector matches population inversion extremes", () => {
    const ground = rabiBloch(0, omega, 0, 0)
    close(ground[0], 0)
    close(ground[1], 0)
    close(ground[2], 1)

    const excited = rabiBloch(1, omega, 0, 0)
    close(excited[2], -1)
  })

  it("coherence components behave on resonance", () => {
    const [sx0, sy0] = rabiBlochXY(0, omega, 0, 0)
    close(sx0, 0)
    close(sy0, 0)
    const [, syMid] = rabiBlochXY(0.25, omega, 0, 0)
    expect(Math.abs(syMid)).toBeGreaterThan(0) // coherence builds (y component oscillates on resonance)
  })
})
