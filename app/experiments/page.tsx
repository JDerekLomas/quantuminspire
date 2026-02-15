import Link from 'next/link'
import Nav from '@/components/Nav'
import { getAllResults, getQueue, getStats, getAllStudies, typeLabels, typeColors, getSweepEmulator, getSweepReference, getSweepHardware, type ExperimentResult, type SweepPoint, type SweepReference } from '@/lib/experiments'
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

export const metadata = {
  title: 'Live Experiments',
  description: 'Real-time results from quantum experiments running on Quantum Inspire and IBM Quantum hardware.',
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
// Experiment Cards
// ---------------------------------------------------------------------------

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
// QRNG Certification Card
// ---------------------------------------------------------------------------

function QRNGCertCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const sources = analysis.sources as Record<string, any> | undefined

  if (!sources) {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
        <h3 className="text-white font-bold">{result.id}</h3>
        <p className="text-xs text-gray-500 font-mono">No source data found</p>
      </div>
    )
  }

  const sourceKeys = ['tuna9_raw', 'tuna9_debiased', 'emulator'] as const
  const sourceColors: Record<string, string> = {
    tuna9_raw: '#ff6b9d',
    tuna9_debiased: '#00ff88',
    emulator: '#00d4ff',
  }

  // Get union of all test names
  const testNames = sources.tuna9_raw?.tests?.map((t: any) => t.test) || []

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#f59e0b]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.qrng_certification }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.qrng_certification}</span>
          </div>
          <h3 className="text-white font-bold">{analysis.title || result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {sources.tuna9_raw?.n_bits?.toLocaleString()} bits per source -- {new Date(result.completed).toLocaleDateString()}
          </p>
        </div>
        <StatusPill status="completed" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
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

      {/* NIST test comparison table */}
      <div className="overflow-x-auto">
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
      {analysis.key_finding && (
        <div className="mt-4 px-3 py-2 rounded bg-[#f59e0b]/5 border border-[#f59e0b]/10">
          <p className="text-[11px] text-[#f59e0b] font-mono leading-relaxed">
            {analysis.key_finding}
          </p>
        </div>
      )}

      {/* Debiasing stats */}
      {sources.tuna9_debiased && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono">
          <span className="text-gray-500">Discard rate: <span className="text-white">{(sources.tuna9_debiased.discard_rate * 100).toFixed(1)}%</span></span>
          <span className="text-gray-500">Raw bits: <span className="text-white">{sources.tuna9_debiased.raw_bits?.toLocaleString()}</span></span>
          <span className="text-gray-500">Debiased bits: <span className="text-white">{sources.tuna9_debiased.debiased_bits?.toLocaleString()}</span></span>
          <span className="text-gray-500">Ones fraction (raw): <span className="text-[#ff6b9d]">{sources.tuna9_raw?.tests?.[0]?.ones_fraction}</span></span>
          <span className="text-gray-500">Ones fraction (debiased): <span className="text-[#00ff88]">{sources.tuna9_debiased.tests?.[0]?.ones_fraction}</span></span>
        </div>
      )}

      {analysis.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}

      {result.circuit_cqasm && <CircuitBlock cqasm={result.circuit_cqasm} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table
// ---------------------------------------------------------------------------

function ComparisonTable({ results }: { results: ExperimentResult[] }) {
  const types = ['bell_calibration', 'ghz_state', 'vqe_h2', 'rb_1qubit', 'qaoa_maxcut', 'quantum_volume', 'connectivity_probe', 'repetition_code', 'detection_code']
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
    if (a.average_fidelity !== undefined) {
      const pct = a.average_fidelity * 100
      return { text: `${pct.toFixed(1)}%`, color: pct > 90 ? '#00ff88' : pct > 80 ? '#00d4ff' : '#eab308' }
    }
    if (a.average_syndrome_accuracy !== undefined) {
      const pct = a.average_syndrome_accuracy * 100
      return { text: `${pct.toFixed(1)}%`, color: pct > 90 ? '#00ff88' : pct > 70 ? '#eab308' : '#ff6b9d' }
    }
    if (a.overall_detection_rate !== undefined) {
      const pct = a.overall_detection_rate * 100
      return { text: `${pct.toFixed(1)}%`, color: pct > 90 ? '#00ff88' : pct > 70 ? '#eab308' : '#ff6b9d' }
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

// ---------------------------------------------------------------------------
// Connectivity Probe Card — 9x9 Heatmap
// ---------------------------------------------------------------------------

function ConnectivityHeatmap({ heatmap, numQubits }: { heatmap: Record<string, number>; numQubits: number }) {
  const cellSize = 36
  const pad = 30

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">CNOT Fidelity Heatmap</p>
      <div className="inline-block overflow-x-auto">
        <svg
          viewBox={`0 0 ${pad + numQubits * cellSize + 10} ${pad + numQubits * cellSize + 10}`}
          className="w-full max-w-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Column labels */}
          {Array.from({ length: numQubits }, (_, j) => (
            <text key={`col-${j}`} x={pad + j * cellSize + cellSize / 2} y={pad - 8} textAnchor="middle" fill="#666" fontFamily="monospace" fontSize="9">
              q{j}
            </text>
          ))}
          {/* Rows */}
          {Array.from({ length: numQubits }, (_, i) => (
            <g key={`row-${i}`}>
              <text x={pad - 6} y={pad + i * cellSize + cellSize / 2 + 3} textAnchor="end" fill="#666" fontFamily="monospace" fontSize="9">
                q{i}
              </text>
              {Array.from({ length: numQubits }, (_, j) => {
                const fid = heatmap[`${i},${j}`]
                const isDiag = i === j
                if (fid === undefined && !isDiag) {
                  return (
                    <rect key={j} x={pad + j * cellSize} y={pad + i * cellSize} width={cellSize - 2} height={cellSize - 2} rx="2" fill="rgba(255,255,255,0.02)" />
                  )
                }
                const val = isDiag ? 1.0 : fid
                const intensity = Math.max(0, Math.min(1, (val - 0.5) / 0.5))
                const r = Math.round(255 * (1 - intensity))
                const g = Math.round(255 * intensity)
                return (
                  <g key={j}>
                    <rect
                      x={pad + j * cellSize} y={pad + i * cellSize}
                      width={cellSize - 2} height={cellSize - 2} rx="2"
                      fill={isDiag ? 'rgba(255,255,255,0.05)' : `rgba(${Math.round(r * 0.3)}, ${Math.round(g * 0.8)}, ${Math.round(100 * intensity)}, 0.4)`}
                      stroke={isDiag ? 'transparent' : `rgba(${Math.round(r * 0.3)}, ${Math.round(g * 0.8)}, ${Math.round(100 * intensity)}, 0.2)`}
                      strokeWidth="0.5"
                    />
                    {!isDiag && (
                      <text
                        x={pad + j * cellSize + (cellSize - 2) / 2}
                        y={pad + i * cellSize + (cellSize - 2) / 2 + 3}
                        textAnchor="middle" fill={intensity > 0.5 ? '#fff' : '#888'}
                        fontFamily="monospace" fontSize="8"
                      >
                        {(val * 100).toFixed(0)}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function ConnectivityProbeCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#e879f9]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.connectivity_probe }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.connectivity_probe}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {analysis.average_fidelity !== undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Avg Fidelity</p>
              <p className="text-lg font-mono font-bold" style={{
                color: analysis.average_fidelity > 0.9 ? '#00ff88' : analysis.average_fidelity > 0.8 ? '#00d4ff' : '#eab308'
              }}>
                {(analysis.average_fidelity * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Pairs Tested</p>
              <p className="text-lg font-mono text-white">{analysis.num_pairs}</p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Best 5q Subgraph</p>
              <p className="text-sm font-mono text-[#e879f9]">
                {analysis.recommended_5q_subgraph?.length > 0
                  ? `[${analysis.recommended_5q_subgraph.join(', ')}]`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Best/worst pairs */}
          {analysis.best_pairs && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Best Pairs</p>
                {(analysis.best_pairs as Array<{pair: string; fidelity: number}>).slice(0, 5).map((p: {pair: string; fidelity: number}) => (
                  <div key={p.pair} className="flex items-center justify-between text-xs font-mono py-0.5">
                    <span className="text-gray-300">q{p.pair.replace('-', ' -- q')}</span>
                    <span className="text-[#00ff88]">{(p.fidelity * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Worst Pairs</p>
                {(analysis.worst_pairs as Array<{pair: string; fidelity: number}>).map((p: {pair: string; fidelity: number}) => (
                  <div key={p.pair} className="flex items-center justify-between text-xs font-mono py-0.5">
                    <span className="text-gray-300">q{p.pair.replace('-', ' -- q')}</span>
                    <span className="text-[#ff6b9d]">{(p.fidelity * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap */}
          {analysis.heatmap && (
            <ConnectivityHeatmap heatmap={analysis.heatmap} numQubits={analysis.num_qubits || 9} />
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
// Repetition Code Card
// ---------------------------------------------------------------------------

function RepetitionCodeCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)
  const variants = analysis.variant_results as Record<string, any> | undefined
  const decoder = analysis.decoder_comparison as Record<string, any> | undefined

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#22d3ee]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.repetition_code }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.repetition_code}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {analysis.average_syndrome_accuracy !== undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Syndrome Accuracy</p>
              <FidelityBar value={analysis.average_syndrome_accuracy} label="Avg across variants" />
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Logical Error Rate</p>
              <p className="text-lg font-mono font-bold" style={{
                color: analysis.average_logical_error_rate < 0.05 ? '#00ff88' : analysis.average_logical_error_rate < 0.15 ? '#eab308' : '#ff6b9d'
              }}>
                {(analysis.average_logical_error_rate * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5">After majority-vote correction</p>
            </div>
          </div>

          {/* Per-variant syndrome results */}
          {variants && (
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Syndrome Results by Variant</p>
              <div className="space-y-1">
                {Object.entries(variants).map(([name, v]: [string, any]) => {
                  if (v.note) return (
                    <div key={name} className="flex items-center gap-3 text-xs font-mono bg-white/[0.01] rounded px-3 py-1.5 border border-white/[0.03]">
                      <span className="text-gray-400 w-24">{name}</span>
                      <span className="text-gray-500 italic">{v.note}</span>
                    </div>
                  )
                  return (
                    <div key={name} className="flex items-center gap-3 text-xs font-mono bg-white/[0.01] rounded px-3 py-1.5 border border-white/[0.03]">
                      <span className="text-gray-300 w-24">{name}</span>
                      {v.expected_syndrome && (
                        <span className="text-gray-500">expected: <span className="text-gray-300">{v.expected_syndrome}</span></span>
                      )}
                      {v.syndrome_accuracy !== null && v.syndrome_accuracy !== undefined && (
                        <span style={{ color: v.syndrome_accuracy > 0.9 ? '#00ff88' : v.syndrome_accuracy > 0.7 ? '#eab308' : '#ff6b9d' }}>
                          {(v.syndrome_accuracy * 100).toFixed(1)}% correct
                        </span>
                      )}
                      <span className="text-gray-500 ml-auto">
                        logical err: <span className={v.logical_error_rate < 0.05 ? 'text-[#00ff88]' : 'text-[#eab308]'}>
                          {(v.logical_error_rate * 100).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Decoder comparison (NN vs Lookup) */}
          {decoder && (
            <div className="bg-white/[0.02] rounded p-4 border border-white/[0.03]">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-3">AI Decoder vs Lookup Table</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">NN Decoder (MLP)</p>
                  <p className="text-xl font-mono font-bold text-[#22d3ee]">
                    {((decoder.nn_accuracy || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">
                    {decoder.n_folds}-fold CV, {decoder.n_samples?.toLocaleString()} samples
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">Lookup Table</p>
                  <p className="text-xl font-mono font-bold text-gray-300">
                    {((decoder.lookup_accuracy || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">
                    Syndrome-based classification
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {[
                  { label: 'NN', value: decoder.nn_accuracy || 0, color: '#22d3ee' },
                  { label: 'Lookup', value: decoder.lookup_accuracy || 0, color: '#666' },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-gray-500 w-16">{d.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.value * 100}%`, backgroundColor: d.color }} />
                    </div>
                    <span style={{ color: d.color }}>{(d.value * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              {decoder.nn_improvement && (
                <p className="text-[10px] font-mono text-[#22d3ee] mt-2">
                  +{(decoder.nn_improvement * 100).toFixed(1)}% improvement from neural network decoder
                </p>
              )}
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
// Detection Code Card — [[4,2,2]]
// ---------------------------------------------------------------------------

function DetectionCodeCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const emu = isEmulator(result.backend)
  const variants = analysis.variant_results as Record<string, any> | undefined
  const decoder = analysis.decoder_comparison as Record<string, any> | undefined

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#a78bfa]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.detection_code }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.detection_code}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} -- {new Date(result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={result.backend} />
          <StatusPill status={analysis.status === 'FAILED' ? 'failed' : 'completed'} />
        </div>
      </div>

      {analysis.status === 'FAILED' && (
        <div className="space-y-3">
          <div className="bg-red-500/5 border border-red-500/20 rounded p-4">
            <p className="text-[10px] font-mono text-red-400/80 uppercase tracking-wider mb-2">Hardware Constraint</p>
            <p className="text-sm text-gray-300 leading-relaxed">{analysis.root_cause}</p>
          </div>
          {analysis.connectivity_analysis && (
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Topology Analysis</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-mono font-bold text-red-400">{analysis.connectivity_analysis.cnot_pairs_needing_routing}</p>
                  <p className="text-[10px] font-mono text-gray-500">CNOTs need routing</p>
                </div>
                <div>
                  <p className="text-lg font-mono font-bold text-yellow-400">{analysis.connectivity_analysis.max_degree}</p>
                  <p className="text-[10px] font-mono text-gray-500">Max qubit degree</p>
                </div>
                <div>
                  <p className="text-lg font-mono font-bold text-gray-400">{analysis.connectivity_analysis.required_degree_for_ancilla}</p>
                  <p className="text-[10px] font-mono text-gray-500">Required degree</p>
                </div>
              </div>
            </div>
          )}
          {analysis.jobs_attempted && (
            <div className="text-[10px] font-mono text-gray-500">
              {analysis.jobs_attempted.length} circuit variant(s) attempted, all rejected by hardware compiler
            </div>
          )}
        </div>
      )}

      {analysis.status !== 'FAILED' && analysis.overall_detection_rate !== undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Detection Rate</p>
              <p className="text-lg font-mono font-bold" style={{
                color: analysis.overall_detection_rate > 0.9 ? '#00ff88' : analysis.overall_detection_rate > 0.7 ? '#eab308' : '#ff6b9d'
              }}>
                {(analysis.overall_detection_rate * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5">Errors correctly flagged</p>
            </div>
            <div className="bg-white/[0.02] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">False Positive Rate</p>
              <p className="text-lg font-mono font-bold" style={{
                color: analysis.false_positive_rate < 0.05 ? '#00ff88' : analysis.false_positive_rate < 0.15 ? '#eab308' : '#ff6b9d'
              }}>
                {(analysis.false_positive_rate * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5">Clean shots flagged as error</p>
            </div>
          </div>

          {/* Decoder comparison */}
          {decoder && (
            <div className="bg-white/[0.02] rounded p-4 border border-white/[0.03]">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-3">AI Decoder vs Lookup Table</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">NN Decoder (MLP)</p>
                  <p className="text-xl font-mono font-bold text-[#a78bfa]">
                    {((decoder.nn_accuracy || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">
                    {decoder.n_folds}-fold CV, {decoder.n_samples} samples
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">Lookup Table</p>
                  <p className="text-xl font-mono font-bold text-gray-300">
                    {((decoder.lookup_detailed_accuracy || decoder.lookup_accuracy || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">
                    Syndrome-based classification
                  </p>
                </div>
              </div>
              {/* Accuracy bar comparison */}
              <div className="mt-3 space-y-1">
                {[
                  { label: 'NN', value: decoder.nn_accuracy || 0, color: '#a78bfa' },
                  { label: 'Lookup', value: decoder.lookup_detailed_accuracy || decoder.lookup_accuracy || 0, color: '#666' },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-gray-500 w-16">{d.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.value * 100}%`, backgroundColor: d.color }} />
                    </div>
                    <span style={{ color: d.color }}>{(d.value * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-variant detection results */}
          {variants && (
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Detection by Error Type</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(variants).map(([name, v]: [string, any]) => (
                  <div key={name} className="bg-white/[0.01] rounded px-3 py-2 border border-white/[0.03]">
                    <span className="text-[10px] font-mono text-gray-400">{name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-mono font-bold" style={{
                        color: v.detection_rate > 0.9 ? '#00ff88' : v.detection_rate > 0.7 ? '#eab308' : '#ff6b9d'
                      }}>
                        {(v.detection_rate * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-mono text-gray-600">{v.total_shots} shots</span>
                    </div>
                  </div>
                ))}
              </div>
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

function MitigationLadderCard({ result }: { result: ExperimentResult }) {
  const ladder = (result as any).ladder || {}
  const analysis = result.analysis
  const ranking = (analysis?.ranking || []) as Array<{label: string; energy: number; error_kcal: number; chemical_accuracy: boolean}>
  const best = analysis?.best_technique as {label: string; energy: number; error_kcal: number; chemical_accuracy: boolean} | undefined

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#10b981]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.vqe_mitigation_ladder }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.vqe_mitigation_ladder}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{(result as any).backend} -- {new Date((result as any).timestamp || result.completed).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <BackendBadge backend={(result as any).backend} />
          <StatusPill status="completed" />
        </div>
      </div>

      {best && (
        <div className="mb-4 bg-[#10b981]/5 border border-[#10b981]/20 rounded p-3">
          <p className="text-[10px] font-mono text-[#10b981]/80 uppercase tracking-wider mb-1">Best Technique</p>
          <p className="text-lg font-mono font-bold text-[#10b981]">{best.label}</p>
          <p className="text-sm font-mono text-white">{best.error_kcal} kcal/mol
            {best.chemical_accuracy && (
              <span className="ml-2 text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded border border-[#00ff88]/20 text-xs">
                Chemical Accuracy
              </span>
            )}
          </p>
        </div>
      )}

      {ranking.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Ranked Techniques ({ranking.length})</p>
          <div className="space-y-1">
            {ranking.filter(r => !isNaN(r.error_kcal)).map((r, i) => {
              const maxErr = Math.max(...ranking.filter(x => !isNaN(x.error_kcal)).map(x => x.error_kcal))
              const barWidth = maxErr > 0 ? (r.error_kcal / maxErr) * 100 : 0
              const chemAccLine = maxErr > 0 ? (1.0 / maxErr) * 100 : 0
              return (
                <div key={r.label} className="relative flex items-center gap-2 text-xs font-mono bg-white/[0.01] rounded px-3 py-1.5 border border-white/[0.03]">
                  <span className="text-gray-500 w-5 text-right">{i + 1}</span>
                  <span className="text-gray-300 w-52 truncate" title={r.label}>{r.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden relative">
                    {/* Chemical accuracy threshold line */}
                    <div className="absolute top-0 bottom-0 w-px bg-[#00ff88]/40 z-10" style={{ left: `${chemAccLine}%` }} />
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: r.chemical_accuracy ? '#10b981' : r.error_kcal < 5 ? '#eab308' : '#ff6b9d'
                      }}
                    />
                  </div>
                  <span className={`w-16 text-right ${r.chemical_accuracy ? 'text-[#10b981]' : r.error_kcal < 5 ? 'text-[#eab308]' : 'text-[#ff6b9d]'}`}>
                    {r.error_kcal.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] font-mono text-gray-500 mt-2">
            Green line = chemical accuracy threshold (1.0 kcal/mol). Values in kcal/mol.
          </p>
        </div>
      )}

      {analysis?.interpretation && (
        <p className="text-xs text-gray-300 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
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
    case 'qrng_certification':
      return <QRNGCertCard result={result} />
    case 'connectivity_probe':
      return <ConnectivityProbeCard result={result} />
    case 'repetition_code':
      return <RepetitionCodeCard result={result} />
    case 'detection_code':
      return <DetectionCodeCard result={result} />
    case 'vqe_mitigation_ladder':
      return <MitigationLadderCard result={result} />
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
  const sweepHardware = getSweepHardware()

  const pending = queue.filter(q => q.status === 'pending')

  // Build study index for linking to detail pages
  const studyIndex = Object.fromEntries(getAllStudies().map(s => [s.type, s.slug]))

  // Group by type
  const knownTypes = ['vqe_h2', 'bell_calibration', 'ghz_state', 'rb_1qubit', 'qaoa_maxcut', 'quantum_volume', 'qrng_certification', 'connectivity_probe', 'repetition_code', 'detection_code', 'vqe_mitigation_ladder', 'readout_calibration']
  const vqeResults = results.filter(r => r.type === 'vqe_h2')
  const bellResults = results.filter(r => r.type === 'bell_calibration')
  const ghzResults = results.filter(r => r.type === 'ghz_state')
  const rbResults = results.filter(r => r.type === 'rb_1qubit')
  const qaoaResults = results.filter(r => r.type === 'qaoa_maxcut')
  const qvResults = results.filter(r => r.type === 'quantum_volume')
  const qrngResults = results.filter(r => r.type === 'qrng_certification')
  const connectivityResults = results.filter(r => r.type === 'connectivity_probe')
  const repetitionResults = results.filter(r => r.type === 'repetition_code')
  const detectionResults = results.filter(r => r.type === 'detection_code')
  const mitigationLadderResults = results.filter(r => r.type === 'vqe_mitigation_ladder')
  const readoutCalResults = results.filter(r => r.type === 'readout_calibration')
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
    { type: 'qrng_certification', label: 'QRNG Certification -- Randomness Quality', results: qrngResults, color: '#f59e0b', description: 'Are quantum random numbers truly random? We run 8 NIST SP 800-22 statistical tests against raw hardware output, von Neumann debiased output, and emulator output. Raw Tuna-9 bits show measurable bias; debiasing fixes it completely.', wide: true },
    { type: 'connectivity_probe', label: 'Connectivity Probe', results: connectivityResults, color: '#e879f9', description: 'Map CNOT fidelity across all 36 qubit pairs on Tuna-9. The heatmap reveals which physical qubits are best-connected -- essential for choosing where to place error correction codes.', wide: true },
    { type: 'repetition_code', label: '3-Qubit Repetition Code', results: repetitionResults, color: '#22d3ee', description: 'The simplest quantum error correction code: 3 data qubits + 2 syndrome qubits detect and correct single bit-flip errors. Syndrome accuracy measures how well the hardware extracts error information.', wide: true },
    { type: 'detection_code', label: '[[4,2,2]] Error Detection Code', results: detectionResults, color: '#a78bfa', description: 'Four data qubits with XXXX and ZZZZ stabilizers detect any single-qubit error (X, Z, or Y). A neural network decoder trained on hardware syndrome data outperforms simple lookup-table decoding -- haiqu in action.', wide: true },
    { type: 'vqe_mitigation_ladder', label: 'Error Mitigation Ladder', results: mitigationLadderResults, color: '#10b981', description: 'Systematic comparison of error mitigation techniques for H\u2082 VQE: raw, post-selection, TREX, dynamical decoupling, twirling, and ZNE. Ranked by error in kcal/mol. IBM TREX achieved chemical accuracy (0.22 kcal/mol).', wide: true },
  ]

  if (otherResults.length > 0) {
    groups.push({ type: 'other', label: 'Other Experiments', results: otherResults, color: '#666', description: '', wide: false })
  }

  return (
    <>
      <Nav section="experiments" />

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
              <DissociationCurve sweep={sweepEmulator} reference={sweepReference} hardware={sweepHardware} />
            )}
            <FidelityComparisonChart results={results} />
          </div>
        </section>
      )}

      {/* Grouped Results */}
      {groups.map(group => {
        if (group.results.length === 0) return null
        const studySlug = studyIndex[group.type]

        return (
          <section key={group.type} className="px-6 pb-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                <h2 className="text-xl font-bold text-white">{group.label}</h2>
                <span className="text-xs font-mono text-gray-600">{group.results.length} result{group.results.length !== 1 ? 's' : ''}</span>
                {studySlug && (
                  <Link
                    href={`/experiments/${studySlug}`}
                    className="ml-auto text-xs font-mono hover:underline transition-colors"
                    style={{ color: group.color }}
                  >
                    Read full study &rarr;
                  </Link>
                )}
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

      {/* Methodology & Caveats */}
      {results.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-4">Methodology Notes</h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Statistical caveats.</strong>{' '}
                These are preliminary results from a small number of circuits and shots. Randomized benchmarking uses 5 random sequences per depth (standard protocols recommend 30+). Quantum Volume tests use 5 circuits per qubit count (IBM&apos;s protocol specifies 100+, with a two-sigma confidence interval). QAOA results reflect a single QAOA layer; deeper circuits may find better solutions.
              </p>
              <p>
                <strong className="text-white">Hardware variability.</strong>{' '}
                Results on real hardware (IBM, QI Tuna-9) vary between runs due to fluctuating qubit coherence, calibration drift, and crosstalk. A single run does not capture this variance. Error bars and multi-run statistics are planned.
              </p>
              <p>
                <strong className="text-white">Error mitigation.</strong>{' '}
                VQE results use parity post-selection (discarding states outside the target symmetry sector) but no advanced techniques like zero-noise extrapolation or probabilistic error cancellation. IBM runs use dynamical decoupling (XpXm) and Pauli twirling when available.
              </p>
              <p>
                <strong className="text-white">Emulator vs. hardware.</strong>{' '}
                Emulator results (qxelarator) represent noiseless ideal execution. Perfect fidelity/accuracy on the emulator is expected and not indicative of hardware capability. The value of emulator runs is as a correctness baseline.
              </p>
            </div>
          </div>
        </section>
      )}

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
