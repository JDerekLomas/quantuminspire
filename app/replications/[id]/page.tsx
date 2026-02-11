import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { notFound } from 'next/navigation'
import {
  getAllReportIds,
  getReportById,
  getAllReports,
  type ReplicationReport,
  type ReplicationComparison,
  type BackendResult,
} from '@/lib/replications'

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return getAllReportIds().map((id) => ({ id }))
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const report = getReportById(params.id)
  if (!report) return { title: 'Not Found' }
  return {
    title: `${report.paper.title} — Replication`,
    description: `Replication of ${report.paper.authors} (${report.paper.journal}). ${report.summary.successes}/${report.summary.total_claims_tested} claims reproduced.`,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modeColor(mode: string): string {
  switch (mode) {
    case 'success': return '#00ff88'
    case 'partial_noise': return '#ff8c42'
    case 'noise_dominated': return '#ff6b9d'
    case 'circuit_translation': return '#eab308'
    case 'missing_detail': return '#a78bfa'
    case 'parameter_mismatch': return '#eab308'
    default: return '#666'
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
    default: return mode.toUpperCase()
  }
}

function modeBgClass(mode: string): string {
  switch (mode) {
    case 'success': return 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
    case 'partial_noise': return 'bg-[#ff8c42]/10 text-[#ff8c42] border-[#ff8c42]/20'
    case 'noise_dominated': return 'bg-[#ff6b9d]/10 text-[#ff6b9d] border-[#ff6b9d]/20'
    default: return 'bg-white/5 text-gray-400 border-white/10'
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

function formatValue(val: number | boolean | undefined | null, unit: string): string {
  if (val === undefined || val === null) return '--'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (unit === 'Hartree') return `${val.toFixed(4)} Ha`
  if (unit === 'mHartree MAE') return `${(val * 1000).toFixed(4)} mHa`
  if (unit === 'Hartree MAE') return `${val.toFixed(4)} Ha`
  if (unit === 'fidelity') return `${(val * 100).toFixed(2)}%`
  if (unit === 'x improvement') return `${val.toFixed(1)}x`
  return val.toString()
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PassRateRing({ rate, successes, total }: { rate: number; successes: number; total: number }) {
  const color = rate === 1 ? '#00ff88' : rate >= 0.5 ? '#ff8c42' : '#ff6b9d'
  const pct = Math.round(rate * 100)
  const circumference = 2 * Math.PI * 40
  const dashOffset = circumference * (1 - rate)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="22" fontWeight="900" fontFamily="monospace">
          {pct}%
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">
          {successes}/{total}
        </text>
      </svg>
    </div>
  )
}

function ClaimCard({ comp, allBackends }: { comp: ReplicationComparison; allBackends: string[] }) {
  const results = Object.entries(comp.results_by_backend)
  const hasPass = results.some(([, r]) => r.failure_mode === 'success')
  const hasFail = results.some(([, r]) => r.failure_mode === 'noise_dominated')
  const accentColor = hasFail ? '#ff6b9d' : hasPass ? '#00ff88' : '#ff8c42'

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accentColor }} />
        <div>
          <h3 className="text-white font-bold text-sm">{comp.description}</h3>
          <div className="flex items-center gap-3 mt-1">
            {comp.figure && (
              <span className="text-[10px] font-mono text-gray-500">{comp.figure}</span>
            )}
            <span className="text-[10px] font-mono text-gray-600">
              Published: {formatValue(comp.published_value, comp.unit)}
              {comp.published_error !== null && comp.published_error !== undefined && (
                <> +/- {comp.published_error} {comp.unit}</>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-normal py-2 px-3 border-b border-white/5">Backend</th>
              <th className="text-right text-gray-500 font-normal py-2 px-3 border-b border-white/5">Measured</th>
              <th className="text-right text-gray-500 font-normal py-2 px-3 border-b border-white/5">Discrepancy</th>
              {comp.unit === 'Hartree' && (
                <th className="text-right text-gray-500 font-normal py-2 px-3 border-b border-white/5">kcal/mol</th>
              )}
              <th className="text-center text-gray-500 font-normal py-2 px-3 border-b border-white/5">Status</th>
            </tr>
          </thead>
          <tbody>
            {allBackends.map(b => {
              const r = comp.results_by_backend[b]
              if (!r) return (
                <tr key={b} className="border-b border-white/[0.03]">
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
                      style={{ color: backendColor(b), borderColor: `${backendColor(b)}30`, backgroundColor: `${backendColor(b)}08` }}>
                      {backendLabel(b)}
                    </span>
                  </td>
                  <td colSpan={comp.unit === 'Hartree' ? 3 : 2} className="py-2.5 px-3 text-center text-gray-600">--</td>
                  <td className="py-2.5 px-3 text-center text-gray-600">--</td>
                </tr>
              )

              if (r.status === 'no_data') return (
                <tr key={b} className="border-b border-white/[0.03]">
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
                      style={{ color: backendColor(b), borderColor: `${backendColor(b)}30`, backgroundColor: `${backendColor(b)}08` }}>
                      {backendLabel(b)}
                    </span>
                  </td>
                  <td colSpan={comp.unit === 'Hartree' ? 3 : 2} className="py-2.5 px-3 text-center text-gray-500 italic">
                    {r.note || 'No data'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-white/5 text-gray-500 border-white/10">
                      N/A
                    </span>
                  </td>
                </tr>
              )

              const mode = r.failure_mode || 'unknown'
              return (
                <tr key={b} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
                      style={{ color: backendColor(b), borderColor: `${backendColor(b)}30`, backgroundColor: `${backendColor(b)}08` }}>
                      {backendLabel(b)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-white">
                    {formatValue(r.measured_value, comp.unit)}
                  </td>
                  <td className="py-2.5 px-3 text-right" style={{ color: modeColor(mode) }}>
                    {r.discrepancy !== undefined ? (
                      typeof comp.published_value === 'boolean'
                        ? (r.measured_value === comp.published_value ? 'match' : 'mismatch')
                        : `${r.discrepancy > 0 ? '+' : ''}${r.discrepancy.toFixed(4)}`
                    ) : '--'}
                  </td>
                  {comp.unit === 'Hartree' && (
                    <td className="py-2.5 px-3 text-right" style={{ color: modeColor(mode) }}>
                      {r.error_kcal_mol !== undefined ? `${r.error_kcal_mol}` : '--'}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${modeBgClass(mode)}`}>
                      {modeLabel(mode)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Show failure descriptions for non-success results */}
      {results.filter(([, r]) => r.failure_description && r.failure_mode !== 'success' && r.status !== 'no_data').length > 0 && (
        <div className="mt-3 space-y-1">
          {results
            .filter(([, r]) => r.failure_description && r.failure_mode !== 'success' && r.status !== 'no_data')
            .map(([backend, r]) => (
              <p key={backend} className="text-[11px] text-gray-400 leading-relaxed">
                <span style={{ color: backendColor(backend) }}>{backendLabel(backend)}:</span>{' '}
                {r.failure_description}
              </p>
            ))
          }
        </div>
      )}
    </div>
  )
}

function FailureModeBreakdown({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((s, c) => s + c, 0)
  if (total === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {Object.entries(counts).map(([mode, count]) => {
        const pct = Math.round((count / total) * 100)
        return (
          <div key={mode} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: modeColor(mode) }} />
            <span className="text-xs font-mono text-gray-400">
              {modeLabel(mode)}
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: modeColor(mode) }}>
              {count} ({pct}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReplicationDetailPage({ params }: { params: { id: string } }) {
  const report = getReportById(params.id)
  if (!report) notFound()

  const { paper, summary, comparisons, backends_tested } = report
  const passRate = summary.total_claims_tested > 0
    ? summary.successes / summary.total_claims_tested
    : 0
  const passColor = passRate === 1 ? '#00ff88' : passRate >= 0.5 ? '#ff8c42' : '#ff6b9d'

  // Prev/next navigation
  const allReports = getAllReports()
  const currentIdx = allReports.findIndex(r => r.paper_id === report.paper_id)
  const prevReport = currentIdx > 0 ? allReports[currentIdx - 1] : null
  const nextReport = currentIdx < allReports.length - 1 ? allReports[currentIdx + 1] : null

  return (
    <>
      <Nav section="replications" />

      <article className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#ff8c42]">
                Paper Replication
              </span>
              <span className="text-gray-700 font-mono">|</span>
              <span className="text-[10px] font-mono text-gray-500">
                {summary.total_claims_tested} claims tested
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 leading-tight">
              {paper.title}
            </h1>
            <p className="text-gray-400 text-sm">
              {paper.authors} — {paper.journal}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <span className="text-[10px] font-mono text-gray-600">
                {paper.institution} | {paper.hardware}
              </span>
              <a
                href={paper.url || `https://arxiv.org/abs/${paper.arxiv}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00d4ff] hover:underline font-mono"
              >
                arXiv:{paper.arxiv}
              </a>
            </div>
          </div>

          {/* Summary row */}
          <div className="mb-12 flex flex-col sm:flex-row items-start sm:items-center gap-8 p-6 rounded-xl border-l-4 bg-white/[0.02]" style={{ borderColor: passColor }}>
            <PassRateRing
              rate={passRate}
              successes={summary.successes}
              total={summary.total_claims_tested}
            />
            <div className="flex-1 space-y-4">
              {/* Backend badges */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 mb-2">Backends Tested</p>
                <div className="flex flex-wrap gap-1.5">
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
              </div>

              {/* Failure mode breakdown */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 mb-2">Failure Modes</p>
                <FailureModeBreakdown counts={summary.failure_mode_counts} />
              </div>
            </div>
          </div>

          {/* Claims */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-6">
              Claim-by-Claim Comparison
            </h2>
            <div className="space-y-6">
              {comparisons.map(comp => (
                <ClaimCard key={comp.claim_id} comp={comp} allBackends={backends_tested} />
              ))}
            </div>
          </section>

          {/* Cross-backend summary table */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
              Cross-Backend Summary
            </h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-gray-500 font-normal py-2 px-3 border-b border-white/5">Backend</th>
                    <th className="text-center text-gray-500 font-normal py-2 px-3 border-b border-white/5">Claims Tested</th>
                    <th className="text-center text-gray-500 font-normal py-2 px-3 border-b border-white/5">Passed</th>
                    <th className="text-center text-gray-500 font-normal py-2 px-3 border-b border-white/5">Pass Rate</th>
                    <th className="text-center text-gray-500 font-normal py-2 px-3 border-b border-white/5">Primary Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {backends_tested.map(b => {
                    let tested = 0
                    let passed = 0
                    const modes: Record<string, number> = {}
                    comparisons.forEach(c => {
                      const r = c.results_by_backend[b]
                      if (!r || r.status === 'no_data') return
                      tested++
                      if (r.failure_mode === 'success') passed++
                      if (r.failure_mode) {
                        modes[r.failure_mode] = (modes[r.failure_mode] || 0) + 1
                      }
                    })
                    const bPassRate = tested > 0 ? passed / tested : 0
                    const bPassColor = bPassRate === 1 ? '#00ff88' : bPassRate >= 0.5 ? '#ff8c42' : '#ff6b9d'
                    const topMode = Object.entries(modes)
                      .filter(([m]) => m !== 'success')
                      .sort((a, b) => b[1] - a[1])[0]

                    return (
                      <tr key={b} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
                            style={{ color: backendColor(b), borderColor: `${backendColor(b)}30`, backgroundColor: `${backendColor(b)}08` }}>
                            {backendLabel(b)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-300">{tested}</td>
                        <td className="py-2.5 px-3 text-center text-gray-300">{passed}</td>
                        <td className="py-2.5 px-3 text-center font-bold" style={{ color: bPassColor }}>
                          {tested > 0 ? `${Math.round(bPassRate * 100)}%` : '--'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {topMode ? (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${modeBgClass(topMode[0])}`}>
                              {modeLabel(topMode[0])}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-gray-600">--</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Key findings */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">Key Findings</h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-3">
              {backends_tested.map(b => {
                let tested = 0
                let passed = 0
                let avgError: number | null = null
                let errorCount = 0
                comparisons.forEach(c => {
                  const r = c.results_by_backend[b]
                  if (!r || r.status === 'no_data') return
                  tested++
                  if (r.failure_mode === 'success') passed++
                  if (r.error_kcal_mol !== undefined) {
                    avgError = (avgError || 0) + r.error_kcal_mol
                    errorCount++
                  }
                })
                if (tested === 0) return null
                const avg = errorCount > 0 && avgError !== null ? (avgError / errorCount).toFixed(1) : null
                const isEmulator = b === 'emulator' || b === 'emulator_rb'

                return (
                  <p key={b} className="text-sm text-gray-300 leading-relaxed">
                    <span className="font-bold" style={{ color: backendColor(b) }}>{backendLabel(b)}</span>:{' '}
                    {passed}/{tested} claims matched.{' '}
                    {isEmulator && passed === tested && 'The simulation pipeline correctly reproduces the published physics.'}
                    {isEmulator && passed < tested && 'Some claims not matched — indicates protocol or implementation differences.'}
                    {!isEmulator && passed === tested && 'Hardware results match published values within error bars.'}
                    {!isEmulator && passed < tested && avg && `Average energy error: ${avg} kcal/mol. Hardware noise degrades precision.`}
                    {!isEmulator && passed < tested && !avg && 'Hardware noise prevents full reproduction.'}
                  </p>
                )
              })}
            </div>
          </section>

          {/* Metadata */}
          <section className="mb-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Report Metadata</h2>
            <div className="flex flex-wrap gap-6 text-xs font-mono text-gray-500">
              <span>Generated: {new Date(report.generated).toLocaleDateString()}</span>
              <span>Paper ID: {report.paper_id}</span>
              <a
                href={paper.url || `https://arxiv.org/abs/${paper.arxiv}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00d4ff] hover:underline"
              >
                View Paper
              </a>
              <a
                href={`https://github.com/JDerekLomas/quantuminspire/blob/main/research/replication-reports/${report.paper_id}.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                View raw JSON
              </a>
            </div>
          </section>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            {prevReport ? (
              <Link
                href={`/replications/${prevReport.paper_id}`}
                className="flex-1 p-4 rounded-lg border border-white/5 hover:border-[#ff8c42]/20 transition-all group"
              >
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">&larr; Previous</span>
                <div className="text-sm text-gray-300 group-hover:text-white mt-1 line-clamp-1">{prevReport.paper.title}</div>
              </Link>
            ) : <div />}
            {nextReport ? (
              <Link
                href={`/replications/${nextReport.paper_id}`}
                className="flex-1 p-4 rounded-lg border border-white/5 hover:border-[#ff8c42]/20 transition-all group text-right"
              >
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Next &rarr;</span>
                <div className="text-sm text-gray-300 group-hover:text-white mt-1 line-clamp-1">{nextReport.paper.title}</div>
              </Link>
            ) : <div />}
          </div>
        </div>
      </article>

      {/* Footer */}
      <Footer
        showYear
        links={[
          { href: '/replications', label: 'Replications', hoverColor: 'hover:text-[#ff8c42]' },
          { href: '/experiments', label: 'Experiments', hoverColor: 'hover:text-[#00ff88]' },
          { href: '/', label: 'Research Home' },
        ]}
      />
    </>
  )
}
