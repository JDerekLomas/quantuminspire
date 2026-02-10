'use client'

import Link from 'next/link'

// ─── Data ────────────────────────────────────────────────────────────────────

const benchmarkData = {
  model: 'Gemini 3 Flash',
  totalTasks: 151,
  passed: 94,
  passRate: 62.25,
}

const vizExhibits = [
  { href: '/bloch-sphere', title: 'Bloch Sphere', desc: 'Navigate single-qubit state space in 3D. Apply gates, set rotations, see the state vector move.', color: '#00d4ff', features: '8 gates, Rx/Ry/Rz rotation, 6 presets, trail viz' },
  { href: '/state-vector', title: 'State Vector Explorer', desc: 'Multi-qubit amplitude bars with phase coloring. Apply gates per qubit, run CNOTs.', color: '#8b5cf6', features: '1-6 qubits, CNOT, circuit history' },
  { href: '/measurement', title: 'Measurement Lab', desc: 'Watch quantum randomness converge to Born rule probabilities in real time.', color: '#00ff88', features: '6 circuits, live stats, adjustable shots' },
  { href: '/grovers', title: "Grover's Search", desc: 'Step through oracle and diffusion operators. See amplitude amplification happen.', color: '#ff8c42', features: '2-5 qubits, target selection, optimal iterations' },
  { href: '/entanglement', title: 'Entanglement Lab', desc: 'Density matrices, partial traces, Bell states. Concurrence and von Neumann entropy.', color: '#ff6b9d', features: '8 states, reduced density matrices, metrics' },
  { href: '/teleportation', title: 'Quantum Teleportation', desc: 'Step through the teleportation protocol with animated circuit, amplitude bars, and Bloch sphere.', color: '#06b6d4', features: 'Bell pairs, measurement, classical channel, corrections' },
  { href: '/rabi', title: 'Rabi Oscillations', desc: 'Watch a qubit oscillate between |0\u27E9 and |1\u27E9 under a driving field. Detuning, damping, Bloch sphere trajectory.', color: '#eab308', features: 'Animated, detuning, T\u2082 dephasing, Bloch sphere' },
  { href: '/interference', title: 'Multi-Slit Interference', desc: 'N-slit diffraction patterns with adjustable geometry and wavelength. Photon-by-photon accumulation mode.', color: '#14b8a6', features: '1-8 slits, visible spectrum, photon mode' },
  { href: '/qsphere', title: 'Q-Sphere', desc: 'Multi-qubit states on a sphere. Basis states placed by Hamming weight, dot size = amplitude, color = phase.', color: '#e879f9', features: '2-4 qubits, Bell/GHZ/W states, gates, CNOT' },
  { href: '/gallery', title: 'Visualization Gallery', desc: 'Curated collection of the best quantum visualizations across the web. Interactive demos, open-source tools, and reference implementations.', color: '#f59e0b', features: '20+ tools, live embeds, quality ratings' },
]

const agentArchitecture = [
  {
    name: 'Orchestrator',
    role: 'Central coordinator',
    description: 'Schedules experiments, allocates compute, tracks results. Decides what to investigate next based on findings.',
    color: '#00d4ff',
    file: 'agents/orchestrator.py',
    status: 'Implemented',
  },
  {
    name: 'Benchmark Runner',
    role: 'Continuous evaluation',
    description: 'Runs Qiskit HumanEval against new LLM releases. Tracks capability trends. Detects breakthroughs in quantum coding ability.',
    color: '#00ff88',
    file: 'agents/benchmark_agent.py',
    status: 'Implemented',
  },
  {
    name: 'Replication Agent',
    role: 'Paper reproduction',
    description: 'Takes paper + plan, writes full simulation code. Runs VQE, QAOA, error mitigation. Compares against published data.',
    color: '#ff8c42',
    file: 'agents/replication_agent.py',
    status: 'Implemented',
  },
  {
    name: 'Literature Scout',
    role: 'Paper discovery',
    description: 'Monitors arxiv quant-ph. Extracts methodologies. Identifies replicable experiments. Generates structured replication plans.',
    color: '#8b5cf6',
    file: null,
    status: 'Planned',
  },
]

// ─── Components ──────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="font-mono font-bold text-white tracking-wider text-sm">
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span>
          </span>
          <span className="text-[10px] font-mono text-gray-500 hidden sm:block">
            TU Delft / QuTech
          </span>
        </div>
        <div className="flex gap-6 text-xs font-mono text-gray-500">
          <a href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</a>
          <a href="/replications" className="hover:text-[#ff8c42] transition-colors">Replications</a>
          <a href="/learn" className="hover:text-[#8b5cf6] transition-colors">Learn</a>
          <a href="/sonification" className="hover:text-[#e879f9] transition-colors">Listen</a>
          <a href="/blog" className="hover:text-[#ff6b9d] transition-colors">Blog</a>
          <a href="/wp44" className="hover:text-[#ff6b9d] transition-colors hidden sm:block">WP4.4</a>
          <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </nav>
  )
}

// ─── ACT 1: The Machine is Running ──────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-32 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00d4ff]">
            Open Research Initiative
          </span>
        </div>
        <h1 className="text-5xl sm:text-7xl font-black leading-[0.9] tracking-tight mb-8">
          <span className="text-white">How might </span>
          <span className="gradient-text">AI</span>
          <br />
          <span className="text-white">accelerate </span>
          <span className="gradient-text-green">quantum</span>
          <br />
          <span className="text-white">computing?</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-6">
          An experimental research program at{' '}
          <span className="text-white font-medium">TU Delft</span> building autonomous
          AI infrastructure for quantum computing research &mdash; replicating published papers
          on real hardware, comparing chips head-to-head, and building tools that make
          quantum accessible.
        </p>

        <p className="text-sm font-mono text-gray-600 mb-8 tracking-wide">
          <span className="text-gray-500">h</span>
          <span className="gradient-text font-bold">AI</span>
          <span className="text-gray-500">qu</span>
          <span className="text-gray-700 mx-2">&mdash;</span>
          <span className="text-gray-500">AI as the interface between </span>
          <span className="text-gray-400">humans</span>
          <span className="text-gray-500"> and </span>
          <span className="text-gray-400">quantum</span>
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-6 mb-10">
          {[
            { value: '5', label: 'papers replicated', color: '#ff8c42' },
            { value: '19', label: 'claims tested', color: '#00d4ff' },
            { value: '3', label: 'hardware platforms', color: '#8b5cf6' },
            { value: '50+', label: 'experiments run', color: '#00ff88' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider max-w-[140px]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Quantum Inspire', href: 'https://www.quantum-inspire.com', color: '#00d4ff' },
            { label: 'QuTech', href: 'https://qutech.nl', color: '#8b5cf6' },
            { label: 'TU Delft', href: 'https://www.tudelft.nl', color: '#00ff88' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono px-4 py-2 rounded-full border transition-all hover:scale-105"
              style={{ borderColor: `${link.color}30`, color: link.color }}
            >
              {link.label} &rarr;
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReplicationHeatmap() {
  const heatmapRows = [
    { paper: 'Sagastizabal 2019', emulator: 'pass', tuna9: 'partial', ibm: 'partial', iqm: null, type: 'VQE + EM', note: '4/4 claims' },
    { paper: 'Kandala 2017', emulator: 'pass', tuna9: 'partial', ibm: 'partial', iqm: null, type: 'VQE', note: '5/5 claims' },
    { paper: 'Peruzzo 2014', emulator: 'pass', tuna9: null, ibm: 'fail', iqm: null, type: 'VQE', note: '3/5 claims' },
    { paper: 'Cross 2019', emulator: 'pass', tuna9: 'pass', ibm: 'pass', iqm: 'partial', type: 'QV + RB', note: '3/3 claims' },
    { paper: 'Harrigan 2021', emulator: 'pass', tuna9: 'pass', ibm: null, iqm: null, type: 'QAOA', note: '4/4 claims' },
  ]

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
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-3">
          Replication Results
        </h2>
        <p className="text-gray-400 text-sm mb-8 max-w-3xl">
          Five landmark quantum computing papers replicated by AI agents on four backends.
          The pattern: emulators always pass, hardware exposes the noise floor.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 pr-4 text-gray-500 font-mono text-xs">Paper</th>
                <th className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#eab308' }}>Emulator</th>
                <th className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#8b5cf6' }}>Tuna-9</th>
                <th className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#00d4ff' }}>IBM Torino</th>
                <th className="text-center py-3 px-3 font-mono text-xs" style={{ color: '#ff6b9d' }}>IQM Garnet</th>
                <th className="text-right py-3 pl-4 text-gray-500 font-mono text-xs">Type</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {heatmapRows.map(row => (
                <tr key={row.paper} className="border-b border-white/5">
                  <td className="py-2.5 pr-4 text-gray-300">
                    {row.paper}
                    <span className="text-gray-600 ml-2">{row.note}</span>
                  </td>
                  <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.emulator)}`}>{cellLabel(row.emulator)}</td>
                  <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.tuna9)}`}>{cellLabel(row.tuna9)}</td>
                  <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.ibm)}`}>{cellLabel(row.ibm)}</td>
                  <td className={`py-2.5 px-3 text-center rounded-sm ${cellStyle(row.iqm)}`}>{cellLabel(row.iqm)}</td>
                  <td className="py-2.5 pl-4 text-right text-gray-600">{row.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] text-gray-600 font-mono">
            PASS = all claims within error bars. PARTIAL = some pass, some fail (noise). FAIL = no claims pass. -- = not yet tested.
          </p>
          <Link href="/replications" className="text-xs font-mono text-[#ff8c42] hover:underline whitespace-nowrap">
            Full reports &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

function CrossPlatformComparison() {
  const rows = [
    { metric: 'Bell fidelity', tuna9: '93.5%', iqm: '98.1%', ibm: '86.5%', best: 'iqm' },
    { metric: 'GHZ-3 fidelity', tuna9: '88.9%', iqm: '93.9%', ibm: '82.9%', best: 'iqm' },
    { metric: 'GHZ-5 fidelity', tuna9: '83.8%', iqm: '81.8%', ibm: '76.6%', best: 'tuna9' },
    { metric: 'GHZ-10', tuna9: 'n/a', iqm: '54.7%', ibm: '62.2%', best: 'ibm' },
    { metric: 'Quantum Volume', tuna9: '8', iqm: '32', ibm: '32', best: 'both' },
    { metric: 'RB gate fidelity', tuna9: '99.82%', iqm: '99.82%', ibm: '99.99%*', best: 'tuna9' },
    { metric: 'VQE H\u2082 (kcal/mol)', tuna9: '0.92', iqm: '--', ibm: '0.22', best: 'ibm' },
    { metric: 'Dominant noise', tuna9: 'Dephasing', iqm: 'Dephasing', ibm: 'Depolarizing', best: '' },
  ]

  return (
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-3">
          Three Chips, One Suite
        </h2>
        <p className="text-gray-400 text-sm mb-8 max-w-3xl">
          Same circuits, different hardware. Each metric tested on QI Tuna-9 (9q),
          IQM Garnet (20q), and IBM Torino (133q).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 pr-4 text-gray-500 font-mono text-xs">Metric</th>
                {[
                  { name: 'QI Tuna-9', qubits: '9q', color: '#8b5cf6' },
                  { name: 'IQM Garnet', qubits: '20q', color: '#ff6b9d' },
                  { name: 'IBM Torino', qubits: '133q', color: '#00d4ff' },
                ].map(b => (
                  <th key={b.name} className="text-center py-3 px-3 font-mono text-xs" style={{ color: b.color }}>
                    {b.name} <span className="text-gray-600">({b.qubits})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {rows.map(row => (
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] text-gray-600 font-mono">
            * IBM RB inflated by transpiler collapsing Clifford sequences. Bold = best per metric. VQE with best error mitigation per platform.
          </p>
          <Link href="/platforms" className="text-xs font-mono text-[#00d4ff] hover:underline whitespace-nowrap">
            Full comparison &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── ACT 2: What It Found ───────────────────────────────────────────────────

function KeyFindings() {
  const findings = [
    {
      title: 'Benchmarks pass, chemistry fails',
      detail: 'LLMs score 62% on quantum coding tasks, and emulator replications pass 100% of the time. But real hardware exposes the gap: VQE for HeH+ fails on all 11 IBM runs (83.5 kcal/mol error). The bottleneck is not AI capability \u2014 it\u2019s hardware noise.',
      color: '#ff8c42',
      stat: '90%',
      statLabel: 'emulator pass rate',
    },
    {
      title: 'Error mitigation is the equalizer',
      detail: 'TREX (twirled readout error extinction) achieves 0.22 kcal/mol on IBM Torino \u2014 a 119x improvement over raw measurements and within chemical accuracy. On Tuna-9, hybrid post-selection + readout error mitigation reaches 0.92 kcal/mol. The right mitigation strategy matters more than the hardware.',
      color: '#00ff88',
      stat: '119x',
      statLabel: 'noise reduction (IBM TREX)',
    },
    {
      title: 'Topology kills before scale does',
      detail: 'Tuna-9 (9 qubits) beats IQM Garnet (20q) on GHZ-5 fidelity: 83.8% vs 81.8%. Autonomous qubit routing improves GHZ-3 by 5.8pp on Tuna-9. The lesson: knowing your chip\u2019s connectivity graph matters more than raw qubit count.',
      color: '#8b5cf6',
      stat: '5.8pp',
      statLabel: 'improvement from routing',
    },
  ]

  return (
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-3">
          Key Findings
        </h2>
        <p className="text-gray-400 text-sm mb-8 max-w-3xl">
          Three insights from 50+ experiments across three quantum processors.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {findings.map(f => (
            <div
              key={f.title}
              className="p-6 rounded-xl border"
              style={{ borderColor: `${f.color}20`, background: `${f.color}05` }}
            >
              <div className="flex items-baseline gap-3 mb-3">
                <div className="text-3xl font-black font-mono" style={{ color: f.color }}>
                  {f.stat}
                </div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                  {f.statLabel}
                </div>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── ACT 3: AI Makes Quantum Accessible ─────────────────────────────────────

function VisualizationZoo() {
  const highlights = vizExhibits.slice(0, 5)
  return (
    <section id="viz" className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8b5cf6] mb-3">
              AI-Generated Educational Tools
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl">
              {vizExhibits.length} interactive exhibits built entirely by AI agents &mdash; a real
              state-vector quantum simulator in TypeScript, 3D visualizations, and step-by-step
              algorithm walkthroughs. Every number computed live, nothing mocked.
            </p>
          </div>
          <Link href="/learn" className="text-xs font-mono text-[#8b5cf6] hover:underline whitespace-nowrap">
            All {vizExhibits.length} exhibits &rarr;
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {highlights.map((ex) => (
            <Link
              key={ex.href}
              href={ex.href}
              className="group p-4 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ borderColor: `${ex.color}20`, background: `${ex.color}05` }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ex.color }} />
                <h3 className="text-xs font-bold text-white group-hover:underline">{ex.title}</h3>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{ex.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function WP44Connection() {
  const areas = [
    { title: 'Accessibility', desc: 'Quantum computing interfaces for diverse learners and non-experts', color: '#00d4ff' },
    { title: 'Metaphor Design', desc: 'Visual and conceptual metaphors that make quantum intuitive', color: '#8b5cf6' },
    { title: 'QCT Framework', desc: 'Quantum Computational Thinking as a new educational paradigm', color: '#00ff88' },
    { title: 'AI Vibecoding', desc: 'Natural-language quantum programming powered by LLMs', color: '#ff8c42' },
  ]

  return (
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff6b9d] mb-3">
          WP4.4 &mdash; Designing Quantum for Everyone
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div>
            <p className="text-gray-400 leading-relaxed mb-4">
              A 48-month research program at TU Delft investigating how to make quantum computing
              genuinely accessible. The haiqu experiments feed directly into this work &mdash;
              every visualization, replication, and benchmark is a data point about how AI
              can bridge the gap between quantum physics and human understanding.
            </p>
            <p className="text-gray-400 leading-relaxed mb-6">
              The core question: if AI can already write quantum circuits, optimize for hardware,
              and replicate papers, what role do humans play? We think the answer is
              <span className="text-white font-medium"> design</span> &mdash; shaping how quantum
              computing is experienced, taught, and applied.
            </p>
            <Link href="/wp44" className="text-xs font-mono text-[#ff6b9d] hover:underline">
              Full WP4.4 research program &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {areas.map(a => (
              <div
                key={a.title}
                className="p-4 rounded-xl border"
                style={{ borderColor: `${a.color}20`, background: `${a.color}05` }}
              >
                <div className="w-1.5 h-1.5 rounded-full mb-2" style={{ backgroundColor: a.color }} />
                <h3 className="text-xs font-bold text-white mb-1">{a.title}</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SUPPORTING: How It Works ────────────────────────────────────────────────

function AgentInfrastructure() {
  return (
    <section id="agents" className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-3">
          Agent Infrastructure
        </h2>
        <p className="text-gray-400 text-sm mb-8 max-w-3xl">
          Specialized AI agents that run experiments, replicate papers, and benchmark
          new models continuously. 3 of 4 agents are implemented.
        </p>

        {/* Pipeline */}
        <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] mb-6">
          <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
            Continuous Research Pipeline
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {[
              { label: 'arxiv scan', color: '#8b5cf6', done: false },
              { label: 'paper triage', color: '#8b5cf6', done: false },
              { label: 'replication plan', color: '#ff8c42', done: true },
              { label: 'code generation', color: '#ff8c42', done: true },
              { label: 'simulation', color: '#00ff88', done: true },
              { label: 'hardware run', color: '#00d4ff', done: true },
              { label: 'analysis', color: '#ff6b9d', done: true },
              { label: 'report', color: '#94a3b8', done: true },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded border ${step.done ? '' : 'opacity-40'}`}
                  style={{ borderColor: `${step.color}30`, color: step.color }}
                >
                  {step.label}
                </span>
                {i < 7 && <span className="text-gray-600">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Agent cards — 2x2 grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {agentArchitecture.map((agent) => (
            <div
              key={agent.name}
              className="p-5 rounded-xl border transition-all"
              style={{
                borderColor: `${agent.color}20`,
                background: `${agent.color}05`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                <h3 className="text-sm font-bold text-white">{agent.name}</h3>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: agent.color }}>
                  {agent.role}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  agent.status === 'Implemented'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">{agent.description}</p>
              {agent.file && (
                <div className="text-[10px] font-mono text-gray-600">{agent.file}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ResearchContext() {
  return (
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-8">
          Research Context
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">The Hypothesis</h3>
            <p className="text-gray-400 leading-relaxed">
              Frontier LLMs already write working quantum circuits and can reason about
              quantum algorithms. If we build the right infrastructure &mdash; automated benchmarking,
              paper replication pipelines, hardware-aware optimization &mdash; AI agents could
              continuously produce useful quantum computing research with minimal human oversight.
            </p>
            <p className="text-gray-400 leading-relaxed">
              This project tests that hypothesis using{' '}
              <a href="https://www.quantum-inspire.com" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">
                Quantum Inspire
              </a>
              {' '}hardware at TU Delft, open-source quantum SDKs, and frontier AI models.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">Key Questions</h3>
            <ul className="space-y-3">
              {[
                'How well do LLMs understand quantum computing APIs (Qiskit, PennyLane)?',
                'Can AI agents replicate published quantum experiments autonomously?',
                'Can AI find circuit optimizations that algorithmic transpilers miss?',
                'What research infrastructure enables continuous AI-driven discovery?',
                'How should we design quantum computing tools for AI agents vs humans?',
              ].map((q, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-[#00d4ff] font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tech stack — compressed to chips only */}
        <div className="mt-12 flex flex-wrap gap-3">
          {[
            { name: 'Quantum Inspire', color: '#00d4ff' },
            { name: 'IBM Quantum', color: '#8b5cf6' },
            { name: 'IQM Garnet', color: '#ff6b9d' },
            { name: 'Qiskit 2.1', color: '#ff8c42' },
            { name: 'PennyLane', color: '#ff8c42' },
            { name: 'Claude Opus 4.6', color: '#94a3b8' },
            { name: 'Three.js', color: '#00d4ff' },
            { name: 'Next.js 14', color: '#8b5cf6' },
          ].map((tech) => (
            <span
              key={tech.name}
              className="text-xs font-mono px-3 py-1.5 rounded-full border"
              style={{ borderColor: `${tech.color}30`, color: tech.color }}
            >
              {tech.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function BenchmarkResults() {
  const d = benchmarkData
  return (
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="p-6 rounded-xl border border-[#00ff8820] bg-[#00ff8805]">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00ff88]">
              Qiskit HumanEval Benchmark
            </h2>
            <Link href="/experiments" className="text-xs font-mono text-[#00ff88] hover:underline">
              Full results &rarr;
            </Link>
          </div>
          <div className="flex items-baseline gap-4 mb-3">
            <div className="text-4xl font-black font-mono text-[#00ff88]">{d.passRate}%</div>
            <div className="text-sm text-gray-400">Pass@1 ({d.passed}/{d.totalTasks} tasks) &mdash; {d.model}</div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
            The dominant failure mode is not algorithmic misunderstanding &mdash; it&apos;s API version mismatch.
            Qiskit 2.x breaking changes and IBM Runtime dependencies account for most failures.
            The model understands quantum algorithms but has stale API knowledge, suggesting{' '}
            <span className="text-white font-medium">RAG with current docs</span> could push accuracy significantly higher.
            Full benchmark: <a href="https://arxiv.org/abs/2406.02132" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">Qiskit HumanEval paper</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-xs text-gray-500 font-mono">
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
          </div>
          <div className="flex gap-4 text-xs text-gray-500 font-mono">
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://www.quantum-inspire.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">
              Quantum Inspire
            </a>
            <a href="https://qutech.nl" target="_blank" rel="noopener noreferrer" className="hover:text-[#8b5cf6] transition-colors">
              QuTech
            </a>
            <a href="https://arxiv.org/abs/2406.02132" target="_blank" rel="noopener noreferrer" className="hover:text-[#00ff88] transition-colors">
              Qiskit HumanEval paper
            </a>
          </div>
        </div>
        <div className="text-[10px] text-gray-600 font-mono text-center">
          Built with AI agents. This entire website, its quantum simulations, and the research
          infrastructure were created through human-AI collaboration using Claude Code.
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />
      {/* ACT 1: The Machine is Running */}
      <Hero />
      <ReplicationHeatmap />
      <CrossPlatformComparison />
      {/* ACT 2: What It Found */}
      <KeyFindings />
      {/* ACT 3: AI Makes Quantum Accessible */}
      <VisualizationZoo />
      <WP44Connection />
      {/* SUPPORTING: How It Works */}
      <AgentInfrastructure />
      <ResearchContext />
      <BenchmarkResults />
      <Footer />
    </>
  )
}
