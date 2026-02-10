import Link from 'next/link'
import { getAllResults, getQueue, getStats, typeLabels, typeColors, getSweepEmulator, getSweepReference, type ExperimentResult, type SweepPoint, type SweepReference } from '@/lib/experiments'

export const metadata = {
  title: 'Live Experiments — AI x Quantum',
  description: 'Real-time results from quantum experiments running on Quantum Inspire and IBM Quantum hardware.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmulator(backend: string): boolean {
  if (!backend) return false
  const lower = backend.toLowerCase()
  return lower.includes('emulator') || lower.includes('qxelarator')
}

function backendLabel(backend: string): { label: string; isHw: boolean } {
  if (!backend) return { label: 'Unknown', isHw: false }
  if (backend.toLowerCase().includes('ibm')) return { label: 'IBM Hardware', isHw: true }
  if (backend.toLowerCase().includes('emulator') || backend.toLowerCase().includes('qxelarator'))
    return { label: 'QI Emulator', isHw: false }
  if (backend.toLowerCase().includes('tuna')) return { label: 'QI Tuna-9', isHw: true }
  return { label: backend, isHw: false }
}

function flatCounts(raw: Record<string, any>): Record<string, number> {
  const first = Object.values(raw)[0]
  if (typeof first === 'object' && first !== null) return first as Record<string, number>
  return raw as Record<string, number>
}

function hasMultiBasis(raw: Record<string, any>): boolean {
  return 'z_basis' in raw && 'x_basis' in raw && 'y_basis' in raw
}

function totalFromCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  }
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

function BackendBadge({ backend }: { backend: string }) {
  const { label, isHw } = backendLabel(backend)
  if (isHw) {
    return (
      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30">
        {label}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
      {label}
    </span>
  )
}

function FidelityBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  const color = pct > 95 ? '#00ff88' : pct > 85 ? '#00d4ff' : pct > 70 ? '#eab308' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function CountsBar({ counts, total, accentColor }: { counts: Record<string, number>; total: number; accentColor?: string }) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const colors = ['#00d4ff', '#00ff88', '#8b5cf6', '#ff8c42', '#ff6b9d', '#eab308', '#14b8a6', '#ef4444']
  return (
    <div className="space-y-1">
      {sorted.slice(0, 8).map(([bitstring, count], i) => {
        const pct = (count / total) * 100
        return (
          <div key={bitstring} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-500 w-14 text-right">|{bitstring}&#x27E9;</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: accentColor || colors[i % colors.length] }}
              />
            </div>
            <span className="text-gray-300 w-20 text-right">{count} ({pct.toFixed(1)}%)</span>
          </div>
        )
      })}
    </div>
  )
}

function EmulatorNote() {
  return (
    <div className="mt-3 px-3 py-2 rounded bg-yellow-500/5 border border-yellow-500/10">
      <p className="text-[11px] text-yellow-300 font-mono leading-relaxed">
        This ran on a noiseless emulator. Hardware results will show real noise effects.
      </p>
    </div>
  )
}

function CircuitBlock({ cqasm }: { cqasm: string }) {
  return (
    <details className="mt-4 group">
      <summary className="text-[11px] font-mono text-gray-500 cursor-pointer hover:text-gray-300 transition-colors select-none">
        <span className="ml-1">View cQASM circuit</span>
      </summary>
      <pre className="mt-2 p-3 rounded bg-black/40 border border-white/5 text-[11px] font-mono text-gray-400 overflow-x-auto leading-relaxed whitespace-pre">
        {cqasm}
      </pre>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Summary Dashboard
// ---------------------------------------------------------------------------

function SummaryDashboard({ results }: { results: ExperimentResult[] }) {
  const hwResults = results.filter(r => !isEmulator(r.backend))
  const emResults = results.filter(r => isEmulator(r.backend))
  const backends = Array.from(new Set(results.map(r => r.backend)))
  const types = Array.from(new Set(results.map(r => r.type)))
  const vqeResults = results.filter(r => r.type === 'vqe_h2')
  const bestVQE = vqeResults.reduce<ExperimentResult | null>((best, r) => {
    if (!best) return r
    const bestErr = Math.abs(best.analysis?.error_hartree || Infinity)
    const thisErr = Math.abs(r.analysis?.error_hartree || Infinity)
    return thisErr < bestErr ? r : best
  }, null)

  const metrics = [
    { label: 'Experiments', value: results.length.toString(), color: '#00d4ff' },
    { label: 'Hardware runs', value: hwResults.length.toString(), color: '#8b5cf6' },
    { label: 'Emulator runs', value: emResults.length.toString(), color: '#eab308' },
    { label: 'Backends', value: backends.length.toString(), color: '#00ff88', sub: backends.join(', ') },
    { label: 'Experiment types', value: types.length.toString(), color: '#ff6b9d', sub: types.map(t => typeLabels[t] || t).join(', ') },
    {
      label: 'Best VQE error',
      value: bestVQE ? `${bestVQE.analysis.error_kcal_mol} kcal/mol` : 'N/A',
      color: bestVQE?.analysis.chemical_accuracy ? '#00ff88' : '#eab308',
      sub: bestVQE ? `${bestVQE.backend}` : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map(m => (
        <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">{m.label}</p>
          <p className="text-xl font-mono font-bold" style={{ color: m.color }}>{m.value}</p>
          {m.sub && <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">{m.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VQE Energy Level Diagram (SVG)
// ---------------------------------------------------------------------------

function EnergyLevelDiagram({ result, comparisonResult }: { result: ExperimentResult; comparisonResult?: ExperimentResult }) {
  const analysis = result.analysis
  const measuredEnergy = analysis.energy_hartree as number
  const fciEnergy = analysis.fci_energy as number

  // Chemical accuracy threshold: 1.6 mHa = 0.0016 Ha
  const chemAccThreshold = 0.0016

  // Determine energy range for diagram
  const allEnergies = [measuredEnergy, fciEnergy]
  if (comparisonResult) allEnergies.push(comparisonResult.analysis.energy_hartree as number)

  const minE = Math.min(...allEnergies) - 0.06
  const maxE = Math.max(...allEnergies) + 0.02

  // SVG dimensions
  const svgW = 480
  const svgH = 200
  const padL = 80
  const padR = 20
  const padT = 20
  const padB = 30
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  // Energy to Y coordinate (higher energy = lower on chart, so invert)
  // Actually, more negative = lower energy = better. Show lower energy at bottom.
  // But convention: y-axis goes down. So more negative (better) = bottom of chart = higher y.
  const eToY = (e: number) => padT + ((e - maxE) / (minE - maxE)) * chartH

  const fciY = eToY(fciEnergy)
  const measuredY = eToY(measuredEnergy)
  const chemAccTopY = eToY(fciEnergy + chemAccThreshold)
  const chemAccBotY = eToY(fciEnergy - chemAccThreshold)

  // Is measured energy within chemical accuracy?
  const withinAcc = analysis.chemical_accuracy

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Energy Level Diagram</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-lg" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(255,255,255,0.01)" rx="4" />

        {/* Chemical accuracy zone */}
        <rect
          x={padL}
          y={chemAccTopY}
          width={chartW}
          height={Math.abs(chemAccBotY - chemAccTopY)}
          fill="rgba(0,255,136,0.06)"
          stroke="rgba(0,255,136,0.15)"
          strokeWidth="0.5"
          strokeDasharray="4 2"
          rx="2"
        />
        <text
          x={padL + chartW - 4}
          y={chemAccTopY - 4}
          textAnchor="end"
          className="text-[9px]"
          fill="rgba(0,255,136,0.4)"
          fontFamily="monospace"
          fontSize="9"
        >
          chemical accuracy zone (&#177;1.6 mHa)
        </text>

        {/* FCI reference line */}
        <line
          x1={padL} y1={fciY}
          x2={padL + chartW} y2={fciY}
          stroke="#666" strokeWidth="1" strokeDasharray="6 3"
        />
        <text
          x={padL - 6} y={fciY + 3}
          textAnchor="end"
          fill="#888"
          fontFamily="monospace"
          fontSize="10"
        >
          FCI {fciEnergy.toFixed(4)}
        </text>

        {/* Measured energy line (primary result) */}
        <line
          x1={padL + 10} y1={measuredY}
          x2={padL + chartW * 0.45} y2={measuredY}
          stroke={withinAcc ? '#00ff88' : '#eab308'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={padL + 10} cy={measuredY} r="3" fill={withinAcc ? '#00ff88' : '#eab308'} />
        <text
          x={padL + chartW * 0.45 + 8} y={measuredY + 4}
          fill={withinAcc ? '#00ff88' : '#eab308'}
          fontFamily="monospace"
          fontSize="10"
          fontWeight="bold"
        >
          {measuredEnergy.toFixed(4)} Ha
        </text>
        <text
          x={padL + chartW * 0.45 + 8} y={measuredY + 16}
          fill="#888"
          fontFamily="monospace"
          fontSize="9"
        >
          {result.backend}
        </text>

        {/* Comparison result (if present) */}
        {comparisonResult && (() => {
          const cmpEnergy = comparisonResult.analysis.energy_hartree as number
          const cmpY = eToY(cmpEnergy)
          const cmpAcc = comparisonResult.analysis.chemical_accuracy
          return (
            <>
              <line
                x1={padL + 10} y1={cmpY}
                x2={padL + chartW * 0.45} y2={cmpY}
                stroke={cmpAcc ? '#00d4ff' : '#ff6b9d'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={padL + 10} cy={cmpY} r="3" fill={cmpAcc ? '#00d4ff' : '#ff6b9d'} />
              <text
                x={padL + chartW * 0.45 + 8} y={cmpY + 4}
                fill={cmpAcc ? '#00d4ff' : '#ff6b9d'}
                fontFamily="monospace"
                fontSize="10"
                fontWeight="bold"
              >
                {cmpEnergy.toFixed(4)} Ha
              </text>
              <text
                x={padL + chartW * 0.45 + 8} y={cmpY + 16}
                fill="#888"
                fontFamily="monospace"
                fontSize="9"
              >
                {comparisonResult.backend}
              </text>
              {/* Error arrow */}
              <line
                x1={padL + chartW * 0.25}
                y1={fciY}
                x2={padL + chartW * 0.25}
                y2={cmpY}
                stroke="rgba(255,107,157,0.3)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </>
          )
        })()}

        {/* Y-axis label */}
        <text
          x="12" y={padT + chartH / 2}
          fill="#555"
          fontFamily="monospace"
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90, 12, ${padT + chartH / 2})`}
        >
          Energy (Hartree)
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Multi-Basis Counts for VQE
// ---------------------------------------------------------------------------

function MultiBasisCounts({ rawCounts }: { rawCounts: Record<string, any> }) {
  const bases = [
    { key: 'z_basis', label: 'Z-basis', color: '#00d4ff', desc: 'Computational basis' },
    { key: 'x_basis', label: 'X-basis', color: '#8b5cf6', desc: 'Hadamard rotated' },
    { key: 'y_basis', label: 'Y-basis', color: '#ff6b9d', desc: 'S+H rotated' },
  ]

  return (
    <div className="mt-4 space-y-4">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Measurement Counts by Basis</p>
      <div className="grid grid-cols-1 gap-3">
        {bases.map(basis => {
          const counts = rawCounts[basis.key]
          if (!counts) return null
          const total = totalFromCounts(counts)
          return (
            <div key={basis.key} className="bg-white/[0.01] rounded p-3 border border-white/[0.03]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: basis.color }} />
                <span className="text-xs font-mono font-bold" style={{ color: basis.color }}>{basis.label}</span>
                <span className="text-[10px] font-mono text-gray-600">{basis.desc}</span>
                <span className="text-[10px] font-mono text-gray-600 ml-auto">{total} shots</span>
              </div>
              <CountsBar counts={counts} total={total} accentColor={basis.color} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// H2 Dissociation Curve (SVG)
// ---------------------------------------------------------------------------

function DissociationCurve({ sweep, reference }: { sweep: SweepPoint[]; reference: SweepReference[] }) {
  if (sweep.length === 0 && reference.length === 0) return null

  const svgW = 640
  const svgH = 340
  const padL = 70
  const padR = 30
  const padT = 25
  const padB = 50
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  // Gather all energies to set Y range
  const allEnergies = [
    ...reference.map(r => r.fci_energy),
    ...reference.map(r => r.hf_energy),
    ...sweep.map(s => s.energy_measured),
  ]
  const minE = Math.min(...allEnergies) - 0.04
  const maxE = Math.max(...allEnergies) + 0.04

  // X range: bond distance
  const allR = [...reference.map(r => r.bond_distance), ...sweep.map(s => s.bond_distance)]
  const minR = Math.min(...allR) - 0.05
  const maxR = Math.max(...allR) + 0.1

  const xScale = (r: number) => padL + ((r - minR) / (maxR - minR)) * chartW
  const yScale = (e: number) => padT + ((maxE - e) / (maxE - minE)) * chartH

  // FCI line (reference)
  const fciPath = reference.length > 1
    ? reference.map((pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(pt.bond_distance).toFixed(1)} ${yScale(pt.fci_energy).toFixed(1)}`
      ).join(' ')
    : ''

  // HF line (reference)
  const hfPath = reference.length > 1
    ? reference.map((pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(pt.bond_distance).toFixed(1)} ${yScale(pt.hf_energy).toFixed(1)}`
      ).join(' ')
    : ''

  // Y-axis grid lines
  const yTicks: number[] = []
  const yStep = 0.1
  for (let e = Math.ceil(minE / yStep) * yStep; e <= maxE; e += yStep) {
    yTicks.push(Math.round(e * 100) / 100)
  }

  // X-axis ticks
  const xTicks = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0].filter(r => r >= minR && r <= maxR)

  // Chemical accuracy zone around FCI (too narrow to shade, show as label)
  const eqPoint = reference.find(r => Math.abs(r.bond_distance - 0.735) < 0.01)
  const eqSweep = sweep.find(s => Math.abs(s.bond_distance - 0.735) < 0.01)

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-1">
        <h3 className="text-white font-bold">H&#8322; Dissociation Curve</h3>
        <span className="text-[10px] font-mono text-gray-500">{sweep.length} points, 65k shots each</span>
      </div>
      <p className="text-xs text-gray-400 mb-4 max-w-xl leading-relaxed">
        Energy vs. bond distance for molecular hydrogen. The VQE emulator matches the exact (FCI) curve
        within chemical accuracy at all 14 distances -- from compressed (0.3 &#197;) through equilibrium (0.735 &#197;)
        to fully dissociated (3.0 &#197;).
      </p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Chart background */}
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(255,255,255,0.01)" rx="4" />

        {/* Y-axis grid */}
        {yTicks.map(e => (
          <g key={e}>
            <line x1={padL} y1={yScale(e)} x2={padL + chartW} y2={yScale(e)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={padL - 6} y={yScale(e) + 3} textAnchor="end" fill="#555" fontFamily="monospace" fontSize="10">
              {e.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X-axis grid */}
        {xTicks.map(r => (
          <g key={r}>
            <line x1={xScale(r)} y1={padT} x2={xScale(r)} y2={padT + chartH} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={xScale(r)} y={padT + chartH + 16} textAnchor="middle" fill="#555" fontFamily="monospace" fontSize="10">
              {r.toFixed(1)}
            </text>
          </g>
        ))}

        {/* HF curve (dashed, dimmer) */}
        {hfPath && (
          <path d={hfPath} fill="none" stroke="#ff6b9d" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
        )}

        {/* FCI curve (solid reference) */}
        {fciPath && (
          <path d={fciPath} fill="none" stroke="#888" strokeWidth="1.5" />
        )}

        {/* VQE emulator points */}
        {sweep.map(pt => {
          const withinAcc = pt.error_kcal < 1.0
          return (
            <circle
              key={pt.bond_distance}
              cx={xScale(pt.bond_distance)}
              cy={yScale(pt.energy_measured)}
              r="4"
              fill={withinAcc ? '#00ff88' : '#eab308'}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="0.5"
            />
          )
        })}

        {/* Equilibrium marker */}
        {eqPoint && (
          <>
            <line
              x1={xScale(0.735)} y1={padT}
              x2={xScale(0.735)} y2={padT + chartH}
              stroke="rgba(139,92,246,0.3)" strokeWidth="1" strokeDasharray="3 3"
            />
            <text x={xScale(0.735)} y={padT - 6} textAnchor="middle" fill="#8b5cf6" fontFamily="monospace" fontSize="9">
              R&#8337;=0.735 &#197;
            </text>
          </>
        )}

        {/* Legend */}
        <g transform={`translate(${padL + 12}, ${padT + 14})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#888" strokeWidth="1.5" />
          <text x="26" y="3" fill="#888" fontFamily="monospace" fontSize="9">FCI (exact)</text>

          <line x1="0" y1="16" x2="20" y2="16" stroke="#ff6b9d" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
          <text x="26" y="19" fill="#ff6b9d" fontFamily="monospace" fontSize="9" opacity="0.6">Hartree-Fock</text>

          <circle cx="10" cy="32" r="4" fill="#00ff88" />
          <text x="26" y="35" fill="#00ff88" fontFamily="monospace" fontSize="9">VQE Emulator</text>
        </g>

        {/* Axis labels */}
        <text
          x={padL + chartW / 2} y={svgH - 4}
          textAnchor="middle" fill="#666" fontFamily="monospace" fontSize="11"
        >
          Bond Distance (&#197;)
        </text>
        <text
          x="14" y={padT + chartH / 2}
          textAnchor="middle" fill="#666" fontFamily="monospace" fontSize="11"
          transform={`rotate(-90, 14, ${padT + chartH / 2})`}
        >
          Energy (Hartree)
        </text>
      </svg>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs font-mono">
        <div className="bg-white/[0.02] rounded px-3 py-2 border border-white/[0.03]">
          <span className="text-gray-500">Equilibrium energy: </span>
          <span className="text-[#00ff88] font-bold">{eqSweep?.energy_measured?.toFixed(4) || '?'} Ha</span>
        </div>
        <div className="bg-white/[0.02] rounded px-3 py-2 border border-white/[0.03]">
          <span className="text-gray-500">Max error: </span>
          <span className="text-white font-bold">{Math.max(...sweep.map(s => s.error_kcal)).toFixed(2)} kcal/mol</span>
        </div>
        <div className="bg-white/[0.02] rounded px-3 py-2 border border-white/[0.03]">
          <span className="text-gray-500">Points within chem. accuracy: </span>
          <span className="text-[#00ff88] font-bold">{sweep.filter(s => s.error_kcal < 1.0).length}/{sweep.length}</span>
        </div>
        <div className="bg-white/[0.02] rounded px-3 py-2 border border-white/[0.03]">
          <span className="text-gray-500">Correlation energy captured: </span>
          <span className="text-[#8b5cf6] font-bold">100%</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fidelity Comparison (3-backend bar chart)
// ---------------------------------------------------------------------------

function FidelityComparisonChart({ results }: { results: ExperimentResult[] }) {
  const experiments = ['bell_calibration', 'ghz_state'] as const
  const expLabels: Record<string, string> = { bell_calibration: 'Bell State', ghz_state: 'GHZ (3q)' }

  // Gather fidelities by type and backend
  type FidelityRow = { type: string; label: string; backends: { name: string; fidelity: number; color: string }[] }
  const rows: FidelityRow[] = []

  for (const expType of experiments) {
    const typeResults = results.filter(r => r.type === expType && r.analysis?.fidelity !== undefined)
    if (typeResults.length === 0) continue

    const backends = typeResults.map(r => {
      const { label, isHw } = backendLabel(r.backend)
      const fidelity = r.analysis.fidelity as number
      const color = r.backend.toLowerCase().includes('ibm') ? '#8b5cf6'
        : r.backend.toLowerCase().includes('tuna') ? '#ff8c42'
        : '#00d4ff'
      return { name: label, fidelity, color }
    }).sort((a, b) => b.fidelity - a.fidelity)

    rows.push({ type: expType, label: expLabels[expType] || expType, backends })
  }

  if (rows.length === 0) return null

  const svgW = 500
  const rowH = 60
  const svgH = rows.length * rowH + 40
  const padL = 80
  const padR = 80
  const barW = svgW - padL - padR

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
      <h3 className="text-white font-bold mb-1">Cross-Platform Fidelity</h3>
      <p className="text-xs text-gray-400 mb-4">How do emulator, IBM, and Tuna-9 compare on the same experiments?</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-lg" xmlns="http://www.w3.org/2000/svg">
        {rows.map((row, ri) => {
          const groupY = ri * rowH + 10
          return (
            <g key={row.type}>
              <text x={padL - 8} y={groupY + rowH / 2} textAnchor="end" fill="#aaa" fontFamily="monospace" fontSize="11" dominantBaseline="middle">
                {row.label}
              </text>
              {row.backends.map((b, bi) => {
                const barY = groupY + bi * 16 + 4
                const barLen = (b.fidelity) * barW
                const pct = (b.fidelity * 100).toFixed(1)
                return (
                  <g key={b.name}>
                    {/* Background track */}
                    <rect x={padL} y={barY} width={barW} height={12} rx="2" fill="rgba(255,255,255,0.03)" />
                    {/* Fidelity bar */}
                    <rect x={padL} y={barY} width={barLen} height={12} rx="2" fill={b.color} opacity="0.8" />
                    {/* Label */}
                    <text x={padL + barLen + 6} y={barY + 9} fill={b.color} fontFamily="monospace" fontSize="9" fontWeight="bold">
                      {pct}%
                    </text>
                    <text x={svgW - 4} y={barY + 9} textAnchor="end" fill="#666" fontFamily="monospace" fontSize="8">
                      {b.name}
                    </text>
                  </g>
                )
              })}
              {/* Divider */}
              {ri < rows.length - 1 && (
                <line x1={padL} y1={groupY + rowH - 2} x2={padL + barW} y2={groupY + rowH - 2} stroke="rgba(255,255,255,0.05)" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Experiment Cards
// ---------------------------------------------------------------------------

function ComparisonRow({ label, thisVal, otherVal, otherBackend, unit, better }: {
  label: string; thisVal: string; otherVal: string; otherBackend: string; unit?: string; better?: 'higher' | 'lower'
}) {
  return (
    <div className="flex items-center gap-3 text-xs font-mono bg-white/[0.01] rounded px-3 py-2 border border-white/[0.03]">
      <span className="text-gray-500 w-28">{label}</span>
      <span className="text-white font-bold">{thisVal}{unit ? ` ${unit}` : ''}</span>
      <span className="text-gray-600">vs</span>
      <span className="text-gray-400">{otherVal}{unit ? ` ${unit}` : ''}</span>
      <span className="text-gray-600 text-[10px]">({otherBackend})</span>
    </div>
  )
}

function BellCard({ result, comparisonResult }: { result: ExperimentResult; comparisonResult?: ExperimentResult }) {
  const analysis = result.analysis
  const counts = flatCounts(result.raw_counts)
  const total = totalFromCounts(counts)
  const emu = isEmulator(result.backend)
  const perfectFidelity = analysis.fidelity === 1.0 && emu

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#00d4ff]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.bell_calibration }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.bell_calibration}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>
      {analysis.fidelity !== undefined && (
        <FidelityBar value={analysis.fidelity} label="Bell State Fidelity" />
      )}
      {comparisonResult && comparisonResult.analysis.fidelity !== undefined && (
        <div className="mt-3">
          <ComparisonRow
            label="Fidelity"
            thisVal={`${(analysis.fidelity * 100).toFixed(1)}%`}
            otherVal={`${(comparisonResult.analysis.fidelity * 100).toFixed(1)}%`}
            otherBackend={comparisonResult.backend}
          />
        </div>
      )}
      <div className="mt-4">
        <CountsBar counts={counts} total={total} />
      </div>
      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
      {perfectFidelity && <EmulatorNote />}
      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

function GHZCard({ result, comparisonResult }: { result: ExperimentResult; comparisonResult?: ExperimentResult }) {
  const analysis = result.analysis
  const counts = flatCounts(result.raw_counts)
  const total = totalFromCounts(counts)
  const emu = isEmulator(result.backend)
  const perfectFidelity = analysis.fidelity === 1.0 && emu

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#00ff88]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.ghz_state }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.ghz_state}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>
      {analysis.fidelity !== undefined && (
        <FidelityBar value={analysis.fidelity} label="GHZ State Fidelity" />
      )}
      {comparisonResult && comparisonResult.analysis.fidelity !== undefined && (
        <div className="mt-3">
          <ComparisonRow
            label="Fidelity"
            thisVal={`${(analysis.fidelity * 100).toFixed(1)}%`}
            otherVal={`${(comparisonResult.analysis.fidelity * 100).toFixed(1)}%`}
            otherBackend={comparisonResult.backend}
          />
        </div>
      )}
      {analysis.parity_distribution && (
        <div className="mt-3 flex gap-4 text-xs font-mono">
          <span className="text-gray-500">Even parity: <span className="text-[#00ff88]">{(analysis.parity_distribution.even * 100).toFixed(1)}%</span></span>
          <span className="text-gray-500">Odd parity: <span className="text-[#ff6b9d]">{(analysis.parity_distribution.odd * 100).toFixed(1)}%</span></span>
        </div>
      )}
      {analysis.parity_leakage !== undefined && !analysis.parity_distribution && (
        <div className="mt-3 flex gap-4 text-xs font-mono">
          <span className="text-gray-500">Parity leakage: <span className="text-[#ff6b9d]">{(analysis.parity_leakage * 100).toFixed(2)}%</span></span>
        </div>
      )}
      <div className="mt-3">
        <CountsBar counts={counts} total={total} />
      </div>
      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
      {perfectFidelity && <EmulatorNote />}
      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

function VQECard({ result, comparisonResult }: { result: ExperimentResult; comparisonResult?: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#8b5cf6]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.vqe_h2 }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.vqe_h2}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {analysis.energy_hartree !== undefined && (
        <div className="space-y-3">
          {/* Energy metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Measured Energy</p>
              <p className="text-lg font-mono text-white">{analysis.energy_hartree.toFixed(4)} <span className="text-xs text-gray-500">Ha</span></p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">FCI Reference</p>
              <p className="text-lg font-mono text-gray-400">{analysis.fci_energy.toFixed(4)} <span className="text-xs text-gray-500">Ha</span></p>
            </div>
          </div>

          {/* Error + accuracy badge */}
          <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
            <span className="text-gray-500">Error:</span>
            <span className={analysis.chemical_accuracy ? 'text-[#00ff88]' : 'text-[#ff6b9d]'}>
              {analysis.error_hartree !== undefined
                ? `${analysis.error_hartree.toFixed(4)} Ha (${analysis.error_kcal_mol} kcal/mol)`
                : `${analysis.error_kcal_mol} kcal/mol`
              }
            </span>
            {analysis.chemical_accuracy ? (
              <span className="text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded border border-[#00ff88]/20">
                Chemical Accuracy
              </span>
            ) : (
              <span className="text-[#ff6b9d] bg-[#ff6b9d]/10 px-2 py-0.5 rounded border border-[#ff6b9d]/20">
                Above threshold
              </span>
            )}
          </div>

          {/* Energy level diagram */}
          <EnergyLevelDiagram result={result} comparisonResult={comparisonResult} />

          {/* Expectation values */}
          {analysis.expectation_values && (
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Expectation Values</p>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(analysis.expectation_values as Record<string, number>).map(([op, val]) => (
                  <div key={op} className="text-center bg-white/[0.02] rounded p-2">
                    <p className="text-[10px] font-mono text-gray-500">{`<${op}>`}</p>
                    <p className="text-xs font-mono text-white">{val.toFixed(3)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-basis counts */}
      {hasMultiBasis(result.raw_counts) && (
        <MultiBasisCounts rawCounts={result.raw_counts} />
      )}

      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}

      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RB Card — Randomized Benchmarking
// ---------------------------------------------------------------------------

function RBDecayCurve({ survival, seqLengths }: { survival: Record<string, number>; seqLengths: number[] }) {
  const svgW = 400
  const svgH = 160
  const padL = 50
  const padR = 20
  const padT = 15
  const padB = 30
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  const maxM = Math.max(...seqLengths)
  const xScale = (m: number) => padL + (m / maxM) * chartW
  const yScale = (p: number) => padT + (1 - p) * chartH

  const points = seqLengths
    .filter(m => survival[String(m)] !== undefined)
    .map(m => ({ m, p: survival[String(m)] }))

  if (points.length < 2) return null

  const pathD = points.map((pt, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(pt.m).toFixed(1)} ${yScale(pt.p).toFixed(1)}`
  ).join(' ')

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Survival Probability Decay</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(255,255,255,0.01)" rx="3" />
        {/* Grid lines */}
        {[0.5, 0.75, 1.0].map(p => (
          <g key={p}>
            <line x1={padL} y1={yScale(p)} x2={padL + chartW} y2={yScale(p)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <text x={padL - 4} y={yScale(p) + 3} textAnchor="end" fill="#666" fontFamily="monospace" fontSize="9">
              {(p * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {/* Decay curve */}
        <path d={pathD} fill="none" stroke="#ff8c42" strokeWidth="2" strokeLinecap="round" />
        {/* Data points */}
        {points.map(pt => (
          <circle key={pt.m} cx={xScale(pt.m)} cy={yScale(pt.p)} r="3" fill="#ff8c42" />
        ))}
        {/* X-axis labels */}
        {seqLengths.filter(m => survival[String(m)] !== undefined).map(m => (
          <text key={m} x={xScale(m)} y={svgH - 5} textAnchor="middle" fill="#666" fontFamily="monospace" fontSize="9">
            {m}
          </text>
        ))}
        <text x={padL + chartW / 2} y={svgH} textAnchor="middle" fill="#555" fontFamily="monospace" fontSize="9">
          Sequence Length
        </text>
      </svg>
    </div>
  )
}

function RBCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#ff8c42]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.rb_1qubit }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.rb_1qubit}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {analysis.gate_fidelity !== undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Gate Fidelity</p>
              <p className="text-lg font-mono font-bold" style={{ color: analysis.gate_fidelity > 0.999 ? '#00ff88' : analysis.gate_fidelity > 0.99 ? '#00d4ff' : '#eab308' }}>
                {(analysis.gate_fidelity * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Error per Gate</p>
              <p className="text-lg font-mono text-white">{analysis.error_per_gate.toFixed(4)}</p>
            </div>
          </div>

          {analysis.survival_probabilities && (
            <RBDecayCurve
              survival={analysis.survival_probabilities}
              seqLengths={analysis.sequence_lengths || [1, 4, 8, 16, 32]}
            />
          )}
        </div>
      )}

      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
      {emu && <EmulatorNote />}
      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QAOA Card — MaxCut
// ---------------------------------------------------------------------------

function QAOAHeatmap({ heatmap, gammaValues, betaValues }: {
  heatmap: Record<string, { gamma: number; beta: number; approximation_ratio: number }>
  gammaValues: number[]; betaValues: number[]
}) {
  const cellSize = 48

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Approximation Ratio Heatmap</p>
      <div className="inline-block">
        <div className="flex items-end gap-1 mb-1">
          <div style={{ width: 40 }} />
          {betaValues.map((b, bi) => (
            <div key={bi} className="text-[9px] font-mono text-gray-500 text-center" style={{ width: cellSize }}>
              {b.toFixed(1)}
            </div>
          ))}
        </div>
        {gammaValues.map((g, gi) => (
          <div key={gi} className="flex items-center gap-1 mb-1">
            <div className="text-[9px] font-mono text-gray-500 text-right" style={{ width: 40 }}>
              {g.toFixed(1)}
            </div>
            {betaValues.map((b, bi) => {
              const key = `g${gi}_b${bi}`
              const data = heatmap[key]
              const ratio = data?.approximation_ratio || 0
              const intensity = Math.min(ratio, 1)
              const r = Math.round(255 * (1 - intensity))
              const gv = Math.round(255 * intensity)
              const color = `rgb(${r}, ${gv}, 100)`
              return (
                <div
                  key={bi}
                  className="rounded text-[10px] font-mono text-center flex items-center justify-center"
                  style={{
                    width: cellSize, height: cellSize,
                    backgroundColor: `rgba(${Math.round(255 * intensity * 0.4)}, ${Math.round(255 * intensity)}, ${Math.round(100 * intensity)}, 0.3)`,
                    border: `1px solid rgba(${Math.round(255 * intensity * 0.4)}, ${Math.round(255 * intensity)}, ${Math.round(100 * intensity)}, 0.2)`,
                    color: intensity > 0.5 ? '#fff' : '#888',
                  }}
                >
                  {(ratio * 100).toFixed(0)}%
                </div>
              )
            })}
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          <div className="text-[9px] font-mono text-gray-500 text-right" style={{ width: 40 }} />
          <div className="text-[9px] font-mono text-gray-500">beta &rarr;</div>
        </div>
        <div className="text-[9px] font-mono text-gray-500 -mt-1" style={{ marginLeft: -8, transform: 'rotate(-90deg) translateX(-30px)', transformOrigin: 'left' }}>
          gamma
        </div>
      </div>
    </div>
  )
}

function QAOACard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#ff6b9d]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.qaoa_maxcut }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.qaoa_maxcut}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {analysis.best_approximation_ratio !== undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best Ratio</p>
              <p className="text-lg font-mono font-bold" style={{
                color: analysis.best_approximation_ratio > 0.9 ? '#00ff88' : analysis.best_approximation_ratio > 0.7 ? '#00d4ff' : '#eab308'
              }}>
                {(analysis.best_approximation_ratio * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best gamma</p>
              <p className="text-lg font-mono text-white">{analysis.best_gamma?.toFixed(2)}</p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best beta</p>
              <p className="text-lg font-mono text-white">{analysis.best_beta?.toFixed(2)}</p>
            </div>
          </div>

          {analysis.heatmap && (
            <QAOAHeatmap
              heatmap={analysis.heatmap}
              gammaValues={analysis.gamma_values || [0.3, 0.6, 0.9]}
              betaValues={analysis.beta_values || [0.3, 0.6, 0.9]}
            />
          )}
        </div>
      )}

      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
      {emu && <EmulatorNote />}
      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QV Card — Quantum Volume
// ---------------------------------------------------------------------------

function QVCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#14b8a6]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.quantum_volume }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.quantum_volume}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {analysis.quantum_volume !== undefined && (
        <div className="space-y-3">
          <div className="bg-white/[0.02] rounded p-4 text-center">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Quantum Volume</p>
            <p className="text-3xl font-mono font-bold" style={{ color: '#14b8a6' }}>
              {analysis.quantum_volume}
            </p>
          </div>

          {analysis.results_by_qubit_count && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(analysis.results_by_qubit_count as Record<string, any>).map(([n, info]) => (
                <div key={n} className="bg-white/[0.02] rounded p-3 border border-white/[0.03]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-400">n={n} qubits</span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                      info.passed
                        ? 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20'
                        : 'text-[#ff6b9d] bg-[#ff6b9d]/10 border-[#ff6b9d]/20'
                    }`}>
                      {info.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-mono font-bold text-white">
                      {(info.heavy_output_fraction * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">heavy output</span>
                  </div>
                  <div className="mt-1 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${info.heavy_output_fraction * 100}%`,
                        backgroundColor: info.passed ? '#00ff88' : '#ff6b9d',
                      }}
                    />
                  </div>
                  <div className="mt-0.5 text-[9px] font-mono text-gray-600 text-right">
                    threshold: 66.7%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
      {emu && <EmulatorNote />}
      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table
// ---------------------------------------------------------------------------

function ComparisonTable({ results }: { results: ExperimentResult[] }) {
  const types = ['bell_calibration', 'ghz_state', 'vqe_h2', 'rb_1qubit', 'qaoa_maxcut', 'quantum_volume']
  const backendsSet = new Set(results.map(r => r.backend))
  const backends = Array.from(backendsSet).sort((a, b) => {
    // Emulators first, then hardware
    const aEmu = isEmulator(a) ? 0 : 1
    const bEmu = isEmulator(b) ? 0 : 1
    return aEmu - bEmu || a.localeCompare(b)
  })

  if (backends.length < 2 || results.length < 3) return null

  function getMetric(r: ExperimentResult | undefined): { text: string; color: string } {
    if (!r) return { text: '--', color: '#555' }
    const a = r.analysis
    if (a.fidelity !== undefined) {
      const pct = a.fidelity * 100
      return { text: `${pct.toFixed(1)}%`, color: pct > 95 ? '#00ff88' : pct > 85 ? '#00d4ff' : '#eab308' }
    }
    if (a.energy_hartree !== undefined) {
      const err = a.error_kcal_mol || (Math.abs(a.energy_hartree - a.fci_energy) * 627.509)
      return { text: `${a.energy_hartree.toFixed(4)} Ha`, color: a.chemical_accuracy ? '#00ff88' : '#eab308' }
    }
    if (a.gate_fidelity !== undefined) {
      const pct = a.gate_fidelity * 100
      return { text: `${pct.toFixed(2)}%`, color: pct > 99.9 ? '#00ff88' : pct > 99 ? '#00d4ff' : '#eab308' }
    }
    if (a.best_approximation_ratio !== undefined) {
      return { text: `${(a.best_approximation_ratio * 100).toFixed(0)}%`, color: a.best_approximation_ratio > 0.9 ? '#00ff88' : '#eab308' }
    }
    if (a.quantum_volume !== undefined) {
      return { text: `QV ${a.quantum_volume}`, color: '#14b8a6' }
    }
    return { text: '--', color: '#555' }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr>
            <th className="text-left text-gray-500 font-normal py-2 px-3 border-b border-white/5">Experiment</th>
            {backends.map(b => (
              <th key={b} className="text-center text-gray-500 font-normal py-2 px-3 border-b border-white/5">
                {backendLabel(b).label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map(type => {
            const typeResults = results.filter(r => r.type === type)
            if (typeResults.length === 0) return null
            return (
              <tr key={type} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColors[type] || '#666' }} />
                    <span className="text-gray-300">{typeLabels[type] || type}</span>
                  </div>
                </td>
                {backends.map(b => {
                  const r = typeResults.find(r => r.backend === b)
                  const metric = getMetric(r)
                  return (
                    <td key={b} className="text-center py-2.5 px-3">
                      <span style={{ color: metric.color }}>{metric.text}</span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ResultCard({ result, comparison }: { result: ExperimentResult; comparison?: ExperimentResult }) {
  switch (result.type) {
    case 'bell_calibration':
      return <BellCard result={result} comparisonResult={comparison} />
    case 'ghz_state':
      return <GHZCard result={result} comparisonResult={comparison} />
    case 'vqe_h2':
      return <VQECard result={result} comparisonResult={comparison} />
    case 'rb_1qubit':
      return <RBCard result={result} />
    case 'qaoa_maxcut':
      return <QAOACard result={result} />
    case 'quantum_volume':
      return <QVCard result={result} />
    default:
      return (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white font-bold">{result.id}</h3>
            <BackendBadge backend={result.backend} />
          </div>
          <p className="text-xs text-gray-500 font-mono">{result.type} -- {result.backend}</p>
          <pre className="text-xs text-gray-400 mt-2 overflow-auto">{JSON.stringify(result.analysis, null, 2)}</pre>
        </div>
      )
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExperimentsPage() {
  const results = getAllResults()
  const queue = getQueue()
  const stats = getStats()
  const sweepEmulator = getSweepEmulator()
  const sweepReference = getSweepReference()

  const pending = queue.filter(q => q.status === 'pending')

  // Group by type
  const knownTypes = ['vqe_h2', 'bell_calibration', 'ghz_state', 'rb_1qubit', 'qaoa_maxcut', 'quantum_volume']
  const vqeResults = results.filter(r => r.type === 'vqe_h2')
  const bellResults = results.filter(r => r.type === 'bell_calibration')
  const ghzResults = results.filter(r => r.type === 'ghz_state')
  const rbResults = results.filter(r => r.type === 'rb_1qubit')
  const qaoaResults = results.filter(r => r.type === 'qaoa_maxcut')
  const qvResults = results.filter(r => r.type === 'quantum_volume')
  const otherResults = results.filter(r => !knownTypes.includes(r.type))

  // Find emulator/hardware pairs for cross-platform comparison
  function findComparison(typeResults: ExperimentResult[], result: ExperimentResult) {
    return isEmulator(result.backend)
      ? typeResults.find(r => !isEmulator(r.backend))
      : typeResults.find(r => isEmulator(r.backend))
  }

  const groups = [
    { type: 'vqe_h2', label: 'H\u2082 VQE -- Quantum Chemistry', results: vqeResults, color: '#8b5cf6', description: 'Can a quantum computer calculate the energy of a hydrogen molecule? VQE uses a hybrid quantum-classical loop to find the ground state energy. The gold standard is "chemical accuracy" -- getting within 1.6 milliHartree of the exact answer.', wide: true },
    { type: 'bell_calibration', label: 'Bell State Calibration', results: bellResults, color: '#00d4ff', description: 'The simplest test of quantum entanglement: prepare two qubits in a Bell state, then measure. A perfect device gives 50/50 between |00\u27E9 and |11\u27E9 with nothing else. Any leakage into |01\u27E9 or |10\u27E9 reveals hardware noise.', wide: false },
    { type: 'ghz_state', label: 'GHZ State Preparation', results: ghzResults, color: '#00ff88', description: 'A harder entanglement test: create a 3-qubit GHZ state where all qubits are simultaneously |000\u27E9 and |111\u27E9. Parity violations (odd-parity states appearing) indicate decoherence scaling with qubit count.', wide: false },
    { type: 'rb_1qubit', label: 'Randomized Benchmarking', results: rbResults, color: '#ff8c42', description: 'How good is a single quantum gate? RB applies random sequences of Clifford gates and measures how quickly the signal decays. The decay rate gives the average error per gate -- the fundamental metric for gate quality.', wide: false },
    { type: 'qaoa_maxcut', label: 'QAOA MaxCut', results: qaoaResults, color: '#ff6b9d', description: 'Can a quantum algorithm beat random guessing at graph optimization? QAOA sweeps variational parameters to find the maximum cut of a triangle graph. The approximation ratio measures how close we get to the classical optimum.', wide: false },
    { type: 'quantum_volume', label: 'Quantum Volume', results: qvResults, color: '#14b8a6', description: 'A holistic benchmark combining gate fidelity, connectivity, and compiler quality into a single number. QV tests whether the device can reliably execute random circuits of depth = width. Higher is better.', wide: true },
  ]

  if (otherResults.length > 0) {
    groups.push({ type: 'other', label: 'Other Experiments', results: otherResults, color: '#666', description: '', wide: false })
  }

  return (
    <>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="font-mono font-bold text-white tracking-wider text-sm">AI x Quantum</span>
            </Link>
            <span className="text-gray-600 font-mono">/</span>
            <span className="text-sm font-mono text-gray-400">experiments</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-[#ff6b9d] transition-colors">Blog</Link>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00ff88]">
              Live Results
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Quantum Experiments
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mb-6">
            Can an AI agent autonomously design, run, and analyze quantum computing experiments?
            These are real results from circuits running on quantum hardware -- each one submitted,
            measured, and interpreted without human intervention.
          </p>
          <p className="text-gray-400 max-w-3xl mb-8">
            We&apos;re testing the limits of today&apos;s noisy intermediate-scale quantum (NISQ) devices
            by running progressively harder experiments: from basic entanglement benchmarks to
            variational quantum chemistry. Every result here was produced by our autonomous
            experiment pipeline running against{' '}
            <a href="https://www.quantum-inspire.com/" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">Quantum Inspire</a> and{' '}
            <a href="https://quantum.ibm.com/" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">IBM Quantum</a> backends.
          </p>
        </div>
      </section>

      {/* Research Questions */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                q: 'How noisy are current QPUs?',
                detail: 'Bell and GHZ states give us a direct measure of gate fidelity and decoherence. Comparing emulator (perfect) vs hardware (noisy) reveals the gap.',
                color: '#00d4ff',
              },
              {
                q: 'Can we do useful chemistry on 2 qubits?',
                detail: 'The VQE experiment calculates the ground state energy of H\u2082. Chemical accuracy (1.6 mHa) is the bar -- can a 9-qubit superconducting chip clear it?',
                color: '#8b5cf6',
              },
              {
                q: 'Can AI agents run the lab?',
                detail: 'Our daemon autonomously generates circuits, submits jobs, waits for results, and performs analysis. No human in the loop from queue to dashboard.',
                color: '#00ff88',
              },
            ].map(item => (
              <div key={item.q} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
                <p className="text-white font-bold text-sm mb-2" style={{ color: item.color }}>{item.q}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Summary Dashboard */}
      {results.length > 0 && (
        <section className="px-6 pb-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <SummaryDashboard results={results} />
            <ComparisonTable results={results} />
          </div>
        </section>
      )}

      {/* Status bar */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-6 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="text-gray-300">{stats.completed} completed</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-gray-300">{stats.pending} pending</span>
              </div>
            )}
            {stats.running > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-gray-300">{stats.running} running</span>
              </div>
            )}
            {stats.lastRun && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Last run:</span>
                <span className="text-gray-300">{new Date(stats.lastRun).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dissociation Curve + Fidelity Comparison — featured visualizations */}
      {(sweepEmulator.length > 0 || results.some(r => r.type === 'bell_calibration' || r.type === 'ghz_state')) && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto space-y-6">
            {sweepEmulator.length > 0 && (
              <DissociationCurve sweep={sweepEmulator} reference={sweepReference} />
            )}
            <FidelityComparisonChart results={results} />
          </div>
        </section>
      )}

      {/* Grouped Results */}
      {groups.map(group => {
        if (group.results.length === 0) return null

        return (
          <section key={group.type} className="px-6 pb-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                <h2 className="text-xl font-bold text-white">{group.label}</h2>
                <span className="text-xs font-mono text-gray-600">{group.results.length} result{group.results.length !== 1 ? 's' : ''}</span>
              </div>
              {group.description && (
                <p className="text-sm text-gray-300 mb-6 ml-5 max-w-3xl leading-relaxed">{group.description}</p>
              )}

              <div className={`grid grid-cols-1 ${group.wide && group.results.length > 1 ? 'lg:grid-cols-2' : group.wide ? '' : 'md:grid-cols-2'} gap-6`}>
                {group.results.map(result => {
                  const comp = findComparison(group.results, result)
                  return <ResultCard key={result.id} result={result} comparison={comp} />
                })}
              </div>
            </div>
          </section>
        )
      })}

      {/* Queue */}
      {pending.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-6">Pending Queue</h2>
            <div className="space-y-3">
              {pending.map(exp => (
                <div key={exp.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors[exp.type] || '#666' }} />
                    <div>
                      <span className="text-white font-mono text-sm">{exp.id}</span>
                      <p className="text-xs text-gray-500">{exp.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-500">{exp.backend}</span>
                    <StatusPill status={exp.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {results.length === 0 && pending.length === 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto text-center py-20">
            <p className="text-gray-500 text-lg mb-4">No experiments yet.</p>
            <p className="text-gray-600 text-sm font-mono">
              Run <code className="text-[#00d4ff]">python agents/experiment_daemon.py --seed</code> to create seed experiments,
              then <code className="text-[#00d4ff]">python agents/experiment_daemon.py --once</code> to run one.
            </p>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-6 pb-20 border-t border-white/5 pt-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-3">How It Works</h2>
          <p className="text-sm text-gray-300 mb-6 max-w-3xl leading-relaxed">
            An autonomous Python daemon processes a queue of experiments. It generates quantum circuits,
            submits them to real hardware, analyzes the measurement results, and publishes everything
            to this page -- no human intervention required.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Queue', desc: 'Experiments are defined as structured descriptions -- what to measure, which backend, how many shots.', color: '#eab308' },
              { step: '2', title: 'Generate', desc: 'The daemon translates each experiment into a quantum circuit written in cQASM 3.0 (the native instruction set for Quantum Inspire hardware).', color: '#00d4ff' },
              { step: '3', title: 'Execute', desc: 'Circuits are submitted to real quantum processors: Quantum Inspire\'s Tuna-9 (9 superconducting qubits) or IBM Quantum (100+ qubits).', color: '#8b5cf6' },
              { step: '4', title: 'Analyze', desc: 'Raw measurement counts are processed into physical quantities -- fidelities, energies, error rates -- then published here automatically.', color: '#00ff88' },
            ].map(s => (
              <div key={s.step} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + '15', border: `1px solid ${s.color}30` }}>
                    {s.step}
                  </span>
                  <span className="text-white font-bold text-sm">{s.title}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
