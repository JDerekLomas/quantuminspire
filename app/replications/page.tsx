import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { getAllReports, PAPER_PIPELINE, type ReplicationReport } from '@/lib/replications'

export const metadata = {
  title: 'Paper Reproductions',
  description: 'Testing published quantum computing results on modern hardware with AI-generated circuits. Some are full replications, some are small-scale reproductions.',
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
    case 'tuna9': case 'tuna-9': return 'QI Tuna-9'
    case 'iqm_garnet': return 'IQM Garnet'
    default: return b
  }
}

function backendColor(b: string): string {
  switch (b) {
    case 'emulator': case 'emulator_rb': return '#eab308'
    case 'ibm': case 'ibm_torino': return '#00d4ff'
    case 'tuna9': case 'tuna-9': return '#8b5cf6'
    case 'iqm_garnet': return '#ff6b9d'
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
        { value: reports.length.toString(), label: 'Papers Tested', sub: `${plannedPapers} more planned`, color: '#ff8c42' },
        { value: totalClaims.toString(), label: 'Claims Tested', sub: `across ${allBackends.size} backends`, color: '#00d4ff' },
        { value: `${totalClaims > 0 ? Math.round((totalSuccesses / totalClaims) * 100) : 0}%`, label: 'Pass Rate', sub: `${totalSuccesses}/${totalClaims} claims`, color: '#00ff88' },
        { value: allBackends.size.toString(), label: 'Backends', sub: Array.from(allBackends).map(backendLabel).join(', '), color: '#8b5cf6' },
      ].map(s => (
        <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
          <p className="text-2xl sm:text-3xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">{s.sub}</p>
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
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {paper.institution} | {paper.hardware}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="text-2xl font-black font-mono" style={{ color: passColor }}>
            {passRate}%
          </div>
          <div className="text-[10px] text-gray-400 font-mono">
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
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} aria-hidden="true" />
              <span className="text-gray-300 truncate">{comp.description}</span>
            </div>
          )
        })}
        {comparisons.length > 3 && (
          <p className="text-[10px] text-gray-500 font-mono pl-4">
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
        <div className="text-[10px] text-gray-400 font-mono">{paper.authors} — {paper.type}</div>
      </div>
      <span className="text-[10px] font-mono text-gray-500">{paper.qubits}q</span>
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
      <Nav section="replications" />
      <main id="main-content">

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#ff8c42]">
              Paper Reproductions
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Testing Published<br />
            <span className="gradient-text-green">Quantum Results</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mb-6">
            We reproduce published quantum computing results using AI-written circuits
            on modern hardware. Some are full replications at original scale, others are
            small-scale reproductions that verify the underlying mechanisms.
          </p>
          <p className="text-gray-400 max-w-3xl">
            Each paper is tested on up to four backends: a noiseless emulator (correctness baseline),{' '}
            <a href="https://www.quantum-inspire.com/" target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:underline">QI Tuna-9</a>{' '}
            (9 superconducting qubits),{' '}
            <a href="https://www.meetiqm.com/iqm-garnet" target="_blank" rel="noopener noreferrer" className="text-[#ff6b9d] hover:underline">IQM Garnet</a>{' '}
            (20 qubits), and{' '}
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

      {/* Cross-Platform Comparison */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-6">
            Three Chips, One Suite
          </h2>
          <p className="text-sm text-gray-400 mb-6 max-w-3xl">
            Same circuits, different hardware. Each metric tested on QI Tuna-9 (9 superconducting qubits),
            IQM Garnet (20 qubits), and IBM Torino (133 qubits).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="text-left py-3 pr-4 text-gray-400 font-mono text-xs">Metric</th>
                  {[
                    { name: 'QI Tuna-9', qubits: '9q', color: '#8b5cf6' },
                    { name: 'IQM Garnet', qubits: '20q', color: '#ff6b9d' },
                    { name: 'IBM Torino', qubits: '133q', color: '#00d4ff' },
                  ].map(b => (
                    <th scope="col" key={b.name} className="text-center py-3 px-3 font-mono text-xs" style={{ color: b.color }}>
                      {b.name} <span className="text-gray-500">({b.qubits})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {[
                  { metric: 'Bell fidelity', tuna9: '93.5%', iqm: '98.1%', ibm: '86.5%', best: 'iqm' },
                  { metric: 'GHZ-3 fidelity', tuna9: '88.9%', iqm: '93.9%', ibm: '82.9%', best: 'iqm' },
                  { metric: 'GHZ-5 fidelity', tuna9: '83.8%', iqm: '81.8%', ibm: '76.6%', best: 'tuna9' },
                  { metric: 'GHZ-10', tuna9: 'n/a', iqm: '54.7%', ibm: '62.2%', best: 'ibm' },
                  { metric: 'Quantum Volume', tuna9: '16', iqm: '32', ibm: '32', best: 'both' },
                  { metric: 'RB gate fidelity', tuna9: '99.82%', iqm: '99.82%', ibm: '99.99%*', best: 'tuna9' },
                  { metric: 'VQE H2 (kcal/mol)', tuna9: '0.92', iqm: '--', ibm: '0.22', best: 'ibm' },
                  { metric: 'Dominant noise', tuna9: 'Dephasing', iqm: 'Dephasing', ibm: 'Depolarizing', best: '' },
                ].map(row => (
                  <tr key={row.metric} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4 text-gray-300">{row.metric}</td>
                    <td className={`py-2.5 px-3 text-center ${row.best === 'tuna9' ? 'text-[#8b5cf6] font-bold' : 'text-gray-400'}`}>
                      {row.tuna9}
                    </td>
                    <td className={`py-2.5 px-3 text-center ${row.best === 'iqm' ? 'text-[#ff6b9d] font-bold' : 'text-gray-400'}`}>
                      {row.iqm}
                    </td>
                    <td className={`py-2.5 px-3 text-center ${row.best === 'ibm' ? 'text-[#00d4ff] font-bold' : 'text-gray-400'}`}>
                      {row.ibm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-3">
            * IBM RB inflated by transpiler collapsing Clifford sequences. Tuna-9/IQM values are true gate fidelity.
            Bold = best per metric. VQE: IBM uses TREX, Tuna-9 uses hybrid PS+REM. -- = not yet tested.
          </p>
        </div>
      </section>

      {/* Replication Heatmap */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-6">
            Results by Backend
          </h2>
          <p className="text-sm text-gray-400 mb-6 max-w-3xl">
            Which papers pass on which hardware? Green = all claims pass. Orange = partial.
            Red = fails. Gray = not yet tested.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="text-left py-3 pr-4 text-gray-400 font-mono text-xs">Paper</th>
                  <th scope="col" className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#eab308' }}>Emulator</th>
                  <th scope="col" className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#8b5cf6' }}>Tuna-9</th>
                  <th scope="col" className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#00d4ff' }}>IBM Torino</th>
                  <th scope="col" className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#ff6b9d' }}>IQM Garnet</th>
                  <th scope="col" className="text-right py-3 pl-4 text-gray-400 font-mono text-xs">Type</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {[
                  { paper: 'Cross 2019', emulator: 'pass', tuna9: 'pass', ibm: 'pass', iqm: 'pass', type: 'QV + RB', note: '3/3 — same scale, different hardware' },
                  { paper: 'Sagastizabal 2019', emulator: 'pass', tuna9: 'pass', ibm: 'pass', iqm: null, type: 'VQE + EM', note: '4/4 — same scale, different hardware' },
                  { paper: 'Kandala 2017', emulator: 'pass', tuna9: 'pass', ibm: 'pass', iqm: null, type: 'VQE', note: '5/5 — H2 only (omits LiH, BeH2)' },
                  { paper: 'Peruzzo 2014', emulator: 'pass', tuna9: 'partial', ibm: 'fail', iqm: null, type: 'VQE', note: '6/8 — superconducting, not photonic' },
                  { paper: 'Harrigan 2021', emulator: 'pass', tuna9: 'pass', ibm: null, iqm: null, type: 'QAOA', note: '4/4 — 3-6 qubits (original: 23)' },
                  { paper: 'Kim 2023', emulator: 'pass', tuna9: 'partial', ibm: 'partial', iqm: null, type: 'Ising', note: '3/3 — 9 qubits (original: 127)' },
                ].map(row => {
                  const cellStyle = (val: string | null) => {
                    if (val === null) return 'text-gray-700 bg-white/[0.01]'
                    if (val === 'pass') return 'text-[#00ff88] bg-[#00ff88]/5'
                    if (val === 'partial') return 'text-[#ff8c42] bg-[#ff8c42]/5'
                    return 'text-[#ff6b9d] bg-[#ff6b9d]/5'
                  }
                  const cellLabel = (val: string | null) => {
                    if (val === null) return '--'
                    if (val === 'pass') return 'PASS'
                    if (val === 'partial') return 'PARTIAL'
                    return 'FAIL'
                  }
                  return (
                    <tr key={row.paper} className="border-b border-white/5">
                      <td className="py-2.5 pr-4 text-gray-300">
                        {row.paper}
                        <span className="text-gray-500 ml-2">{row.note}</span>
                      </td>
                      <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.emulator)}`}>{cellLabel(row.emulator)}</td>
                      <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.tuna9)}`}>{cellLabel(row.tuna9)}</td>
                      <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.ibm)}`}>{cellLabel(row.ibm)}</td>
                      <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.iqm)}`}>{cellLabel(row.iqm)}</td>
                      <td className="py-2.5 pl-4 text-right text-gray-500">{row.type}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-3">
            PASS = all tested claims within published error bars. PARTIAL = some claims pass, some fail due to hardware noise.
            FAIL = no claims pass on hardware. -- = not yet tested. Notes show scope relative to original paper.
          </p>
        </div>
      </section>

      {/* Research Questions */}
      <section className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                q: 'Do published results hold up?',
                detail: 'We extract quantitative claims from papers and test whether AI-generated circuits produce matching numbers on noiseless emulators and real hardware. Some tests are at original scale, others are smaller-scale checks of the underlying mechanisms.',
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
              Completed Reports
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
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            Paper Pipeline
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
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">Methodology</h2>
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
      </main>

      <Footer
        maxWidth="max-w-6xl"
        showYear
        links={[
          { href: '/experiments', label: 'Experiments', hoverColor: 'hover:text-[#00ff88]' },
          { href: '/', label: 'Research Home' },
        ]}
      />
    </>
  )
}
