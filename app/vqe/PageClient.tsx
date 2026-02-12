'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// DATA — PES reference (from vqe-h2-sweep-reference.json)
// ============================================================

interface PESPoint {
  R: number
  fci: number
  hf: number
  theta: number
  g0: number
  g1: number
  g2: number
  g3: number
  g4: number
  g5: number
}

const PES_DATA: PESPoint[] = [
  { R: 0.3, fci: -0.601804, hf: -0.593828, theta: -0.049555, g0: 1.02347, g1: 0.808649, g2: -0.808649, g3: 0.0, g4: 0.080409, g5: 0.080409 },
  { R: 0.4, fci: -0.91415, hf: -0.904361, theta: -0.059428, g0: 0.473277, g1: 0.688819, g2: -0.688819, g3: 0.0, g4: 0.082258, g5: 0.082258 },
  { R: 0.5, fci: -1.05516, hf: -1.042996, theta: -0.071905, g0: 0.123163, g1: 0.58308, g2: -0.58308, g3: 0.0, g4: 0.084435, g5: 0.084435 },
  { R: 0.6, fci: -1.116286, hf: -1.101128, theta: -0.087029, g0: -0.113101, g1: 0.494014, g2: -0.494014, g3: 0.0, g4: 0.086865, g5: 0.086865 },
  { R: 0.7, fci: -1.136189, hf: -1.117349, theta: -0.104868, g0: -0.276438, g1: 0.420456, g2: -0.420456, g3: 0.0, g4: 0.0895, g5: 0.0895 },
  { R: 0.735, fci: -1.137306, hf: -1.116999, theta: -0.111769, g0: -0.321124, g1: 0.397937, g2: -0.397937, g3: 0.0, g4: 0.090466, g5: 0.090466 },
  { R: 0.8, fci: -1.134148, hf: -1.11085, theta: -0.125523, g0: -0.390932, g1: 0.359959, g2: -0.359959, g3: 0.0, g4: 0.092313, g5: 0.092313 },
  { R: 0.9, fci: -1.12056, hf: -1.091914, theta: -0.149201, g0: -0.472339, g1: 0.309787, g2: -0.309787, g3: 0.0, g4: 0.095286, g5: 0.095286 },
  { R: 1.0, fci: -1.10115, hf: -1.066109, theta: -0.17622, g0: -0.531051, g1: 0.267529, g2: -0.267529, g3: 0.0, g4: 0.098395, g5: 0.098395 },
  { R: 1.2, fci: -1.056741, hf: -1.005107, theta: -0.241325, g0: -0.604728, g1: 0.20019, g2: -0.20019, g3: 0.0, g4: 0.104896, g5: 0.104896 },
  { R: 1.5, fci: -0.998149, hf: -0.910874, theta: -0.363345, g0: -0.652671, g1: 0.129101, g2: -0.129101, g3: 0.0, g4: 0.114768, g5: 0.114768 },
  { R: 2.0, fci: -0.948641, hf: -0.783793, theta: -0.56657, g0: -0.662537, g1: 0.060628, g2: -0.060628, g3: 0.0, g4: 0.129569, g5: 0.129569 },
  { R: 2.5, fci: -0.936055, hf: -0.702944, theta: -0.690407, g0: -0.648674, g1: 0.027135, g2: -0.027135, g3: 0.0, g4: 0.141105, g5: 0.141105 },
  { R: 3.0, fci: -0.933632, hf: -0.656048, theta: -0.747919, g0: -0.633578, g1: 0.011235, g2: -0.011235, g3: 0.0, g4: 0.149606, g5: 0.149606 },
]

// ============================================================
// EMULATOR SWEEP (from vqe-h2-sweep-emulator.json)
// ============================================================

const EMULATOR_SWEEP = [
  { R: 0.3, energy: -0.601888, error_kcal: 0.05 },
  { R: 0.4, energy: -0.914605, error_kcal: 0.29 },
  { R: 0.5, energy: -1.055518, error_kcal: 0.22 },
  { R: 0.6, energy: -1.11495, error_kcal: 0.84 },
  { R: 0.7, energy: -1.136616, error_kcal: 0.27 },
  { R: 0.735, energy: -1.137753, error_kcal: 0.28 },
  { R: 0.8, energy: -1.132951, error_kcal: 0.75 },
  { R: 0.9, energy: -1.119277, error_kcal: 0.81 },
  { R: 1.0, energy: -1.101655, error_kcal: 0.32 },
  { R: 1.2, energy: -1.056886, error_kcal: 0.09 },
  { R: 1.5, energy: -0.998697, error_kcal: 0.34 },
  { R: 2.0, energy: -0.948325, error_kcal: 0.20 },
  { R: 2.5, energy: -0.935704, error_kcal: 0.22 },
  { R: 3.0, energy: -0.933631, error_kcal: 0.00 },
]

// ============================================================
// HARDWARE RESULTS at R=0.735 (from experiment files)
// ============================================================

const HARDWARE_RESULTS = [
  { label: 'IBM TREX', energy: -1.136955, error_kcal: 0.22, color: '#00ff88', platform: 'IBM Torino' },
  { label: 'Emulator avg', energy: -1.137753, error_kcal: 0.28, color: '#00d4ff', platform: 'QI Emulator' },
  { label: 'Tuna-9 REM+PS', energy: -1.135843, error_kcal: 0.92, color: '#8b5cf6', platform: 'QI Tuna-9' },
  { label: 'IBM Raw', energy: -1.122617, error_kcal: 9.22, color: '#ff8c42', platform: 'IBM Torino' },
  { label: 'Torino Raw (worst)', energy: -1.09648, error_kcal: 25.6, color: '#ef4444', platform: 'IBM Torino' },
]

// ============================================================
// HELPERS
// ============================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function interpolatePES(R: number): PESPoint {
  if (R <= PES_DATA[0].R) return PES_DATA[0]
  if (R >= PES_DATA[PES_DATA.length - 1].R) return PES_DATA[PES_DATA.length - 1]
  for (let i = 0; i < PES_DATA.length - 1; i++) {
    if (R >= PES_DATA[i].R && R <= PES_DATA[i + 1].R) {
      const t = (R - PES_DATA[i].R) / (PES_DATA[i + 1].R - PES_DATA[i].R)
      const a = PES_DATA[i]
      const b = PES_DATA[i + 1]
      return {
        R,
        fci: lerp(a.fci, b.fci, t),
        hf: lerp(a.hf, b.hf, t),
        theta: lerp(a.theta, b.theta, t),
        g0: lerp(a.g0, b.g0, t),
        g1: lerp(a.g1, b.g1, t),
        g2: lerp(a.g2, b.g2, t),
        g3: lerp(a.g3, b.g3, t),
        g4: lerp(a.g4, b.g4, t),
        g5: lerp(a.g5, b.g5, t),
      }
    }
  }
  return PES_DATA[0]
}

function vqeEnergy(theta: number, p: PESPoint): number {
  return p.g0 - p.g3 + (p.g2 - p.g1) * Math.cos(theta) + (p.g4 + p.g5) * Math.sin(theta)
}

const EQUILIBRIUM = PES_DATA[5] // R = 0.735

// ============================================================
// MetaphorCallout (matches hamiltonians pattern)
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
// VQE LOOP DIAGRAM
// ============================================================

function VQELoopDiagram({ activeStep, theta, energy }: { activeStep: number; theta: number; energy: number }) {
  const W = 700, H = 320
  const cx = W / 2, cy = H / 2

  const steps = [
    { label: 'Prepare', sub: 'Ansatz circuit', x: cx, y: 50, color: '#00d4ff', icon: 'Q' },
    { label: 'Measure', sub: 'Z / X / Y bases', x: cx + 200, y: cy, color: '#8b5cf6', icon: 'M' },
    { label: 'Compute', sub: 'Classical energy', x: cx, y: H - 50, color: '#00ff88', icon: 'E' },
    { label: 'Optimize', sub: 'Adjust \u03B8', x: cx - 200, y: cy, color: '#ff8c42', icon: '\u03B8' },
  ]

  const arrows = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 0 },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl mx-auto">
      <defs>
        <marker id="loop-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#4b5563" />
        </marker>
      </defs>

      {/* Arrows */}
      {arrows.map((a, i) => {
        const from = steps[a.from]
        const to = steps[a.to]
        const dx = to.x - from.x
        const dy = to.y - from.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / len
        const uy = dy / len
        const x1 = from.x + ux * 45
        const y1 = from.y + uy * 45
        const x2 = to.x - ux * 45
        const y2 = to.y - uy * 45
        const isActive = i === activeStep
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={isActive ? steps[a.from].color : '#4b5563'}
            strokeWidth={isActive ? 2.5 : 1.5}
            markerEnd="url(#loop-arrow)"
            opacity={isActive ? 1 : 0.5}
          />
        )
      })}

      {/* Step nodes */}
      {steps.map((step, i) => {
        const isActive = i === activeStep
        return (
          <g key={i}>
            <circle
              cx={step.x} cy={step.y} r={36}
              fill={isActive ? step.color + '20' : '#0a0a0a'}
              stroke={isActive ? step.color : '#4b5563'}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            <text x={step.x} y={step.y - 6} textAnchor="middle" fill={isActive ? step.color : '#9ca3af'}
              fontSize="16" fontFamily="monospace" fontWeight="bold">
              {step.icon}
            </text>
            <text x={step.x} y={step.y + 12} textAnchor="middle" fill={isActive ? 'white' : '#6b7280'}
              fontSize="9" fontFamily="monospace">
              {step.label}
            </text>
          </g>
        )
      })}

      {/* Center info */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="monospace">
        {'\u03B8'} = {theta.toFixed(3)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#00d4ff" fontSize="12" fontFamily="monospace" fontWeight="bold">
        E = {energy.toFixed(4)} Ha
      </text>
    </svg>
  )
}

// ============================================================
// PIPELINE DIAGRAM
// ============================================================

function PipelineDiagram() {
  const W = 700, H = 80
  const stages = [
    { label: 'H\u2082', sub: 'molecule', color: '#00d4ff' },
    { label: 'PySCF', sub: 'integrals', color: '#8b5cf6' },
    { label: 'H', sub: 'Hamiltonian', color: '#00ff88' },
    { label: 'JW', sub: 'Jordan-Wigner', color: '#ff8c42' },
    { label: '\u2211g\u1D62P\u1D62', sub: 'Pauli strings', color: '#ff6b9d' },
    { label: 'U(\u03B8)', sub: 'circuit', color: '#00d4ff' },
    { label: 'E', sub: 'energy', color: '#00ff88' },
  ]
  const gap = W / (stages.length + 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl mx-auto">
      <defs>
        <marker id="pipe-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="#4b5563" />
        </marker>
      </defs>
      {stages.map((s, i) => {
        const x = gap * (i + 1)
        return (
          <g key={i}>
            {i < stages.length - 1 && (
              <line
                x1={x + 28} y1={H / 2}
                x2={x + gap - 28} y2={H / 2}
                stroke="#4b5563" strokeWidth={1.5}
                markerEnd="url(#pipe-arrow)"
              />
            )}
            <circle cx={x} cy={H / 2} r={22} fill={s.color + '15'} stroke={s.color} strokeWidth={1.5} />
            <text x={x} y={H / 2 - 2} textAnchor="middle" fill={s.color} fontSize="11" fontFamily="monospace" fontWeight="bold">
              {s.label}
            </text>
            <text x={x} y={H / 2 + 10} textAnchor="middle" fill="#6b7280" fontSize="7" fontFamily="monospace">
              {s.sub}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================
// ENERGY LANDSCAPE CHART (E(theta) at selected R)
// ============================================================

function EnergyLandscape({ pesPoint, theta, onThetaChange }: {
  pesPoint: PESPoint
  theta: number
  onThetaChange: (t: number) => void
}) {
  const W = 600, H = 300
  const PAD = { top: 30, right: 30, bottom: 40, left: 60 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  // Compute E(theta) curve
  const nPoints = 200
  const thetaMin = -Math.PI, thetaMax = 0
  const points = useMemo(() => {
    const pts: { t: number; e: number }[] = []
    for (let i = 0; i <= nPoints; i++) {
      const t = thetaMin + (thetaMax - thetaMin) * (i / nPoints)
      pts.push({ t, e: vqeEnergy(t, pesPoint) })
    }
    return pts
  }, [pesPoint])

  const eMin = Math.min(...points.map(p => p.e)) - 0.02
  const eMax = Math.max(...points.map(p => p.e)) + 0.02

  const xScale = (t: number) => PAD.left + ((t - thetaMin) / (thetaMax - thetaMin)) * plotW
  const yScale = (e: number) => PAD.top + ((eMax - e) / (eMax - eMin)) * plotH

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(p.t).toFixed(1)},${yScale(p.e).toFixed(1)}`
  ).join(' ')

  const currentE = vqeEnergy(theta, pesPoint)
  const fciE = pesPoint.fci
  const hfE = pesPoint.hf

  // Chemical accuracy band around FCI
  const chemAccHa = 1.0 / 627.509

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width * W
    const t = thetaMin + ((px - PAD.left) / plotW) * (thetaMax - thetaMin)
    if (t >= thetaMin && t <= thetaMax) onThetaChange(t)
  }, [onThetaChange])

  const handleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return
    handleSvgClick(e)
  }, [handleSvgClick])

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const step = 0.05
    let v = Math.ceil(eMin / step) * step
    while (v <= eMax) { ticks.push(v); v += step }
    return ticks
  }, [eMin, eMax])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl mx-auto cursor-crosshair"
      onClick={handleSvgClick} onMouseMove={handleSvgMove}>

      {/* Chemical accuracy band */}
      <rect
        x={PAD.left} y={yScale(fciE + chemAccHa)}
        width={plotW} height={yScale(fciE - chemAccHa) - yScale(fciE + chemAccHa)}
        fill="#00ff88" opacity={0.06}
      />

      {/* Grid lines */}
      {yTicks.map(y => (
        <line key={y} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)}
          stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* HF line */}
      <line x1={PAD.left} y1={yScale(hfE)} x2={W - PAD.right} y2={yScale(hfE)}
        stroke="#ff8c42" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      <text x={W - PAD.right + 4} y={yScale(hfE) + 3} fill="#ff8c42" fontSize="8" fontFamily="monospace">HF</text>

      {/* FCI line */}
      <line x1={PAD.left} y1={yScale(fciE)} x2={W - PAD.right} y2={yScale(fciE)}
        stroke="#00ff88" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      <text x={W - PAD.right + 4} y={yScale(fciE) + 3} fill="#00ff88" fontSize="8" fontFamily="monospace">FCI</text>

      {/* Energy curve */}
      <path d={pathD} fill="none" stroke="#00d4ff" strokeWidth={2} />

      {/* Draggable dot */}
      <circle cx={xScale(theta)} cy={yScale(currentE)} r={6}
        fill="#00d4ff" stroke="white" strokeWidth={2} />
      <text x={xScale(theta) + 10} y={yScale(currentE) - 8} fill="white" fontSize="9" fontFamily="monospace">
        {currentE.toFixed(4)} Ha
      </text>

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {[-Math.PI, -Math.PI * 0.75, -Math.PI * 0.5, -Math.PI * 0.25, 0].map((t, i) => (
        <text key={i} x={xScale(t)} y={H - PAD.bottom + 16} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
          {t === -Math.PI ? '-\u03C0' : t === 0 ? '0' : `${(t / Math.PI).toFixed(2)}\u03C0`}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} fill="#9ca3af" fontSize="10" textAnchor="middle">{'\u03B8'} (rad)</text>

      {/* Y labels */}
      {yTicks.map(y => (
        <text key={y} x={PAD.left - 8} y={yScale(y) + 3} fill="#9ca3af" fontSize="8" fontFamily="monospace" textAnchor="end">
          {y.toFixed(2)}
        </text>
      ))}
      <text x={14} y={(PAD.top + H - PAD.bottom) / 2} fill="#9ca3af" fontSize="10" textAnchor="middle"
        transform={`rotate(-90, 14, ${(PAD.top + H - PAD.bottom) / 2})`}>
        Energy (Ha)
      </text>
    </svg>
  )
}

// ============================================================
// PES CHART (Bond distance sweep)
// ============================================================

function PESChart({ hoverR, onHoverR }: { hoverR: number | null; onHoverR: (r: number | null) => void }) {
  const W = 650, H = 340
  const PAD = { top: 30, right: 30, bottom: 45, left: 65 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const rMin = 0.3, rMax = 3.0
  const eMin = -1.2, eMax = -0.5

  const xScale = (r: number) => PAD.left + ((r - rMin) / (rMax - rMin)) * plotW
  const yScale = (e: number) => PAD.top + ((eMax - e) / (eMax - eMin)) * plotH

  const chemAccHa = 1.0 / 627.509

  // FCI path
  const fciPath = PES_DATA.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(p.R).toFixed(1)},${yScale(p.fci).toFixed(1)}`
  ).join(' ')

  // HF path
  const hfPath = PES_DATA.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(p.R).toFixed(1)},${yScale(p.hf).toFixed(1)}`
  ).join(' ')

  // Emulator path
  const emuPath = EMULATOR_SWEEP.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(p.R).toFixed(1)},${yScale(p.energy).toFixed(1)}`
  ).join(' ')

  // Chemical accuracy band around FCI
  const bandAbovePath = PES_DATA.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(p.R).toFixed(1)},${yScale(p.fci + chemAccHa).toFixed(1)}`
  ).join(' ')
  const bandBelowPath = PES_DATA.slice().reverse().map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(p.R).toFixed(1)},${yScale(p.fci - chemAccHa).toFixed(1)}`
  ).join(' ')

  // Y-axis ticks
  const yTicks = [-1.2, -1.1, -1.0, -0.9, -0.8, -0.7, -0.6, -0.5]
  const xTicks = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]

  const handleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width * W
    const r = rMin + ((px - PAD.left) / plotW) * (rMax - rMin)
    if (r >= rMin && r <= rMax) onHoverR(r)
    else onHoverR(null)
  }, [onHoverR])

  const hoverPoint = useMemo(() => {
    if (hoverR === null) return null
    const pes = interpolatePES(hoverR)
    const emu = EMULATOR_SWEEP.reduce((best, p) =>
      Math.abs(p.R - hoverR) < Math.abs(best.R - hoverR) ? p : best
    )
    return { R: hoverR, fci: pes.fci, hf: pes.hf, emu: emu.energy }
  }, [hoverR])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl mx-auto"
      onMouseMove={handleSvgMove} onMouseLeave={() => onHoverR(null)}>

      {/* Chemical accuracy band */}
      <path d={`${bandAbovePath} ${bandBelowPath} Z`} fill="#00ff88" opacity={0.05} />

      {/* Grid */}
      {yTicks.map(y => (
        <line key={y} x1={PAD.left} y1={yScale(y)} x2={W - PAD.right} y2={yScale(y)}
          stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* HF path */}
      <path d={hfPath} fill="none" stroke="#ff8c42" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.8} />

      {/* FCI path */}
      <path d={fciPath} fill="none" stroke="white" strokeWidth={2} />

      {/* Emulator path */}
      <path d={emuPath} fill="none" stroke="#00ff88" strokeWidth={2} />

      {/* Emulator dots */}
      {EMULATOR_SWEEP.map((p, i) => (
        <circle key={i} cx={xScale(p.R)} cy={yScale(p.energy)} r={3}
          fill="#00ff88" opacity={0.7} />
      ))}

      {/* Hardware point at R=0.735 */}
      <circle cx={xScale(0.735)} cy={yScale(HARDWARE_RESULTS[0].energy)} r={5}
        fill="#00ff88" stroke="white" strokeWidth={1.5} />
      <text x={xScale(0.735) + 8} y={yScale(HARDWARE_RESULTS[0].energy) - 6}
        fill="#00ff88" fontSize="8" fontFamily="monospace">TREX</text>

      {/* Hover crosshair */}
      {hoverPoint && (
        <g>
          <line x1={xScale(hoverPoint.R)} y1={PAD.top} x2={xScale(hoverPoint.R)} y2={H - PAD.bottom}
            stroke="#4b5563" strokeWidth={0.5} strokeDasharray="2 2" />
          <circle cx={xScale(hoverPoint.R)} cy={yScale(hoverPoint.fci)} r={4} fill="white" />
          <circle cx={xScale(hoverPoint.R)} cy={yScale(hoverPoint.hf)} r={4} fill="#ff8c42" />
          <rect x={xScale(hoverPoint.R) + 8} y={yScale(hoverPoint.fci) - 34}
            width={130} height={40} rx={4} fill="#0a0a0a" stroke="#4b5563" strokeWidth={0.5} />
          <text x={xScale(hoverPoint.R) + 14} y={yScale(hoverPoint.fci) - 20}
            fill="#9ca3af" fontSize="8" fontFamily="monospace">
            R = {hoverPoint.R.toFixed(2)} {'\u00C5'}
          </text>
          <text x={xScale(hoverPoint.R) + 14} y={yScale(hoverPoint.fci) - 8}
            fill="white" fontSize="8" fontFamily="monospace">
            FCI: {hoverPoint.fci.toFixed(4)} Ha
          </text>
          <text x={xScale(hoverPoint.R) + 14} y={yScale(hoverPoint.fci) + 4}
            fill="#ff8c42" fontSize="8" fontFamily="monospace">
            HF: {hoverPoint.hf.toFixed(4)} Ha
          </text>
        </g>
      )}

      {/* Axes */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#4b5563" strokeWidth={1} />

      {/* X labels */}
      {xTicks.map(r => (
        <text key={r} x={xScale(r)} y={H - PAD.bottom + 16} fill="#9ca3af" fontSize="9" fontFamily="monospace" textAnchor="middle">
          {r.toFixed(1)}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} fill="#9ca3af" fontSize="10" textAnchor="middle">
        Bond Distance ({'\u00C5'})
      </text>

      {/* Y labels */}
      {yTicks.map(y => (
        <text key={y} x={PAD.left - 8} y={yScale(y) + 3} fill="#9ca3af" fontSize="8" fontFamily="monospace" textAnchor="end">
          {y.toFixed(1)}
        </text>
      ))}
      <text x={14} y={(PAD.top + H - PAD.bottom) / 2} fill="#9ca3af" fontSize="10" textAnchor="middle"
        transform={`rotate(-90, 14, ${(PAD.top + H - PAD.bottom) / 2})`}>
        Energy (Ha)
      </text>
    </svg>
  )
}

// ============================================================
// PAGE
// ============================================================

export default function VQEPage() {
  const [theta, setTheta] = useState(-0.2235)
  const [hoverR, setHoverR] = useState<number | null>(null)

  const pesPoint = useMemo(() => EQUILIBRIUM, [])
  const currentEnergy = useMemo(() => vqeEnergy(theta, pesPoint), [theta, pesPoint])

  // Determine active VQE step from theta position
  const activeStep = useMemo(() => {
    const norm = (theta + Math.PI) / Math.PI // 0 to 1
    return Math.floor(norm * 4) % 4
  }, [theta])

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
            <span className="gradient-text">VQE</span>: Variational Quantum Eigensolver
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Can today&apos;s quantum hardware calculate the energy of a real molecule?
            VQE is the algorithm we use to find out. It runs on every platform we test &mdash;{' '}
            <Link href="/experiments/vqe-h2" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              IBM, Tuna-9, and emulator
            </Link>
            {' '}&mdash; connecting the{' '}
            <Link href="/hamiltonians" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              Hamiltonian
            </Link>
            {' '}(the problem) to the{' '}
            <Link href="/ansatz" className="text-quantum-accent/80 hover:text-quantum-accent underline decoration-quantum-accent/30">
              ansatz
            </Link>
            {' '}(the circuit). This page explains how the algorithm works, then shows
            what happens when we run it on real hardware.
          </p>

          <MetaphorCallout>
            <span className="text-quantum-accent font-semibold">Like tuning a guitar by ear.</span>{' '}
            You play a note (run a quantum circuit), listen to the pitch (measure energy),
            and turn the tuning peg (adjust parameters) until it sounds right.
            The quantum computer plays the notes; the classical computer turns the pegs.
          </MetaphorCallout>
        </div>

        {/* ======================================= */}
        {/* SECTION 1: The VQE Loop                  */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">The VQE Loop</h2>
          <p className="text-sm text-gray-500 mb-6">
            VQE repeats four steps until the energy converges. Drag the slider to adjust{' '}
            {'\u03B8'} and watch the energy update in real time. The loop highlights which step is active.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6 mb-4">
            <VQELoopDiagram activeStep={activeStep} theta={theta} energy={currentEnergy} />
          </div>

          {/* Theta slider */}
          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <div className="flex items-center gap-4 mb-3">
              <label className="text-sm font-mono text-gray-400 whitespace-nowrap">
                {'\u03B8'} = <span className="text-white font-semibold">{theta.toFixed(3)}</span>
              </label>
              <input
                type="range"
                min={-Math.PI}
                max={0}
                step={0.001}
                value={theta}
                onChange={(e) => setTheta(parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00d4ff ${((theta + Math.PI) / Math.PI) * 100}%, #1e293b ${((theta + Math.PI) / Math.PI) * 100}%)`,
                }}
              />
            </div>

            <div className="flex flex-wrap gap-6 text-xs font-mono text-gray-400">
              <span>Energy: <span className="text-quantum-accent">{currentEnergy.toFixed(4)} Ha</span></span>
              <span>FCI: <span className="text-green-400">{pesPoint.fci.toFixed(4)} Ha</span></span>
              <span>Error: <span className={
                Math.abs(currentEnergy - pesPoint.fci) * 627.509 < 1.0 ? 'text-green-400' : 'text-orange-400'
              }>{(Math.abs(currentEnergy - pesPoint.fci) * 627.509).toFixed(1)} kcal/mol</span></span>
              <span>Optimal: <span className="text-gray-500">{'\u03B8'} = -0.224</span></span>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 mt-4">
            {[
              { step: '1. Prepare', desc: 'Parameterized circuit (ansatz) creates a trial quantum state |\u03C8(\u03B8)\u27E9', color: '#00d4ff' },
              { step: '2. Measure', desc: 'Run circuit on hardware, measure in Z, X, and Y bases', color: '#8b5cf6' },
              { step: '3. Compute', desc: 'Classical computer calculates \u27E8\u03C8|H|\u03C8\u27E9 from measurements', color: '#00ff88' },
              { step: '4. Optimize', desc: 'Classical optimizer (COBYLA, SPSA) adjusts parameters \u03B8', color: '#ff8c42' },
            ].map((s) => (
              <div key={s.step} className="bg-quantum-card/60 rounded-lg border border-quantum-border p-3"
                style={{ borderColor: s.color + '30' }}>
                <h3 className="text-xs font-semibold mb-1" style={{ color: s.color }}>{s.step}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 2: From Molecule to Energy       */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">From Molecule to Energy</h2>
          <p className="text-sm text-gray-500 mb-6">
            Before VQE can run, the molecule must be translated into a quantum circuit.
            This pipeline turns atomic coordinates into something a quantum computer can execute.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <PipelineDiagram />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Link href="/hamiltonians"
              className="bg-quantum-card rounded-lg border border-quantum-border p-4 hover:border-quantum-accent/40 transition-colors group">
              <h3 className="text-sm font-semibold text-white group-hover:text-quantum-accent transition-colors mb-1">
                Hamiltonians Explorer &rarr;
              </h3>
              <p className="text-xs text-gray-500">
                How molecular Hamiltonians are built, compressed via Jordan-Wigner, and how
                Pauli terms change as you stretch the bond.
              </p>
            </Link>
            <Link href="/ansatz"
              className="bg-quantum-card rounded-lg border border-quantum-border p-4 hover:border-quantum-accent/40 transition-colors group">
              <h3 className="text-sm font-semibold text-white group-hover:text-quantum-accent transition-colors mb-1">
                Ansatz Explorer &rarr;
              </h3>
              <p className="text-xs text-gray-500">
                Circuit architectures from 4 papers, mapped to 3 quantum processors.
                Hardware-efficient vs chemically-inspired tradeoffs.
              </p>
            </Link>
          </div>

          <MetaphorCallout accent="#8b5cf6">
            <span style={{ color: '#8b5cf6' }} className="font-semibold">Assembly line.</span>{' '}
            PySCF computes the raw electron integrals (the ingredients).
            Jordan-Wigner translates them into qubit language (Pauli strings).
            The ansatz is the recipe card &mdash; it tells the quantum computer how to
            combine those ingredients. VQE is the chef, tasting and adjusting until the dish is right.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 3: Energy Landscape              */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Energy Landscape</h2>
          <p className="text-sm text-gray-500 mb-6">
            The energy E({'\u03B8'}) for H{'\u2082'} at equilibrium (R = 0.735 {'\u00C5'}).
            Click or drag on the chart to explore. The green band shows chemical accuracy
            ({'\u00B1'}1 kcal/mol around FCI). VQE&apos;s job is to find the minimum.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <EnergyLandscape pesPoint={pesPoint} theta={theta} onThetaChange={setTheta} />

            {/* Legend */}
            <div className="flex flex-wrap gap-6 mt-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-quantum-accent" />
                <span className="text-gray-400">E({'\u03B8'}) exact</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-green-400" />
                <span className="text-gray-400">FCI = {pesPoint.fci.toFixed(4)} Ha</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-orange-400" />
                <span className="text-gray-400">HF = {pesPoint.hf.toFixed(4)} Ha</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 bg-green-400/10 border border-green-400/20 rounded-sm" />
                <span className="text-gray-400">Chemical accuracy</span>
              </div>
            </div>
          </div>

          <MetaphorCallout accent="#00ff88">
            <span style={{ color: '#00ff88' }} className="font-semibold">Finding the lowest valley.</span>{' '}
            The energy landscape is a curve with one clear minimum. VQE walks downhill from
            the starting guess ({'\u03B8'} = 0, which is Hartree-Fock) toward the true
            ground state. For H{'\u2082'} with 1 parameter, this is trivial. For larger molecules
            with hundreds of parameters, the landscape becomes a high-dimensional maze.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 4: Bond Distance Sweep           */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Potential Energy Surface</h2>
          <p className="text-sm text-gray-500 mb-6">
            We ran VQE at 14 bond distances from 0.3 to 3.0 {'\u00C5'} (65,536 shots each) and
            compared against exact (FCI) and classical (Hartree-Fock) references. The green
            dots are real emulator measurements &mdash; not theory. Hover to see values.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <PESChart hoverR={hoverR} onHoverR={setHoverR} />

            {/* Legend */}
            <div className="flex flex-wrap gap-6 mt-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-white" />
                <span className="text-gray-400">FCI (exact)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: '#ff8c42' }} />
                <span className="text-gray-400">Hartree-Fock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5" style={{ backgroundColor: '#00ff88' }} />
                <span className="text-gray-400">VQE Emulator</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#00ff88', backgroundColor: 'transparent' }} />
                <span className="text-gray-400">IBM TREX (best hardware)</span>
              </div>
            </div>
          </div>

          <MetaphorCallout accent="#ff8c42">
            <span style={{ color: '#ff8c42' }} className="font-semibold">Where classical fails.</span>{' '}
            At equilibrium (R = 0.735 {'\u00C5'}), Hartree-Fock and FCI nearly agree &mdash; the
            correlation energy is only 12.7 kcal/mol. But stretch the bond to 3.0 {'\u00C5'} and
            the gap explodes to 174 kcal/mol. This is where quantum advantage lives:
            strongly correlated electrons that classical mean-field theory cannot describe.
            The emulator VQE (green) tracks FCI across the entire curve.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 5: Hardware Reality Check         */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Hardware Reality Check</h2>
          <p className="text-sm text-gray-500 mb-6">
            Theory is clean; hardware is noisy. These are real measurements from our{' '}
            <Link href="/experiments/vqe-h2" className="text-quantum-accent/60 hover:text-quantum-accent">
              H{'\u2082'} VQE experiment
            </Link>{' '}
            at equilibrium, ranked from best to worst. The dashed line marks chemical accuracy (1 kcal/mol) &mdash;
            the threshold where quantum chemistry becomes useful for predicting reactions.
          </p>

          <div className="bg-quantum-card rounded-lg border border-quantum-border p-6">
            <svg viewBox="0 0 600 220" className="w-full max-w-3xl mx-auto">
              {/* Chemical accuracy line */}
              {(() => {
                const barX = 160
                const barW = 400
                const maxErr = 30
                const chemX = barX + (1.0 / maxErr) * barW
                return (
                  <line x1={chemX} y1={10} x2={chemX} y2={200}
                    stroke="#00ff88" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
                )
              })()}

              {HARDWARE_RESULTS.map((r, i) => {
                const y = 24 + i * 38
                const barX = 160
                const barW = 400
                const maxErr = 30
                const w = Math.min((r.error_kcal / maxErr) * barW, barW)
                const withinCA = r.error_kcal <= 1.0
                return (
                  <g key={i}>
                    <text x={barX - 8} y={y + 12} fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="end">
                      {r.label}
                    </text>
                    <rect x={barX} y={y} width={Math.max(w, 3)} height={22} rx={3}
                      fill={r.color} opacity={0.3} />
                    <rect x={barX} y={y} width={Math.max(w, 3)} height={22} rx={3}
                      fill="none" stroke={r.color} strokeWidth={1.5} />
                    <text x={barX + w + 6} y={y + 14} fill={withinCA ? '#00ff88' : r.color}
                      fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {r.error_kcal.toFixed(2)} kcal/mol
                    </text>
                    <text x={barX + w + 6} y={y + 24} fill="#6b7280" fontSize="7" fontFamily="monospace">
                      {r.platform}
                    </text>
                  </g>
                )
              })}

              {/* Axis */}
              <line x1={160} y1={210} x2={560} y2={210} stroke="#4b5563" strokeWidth={1} />
              {[0, 5, 10, 15, 20, 25, 30].map(v => (
                <text key={v} x={160 + (v / 30) * 400} y={224} fill="#6b7280" fontSize="8"
                  fontFamily="monospace" textAnchor="middle">{v}</text>
              ))}
              <text x={360} y={218} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity={0}>
                kcal/mol
              </text>

              {/* Label chemical accuracy */}
              {(() => {
                const chemX = 160 + (1.0 / 30) * 400
                return (
                  <text x={chemX} y={8} fill="#00ff88" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    chem. accuracy
                  </text>
                )
              })()}
            </svg>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-quantum-card/60 rounded-lg border border-quantum-border p-4" style={{ borderColor: '#00ff8830' }}>
              <h3 className="text-xs font-semibold text-green-400 mb-1">Best Result</h3>
              <p className="text-lg font-mono font-bold text-white">0.22 kcal/mol</p>
              <p className="text-xs text-gray-500 mt-1">
                TREX readout mitigation on IBM Torino. Within chemical accuracy.
              </p>
            </div>
            <div className="bg-quantum-card/60 rounded-lg border border-quantum-border p-4" style={{ borderColor: '#ff8c4230' }}>
              <h3 className="text-xs font-semibold" style={{ color: '#ff8c42' }}>Key Insight</h3>
              <p className="text-sm font-mono text-white mt-1">80% readout noise</p>
              <p className="text-xs text-gray-500 mt-1">
                Most error is readout, not gates. Mitigation recovers nearly all lost accuracy.
              </p>
            </div>
            <div className="bg-quantum-card/60 rounded-lg border border-quantum-border p-4" style={{ borderColor: '#8b5cf630' }}>
              <h3 className="text-xs font-semibold" style={{ color: '#8b5cf6' }}>Emulator Baseline</h3>
              <p className="text-sm font-mono text-white mt-1">0.28 kcal/mol avg</p>
              <p className="text-xs text-gray-500 mt-1">
                Shot noise floor with 65k shots. No hardware errors, just statistical sampling.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Link href="/experiments/vqe-h2"
              className="bg-quantum-card rounded-lg border border-quantum-border p-4 hover:border-quantum-accent/40 transition-colors group">
              <h3 className="text-sm font-semibold text-white group-hover:text-quantum-accent transition-colors mb-1">
                Full H{'\u2082'} VQE Study &rarr;
              </h3>
              <p className="text-xs text-gray-500">
                Protocol, raw data, and cross-platform analysis behind these numbers.
                Includes all measurement counts and analysis methodology.
              </p>
            </Link>
            <Link href="/error-mitigation"
              className="bg-quantum-card rounded-lg border border-quantum-border p-4 hover:border-quantum-accent/40 transition-colors group">
              <h3 className="text-sm font-semibold text-white group-hover:text-quantum-accent transition-colors mb-1">
                Error Mitigation Explorer &rarr;
              </h3>
              <p className="text-xs text-gray-500">
                Ranked comparison of TREX, REM, symmetry post-selection, and more.
                Why TREX beats everything else for this circuit.
              </p>
            </Link>
          </div>
        </section>

        {/* ======================================= */}
        {/* SECTION 6: Paper Trail                   */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-1">Paper Trail</h2>
          <p className="text-sm text-gray-500 mb-6">
            VQE isn&apos;t just theory &mdash; we replicated three landmark VQE papers on real hardware
            and compared our results to the originals. Each replication tests specific claims
            from the paper and reports pass/fail against our measurements.
          </p>

          <div className="space-y-3">
            {[
              {
                id: 'peruzzo2014',
                paper: 'Peruzzo et al. 2014',
                title: 'The original VQE paper',
                desc: 'First-ever variational quantum eigensolver on a photonic processor. We replicated HeH\u207A bond sweep.',
                result: 'Emulator PASS, IBM 91 kcal/mol',
                claims: '3/5 claims pass',
                color: '#00d4ff',
              },
              {
                id: 'sagastizabal2019',
                paper: 'Sagastizabal et al. 2019',
                title: 'VQE with symmetry verification',
                desc: 'Error mitigation via parity symmetry post-selection on a superconducting transmon.',
                result: '6.2 kcal/mol on Tuna-9',
                claims: '3/4 claims pass',
                color: '#8b5cf6',
              },
              {
                id: 'kandala2017',
                paper: 'Kandala et al. 2017',
                title: 'Hardware-efficient ansatz for small molecules',
                desc: 'Full H\u2082 dissociation curve with hardware-efficient ansatz on IBM. The paper that defined modern VQE circuits.',
                result: '10/10 chem. accuracy on emulator',
                claims: '3/3 claims pass',
                color: '#00ff88',
              },
            ].map((rep) => (
              <Link key={rep.id} href={`/replications/${rep.id}`}
                className="flex gap-4 bg-quantum-card rounded-lg border border-quantum-border p-4 hover:border-quantum-accent/40 transition-colors group"
                style={{ borderColor: rep.color + '20' }}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: rep.color + '15' }}>
                  <span style={{ color: rep.color }} className="text-xs font-mono font-bold">
                    {rep.paper.split(' ')[1].slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-quantum-accent transition-colors">
                    {rep.paper} &mdash; {rep.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{rep.desc}</p>
                  <div className="flex gap-4 mt-1.5 text-xs font-mono">
                    <span style={{ color: rep.color }}>{rep.result}</span>
                    <span className="text-gray-600">{rep.claims}</span>
                  </div>
                </div>
                <span className="text-gray-600 group-hover:text-quantum-accent text-sm self-center">&rarr;</span>
              </Link>
            ))}
          </div>

          <MetaphorCallout accent="#00ff88">
            <span style={{ color: '#00ff88' }} className="font-semibold">Reproducibility is the point.</span>{' '}
            These papers defined VQE. We re-ran their experiments on modern hardware to see
            what holds up and what doesn&apos;t. The original Peruzzo 2014 paper used a photonic chip;
            we ran it on superconducting transmons. Kandala&apos;s 2017 circuit is exactly the ansatz
            in our{' '}
            <Link href="/ansatz" className="text-quantum-accent hover:underline">Ansatz Explorer</Link>.
            Each replication page shows claim-by-claim results.
          </MetaphorCallout>
        </section>

        {/* ======================================= */}
        {/* SECTION 7: Key Terms                     */}
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
                term: 'Hartree (Ha)',
                definition: 'The atomic unit of energy. 1 Ha = 627.509 kcal/mol. Molecular energies are typically between -0.5 and -150 Ha. H\u2082 ground state: -1.1373 Ha.',
              },
              {
                term: 'Chemical Accuracy',
                definition: '1 kcal/mol (1.6 mHa) \u2014 the precision needed to predict chemical reaction outcomes. Our best hardware VQE achieves 0.22 kcal/mol via TREX mitigation.',
              },
              {
                term: 'Ansatz',
                definition: 'The parameterized quantum circuit that prepares trial states. Choice of ansatz determines expressiveness, depth, and hardware compatibility. See the Ansatz Explorer.',
              },
              {
                term: 'Hamiltonian',
                definition: 'The operator H = \u2211 g\u1D62 P\u1D62 encoding a molecule\u2019s energy as a sum of Pauli strings. VQE measures \u27E8\u03C8|H|\u03C8\u27E9 to estimate the energy.',
              },
              {
                term: 'Expectation Value',
                definition: '\u27E8\u03C8|H|\u03C8\u27E9 \u2014 the average energy from many circuit runs. Each Pauli term needs separate measurements. More shots = lower statistical noise.',
              },
              {
                term: 'Classical Optimizer',
                definition: 'The algorithm adjusting \u03B8 each iteration. COBYLA (gradient-free) and SPSA (stochastic gradient) are common. The optimizer never touches the quantum computer directly.',
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
        {/* SECTION 8: Explore More + Footer         */}
        {/* ======================================= */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Explore More</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/experiments/vqe-h2', title: 'H\u2082 VQE Experiment', desc: 'Full study: protocol, raw data, cross-platform results' },
              { href: '/hamiltonians', title: 'Hamiltonians Explorer', desc: 'How the Hamiltonian is built, compressed, and stretched' },
              { href: '/ansatz', title: 'Ansatz Explorer', desc: 'Circuit architectures mapped to quantum processors' },
              { href: '/replications', title: 'Paper Replications', desc: '5 papers, 19 claims tested on emulator and hardware' },
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
          All energies computed from{' '}
          <Link href="/experiments" className="text-quantum-accent hover:underline">PySCF + OpenFermion</Link>{' '}
          with STO-3G basis and verified on{' '}
          <Link href="/experiments" className="text-quantum-accent hover:underline">real quantum hardware</Link>.
        </footer>
      </div>
    </div>
  )
}
