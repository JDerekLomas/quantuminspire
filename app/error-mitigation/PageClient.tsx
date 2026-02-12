'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// DATA — All from our actual experiments
// ============================================================

const CHEM_ACCURACY = 1.0 // kcal/mol

const LADDER = [
  { name: 'TREX', error: 0.22, cat: 'readout', plat: 'IBM Torino', color: '#00ff88', desc: 'Twirled readout extraction — randomly flips measurement basis across shots, classically corrects. IBM Estimator resilience_level=1.' },
  { name: 'PS + REM (q[2,4])', error: 0.92, cat: 'readout', plat: 'Tuna-9', color: '#00d4ff', desc: 'Hybrid: parity post-selection for Z-basis + confusion matrix inversion for X/Y-basis.' },
  { name: 'PS + REM (q[6,8])', error: 1.32, cat: 'readout', plat: 'Tuna-9', color: '#00d4ff', desc: 'Same hybrid on different qubits — chemical accuracy despite worse readout on q8.' },
  { name: 'TREX + DD', error: 1.33, cat: 'combo', plat: 'IBM Torino', color: '#ff8c42', desc: 'TREX with dynamical decoupling pulses during idle time. DD overhead exceeds benefit for this 3-gate circuit.' },
  { name: 'Post-selection', error: 1.66, cat: 'parity', plat: 'IBM Torino', color: '#8b5cf6', desc: 'Discard shots violating parity symmetry. Keeps ~95% of data. Simple but effective.' },
  { name: 'DD + Twirl + PS', error: 3.50, cat: 'combo', plat: 'IBM Torino', color: '#ff8c42', desc: 'Kitchen-sink: SamplerV2 + DD + Pauli twirling + post-selection.' },
  { name: 'TREX + 16K shots', error: 3.77, cat: 'combo', plat: 'IBM Torino', color: '#ff8c42', desc: '4x more shots (16384 vs 4096). Noise is systematic not statistical — more data doesn\'t help.' },
  { name: 'Tuna-9 PS only', error: 7.04, cat: 'parity', plat: 'Tuna-9', color: '#8b5cf6', desc: 'Post-selection alone. Catches parity violations but can\'t correct readout bias in X/Y bases.' },
  { name: 'TREX + DD + Twirl', error: 10.0, cat: 'combo', plat: 'IBM Torino', color: '#ff8c42', desc: 'TREX + DD + Pauli twirling. Each addition degrades performance.' },
  { name: 'ZNE', error: 12.84, cat: 'gate', plat: 'IBM Torino', color: '#ff6b9d', desc: 'Zero-noise extrapolation: amplify gate noise, extrapolate to zero. Fails when gates aren\'t the bottleneck.' },
  { name: 'Raw', error: 26.20, cat: 'none', plat: 'IBM Torino', color: '#64748b', desc: 'No mitigation. 26x above chemical accuracy.' },
]

const ERROR_SOURCES = [
  { name: 'Readout errors', pct: 80, color: '#00d4ff' },
  { name: 'Decoherence (T1/T2)', pct: 12, color: '#8b5cf6' },
  { name: 'Gate errors', pct: 5, color: '#ff6b9d' },
  { name: 'State preparation', pct: 3, color: '#ff8c42' },
]

const ZNE_POINTS = [
  { folds: 1, error: 7.70, label: '1 CNOT' },
  { folds: 3, error: 8.62, label: '3 CNOTs' },
  { folds: 5, error: 6.86, label: '5 CNOTs' },
]

// ============================================================
// HELPERS
// ============================================================

function logX(val: number, width: number): number {
  const lo = Math.log10(0.1), hi = Math.log10(30)
  return ((Math.log10(Math.max(val, 0.1)) - lo) / (hi - lo)) * width
}

function MetaphorCallout({ title, children, accent = '#00d4ff' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: `${accent}20`, backgroundColor: `${accent}05` }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: accent }}>Metaphor</span>
      <p className="text-sm text-gray-300 mt-1">
        <span className="font-semibold text-white">{title}</span> — {children}
      </p>
    </div>
  )
}

// ============================================================
// SVG: Noise Histogram Comparison
// ============================================================

function NoiseHistogramSVG() {
  const W = 700, H = 230
  const states = ['|00⟩', '|01⟩', '|10⟩', '|11⟩']
  const ideal = [0, 50, 50, 0]
  const noisy = [4, 44, 45, 7]
  const barW = 38, gap = 14, maxH = 145
  const groupW = 4 * barW + 3 * gap
  const leftStart = (W / 2 - groupW) / 2
  const rightStart = W / 2 + (W / 2 - groupW) / 2

  const renderBars = (data: number[], x0: number, color: string) =>
    data.map((val, i) => {
      const x = x0 + i * (barW + gap)
      const h = (val / 55) * maxH
      return (
        <g key={i}>
          <rect x={x} y={H - 35 - h} width={barW} height={Math.max(h, 0)} fill={color} opacity={0.85} rx={3} />
          {val > 0 && (
            <text x={x + barW / 2} y={H - 35 - h - 6} textAnchor="middle" fill="white" fontSize={11} fontFamily="monospace">{val}%</text>
          )}
          <text x={x + barW / 2} y={H - 16} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace">{states[i]}</text>
        </g>
      )
    })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={W / 2} y1={15} x2={W / 2} y2={H - 5} stroke="#1e293b" strokeWidth={1} strokeDasharray="4,4" />
      <text x={W / 4} y={22} textAnchor="middle" fill="#00ff88" fontSize={13} fontWeight="bold">Ideal (emulator)</text>
      <text x={3 * W / 4} y={22} textAnchor="middle" fill="#ff6b9d" fontSize={13} fontWeight="bold">Real hardware</text>
      {renderBars(ideal, leftStart, '#00ff88')}
      {renderBars(noisy, rightStart, '#ff6b9d')}
      {/* Noise labels */}
      <text x={rightStart + barW / 2} y={H - 35 - (4/55)*maxH - 20} textAnchor="middle" fill="#ff6b9d" fontSize={8} fontFamily="monospace" opacity={0.7}>leaked</text>
      <text x={rightStart + 3 * (barW + gap) + barW / 2} y={H - 35 - (7/55)*maxH - 20} textAnchor="middle" fill="#ff6b9d" fontSize={8} fontFamily="monospace" opacity={0.7}>leaked</text>
    </svg>
  )
}

// ============================================================
// SVG: Mitigation Ladder (hero visualization)
// ============================================================

function MitigationLadderSVG({ hoveredBar, setHoveredBar }: {
  hoveredBar: number | null
  setHoveredBar: (i: number | null) => void
}) {
  const W = 700, barH = 26, gap = 6, labelW = 170, valW = 80
  const chartW = W - labelW - valW - 20
  const H = LADDER.length * (barH + gap) + 60

  const chemX = labelW + logX(CHEM_ACCURACY, chartW)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHoveredBar(null)}>
      {/* Chemical accuracy zone */}
      <rect x={labelW} y={25} width={logX(CHEM_ACCURACY, chartW)} height={LADDER.length * (barH + gap) + 5} fill="#00ff88" opacity={0.04} />
      <line x1={chemX} y1={20} x2={chemX} y2={LADDER.length * (barH + gap) + 35} stroke="#00ff88" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={chemX + 4} y={18} fill="#00ff88" fontSize={9} fontFamily="monospace">1 kcal/mol (chemical accuracy)</text>

      {/* Bars */}
      {LADDER.map((d, i) => {
        const y = 30 + i * (barH + gap)
        const w = logX(d.error, chartW)
        const isHovered = hoveredBar === i
        const opacity = hoveredBar === null ? 0.85 : isHovered ? 1 : 0.35
        const passCA = d.error <= CHEM_ACCURACY

        return (
          <g key={i} onMouseEnter={() => setHoveredBar(i)} style={{ cursor: 'pointer' }}>
            {/* Hover background */}
            {isHovered && <rect x={0} y={y - 2} width={W} height={barH + 4} fill="white" opacity={0.03} rx={4} />}
            {/* Label */}
            <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" fill={isHovered ? 'white' : '#94a3b8'} fontSize={11} fontFamily="monospace">{d.name}</text>
            {/* Bar */}
            <rect x={labelW} y={y} width={Math.max(w, 4)} height={barH} fill={d.color} opacity={opacity} rx={3} />
            {/* Value */}
            <text x={labelW + w + 8} y={y + barH / 2 + 4} fill={passCA ? '#00ff88' : '#e2e8f0'} fontSize={11} fontWeight={passCA ? 'bold' : 'normal'} fontFamily="monospace">
              {d.error.toFixed(2)} kcal/mol
            </text>
            {/* Platform badge */}
            {isHovered && (
              <text x={W - 5} y={y + barH / 2 + 4} textAnchor="end" fill="#64748b" fontSize={9} fontFamily="monospace">{d.plat}</text>
            )}
          </g>
        )
      })}

      {/* Legend */}
      {[
        { color: '#00ff88', label: 'Readout mitigation' },
        { color: '#8b5cf6', label: 'Parity filtering' },
        { color: '#ff8c42', label: 'Combinations' },
        { color: '#ff6b9d', label: 'Gate mitigation' },
      ].map((item, i) => (
        <g key={i} transform={`translate(${labelW + i * 145}, ${H - 15})`}>
          <rect width={10} height={10} fill={item.color} opacity={0.7} rx={2} />
          <text x={14} y={9} fill="#94a3b8" fontSize={9} fontFamily="monospace">{item.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ============================================================
// SVG: Post-Selection Concept
// ============================================================

function PostSelectionSVG() {
  const W = 700, H = 200
  const cellW = 140, cellH = 70, gap = 20
  const startX = (W - 4 * cellW - 3 * gap) / 2
  const y = 50

  const outcomes = [
    { label: '|00⟩', parity: 'even', pct: 4, action: 'Discard' },
    { label: '|01⟩', parity: 'odd', pct: 44, action: 'Keep' },
    { label: '|10⟩', parity: 'odd', pct: 45, action: 'Keep' },
    { label: '|11⟩', parity: 'even', pct: 7, action: 'Discard' },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={22} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">
        H₂ ground state has odd parity — one qubit up, one down
      </text>
      {outcomes.map((o, i) => {
        const x = startX + i * (cellW + gap)
        const isKeep = o.parity === 'odd'
        const borderColor = isKeep ? '#00ff88' : '#ff6b9d'
        const bg = isKeep ? '#00ff8808' : '#ff6b9d08'
        return (
          <g key={i}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={8} fill={bg} stroke={borderColor} strokeWidth={1.5} />
            <text x={x + cellW / 2} y={y + 25} textAnchor="middle" fill="white" fontSize={16} fontFamily="monospace" fontWeight="bold">{o.label}</text>
            <text x={x + cellW / 2} y={y + 45} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="monospace">{o.pct}% of shots</text>
            <text x={x + cellW / 2} y={y + cellH + 22} textAnchor="middle" fill={borderColor} fontSize={11} fontWeight="bold" fontFamily="monospace">{o.action}</text>
            <text x={x + cellW / 2} y={y + cellH + 36} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">{o.parity} parity</text>
          </g>
        )
      })}
      {/* Result */}
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        <tspan fill="#00ff88" fontWeight="bold">89% kept</tspan> — discard 11% noise, renormalize remaining shots
      </text>
    </svg>
  )
}

// ============================================================
// SVG: Confusion Matrix / Readout Calibration
// ============================================================

function ConfusionMatrixSVG({ readoutError, setReadoutError }: {
  readoutError: number
  setReadoutError: (v: number) => void
}) {
  const W = 700, H = 300
  const eps0 = readoutError * 0.15   // 0→1 error (typically small)
  const eps1 = readoutError * 1.0     // 1→0 error (typically large, asymmetric)
  const p00 = 1 - eps0 / 100
  const p01 = eps0 / 100
  const p10 = eps1 / 100
  const p11 = 1 - eps1 / 100

  // Matrix cell positions
  const mx = 80, my = 60, cw = 100, ch = 60

  // Simulated correction example
  const rawP0 = 0.55  // raw measurement: too many 0s (due to 1→0 error)
  const rawP1 = 0.45
  // After inversion: approximately corrected
  const det = p00 * p11 - p01 * p10
  const corrP0 = det !== 0 ? (p11 * rawP0 - p01 * rawP1) / det : rawP0
  const corrP1 = det !== 0 ? (p00 * rawP1 - p10 * rawP0) / det : rawP1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Title */}
      <text x={mx + cw} y={30} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">Confusion Matrix</text>
      <text x={mx + cw} y={45} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">P(measured | prepared)</text>

      {/* Headers */}
      <text x={mx + cw / 2} y={my - 5} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace">Meas. 0</text>
      <text x={mx + cw + cw / 2} y={my - 5} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace">Meas. 1</text>
      <text x={mx - 8} y={my + ch / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize={10} fontFamily="monospace">Prep |0⟩</text>
      <text x={mx - 8} y={my + ch + ch / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize={10} fontFamily="monospace">Prep |1⟩</text>

      {/* Matrix cells */}
      {[
        { r: 0, c: 0, val: p00, good: true },
        { r: 0, c: 1, val: p01, good: false },
        { r: 1, c: 0, val: p10, good: false },
        { r: 1, c: 1, val: p11, good: true },
      ].map(({ r, c, val, good }) => {
        const x = mx + c * cw, y2 = my + r * ch
        return (
          <g key={`${r}${c}`}>
            <rect x={x} y={y2} width={cw} height={ch} fill={good ? '#00ff8808' : '#ff6b9d08'} stroke={good ? '#00ff8830' : '#ff6b9d30'} strokeWidth={1} />
            <text x={x + cw / 2} y={y2 + ch / 2 + 5} textAnchor="middle" fill={good ? '#00ff88' : '#ff6b9d'} fontSize={16} fontWeight="bold" fontFamily="monospace">
              {(val * 100).toFixed(1)}%
            </text>
          </g>
        )
      })}

      {/* Asymmetry callout */}
      <text x={mx + cw + cw / 2} y={my + 2 * ch + 25} textAnchor="middle" fill="#ff6b9d" fontSize={9} fontFamily="monospace" opacity={eps1 > 3 ? 1 : 0.3}>
        {eps1 > 3 ? `← ${(eps1).toFixed(1)}% of |1⟩ readings flip to 0 (asymmetric!)` : 'Low error'}
      </text>

      {/* Right side: correction concept */}
      <text x={460} y={30} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">Correction</text>

      {/* Raw distribution */}
      <text x={380} y={my + 10} fill="#94a3b8" fontSize={10} fontFamily="monospace">Raw:</text>
      <rect x={380} y={my + 16} width={70} height={22} fill="#ff6b9d" opacity={0.2} rx={3} stroke="#ff6b9d30" strokeWidth={1} />
      <text x={415} y={my + 31} textAnchor="middle" fill="#ff6b9d" fontSize={11} fontFamily="monospace">{(rawP0 * 100).toFixed(0)}% |0⟩</text>
      <rect x={460} y={my + 16} width={70} height={22} fill="#ff6b9d" opacity={0.2} rx={3} stroke="#ff6b9d30" strokeWidth={1} />
      <text x={495} y={my + 31} textAnchor="middle" fill="#ff6b9d" fontSize={11} fontFamily="monospace">{(rawP1 * 100).toFixed(0)}% |1⟩</text>

      {/* Arrow */}
      <text x={460} y={my + 65} textAnchor="middle" fill="#00d4ff" fontSize={11} fontFamily="monospace">C⁻¹ × p_raw =</text>

      {/* Corrected distribution */}
      <text x={380} y={my + 90} fill="#94a3b8" fontSize={10} fontFamily="monospace">Fixed:</text>
      <rect x={380} y={my + 96} width={70} height={22} fill="#00ff88" opacity={0.2} rx={3} stroke="#00ff8830" strokeWidth={1} />
      <text x={415} y={my + 111} textAnchor="middle" fill="#00ff88" fontSize={11} fontFamily="monospace">{(Math.max(0, corrP0) * 100).toFixed(0)}% |0⟩</text>
      <rect x={460} y={my + 96} width={70} height={22} fill="#00ff88" opacity={0.2} rx={3} stroke="#00ff8830" strokeWidth={1} />
      <text x={495} y={my + 111} textAnchor="middle" fill="#00ff88" fontSize={11} fontFamily="monospace">{(Math.min(1, corrP1) * 100).toFixed(0)}% |1⟩</text>

      {/* Insight */}
      <text x={460} y={my + 145} textAnchor="middle" fill="#94a3b8" fontSize={10}>
        Calibrate the error → invert it → correct all measurements
      </text>

      {/* Our data callout */}
      <rect x={340} y={H - 55} width={320} height={40} rx={6} fill="#00d4ff08" stroke="#00d4ff20" strokeWidth={1} />
      <text x={500} y={H - 32} textAnchor="middle" fill="#00d4ff" fontSize={10} fontFamily="monospace">
        Tuna-9 q2: 0.7% (0→1) vs 8.5% (1→0) — highly asymmetric
      </text>
    </svg>
  )
}

// ============================================================
// SVG: Error Budget
// ============================================================

function ErrorBudgetSVG() {
  const W = 700, H = 130
  const barX = 40, barW = 560, barH = 50, barY = 40

  let cumX = barX
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={22} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">
        Where does the error come from? (Tuna-9, H₂ VQE)
      </text>
      {ERROR_SOURCES.map((s, i) => {
        const w = (s.pct / 100) * barW
        const x = cumX
        cumX += w
        return (
          <g key={i}>
            <rect x={x} y={barY} width={w} height={barH} fill={s.color} opacity={0.7} rx={i === 0 ? 6 : 0} />
            {w > 50 && (
              <>
                <text x={x + w / 2} y={barY + 22} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold" fontFamily="monospace">{s.pct}%</text>
                <text x={x + w / 2} y={barY + 38} textAnchor="middle" fill="white" fontSize={9} fontFamily="monospace" opacity={0.8}>{s.name}</text>
              </>
            )}
            {w <= 50 && w > 25 && (
              <text x={x + w / 2} y={barY + 30} textAnchor="middle" fill="white" fontSize={9} fontFamily="monospace">{s.pct}%</text>
            )}
            {/* Labels below for small segments */}
            {w <= 50 && (
              <text x={x + w / 2} y={barY + barH + 18} textAnchor="middle" fill={s.color} fontSize={9} fontFamily="monospace">{s.name} ({s.pct}%)</text>
            )}
          </g>
        )
      })}
      {/* Last bar rounded corner */}
      <rect x={cumX - 1} y={barY} width={1} height={barH} fill={ERROR_SOURCES[ERROR_SOURCES.length - 1].color} opacity={0.7} rx={0} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fill="#94a3b8" fontSize={10}>
        Readout errors dominate — which is why readout mitigation techniques win
      </text>
    </svg>
  )
}

// ============================================================
// SVG: ZNE Flat Trend
// ============================================================

function ZNETrendSVG() {
  const W = 700, H = 250
  const px = 100, py = 30, pw = 500, ph = 160

  // Scale: x = folds (0-6), y = error (0-15 kcal/mol)
  const scaleX = (f: number) => px + (f / 6) * pw
  const scaleY = (e: number) => py + ph - (e / 15) * ph

  // Expected trend (if gates dominated): linear from 5 to 15
  const expectedPts = [1, 2, 3, 4, 5].map(f => `${scaleX(f)},${scaleY(5 + f * 2)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Axes */}
      <line x1={px} y1={py} x2={px} y2={py + ph} stroke="#1e293b" strokeWidth={1} />
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} stroke="#1e293b" strokeWidth={1} />

      {/* Y axis labels */}
      {[0, 5, 10, 15].map(v => (
        <g key={v}>
          <text x={px - 8} y={scaleY(v) + 4} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="monospace">{v}</text>
          <line x1={px} y1={scaleY(v)} x2={px + pw} y2={scaleY(v)} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2,4" />
        </g>
      ))}
      <text x={px - 50} y={py + ph / 2} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace" transform={`rotate(-90, ${px - 50}, ${py + ph / 2})`}>kcal/mol</text>

      {/* X axis labels */}
      {[1, 3, 5].map(f => (
        <text key={f} x={scaleX(f)} y={py + ph + 18} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace">{f}x CNOT</text>
      ))}

      {/* Chemical accuracy line */}
      <line x1={px} y1={scaleY(CHEM_ACCURACY)} x2={px + pw} y2={scaleY(CHEM_ACCURACY)} stroke="#00ff88" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      <text x={px + pw + 5} y={scaleY(CHEM_ACCURACY) + 3} fill="#00ff88" fontSize={8} fontFamily="monospace">1 kcal/mol</text>

      {/* Expected trend (dashed) */}
      <polyline points={expectedPts} fill="none" stroke="#ff6b9d" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.4} />
      <text x={scaleX(5) + 10} y={scaleY(15) + 15} fill="#ff6b9d" fontSize={9} opacity={0.5}>Expected if gates dominated</text>

      {/* Actual data points */}
      {ZNE_POINTS.map((p, i) => (
        <g key={i}>
          <circle cx={scaleX(p.folds)} cy={scaleY(p.error)} r={6} fill="#00d4ff" opacity={0.9} />
          <text x={scaleX(p.folds)} y={scaleY(p.error) - 12} textAnchor="middle" fill="#00d4ff" fontSize={11} fontWeight="bold" fontFamily="monospace">
            {p.error.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Actual trend line (flat) */}
      <line x1={scaleX(1)} y1={scaleY(7.73)} x2={scaleX(5)} y2={scaleY(7.73)} stroke="#00d4ff" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.6} />

      {/* Annotation */}
      <text x={W / 2} y={H - 10} textAnchor="middle" fill="#94a3b8" fontSize={10}>
        Flat trend: adding 4 extra CNOTs barely changes the error. Gate noise is NOT the bottleneck.
      </text>
    </svg>
  )
}

// ============================================================
// SVG: Coefficient Amplification
// ============================================================

function AmplificationSVG() {
  const W = 700, H = 280
  const px = 80, py = 30, pw = 520, ph = 180

  const scaleX = (r: number) => px + ((r - 2) / 8) * pw
  const scaleY = (e: number) => py + ph - (e / 6) * ph

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Axes */}
      <line x1={px} y1={py} x2={px} y2={py + ph} stroke="#1e293b" strokeWidth={1} />
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} stroke="#1e293b" strokeWidth={1} />

      {/* Y axis */}
      {[0, 1, 2, 3, 4, 5].map(v => (
        <g key={v}>
          <text x={px - 8} y={scaleY(v) + 4} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="monospace">{v}</text>
          <line x1={px} y1={scaleY(v)} x2={px + pw} y2={scaleY(v)} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2,4" />
        </g>
      ))}
      <text x={px - 55} y={py + ph / 2} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace" transform={`rotate(-90, ${px - 55}, ${py + ph / 2})`}>Error (kcal/mol)</text>

      {/* X axis */}
      {[3, 4, 5, 6, 7, 8, 9].map(v => (
        <text key={v} x={scaleX(v)} y={py + ph + 18} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace">{v}</text>
      ))}
      <text x={px + pw / 2} y={py + ph + 35} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="monospace">|g₁| / |g₄| ratio</text>

      {/* Chemical accuracy zone */}
      <rect x={px} y={scaleY(CHEM_ACCURACY)} width={pw} height={py + ph - scaleY(CHEM_ACCURACY)} fill="#00ff88" opacity={0.04} />
      <line x1={px} y1={scaleY(CHEM_ACCURACY)} x2={px + pw} y2={scaleY(CHEM_ACCURACY)} stroke="#00ff88" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={px + pw + 5} y={scaleY(CHEM_ACCURACY) + 4} fill="#00ff88" fontSize={8} fontFamily="monospace">1 kcal/mol</text>

      {/* Threshold zone */}
      <line x1={scaleX(5)} y1={py} x2={scaleX(5)} y2={py + ph} stroke="#ff8c42" strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
      <text x={scaleX(5) + 5} y={py + 12} fill="#ff8c42" fontSize={9} fontFamily="monospace" opacity={0.6}>threshold ≈ 5</text>

      {/* H2 point */}
      <circle cx={scaleX(4.4)} cy={scaleY(0.22)} r={8} fill="#00ff88" opacity={0.9} />
      <text x={scaleX(4.4)} y={scaleY(0.22) - 14} textAnchor="middle" fill="#00ff88" fontSize={12} fontWeight="bold">H₂</text>
      <text x={scaleX(4.4)} y={scaleY(0.22) + 22} textAnchor="middle" fill="#00ff88" fontSize={9} fontFamily="monospace">0.22 kcal/mol</text>

      {/* HeH+ point */}
      <circle cx={scaleX(7.8)} cy={scaleY(4.45)} r={8} fill="#ff6b9d" opacity={0.9} />
      <text x={scaleX(7.8)} y={scaleY(4.45) - 14} textAnchor="middle" fill="#ff6b9d" fontSize={12} fontWeight="bold">HeH⁺</text>
      <text x={scaleX(7.8)} y={scaleY(4.45) + 22} textAnchor="middle" fill="#ff6b9d" fontSize={9} fontFamily="monospace">4.45 kcal/mol</text>

      {/* Connecting trend */}
      <line x1={scaleX(4.4)} y1={scaleY(0.22)} x2={scaleX(7.8)} y2={scaleY(4.45)} stroke="#64748b" strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />

      {/* Annotation */}
      <text x={W / 2} y={H - 10} textAnchor="middle" fill="#94a3b8" fontSize={10}>
        1.8x higher ratio → 20x worse error. The Hamiltonian structure predicts hardware difficulty.
      </text>
    </svg>
  )
}

// ============================================================
// TECHNIQUE MINI-CARDS
// ============================================================

const TECHNIQUES = [
  {
    name: 'Post-Selection',
    icon: '🎯',
    color: '#8b5cf6',
    how: 'Discard measurement shots that violate a known symmetry (e.g., parity conservation).',
    strength: 'Simple, no calibration needed',
    weakness: 'Only works when you know the symmetry',
    best: '1.66 kcal/mol (IBM)',
  },
  {
    name: 'Readout Error Mitigation',
    icon: '📊',
    color: '#00d4ff',
    how: 'Measure known states (|0⟩, |1⟩) to build a confusion matrix, then invert it to correct all subsequent measurements.',
    strength: 'Corrects systematic readout bias',
    weakness: 'Requires separate calibration circuits',
    best: '0.92 kcal/mol (Tuna-9 hybrid)',
  },
  {
    name: 'TREX',
    icon: '🔀',
    color: '#00ff88',
    how: 'Randomly insert X gates before measurement across many shots, then classically undo the randomization. Averages out readout asymmetry automatically.',
    strength: 'No separate calibration, built into IBM runtime',
    weakness: 'IBM-specific (resilience_level=1)',
    best: '0.22 kcal/mol (IBM)',
  },
  {
    name: 'Zero-Noise Extrapolation',
    icon: '📈',
    color: '#ff6b9d',
    how: 'Run the circuit at multiple amplified noise levels (by inserting extra gates), then extrapolate back to the zero-noise limit.',
    strength: 'Theoretically elegant',
    weakness: 'Fails when gate noise isn\'t the dominant source',
    best: '12.84 kcal/mol (IBM) — did not help',
  },
]

// ============================================================
// KEY TERMS
// ============================================================

const KEY_TERMS = [
  { term: 'Chemical accuracy', def: 'The 1 kcal/mol threshold — accuracy needed for quantum chemistry to be practically useful.' },
  { term: 'Confusion matrix', def: 'A calibration matrix measuring P(measured state | prepared state). Asymmetric errors are common: |1⟩→|0⟩ flips are much more frequent than |0⟩→|1⟩.' },
  { term: 'TREX', def: 'Twirled Readout EXtraction. IBM\'s technique that randomizes measurement basis across shots and classically corrects. resilience_level=1.' },
  { term: 'Post-selection', def: 'Discarding shots that violate known physical constraints (parity, particle number). Trades data for accuracy.' },
  { term: 'Dynamical decoupling', def: 'Sequences of identity-equivalent gate pairs during idle periods to refocus environmental noise. Effective for long idle times.' },
  { term: 'Pauli twirling', def: 'Randomly conjugating noisy gates with Pauli gates to convert coherent errors into stochastic (easier to handle) errors.' },
  { term: 'ZNE', def: 'Zero-noise extrapolation. Amplify noise by gate folding (G → G G† G), measure at multiple levels, extrapolate to zero noise.' },
  { term: 'Readout asymmetry', def: 'The |1⟩→|0⟩ error rate is typically much higher than |0⟩→|1⟩, because excited states can decay during readout.' },
  { term: 'Gate folding', def: 'Replacing a gate G with G G† G (three gates, same ideal effect, 3x gate noise) to amplify noise for ZNE.' },
  { term: 'Coefficient amplification', def: 'Our finding: the ratio |g₁|/|g₄| in the Hamiltonian predicts how much readout errors get amplified into energy errors.' },
]

// ============================================================
// MAIN PAGE
// ============================================================

export default function ErrorMitigationPage() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [readoutError, setReadoutError] = useState(5) // percentage

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav section="Learn" />

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-16">
          <span className="font-mono text-xs text-[#00ff88] tracking-[0.2em] uppercase">Learn</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-3 mb-4 gradient-text-green">
            Error Mitigation
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            15 techniques tested on real hardware across three quantum processors.
            Only readout correction achieves chemical accuracy — and more techniques
            doesn&apos;t mean better results.
          </p>
        </div>

        {/* ============================================ */}
        {/* SECTION 1: The Noise Problem */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">The Noise Problem</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Quantum computers make errors on every shot. For a simple H₂ <Link href="/vqe" className="text-gray-300 hover:underline">VQE</Link> circuit,
            the ideal result is a clean 50/50 split between |01⟩ and |10⟩. Real hardware
            leaks probability into the wrong states — and that leak corrupts the energy.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <NoiseHistogramSVG />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Readout errors', detail: 'The detector misreads 0 as 1 (or vice versa). Largest error source.', color: '#00d4ff' },
              { label: 'Gate errors', detail: 'Imperfect control pulses. Each gate adds a small rotation error.', color: '#ff6b9d' },
              { label: 'Decoherence', detail: 'The qubit loses its quantum state over time (T1 decay, T2 dephasing).', color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-lg border" style={{ borderColor: `${s.color}20`, backgroundColor: `${s.color}05` }}>
                <span className="font-mono text-xs font-bold" style={{ color: s.color }}>{s.label}</span>
                <p className="text-gray-400 text-sm mt-1">{s.detail}</p>
              </div>
            ))}
          </div>

          <MetaphorCallout title="A blurry photograph" accent="#ff6b9d">
            Every measurement is like taking a photo with a shaky camera. Error mitigation
            is computational image stabilization — you can&apos;t eliminate the shake, but you
            can mathematically correct for it if you know how the camera shakes.
          </MetaphorCallout>
        </section>

        {/* ============================================ */}
        {/* SECTION 2: The Error Budget */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">The Error Budget</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            We ran 12 gate-folding experiments on Tuna-9, tripling and quintupling the
            CNOT count. The error barely changed — proving that gate noise contributes
            less than 5% of total error. Readout errors dominate at 80%.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <ErrorBudgetSVG />
          </div>

          <p className="text-gray-500 text-sm mt-4">
            This explains everything: techniques that fix readout (TREX, REM) achieve chemical
            accuracy. Techniques that fix gates (ZNE, DD) barely help. And combining both
            adds overhead without proportional benefit.
          </p>
        </section>

        {/* ============================================ */}
        {/* SECTION 3: The Scoreboard */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">The Scoreboard</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            All 11 configurations we tested on H₂ VQE (R=0.735 Å), ranked from best to worst.
            The dashed green line marks chemical accuracy (1 kcal/mol). Hover for details.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <MitigationLadderSVG hoveredBar={hoveredBar} setHoveredBar={setHoveredBar} />
          </div>

          {/* Hover detail panel */}
          {hoveredBar !== null && (
            <div className="mt-4 p-4 rounded-lg border border-[#1e293b] bg-[#111827]/80">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-bold" style={{ color: LADDER[hoveredBar].color }}>{LADDER[hoveredBar].name}</span>
                <span className="text-gray-500 text-xs font-mono">{LADDER[hoveredBar].plat}</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">{LADDER[hoveredBar].desc}</p>
            </div>
          )}

          <MetaphorCallout title="The kitchen-sink fallacy" accent="#ff8c42">
            Adding more mitigation techniques is like adding more cooks — past a
            point, they get in each other&apos;s way. TREX alone (0.22 kcal/mol) beats TREX + DD + Twirling (10 kcal/mol) by 45x.
          </MetaphorCallout>
        </section>

        {/* ============================================ */}
        {/* SECTION 4: How They Work */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">How They Work</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            The four main techniques, each attacking a different aspect of quantum noise.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TECHNIQUES.map(t => (
              <div key={t.name} className="p-5 rounded-lg border" style={{ borderColor: `${t.color}20`, backgroundColor: `${t.color}05` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-bold text-white">{t.name}</span>
                  <span className="ml-auto font-mono text-xs" style={{ color: t.color }}>{t.best}</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{t.how}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">+ {t.strength}</span>
                </div>
                <div className="flex gap-4 text-xs mt-1">
                  <span className="text-red-400">− {t.weakness}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 5: Post-Selection Deep Dive */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Post-Selection: Parity Filtering</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            The simplest technique. H₂&apos;s ground state has one electron spin-up and one spin-down
            (odd parity). Any shot measuring both qubits the same way is noise — throw it away.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <PostSelectionSVG />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Keep fraction', value: '95-97%', detail: 'Barely loses data', color: '#00ff88' },
              { label: 'IBM result', value: '1.66 kcal/mol', detail: 'Just above chemical accuracy', color: '#8b5cf6' },
              { label: 'Tuna-9 result', value: '7.04 kcal/mol', detail: 'Not enough on its own', color: '#00d4ff' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#111827]/50 border border-[#1e293b]">
                <span className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
                <p className="text-gray-500 text-xs mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 6: Readout Calibration */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Readout Calibration</h2>
          <p className="text-gray-400 mb-4 max-w-2xl">
            Measure known states to learn the detector&apos;s error pattern, then mathematically
            invert it. The key insight: readout errors are highly asymmetric — |1⟩→|0⟩ flips
            are 10x more common than |0⟩→|1⟩.
          </p>

          {/* Slider */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-gray-400 text-sm font-mono whitespace-nowrap">Readout error:</label>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={readoutError}
              onChange={e => setReadoutError(parseFloat(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00ff88, #ff6b9d)`,
              }}
            />
            <span className="font-mono text-sm text-white w-12 text-right">{readoutError.toFixed(1)}%</span>
          </div>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <ConfusionMatrixSVG readoutError={readoutError} setReadoutError={setReadoutError} />
          </div>

          <MetaphorCallout title="Calibrating a bathroom scale" accent="#00d4ff">
            If your scale always reads 2 kg too heavy, you can correct every future
            measurement by subtracting 2. Readout error mitigation does the same thing
            for quantum measurements — but the &ldquo;bias&rdquo; is different for |0⟩ and |1⟩.
          </MetaphorCallout>
        </section>

        {/* ============================================ */}
        {/* SECTION 7: What Didn't Work */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">What Didn&apos;t Work</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Zero-noise extrapolation (ZNE) is theoretically elegant: amplify gate noise
            by repeating gates, measure at multiple noise levels, extrapolate to zero.
            But on our circuits, it fails — because gates aren&apos;t the problem.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <ZNETrendSVG />
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#ff6b9d08] border border-[#ff6b9d15]">
              <span className="text-[#ff6b9d] font-mono text-sm font-bold shrink-0">ZNE</span>
              <p className="text-gray-400 text-sm">12.84 kcal/mol on IBM. 7.24 kcal/mol best extrapolation on Tuna-9. Not useful when readout dominates.</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#ff8c4208] border border-[#ff8c4215]">
              <span className="text-[#ff8c42] font-mono text-sm font-bold shrink-0">Combos</span>
              <p className="text-gray-400 text-sm">TREX alone: 0.22. TREX + DD: 1.33. TREX + DD + Twirl: 10.0. Each addition degraded performance by 6-45x.</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#ff8c4208] border border-[#ff8c4215]">
              <span className="text-[#ff8c42] font-mono text-sm font-bold shrink-0">More shots</span>
              <p className="text-gray-400 text-sm">TREX 4K shots: 0.22 kcal/mol. TREX 16K shots: 3.77 kcal/mol. The noise is systematic, not statistical.</p>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 8: Cross-Platform */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">Across Three Chips</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Different processors have different noise profiles — and different optimal
            mitigation strategies. The best technique on one chip may not transfer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'IBM Torino',
                qubits: 133,
                noise: 'Depolarizing',
                best: 'TREX',
                error: '0.22',
                color: '#00ff88',
                detail: 'Built-in TREX handles readout correction automatically. Adding more techniques (DD, twirling) only adds overhead.',
              },
              {
                name: 'Tuna-9',
                qubits: 9,
                noise: 'Dephasing',
                best: 'PS + REM',
                error: '0.92',
                color: '#00d4ff',
                detail: 'No built-in TREX — manual confusion matrix calibration + parity post-selection reaches chemical accuracy.',
              },
              {
                name: 'IQM Garnet',
                qubits: 20,
                noise: 'Dephasing',
                best: 'REM (pending)',
                error: '—',
                color: '#8b5cf6',
                detail: 'Highest raw gate fidelity (99.82% RB). REM calibration data collected. Full VQE mitigation comparison pending.',
              },
            ].map(p => (
              <div key={p.name} className="p-5 rounded-lg border border-[#1e293b] bg-[#111827]/40">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="text-gray-600 text-xs font-mono">{p.qubits}q</span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-mono text-2xl font-bold" style={{ color: p.color }}>{p.error}</span>
                  <span className="text-gray-500 text-xs">kcal/mol</span>
                </div>
                <div className="mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: p.color, backgroundColor: `${p.color}15`, border: `1px solid ${p.color}25` }}>{p.best}</span>
                  <span className="text-gray-600 text-xs ml-2">{p.noise} noise</span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>

          <MetaphorCallout title="Different hospitals, different treatments" accent="#8b5cf6">
            A treatment that works at one hospital may not work at another with
            different equipment. Quantum error mitigation is the same — you need
            to diagnose each processor individually.
          </MetaphorCallout>
        </section>

        {/* ============================================ */}
        {/* SECTION 9: Coefficient Amplification */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-3 text-white">The Amplification Threshold</h2>
          <p className="text-gray-400 mb-6 max-w-2xl">
            Our unique finding: the ratio of Hamiltonian coefficients |g₁|/|g₄| predicts
            how badly readout errors corrupt the final energy. When this ratio exceeds ~5,
            even the best mitigation can&apos;t achieve chemical accuracy.
          </p>

          <div className="bg-[#111827] rounded-lg border border-[#1e293b] p-6">
            <AmplificationSVG />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[#00ff8808] border border-[#00ff8815]">
              <span className="font-mono text-sm font-bold text-[#00ff88]">H₂ (ratio = 4.4)</span>
              <p className="text-gray-400 text-sm mt-1">
                Below threshold. TREX achieves 0.22 kcal/mol — 119x improvement over raw.
                The Z-coefficient (g₁) is only 4.4x larger than the entangling coefficient (g₄),
                so readout errors in the Z measurement get moderately amplified.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#ff6b9d08] border border-[#ff6b9d15]">
              <span className="font-mono text-sm font-bold text-[#ff6b9d]">HeH⁺ (ratio = 7.8)</span>
              <p className="text-gray-400 text-sm mt-1">
                Above threshold. Best result is 4.45 kcal/mol (IBM) / 4.44 (Tuna-9) — confirmed
                across platforms. 1.8x higher ratio → 20x worse error. The asymmetric electron
                distribution amplifies Z-basis readout errors.
              </p>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-4">
            This means that for larger molecules, the Hamiltonian structure itself determines whether
            current hardware can produce useful results — before you even consider the noise level.
            Tapering and basis rotation to minimize this ratio could be a path to chemical accuracy
            on harder problems.
          </p>
        </section>

        {/* ============================================ */}
        {/* KEY TERMS */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">Key Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KEY_TERMS.map(t => (
              <div key={t.term} className="p-3 rounded-lg bg-[#111827]/60 border border-[#1e293b]">
                <span className="text-white font-semibold text-sm">{t.term}</span>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{t.def}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* REFERENCES */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">References</h2>
          <div className="space-y-2 text-sm">
            {[
              { id: 1, text: 'Sagastizabal et al., "Error mitigation by symmetry verification on a variational quantum eigensolver," Phys. Rev. A 100, 010302(R) (2019)' },
              { id: 2, text: 'Kandala et al., "Hardware-efficient variational quantum eigensolver for small molecules," Nature 549, 242-246 (2017)' },
              { id: 3, text: 'Peruzzo et al., "A variational eigenvalue solver on a photonic quantum processor," Nat. Commun. 5, 4213 (2014)' },
              { id: 4, text: 'Kim et al., "Evidence for the utility of quantum computing before fault tolerance," Nature 618, 500-505 (2023)' },
              { id: 5, text: 'van den Berg et al., "Probabilistic error cancellation with sparse Pauli-Lindblad models," Nat. Phys. 19, 1116-1121 (2023)' },
              { id: 6, text: 'Our experimental data: 100+ runs across IBM Torino, QI Tuna-9, and IQM Garnet (2025-2026)' },
            ].map(r => (
              <p key={r.id} className="text-gray-500">
                <span className="text-gray-400 font-mono mr-2">[{r.id}]</span>
                {r.text}
              </p>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* EXPLORE MORE */}
        {/* ============================================ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-white">Explore More</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/noise', label: 'Noise Channels', desc: 'T₁/T₂ decay and error budgets' },
              { href: '/hamiltonians', label: 'H₂ Hamiltonian', desc: 'The molecule behind these experiments' },
              { href: '/resonance', label: 'Resonance', desc: 'Why qubits respond to specific frequencies' },
              { href: '/ansatz', label: 'Ansatz Explorer', desc: 'The circuits we\'re mitigating' },
              { href: '/experiments', label: 'All Experiments', desc: '100+ runs across 3 backends' },
              { href: '/replications', label: 'Paper Replications', desc: '6 papers, 27 claims tested' },
              { href: '/platforms', label: 'Platform Comparison', desc: 'Tuna-9 vs Garnet vs Torino' },
              { href: '/blog/error-mitigation-showdown', label: 'Mitigation Blog', desc: 'Full write-up with analysis' },
              { href: '/learn', label: 'Glossary', desc: '40+ quantum computing terms' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="p-4 rounded-lg border border-[#1e293b] bg-[#111827]/30 hover:bg-[#111827]/60 transition-all group"
              >
                <span className="text-white text-sm font-medium group-hover:text-[#00ff88] transition-colors">{link.label}</span>
                <span className="block text-gray-500 text-xs mt-0.5">{link.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/50 py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono">haiqu — TU Delft / QuTech</p>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-[#00d4ff] transition-colors">Home</Link>
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <Link href="/learn" className="hover:text-[#8b5cf6] transition-colors">Learn</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
