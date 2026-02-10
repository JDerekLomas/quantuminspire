import Link from 'next/link'
import { getAllReports, PAPER_PIPELINE, type ReplicationReport } from '@/lib/replications'

export const metadata = {
  title: 'Paper Replications',
  description: 'Can AI agents systematically replicate quantum computing experiments? Tracking our progress paper by paper.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modeColor(mode: string): string {
  switch (mode) {
    case 'success': return 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
    case 'partial_noise': return 'bg-[#ff8c42]/10 text-[#ff8c42] border-[#ff8c42]/20'
    case 'noise_dominated': return 'bg-[#ff6b9d]/10 text-[#ff6b9d] border-[#ff6b9d]/20'
    default: return 'bg-white/5 text-gray-400 border-white/10'
  }
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'success': return 'PASS'
    case 'partial_noise': return 'PARTIAL'
    case 'noise_dominated': return 'FAIL'
    case 'circuit_translation': return 'XLATE'
    case 'missing_detail': return 'MISSING'
    case 'parameter_mismatch': return 'PARAM'
    default: return mode
  }
}

function backendLabel(b: string): string {
  switch (b) {
    case 'emulator': return 'QI Emulator'
    case 'emulator_rb': return 'QI Emulator (RB)'
    case 'ibm': return 'IBM Quantum'
    case 'ibm_torino': return 'IBM Torino'
    case 'tuna9': return 'QI Tuna-9'
    default: return b
  }
}

function backendColor(b: string): string {
  switch (b) {
    case 'emulator': case 'emulator_rb': return '#eab308'
    case 'ibm': case 'ibm_torino': return '#00d4ff'
    case 'tuna9': return '#8b5cf6'
    default: return '#666'
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20',
    in_progress: 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/20',
    planned: 'bg-white/5 text-gray-500 border-white/10',
  }
  return styles[status] || styles.planned
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function SummaryStats({ reports }: { reports: ReplicationReport[] }) {
  const totalClaims = reports.reduce((s, r) => s + r.summary.total_claims_tested, 0)
  const totalSuccesses = reports.reduce((s, r) => s + r.summary.successes, 0)
  const allBackends = new Set(reports.flatMap(r => r.backends_tested))
  const plannedPapers = PAPER_PIPELINE.filter(p => p.status === 'planned').length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { value: reports.length.toString(), label: 'Papers Replicated', sub: `${plannedPapers} more planned`, color: '#ff8c42' },
        { value: totalClaims.toString(), label: 'Claims Tested', sub: `across ${allBackends.size} backends`, color: '#00d4ff' },
        { value: `${totalClaims > 0 ? Math.round((totalSuccesses / totalClaims) * 100) : 0}%`, label: 'Pass Rate', sub: `${totalSuccesses}/${totalClaims} claims`, color: '#00ff88' },
        { value: allBackends.size.toString(), label: 'Backends', sub: Array.from(allBackends).map(backendLabel).join(', '), color: '#8b5cf6' },
      ].map(s => (
        <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
          <p className="text-2xl sm:text-3xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5 truncate">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}

function ReportCard({ report }: { report: ReplicationReport }) {
  const { paper, summary, comparisons, backends_tested } = report
  const passRate = summary.total_claims_tested > 0
    ? Math.round((summary.successes / summary.total_claims_tested) * 100)
    : 0

  const passColor = passRate === 100 ? '#00ff88' : passRate >= 50 ? '#ff8c42' : '#ff6b9d'

  return (
    <Link
      href={`/replications/${report.paper_id}`}
      className="block bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:border-[#ff8c42]/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white group-hover:text-[#ff8c42] transition-colors line-clamp-2">
            {paper.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{paper.authors} — {paper.journal}</p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">
            {paper.institution} | {paper.hardware}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="text-2xl font-black font-mono" style={{ color: passColor }}>
            {passRate}%
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            {summary.successes}/{summary.total_claims_tested} claims
          </div>
        </div>
      </div>

      {/* Backend badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {backends_tested.map(b => (
          <span
            key={b}
            className="text-[10px] font-mono px-2 py-0.5 rounded border"
            style={{ color: backendColor(b), borderColor: `${backendColor(b)}30`, backgroundColor: `${backendColor(b)}08` }}
          >
            {backendLabel(b)}
          </span>
        ))}
      </div>

      {/* Failure mode breakdown */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(summary.failure_mode_counts).map(([mode, count]) => (
          <span key={mode} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${modeColor(mode)}`}>
            {modeLabel(mode)}: {count}
          </span>
        ))}
      </div>

      {/* Claims preview */}
      <div className="space-y-2">
        {comparisons.slice(0, 3).map(comp => {
          // Find the "worst" backend result for this claim
          const results = Object.entries(comp.results_by_backend)
          const hasPass = results.some(([, r]) => r.failure_mode === 'success')
          const hasFail = results.some(([, r]) => r.failure_mode === 'noise_dominated')
          const statusColor = hasFail ? '#ff6b9d' : hasPass ? '#00ff88' : '#ff8c42'

          return (
            <div key={comp.claim_id} className="flex items-center gap-3 text-xs">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
              <span className="text-gray-300 truncate">{comp.description}</span>
            </div>
          )
        })}
        {comparisons.length > 3 && (
          <p className="text-[10px] text-gray-600 font-mono pl-4">
            +{comparisons.length - 3} more claims
          </p>
        )}
      </div>

      <div className="mt-4 text-xs font-mono text-[#ff8c42] opacity-0 group-hover:opacity-100 transition-opacity">
        View full report &rarr;
      </div>
    </Link>
  )
}

function PipelineCard({ paper }: { paper: typeof PAPER_PIPELINE[0] }) {
  const hasReport = PAPER_PIPELINE.find(p => p.id === paper.id)?.status === 'completed'

  return (
    <div className={`flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-lg px-5 py-3 ${hasReport ? '' : 'opacity-60'}`}>
      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${statusBadge(paper.status)}`}>
        {paper.status === 'completed' ? 'Done' : paper.status === 'in_progress' ? 'Running' : 'Planned'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{paper.title}</div>
        <div className="text-[10px] text-gray-500 font-mono">{paper.authors} — {paper.type}</div>
      </div>
      <span className="text-[10px] font-mono text-gray-600">{paper.qubits}q</span>
      <a
        href={`https://arxiv.org/abs/${paper.arxiv}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#00d4ff]/70 hover:text-[#00d4ff] font-mono"
      >
        arXiv
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReplicationsPage() {
  const reports = getAllReports()

  return (
    <>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="font-mono font-bold text-white tracking-wider text-sm"><span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span></span>
            </Link>
            <span className="text-gray-600 font-mono">/</span>
            <span className="text-sm font-mono text-gray-400">replications</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <Link href="/blog" className="hover:text-[#ff6b9d] transition-colors">Blog</Link>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#ff8c42]">
              Paper Replication
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Can AI Replicate<br />
            <span className="gradient-text-green">Quantum Experiments?</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mb-6">
            We attempt to reproduce published quantum computing results using AI-written code
            on multiple backends. The gaps between published and reproduced results
            reveal what&apos;s real, what&apos;s noisy, and where the field stands.
          </p>
          <p className="text-gray-400 max-w-3xl">
            Each paper is tested on up to three backends: a noiseless emulator (correctness baseline),{' '}
            <a href="https://www.quantum-inspire.com/" target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:underline">QI Tuna-9</a>{' '}
            (9 superconducting qubits), and{' '}
            <a href="https://quantum.ibm.com/" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">IBM Torino</a>{' '}
            (133 qubits). Claims are compared quantitatively against published values.
          </p>
        </div>
      </section>

      {/* Summary Stats */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <SummaryStats reports={reports} />
        </div>
      </section>

      {/* Research Questions */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                q: 'Are published results reproducible?',
                detail: 'We extract quantitative claims from papers and test whether AI-generated circuits produce matching numbers on noiseless emulators and real hardware.',
                color: '#ff8c42',
              },
              {
                q: 'Where does hardware noise break things?',
                detail: 'Emulator runs pass consistently. Hardware runs reveal the noise floor: which claims survive real-world decoherence, and which are swamped?',
                color: '#ff6b9d',
              },
              {
                q: 'Can AI close the gap?',
                detail: 'Failure mode classification tells us whether the gap is noise (mitigable), circuit translation (fixable), or missing methodology (structural).',
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

      {/* Replication Reports */}
      {reports.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-6">
              Completed Replications
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reports.map(report => (
                <ReportCard key={report.paper_id} report={report} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pipeline */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Replication Pipeline
          </h2>
          <div className="space-y-2">
            {PAPER_PIPELINE.map(paper => (
              <PipelineCard key={paper.id} paper={paper} />
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">Methodology</h2>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-4 text-sm text-gray-300 leading-relaxed">
            <p>
              <strong className="text-white">Claim extraction.</strong>{' '}
              Published claims are identified from paper text, figures, and supplementary material.
              Each claim has a published value, error bars (when available), and a reference figure.
            </p>
            <p>
              <strong className="text-white">Circuit generation.</strong>{' '}
              An AI agent (Claude Opus 4.6) writes the quantum circuits, Hamiltonian construction,
              and measurement analysis code. The agent uses PennyLane, Qiskit, and OpenFermion
              depending on the paper&apos;s methodology.
            </p>
            <p>
              <strong className="text-white">Failure classification.</strong>{' '}
              Results are classified as:{' '}
              <span className="text-[#00ff88]">success</span> (within published error bars),{' '}
              <span className="text-[#ff8c42]">partial noise</span> (qualitatively correct but degraded),{' '}
              <span className="text-[#ff6b9d]">noise dominated</span> (hardware noise overwhelms signal),
              or structural failures (circuit translation, parameter mismatch, missing methodology detail).
            </p>
            <p>
              <strong className="text-white">The research question.</strong>{' '}
              What do the gaps between published results and AI-reproduced results reveal about
              reproducibility in quantum computing? The finding is not the pass/fail — it&apos;s the
              pattern of where and why things break.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-mono">
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
          </div>
          <div className="flex gap-4 text-xs text-gray-500 font-mono">
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <Link href="/" className="hover:text-white transition-colors">Research Home</Link>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </>
  )
}
