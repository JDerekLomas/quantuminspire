import Link from 'next/link'
import { getAllResults, getQueue, getStats, typeLabels, typeColors, type ExperimentResult } from '@/lib/experiments'

export const metadata = {
  title: 'Live Experiments — AI x Quantum',
  description: 'Real-time results from quantum experiments running on Quantum Inspire and IBM Quantum hardware.',
}

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

function CountsBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const colors = ['#00d4ff', '#00ff88', '#8b5cf6', '#ff8c42', '#ff6b9d', '#eab308', '#14b8a6', '#ef4444']
  return (
    <div className="space-y-1">
      {sorted.slice(0, 6).map(([bitstring, count], i) => {
        const pct = (count / total) * 100
        return (
          <div key={bitstring} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-500 w-12 text-right">|{bitstring}⟩</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
              />
            </div>
            <span className="text-gray-400 w-16 text-right">{count} ({pct.toFixed(1)}%)</span>
          </div>
        )
      })}
    </div>
  )
}

function flatCounts(raw: Record<string, any>): Record<string, number> {
  // Handle both flat counts {"00": 512} and nested {"z_basis": {"00": 512}}
  const first = Object.values(raw)[0]
  if (typeof first === 'object' && first !== null) return first as Record<string, number>
  return raw as Record<string, number>
}

function BellCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const counts = flatCounts(result.raw_counts)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#00d4ff]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.bell_calibration }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.bell_calibration}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} — {new Date(result.completed).toLocaleString()}</p>
        </div>
        <StatusPill status="completed" />
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
    </div>
  )
}

function GHZCard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  const counts = flatCounts(result.raw_counts)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#00ff88]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.ghz_state }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.ghz_state}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} — {new Date(result.completed).toLocaleString()}</p>
        </div>
        <StatusPill status="completed" />
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
      <div className="mt-3">
        <CountsBar counts={counts} total={total} />
      </div>
      {analysis.interpretation && (
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
    </div>
  )
}

function VQECard({ result }: { result: ExperimentResult }) {
  const analysis = result.analysis
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-[#8b5cf6]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.vqe_h2 }} />
            <span className="text-xs font-mono text-gray-500">{typeLabels.vqe_h2}</span>
          </div>
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{result.backend} — {new Date(result.completed).toLocaleString()}</p>
        </div>
        <StatusPill status="completed" />
      </div>

      {analysis.energy_hartree !== undefined && (
        <div className="space-y-3">
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
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-500">Error:</span>
            <span className={analysis.chemical_accuracy ? 'text-[#00ff88]' : 'text-[#eab308]'}>
              {analysis.error_kcal_mol} kcal/mol
            </span>
            {analysis.chemical_accuracy && (
              <span className="text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded border border-[#00ff88]/20">
                Chemical Accuracy
              </span>
            )}
          </div>
          {analysis.expectation_values && (
            <div className="grid grid-cols-5 gap-2 mt-2">
              {Object.entries(analysis.expectation_values as Record<string, number>).map(([op, val]) => (
                <div key={op} className="text-center">
                  <p className="text-[10px] font-mono text-gray-500">{`<${op}>`}</p>
                  <p className="text-xs font-mono text-white">{val.toFixed(3)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {analysis.interpretation && (
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{analysis.interpretation}</p>
      )}
    </div>
  )
}

function ResultCard({ result }: { result: ExperimentResult }) {
  switch (result.type) {
    case 'bell_calibration':
      return <BellCard result={result} />
    case 'ghz_state':
      return <GHZCard result={result} />
    case 'vqe_h2':
      return <VQECard result={result} />
    default:
      return (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
          <h3 className="text-white font-bold">{result.id}</h3>
          <p className="text-xs text-gray-500 font-mono">{result.type} — {result.backend}</p>
          <pre className="text-xs text-gray-400 mt-2 overflow-auto">{JSON.stringify(result.analysis, null, 2)}</pre>
        </div>
      )
  }
}

export default function ExperimentsPage() {
  const results = getAllResults()
  const queue = getQueue()
  const stats = getStats()

  const pending = queue.filter(q => q.status === 'pending')

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
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00ff88]">
              Live Hardware
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Quantum Experiments
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            Real-time results from experiments running on Quantum Inspire and IBM Quantum hardware.
            Submitted autonomously by our experiment daemon.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-6 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="text-gray-500">{stats.completed} completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-gray-500">{stats.pending} pending</span>
            </div>
            {stats.running > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-gray-500">{stats.running} running</span>
              </div>
            )}
            {stats.backends.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Backends:</span>
                <span className="text-gray-400">{stats.backends.join(', ')}</span>
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

      {/* Results */}
      {results.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-6">Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map(result => (
                <ResultCard key={result.id} result={result} />
              ))}
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
          <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Queue', desc: 'JSON experiment definitions in experiments/queue/', color: '#eab308' },
              { step: '2', title: 'Generate', desc: 'Daemon generates cQASM 3.0 circuits for QI hardware', color: '#00d4ff' },
              { step: '3', title: 'Execute', desc: 'Circuits submitted to Quantum Inspire (Tuna-9, Spin-2+)', color: '#8b5cf6' },
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
