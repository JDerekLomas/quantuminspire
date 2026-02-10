import Link from 'next/link'
import { getAllResults, getQueue, getStats, typeLabels, typeColors, type ExperimentResult } from '@/lib/experiments'

export const metadata = {
  title: 'Live Experiments — AI x Quantum',
  description: 'Real-time results from quantum experiments running on Quantum Inspire and IBM Quantum hardware.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmulator(backend: string): boolean {
  const lower = backend.toLowerCase()
  return lower.includes('emulator') || lower.includes('qxelarator')
}

function backendLabel(backend: string): { label: string; isHw: boolean } {
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
        <span className="text-gray-500">{label}</span>
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
            <span className="text-gray-400 w-20 text-right">{count} ({pct.toFixed(1)}%)</span>
          </div>
        )
      })}
    </div>
  )
}

function EmulatorNote() {
  return (
    <div className="mt-3 px-3 py-2 rounded bg-yellow-500/5 border border-yellow-500/10">
      <p className="text-[11px] text-yellow-400/80 font-mono leading-relaxed">
        Emulator (noiseless) -- run on hardware to see real noise effects
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
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
          <p className="text-xl font-mono font-bold" style={{ color: m.color }}>{m.value}</p>
          {m.sub && <p className="text-[10px] font-mono text-gray-600 mt-0.5 truncate">{m.sub}</p>}
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
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Energy Level Diagram</p>
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
// Experiment Cards
// ---------------------------------------------------------------------------

function BellCard({ result }: { result: ExperimentResult }) {
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
      <div className="mt-4">
        <CountsBar counts={counts} total={total} />
      </div>
      {analysis.interpretation && (
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
      {perfectFidelity && <EmulatorNote />}
      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

function GHZCard({ result }: { result: ExperimentResult }) {
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
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{analysis.interpretation}</p>
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
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">Measured Energy</p>
              <p className="text-lg font-mono text-white">{analysis.energy_hartree.toFixed(4)} <span className="text-xs text-gray-500">Ha</span></p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">FCI Reference</p>
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
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Expectation Values</p>
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
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}

      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

function ResultCard({ result, vqeComparison }: { result: ExperimentResult; vqeComparison?: ExperimentResult }) {
  switch (result.type) {
    case 'bell_calibration':
      return <BellCard result={result} />
    case 'ghz_state':
      return <GHZCard result={result} />
    case 'vqe_h2':
      return <VQECard result={result} comparisonResult={vqeComparison} />
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

  const pending = queue.filter(q => q.status === 'pending')

  // Group by type, VQE first (most important)
  const vqeResults = results.filter(r => r.type === 'vqe_h2')
  const bellResults = results.filter(r => r.type === 'bell_calibration')
  const ghzResults = results.filter(r => r.type === 'ghz_state')
  const otherResults = results.filter(r => !['vqe_h2', 'bell_calibration', 'ghz_state'].includes(r.type))

  // Find emulator VQE for comparison when showing hardware VQE
  const vqeEmulator = vqeResults.find(r => isEmulator(r.backend))
  const vqeHardware = vqeResults.find(r => !isEmulator(r.backend))

  const groups = [
    { type: 'vqe_h2', label: 'H\u2082 VQE -- Quantum Chemistry', results: vqeResults, color: '#8b5cf6', description: 'Can a quantum computer calculate the energy of a hydrogen molecule? VQE uses a hybrid quantum-classical loop to find the ground state energy. The gold standard is "chemical accuracy" -- getting within 1.6 milliHartree of the exact answer.' },
    { type: 'bell_calibration', label: 'Bell State Calibration', results: bellResults, color: '#00d4ff', description: 'The simplest test of quantum entanglement: prepare two qubits in a Bell state, then measure. A perfect device gives 50/50 between |00\u27E9 and |11\u27E9 with nothing else. Any leakage into |01\u27E9 or |10\u27E9 reveals hardware noise.' },
    { type: 'ghz_state', label: 'GHZ State Preparation', results: ghzResults, color: '#00ff88', description: 'A harder entanglement test: create a 3-qubit GHZ state where all qubits are simultaneously |000\u27E9 and |111\u27E9. Parity violations (odd-parity states appearing) indicate decoherence scaling with qubit count.' },
  ]

  if (otherResults.length > 0) {
    groups.push({ type: 'other', label: 'Other Experiments', results: otherResults, color: '#666', description: '' })
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
          <div className="max-w-6xl mx-auto">
            <SummaryDashboard results={results} />
          </div>
        </section>
      )}

      {/* Status bar */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-6 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="text-gray-500">{stats.completed} completed</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-gray-500">{stats.pending} pending</span>
              </div>
            )}
            {stats.running > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-gray-500">{stats.running} running</span>
              </div>
            )}
            {stats.lastRun && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Last run:</span>
                <span className="text-gray-400">{new Date(stats.lastRun).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grouped Results */}
      {groups.map(group => {
        if (group.results.length === 0) return null

        // For VQE, show full-width cards since they have the energy diagram
        const isVQE = group.type === 'vqe_h2'

        return (
          <section key={group.type} className="px-6 pb-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                <h2 className="text-xl font-bold text-white">{group.label}</h2>
                <span className="text-xs font-mono text-gray-600">{group.results.length} result{group.results.length !== 1 ? 's' : ''}</span>
              </div>
              {group.description && (
                <p className="text-sm text-gray-500 mb-6 ml-5">{group.description}</p>
              )}

              {isVQE ? (
                /* VQE: show side-by-side if we have both emulator and hardware */
                <div className={`grid grid-cols-1 ${group.results.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
                  {group.results.map(result => {
                    // Pass comparison: emulator card gets hardware as comparison, and vice versa
                    const comparison = isEmulator(result.backend) ? vqeHardware : vqeEmulator
                    return <ResultCard key={result.id} result={result} vqeComparison={comparison} />
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.results.map(result => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </div>
              )}
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
          <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Queue', desc: 'JSON experiment definitions in experiments/queue/', color: '#eab308' },
              { step: '2', title: 'Generate', desc: 'Daemon generates cQASM 3.0 circuits for QI hardware', color: '#00d4ff' },
              { step: '3', title: 'Execute', desc: 'Circuits submitted to Quantum Inspire (Tuna-9) or IBM Quantum', color: '#8b5cf6' },
              { step: '4', title: 'Analyze', desc: 'Results analyzed, committed to git, dashboard auto-updates', color: '#00ff88' },
            ].map(s => (
              <div key={s.step} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + '15', border: `1px solid ${s.color}30` }}>
                    {s.step}
                  </span>
                  <span className="text-white font-bold text-sm">{s.title}</span>
                </div>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
