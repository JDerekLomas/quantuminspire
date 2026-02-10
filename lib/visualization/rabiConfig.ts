import { RabiViewId } from '../rabi'

export type Colormap = (t: number) => [number, number, number]

function interpolateStops(stops: [number, number, number, number][], t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t))
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++
  const [t0, r0, g0, b0] = stops[i]
  const [t1, r1, g1, b1] = stops[i + 1]
  const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0
  return [
    Math.round(r0 + f * (r1 - r0)),
    Math.round(g0 + f * (g1 - g0)),
    Math.round(b0 + f * (b1 - b0)),
  ]
}

export const viridis: Colormap = t =>
  interpolateStops([
    [0.0, 68, 1, 84],
    [0.2, 59, 82, 139],
    [0.4, 33, 145, 140],
    [0.6, 53, 183, 121],
    [0.8, 144, 215, 67],
    [1.0, 253, 231, 37],
  ], t)

export const coolwarm: Colormap = t =>
  interpolateStops([
    [0.0, 59, 76, 192],
    [0.25, 120, 150, 220],
    [0.5, 230, 230, 230],
    [0.75, 220, 130, 110],
    [1.0, 180, 4, 38],
  ], t)

export const plasma: Colormap = t =>
  interpolateStops([
    [0.0, 13, 8, 135],
    [0.25, 126, 3, 168],
    [0.5, 204, 71, 120],
    [0.75, 248, 149, 64],
    [1.0, 240, 249, 33],
  ], t)

export const twilight: Colormap = t =>
  interpolateStops([
    [0.0, 226, 217, 226],
    [0.17, 166, 133, 193],
    [0.33, 74, 78, 160],
    [0.5, 18, 36, 71],
    [0.67, 74, 100, 130],
    [0.83, 155, 177, 170],
    [1.0, 226, 217, 226],
  ], t)

export interface ViewConfig {
  id: RabiViewId
  label: string
  range: [number, number]          // value range for colormap
  colormap: Colormap
  colorbarLabels: string[]         // [top, mid, bottom]
  colorbarTitle: string
  formula: string
  unit: string
}

export const VIEW_CONFIGS: Record<RabiViewId, Omit<ViewConfig, 'id'>> = {
  'p1': {
    label: 'P(|1⟩)',
    range: [0, 1],
    colormap: viridis,
    colorbarLabels: ['1.0', '0.5', '0.0'],
    colorbarTitle: 'excitation prob.',
    formula: 'P(|1⟩) = (Ω/Ω_eff)² sin²(Ω_eff·t/2)',
    unit: '',
  },
  'z': {
    label: '⟨σ_z⟩',
    range: [-1, 1],
    colormap: coolwarm,
    colorbarLabels: ['+1', ' 0', '–1'],
    colorbarTitle: 'pop. inversion',
    formula: '⟨σ_z⟩ = 1 − 2P(|1⟩)',
    unit: '',
  },
  'x': {
    label: '⟨σ_x⟩',
    range: [-1, 1],
    colormap: coolwarm,
    colorbarLabels: ['+1', ' 0', '–1'],
    colorbarTitle: 'coherence (Re)',
    formula: '⟨σ_x⟩ = (ΩΔ/Ω_eff²)(1 − cos(Ω_eff·t))',
    unit: '',
  },
  'y': {
    label: '⟨σ_y⟩',
    range: [-1, 1],
    colormap: coolwarm,
    colorbarLabels: ['+1', ' 0', '–1'],
    colorbarTitle: 'coherence (Im)',
    formula: '⟨σ_y⟩ = −(Ω/Ω_eff) sin(Ω_eff·t)',
    unit: '',
  },
  'omega-eff': {
    label: 'Ω_eff',
    range: [0, 1],           // normalized dynamically
    colormap: plasma,
    colorbarLabels: ['max', '', '0'],
    colorbarTitle: 'eff. Rabi freq',
    formula: 'Ω_eff = √(Ω² + Δ²)',
    unit: 'MHz',
  },
  'phase': {
    label: 'φ',
    range: [0, 2 * Math.PI],
    colormap: twilight,
    colorbarLabels: ['2π', 'π', '0'],
    colorbarTitle: 'accum. phase',
    formula: 'φ = Ω_eff · t  mod 2π',
    unit: 'rad',
  },
}

export interface Recipe {
  name: string
  desc: string
  formula: string
  explanation: string
  lookFor: string
  view: RabiViewId
  omega: number
  t2: number
  maxPulse: number
  freqSpan: number
}

export const RECIPES: Recipe[] = [
  {
    name: 'π-pulse calibration',
    desc: 'Find the time for a perfect bit-flip',
    formula: 't_π = π / Ω',
    explanation: 'At resonance (Δ=0), the qubit flips completely at t = π/Ω. This is the fundamental single-qubit gate.',
    lookFor: 'First bright band along the center line',
    view: 'p1',
    omega: 4, t2: 0, maxPulse: 2, freqSpan: 0.04,
  },
  {
    name: 'Chevron calibration',
    desc: 'Classic V-pattern frequency sweep',
    formula: 'Ω_eff = √(Ω² + Δ²)',
    explanation: 'Sweeping drive frequency reveals the characteristic chevron. The V-opening encodes the Rabi frequency.',
    lookFor: 'Clean V-shaped bright fringes',
    view: 'p1',
    omega: 6, t2: 0, maxPulse: 1.5, freqSpan: 0.06,
  },
  {
    name: 'Ramsey-like detuning',
    desc: 'Off-resonance oscillation pattern',
    formula: 'f_osc = Ω_eff / 2π',
    explanation: 'Far from resonance, oscillations speed up but amplitude drops. The beat pattern reveals the detuning.',
    lookFor: 'Fast, low-amplitude oscillations at edges',
    view: 'z',
    omega: 3, t2: 0, maxPulse: 3, freqSpan: 0.06,
  },
  {
    name: 'T₂ decoherence',
    desc: 'Realistic damped oscillations',
    formula: 'P × exp(−t/T₂)',
    explanation: 'Dephasing causes oscillations to decay. The envelope reveals the coherence time T₂.',
    lookFor: 'Chevron fading out at long pulse times',
    view: 'p1',
    omega: 5, t2: 3, maxPulse: 4, freqSpan: 0.04,
  },
  {
    name: 'Weak excitation limit',
    desc: 'Low drive, slow dynamics',
    formula: 'P ≈ (Ω·t/2)² for small Ωt',
    explanation: 'Weak driving shows smooth, sinusoidal population transfer. The onset is parabolic in time.',
    lookFor: 'Gradual brightening from the top, slow oscillation',
    view: 'p1',
    omega: 1.2, t2: 0, maxPulse: 5, freqSpan: 0.015,
  },
  {
    name: 'Bloch X/Y coherence',
    desc: 'Visualize quantum coherence',
    formula: '⟨σ_x⟩ = (ΩΔ/Ω_eff²)(1 − cos Ω_eff t)',
    explanation: 'σ_x is nonzero only with detuning — it shows the interplay of drive and detuning. Switch to σ_y to see the oscillating coherence that persists even at resonance.',
    lookFor: 'Signal vanishes on the center line (Δ=0), grows off-resonance',
    view: 'x',
    omega: 4, t2: 0, maxPulse: 2, freqSpan: 0.04,
  },
  {
    name: 'Phase space portrait',
    desc: 'Cyclic phase accumulation',
    formula: 'φ = Ω_eff · t  mod 2π',
    explanation: 'The accumulated phase wraps cyclically, creating concentric ring patterns. The ring spacing encodes Ω_eff.',
    lookFor: 'Concentric rainbow rings, tighter off-resonance',
    view: 'phase',
    omega: 4, t2: 0, maxPulse: 2, freqSpan: 0.04,
  },
  {
    name: 'Effective Rabi geometry',
    desc: 'Pure V-shape of Ω_eff',
    formula: 'Ω_eff = √(Ω² + Δ²)',
    explanation: 'The effective Rabi frequency depends only on Ω and Δ, not time. This shows the geometric V-shape directly.',
    lookFor: 'Clean V-shape, independent of pulse length',
    view: 'omega-eff',
    omega: 4, t2: 0, maxPulse: 2, freqSpan: 0.06,
  },
]
