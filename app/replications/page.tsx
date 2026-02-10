import Link from 'next/link'
import { getAllReports, PAPER_PIPELINE, type ReplicationReport, type BackendResult } from '@/lib/replications'

export const metadata = {
  title: 'Paper Replications — AI x Quantum',
  description: 'Can AI agents systematically replicate quantum computing experiments? Tracking our progress paper by paper.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(severity: string): string {
  switch (severity) {
    case 'none': return 'text-emerald-400'
    case 'low': return 'text-yellow-400'
    case 'medium': return 'text-orange-400'
    case 'high': return 'text-red-400'
    default: return 'text-zinc-400'
  }
}

function modeIcon(mode: string): string {
  switch (mode) {
    case 'success': return 'PASS'
    case 'partial_noise': return 'PARTIAL'
    case 'noise_dominated': return 'FAIL'
    case 'circuit_translation': return 'XLATE'
    case 'missing_detail': return 'MISSING'
    case 'parameter_mismatch': return 'PARAM'
    default: return '?'
  }
}

function modeColor(mode: string): string {
  switch (mode) {
    case 'success': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'partial_noise': return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    case 'noise_dominated': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'planned': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
  }
}

function backendLabel(b: string): string {
  switch (b) {
    case 'emulator': return 'QI Emulator'
    case 'ibm': return 'IBM Hardware'
    case 'tuna9': return 'QI Tuna-9'
    default: return b
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function SummaryStats({ reports }: { reports: ReplicationReport[] }) {
  const totalClaims = reports.reduce((s, r) => s + r.summary.total_claims_tested, 0)
  const totalSuccesses = reports.reduce((s, r) => s + r.summary.successes, 0)
  const totalPapers = reports.length
  const plannedPapers = PAPER_PIPELINE.filter(p => p.status === 'planned').length

  const stats = [
    { label: 'Papers Analyzed', value: totalPapers, sub: `${plannedPapers} planned` },
    { label: 'Claims Tested', value: totalClaims, sub: `across ${new Set(reports.flatMap(r => r.backends_tested)).size} backends` },
    { label: 'Successful', value: totalSuccesses, sub: `${totalClaims > 0 ? Math.round((totalSuccesses / totalClaims) * 100) : 0}% pass rate` },
    { label: 'Failure Modes', value: new Set(reports.flatMap(r => Object.keys(r.summary.failure_mode_counts).filter(k => k !== 'success'))).size, sub: 'distinct categories' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      {stats.map(s => (
        <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-mono font-bold text-white">{s.value}</div>
          <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

function PaperPipeline() {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">Replication Pipeline</h2>
      <div className="space-y-2">
        {PAPER_PIPELINE.map(paper => (
          <div key={paper.id} className="flex items-center gap-3 bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3">
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${statusColor(paper.status)}`}>
              {paper.status}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{paper.title}</div>
              <div className="text-xs text-zinc-500">{paper.authors} — {paper.journal}</div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500">{paper.qubits}q</span>
              <span className="text-[10px] font-mono text-zinc-600">{paper.type}</span>
            </div>
            <a
              href={`https://arxiv.org/abs/${paper.arxiv}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400/70 hover:text-cyan-400 font-mono"
            >
              arXiv
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClaimCard({ comparison, backends }: { comparison: ReplicationReport['comparisons'][0]; backends: string[] }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-white">{comparison.description}</h4>
          {comparison.figure && (
            <span className="text-[10px] text-zinc-500 font-mono">{comparison.figure}</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400 font-mono">
            Published: {typeof comparison.published_value === 'boolean'
              ? (comparison.published_value ? 'Yes' : 'No')
              : comparison.published_value}
            {comparison.published_error && ` +/- ${comparison.published_error}`}
            {comparison.unit !== 'boolean' && ` ${comparison.unit}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {backends.map(backend => {
          const res = comparison.results_by_backend[backend]
          if (!res || res.status === 'no_data') {
            return (
              <div key={backend} className="bg-zinc-800/50 rounded px-3 py-2">
                <div className="text-[10px] text-zinc-500 font-mono mb-1">{backendLabel(backend)}</div>
                <div className="text-xs text-zinc-600">No data</div>
              </div>
            )
          }
          return (
            <div key={backend} className="bg-zinc-800/50 rounded px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500 font-mono">{backendLabel(backend)}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${modeColor(res.failure_mode || '')}`}>
                  {modeIcon(res.failure_mode || '')}
                </span>
              </div>
              <div className="text-sm font-mono text-white">
                {typeof res.measured_value === 'boolean'
                  ? (res.measured_value ? 'Yes' : 'No')
                  : typeof res.measured_value === 'number'
                    ? res.measured_value.toFixed(4)
                    : '—'}
              </div>
              {res.error_kcal_mol !== undefined && (
                <div className={`text-[10px] font-mono mt-0.5 ${severityColor(res.severity || '')}`}>
                  {res.error_kcal_mol} kcal/mol
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportCard({ report }: { report: ReplicationReport }) {
  const { paper, summary, comparisons, backends_tested } = report
  const passRate = summary.total_claims_tested > 0
    ? Math.round((summary.successes / summary.total_claims_tested) * 100)
    : 0

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">{paper.title}</h3>
          <div className="text-xs text-zinc-400 mt-1">
            {paper.authors} — {paper.journal}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Original hardware: {paper.hardware} ({paper.institution})
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400/70 hover:text-cyan-400 font-mono"
          >
            arXiv:{paper.arxiv}
          </a>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-mono font-bold ${passRate >= 50 ? 'text-emerald-400' : passRate > 0 ? 'text-orange-400' : 'text-red-400'}`}>
              {passRate}%
            </span>
            <span className="text-[10px] text-zinc-500">
              ({summary.successes}/{summary.total_claims_tested} claims)
            </span>
          </div>
        </div>
      </div>

      {/* Failure mode breakdown */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(summary.failure_mode_counts).map(([mode, count]) => (
          <span key={mode} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${modeColor(mode)}`}>
            {mode}: {count}
          </span>
        ))}
      </div>

      {/* Claims */}
      <div className="space-y-3">
        {comparisons.map(comp => (
          <ClaimCard key={comp.claim_id} comparison={comp} backends={backends_tested} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReplicationsPage() {
  const reports = getAllReports()

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-xs text-zinc-500 hover:text-cyan-400 font-mono mb-4 block">
            &larr; Back to home
          </Link>
          <h1 className="text-3xl font-bold text-white">Paper Replications</h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Can AI agents systematically replicate quantum computing experiments?
            We attempt to reproduce published results on multiple backends and track what matches,
            what fails, and why.
          </p>
        </div>

        {/* Summary stats */}
        <SummaryStats reports={reports} />

        {/* Pipeline */}
        <PaperPipeline />

        {/* Reports */}
        {reports.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Replication Reports</h2>
            {reports.map(report => (
              <ReportCard key={report.paper_id} report={report} />
            ))}
          </div>
        )}

        {reports.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-sm">No replication reports generated yet.</p>
            <p className="text-xs mt-1 font-mono">Run: python agents/replication_analyzer.py --all</p>
          </div>
        )}

        {/* Methodology */}
        <div className="mt-12 bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-3">Methodology</h2>
          <div className="text-xs text-zinc-400 space-y-2">
            <p>
              Each paper is replicated on up to three backends: QI emulator (noiseless),
              IBM Quantum hardware (ibm_marrakesh, 156 qubits), and QI Tuna-9 (9 superconducting qubits).
            </p>
            <p>
              Published claims are extracted from the paper text and compared quantitatively against
              our measured values. Failure modes are classified as: <strong className="text-emerald-400">success</strong> (within
              published error bars), <strong className="text-orange-400">partial noise</strong> (qualitatively correct but
              degraded), <strong className="text-red-400">noise dominated</strong> (hardware noise overwhelms signal),
              or structural failures (circuit translation, parameter mismatch, missing detail).
            </p>
            <p>
              The research question: what do the gaps between published results and AI-reproduced
              results reveal about reproducibility in quantum computing?
            </p>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <Link href="/experiments" className="text-xs text-cyan-400/70 hover:text-cyan-400 font-mono">
            View all experiments &rarr;
          </Link>
        </div>
      </div>
    </main>
  )
}
