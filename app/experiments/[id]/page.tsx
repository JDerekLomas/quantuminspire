import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { notFound } from 'next/navigation'
import {
  getAllStudies,
  getStudyBySlug,
  getResultsByType,
  getResultGitHubUrl,
  getSweepEmulator,
  getSweepReference,
  typeLabels,
  typeColors,
  type ExperimentResult,
} from '@/lib/experiments'
import {
  isEmulator,
  backendLabel,
  flatCounts,
  hasMultiBasis,
  totalFromCounts,
  StatusPill,
  BackendBadge,
  FidelityBar,
  CountsBar,
  EmulatorNote,
  CircuitBlock,
  ComparisonRow,
  EnergyLevelDiagram,
  MultiBasisCounts,
  DissociationCurve,
  FidelityComparisonChart,
  RBDecayCurve,
  QAOAHeatmap,
} from '@/components/experiment-viz'

export function generateStaticParams() {
  return getAllStudies().map((s) => ({ id: s.slug }))
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const study = getStudyBySlug(params.id)
  if (!study) return { title: 'Not Found' }
  return {
    title: study.title,
    description: study.researchQuestion,
  }
}

// ---------------------------------------------------------------------------
// Status badge for research workflow stage
// ---------------------------------------------------------------------------

function RawDataLink({ resultId }: { resultId: string }) {
  return (
    <a
      href={getResultGitHubUrl(resultId)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-gray-500 hover:text-[#00d4ff] transition-colors mt-3"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      View raw JSON
    </a>
  )
}

function WorkflowBadge({ status }: { status: 'simulation' | 'hardware' | 'complete' }) {
  const stages = ['simulation', 'hardware', 'complete'] as const
  const currentIdx = stages.indexOf(status)
  const labels = { simulation: 'Simulation', hardware: 'Hardware', complete: 'Complete' }
  const colors = { simulation: '#eab308', hardware: '#8b5cf6', complete: '#00ff88' }

  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
            style={{
              color: i <= currentIdx ? colors[s] : '#444',
              borderColor: i <= currentIdx ? `${colors[s]}40` : '#222',
              backgroundColor: i <= currentIdx ? `${colors[s]}10` : 'transparent',
            }}
          >
            {labels[s]}
          </span>
          {i < stages.length - 1 && (
            <span className="text-gray-600 text-[10px]">&rarr;</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Platform comparison table
// ---------------------------------------------------------------------------

function PlatformTable({ results }: { results: ExperimentResult[] }) {
  if (results.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr>
            <th className="text-left text-gray-500 font-normal py-2 px-3 border-b border-white/5">Backend</th>
            <th className="text-left text-gray-500 font-normal py-2 px-3 border-b border-white/5">Type</th>
            <th className="text-right text-gray-500 font-normal py-2 px-3 border-b border-white/5">Key Metric</th>
            <th className="text-right text-gray-500 font-normal py-2 px-3 border-b border-white/5">Date</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const { label, isHw } = backendLabel(r.backend)
            const a = r.analysis
            let metric = '--'
            let metricColor = '#888'

            if (a.fidelity !== undefined) {
              const pct = (a.fidelity * 100).toFixed(1)
              metric = `${pct}% fidelity`
              metricColor = a.fidelity > 0.95 ? '#00ff88' : a.fidelity > 0.85 ? '#00d4ff' : '#eab308'
            } else if (a.energy_hartree !== undefined) {
              metric = `${a.energy_hartree.toFixed(4)} Ha (${a.error_kcal_mol} kcal/mol)`
              metricColor = a.chemical_accuracy ? '#00ff88' : '#eab308'
            } else if (a.gate_fidelity !== undefined) {
              metric = `${(a.gate_fidelity * 100).toFixed(2)}% gate fidelity`
              metricColor = a.gate_fidelity > 0.999 ? '#00ff88' : '#00d4ff'
            } else if (a.best_approximation_ratio !== undefined) {
              metric = `${(a.best_approximation_ratio * 100).toFixed(0)}% approx ratio`
              metricColor = a.best_approximation_ratio > 0.9 ? '#00ff88' : '#eab308'
            } else if (a.quantum_volume !== undefined) {
              metric = `QV ${a.quantum_volume}`
              metricColor = '#14b8a6'
            }

            return (
              <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <BackendBadge backend={r.backend} />
                  </div>
                </td>
                <td className="py-2.5 px-3 text-gray-400">{isHw ? 'Hardware' : 'Emulator'}</td>
                <td className="py-2.5 px-3 text-right font-bold" style={{ color: metricColor }}>{metric}</td>
                <td className="py-2.5 px-3 text-right text-gray-500">{new Date(r.completed).toLocaleDateString()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type-specific result visualizations
// ---------------------------------------------------------------------------

function BellResults({ results }: { results: ExperimentResult[] }) {
  const emulatorResult = results.find(r => isEmulator(r.backend))
  const hwResults = results.filter(r => !isEmulator(r.backend))

  return (
    <div className="space-y-6">
      {results.map(r => {
        const counts = flatCounts(r.raw_counts)
        const total = totalFromCounts(counts)
        const comparison = isEmulator(r.backend)
          ? hwResults[0]
          : emulatorResult
        return (
          <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BackendBadge backend={r.backend} />
                <span className="text-xs font-mono text-gray-500">{r.id}</span>
              </div>
              <StatusPill status="completed" />
            </div>
            {r.analysis.fidelity !== undefined && (
              <FidelityBar value={r.analysis.fidelity} label="Bell State Fidelity" />
            )}
            {comparison && comparison.analysis.fidelity !== undefined && (
              <div className="mt-3">
                <ComparisonRow
                  label="Fidelity"
                  thisVal={`${(r.analysis.fidelity * 100).toFixed(1)}%`}
                  otherVal={`${(comparison.analysis.fidelity * 100).toFixed(1)}%`}
                  otherBackend={comparison.backend}
                />
              </div>
            )}
            <div className="mt-4">
              <CountsBar counts={counts} total={total} />
            </div>
            {r.analysis.interpretation && (
              <p className="text-xs text-gray-300 mt-3 leading-relaxed">{r.analysis.interpretation}</p>
            )}
            {isEmulator(r.backend) && r.analysis.fidelity === 1.0 && <EmulatorNote />}
            {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
            <RawDataLink resultId={r.id} />
          </div>
        )
      })}
    </div>
  )
}

function GHZResults({ results }: { results: ExperimentResult[] }) {
  const emulatorResult = results.find(r => isEmulator(r.backend))
  const hwResults = results.filter(r => !isEmulator(r.backend))

  return (
    <div className="space-y-6">
      {results.map(r => {
        const counts = flatCounts(r.raw_counts)
        const total = totalFromCounts(counts)
        const comparison = isEmulator(r.backend) ? hwResults[0] : emulatorResult
        return (
          <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BackendBadge backend={r.backend} />
                <span className="text-xs font-mono text-gray-500">{r.id}</span>
              </div>
              <StatusPill status="completed" />
            </div>
            {r.analysis.fidelity !== undefined && (
              <FidelityBar value={r.analysis.fidelity} label="GHZ State Fidelity" />
            )}
            {comparison && comparison.analysis.fidelity !== undefined && (
              <div className="mt-3">
                <ComparisonRow
                  label="Fidelity"
                  thisVal={`${(r.analysis.fidelity * 100).toFixed(1)}%`}
                  otherVal={`${(comparison.analysis.fidelity * 100).toFixed(1)}%`}
                  otherBackend={comparison.backend}
                />
              </div>
            )}
            {r.analysis.parity_distribution && (
              <div className="mt-3 flex gap-4 text-xs font-mono">
                <span className="text-gray-500">Even parity: <span className="text-[#00ff88]">{(r.analysis.parity_distribution.even * 100).toFixed(1)}%</span></span>
                <span className="text-gray-500">Odd parity: <span className="text-[#ff6b9d]">{(r.analysis.parity_distribution.odd * 100).toFixed(1)}%</span></span>
              </div>
            )}
            <div className="mt-3">
              <CountsBar counts={counts} total={total} />
            </div>
            {r.analysis.interpretation && (
              <p className="text-xs text-gray-300 mt-3 leading-relaxed">{r.analysis.interpretation}</p>
            )}
            {isEmulator(r.backend) && r.analysis.fidelity === 1.0 && <EmulatorNote />}
            {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
            <RawDataLink resultId={r.id} />
          </div>
        )
      })}
    </div>
  )
}

function VQEResults({ results }: { results: ExperimentResult[] }) {
  const emulatorResult = results.find(r => isEmulator(r.backend))
  const hwResults = results.filter(r => !isEmulator(r.backend))
  const sweep = getSweepEmulator()
  const reference = getSweepReference()

  return (
    <div className="space-y-6">
      {sweep.length > 0 && (
        <DissociationCurve sweep={sweep} reference={reference} />
      )}
      {results.map(r => {
        const comparison = isEmulator(r.backend) ? hwResults[0] : emulatorResult
        return (
          <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BackendBadge backend={r.backend} />
                <span className="text-xs font-mono text-gray-500">{r.id}</span>
              </div>
              <StatusPill status="completed" />
            </div>
            {r.analysis.energy_hartree !== undefined && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] rounded p-3">
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Measured Energy</p>
                    <p className="text-lg font-mono text-white">{r.analysis.energy_hartree.toFixed(4)} <span className="text-xs text-gray-500">Ha</span></p>
                  </div>
                  <div className="bg-white/[0.02] rounded p-3">
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">FCI Reference</p>
                    <p className="text-lg font-mono text-gray-400">{r.analysis.fci_energy.toFixed(4)} <span className="text-xs text-gray-500">Ha</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                  <span className="text-gray-500">Error:</span>
                  <span className={r.analysis.chemical_accuracy ? 'text-[#00ff88]' : 'text-[#ff6b9d]'}>
                    {r.analysis.error_hartree !== undefined
                      ? `${r.analysis.error_hartree.toFixed(4)} Ha (${r.analysis.error_kcal_mol} kcal/mol)`
                      : `${r.analysis.error_kcal_mol} kcal/mol`
                    }
                  </span>
                  {r.analysis.chemical_accuracy ? (
                    <span className="text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded border border-[#00ff88]/20">
                      Chemical Accuracy
                    </span>
                  ) : (
                    <span className="text-[#ff6b9d] bg-[#ff6b9d]/10 px-2 py-0.5 rounded border border-[#ff6b9d]/20">
                      Above threshold
                    </span>
                  )}
                </div>
                <EnergyLevelDiagram result={r} comparisonResult={comparison} />
                {r.analysis.expectation_values && (
                  <div>
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Expectation Values</p>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(r.analysis.expectation_values as Record<string, number>).map(([op, val]) => (
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
            {hasMultiBasis(r.raw_counts) && (
              <MultiBasisCounts rawCounts={r.raw_counts} />
            )}
            {r.analysis.interpretation && (
              <p className="text-xs text-gray-300 mt-3 leading-relaxed">{r.analysis.interpretation}</p>
            )}
            {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
            <RawDataLink resultId={r.id} />
          </div>
        )
      })}
    </div>
  )
}

function RBResults({ results }: { results: ExperimentResult[] }) {
  return (
    <div className="space-y-6">
      {results.map(r => (
        <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BackendBadge backend={r.backend} />
              <span className="text-xs font-mono text-gray-500">{r.id}</span>
            </div>
            <StatusPill status="completed" />
          </div>
          {r.analysis.gate_fidelity !== undefined && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] rounded p-3">
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Gate Fidelity</p>
                  <p className="text-lg font-mono font-bold" style={{ color: r.analysis.gate_fidelity > 0.999 ? '#00ff88' : r.analysis.gate_fidelity > 0.99 ? '#00d4ff' : '#eab308' }}>
                    {(r.analysis.gate_fidelity * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white/[0.02] rounded p-3">
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Error per Gate</p>
                  <p className="text-lg font-mono text-white">{r.analysis.error_per_gate.toFixed(4)}</p>
                </div>
              </div>
              {r.analysis.survival_probabilities && (
                <RBDecayCurve
                  survival={r.analysis.survival_probabilities}
                  seqLengths={r.analysis.sequence_lengths || [1, 4, 8, 16, 32]}
                />
              )}
            </div>
          )}
          {r.analysis.interpretation && (
            <p className="text-xs text-gray-300 mt-3 leading-relaxed">{r.analysis.interpretation}</p>
          )}
          {isEmulator(r.backend) && <EmulatorNote />}
          {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
          <RawDataLink resultId={r.id} />
        </div>
      ))}
    </div>
  )
}

function QAOAResults({ results }: { results: ExperimentResult[] }) {
  return (
    <div className="space-y-6">
      {results.map(r => (
        <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BackendBadge backend={r.backend} />
              <span className="text-xs font-mono text-gray-500">{r.id}</span>
            </div>
            <StatusPill status="completed" />
          </div>
          {r.analysis.best_approximation_ratio !== undefined && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.02] rounded p-3">
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best Ratio</p>
                  <p className="text-lg font-mono font-bold" style={{
                    color: r.analysis.best_approximation_ratio > 0.9 ? '#00ff88' : r.analysis.best_approximation_ratio > 0.7 ? '#00d4ff' : '#eab308'
                  }}>
                    {(r.analysis.best_approximation_ratio * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white/[0.02] rounded p-3">
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best gamma</p>
                  <p className="text-lg font-mono text-white">{r.analysis.best_gamma?.toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.02] rounded p-3">
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best beta</p>
                  <p className="text-lg font-mono text-white">{r.analysis.best_beta?.toFixed(2)}</p>
                </div>
              </div>
              {r.analysis.heatmap && (
                <QAOAHeatmap
                  heatmap={r.analysis.heatmap}
                  gammaValues={r.analysis.gamma_values || [0.3, 0.6, 0.9]}
                  betaValues={r.analysis.beta_values || [0.3, 0.6, 0.9]}
                />
              )}
            </div>
          )}
          {r.analysis.interpretation && (
            <p className="text-xs text-gray-300 mt-3 leading-relaxed">{r.analysis.interpretation}</p>
          )}
          {isEmulator(r.backend) && <EmulatorNote />}
          {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
          <RawDataLink resultId={r.id} />
        </div>
      ))}
    </div>
  )
}

function QVResults({ results }: { results: ExperimentResult[] }) {
  return (
    <div className="space-y-6">
      {results.map(r => (
        <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BackendBadge backend={r.backend} />
              <span className="text-xs font-mono text-gray-500">{r.id}</span>
            </div>
            <StatusPill status="completed" />
          </div>
          {r.analysis.quantum_volume !== undefined && (
            <div className="space-y-3">
              <div className="bg-white/[0.02] rounded p-4 text-center">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Quantum Volume</p>
                <p className="text-3xl font-mono font-bold" style={{ color: '#14b8a6' }}>
                  {r.analysis.quantum_volume}
                </p>
              </div>
              {r.analysis.results_by_qubit_count && (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(r.analysis.results_by_qubit_count as Record<string, any>).map(([n, info]) => (
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
          {r.analysis.interpretation && (
            <p className="text-xs text-gray-300 mt-3 leading-relaxed">{r.analysis.interpretation}</p>
          )}
          {isEmulator(r.backend) && <EmulatorNote />}
          {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
          <RawDataLink resultId={r.id} />
        </div>
      ))}
    </div>
  )
}

function QRNGResults({ results }: { results: ExperimentResult[] }) {
  return (
    <div className="space-y-6">
      {results.map(r => {
        const sources = r.analysis.sources as Record<string, any> | undefined
        if (!sources) return null

        const sourceKeys = ['tuna9_raw', 'tuna9_debiased', 'emulator'] as const
        const sourceColors: Record<string, string> = {
          tuna9_raw: '#ff6b9d',
          tuna9_debiased: '#00ff88',
          emulator: '#00d4ff',
        }
        const testNames = sources.tuna9_raw?.tests?.map((t: any) => t.test) || []

        return (
          <div key={r.id} className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {sourceKeys.map(key => {
                const src = sources[key]
                if (!src) return null
                const color = sourceColors[key]
                const allPassed = src.passed === src.total
                return (
                  <div key={key} className="bg-white/[0.02] rounded p-3 border border-white/[0.03]">
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">{src.label}</p>
                    <p className="text-2xl font-mono font-bold" style={{ color }}>
                      {src.passed}/{src.total}
                    </p>
                    <p className="text-[10px] font-mono text-gray-500">
                      {allPassed ? 'All tests passed' : `${src.total - src.passed} tests failed`}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* NIST test table */}
            <div className="overflow-x-auto bg-white/[0.02] border border-white/5 rounded-lg p-4">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-gray-500 font-normal py-1.5 px-2 border-b border-white/5">NIST Test</th>
                    {sourceKeys.map(key => {
                      const src = sources[key]
                      if (!src) return null
                      return (
                        <th key={key} className="text-center text-gray-500 font-normal py-1.5 px-2 border-b border-white/5">
                          {src.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {testNames.map((testName: string, ti: number) => (
                    <tr key={testName} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-1.5 px-2 text-gray-300">{testName}</td>
                      {sourceKeys.map(key => {
                        const src = sources[key]
                        if (!src) return null
                        const test = src.tests?.[ti]
                        if (!test) return <td key={key} className="text-center py-1.5 px-2 text-gray-600">--</td>
                        const passed = test.pass === true || test.pass === 'True'
                        return (
                          <td key={key} className="text-center py-1.5 px-2">
                            <span className={`inline-flex items-center gap-1 ${passed ? 'text-[#00ff88]' : 'text-[#ff6b9d]'}`}>
                              {passed ? 'PASS' : 'FAIL'}
                              <span className="text-gray-600 text-[10px]">
                                p={typeof test.p_value === 'number' ? (test.p_value < 0.001 ? test.p_value.toExponential(1) : test.p_value.toFixed(3)) : '?'}
                              </span>
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key finding */}
            {r.analysis.key_finding && (
              <div className="px-3 py-2 rounded bg-[#f59e0b]/5 border border-[#f59e0b]/10">
                <p className="text-[11px] text-[#f59e0b] font-mono leading-relaxed">
                  {r.analysis.key_finding}
                </p>
              </div>
            )}

            {/* Debiasing stats */}
            {sources.tuna9_debiased && (
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <span className="text-gray-500">Discard rate: <span className="text-white">{(sources.tuna9_debiased.discard_rate * 100).toFixed(1)}%</span></span>
                <span className="text-gray-500">Raw bits: <span className="text-white">{sources.tuna9_debiased.raw_bits?.toLocaleString()}</span></span>
                <span className="text-gray-500">Debiased bits: <span className="text-white">{sources.tuna9_debiased.debiased_bits?.toLocaleString()}</span></span>
              </div>
            )}

            {r.circuit_cqasm && <CircuitBlock cqasm={r.circuit_cqasm} />}
            <RawDataLink resultId={r.id} />
          </div>
        )
      })}
    </div>
  )
}

function ResultsSection({ type, results }: { type: string; results: ExperimentResult[] }) {
  switch (type) {
    case 'bell_calibration': return <BellResults results={results} />
    case 'ghz_state': return <GHZResults results={results} />
    case 'vqe_h2': return <VQEResults results={results} />
    case 'rb_1qubit': return <RBResults results={results} />
    case 'qaoa_maxcut': return <QAOAResults results={results} />
    case 'quantum_volume': return <QVResults results={results} />
    case 'qrng_certification': return <QRNGResults results={results} />
    default: return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExperimentDetailPage({ params }: { params: { id: string } }) {
  const study = getStudyBySlug(params.id)
  if (!study) notFound()

  const results = getResultsByType(study.type)
  const allStudies = getAllStudies()
  const currentIdx = allStudies.findIndex(s => s.slug === study.slug)
  const prevStudy = currentIdx > 0 ? allStudies[currentIdx - 1] : null
  const nextStudy = currentIdx < allStudies.length - 1 ? allStudies[currentIdx + 1] : null
  const color = typeColors[study.type] || '#00d4ff'

  return (
    <>
      <Nav section="experiments" />

      <article className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-mono text-gray-500">{typeLabels[study.type] || study.type}</span>
              <span className="text-gray-700 font-mono">|</span>
              <span className="text-xs font-mono text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>

            <WorkflowBadge status={study.status} />

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-4 mb-3 leading-tight">
              {study.title}
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">{study.subtitle}</p>

            {study.abstract && (
              <p className="mt-4 text-sm text-gray-300 leading-relaxed max-w-2xl">{study.abstract}</p>
            )}
          </div>

          {/* Research Question */}
          <div className="mb-12 p-6 rounded-xl border-l-4 bg-white/[0.02]" style={{ borderColor: color }}>
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-3">Research Question</h2>
            <p className="text-white text-lg leading-relaxed">{study.researchQuestion}</p>
          </div>

          {/* Prior Work */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Prior Work</h2>
            <div
              className="prose-quantum"
              dangerouslySetInnerHTML={{ __html: study.priorWork }}
            />
          </section>

          {/* Method */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Method</h2>
            <div
              className="prose-quantum"
              dangerouslySetInnerHTML={{ __html: study.method }}
            />
          </section>

          {/* Results */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Results</h2>

            {results.length > 0 ? (
              <div className="space-y-6">
                {/* Platform comparison table */}
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
                  <h3 className="text-white font-bold text-sm mb-3">Platform Comparison</h3>
                  <PlatformTable results={results} />
                </div>

                {/* Type-specific visualizations */}
                <ResultsSection type={study.type} results={results} />
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-8 text-center">
                <p className="text-gray-500 font-mono">No results yet for this experiment type.</p>
                <p className="text-gray-600 text-xs font-mono mt-2">Results will appear here once the experiment daemon processes them.</p>
              </div>
            )}
          </section>

          {/* Discussion */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Discussion</h2>
            <div
              className="prose-quantum"
              dangerouslySetInnerHTML={{ __html: study.discussion }}
            />
          </section>

          {/* Sources */}
          {study.sources.length > 0 && (
            <div className="mb-12 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Sources & References</h3>
              <ul className="space-y-2">
                {study.sources.map((source) => (
                  <li key={source.url} className="text-sm">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00d4ff] hover:underline"
                    >
                      {source.label}
                    </a>
                    <span className="text-gray-600 text-xs font-mono ml-2 break-all">{source.url}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            {prevStudy ? (
              <Link
                href={`/experiments/${prevStudy.slug}`}
                className="flex-1 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group"
              >
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">&larr; Previous</span>
                <div className="text-sm text-gray-300 group-hover:text-white mt-1 line-clamp-1">{prevStudy.title}</div>
              </Link>
            ) : <div />}
            {nextStudy ? (
              <Link
                href={`/experiments/${nextStudy.slug}`}
                className="flex-1 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group text-right"
              >
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Next &rarr;</span>
                <div className="text-sm text-gray-300 group-hover:text-white mt-1 line-clamp-1">{nextStudy.title}</div>
              </Link>
            ) : <div />}
          </div>
        </div>
      </article>

      {/* Footer */}
      <Footer links={[{ href: '/experiments', label: 'All Experiments' }, { href: '/', label: 'Research Home' }]} />
    </>
  )
}
