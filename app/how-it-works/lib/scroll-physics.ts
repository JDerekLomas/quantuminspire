// Shared physics functions for How It Works page
// Extracted from app/resonance/page.tsx

export const F0 = 5.0 // GHz, reference qubit frequency

export function lorentzian(freqGHz: number, omega: number, t2: number): number {
  const delta = (freqGHz - F0) * 1000 // GHz → MHz
  const gamma = 1 / (Math.PI * t2)     // natural linewidth in MHz
  return (omega * omega) / (omega * omega + delta * delta + gamma * gamma)
}

export function avoidedCrossing(delta: number, g: number): [number, number] {
  const half = Math.sqrt(delta * delta + g * g) / 2
  return [half, -half]
}

export function qFactor(f0GHz: number, t2us: number): number {
  return 2 * Math.PI * f0GHz * 1e3 * t2us
}

export function fwhmMHz(t2us: number): number {
  return 1 / (Math.PI * t2us)
}

export function stateComposition(delta: number, g: number): number {
  if (g === 0) return delta >= 0 ? 1 : 0
  const theta = 0.5 * Math.atan2(g, delta)
  return Math.cos(theta) * Math.cos(theta)
}

/** Scale GHz to audible Hz: 4.5 GHz → 220 Hz, 7.0 GHz → 880 Hz */
export function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

// Hardware frequency data (representative calibration values)
export const HARDWARE_FREQS = {
  tuna9: [
    { q: 0, freq: 5.12 }, { q: 1, freq: 5.38 }, { q: 2, freq: 5.55 },
    { q: 3, freq: 4.95 }, { q: 4, freq: 5.70 }, { q: 5, freq: 6.02 },
    { q: 6, freq: 6.25 }, { q: 7, freq: 6.48 }, { q: 8, freq: 6.80 },
  ],
  garnet: [
    { q: 1, freq: 5.05 }, { q: 2, freq: 5.18 }, { q: 3, freq: 5.30 },
    { q: 5, freq: 5.42 }, { q: 7, freq: 5.55 }, { q: 9, freq: 5.68 },
    { q: 11, freq: 5.80 }, { q: 14, freq: 5.92 }, { q: 17, freq: 5.48 },
    { q: 20, freq: 5.62 },
  ],
  torino: [
    { q: 0, freq: 4.62 }, { q: 1, freq: 4.78 }, { q: 5, freq: 4.92 },
    { q: 10, freq: 5.05 }, { q: 15, freq: 5.18 }, { q: 20, freq: 4.85 },
    { q: 30, freq: 5.30 }, { q: 50, freq: 4.70 }, { q: 75, freq: 5.12 },
    { q: 100, freq: 4.95 },
  ],
} as const
