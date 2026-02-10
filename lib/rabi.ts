// Pure Rabi oscillation helpers (no React dependencies)
// P(|1⟩, t) = (Ω/Ω_eff)^2 sin^2(Ω_eff·t/2) · exp(-t/T2)

export type RabiViewId = 'p1' | 'z' | 'x' | 'y' | 'omega-eff' | 'phase'

export function rabiP1(t: number, omega: number, detuning: number, t2: number): number {
  const omegaEff = Math.sqrt(omega * omega + detuning * detuning)
  if (omegaEff < 1e-10) return 0
  const ratio = omega / omegaEff
  const osc = Math.sin((omegaEff * t) / 2)
  const decay = t2 > 0 ? Math.exp(-t / t2) : 1
  return ratio * ratio * osc * osc * decay
}

// ⟨σ_z⟩ = 1 − 2P(|1⟩) (population inversion)
export function rabiSigmaZ(t: number, omega: number, detuning: number, t2: number): number {
  return 1 - 2 * rabiP1(t, omega, detuning, t2)
}

// ⟨σ_x⟩ and ⟨σ_y⟩ — coherence components
// Derived from Bloch vector rotation: |0⟩ precesses about n̂ = (Ω, 0, Δ)/Ω_eff
// ⟨σ_x⟩ = (ΩΔ/Ω_eff²)(1 − cos Ω_eff t)  — zero at resonance
// ⟨σ_y⟩ = −(Ω/Ω_eff) sin(Ω_eff t)         — oscillates even at resonance
export function rabiBlochXY(
  t: number,
  omega: number,
  detuning: number,
  t2: number
): [number, number] {
  const omegaEff = Math.sqrt(omega * omega + detuning * detuning)
  if (omegaEff < 1e-10) return [0, 0]
  const decay = t2 > 0 ? Math.exp(-t / t2) : 1
  const sigmaX = (omega * detuning) / (omegaEff * omegaEff) * (1 - Math.cos(omegaEff * t)) * decay
  const sigmaY = -(omega / omegaEff) * Math.sin(omegaEff * t) * decay
  return [sigmaX, sigmaY]
}

// Bloch coords during Rabi oscillation
export function rabiBloch(
  t: number,
  omega: number,
  detuning: number,
  t2: number
): [number, number, number] {
  const [sx, sy] = rabiBlochXY(t, omega, detuning, t2)
  const sz = rabiSigmaZ(t, omega, detuning, t2)
  return [sx, sy, sz]
}

export function computeHeatmapValue(
  view: RabiViewId,
  t: number,
  omega: number,
  detuning: number,
  t2: number
): number {
  const omegaEff = Math.sqrt(omega * omega + detuning * detuning)
  switch (view) {
    case 'p1':
      return rabiP1(t, omega, detuning, t2)
    case 'z':
      return rabiSigmaZ(t, omega, detuning, t2)
    case 'x':
      return rabiBlochXY(t, omega, detuning, t2)[0]
    case 'y':
      return rabiBlochXY(t, omega, detuning, t2)[1]
    case 'omega-eff':
      return omegaEff > 0 ? omegaEff : 0
    case 'phase':
      if (omegaEff < 1e-10) return 0
      return (omegaEff * t) % (2 * Math.PI)
    default:
      return 0
  }
}
