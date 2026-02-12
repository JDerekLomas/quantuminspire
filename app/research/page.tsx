import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'Research — AI-Accelerated Quantum Science',
  description: 'AI agents replicate landmark quantum papers on real hardware. 6 papers, 27 claims, 3 chips, 100+ experiments. Every result recorded and open.',
}

/* ────────────────────────── data ────────────────────────── */

const papers = [
  {
    id: 'sagastizabal2019',
    title: 'Sagastizabal et al. 2019',
    topic: 'H2 VQE error mitigation',
    claims: 4,
    pass: 4,
    highlight: 'IBM TREX: 0.22 kcal/mol',
    color: '#00ff88',
  },
  {
    id: 'kandala2017',
    title: 'Kandala et al. 2017',
    topic: 'Hardware-efficient VQE',
    claims: 5,
    pass: 5,
    highlight: 'Chemical accuracy on 3 configs',
    color: '#00ff88',
  },
  {
    id: 'peruzzo2014',
    title: 'Peruzzo et al. 2014',
    topic: 'First VQE (HeH+)',
    claims: 9,
    pass: 7,
    highlight: 'Coefficient amplification discovered',
    color: '#ff8c42',
  },
  {
    id: 'cross2019',
    title: 'Cross et al. 2019',
    topic: 'Quantum Volume',
    claims: 3,
    pass: 3,
    highlight: 'QV=32 on IBM & IQM',
    color: '#00ff88',
  },
  {
    id: 'harrigan2021',
    title: 'Harrigan et al. 2021',
    topic: 'QAOA MaxCut',
    claims: 4,
    pass: 4,
    highlight: '74.1% approx ratio on Tuna-9',
    color: '#00ff88',
  },
  {
    id: 'kim2023',
    title: 'Kim et al. 2023',
    topic: 'Kicked Ising / utility',
    claims: 3,
    pass: 3,
    highlight: '9-qubit, 180 CZ gates, 14.1x ZNE',
    color: '#00ff88',
  },
]

const keyFindings = [
  {
    stat: '0.22',
    unit: 'kcal/mol',
    title: 'Chemical accuracy on real hardware',
    detail: 'TREX on IBM Torino. 119x improvement over raw. The simplest mitigation wins.',
    color: '#00ff88',
    link: '/blog/error-mitigation-showdown',
  },
  {
    stat: '|g1|/|g4|',
    unit: '',
    title: 'Coefficient amplification predicts error',
    detail: 'H2 ratio 4.4 = 0.22 kcal/mol. HeH+ ratio 7.8 = 4.45 kcal/mol. 1.8x ratio, 20x error.',
    color: '#ff8c42',
    link: '/replications/peruzzo2014',
  },
  {
    stat: '9q > 20q',
    unit: '',
    title: 'Topology beats scale',
    detail: 'Tuna-9 beats IQM Garnet on GHZ-5: 83.8% vs 81.8%. Knowing your chip matters more.',
    color: '#8b5cf6',
    link: '/platforms',
  },
  {
    stat: '>80%',
    unit: 'readout',
    title: 'Most error is readout, not gates',
    detail: 'ZNE failed on both backends. Gate folding adds <1.3 kcal/mol. Readout correction is what works.',
    color: '#00d4ff',
    link: '/blog/error-mitigation-showdown',
  },
]

const experimentTypes = [
  { label: 'Bell states', count: '15+', desc: 'Entanglement benchmarking across qubit pairs', color: '#00d4ff' },
  { label: 'GHZ states', count: '12+', desc: '3-50 qubit multipartite entanglement', color: '#8b5cf6' },
  { label: 'VQE chemistry', count: '40+', desc: 'H2 and HeH+ energy estimation with mitigation', color: '#00ff88' },
  { label: 'QAOA MaxCut', count: '8+', desc: 'Combinatorial optimization on hardware', color: '#ff8c42' },
  { label: 'Benchmarks', count: '20+', desc: 'RB, QV, connectivity probes, characterization', color: '#ff6b9d' },
  { label: 'QEC', count: '10+', desc: '[[4,2,2]] detection code, NN decoders', color: '#94a3b8' },
]

/* ────────────────────────── page ────────────────────────── */

export default function ResearchPage() {
  return (
    <main id="main-content" className="min-h-screen text-gray-200">
      <Nav section="research" />

      {/* Hero */}
      <section className="border-b border-white/5 px-6 pt-28 pb-12">
        <div className="max-w-5xl mx-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-4 block">
            Research
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6 leading-[0.95]">
            AI agents replicate<br />
            quantum papers on<br />
            <span className="gradient-text-green">real hardware.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-6">
            Can AI systematically reproduce quantum computing experiments? We tested 27 claims
            from 6 landmark papers across 3 quantum processors. 93% pass. The gaps between
            published results and AI-reproduced results are the finding.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
              6 papers replicated
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20">
              100+ experiments
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">
              3 hardware platforms
            </span>
          </div>
        </div>
      </section>

      {/* Paper replications */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            Paper Replications
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((p) => (
              <Link
                key={p.id}
                href={`/replications/${p.id}`}
                className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-400">{p.topic}</span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: p.pass === p.claims ? '#00ff88' : '#ff8c42',
                      backgroundColor: p.pass === p.claims ? 'rgba(0,255,136,0.1)' : 'rgba(255,140,66,0.1)',
                    }}
                  >
                    {p.pass}/{p.claims} pass
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm mb-2 group-hover:text-[#00ff88] transition-colors">
                  {p.title}
                </h3>
                <p className="text-gray-400 text-xs">{p.highlight}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/replications"
              className="text-xs font-mono text-[#00ff88] hover:underline"
            >
              View all replications with detailed claims &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Key findings */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            Key Findings
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {keyFindings.map((f) => (
              <Link
                key={f.title}
                href={f.link}
                className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
              >
                <div className="text-2xl font-black font-mono mb-1" style={{ color: f.color }}>
                  {f.stat}
                  {f.unit && <span className="text-xs font-normal text-gray-400 ml-1">{f.unit}</span>}
                </div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:underline">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Experiment types */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            100+ Experiments
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {experimentTypes.map((e) => (
              <div
                key={e.label}
                className="p-4 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: `${e.color}15` }}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-black font-mono" style={{ color: e.color }}>{e.count}</span>
                  <span className="text-white text-sm font-bold">{e.label}</span>
                </div>
                <p className="text-gray-400 text-xs">{e.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/experiments"
              className="text-xs font-mono text-[#00d4ff] hover:underline"
            >
              Browse all experiments with raw data &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Hardware platforms */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            Three Chips, One Suite
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { name: 'QI Tuna-9', qubits: 9, qv: 8, bell: '93.5%', vqe: '0.92', color: '#00d4ff', note: 'Best small-scale fidelity' },
              { name: 'IQM Garnet', qubits: 20, qv: 32, bell: '98.1%', vqe: 'n/a', color: '#ff6b9d', note: 'Highest Bell fidelity' },
              { name: 'IBM Torino', qubits: 133, qv: 32, bell: '86.5%', vqe: '0.22', color: '#8b5cf6', note: 'Best VQE with TREX' },
            ].map((chip) => (
              <div
                key={chip.name}
                className="p-5 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: `${chip.color}20` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chip.color }} aria-hidden="true" />
                  <span className="text-white font-bold text-sm">{chip.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block">Qubits</span>
                    <span className="text-white font-mono">{chip.qubits}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">QV</span>
                    <span className="text-white font-mono">{chip.qv}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Bell best</span>
                    <span className="text-white font-mono">{chip.bell}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">VQE best</span>
                    <span className="text-white font-mono">{chip.vqe} kcal/mol</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">{chip.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/platforms"
              className="text-xs font-mono text-[#8b5cf6] hover:underline"
            >
              Full platform comparison &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Navigate to sub-pages */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            Explore the Research
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { href: '/replications', label: 'Paper Replications', desc: '6 papers, 27 claims tested across 3 chips. Every claim documented.', color: '#00ff88' },
              { href: '/experiments', label: 'Experiment Dashboard', desc: '100+ experiments with raw counts, analysis, and circuit details.', color: '#00d4ff' },
              { href: '/platforms', label: 'Platform Comparison', desc: 'Tuna-9 vs Garnet vs Torino. Bell, GHZ, QV, VQE head-to-head.', color: '#8b5cf6' },
              { href: '/methodology', label: 'Methodology', desc: '349 prompts from 445 sessions. The 5-phase workflow that emerged.', color: '#f59e0b' },
              { href: '/blog', label: 'Research Blog', desc: '14 posts: mitigation showdowns, topology maps, noise forensics.', color: '#ff8c42' },
              { href: '/quantum-vibecoding', label: 'Quantum VibeCoding', desc: 'The method that made all this possible.', color: '#00d4ff' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <div>
                  <span className="text-white text-sm font-bold group-hover:underline">{item.label}</span>
                  <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Data & Reproducibility */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-6">
            Data &amp; Reproducibility
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
              <p>
                All raw data, circuits, and analysis scripts are open on{' '}
                <a
                  href="https://github.com/JDerekLomas/quantuminspire/tree/main/experiments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00d4ff] hover:underline"
                >
                  GitHub
                </a>.
                Every result file uses schema-versioned JSON with SHA256 checksums for raw counts and circuits.
              </p>
              <p>
                <a
                  href="https://github.com/JDerekLomas/quantuminspire/blob/main/research/paper-outline.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00ff88] hover:underline"
                >
                  Paper outline
                </a>{' '}
                is available on GitHub. Preprint coming soon.
              </p>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-2">Environment</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <span className="text-gray-400">Python</span><span className="text-white">3.12</span>
                  <span className="text-gray-400">Qiskit</span><span className="text-white">2.1.2</span>
                  <span className="text-gray-400">PennyLane</span><span className="text-white">0.44</span>
                  <span className="text-gray-400">QI SDK</span><span className="text-white">3.5.1</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-2">Hardware</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <span className="text-gray-400">IBM Torino</span><span className="text-white">133 qubits</span>
                  <span className="text-gray-400">QI Tuna-9</span><span className="text-white">9 qubits</span>
                  <span className="text-gray-400">IQM Garnet</span><span className="text-white">20 qubits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3 text-[10px] text-gray-500 font-mono text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://dereklomas.me" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">J. Derek Lomas</a>
            <span className="text-gray-600">&middot;</span>
            <a href="mailto:j.d.lomas@tudelft.nl" className="hover:text-[#00d4ff] transition-colors">j.d.lomas@tudelft.nl</a>
          </div>
          <div>
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
          </div>
        </div>
      </footer>
    </main>
  )
}
