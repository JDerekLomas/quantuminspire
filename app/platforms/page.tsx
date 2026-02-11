import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'Three Chips, One Suite — Cross-Platform Quantum Comparison',
  description: 'Standardized diagnostic results from Tuna-9, IQM Garnet, and IBM Torino quantum processors.',
}

/* ────────────────────────── data ────────────────────────── */

const platforms = [
  { id: 'tuna9', name: 'Tuna-9', provider: 'Quantum Inspire / QuTech', qubits: 9, edges: 10, maxDeg: 3, topology: 'Irregular tree', native: 'H, CNOT', color: '#00d4ff', qv: 8 },
  { id: 'garnet', name: 'IQM Garnet', provider: 'IQM Resonance', qubits: 20, edges: 29, maxDeg: 4, topology: 'Square lattice', native: 'PRX, CZ', color: '#f59e0b', qv: 32 },
  { id: 'ibm', name: 'IBM Torino', provider: 'IBM Quantum', qubits: 133, edges: 'Heavy-hex', maxDeg: 3, topology: 'Heavy-hex', native: 'CZ, SX, RZ', color: '#8b5cf6', qv: 32 },
]

const bellData = [
  { label: 'Best pair',   tuna9: 93.5, garnet: 98.4, ibm: 86.5 },
  { label: 'Worst pair',  tuna9: 85.8, garnet: 91.2, ibm: 86.5 },
  { label: 'Average',     tuna9: 90.2, garnet: 96.3, ibm: 86.5 },
]

const ghzData = [
  { n: 3, label: 'GHZ-3',  tuna9: 88.9, garnet: 93.9, ibm: 82.9 },
  { n: 5, label: 'GHZ-5',  tuna9: 83.8, garnet: 81.8, ibm: 76.6 },
  { n: 10, label: 'GHZ-10', tuna9: null, garnet: 54.7, ibm: 62.2 },
  { n: 20, label: 'GHZ-20', tuna9: null, garnet: null, ibm: 34.3 },
  { n: 50, label: 'GHZ-50', tuna9: null, garnet: null, ibm: 8.5 },
]

const noiseData = {
  tuna9:  { pair: 'q4-q6 (best)', ZZ: 0.945, XX: 0.902, YY: 0.896, type: 'Dephasing' },
  garnet: { pair: 'QB14-QB15 (mid)', ZZ: 0.975, XX: 0.949, YY: 0.881, type: 'Dephasing' },
  ibm:    { pair: 'Default pair', ZZ: 0.729, XX: 0.704, YY: 0.675, type: 'Depolarizing' },
}

const qvData = [
  { n: 2, tuna9: 0.692, garnet: 0.740, ibm: 0.698 },
  { n: 3, tuna9: 0.821, garnet: 0.786, ibm: 0.736 },
  { n: 4, tuna9: null,  garnet: 0.695, ibm: 0.706 },
  { n: 5, tuna9: null,  garnet: 0.692, ibm: 0.676 },
  { n: 6, tuna9: null,  garnet: null,  ibm: 0.602 },
  { n: 7, tuna9: null,  garnet: null,  ibm: 0.620 },
]

/* ────────────────────────── components ────────────────────────── */

function PlatformCard({ p }: { p: typeof platforms[0] }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 hover:border-white/10 transition-colors">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
        <h3 className="text-lg font-bold text-white">{p.name}</h3>
        {p.qv && (
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: p.color + '20', color: p.color }}>
            QV={p.qv}
          </span>
        )}
      </div>
      <p className="text-xs font-mono text-gray-400 mb-3">{p.provider}</p>
      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
        <div><span className="text-gray-500">Qubits</span> <span className="text-white">{p.qubits}</span></div>
        <div><span className="text-gray-500">Edges</span> <span className="text-white">{p.edges}</span></div>
        <div><span className="text-gray-500">Topology</span> <span className="text-white">{p.topology}</span></div>
        <div><span className="text-gray-500">Native</span> <span className="text-white">{p.native}</span></div>
      </div>
    </div>
  )
}

function BellComparisonChart() {
  const W = 640, H = 280
  const padL = 100, padR = 30, padT = 30, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const barH = 16, groupGap = 24
  const colors = { tuna9: '#00d4ff', garnet: '#f59e0b', ibm: '#8b5cf6' }

  const xScale = (v: number) => padL + ((v - 80) / 20) * chartW
  const gridLines = [80, 85, 90, 95, 100] as const

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* grid */}
      {gridLines.map(v => (
        <g key={v}>
          <line x1={xScale(v)} y1={padT} x2={xScale(v)} y2={H - padB} stroke="white" strokeOpacity={0.06} />
          <text x={xScale(v)} y={H - padB + 16} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">{v}%</text>
        </g>
      ))}
      {/* bars */}
      {bellData.map((d, gi) => {
        const y0 = padT + gi * (3 * barH + groupGap + 8)
        return (
          <g key={d.label}>
            <text x={padL - 8} y={y0 + barH * 1.5 + 4} fill="#9ca3af" fontSize="11" fontFamily="monospace" textAnchor="end">{d.label}</text>
            {/* Tuna-9 */}
            <rect x={xScale(80)} y={y0} width={Math.max(0, xScale(d.tuna9) - xScale(80))} height={barH} rx={3} fill={colors.tuna9} fillOpacity={0.8} />
            <text x={xScale(d.tuna9) + 4} y={y0 + barH - 3} fill={colors.tuna9} fontSize="10" fontFamily="monospace">{d.tuna9}%</text>
            {/* Garnet */}
            <rect x={xScale(80)} y={y0 + barH + 2} width={Math.max(0, xScale(d.garnet) - xScale(80))} height={barH} rx={3} fill={colors.garnet} fillOpacity={0.8} />
            <text x={xScale(d.garnet) + 4} y={y0 + barH * 2} fill={colors.garnet} fontSize="10" fontFamily="monospace">{d.garnet}%</text>
            {/* IBM */}
            {d.ibm && (
              <>
                <rect x={xScale(80)} y={y0 + (barH + 2) * 2} width={Math.max(0, xScale(d.ibm) - xScale(80))} height={barH} rx={3} fill={colors.ibm} fillOpacity={0.8} />
                <text x={xScale(d.ibm) + 4} y={y0 + barH * 3 + 2} fill={colors.ibm} fontSize="10" fontFamily="monospace">{d.ibm}%</text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function GHZScalingChart() {
  const W = 640, H = 360
  const padL = 60, padR = 30, padT = 30, padB = 50
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Log scale for x-axis (3 to 50 qubits)
  const xScale = (n: number) => padL + (Math.log(n / 3) / Math.log(50 / 3)) * chartW
  const yScale = (f: number) => padT + ((100 - f) / 100) * chartH // 0% to 100%

  const colors = { tuna9: '#00d4ff', garnet: '#f59e0b', ibm: '#8b5cf6' }
  const yGrid = [0, 20, 40, 60, 80, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Y grid */}
      {yGrid.map(v => (
        <g key={v}>
          <line x1={padL} y1={yScale(v)} x2={W - padR} y2={yScale(v)} stroke="white" strokeOpacity={0.06} />
          <text x={padL - 8} y={yScale(v) + 4} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="end">{v}%</text>
        </g>
      ))}
      {/* X labels */}
      {[3, 5, 10, 20, 50].map(n => (
        <text key={n} x={xScale(n)} y={H - padB + 20} fill="#6b7280" fontSize="11" fontFamily="monospace" textAnchor="middle">{n}q</text>
      ))}
      {/* Tuna-9 line */}
      <polyline
        points={ghzData.filter(d => d.tuna9).map(d => `${xScale(d.n)},${yScale(d.tuna9!)}`).join(' ')}
        fill="none" stroke={colors.tuna9} strokeWidth={2}
      />
      {ghzData.filter(d => d.tuna9).map(d => (
        <g key={`t${d.n}`}>
          <circle cx={xScale(d.n)} cy={yScale(d.tuna9!)} r={5} fill={colors.tuna9} />
          <text x={xScale(d.n) - 8} y={yScale(d.tuna9!) - 10} fill={colors.tuna9} fontSize="10" fontFamily="monospace" textAnchor="end">{d.tuna9}%</text>
        </g>
      ))}
      {/* Garnet line */}
      <polyline
        points={ghzData.filter(d => d.garnet).map(d => `${xScale(d.n)},${yScale(d.garnet!)}`).join(' ')}
        fill="none" stroke={colors.garnet} strokeWidth={2}
      />
      {ghzData.filter(d => d.garnet).map(d => (
        <g key={`g${d.n}`}>
          <circle cx={xScale(d.n)} cy={yScale(d.garnet!)} r={5} fill={colors.garnet} />
          <text x={xScale(d.n) + 8} y={yScale(d.garnet!) - 10} fill={colors.garnet} fontSize="10" fontFamily="monospace">{d.garnet}%</text>
        </g>
      ))}
      {/* IBM line */}
      <polyline
        points={ghzData.filter(d => d.ibm).map(d => `${xScale(d.n)},${yScale(d.ibm!)}`).join(' ')}
        fill="none" stroke={colors.ibm} strokeWidth={2}
      />
      {ghzData.filter(d => d.ibm).map(d => (
        <g key={`i${d.n}`}>
          <circle cx={xScale(d.n)} cy={yScale(d.ibm!)} r={5} fill={colors.ibm} />
          <text x={xScale(d.n)} y={yScale(d.ibm!) + 16} fill={colors.ibm} fontSize="10" fontFamily="monospace" textAnchor="middle">{d.ibm}%</text>
        </g>
      ))}
      {/* Legend */}
      {Object.entries(colors).map(([k, c], i) => (
        <g key={k} transform={`translate(${padL + 10 + i * 130}, ${padT + 10})`}>
          <rect width={12} height={3} rx={1.5} fill={c} />
          <text x={16} y={4} fill={c} fontSize="10" fontFamily="monospace">{k === 'tuna9' ? 'Tuna-9' : k === 'garnet' ? 'IQM Garnet' : 'IBM Torino'}</text>
        </g>
      ))}
      {/* Y axis label */}
      <text x={14} y={H / 2} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle" transform={`rotate(-90, 14, ${H / 2})`}>GHZ Fidelity</text>
    </svg>
  )
}

function NoiseFingerprint() {
  const W = 640, H = 240
  const platforms_noise = [
    { name: 'Tuna-9', color: '#00d4ff', ...noiseData.tuna9 },
    { name: 'IQM Garnet', color: '#f59e0b', ...noiseData.garnet },
    { name: 'IBM Torino', color: '#8b5cf6', ...noiseData.ibm },
  ]
  const bases = ['ZZ', 'XX', '|YY|'] as const
  const barW = 40, gapBetweenBases = 80, gapBetweenPlatforms = 4
  const padL = 60, padT = 30

  const yScale = (v: number) => padT + (1 - v) * (H - padT - 30)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Y grid */}
      {[0.6, 0.7, 0.8, 0.9, 1.0].map(v => (
        <g key={v}>
          <line x1={padL - 10} y1={yScale(v)} x2={W - 30} y2={yScale(v)} stroke="white" strokeOpacity={0.06} />
          <text x={padL - 14} y={yScale(v) + 4} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="end">{v.toFixed(1)}</text>
        </g>
      ))}
      {/* Basis groups */}
      {bases.map((basis, bi) => {
        const groupX = padL + bi * (barW * 3 + gapBetweenBases)
        return (
          <g key={basis}>
            <text x={groupX + barW * 1.5} y={H - 4} fill="#9ca3af" fontSize="11" fontFamily="monospace" textAnchor="middle">
              {basis === '|YY|' ? '|YY|' : `\u27E8${basis}\u27E9`}
            </text>
            {platforms_noise.map((p, pi) => {
              const raw = basis === 'ZZ' ? p.ZZ : basis === 'XX' ? p.XX : (p.YY ? Math.abs(p.YY) : null)
              if (raw === null) return null
              const x = groupX + pi * (barW + gapBetweenPlatforms)
              return (
                <g key={p.name}>
                  <rect x={x} y={yScale(raw)} width={barW} height={yScale(0.6) - yScale(raw)} rx={3} fill={p.color} fillOpacity={0.7} />
                  <text x={x + barW / 2} y={yScale(raw) - 6} fill={p.color} fontSize="9" fontFamily="monospace" textAnchor="middle">{raw.toFixed(3)}</text>
                </g>
              )
            })}
          </g>
        )
      })}
      {/* Legend */}
      {platforms_noise.map((p, i) => (
        <g key={p.name} transform={`translate(${W - 300 + i * 100}, 12)`}>
          <rect width={10} height={10} rx={2} fill={p.color} fillOpacity={0.7} />
          <text x={14} y={9} fill={p.color} fontSize="10" fontFamily="monospace">{p.name}</text>
        </g>
      ))}
    </svg>
  )
}

function QVComparison() {
  const colors = { tuna9: '#00d4ff', garnet: '#f59e0b', ibm: '#8b5cf6' }
  const W = 400, H = 220
  const padL = 50, padR = 30, padT = 30, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const xScale = (n: number) => padL + ((n - 1.5) / 6.5) * chartW
  const yScale = (v: number) => padT + ((1 - v) / 0.5) * chartH // 0.5 to 1.0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Threshold line */}
      <line x1={padL} y1={yScale(2/3)} x2={W - padR} y2={yScale(2/3)} stroke="#ef4444" strokeWidth={1} strokeDasharray="4,4" strokeOpacity={0.6} />
      <text x={W - padR + 2} y={yScale(2/3) + 4} fill="#ef4444" fontSize="9" fontFamily="monospace" fillOpacity={0.6}>2/3</text>
      {/* Y grid */}
      {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(v => (
        <g key={v}>
          <line x1={padL} y1={yScale(v)} x2={W - padR} y2={yScale(v)} stroke="white" strokeOpacity={0.04} />
          <text x={padL - 6} y={yScale(v) + 4} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="end">{v.toFixed(1)}</text>
        </g>
      ))}
      {/* X labels */}
      {[2, 3, 4, 5, 6, 7].map(n => (
        <text key={n} x={xScale(n)} y={H - padB + 16} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">n={n}</text>
      ))}
      {/* Tuna-9 */}
      <polyline
        points={qvData.filter(d => d.tuna9).map(d => `${xScale(d.n)},${yScale(d.tuna9!)}`).join(' ')}
        fill="none" stroke={colors.tuna9} strokeWidth={2}
      />
      {qvData.filter(d => d.tuna9).map(d => (
        <circle key={`t${d.n}`} cx={xScale(d.n)} cy={yScale(d.tuna9!)} r={4} fill={colors.tuna9} />
      ))}
      {/* Garnet */}
      <polyline
        points={qvData.filter(d => d.garnet).map(d => `${xScale(d.n)},${yScale(d.garnet!)}`).join(' ')}
        fill="none" stroke={colors.garnet} strokeWidth={2}
      />
      {qvData.filter(d => d.garnet).map(d => (
        <circle key={`g${d.n}`} cx={xScale(d.n)} cy={yScale(d.garnet!)} r={4} fill={colors.garnet} />
      ))}
      {/* IBM */}
      <polyline
        points={qvData.filter(d => d.ibm).map(d => `${xScale(d.n)},${yScale(d.ibm!)}`).join(' ')}
        fill="none" stroke={colors.ibm} strokeWidth={2}
      />
      {qvData.filter(d => d.ibm).map(d => (
        <circle key={`i${d.n}`} cx={xScale(d.n)} cy={yScale(d.ibm!)} r={4} fill={colors.ibm} />
      ))}
      {/* Legend */}
      <g transform={`translate(${padL + 10}, ${padT + 8})`}>
        <circle cx={0} cy={0} r={4} fill={colors.tuna9} /><text x={8} y={4} fill={colors.tuna9} fontSize="9" fontFamily="monospace">Tuna-9 (QV=8)</text>
      </g>
      <g transform={`translate(${padL + 10}, ${padT + 22})`}>
        <circle cx={0} cy={0} r={4} fill={colors.garnet} /><text x={8} y={4} fill={colors.garnet} fontSize="9" fontFamily="monospace">IQM Garnet (QV=32)</text>
      </g>
      <g transform={`translate(${padL + 10}, ${padT + 36})`}>
        <circle cx={0} cy={0} r={4} fill={colors.ibm} /><text x={8} y={4} fill={colors.ibm} fontSize="9" fontFamily="monospace">IBM Torino (QV=32)</text>
      </g>
    </svg>
  )
}

/* ────────────────────────── page ────────────────────────── */

export default function PlatformsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav section="platforms" />

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-20 space-y-16">
        {/* Hero */}
        <section>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Cross-Platform Comparison</p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            Three Chips, One Suite
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
            Identical quantum diagnostic circuits run on three different processors.
            Same algorithms, different hardware, different answers.
            All experiments designed and executed by an AI agent (Claude Opus 4.6).
          </p>
          <div className="flex gap-2 mt-4 text-xs font-mono text-gray-500">
            <span>2026-02-10</span>
            <span>&middot;</span>
            <span>~105 hardware jobs</span>
            <span>&middot;</span>
            <span>~253K shots</span>
            <span>&middot;</span>
            <span>3 quantum processors</span>
          </div>
        </section>

        {/* Platform cards */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">The Processors</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map(p => <PlatformCard key={p.id} p={p} />)}
          </div>
        </section>

        {/* Bell Fidelity */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-2">Bell State Fidelity</h2>
          <p className="text-gray-400 text-sm mb-4 max-w-xl">
            Simplest entanglement benchmark: create (|00&rang;+|11&rang;)/&radic;2 and measure.
            The spread between best and worst pairs reveals chip uniformity.
          </p>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <BellComparisonChart />
            <div className="mt-4 flex gap-6 text-xs font-mono">
              <span><span className="inline-block w-3 h-1 rounded bg-[#00d4ff] mr-1" /> Tuna-9</span>
              <span><span className="inline-block w-3 h-1 rounded bg-[#f59e0b] mr-1" /> IQM Garnet</span>
              <span><span className="inline-block w-3 h-1 rounded bg-[#8b5cf6] mr-1" /> IBM Torino</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            *IBM used default transpiler qubit placement (not cherry-picked).
            IQM Garnet: 22/29 pairs swept (mean 96.3%, 7.2pp spread). All platforms have qubit-quality variation.
          </p>
        </section>

        {/* GHZ Scaling */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-2">GHZ Fidelity vs. Qubit Count</h2>
          <p className="text-gray-400 text-sm mb-4 max-w-xl">
            How fast does entanglement quality degrade with circuit size?
            IBM Torino pushes to 50-qubit GHZ. Per-qubit error stays remarkably consistent at ~5%.
          </p>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <GHZScalingChart />
          </div>
          <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-lg p-4">
            <p className="text-xs font-mono text-gray-400 mb-2">Key finding: qubit quality &gt; circuit depth</p>
            <p className="text-sm text-gray-300">
              On IQM Garnet, a GHZ-5 circuit routed through high-quality qubits (81.8%, depth 20, 9 CZ gates)
              outperformed one routed through the weak QB9 region (57.8%, depth 16, 7 CZ gates).
              Fewer gates on bad qubits is worse than more gates on good qubits.
            </p>
          </div>
        </section>

        {/* Quantum Volume */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#14b8a6] mb-2">Quantum Volume</h2>
              <p className="text-gray-400 text-sm mb-4">
                Standard benchmark: heavy output fraction must exceed 2/3 for each circuit width n.
                QV = 2<sup>n_max</sup>.
              </p>
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
                <QVComparison />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="space-y-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#00d4ff]">8</span>
                    <span className="text-sm font-mono text-gray-400">Tuna-9 QV</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Passes n=2,3. Fails at n=4 (9 qubits, sparse topology).</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#f59e0b]">32</span>
                    <span className="text-sm font-mono text-gray-400">IQM Garnet QV</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Passes n=2,3,4,5. 4x Tuna-9. 20 qubits, 29 connections.</p>
                </div>
                <div className="bg-white/[0.02] border border-[#8b5cf6]/20 rounded-lg p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#8b5cf6]">32</span>
                    <span className="text-sm font-mono text-gray-400">IBM Torino QV</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Passes n=2-5, fails at n=6. Same as Garnet despite 6.7x more qubits. 133q, heavy-hex.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Noise Fingerprint */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#e879f9] mb-2">Noise Fingerprints</h2>
          <p className="text-gray-400 text-sm mb-4 max-w-xl">
            Bell state tomography in Z, X, Y bases reveals the <em>type</em> of noise, not just the amount.
            Dephasing (T2): ZZ &gt; XX &asymp; |YY|. Depolarizing: all equal. Amplitude damping (T1): asymmetric.
          </p>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6">
            <NoiseFingerprint />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/[0.02] border border-[#00d4ff]/10 rounded-lg p-4">
              <p className="text-xs font-mono text-[#00d4ff] mb-1">Tuna-9 &mdash; q4-q6 (best pair)</p>
              <p className="text-sm text-gray-300">
                <strong>Dephasing.</strong> ZZ=0.945 &gt; XX=0.902 &asymp; |YY|=0.896.
                Phase degrades faster than population.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-[#f59e0b]/10 rounded-lg p-4">
              <p className="text-xs font-mono text-[#f59e0b] mb-1">IQM Garnet &mdash; QB14-QB15</p>
              <p className="text-sm text-gray-300">
                <strong>Dephasing.</strong> ZZ=0.975 &gt; XX=0.949 &gt; |YY|=0.881.
                Highest overall correlations. T2 is the bottleneck.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-[#8b5cf6]/10 rounded-lg p-4">
              <p className="text-xs font-mono text-[#8b5cf6] mb-1">IBM Torino &mdash; default pair</p>
              <p className="text-sm text-gray-300">
                <strong>Depolarizing.</strong> ZZ=0.729 &asymp; XX=0.704 &asymp; |YY|=0.675.
                All correlators within 5%. Uniform noise across all bases.
              </p>
            </div>
          </div>
        </section>

        {/* Summary table */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">At a Glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-normal">Metric</th>
                  <th className="text-center py-3 px-4 text-[#00d4ff]">Tuna-9</th>
                  <th className="text-center py-3 px-4 text-[#f59e0b]">IQM Garnet</th>
                  <th className="text-center py-3 px-4 text-[#8b5cf6]">IBM Torino</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">Qubits</td><td className="text-center">9</td><td className="text-center">20</td><td className="text-center">133</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">Connectivity</td><td className="text-center">10 edges</td><td className="text-center">29 edges</td><td className="text-center">Heavy-hex</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">Bell fidelity</td><td className="text-center">93.5%</td><td className="text-center font-bold">98.4%</td><td className="text-center">86.5%*</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">GHZ-3</td><td className="text-center">88.9%</td><td className="text-center font-bold">93.9%</td><td className="text-center">82.9%</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">GHZ-5</td><td className="text-center">83.8%</td><td className="text-center">81.8%</td><td className="text-center">76.6%</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">GHZ-10</td><td className="text-center text-gray-600">n/a</td><td className="text-center">54.7%</td><td className="text-center font-bold">62.2%</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">GHZ-20</td><td className="text-center text-gray-600">n/a</td><td className="text-center text-gray-600">n/a</td><td className="text-center">34.3%</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">GHZ-50</td><td className="text-center text-gray-600">n/a</td><td className="text-center text-gray-600">n/a</td><td className="text-center">8.5%</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">Quantum Volume</td><td className="text-center">8</td><td className="text-center font-bold">32</td><td className="text-center font-bold">32</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">Dominant noise</td><td className="text-center">Dephasing</td><td className="text-center">Dephasing</td><td className="text-center">Depolarizing</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-4 text-gray-400">Per-qubit error</td><td className="text-center">3.5-6.2%</td><td className="text-center">1.4-5.0%</td><td className="text-center">4.6-6.1%</td></tr>
                <tr><td className="py-2 px-4 text-gray-400">QPU time used</td><td className="text-center">~42K shots</td><td className="text-center">~70K shots</td><td className="text-center">44s / 10 min</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* What's next */}
        <section className="bg-white/[0.02] border border-white/5 rounded-lg p-8">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Key Takeaways</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <strong className="text-[#f59e0b]">IQM Garnet wins on gate quality</strong> &mdash;
              Highest Bell fidelity (98.4%), best GHZ-3 (93.9%), and strongest correlators.
              For circuits that fit in 20 qubits, Garnet delivers the cleanest results.
            </p>
            <p>
              <strong className="text-[#8b5cf6]">IBM Torino wins on scale</strong> &mdash;
              50-qubit GHZ (8.5% fidelity) is noisy but measurable. GHZ-20 at 34.3% and GHZ-10 at 62.2%
              beat Garnet&apos;s GHZ-10 (54.7%). More qubits = more routing options = better qubit selection.
            </p>
            <p>
              <strong className="text-[#00d4ff]">Tuna-9 punches above its weight</strong> &mdash;
              QV=8 on 9 qubits with basic gates. Best 5-qubit GHZ (83.8%) beats both IBM (76.6%) and Garnet (81.8%).
              Small but well-characterized.
            </p>
            <p>
              <strong className="text-white">QV=32 on both Garnet and Torino</strong> &mdash;
              More qubits doesn&apos;t mean higher QV. Per-gate error rate is the bottleneck, not qubit count.
              Both fail at n=6 where circuit depth overwhelms coherence.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 pt-8 text-center">
          <p className="text-xs font-mono text-gray-500">
            All experiments designed and executed by Claude Opus 4.6 via MCP tool calls.
            Data: <Link href="/experiments" className="text-[#00d4ff] hover:underline">experiments dashboard</Link>.
            Source: <a href="https://github.com/JDerekLomas/quantuminspire" className="text-[#00d4ff] hover:underline">GitHub</a>.
          </p>
        </footer>
      </main>
    </div>
  )
}
