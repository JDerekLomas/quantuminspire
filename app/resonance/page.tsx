'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// PHYSICS FUNCTIONS
// ============================================================

const F0 = 5.0 // GHz, qubit frequency

function lorentzian(freqGHz: number, omega: number, t2: number): number {
  const delta = (freqGHz - F0) * 1000 // GHz → MHz
  const gamma = 1 / (Math.PI * t2)     // natural linewidth in MHz
  return (omega * omega) / (omega * omega + delta * delta + gamma * gamma)
}

function avoidedCrossing(delta: number, g: number): [number, number] {
  const half = Math.sqrt(delta * delta + g * g) / 2
  return [half, -half]
}

function qFactor(f0GHz: number, t2us: number): number {
  return 2 * Math.PI * f0GHz * 1e3 * t2us // dimensionless
}

function fwhmMHz(t2us: number): number {
  return 1 / (Math.PI * t2us) // MHz
}

function stateComposition(delta: number, g: number): number {
  // Returns fraction of |qubit⟩ in the upper dressed state
  // 0 = pure cavity, 0.5 = maximally mixed, 1 = pure qubit
  if (g === 0) return delta >= 0 ? 1 : 0
  const theta = 0.5 * Math.atan2(g, delta)
  return Math.cos(theta) * Math.cos(theta)
}

// ============================================================
// HARDWARE FREQUENCY DATA (representative)
// ============================================================

const HARDWARE_FREQS = {
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
}

// ============================================================
// METAPHOR CALLOUT
// ============================================================

function MetaphorCallout({ children, accent = '#00d4ff' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="mt-4 rounded-lg border p-4 text-sm text-gray-300 leading-relaxed"
      style={{ borderColor: accent + '30', backgroundColor: accent + '08' }}
    >
      {children}
    </div>
  )
}

// ============================================================
// SECTION 1: ENERGY LEVEL + RESPONSE DIAGRAM
// ============================================================

function EnergyLevelDiagram() {
  const W = 800
  const H = 240

  // Left side: energy levels
  const lvlX = 80
  const lvlW = 140
  const e0Y = 170
  const e1Y = 60

  // Right side: response peak
  const peakX0 = 420
  const peakW = 320
  const peakH = 150
  const peakY0 = 40

  // Generate Lorentzian shape for the mini peak
  const peakPoints = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 100; i++) {
      const frac = i / 100
      const x = peakX0 + frac * peakW
      const delta = (frac - 0.5) * 100 // MHz from center
      const response = 1 / (1 + (delta / 8) * (delta / 8))
      const y = peakY0 + peakH - response * peakH * 0.85
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Energy level: |0⟩ */}
      <line x1={lvlX} y1={e0Y} x2={lvlX + lvlW} y2={e0Y} stroke="#00d4ff" strokeWidth={2.5} />
      <text x={lvlX - 10} y={e0Y + 4} fill="#00d4ff" fontSize="13" fontFamily="monospace" textAnchor="end">|0⟩</text>

      {/* Energy level: |1⟩ */}
      <line x1={lvlX} y1={e1Y} x2={lvlX + lvlW} y2={e1Y} stroke="#ff6b9d" strokeWidth={2.5} />
      <text x={lvlX - 10} y={e1Y + 4} fill="#ff6b9d" fontSize="13" fontFamily="monospace" textAnchor="end">|1⟩</text>

      {/* Wavy arrow between levels — on resonance, bright */}
      <path
        d={`M ${lvlX + lvlW / 2 - 5} ${e0Y - 10} Q ${lvlX + lvlW / 2 + 8} ${(e0Y + e1Y) / 2 + 15}, ${lvlX + lvlW / 2 - 5} ${(e0Y + e1Y) / 2} Q ${lvlX + lvlW / 2 + 8} ${(e0Y + e1Y) / 2 - 15}, ${lvlX + lvlW / 2 - 5} ${e1Y + 12}`}
        fill="none"
        stroke="#ff8c42"
        strokeWidth={2}
        opacity={0.9}
      />
      <polygon
        points={`${lvlX + lvlW / 2 - 5},${e1Y + 12} ${lvlX + lvlW / 2 - 9},${e1Y + 20} ${lvlX + lvlW / 2 - 1},${e1Y + 20}`}
        fill="#ff8c42"
        opacity={0.9}
      />

      {/* Label: hν */}
      <text x={lvlX + lvlW / 2 + 16} y={(e0Y + e1Y) / 2 + 4} fill="#ff8c42" fontSize="12" fontFamily="monospace" fontWeight="600">
        h{'\u03BD'}
      </text>

      {/* Energy gap label */}
      <line x1={lvlX + lvlW + 20} y1={e0Y} x2={lvlX + lvlW + 20} y2={e1Y} stroke="#4b5563" strokeWidth={1} strokeDasharray="3 3" />
      <text x={lvlX + lvlW + 30} y={(e0Y + e1Y) / 2 + 4} fill="#6b7280" fontSize="10" fontFamily="monospace">
        {'\u0394'}E = h{'\u03C9'}{'\u2080'}
      </text>

      {/* Divider */}
      <line x1={360} y1={30} x2={360} y2={H - 20} stroke="#1e293b" strokeWidth={1} />

      {/* Response curve */}
      <polyline points={peakPoints} fill="none" stroke="#00d4ff" strokeWidth={2} />

      {/* Baseline */}
      <line x1={peakX0} y1={peakY0 + peakH} x2={peakX0 + peakW} y2={peakY0 + peakH} stroke="#4b5563" strokeWidth={1} />

      {/* X-axis labels */}
      <text x={peakX0 + peakW / 2} y={peakY0 + peakH + 18} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">
        {'\u03C9'}{'\u2080'}
      </text>
      <text x={peakX0 + 10} y={peakY0 + peakH + 18} fill="#4b5563" fontSize="9" fontFamily="monospace">
        low
      </text>
      <text x={peakX0 + peakW - 10} y={peakY0 + peakH + 18} fill="#4b5563" fontSize="9" fontFamily="monospace" textAnchor="end">
        high
      </text>

      {/* Peak dot */}
      <circle cx={peakX0 + peakW / 2} cy={peakY0 + peakH * 0.15} r={4} fill="#00d4ff" stroke="white" strokeWidth={1.5} />

      {/* Y-axis label */}
      <text x={peakX0 - 8} y={peakY0 + peakH / 2} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="end"
        transform={`rotate(-90, ${peakX0 - 8}, ${peakY0 + peakH / 2})`}>
        P(|1⟩)
      </text>

      {/* Arrow: "match frequency" */}
      <text x={peakX0 + peakW / 2} y={peakY0} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
        peak when drive = qubit frequency
      </text>

      {/* Axis label */}
      <text x={peakX0 + peakW / 2} y={peakY0 + peakH + 35} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
        Drive frequency
      </text>
    </svg>
  )
}

// ============================================================
// SECTION 2: INTERACTIVE SPECTROSCOPY
// ============================================================

function SpectroscopyPlot({
  omega,
  t2,
  hoverFreq,
  onHover,
}: {
  omega: number
  t2: number
  hoverFreq: number | null
  onHover: (f: number | null) => void
}) {
  const W = 700
  const H = 350
  const PAD = { top: 30, right: 30, bottom: 50, left: 70 }

  const freqMin = F0 - 0.05 // GHz
  const freqMax = F0 + 0.05 // GHz

  const xScale = useCallback((f: number) =>
    PAD.left + ((f - freqMin) / (freqMax - freqMin)) * (W - PAD.left - PAD.right), [])
  const yScale = useCallback((p: number) =>
    PAD.top + ((1 - p) / 1) * (H - PAD.top - PAD.bottom), [])

  const points = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 300; i++) {
      const f = freqMin + (i / 300) * (freqMax - freqMin)
      const p = lorentzian(f, omega, t2)
      pts.push(`${xScale(f).toFixed(1)},${yScale(p).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [omega, t2, xScale, yScale])

  const peakHeight = lorentzian(F0, omega, t2)
  const halfMax = peakHeight / 2
  const fwhmVal = fwhmMHz(t2)

  // FWHM marker positions
  const fwhmLeftGHz = F0 - fwhmVal / 2 / 1000
  const fwhmRightGHz = F0 + fwhmVal / 2 / 1000

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const svgX = ((e.clientX - rect.left) / rect.width) * W
      const f = freqMin + ((svgX - PAD.left) / (W - PAD.left - PAD.right)) * (freqMax - freqMin)
      if (f >= freqMin && f <= freqMax) {
        onHover(f)
      }
    },
    [onHover]
  )

  // X-axis ticks
  const xTicks = [-50, -25, 0, 25, 50]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(y => (
        <line key={`gy-${y}`} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)} stroke="#1e293b" strokeWidth={0.5} />
      ))}
      {xTicks.map(mhz => (
        <line key={`gx-${mhz}`} x1={xScale(F0 + mhz / 1000)} y1={PAD.top} x2={xScale(F0 + mhz / 1000)} y2={H - PAD.bottom} stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Lorentzian curve */}
      <polyline points={points} fill="none" stroke="#00d4ff" strokeWidth={2.5} />

      {/* Peak dot */}
      <circle cx={xScale(F0)} cy={yScale(peakHeight)} r={5} fill="#00d4ff" stroke="white" strokeWidth={1.5} />

      {/* Peak annotation */}
      <text x={xScale(F0) + 10} y={yScale(peakHeight) - 8} fill="#00d4ff" fontSize="10" fontFamily="monospace">
        f{'\u2080'} = {F0.toFixed(2)} GHz
      </text>

      {/* FWHM annotation */}
      {fwhmLeftGHz >= freqMin && fwhmRightGHz <= freqMax && (
        <g>
          <line
            x1={xScale(fwhmLeftGHz)} y1={yScale(halfMax)}
            x2={xScale(fwhmRightGHz)} y2={yScale(halfMax)}
            stroke="#ff8c42" strokeWidth={1.5}
          />
          {/* Arrow tips */}
          <line x1={xScale(fwhmLeftGHz)} y1={yScale(halfMax) - 5} x2={xScale(fwhmLeftGHz)} y2={yScale(halfMax) + 5} stroke="#ff8c42" strokeWidth={1.5} />
          <line x1={xScale(fwhmRightGHz)} y1={yScale(halfMax) - 5} x2={xScale(fwhmRightGHz)} y2={yScale(halfMax) + 5} stroke="#ff8c42" strokeWidth={1.5} />
          <text
            x={(xScale(fwhmLeftGHz) + xScale(fwhmRightGHz)) / 2}
            y={yScale(halfMax) - 8}
            fill="#ff8c42" fontSize="9" fontFamily="monospace" textAnchor="middle"
          >
            FWHM = {fwhmVal >= 1 ? fwhmVal.toFixed(2) + ' MHz' : (fwhmVal * 1000).toFixed(1) + ' kHz'}
          </text>
        </g>
      )}

      {/* Hover crosshair */}
      {hoverFreq !== null && (() => {
        const cx = xScale(hoverFreq)
        const response = lorentzian(hoverFreq, omega, t2)
        const cy = yScale(response)
        const flipLeft = cx > W - PAD.right - 150
        const tx = flipLeft ? cx - 145 : cx + 8
        return (
          <g>
            <line x1={cx} y1={PAD.top} x2={cx} y2={H - PAD.bottom} stroke="white" strokeWidth={0.5} opacity={0.3} />
            <line x1={PAD.left} y1={cy} x2={W - PAD.right} y2={cy} stroke="white" strokeWidth={0.5} opacity={0.15} />
            <circle cx={cx} cy={cy} r={4} fill="white" fillOpacity={0.3} stroke="white" strokeWidth={1} />
            <rect x={tx} y={cy - 22} width={138} height={30} rx={4} fill="#111827" stroke="#1e293b" strokeWidth={1} />
            <text x={tx + 6} y={cy - 8} fill="white" fontSize="9" fontFamily="monospace">
              {'\u0394'}f = {((hoverFreq - F0) * 1000).toFixed(1)} MHz
            </text>
            <text x={tx + 6} y={cy + 4} fill="#00d4ff" fontSize="9" fontFamily="monospace">
              P(|1⟩) = {response.toFixed(4)}
            </text>
          </g>
        )
      })()}

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {xTicks.map(mhz => (
        <text key={`xl-${mhz}`} x={xScale(F0 + mhz / 1000)} y={H - PAD.bottom + 18} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
          {mhz >= 0 ? '+' : ''}{mhz}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} fill="#9ca3af" fontSize="11" textAnchor="middle">
        Detuning from f{'\u2080'} (MHz)
      </text>

      {/* Y labels */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(y => (
        <text key={`yl-${y}`} x={PAD.left - 8} y={yScale(y) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="end">
          {y.toFixed(2)}
        </text>
      ))}
      <text x={15} y={(PAD.top + H - PAD.bottom) / 2} fill="#9ca3af" fontSize="11" textAnchor="middle"
        transform={`rotate(-90, 15, ${(PAD.top + H - PAD.bottom) / 2})`}>
        P(|1⟩)
      </text>
    </svg>
  )
}

// ============================================================
// SECTION 3: LINEWIDTH COMPARISON
// ============================================================

function LinewidthComparison({ omega }: { omega: number }) {
  const W = 700
  const H = 300
  const PAD = { top: 20, right: 30, bottom: 50, left: 70 }

  const configs = [
    { t2: 5, color: '#ff6b9d', label: 'T\u2082 = 5 \u03BCs' },
    { t2: 20, color: '#00d4ff', label: 'T\u2082 = 20 \u03BCs' },
    { t2: 100, color: '#00ff88', label: 'T\u2082 = 100 \u03BCs' },
  ]

  const freqMin = F0 - 0.05
  const freqMax = F0 + 0.05

  const xScale = useCallback((f: number) =>
    PAD.left + ((f - freqMin) / (freqMax - freqMin)) * (W - PAD.left - PAD.right), [])
  const yScale = useCallback((p: number) =>
    PAD.top + ((1 - p) / 1) * (H - PAD.top - PAD.bottom), [])

  const allCurves = useMemo(() => {
    return configs.map(cfg => {
      const pts: string[] = []
      for (let i = 0; i <= 300; i++) {
        const f = freqMin + (i / 300) * (freqMax - freqMin)
        const p = lorentzian(f, omega, cfg.t2)
        pts.push(`${xScale(f).toFixed(1)},${yScale(p).toFixed(1)}`)
      }
      return pts.join(' ')
    })
  }, [omega, xScale, yScale])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(y => (
        <line key={`g-${y}`} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)} stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Curves */}
      {configs.map((cfg, i) => (
        <polyline key={cfg.t2} points={allCurves[i]} fill="none" stroke={cfg.color} strokeWidth={2} opacity={0.85} />
      ))}

      {/* Labels on peaks */}
      {configs.map((cfg, i) => {
        const peakP = lorentzian(F0, omega, cfg.t2)
        const labelOffsets = [-55, 0, 55]
        return (
          <text
            key={`lbl-${cfg.t2}`}
            x={xScale(F0) + labelOffsets[i]}
            y={yScale(peakP) - 10}
            fill={cfg.color}
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {cfg.label}
          </text>
        )
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {[-50, -25, 0, 25, 50].map(mhz => (
        <text key={`xl-${mhz}`} x={xScale(F0 + mhz / 1000)} y={H - PAD.bottom + 18} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
          {mhz >= 0 ? '+' : ''}{mhz}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} fill="#9ca3af" fontSize="11" textAnchor="middle">
        Detuning (MHz)
      </text>

      {/* Y labels */}
      {[0, 0.5, 1.0].map(y => (
        <text key={`yl-${y}`} x={PAD.left - 8} y={yScale(y) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="end">
          {y.toFixed(1)}
        </text>
      ))}
    </svg>
  )
}

function QFactorBars() {
  const configs = [
    { t2: 5, color: '#ff6b9d', label: 'T\u2082 = 5 \u03BCs' },
    { t2: 20, color: '#00d4ff', label: 'T\u2082 = 20 \u03BCs' },
    { t2: 100, color: '#00ff88', label: 'T\u2082 = 100 \u03BCs' },
  ]

  const maxQ = qFactor(F0, 100)

  return (
    <div className="mt-4 space-y-2">
      {configs.map(cfg => {
        const q = qFactor(F0, cfg.t2)
        const pct = (q / maxQ) * 100
        const fwhm = fwhmMHz(cfg.t2)
        return (
          <div key={cfg.t2} className="flex items-center gap-3 text-xs font-mono">
            <span className="w-24 text-gray-400">{cfg.label}</span>
            <div className="flex-1 h-3 bg-quantum-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: cfg.color }}
              />
            </div>
            <span className="w-28 text-right" style={{ color: cfg.color }}>
              Q = {q >= 1e6 ? (q / 1e6).toFixed(1) + 'M' : q >= 1e3 ? (q / 1e3).toFixed(0) + 'K' : q.toFixed(0)}
            </span>
            <span className="w-28 text-right text-gray-500">
              {fwhm >= 1 ? fwhm.toFixed(1) + ' MHz' : (fwhm * 1000).toFixed(1) + ' kHz'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// SECTION 4: AVOIDED CROSSING
// ============================================================

function AvoidedCrossingPlot({
  coupling,
  hoverDelta,
  onHover,
}: {
  coupling: number
  hoverDelta: number | null
  onHover: (d: number | null) => void
}) {
  const W = 700
  const H = 400
  const PAD = { top: 30, right: 30, bottom: 70, left: 70 }

  const deltaMin = -200
  const deltaMax = 200
  const eMax = 150

  const xScale = useCallback((d: number) =>
    PAD.left + ((d - deltaMin) / (deltaMax - deltaMin)) * (W - PAD.left - PAD.right), [])
  const yScale = useCallback((e: number) =>
    PAD.top + ((eMax - e) / (2 * eMax)) * (H - PAD.top - PAD.bottom), [])

  // Dressed state curves
  const upperPoints = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const d = deltaMin + (i / 200) * (deltaMax - deltaMin)
      const [eUp] = avoidedCrossing(d, coupling)
      pts.push(`${xScale(d).toFixed(1)},${yScale(eUp).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [coupling, xScale, yScale])

  const lowerPoints = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const d = deltaMin + (i / 200) * (deltaMax - deltaMin)
      const [, eLow] = avoidedCrossing(d, coupling)
      pts.push(`${xScale(d).toFixed(1)},${yScale(eLow).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [coupling, xScale, yScale])

  // Bare (uncoupled) crossing lines
  const bareUpper = `${xScale(deltaMin).toFixed(1)},${yScale(deltaMin / 2).toFixed(1)} ${xScale(deltaMax).toFixed(1)},${yScale(deltaMax / 2).toFixed(1)}`
  const bareLower = `${xScale(deltaMin).toFixed(1)},${yScale(-deltaMin / 2).toFixed(1)} ${xScale(deltaMax).toFixed(1)},${yScale(-deltaMax / 2).toFixed(1)}`

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const svgX = ((e.clientX - rect.left) / rect.width) * W
      const d = deltaMin + ((svgX - PAD.left) / (W - PAD.left - PAD.right)) * (deltaMax - deltaMin)
      if (d >= deltaMin && d <= deltaMax) {
        onHover(d)
      }
    },
    [onHover]
  )

  // State composition at hover
  const hoverQubitFrac = hoverDelta !== null ? stateComposition(hoverDelta, coupling) : 0.5

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    >
      {/* Grid */}
      {[-150, -100, -50, 0, 50, 100, 150].map(d => (
        <line key={`gx-${d}`} x1={xScale(d)} y1={PAD.top} x2={xScale(d)} y2={H - PAD.bottom} stroke="#1e293b" strokeWidth={0.5} />
      ))}
      {[-100, -50, 0, 50, 100].map(e => (
        <line key={`gy-${e}`} x1={PAD.left} y1={yScale(e)} x2={W - PAD.right} y2={yScale(e)} stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Bare crossing lines (dashed) */}
      <polyline points={bareUpper} fill="none" stroke="#4b5563" strokeWidth={1} strokeDasharray="6 4" />
      <polyline points={bareLower} fill="none" stroke="#4b5563" strokeWidth={1} strokeDasharray="6 4" />

      {/* Dressed state curves */}
      <polyline points={upperPoints} fill="none" stroke="#ff6b9d" strokeWidth={2.5} />
      <polyline points={lowerPoints} fill="none" stroke="#00d4ff" strokeWidth={2.5} />

      {/* Gap annotation at Δ=0 */}
      {(() => {
        const [eUp, eLow] = avoidedCrossing(0, coupling)
        const cx = xScale(0)
        return (
          <g>
            <line x1={cx + 8} y1={yScale(eUp)} x2={cx + 8} y2={yScale(eLow)} stroke="#ff8c42" strokeWidth={1.5} />
            <line x1={cx + 4} y1={yScale(eUp)} x2={cx + 12} y2={yScale(eUp)} stroke="#ff8c42" strokeWidth={1.5} />
            <line x1={cx + 4} y1={yScale(eLow)} x2={cx + 12} y2={yScale(eLow)} stroke="#ff8c42" strokeWidth={1.5} />
            <text x={cx + 18} y={yScale(0) + 4} fill="#ff8c42" fontSize="11" fontFamily="monospace" fontWeight="600">
              2g = {coupling} MHz
            </text>
          </g>
        )
      })()}

      {/* Hover crosshair */}
      {hoverDelta !== null && (() => {
        const cx = xScale(hoverDelta)
        const [eUp, eLow] = avoidedCrossing(hoverDelta, coupling)
        const flipLeft = cx > W - PAD.right - 160
        const tx = flipLeft ? cx - 155 : cx + 8
        return (
          <g>
            <line x1={cx} y1={PAD.top} x2={cx} y2={H - PAD.bottom} stroke="white" strokeWidth={0.5} opacity={0.3} />
            <circle cx={cx} cy={yScale(eUp)} r={4} fill="#ff6b9d" stroke="white" strokeWidth={1} />
            <circle cx={cx} cy={yScale(eLow)} r={4} fill="#00d4ff" stroke="white" strokeWidth={1} />

            {/* Info box */}
            <rect x={tx} y={yScale(0) - 35} width={148} height={58} rx={4} fill="#111827" stroke="#1e293b" strokeWidth={1} />
            <text x={tx + 6} y={yScale(0) - 20} fill="white" fontSize="9" fontFamily="monospace">
              {'\u0394'} = {hoverDelta.toFixed(0)} MHz
            </text>
            <text x={tx + 6} y={yScale(0) - 8} fill="#ff6b9d" fontSize="9" fontFamily="monospace">
              E+ = {eUp.toFixed(1)} MHz
            </text>
            <text x={tx + 6} y={yScale(0) + 4} fill="#00d4ff" fontSize="9" fontFamily="monospace">
              E- = {eLow.toFixed(1)} MHz
            </text>
            <text x={tx + 6} y={yScale(0) + 16} fill="#6b7280" fontSize="8" fontFamily="monospace">
              |qubit⟩: {(hoverQubitFrac * 100).toFixed(0)}% | |cavity⟩: {((1 - hoverQubitFrac) * 100).toFixed(0)}%
            </text>
          </g>
        )
      })()}

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {[-200, -100, 0, 100, 200].map(d => (
        <text key={`xl-${d}`} x={xScale(d)} y={H - PAD.bottom + 18} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
          {d}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - PAD.bottom + 38} fill="#9ca3af" fontSize="11" textAnchor="middle">
        Detuning {'\u0394'} (MHz)
      </text>

      {/* Y labels */}
      {[-100, -50, 0, 50, 100].map(e => (
        <text key={`yl-${e}`} x={PAD.left - 8} y={yScale(e) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="end">
          {e}
        </text>
      ))}
      <text x={15} y={(PAD.top + H - PAD.bottom) / 2} fill="#9ca3af" fontSize="11" textAnchor="middle"
        transform={`rotate(-90, 15, ${(PAD.top + H - PAD.bottom) / 2})`}>
        Energy (MHz)
      </text>

      {/* Legend */}
      <g transform={`translate(${PAD.left + 10}, ${H - PAD.bottom + 50})`}>
        <line x1={0} y1={0} x2={20} y2={0} stroke="#ff6b9d" strokeWidth={2} />
        <text x={26} y={4} fill="#9ca3af" fontSize="9" fontFamily="monospace">E+ (upper)</text>
        <line x1={110} y1={0} x2={130} y2={0} stroke="#00d4ff" strokeWidth={2} />
        <text x={136} y={4} fill="#9ca3af" fontSize="9" fontFamily="monospace">E- (lower)</text>
        <line x1={220} y1={0} x2={240} y2={0} stroke="#4b5563" strokeWidth={1} strokeDasharray="6 4" />
        <text x={246} y={4} fill="#9ca3af" fontSize="9" fontFamily="monospace">bare (uncoupled)</text>
      </g>

      {/* State composition circles below plot */}
      {hoverDelta !== null && (() => {
        const circR = 18
        const cx1 = W / 2 - 80
        const cx2 = W / 2 + 80
        const cy = H - 10
        return (
          <g>
            {/* Upper state */}
            <circle cx={cx1} cy={cy} r={circR} fill="none" stroke="#ff6b9d" strokeWidth={1.5} opacity={0.5} />
            <circle cx={cx1} cy={cy} r={circR} fill="#ff6b9d" opacity={0.15} />
            {/* Qubit fraction fill */}
            <clipPath id="upper-clip">
              <rect x={cx1 - circR} y={cy + circR - circR * 2 * hoverQubitFrac} width={circR * 2} height={circR * 2 * hoverQubitFrac} />
            </clipPath>
            <circle cx={cx1} cy={cy} r={circR - 1} fill="#ff6b9d" opacity={0.6} clipPath="url(#upper-clip)" />
            <text x={cx1} y={cy - circR - 6} fill="#ff6b9d" fontSize="8" fontFamily="monospace" textAnchor="middle">upper</text>

            {/* Lower state */}
            <circle cx={cx2} cy={cy} r={circR} fill="none" stroke="#00d4ff" strokeWidth={1.5} opacity={0.5} />
            <circle cx={cx2} cy={cy} r={circR} fill="#00d4ff" opacity={0.15} />
            <clipPath id="lower-clip">
              <rect x={cx2 - circR} y={cy + circR - circR * 2 * (1 - hoverQubitFrac)} width={circR * 2} height={circR * 2 * (1 - hoverQubitFrac)} />
            </clipPath>
            <circle cx={cx2} cy={cy} r={circR - 1} fill="#00d4ff" opacity={0.6} clipPath="url(#lower-clip)" />
            <text x={cx2} y={cy - circR - 6} fill="#00d4ff" fontSize="8" fontFamily="monospace" textAnchor="middle">lower</text>

            <text x={W / 2} y={cy + circR + 12} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="middle">
              fill = |qubit⟩ fraction
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ============================================================
// SECTION 5: FREQUENCY RULER
// ============================================================

function FrequencyRuler() {
  const W = 800
  const H = 200
  const PAD = { left: 60, right: 20, top: 20, bottom: 40 }

  const fMin = 4.0
  const fMax = 8.0

  const xScale = (f: number) =>
    PAD.left + ((f - fMin) / (fMax - fMin)) * (W - PAD.left - PAD.right)

  const platforms = [
    { name: 'IBM Torino', data: HARDWARE_FREQS.torino, color: '#00d4ff', y: 50 },
    { name: 'IQM Garnet', data: HARDWARE_FREQS.garnet, color: '#8b5cf6', y: 90 },
    { name: 'Tuna-9', data: HARDWARE_FREQS.tuna9, color: '#ff8c42', y: 130 },
  ]

  // GHz ticks
  const ticks = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Axis */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      {ticks.map(f => (
        <g key={f}>
          <line x1={xScale(f)} y1={H - PAD.bottom - 3} x2={xScale(f)} y2={H - PAD.bottom + 3} stroke="#4b5563" strokeWidth={1} />
          <text x={xScale(f)} y={H - PAD.bottom + 18} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {f.toFixed(1)}
          </text>
          {/* Subtle grid line */}
          <line x1={xScale(f)} y1={PAD.top} x2={xScale(f)} y2={H - PAD.bottom} stroke="#1e293b" strokeWidth={0.5} />
        </g>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 5} fill="#9ca3af" fontSize="11" textAnchor="middle">
        Frequency (GHz)
      </text>

      {/* Platform rows */}
      {platforms.map(platform => (
        <g key={platform.name}>
          <text x={PAD.left - 8} y={platform.y + 4} fill={platform.color} fontSize="10" fontFamily="monospace" textAnchor="end" fontWeight="600">
            {platform.name}
          </text>
          {/* Horizontal guide */}
          <line x1={PAD.left} y1={platform.y} x2={W - PAD.right} y2={platform.y} stroke={platform.color} strokeWidth={0.3} opacity={0.3} />
          {/* Qubit dots */}
          {platform.data.map(qubit => (
            <g key={`${platform.name}-${qubit.q}`}>
              <circle
                cx={xScale(qubit.freq)}
                cy={platform.y}
                r={6}
                fill={platform.color}
                opacity={0.3}
                stroke={platform.color}
                strokeWidth={1.5}
              />
              <text
                x={xScale(qubit.freq)}
                y={platform.y + 3}
                fill="white"
                fontSize="6"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {qubit.q}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

// ============================================================
// SECTION 1b: CLASSICAL VS QUANTUM COMPARISON
// ============================================================

function ClassicalVsQuantumSVG() {
  const W = 800
  const H = 280
  const midX = W / 2

  // Shared layout
  const plotW = 320
  const plotH = 160
  const plotY = 60

  // Classical side (left)
  const cX0 = 40
  // Quantum side (right)
  const qX0 = midX + 40

  // Generate classical driven oscillator response: amplitude grows with time
  const classicalPoints = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const x = cX0 + t * plotW
      // Driven resonance: amplitude grows linearly (undamped) with envelope
      const envelope = t * 0.9
      const osc = Math.sin(t * 14 * Math.PI) * envelope
      const y = plotY + plotH / 2 - osc * plotH * 0.4
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  // Classical envelope
  const classicalEnvUpper = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 100; i++) {
      const t = i / 100
      const x = cX0 + t * plotW
      const env = t * 0.9
      const y = plotY + plotH / 2 - env * plotH * 0.4
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  const classicalEnvLower = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 100; i++) {
      const t = i / 100
      const x = cX0 + t * plotW
      const env = t * 0.9
      const y = plotY + plotH / 2 + env * plotH * 0.4
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  // Quantum Rabi oscillation: cycles between 0 and 1
  const quantumPoints = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const x = qX0 + t * plotW
      // P(|1⟩) = sin²(Ωt/2) — Rabi oscillation
      const p1 = Math.sin(t * 3 * Math.PI) ** 2
      const y = plotY + plotH - p1 * plotH * 0.85
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Divider */}
      <line x1={midX} y1={20} x2={midX} y2={H - 10} stroke="#1e293b" strokeWidth={1} />

      {/* === CLASSICAL (left) === */}
      <text x={cX0 + plotW / 2} y={30} fill="#ff8c42" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        Classical Resonance
      </text>
      <text x={cX0 + plotW / 2} y={46} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
        driven harmonic oscillator
      </text>

      {/* Plot area */}
      <line x1={cX0} y1={plotY + plotH} x2={cX0 + plotW} y2={plotY + plotH} stroke="#4b5563" strokeWidth={1} />
      <line x1={cX0} y1={plotY} x2={cX0} y2={plotY + plotH} stroke="#4b5563" strokeWidth={1} />

      {/* Zero line */}
      <line x1={cX0} y1={plotY + plotH / 2} x2={cX0 + plotW} y2={plotY + plotH / 2} stroke="#1e293b" strokeWidth={0.5} />

      {/* Envelope (dashed) */}
      <polyline points={classicalEnvUpper} fill="none" stroke="#ff8c42" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
      <polyline points={classicalEnvLower} fill="none" stroke="#ff8c42" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />

      {/* Oscillation */}
      <polyline points={classicalPoints} fill="none" stroke="#ff8c42" strokeWidth={1.5} />

      {/* Arrow showing growth */}
      <line x1={cX0 + plotW - 20} y1={plotY + 18} x2={cX0 + plotW - 5} y2={plotY + 8} stroke="#ff8c42" strokeWidth={1.5} />
      <polygon points={`${cX0 + plotW - 5},${plotY + 8} ${cX0 + plotW - 12},${plotY + 8} ${cX0 + plotW - 8},${plotY + 2}`} fill="#ff8c42" />
      <text x={cX0 + plotW - 40} y={plotY + 30} fill="#ff8c42" fontSize="9" fontFamily="monospace" textAnchor="end">
        grows forever
      </text>

      {/* Axis labels */}
      <text x={cX0 + plotW / 2} y={plotY + plotH + 18} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">Time</text>
      <text x={cX0 - 6} y={plotY + plotH / 2 + 3} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="end"
        transform={`rotate(-90, ${cX0 - 6}, ${plotY + plotH / 2})`}>
        Amplitude
      </text>

      {/* === QUANTUM (right) === */}
      <text x={qX0 + plotW / 2} y={30} fill="#00d4ff" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        Quantum Resonance
      </text>
      <text x={qX0 + plotW / 2} y={46} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
        two-level system (qubit)
      </text>

      {/* Plot area */}
      <line x1={qX0} y1={plotY + plotH} x2={qX0 + plotW} y2={plotY + plotH} stroke="#4b5563" strokeWidth={1} />
      <line x1={qX0} y1={plotY} x2={qX0} y2={plotY + plotH} stroke="#4b5563" strokeWidth={1} />

      {/* P=0 and P=1 reference lines */}
      <line x1={qX0} y1={plotY + plotH * 0.15} x2={qX0 + plotW} y2={plotY + plotH * 0.15} stroke="#1e293b" strokeWidth={0.5} />
      <text x={qX0 - 4} y={plotY + plotH + 3} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>
      <text x={qX0 - 4} y={plotY + plotH * 0.15 + 3} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="end">1</text>

      {/* Rabi oscillation */}
      <polyline points={quantumPoints} fill="none" stroke="#00d4ff" strokeWidth={1.5} />

      {/* Saturation annotation */}
      <line x1={qX0 + plotW + 5} y1={plotY + plotH * 0.15} x2={qX0 + plotW + 5} y2={plotY + plotH} stroke="#00ff88" strokeWidth={1} opacity={0.4} />
      <text x={qX0 + plotW - 30} y={plotY + 14} fill="#00ff88" fontSize="8" fontFamily="monospace" textAnchor="end">
        saturates at P=1
      </text>

      {/* Axis labels */}
      <text x={qX0 + plotW / 2} y={plotY + plotH + 18} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">Time</text>
      <text x={qX0 - 6} y={plotY + plotH / 2 + 3} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="end"
        transform={`rotate(-90, ${qX0 - 6}, ${plotY + plotH / 2})`}>
        P(|1⟩)
      </text>

      {/* Bottom: shared similarities */}
      <text x={midX} y={H - 20} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
        Both: frequency matching {'\u2022'} Lorentzian lineshape {'\u2022'} linewidth from damping/decoherence
      </text>
    </svg>
  )
}

// ============================================================
// SECTION 4b: RESONANCE IN QUANTUM COMPUTING
// ============================================================

function ComputationPipelineSVG() {
  const W = 800
  const H = 320

  const stages = [
    {
      x: 30, y: 50, w: 130, h: 80,
      title: 'Superposition',
      sub: '\u03C0/2 pulse at \u03C9\u2080',
      icon: 'gate',
      color: '#00d4ff',
      detail: '|0\u27E9 \u2192 (|0\u27E9+|1\u27E9)/\u221A2',
    },
    {
      x: 200, y: 50, w: 130, h: 80,
      title: 'Entanglement',
      sub: 'tune qubits into resonance',
      icon: 'link',
      color: '#8b5cf6',
      detail: 'iSWAP or CZ gate',
    },
    {
      x: 370, y: 50, w: 130, h: 80,
      title: 'Interference',
      sub: 'phase accumulation',
      icon: 'wave',
      color: '#00ff88',
      detail: 'amplitudes add/cancel',
    },
    {
      x: 540, y: 50, w: 130, h: 80,
      title: 'Measurement',
      sub: 'dispersive readout',
      icon: 'eye',
      color: '#ff8c42',
      detail: 'cavity probes qubit via \u03C7',
    },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* "Resonance underlies everything" bar */}
      <rect x={30} y={155} width={640} height={28} rx={6} fill="#ff6b9d" opacity={0.08} stroke="#ff6b9d" strokeWidth={1} />
      <text x={350} y={173} fill="#ff6b9d" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        Resonance underlies every step
      </text>

      {/* Connecting arrows */}
      {[0, 1, 2].map(i => {
        const x1 = stages[i].x + stages[i].w
        const x2 = stages[i + 1].x
        const cy = stages[i].y + stages[i].h / 2
        return (
          <g key={`arrow-${i}`}>
            <line x1={x1 + 4} y1={cy} x2={x2 - 4} y2={cy} stroke="#4b5563" strokeWidth={1.5} />
            <polygon
              points={`${x2 - 4},${cy} ${x2 - 10},${cy - 4} ${x2 - 10},${cy + 4}`}
              fill="#4b5563"
            />
          </g>
        )
      })}

      {/* Stage boxes */}
      {stages.map((s) => (
        <g key={s.title}>
          <rect
            x={s.x} y={s.y} width={s.w} height={s.h} rx={8}
            fill={s.color + '10'} stroke={s.color} strokeWidth={1.5}
          />
          <text x={s.x + s.w / 2} y={s.y + 24} fill={s.color} fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">
            {s.title}
          </text>
          <text x={s.x + s.w / 2} y={s.y + 42} fill="#9ca3af" fontSize="8" fontFamily="monospace" textAnchor="middle">
            {s.sub}
          </text>
          <text x={s.x + s.w / 2} y={s.y + 60} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
            {s.detail}
          </text>

          {/* Vertical connector to "resonance" bar */}
          <line
            x1={s.x + s.w / 2} y1={s.y + s.h}
            x2={s.x + s.w / 2} y2={155}
            stroke={s.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4}
          />
        </g>
      ))}

      {/* Bottom: detailed explanations */}
      <g>
        <text x={30} y={210} fill="white" fontSize="11" fontFamily="monospace" fontWeight="600">How resonance enables each step:</text>

        {/* Superposition */}
        <circle cx={46} cy={232} r={5} fill="#00d4ff" opacity={0.4} stroke="#00d4ff" strokeWidth={1} />
        <text x={58} y={236} fill="#9ca3af" fontSize="9" fontFamily="monospace">
          <tspan fill="#00d4ff" fontWeight="600">Superposition:</tspan> A {'\u03C0'}/2 pulse at the qubit&apos;s resonant frequency rotates |0⟩ to (|0⟩+|1⟩)/{'\u221A'}2.
        </text>

        {/* Entanglement */}
        <circle cx={46} cy={254} r={5} fill="#8b5cf6" opacity={0.4} stroke="#8b5cf6" strokeWidth={1} />
        <text x={58} y={258} fill="#9ca3af" fontSize="9" fontFamily="monospace">
          <tspan fill="#8b5cf6" fontWeight="600">Entanglement:</tspan> Tuning two qubits to the same frequency enables energy exchange (iSWAP/CZ gates).
        </text>

        {/* Interference */}
        <circle cx={46} cy={276} r={5} fill="#00ff88" opacity={0.4} stroke="#00ff88" strokeWidth={1} />
        <text x={58} y={280} fill="#9ca3af" fontSize="9" fontFamily="monospace">
          <tspan fill="#00ff88" fontWeight="600">Interference:</tspan> Gate sequences make wrong-answer amplitudes cancel and right-answer amplitudes add.
        </text>

        {/* Measurement */}
        <circle cx={46} cy={298} r={5} fill="#ff8c42" opacity={0.4} stroke="#ff8c42" strokeWidth={1} />
        <text x={58} y={302} fill="#9ca3af" fontSize="9" fontFamily="monospace">
          <tspan fill="#ff8c42" fontWeight="600">Measurement:</tspan> Dispersive readout probes the cavity at its resonant frequency; qubit state shifts it.
        </text>
      </g>
    </svg>
  )
}

function InterferenceVsEntanglementSVG() {
  const W = 800
  const H = 220

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Left: Interference */}
      <text x={200} y={24} fill="#00ff88" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        Interference
      </text>
      <text x={200} y={40} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
        amplitudes add as complex numbers
      </text>

      {/* Two paths merging */}
      <path d="M 60 70 Q 130 70, 200 110" fill="none" stroke="#00ff88" strokeWidth={2} opacity={0.7} />
      <path d="M 60 150 Q 130 150, 200 110" fill="none" stroke="#00ff88" strokeWidth={2} opacity={0.7} />

      {/* Labels on paths */}
      <text x={90} y={64} fill="#00ff88" fontSize="9" fontFamily="monospace">path A: +0.7</text>
      <text x={90} y={166} fill="#00ff88" fontSize="9" fontFamily="monospace">path B: -0.7</text>

      {/* Meeting point */}
      <circle cx={200} cy={110} r={6} fill="#00ff88" opacity={0.3} stroke="#00ff88" strokeWidth={1.5} />

      {/* Constructive */}
      <line x1={210} y1={100} x2={330} y2={70} stroke="#00ff88" strokeWidth={2} />
      <text x={340} y={64} fill="#00ff88" fontSize="9" fontFamily="monospace">+0.7 + 0.7 = 1.4</text>
      <text x={340} y={78} fill="#6b7280" fontSize="8" fontFamily="monospace">constructive (right answer)</text>

      {/* Destructive */}
      <line x1={210} y1={120} x2={330} y2={150} stroke="#4b5563" strokeWidth={2} strokeDasharray="4 3" />
      <text x={340} y={144} fill="#6b7280" fontSize="9" fontFamily="monospace">+0.7 - 0.7 = 0</text>
      <text x={340} y={158} fill="#4b5563" fontSize="8" fontFamily="monospace">destructive (wrong answer)</text>

      {/* Key insight */}
      <text x={200} y={195} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
        Algorithms arrange gates so paths to correct answers add up
      </text>

      {/* Divider */}
      <line x1={430} y1={20} x2={430} y2={H - 10} stroke="#1e293b" strokeWidth={1} />

      {/* Right: Entanglement */}
      <text x={615} y={24} fill="#8b5cf6" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        Entanglement
      </text>
      <text x={615} y={40} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
        correlated states that can&apos;t be separated
      </text>

      {/* Two qubits */}
      <circle cx={500} cy={80} r={18} fill="#8b5cf620" stroke="#8b5cf6" strokeWidth={1.5} />
      <text x={500} y={84} fill="#8b5cf6" fontSize="10" fontFamily="monospace" textAnchor="middle">q0</text>

      <circle cx={500} cy={140} r={18} fill="#8b5cf620" stroke="#8b5cf6" strokeWidth={1.5} />
      <text x={500} y={144} fill="#8b5cf6" fontSize="10" fontFamily="monospace" textAnchor="middle">q1</text>

      {/* Entangling link */}
      <line x1={500} y1={98} x2={500} y2={122} stroke="#8b5cf6" strokeWidth={2} />
      <text x={512} y={114} fill="#8b5cf6" fontSize="8" fontFamily="monospace">CZ</text>

      {/* Arrow to entangled state */}
      <line x1={520} y1={110} x2={570} y2={110} stroke="#4b5563" strokeWidth={1.5} />
      <polygon points="570,110 564,106 564,114" fill="#4b5563" />

      {/* Bell state */}
      <rect x={580} y={80} width={160} height={60} rx={8} fill="#8b5cf610" stroke="#8b5cf6" strokeWidth={1} />
      <text x={660} y={102} fill="white" fontSize="10" fontFamily="monospace" textAnchor="middle">
        (|00⟩ + |11⟩) / {'\u221A'}2
      </text>
      <text x={660} y={118} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="middle">
        measure q0 = 0 {'\u2192'} q1 must be 0
      </text>
      <text x={660} y={132} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="middle">
        measure q0 = 1 {'\u2192'} q1 must be 1
      </text>

      {/* How resonance creates it */}
      <text x={615} y={175} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
        Created by bringing qubits into/near resonance
      </text>
      <text x={615} y={195} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
        with each other or a shared cavity (avoided crossing)
      </text>
    </svg>
  )
}

// ============================================================
// SECTION 5b: MULTI-QUBIT RESONANCE
// ============================================================

function FrequencyCrowdingSVG({ spacing }: { spacing: number }) {
  const W = 700
  const H = 280
  const PAD = { top: 20, right: 30, bottom: 50, left: 50 }

  // 5 qubits at different frequencies
  const baseFreqs = [4.85, 5.00, 5.00 + spacing * 0.15, 5.00 + spacing * 0.30, 5.00 + spacing * 0.45]
  const freqMin = 4.6
  const freqMax = 5.8
  const t2Values = [15, 20, 18, 22, 16]
  const colors = ['#00d4ff', '#8b5cf6', '#00ff88', '#ff8c42', '#ff6b9d']
  const omega = 2.0

  const xScale = (f: number) =>
    PAD.left + ((f - freqMin) / (freqMax - freqMin)) * (W - PAD.left - PAD.right)
  const yScale = (p: number) =>
    PAD.top + ((1 - p) / 1) * (H - PAD.top - PAD.bottom)

  // Check for collisions (peaks within 2x FWHM)
  const hasCollision = baseFreqs.some((f1, i) =>
    baseFreqs.some((f2, j) => {
      if (i >= j) return false
      const fwhm1 = fwhmMHz(t2Values[i]) / 1000 // GHz
      const fwhm2 = fwhmMHz(t2Values[j]) / 1000
      return Math.abs(f1 - f2) < (fwhm1 + fwhm2) * 2
    })
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(y => (
        <line key={`g-${y}`} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)} stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Qubit peaks */}
      {baseFreqs.map((f0, qi) => {
        const t2 = t2Values[qi]
        const pts: string[] = []
        for (let i = 0; i <= 400; i++) {
          const f = freqMin + (i / 400) * (freqMax - freqMin)
          const delta = (f - f0) * 1000
          const gamma = 1 / (Math.PI * t2)
          const p = (omega * omega) / (omega * omega + delta * delta + gamma * gamma)
          pts.push(`${xScale(f).toFixed(1)},${yScale(p).toFixed(1)}`)
        }
        return (
          <g key={qi}>
            <polyline points={pts.join(' ')} fill="none" stroke={colors[qi]} strokeWidth={1.5} opacity={0.7} />
            <text
              x={xScale(f0)}
              y={yScale(1) - 6}
              fill={colors[qi]}
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
            >
              q{qi}: {f0.toFixed(2)} GHz
            </text>
          </g>
        )
      })}

      {/* Collision warning zones */}
      {baseFreqs.map((f1, i) =>
        baseFreqs.map((f2, j) => {
          if (i >= j) return null
          const fwhm1 = fwhmMHz(t2Values[i]) / 1000
          const fwhm2 = fwhmMHz(t2Values[j]) / 1000
          const overlap = Math.abs(f1 - f2) < (fwhm1 + fwhm2) * 3
          if (!overlap) return null
          const midF = (f1 + f2) / 2
          return (
            <g key={`col-${i}-${j}`}>
              <rect
                x={xScale(Math.min(f1, f2) - fwhm1)}
                y={PAD.top}
                width={xScale(Math.max(f1, f2) + fwhm2) - xScale(Math.min(f1, f2) - fwhm1)}
                height={H - PAD.top - PAD.bottom}
                fill="#ef4444"
                opacity={0.06}
              />
              <text x={xScale(midF)} y={H - PAD.bottom - 8} fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity={0.8}>
                crosstalk zone
              </text>
            </g>
          )
        })
      )}

      {/* Status indicator */}
      <rect x={W - PAD.right - 130} y={PAD.top + 4} width={120} height={22} rx={4}
        fill={hasCollision ? '#ef444420' : '#00ff8820'}
        stroke={hasCollision ? '#ef4444' : '#00ff88'} strokeWidth={1}
      />
      <text x={W - PAD.right - 70} y={PAD.top + 19} fill={hasCollision ? '#ef4444' : '#00ff88'}
        fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="600">
        {hasCollision ? 'spectral collision!' : 'well separated'}
      </text>

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {[4.6, 4.8, 5.0, 5.2, 5.4, 5.6, 5.8].map(f => (
        <text key={`xl-${f}`} x={xScale(f)} y={H - PAD.bottom + 18} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
          {f.toFixed(1)}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} fill="#9ca3af" fontSize="10" textAnchor="middle">
        Frequency (GHz)
      </text>

      {/* Y labels */}
      {[0, 0.5, 1.0].map(y => (
        <text key={`yl-${y}`} x={PAD.left - 8} y={yScale(y) + 3} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="end">
          {y.toFixed(1)}
        </text>
      ))}
    </svg>
  )
}

function ConditionalFrequencyShiftSVG() {
  const W = 700
  const H = 200
  const PAD = { left: 50, right: 30, top: 30, bottom: 40 }

  const freqMin = 4.95
  const freqMax = 5.05
  const xScale = (f: number) =>
    PAD.left + ((f - freqMin) / (freqMax - freqMin)) * (W - PAD.left - PAD.right)
  const yScale = (p: number) =>
    PAD.top + ((1 - p) / 1) * (H - PAD.top - PAD.bottom)

  // Cavity resonance shifts depending on qubit state
  const f_cavity = 5.00 // GHz
  const chi = 0.005 // dispersive shift in GHz (5 MHz)
  const t2_cav = 50

  const makePeak = (f0: number) => {
    const pts: string[] = []
    for (let i = 0; i <= 400; i++) {
      const f = freqMin + (i / 400) * (freqMax - freqMin)
      const delta = (f - f0) * 1000
      const gamma = 1 / (Math.PI * t2_cav)
      const p = (3 * 3) / (3 * 3 + delta * delta + gamma * gamma)
      pts.push(`${xScale(f).toFixed(1)},${yScale(p).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid */}
      {[0, 0.5, 1.0].map(y => (
        <line key={`g-${y}`} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)} stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Cavity peak when qubit = |0⟩ */}
      <polyline points={makePeak(f_cavity + chi)} fill="none" stroke="#00d4ff" strokeWidth={2} />
      <text x={xScale(f_cavity + chi)} y={yScale(1) - 8} fill="#00d4ff" fontSize="10" fontFamily="monospace" textAnchor="middle">
        qubit in |0⟩
      </text>

      {/* Cavity peak when qubit = |1⟩ */}
      <polyline points={makePeak(f_cavity - chi)} fill="none" stroke="#ff6b9d" strokeWidth={2} />
      <text x={xScale(f_cavity - chi)} y={yScale(0.85) - 8} fill="#ff6b9d" fontSize="10" fontFamily="monospace" textAnchor="middle">
        qubit in |1⟩
      </text>

      {/* Shift annotation */}
      <line x1={xScale(f_cavity - chi)} y1={yScale(0.5)} x2={xScale(f_cavity + chi)} y2={yScale(0.5)} stroke="#ff8c42" strokeWidth={1.5} />
      <line x1={xScale(f_cavity - chi)} y1={yScale(0.5) - 4} x2={xScale(f_cavity - chi)} y2={yScale(0.5) + 4} stroke="#ff8c42" strokeWidth={1.5} />
      <line x1={xScale(f_cavity + chi)} y1={yScale(0.5) - 4} x2={xScale(f_cavity + chi)} y2={yScale(0.5) + 4} stroke="#ff8c42" strokeWidth={1.5} />
      <text x={xScale(f_cavity)} y={yScale(0.5) - 8} fill="#ff8c42" fontSize="9" fontFamily="monospace" textAnchor="middle">
        2{'\u03C7'} = {(chi * 2 * 1000).toFixed(0)} MHz
      </text>

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      {[4.96, 4.98, 5.00, 5.02, 5.04].map(f => (
        <text key={f} x={xScale(f)} y={H - PAD.bottom + 16} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
          {f.toFixed(2)}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} fill="#9ca3af" fontSize="10" textAnchor="middle">
        Readout cavity frequency (GHz)
      </text>
    </svg>
  )
}

function TopologyResonanceSVG() {
  const W = 800
  const H = 280

  // Tuna-9 topology with real Bell fidelity data
  const qubits = [
    { id: 0, x: 80, y: 60, fid_note: '12.3% err' },
    { id: 1, x: 180, y: 60, fid_note: '' },
    { id: 2, x: 280, y: 60, fid_note: '1.6% err' },
    { id: 3, x: 180, y: 140, fid_note: '' },
    { id: 4, x: 280, y: 140, fid_note: '1.9% err' },
    { id: 5, x: 380, y: 60, fid_note: '1.6% err' },
    { id: 6, x: 380, y: 140, fid_note: '' },
    { id: 7, x: 480, y: 220, fid_note: '' },
    { id: 8, x: 380, y: 220, fid_note: '' },
  ]

  const edges = [
    { from: 0, to: 1, bell: 87.0, color: '#ef4444' },
    { from: 0, to: 2, bell: 85.8, color: '#ef4444' },
    { from: 1, to: 3, bell: 91.3, color: '#ff8c42' },
    { from: 1, to: 4, bell: 89.8, color: '#ff8c42' },
    { from: 2, to: 4, bell: 92.3, color: '#ff8c42' },
    { from: 2, to: 5, bell: 91.4, color: '#ff8c42' },
    { from: 3, to: 6, bell: 87.1, color: '#ef4444' },
    { from: 4, to: 6, bell: 93.5, color: '#00ff88' },
    { from: 6, to: 8, bell: 91.3, color: '#ff8c42' },
    { from: 7, to: 8, bell: 88.3, color: '#ef4444' },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Title */}
      <text x={280} y={20} fill="white" fontSize="12" fontFamily="monospace" fontWeight="600">
        Tuna-9 Topology (measured Bell fidelity)
      </text>

      {/* Edges with fidelity */}
      {edges.map(e => {
        const q1 = qubits[e.from]
        const q2 = qubits[e.to]
        const mx = (q1.x + q2.x) / 2
        const my = (q1.y + q2.y) / 2
        return (
          <g key={`${e.from}-${e.to}`}>
            <line x1={q1.x} y1={q1.y} x2={q2.x} y2={q2.y}
              stroke={e.color} strokeWidth={2} opacity={0.6} />
            <rect x={mx - 18} y={my - 8} width={36} height={14} rx={3}
              fill="#111827" stroke={e.color} strokeWidth={0.5} />
            <text x={mx} y={my + 3} fill={e.color} fontSize="8" fontFamily="monospace" textAnchor="middle">
              {e.bell.toFixed(1)}%
            </text>
          </g>
        )
      })}

      {/* Qubit nodes */}
      {qubits.map(q => (
        <g key={q.id}>
          <circle cx={q.x} cy={q.y} r={16}
            fill="#00d4ff10" stroke="#00d4ff" strokeWidth={1.5} />
          <text x={q.x} y={q.y + 4} fill="#00d4ff" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="600">
            q{q.id}
          </text>
        </g>
      ))}

      {/* Legend */}
      <g transform="translate(550, 50)">
        <text x={0} y={0} fill="#9ca3af" fontSize="10" fontFamily="monospace" fontWeight="600">Bell Fidelity</text>
        {[
          { color: '#00ff88', label: '> 93%  (best pair)' },
          { color: '#ff8c42', label: '89-93% (good)' },
          { color: '#ef4444', label: '< 89%  (weak)' },
        ].map((l, i) => (
          <g key={i}>
            <line x1={0} y1={20 + i * 18} x2={20} y2={20 + i * 18} stroke={l.color} strokeWidth={2} />
            <text x={28} y={24 + i * 18} fill="#6b7280" fontSize="9" fontFamily="monospace">{l.label}</text>
          </g>
        ))}

        <text x={0} y={90} fill="#9ca3af" fontSize="10" fontFamily="monospace" fontWeight="600">Routing Example</text>
        <text x={0} y={108} fill="#00ff88" fontSize="9" fontFamily="monospace">GHZ q[2,4,6]: 88.9%</text>
        <text x={0} y={122} fill="#ef4444" fontSize="9" fontFamily="monospace">GHZ q[0,1,2]: 83.1%</text>
        <text x={0} y={140} fill="#6b7280" fontSize="8" fontFamily="monospace">Best path avoids weak links</text>

        <text x={0} y={168} fill="#9ca3af" fontSize="10" fontFamily="monospace" fontWeight="600">Why fidelity varies</text>
        <text x={0} y={186} fill="#6b7280" fontSize="8" fontFamily="monospace">Different frequency separations</text>
        <text x={0} y={200} fill="#6b7280" fontSize="8" fontFamily="monospace">between coupled qubits mean</text>
        <text x={0} y={214} fill="#6b7280" fontSize="8" fontFamily="monospace">different two-qubit gate quality</text>
      </g>
    </svg>
  )
}

// ============================================================
// SONIFICATION ENGINE
// ============================================================

/** Scale GHz to audible Hz: 4.5 GHz → 220 Hz, 7.0 GHz → 880 Hz */
function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

/** Scale MHz detuning to audible Hz offset */
function mhzToHz(mhz: number): number {
  return mhz * 2 // 50 MHz → 100 Hz
}

function PlayButton({
  onClick,
  playing,
  label,
  accent = '#00d4ff',
}: {
  onClick: () => void
  playing: boolean
  label?: string
  accent?: string
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-all hover:brightness-125"
      style={{
        borderColor: accent + '40',
        backgroundColor: playing ? accent + '20' : accent + '08',
        color: accent,
      }}
    >
      <span className="text-sm">{playing ? '\u25A0' : '\u25B6'}</span>
      {label || (playing ? 'Stop' : 'Listen')}
    </button>
  )
}

// ============================================================
// PAGE
// ============================================================

export default function ResonancePage() {
  const [driveOmega, setDriveOmega] = useState(2.0)
  const [t2, setT2] = useState(20)
  const [coupling, setCoupling] = useState(80)
  const [freqSpacing, setFreqSpacing] = useState(3)
  const [hoverFreq, setHoverFreq] = useState<number | null>(null)
  const [hoverDelta, setHoverDelta] = useState<number | null>(null)
  const [playingSection, setPlayingSection] = useState<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const activeNodesRef = useRef<OscillatorNode[]>([])
  const activeGainsRef = useRef<GainNode[]>([])
  const masterGainRef = useRef<GainNode | null>(null)
  const sweepTimerRef = useRef<number | null>(null)

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      masterGainRef.current = audioCtxRef.current.createGain()
      masterGainRef.current.gain.value = 0.4
      masterGainRef.current.connect(audioCtxRef.current.destination)
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const stopAll = useCallback(() => {
    if (sweepTimerRef.current !== null) {
      clearTimeout(sweepTimerRef.current)
      sweepTimerRef.current = null
    }
    for (const node of activeNodesRef.current) {
      try { node.stop() } catch { /* already stopped */ }
    }
    activeNodesRef.current = []
    activeGainsRef.current = []
    setPlayingSection(null)
  }, [])

  useEffect(() => {
    return () => {
      stopAll()
      audioCtxRef.current?.close()
    }
  }, [stopAll])

  // --- Spectroscopy: sweep frequency across the Lorentzian, amplitude = response ---
  const playSpectroscopy = useCallback(() => {
    if (playingSection === 'spectroscopy') { stopAll(); return }
    stopAll()
    const ctx = getAudioCtx()
    setPlayingSection('spectroscopy')
    const now = ctx.currentTime
    const duration = 3

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'

    // Sweep frequency from -40 MHz to +40 MHz detuning
    // Map to audible: center = 440 Hz, sweep +-80 Hz
    const centerHz = 440
    const sweepHz = 80
    osc.frequency.setValueAtTime(centerHz - sweepHz, now)
    osc.frequency.linearRampToValueAtTime(centerHz + sweepHz, now + duration)

    // Amplitude follows Lorentzian response
    const steps = 60
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration
      const detuningMHz = -40 + (i / steps) * 80
      const response = lorentzian(F0 + detuningMHz / 1000, driveOmega, t2)
      gain.gain.linearRampToValueAtTime(response * 0.5, now + t)
    }

    osc.connect(gain).connect(masterGainRef.current!)
    osc.start(now)
    osc.stop(now + duration + 0.05)
    activeNodesRef.current.push(osc)
    activeGainsRef.current.push(gain)

    setTimeout(() => setPlayingSection(null), duration * 1000 + 100)
  }, [playingSection, driveOmega, t2, stopAll, getAudioCtx])

  // --- Linewidth: 3 tones with different Q (sharp vs diffuse envelope) ---
  const playLinewidth = useCallback(() => {
    if (playingSection === 'linewidth') { stopAll(); return }
    stopAll()
    const ctx = getAudioCtx()
    setPlayingSection('linewidth')
    const now = ctx.currentTime

    const configs = [
      { t2val: 5, freq: 330, color: '#ff6b9d' },   // A4 - broad
      { t2val: 20, freq: 440, color: '#00d4ff' },   // A4 - medium
      { t2val: 100, freq: 550, color: '#00ff88' },   // C#5 - sharp
    ]

    const duration = 2.5
    for (const cfg of configs) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = cfg.freq

      // Q factor shapes the envelope: high Q = long ring, low Q = quick decay
      const decayTime = cfg.t2val / 50 // 5us → 0.1s, 100us → 2s
      const amp = 0.25
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(amp, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(decayTime * 2, duration))

      osc.connect(gain).connect(masterGainRef.current!)
      osc.start(now)
      osc.stop(now + duration + 0.05)
      activeNodesRef.current.push(osc)
      activeGainsRef.current.push(gain)
    }

    setTimeout(() => setPlayingSection(null), duration * 1000 + 100)
  }, [playingSection, stopAll, getAudioCtx])

  // --- Avoided crossing: two tones whose gap = 2g coupling ---
  const playAvoidedCrossing = useCallback(() => {
    if (playingSection === 'crossing') { stopAll(); return }
    stopAll()
    const ctx = getAudioCtx()
    setPlayingSection('crossing')
    const now = ctx.currentTime
    const duration = 3

    // Sweep detuning from -200 to +200, play both dressed state frequencies
    const centerHz = 440
    const steps = 100

    // Upper dressed state
    const oscUp = ctx.createOscillator()
    const gainUp = ctx.createGain()
    oscUp.type = 'sine'
    gainUp.gain.setValueAtTime(0, now)
    gainUp.gain.linearRampToValueAtTime(0.25, now + 0.05)
    gainUp.gain.setValueAtTime(0.25, now + duration - 0.3)
    gainUp.gain.linearRampToValueAtTime(0, now + duration)

    // Lower dressed state
    const oscLow = ctx.createOscillator()
    const gainLow = ctx.createGain()
    oscLow.type = 'sine'
    gainLow.gain.setValueAtTime(0, now)
    gainLow.gain.linearRampToValueAtTime(0.25, now + 0.05)
    gainLow.gain.setValueAtTime(0.25, now + duration - 0.3)
    gainLow.gain.linearRampToValueAtTime(0, now + duration)

    // Sweep: at each time step, set frequencies based on avoided crossing
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration
      const delta = -200 + (i / steps) * 400
      const [eUp, eLow] = avoidedCrossing(delta, coupling)
      // Map energy to frequency: 0 MHz → 440 Hz, scale by 0.5
      oscUp.frequency.linearRampToValueAtTime(centerHz + eUp * 0.5, now + t)
      oscLow.frequency.linearRampToValueAtTime(centerHz + eLow * 0.5, now + t)
    }

    // Stereo: upper left, lower right
    const panUp = ctx.createStereoPanner()
    const panLow = ctx.createStereoPanner()
    panUp.pan.value = -0.5
    panLow.pan.value = 0.5

    oscUp.connect(gainUp).connect(panUp).connect(masterGainRef.current!)
    oscLow.connect(gainLow).connect(panLow).connect(masterGainRef.current!)

    oscUp.start(now)
    oscLow.start(now)
    oscUp.stop(now + duration + 0.05)
    oscLow.stop(now + duration + 0.05)

    activeNodesRef.current.push(oscUp, oscLow)
    activeGainsRef.current.push(gainUp, gainLow)

    setTimeout(() => setPlayingSection(null), duration * 1000 + 100)
  }, [playingSection, coupling, stopAll, getAudioCtx])

  // --- Frequency crowding: 5 qubit tones, closer spacing = dissonance ---
  const playCrowding = useCallback(() => {
    if (playingSection === 'crowding') { stopAll(); return }
    stopAll()
    const ctx = getAudioCtx()
    setPlayingSection('crowding')
    const now = ctx.currentTime
    const duration = 2.5

    const baseFreqs = [4.85, 5.00, 5.00 + freqSpacing * 0.15, 5.00 + freqSpacing * 0.30, 5.00 + freqSpacing * 0.45]
    const colors_audio = ['#00d4ff', '#8b5cf6', '#00ff88', '#ff8c42', '#ff6b9d']

    for (let qi = 0; qi < baseFreqs.length; qi++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = ghzToHz(baseFreqs[qi])

      const amp = 0.15
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(amp, now + 0.05)
      gain.gain.setValueAtTime(amp, now + duration - 0.3)
      gain.gain.linearRampToValueAtTime(0, now + duration)

      // Spread across stereo field
      const pan = ctx.createStereoPanner()
      pan.pan.value = -0.8 + (qi / 4) * 1.6

      osc.connect(gain).connect(pan).connect(masterGainRef.current!)
      osc.start(now)
      osc.stop(now + duration + 0.05)
      activeNodesRef.current.push(osc)
      activeGainsRef.current.push(gain)
    }

    setTimeout(() => setPlayingSection(null), duration * 1000 + 100)
  }, [playingSection, freqSpacing, stopAll, getAudioCtx])

  // --- Hardware frequencies: play actual qubit frequencies as tones ---
  const playHardwareFreqs = useCallback((platform: 'tuna9' | 'garnet' | 'torino') => {
    if (playingSection === `hw-${platform}`) { stopAll(); return }
    stopAll()
    const ctx = getAudioCtx()
    setPlayingSection(`hw-${platform}`)
    const now = ctx.currentTime
    const duration = 2

    const data = HARDWARE_FREQS[platform]
    for (let i = 0; i < data.length; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = ghzToHz(data[i].freq)

      const amp = 0.12
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(amp, now + 0.05)
      gain.gain.setValueAtTime(amp, now + duration - 0.3)
      gain.gain.linearRampToValueAtTime(0, now + duration)

      // Spread across stereo
      const pan = ctx.createStereoPanner()
      pan.pan.value = data.length > 1 ? -0.8 + (i / (data.length - 1)) * 1.6 : 0

      osc.connect(gain).connect(pan).connect(masterGainRef.current!)
      osc.start(now)
      osc.stop(now + duration + 0.05)
      activeNodesRef.current.push(osc)
      activeGainsRef.current.push(gain)
    }

    setTimeout(() => setPlayingSection(null), duration * 1000 + 100)
  }, [playingSection, stopAll, getAudioCtx])

  const currentFwhm = fwhmMHz(t2)
  const currentQ = qFactor(F0, t2)
  const peakHeight = lorentzian(F0, driveOmega, t2)

  return (
    <div className="min-h-screen bg-quantum-bg text-white">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-gray-400 hover:text-quantum-accent transition-colors mb-4 inline-block">
            &larr; back
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Resonance</span> Explorer
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Resonance is how you talk to a qubit. Drive at the right frequency and energy transfers;
            miss it and nothing happens. This page explores the frequency-domain physics that underpins{' '}
            <Link href="/rabi" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              Rabi oscillations
            </Link>
            , qubit readout, and selective addressing on real hardware.
          </p>
        </div>

        {/* ======================================= */}
        {/* SECTION 1: What is Resonance?           */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">What is Resonance?</h2>
          <p className="text-sm text-gray-500 mb-6">
            A qubit has two energy levels separated by a gap {'\u0394'}E = h{'\u03C9'}{'\u2080'}.
            Send in a microwave pulse at exactly {'\u03C9'}{'\u2080'} and the qubit absorbs energy,
            transitioning from |0⟩ to |1⟩. Detune the drive and the response drops off as a Lorentzian peak.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <EnergyLevelDiagram />
          </div>

          <MetaphorCallout>
            <span className="text-quantum-accent font-semibold">Pushing a swing.</span>{' '}
            Push at the swing&apos;s natural frequency and energy builds with every cycle.
            Push at the wrong time and you fight the swing&apos;s motion &mdash; nothing accumulates.
            A qubit works the same way: the microwave pulse is your push, and the qubit&apos;s
            transition frequency is the swing&apos;s natural rhythm.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 1b: Classical vs Quantum        */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Classical vs Quantum Resonance</h2>
          <p className="text-sm text-gray-500 mb-6">
            The swing metaphor captures the core idea &mdash; frequency matching &mdash; but hides
            critical differences. A classical oscillator absorbs energy continuously and its amplitude
            grows without bound. A qubit has only two levels: it absorbs one photon, flips to |1⟩,
            then re-emits and flips back. This Rabi cycling is fundamentally quantum.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <ClassicalVsQuantumSVG />
          </div>

          {/* Comparison table */}
          <div className="mt-4 bg-quantum-card rounded-lg border border-quantum-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-quantum-border">
                  <th className="text-left px-4 py-3 text-gray-500 font-mono text-xs uppercase tracking-wider w-1/3">Property</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#ff8c42' }}>Classical</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-quantum-accent">Quantum</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {[
                  {
                    property: 'Energy levels',
                    classical: 'Continuous \u2014 any amplitude allowed',
                    quantum: 'Discrete \u2014 only |0\u27E9 and |1\u27E9 (for a qubit)',
                  },
                  {
                    property: 'On-resonance response',
                    classical: 'Amplitude grows without bound (until nonlinear)',
                    quantum: 'Rabi oscillation: cycles between |0\u27E9 and |1\u27E9',
                  },
                  {
                    property: 'Energy absorption',
                    classical: 'Continuous \u2014 proportional to drive time',
                    quantum: 'Quantized \u2014 absorbs exactly one photon h\u03C9\u2080',
                  },
                  {
                    property: 'Steady state',
                    classical: 'Fixed amplitude set by drive and damping',
                    quantum: 'No steady state \u2014 coherent cycling (or decays to mixed state)',
                  },
                  {
                    property: 'Measurement',
                    classical: 'Non-invasive \u2014 read amplitude anytime',
                    quantum: 'Destructive \u2014 collapses to |0\u27E9 or |1\u27E9',
                  },
                  {
                    property: 'Frequency matching',
                    classical: '\u2713 Maximum energy transfer at \u03C9\u2080',
                    quantum: '\u2713 Maximum transition probability at \u03C9\u2080',
                  },
                  {
                    property: 'Linewidth',
                    classical: '\u2713 Set by damping \u03B3',
                    quantum: '\u2713 Set by decoherence 1/(\u03C0T\u2082)',
                  },
                  {
                    property: 'Detuning response',
                    classical: '\u2713 Lorentzian falloff',
                    quantum: '\u2713 Lorentzian falloff (same shape!)',
                  },
                ].map((row, i) => (
                  <tr key={i} className={i < 5 ? 'border-b border-quantum-border/50' : i === 4 ? 'border-b-2 border-quantum-border' : 'border-b border-quantum-border/50'}>
                    <td className="px-4 py-2.5 text-gray-400">{row.property}</td>
                    <td className="px-4 py-2.5 text-gray-300">{row.classical}</td>
                    <td className="px-4 py-2.5 text-gray-300">{row.quantum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <MetaphorCallout accent="#ff8c42">
            <span style={{ color: '#ff8c42' }} className="font-semibold">Same song, different instrument.</span>{' '}
            Classical and quantum resonance share the same frequency-matching principle and even the same
            Lorentzian lineshape. The difference is what happens <em>after</em> you match: a classical
            system keeps absorbing energy, while a qubit saturates and oscillates. This saturation is
            what makes a qubit a qubit &mdash; it has exactly two levels and can&apos;t be driven past |1⟩.
            See{' '}
            <Link href="/rabi" className="text-quantum-accent hover:underline">Rabi oscillations</Link>{' '}
            for the time-domain view of this cycling.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 2: Spectroscopy                 */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Spectroscopy: Finding the Qubit</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sweep the drive frequency and measure P(|1⟩) at each point. The peak reveals the qubit
            frequency. Adjust the drive amplitude ({'\u03A9'}) and coherence time (T{'\u2082'}) to see
            how they shape the spectral line. Hover the plot for exact values.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <SpectroscopyPlot omega={driveOmega} t2={t2} hoverFreq={hoverFreq} onHover={setHoverFreq} />
          </div>

          {/* Sliders */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="text-sm font-mono text-gray-400 whitespace-nowrap">
                    {'\u03A9'} = <span className="text-white font-semibold">{driveOmega.toFixed(1)}</span> MHz
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={driveOmega}
                    onChange={(e) => setDriveOmega(parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #00d4ff ${((driveOmega - 0.1) / 4.9) * 100}%, #1e293b ${((driveOmega - 0.1) / 4.9) * 100}%)`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 font-mono">Drive amplitude: stronger drive {'\u2192'} taller peak</p>
              </div>

              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="text-sm font-mono text-gray-400 whitespace-nowrap">
                    T{'\u2082'} = <span className="text-white font-semibold">{t2}</span> {'\u03BC'}s
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={t2}
                    onChange={(e) => setT2(parseInt(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 ${((t2 - 1) / 99) * 100}%, #1e293b ${((t2 - 1) / 99) * 100}%)`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 font-mono">Coherence time: longer T{'\u2082'} {'\u2192'} narrower peak</p>
              </div>
            </div>

            {/* Stats row + listen button */}
            <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-mono text-gray-400 border-t border-quantum-border pt-4">
              <span>FWHM: <span className="text-quantum-orange">{currentFwhm >= 1 ? currentFwhm.toFixed(2) + ' MHz' : (currentFwhm * 1000).toFixed(1) + ' kHz'}</span></span>
              <span>Q factor: <span className="text-quantum-purple">{currentQ >= 1e6 ? (currentQ / 1e6).toFixed(1) + 'M' : currentQ >= 1e3 ? (currentQ / 1e3).toFixed(0) + 'K' : currentQ.toFixed(0)}</span></span>
              <span>Peak P(|1⟩): <span className="text-quantum-accent">{peakHeight.toFixed(4)}</span></span>
              <div className="ml-auto">
                <PlayButton
                  onClick={playSpectroscopy}
                  playing={playingSection === 'spectroscopy'}
                  label={playingSection === 'spectroscopy' ? 'Stop' : 'Hear the sweep'}
                  accent="#8b5cf6"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-mono mt-2">
              Sound sweeps through the Lorentzian: loud at resonance, quiet off-resonance.
            </p>
          </div>

          <MetaphorCallout accent="#8b5cf6">
            <span style={{ color: '#8b5cf6' }} className="font-semibold">Tuning a radio dial.</span>{' '}
            Spectroscopy is how experimentalists find their qubits. Sweep through frequencies, listen
            for the signal. The peak frequency tells you where the qubit lives; the width tells you how
            long it stays coherent. A sharp peak means a clean qubit &mdash; a broad peak means it&apos;s
            losing energy fast.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 3: Linewidth and Coherence      */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Linewidth and Coherence</h2>
          <p className="text-sm text-gray-500 mb-6">
            Three qubits with T{'\u2082'} = 5, 20, and 100 {'\u03BC'}s, all at the same frequency.
            Longer coherence means a narrower spectral line and higher Q factor.
            The current drive amplitude ({'\u03A9'} = {driveOmega.toFixed(1)} MHz) is shared with the spectroscopy plot above.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <LinewidthComparison omega={driveOmega} />
            <QFactorBars />
            <div className="mt-4 pt-3 border-t border-quantum-border/50 flex items-center gap-3">
              <PlayButton
                onClick={playLinewidth}
                playing={playingSection === 'linewidth'}
                label={playingSection === 'linewidth' ? 'Stop' : 'Hear the Q factors'}
                accent="#00ff88"
              />
              <span className="text-[10px] text-gray-600 font-mono">
                Low Q (T{'\u2082'}=5{'\u03BC'}s) decays fast. High Q (T{'\u2082'}=100{'\u03BC'}s) rings long.
              </span>
            </div>
          </div>

          <MetaphorCallout accent="#00ff88">
            <span style={{ color: '#00ff88' }} className="font-semibold">A bell&apos;s ring.</span>{' '}
            A well-made bell rings for minutes &mdash; its frequency peak is razor-sharp (high Q factor).
            A cracked bell goes &ldquo;thunk&rdquo; &mdash; broad peak, low Q, the energy dissipates instantly.
            T{'\u2082'} is your qubit&apos;s ring time. This isn&apos;t just about computation time &mdash;
            it determines how precisely you can address a qubit. Long T{'\u2082'} means sharp frequency selectivity.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 4: Avoided Crossing             */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Avoided Crossing</h2>
          <p className="text-sm text-gray-500 mb-6">
            When a qubit couples to a cavity (or another qubit), their energy levels can&apos;t simply cross.
            Instead they repel, creating an avoided crossing (anticrossing). The gap at {'\u0394'} = 0
            equals twice the coupling strength. Hover to see how the state character changes from pure
            qubit/cavity to maximally mixed dressed states.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <AvoidedCrossingPlot coupling={coupling} hoverDelta={hoverDelta} onHover={setHoverDelta} />
          </div>

          {/* Coupling slider */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <div className="flex items-center gap-4 mb-2">
              <label className="text-sm font-mono text-gray-400 whitespace-nowrap">
                g = <span className="text-white font-semibold">{coupling}</span> MHz
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={1}
                value={coupling}
                onChange={(e) => setCoupling(parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ff8c42 ${((coupling - 10) / 190) * 100}%, #1e293b ${((coupling - 10) / 190) * 100}%)`,
                }}
              />
            </div>
            <p className="text-[10px] text-gray-600 font-mono">Coupling strength: larger g {'\u2192'} bigger gap between dressed states</p>

            <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-mono text-gray-400 border-t border-quantum-border pt-4">
              <span>Gap at {'\u0394'}=0: <span className="text-quantum-orange">{coupling} MHz</span> (2g = {2 * coupling} MHz)</span>
              <span>Dispersive shift (at {'\u0394'}=1 GHz): <span className="text-quantum-accent">{((coupling * coupling) / 1000).toFixed(1)} MHz</span> (g{'\u00B2'}/{'\u0394'})</span>
              <div className="ml-auto">
                <PlayButton
                  onClick={playAvoidedCrossing}
                  playing={playingSection === 'crossing'}
                  label={playingSection === 'crossing' ? 'Stop' : 'Hear the gap'}
                  accent="#ff8c42"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-mono mt-2">
              Two tones (L/R stereo) sweep through the avoided crossing. At {'\u0394'}=0 the gap is widest.
            </p>
          </div>

          <MetaphorCallout accent="#ff8c42">
            <span style={{ color: '#ff8c42' }} className="font-semibold">Magnets that repel.</span>{' '}
            Two coupled quantum systems behave like magnets approaching each other &mdash; their energies
            push apart rather than crossing. The gap reveals the coupling strength. This anticrossing
            is the basis for dispersive readout: when the detuning is large ({'\u0394'} {'\u226B'} g),
            the qubit state shifts the cavity frequency by {'\u00B1'}g{'\u00B2'}/{'\u0394'} &mdash;
            different enough to distinguish |0⟩ from |1⟩ without destroying the qubit.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 5: Resonance in Computing       */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Resonance in Quantum Computing</h2>
          <p className="text-sm text-gray-500 mb-6">
            Resonance isn&apos;t just a calibration detail &mdash; it&apos;s the mechanism behind every
            operation in a quantum computer. Every gate, every entangling interaction, and every
            measurement depends on resonance. Here&apos;s how the pieces fit together.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <ComputationPipelineSVG />
          </div>

          <h3 className="text-sm font-semibold text-gray-400 mt-6 mb-3">Interference and Entanglement</h3>
          <p className="text-sm text-gray-500 mb-4">
            These two phenomena are the computational engine of a quantum computer.
            Entanglement creates correlations that no classical system can replicate.
            Interference amplifies correct answers and suppresses wrong ones.
            Both are enabled by resonant interactions.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <InterferenceVsEntanglementSVG />
          </div>

          {/* The connection */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <h3 className="text-sm font-semibold text-white mb-3">How they work together</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="text-quantum-accent font-mono text-xs mt-0.5 shrink-0">1.</span>
                <p>
                  <span className="text-white font-semibold">Resonant pulses create superposition.</span>{' '}
                  A {'\u03C0'}/2 microwave pulse at {'\u03C9'}{'\u2080'} puts a qubit into (|0⟩+|1⟩)/{'\u221A'}2.
                  Off-resonance? The pulse does almost nothing. This selectivity is why resonance matters.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-quantum-purple font-mono text-xs mt-0.5 shrink-0">2.</span>
                <p>
                  <span className="text-white font-semibold">Resonant coupling creates entanglement.</span>{' '}
                  When two qubits are brought into resonance (same frequency), they exchange energy via the
                  avoided crossing. This interaction produces two-qubit gates (iSWAP, CZ) that generate entanglement.
                  On tunable-frequency chips (like transmons), you literally tune the qubit frequency to create the gate.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-quantum-green font-mono text-xs mt-0.5 shrink-0">3.</span>
                <p>
                  <span className="text-white font-semibold">Gate sequences create interference.</span>{' '}
                  Quantum algorithms are sequences of resonant pulses arranged so that the probability amplitudes
                  for wrong answers cancel (destructive interference) and correct answers reinforce (constructive
                  interference). This is the quantum speedup &mdash; exploring many paths simultaneously and
                  having them interfere to concentrate probability on the right answer.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-quantum-orange font-mono text-xs mt-0.5 shrink-0">4.</span>
                <p>
                  <span className="text-white font-semibold">Dispersive resonance enables measurement.</span>{' '}
                  To read the result, a microwave probe hits the readout cavity at <em>its</em> resonant frequency.
                  The qubit state shifts that frequency by {'\u00B1'}g{'\u00B2'}/{'\u0394'} (from the avoided crossing
                  above), letting you distinguish |0⟩ from |1⟩ without directly touching the qubit.
                </p>
              </div>
            </div>
          </div>

          <MetaphorCallout accent="#8b5cf6">
            <span style={{ color: '#8b5cf6' }} className="font-semibold">The trinity of quantum computing.</span>{' '}
            Superposition lets you explore many states at once. Entanglement correlates qubits so they
            can&apos;t be described independently. Interference filters the results so useful answers survive.
            All three are orchestrated through resonance &mdash; the ability to precisely address quantum
            systems at their natural frequencies. Without resonance, you have no selective control,
            and without selective control, you have no computation.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 6: Multi-Qubit Resonance        */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Multi-Qubit Resonance</h2>
          <p className="text-sm text-gray-500 mb-6">
            A single qubit has one resonance peak. A chip with many qubits has many peaks &mdash;
            and they must not overlap. When peaks collide (&ldquo;spectral crowding&rdquo;), qubits
            exchange energy uncontrollably, destroying information. This is the frequency planning
            problem every chip designer must solve.
          </p>

          {/* Frequency crowding */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Spectral Crowding</h3>
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <FrequencyCrowdingSVG spacing={freqSpacing} />
          </div>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <div className="flex items-center gap-4 mb-2">
              <label className="text-sm font-mono text-gray-400 whitespace-nowrap">
                Frequency spacing: <span className="text-white font-semibold">{freqSpacing}</span>
              </label>
              <input
                type="range"
                min={1}
                max={6}
                step={0.1}
                value={freqSpacing}
                onChange={(e) => setFreqSpacing(parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ff6b9d ${((freqSpacing - 1) / 5) * 100}%, #1e293b ${((freqSpacing - 1) / 5) * 100}%)`,
                }}
              />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <PlayButton
                onClick={playCrowding}
                playing={playingSection === 'crowding'}
                label={playingSection === 'crowding' ? 'Stop' : 'Hear the qubits'}
                accent="#ff6b9d"
              />
              <span className="text-[10px] text-gray-600 font-mono">
                5 tones across stereo. Crowd them and hear the beating/dissonance.
              </span>
            </div>
          </div>

          {/* Conditional frequency shift */}
          <h3 className="text-sm font-semibold text-gray-400 mt-8 mb-3">How Entanglement Shifts Resonance</h3>
          <p className="text-sm text-gray-500 mb-4">
            When a qubit couples to a readout cavity (or another qubit), the coupling creates a
            state-dependent frequency shift. The cavity&apos;s resonant frequency moves left or right
            depending on whether the qubit is in |0⟩ or |1⟩. This <em>dispersive shift</em>{' '}
            {'\u03C7'} = g{'\u00B2'}/{'\u0394'} is how measurement works &mdash; you probe the cavity
            and the frequency you see tells you the qubit state.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <ConditionalFrequencyShiftSVG />
          </div>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">The chain reaction</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="text-quantum-accent font-mono text-xs mt-0.5 shrink-0">1.</span>
                <p>
                  <span className="text-white">Coupling shifts frequencies.</span>{' '}
                  Two coupled systems can&apos;t have independent resonance frequencies &mdash; they become
                  dressed states with shifted energies (the avoided crossing from Section 4).
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-quantum-purple font-mono text-xs mt-0.5 shrink-0">2.</span>
                <p>
                  <span className="text-white">Entanglement makes shifts state-dependent.</span>{' '}
                  If qubit A is entangled with qubit B, measuring A collapses B into a definite state &mdash;
                  which shifts B&apos;s frequency. The stronger the entanglement, the larger the shift.
                  This is the <em>always-on ZZ interaction</em> that limits fidelity on fixed-frequency transmons.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-quantum-green font-mono text-xs mt-0.5 shrink-0">3.</span>
                <p>
                  <span className="text-white">Topology determines which qubits couple.</span>{' '}
                  Only physically connected qubits have significant coupling. The chip&apos;s wiring layout
                  determines which pairs can interact directly &mdash; all other interactions require SWAP
                  chains, each adding ~1% error.
                </p>
              </div>
            </div>
          </div>

          {/* Topology map with real data */}
          <h3 className="text-sm font-semibold text-gray-400 mt-8 mb-3">Topology Shapes Everything</h3>
          <p className="text-sm text-gray-500 mb-4">
            Here&apos;s Tuna-9&apos;s actual topology with measured Bell-state fidelity on each edge.
            The fidelity varies from 85.8% to 93.5% &mdash; this variation reflects different frequency
            separations, coupling strengths, and local noise environments at each pair. Routing matters:
            GHZ states on q[2,4,6] (high-fidelity path) beat q[0,1,2] (weak links) by 5.8 percentage points.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <TopologyResonanceSVG />
          </div>

          <MetaphorCallout accent="#00ff88">
            <span style={{ color: '#00ff88' }} className="font-semibold">A city of radio towers.</span>{' '}
            Each qubit is a radio tower broadcasting at its own frequency. Towers that are physically
            close (connected on the chip) can interfere with each other. The chip designer&apos;s job is
            to assign frequencies so that connected qubits are far enough apart in frequency space to
            avoid crosstalk, but close enough that two-qubit gates (which require resonant interaction)
            remain fast. It&apos;s a Goldilocks problem &mdash; and the topology constrains which
            frequency assignments are even possible. This is why chip architecture matters as much as
            individual qubit quality.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 7: Real Hardware                */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Resonance on Real Hardware</h2>
          <p className="text-sm text-gray-500 mb-6">
            Each qubit on a chip is tuned to a slightly different frequency, allowing selective
            addressing via frequency-multiplexed microwave pulses. Here are representative qubit
            frequencies across our three platforms. The spread within each chip is deliberate &mdash;
            it prevents unwanted crosstalk between neighboring qubits.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <FrequencyRuler />
            <div className="mt-4 pt-3 border-t border-quantum-border/50 flex flex-wrap items-center gap-3">
              <span className="text-[10px] text-gray-500 font-mono mr-1">Listen:</span>
              <PlayButton
                onClick={() => playHardwareFreqs('torino')}
                playing={playingSection === 'hw-torino'}
                label="IBM Torino"
                accent="#00d4ff"
              />
              <PlayButton
                onClick={() => playHardwareFreqs('garnet')}
                playing={playingSection === 'hw-garnet'}
                label="IQM Garnet"
                accent="#8b5cf6"
              />
              <PlayButton
                onClick={() => playHardwareFreqs('tuna9')}
                playing={playingSection === 'hw-tuna9'}
                label="Tuna-9"
                accent="#ff8c42"
              />
              <span className="text-[10px] text-gray-600 font-mono ml-2">
                Each qubit becomes a tone. More spread = more distinct.
              </span>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-gray-600 font-mono">
            Note: frequencies are representative (real calibration data is proprietary).
            The principle &mdash; each qubit at a distinct frequency &mdash; is accurate.
          </p>

          <MetaphorCallout accent="#ff6b9d">
            <span style={{ color: '#ff6b9d' }} className="font-semibold">Radio stations.</span>{' '}
            Just like FM radio stations occupy different frequencies so they don&apos;t interfere,
            each qubit on a chip sits at a unique frequency. Want to flip qubit 3? Tune to 5.55 GHz.
            Want qubit 7? Switch to 6.48 GHz. The narrower each qubit&apos;s linewidth (higher T{'\u2082'}),
            the more qubits you can pack into a given frequency band without crosstalk.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 6: Key Terms                    */}
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
                term: 'Resonance',
                definition: 'The condition where a driving frequency matches a system\u2019s natural frequency, enabling maximum energy transfer. For a qubit: \u03C9_drive = \u03C9\u2080.',
              },
              {
                term: 'Detuning (\u0394)',
                definition: 'The difference between the drive frequency and the qubit frequency: \u0394 = \u03C9_drive - \u03C9\u2080. Zero detuning means perfect resonance.',
              },
              {
                term: 'Spectroscopy',
                definition: 'Sweeping a drive frequency across a range and measuring the response. The peak reveals the qubit\u2019s transition frequency. First step in any calibration workflow.',
              },
              {
                term: 'Lorentzian Lineshape',
                definition: 'The characteristic frequency response P(\u0394) = \u03A9\u00B2/(\u03A9\u00B2 + \u0394\u00B2 + \u03B3\u00B2) of a resonance peak. Natural for systems with exponential decay (T\u2082 decoherence).',
              },
              {
                term: 'Linewidth (FWHM)',
                definition: 'Full Width at Half Maximum \u2014 the frequency span where the response exceeds half its peak value. Related to coherence: FWHM = 1/(\u03C0 T\u2082).',
              },
              {
                term: 'Q Factor',
                definition: 'Quality factor = \u03C9\u2080/FWHM. Measures how many oscillations a system completes before losing energy. Superconducting qubits: Q ~ 10\u2076. Higher Q means better frequency selectivity.',
              },
              {
                term: 'T\u2082 Coherence',
                definition: 'The timescale over which a qubit loses phase information. Determines linewidth: longer T\u2082 \u2192 narrower peak \u2192 sharper frequency selectivity.',
              },
              {
                term: 'Avoided Crossing',
                definition: 'When two coupled quantum systems have nearby energies, their levels repel rather than crossing. The minimum gap equals 2g, where g is the coupling strength.',
              },
              {
                term: 'Dressed States',
                definition: 'Eigenstates of the coupled qubit-cavity system. At \u0394 = 0, they are equal superpositions of |qubit\u27E9 and |cavity\u27E9. At large \u0394, they return to bare states.',
              },
              {
                term: 'Dispersive Readout',
                definition: 'Reading a qubit by measuring cavity frequency shift \u03C7 = g\u00B2/\u0394. In the dispersive regime (\u0394 \u226B g), |0\u27E9 and |1\u27E9 shift the cavity in opposite directions.',
              },
              {
                term: 'Rabi Frequency (\u03A9)',
                definition: 'The rate at which a resonant drive rotates the qubit state. Proportional to the microwave amplitude. Determines spectroscopy peak height and Rabi oscillation speed.',
              },
              {
                term: 'Transmon Qubit',
                definition: 'A charge qubit with reduced charge sensitivity (E_J/E_C ~ 50\u2013100). The dominant superconducting qubit architecture. Used in Tuna-9, Garnet, and Torino.',
              },
            ].map((item) => (
              <div key={item.term} className="bg-quantum-card/60 rounded-lg border border-quantum-border p-4">
                <h3 className="text-sm font-semibold text-quantum-accent mb-1">{item.term}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.definition}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 7: References                   */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">References</h2>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Superconducting Qubits</h3>
          <div className="space-y-3 text-sm mb-8">
            {[
              {
                id: 'R1',
                text: 'P. Krantz, M. Kjaergaard, F. Yan, T.P. Orlando, S. Gustavsson, W.D. Oliver, \u201cA Quantum Engineer\u2019s Guide to Superconducting Qubits,\u201d Appl. Phys. Rev. 6, 021318 (2019).',
                url: 'https://arxiv.org/abs/1904.06560',
                urlLabel: 'arXiv:1904.06560',
              },
              {
                id: 'R2',
                text: 'A. Blais, A.L. Grimsmo, S.M. Girvin, A. Wallraff, \u201cCircuit quantum electrodynamics,\u201d Rev. Mod. Phys. 93, 025005 (2021).',
                url: 'https://arxiv.org/abs/2005.12667',
                urlLabel: 'arXiv:2005.12667',
              },
            ].map((ref) => (
              <div key={ref.id} className="flex gap-3 bg-quantum-card/40 rounded border border-quantum-border/50 p-4">
                <span className="text-quantum-accent font-mono text-xs mt-0.5">[{ref.id}]</span>
                <div className="flex-1">
                  <p className="text-gray-300">{ref.text}</p>
                  {ref.url && (
                    <a href={ref.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-quantum-accent transition-colors mt-1 inline-block">
                      {ref.urlLabel} &nearr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Related Pages</h3>
          <div className="space-y-3 text-sm">
            {[
              {
                id: 'P1',
                title: 'Rabi Oscillations',
                desc: 'Time-domain view of qubit control \u2014 chevron patterns, detuning effects, Bloch sphere dynamics.',
                href: '/rabi',
              },
              {
                id: 'P2',
                title: 'Hamiltonians Explorer',
                desc: 'How molecular Hamiltonians are built and compressed. What gets measured in VQE.',
                href: '/hamiltonians',
              },
            ].map((ref) => (
              <div key={ref.id} className="flex gap-3 bg-quantum-card/40 rounded border border-quantum-border/50 p-4">
                <span className="text-quantum-accent font-mono text-xs mt-0.5">[{ref.id}]</span>
                <div className="flex-1">
                  <p className="text-gray-300">
                    <span className="font-semibold">{ref.title}</span> &mdash; {ref.desc}
                  </p>
                  <Link href={ref.href} className="text-xs text-gray-500 hover:text-quantum-accent transition-colors mt-1 inline-block">
                    Visit page &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 8: Explore More + Footer        */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Explore More</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/rabi', title: 'Rabi Oscillations', desc: 'Time-domain qubit control: chevron heatmaps, pulse sequences, Bloch sphere' },
              { href: '/hamiltonians', title: 'Hamiltonians Explorer', desc: 'Molecular Hamiltonians, Pauli decomposition, bond stretching' },
              { href: '/ansatz', title: 'Ansatz Explorer', desc: 'Circuit architectures from 4 papers, mapped to 3 quantum processors' },
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
          <Link href="/" className="text-quantum-accent hover:underline">haiqu</Link>{' '}
          research initiative at TU Delft / QuTech.
          Physics:{' '}
          <a href="https://arxiv.org/abs/1904.06560" target="_blank" rel="noopener noreferrer" className="text-quantum-accent hover:underline">
            Krantz et al. (2019)
          </a>{' '}
          and{' '}
          <a href="https://arxiv.org/abs/2005.12667" target="_blank" rel="noopener noreferrer" className="text-quantum-accent hover:underline">
            Blais et al. (2021)
          </a>.
        </footer>
      </div>
    </div>
  )
}
