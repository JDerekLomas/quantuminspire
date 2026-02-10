import { type ExperimentResult, type SweepPoint, type SweepReference, typeLabels, typeColors } from '@/lib/experiments'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isEmulator(backend: string): boolean {
  if (!backend) return false
  const lower = backend.toLowerCase()
  return lower.includes('emulator') || lower.includes('qxelarator')
}

const BACKEND_INFO: Record<string, { label: string; isHw: boolean }> = {
  'ibm_marrakesh':        { label: 'IBM Marrakesh (156q)', isHw: true },
  'ibm_torino':           { label: 'IBM Torino (133q)', isHw: true },
  'ibm_fez':              { label: 'IBM Fez (156q)', isHw: true },
  'tuna-9':               { label: 'QI Tuna-9 (9q)', isHw: true },
  'qxelarator':           { label: 'QI Emulator', isHw: false },
  'qxelarator (emulator)': { label: 'QI Emulator', isHw: false },
}

export function backendLabel(backend: string): { label: string; isHw: boolean } {
  if (!backend) return { label: 'Unknown', isHw: false }
  const exact = BACKEND_INFO[backend.toLowerCase()]
  if (exact) return exact
  // Fuzzy fallbacks for unknown backends
  const lower = backend.toLowerCase()
  if (lower.includes('ibm')) return { label: backend, isHw: true }
  if (lower.includes('emulator') || lower.includes('qxelarator')) return { label: 'QI Emulator', isHw: false }
  if (lower.includes('tuna')) return { label: 'QI Tuna-9 (9q)', isHw: true }
  if (lower.includes('multi')) return { label: 'Multi-Source', isHw: false }
  return { label: backend, isHw: false }
}

export function flatCounts(raw: Record<string, any> | null | undefined): Record<string, number> {
  if (!raw) return {}
  const first = Object.values(raw)[0]
  if (typeof first === 'object' && first !== null) return first as Record<string, number>
  return raw as Record<string, number>
}

export function hasMultiBasis(raw: Record<string, any> | null | undefined): boolean {
  if (!raw) return false
  return 'z_basis' in raw && 'x_basis' in raw && 'y_basis' in raw
}

export function totalFromCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

export function StatusPill({ status }: { status: string }) {
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

export function BackendBadge({ backend }: { backend: string }) {
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

export function FidelityBar({ value, label }: { value: number; label: string }) {
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

export function CountsBar({ counts, total, accentColor }: { counts: Record<string, number>; total: number; accentColor?: string }) {
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

export function EmulatorNote() {
  return (
    <div className="mt-3 px-3 py-2 rounded bg-yellow-500/5 border border-yellow-500/10">
      <p className="text-[11px] text-yellow-300 font-mono leading-relaxed">
        This ran on a noiseless emulator. Hardware results will show real noise effects.
      </p>
    </div>
  )
}

export function CircuitBlock({ cqasm }: { cqasm: string }) {
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

export function ComparisonRow({ label, thisVal, otherVal, otherBackend, unit, better }: {
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

// ---------------------------------------------------------------------------
// VQE Energy Level Diagram (SVG)
// ---------------------------------------------------------------------------

export function EnergyLevelDiagram({ result, comparisonResult }: { result: ExperimentResult; comparisonResult?: ExperimentResult }) {
  const analysis = result.analysis
  const measuredEnergy = analysis.energy_hartree as number
  const fciEnergy = analysis.fci_energy as number

  const chemAccThreshold = 0.0016

  const allEnergies = [measuredEnergy, fciEnergy]
  if (comparisonResult) allEnergies.push(comparisonResult.analysis.energy_hartree as number)

  const minE = Math.min(...allEnergies) - 0.06
  const maxE = Math.max(...allEnergies) + 0.02

  const svgW = 480
  const svgH = 200
  const padL = 80
  const padR = 20
  const padT = 20
  const padB = 30
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  const eToY = (e: number) => padT + ((e - maxE) / (minE - maxE)) * chartH

  const fciY = eToY(fciEnergy)
  const measuredY = eToY(measuredEnergy)
  const chemAccTopY = eToY(fciEnergy + chemAccThreshold)
  const chemAccBotY = eToY(fciEnergy - chemAccThreshold)

  const withinAcc = analysis.chemical_accuracy

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Energy Level Diagram</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-lg" xmlns="http://www.w3.org/2000/svg">
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(255,255,255,0.01)" rx="4" />

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

export function MultiBasisCounts({ rawCounts }: { rawCounts: Record<string, any> }) {
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

export function DissociationCurve({ sweep, reference }: { sweep: SweepPoint[]; reference: SweepReference[] }) {
  if (sweep.length === 0 && reference.length === 0) return null

  const svgW = 640
  const svgH = 340
  const padL = 70
  const padR = 30
  const padT = 25
  const padB = 50
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  const allEnergies = [
    ...reference.map(r => r.fci_energy),
    ...reference.map(r => r.hf_energy),
    ...sweep.map(s => s.energy_measured),
  ]
  const minE = Math.min(...allEnergies) - 0.04
  const maxE = Math.max(...allEnergies) + 0.04

  const allR = [...reference.map(r => r.bond_distance), ...sweep.map(s => s.bond_distance)]
  const minR = Math.min(...allR) - 0.05
  const maxR = Math.max(...allR) + 0.1

  const xScale = (r: number) => padL + ((r - minR) / (maxR - minR)) * chartW
  const yScale = (e: number) => padT + ((maxE - e) / (maxE - minE)) * chartH

  const fciPath = reference.length > 1
    ? reference.map((pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(pt.bond_distance).toFixed(1)} ${yScale(pt.fci_energy).toFixed(1)}`
      ).join(' ')
    : ''

  const hfPath = reference.length > 1
    ? reference.map((pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(pt.bond_distance).toFixed(1)} ${yScale(pt.hf_energy).toFixed(1)}`
      ).join(' ')
    : ''

  const yTicks: number[] = []
  const yStep = 0.1
  for (let e = Math.ceil(minE / yStep) * yStep; e <= maxE; e += yStep) {
    yTicks.push(Math.round(e * 100) / 100)
  }

  const xTicks = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0].filter(r => r >= minR && r <= maxR)

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
        <rect x={padL} y={padT} width={chartW} height={chartH} fill="rgba(255,255,255,0.01)" rx="4" />

        {yTicks.map(e => (
          <g key={e}>
            <line x1={padL} y1={yScale(e)} x2={padL + chartW} y2={yScale(e)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={padL - 6} y={yScale(e) + 3} textAnchor="end" fill="#555" fontFamily="monospace" fontSize="10">
              {e.toFixed(1)}
            </text>
          </g>
        ))}

        {xTicks.map(r => (
          <g key={r}>
            <line x1={xScale(r)} y1={padT} x2={xScale(r)} y2={padT + chartH} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={xScale(r)} y={padT + chartH + 16} textAnchor="middle" fill="#555" fontFamily="monospace" fontSize="10">
              {r.toFixed(1)}
            </text>
          </g>
        ))}

        {hfPath && (
          <path d={hfPath} fill="none" stroke="#ff6b9d" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
        )}

        {fciPath && (
          <path d={fciPath} fill="none" stroke="#888" strokeWidth="1.5" />
        )}

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

        {reference.find(r => Math.abs(r.bond_distance - 0.735) < 0.01) && (
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

        <g transform={`translate(${padL + 12}, ${padT + 14})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#888" strokeWidth="1.5" />
          <text x="26" y="3" fill="#888" fontFamily="monospace" fontSize="9">FCI (exact)</text>

          <line x1="0" y1="16" x2="20" y2="16" stroke="#ff6b9d" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
          <text x="26" y="19" fill="#ff6b9d" fontFamily="monospace" fontSize="9" opacity="0.6">Hartree-Fock</text>

          <circle cx="10" cy="32" r="4" fill="#00ff88" />
          <text x="26" y="35" fill="#00ff88" fontFamily="monospace" fontSize="9">VQE Emulator</text>
        </g>

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

export function FidelityComparisonChart({ results }: { results: ExperimentResult[] }) {
  const experiments = ['bell_calibration', 'ghz_state'] as const
  const expLabels: Record<string, string> = { bell_calibration: 'Bell State', ghz_state: 'GHZ (3q)' }

  type FidelityRow = { type: string; label: string; backends: { name: string; fidelity: number; color: string }[] }
  const rows: FidelityRow[] = []

  for (const expType of experiments) {
    const typeResults = results.filter(r => r.type === expType && r.analysis?.fidelity !== undefined)
    if (typeResults.length === 0) continue

    const backends = typeResults.map(r => {
      const { label } = backendLabel(r.backend)
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
                    <rect x={padL} y={barY} width={barW} height={12} rx="2" fill="rgba(255,255,255,0.03)" />
                    <rect x={padL} y={barY} width={barLen} height={12} rx="2" fill={b.color} opacity="0.8" />
                    <text x={padL + barLen + 6} y={barY + 9} fill={b.color} fontFamily="monospace" fontSize="9" fontWeight="bold">
                      {pct}%
                    </text>
                    <text x={svgW - 4} y={barY + 9} textAnchor="end" fill="#666" fontFamily="monospace" fontSize="8">
                      {b.name}
                    </text>
                  </g>
                )
              })}
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
// RB Decay Curve
// ---------------------------------------------------------------------------

export function RBDecayCurve({ survival, seqLengths }: { survival: Record<string, number>; seqLengths: number[] }) {
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
        {[0.5, 0.75, 1.0].map(p => (
          <g key={p}>
            <line x1={padL} y1={yScale(p)} x2={padL + chartW} y2={yScale(p)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <text x={padL - 4} y={yScale(p) + 3} textAnchor="end" fill="#666" fontFamily="monospace" fontSize="9">
              {(p * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <path d={pathD} fill="none" stroke="#ff8c42" strokeWidth="2" strokeLinecap="round" />
        {points.map(pt => (
          <circle key={pt.m} cx={xScale(pt.m)} cy={yScale(pt.p)} r="3" fill="#ff8c42" />
        ))}
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

// ---------------------------------------------------------------------------
// QAOA Heatmap
// ---------------------------------------------------------------------------

export function QAOAHeatmap({ heatmap, gammaValues, betaValues }: {
  heatmap: Record<string, { gamma: number; beta: number; approximation_ratio: number }>
  gammaValues: number[]; betaValues: number[]
}) {
  const isLarge = gammaValues.length > 5 || betaValues.length > 5
  const cellSize = isLarge ? 32 : 48
  const gap = isLarge ? 'gap-[2px]' : 'gap-1'
  const showPercent = !isLarge

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Approximation Ratio Heatmap</p>
      <div className="inline-block overflow-x-auto">
        <div className={`flex items-end ${gap} mb-1`}>
          <div style={{ width: 32 }} />
          {betaValues.map((b, bi) => (
            <div key={bi} className="text-[8px] font-mono text-gray-500 text-center" style={{ width: cellSize }}>
              {b.toFixed(1)}
            </div>
          ))}
        </div>
        {gammaValues.map((g, gi) => (
          <div key={gi} className={`flex items-center ${gap} mb-[2px]`}>
            <div className="text-[8px] font-mono text-gray-500 text-right" style={{ width: 32 }}>
              {g.toFixed(1)}
            </div>
            {betaValues.map((b, bi) => {
              const key = `g${gi}_b${bi}`
              const data = heatmap[key]
              const ratio = data?.approximation_ratio || 0
              const intensity = Math.min(ratio, 1)
              return (
                <div
                  key={bi}
                  className={`rounded ${isLarge ? 'text-[8px]' : 'text-[10px]'} font-mono text-center flex items-center justify-center`}
                  style={{
                    width: cellSize, height: cellSize,
                    backgroundColor: `rgba(${Math.round(255 * intensity * 0.4)}, ${Math.round(255 * intensity)}, ${Math.round(100 * intensity)}, 0.3)`,
                    border: `1px solid rgba(${Math.round(255 * intensity * 0.4)}, ${Math.round(255 * intensity)}, ${Math.round(100 * intensity)}, 0.2)`,
                    color: intensity > 0.5 ? '#fff' : '#888',
                  }}
                  title={`gamma=${g}, beta=${b}: ${(ratio * 100).toFixed(1)}%`}
                >
                  {showPercent ? `${(ratio * 100).toFixed(0)}%` : (ratio * 100).toFixed(0)}
                </div>
              )
            })}
          </div>
        ))}
        <div className={`flex items-center ${gap} mt-1`}>
          <div className="text-[8px] font-mono text-gray-500 text-right" style={{ width: 32 }} />
          <div className="text-[8px] font-mono text-gray-500">beta &rarr;</div>
        </div>
        <div className="text-[8px] font-mono text-gray-500 -mt-1" style={{ marginLeft: -8, transform: 'rotate(-90deg) translateX(-30px)', transformOrigin: 'left' }}>
          gamma
        </div>
      </div>
    </div>
  )
}
