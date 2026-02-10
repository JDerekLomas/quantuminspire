'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Real Data ───────────────────────────────────────────────────────────────

const benchmarkData = {
  model: 'Gemini 3 Flash',
  totalTasks: 151,
  passed: 94,
  passRate: 62.25,
  inputTokens: 27720,
  outputTokens: 12339,
  byDifficulty: [
    { level: 'Basic', total: 79, passed: 52, rate: 65.82 },
    { level: 'Intermediate', total: 67, passed: 42, rate: 62.69 },
    { level: 'Difficult', total: 5, passed: 0, rate: 0.0 },
  ],
  errorBreakdown: [
    { type: 'Wrong answer', count: 13, desc: 'Logically incorrect output' },
    { type: 'Syntax error', count: 11, desc: 'Malformed Python code' },
    { type: 'SamplerV2 API', count: 9, desc: 'Qiskit 2.x breaking changes' },
    { type: 'Account/runtime', count: 6, desc: 'IBM Runtime dependency' },
    { type: 'Attribute error', count: 5, desc: 'Wrong method names' },
    { type: 'Type error', count: 4, desc: 'Incorrect argument types' },
    { type: 'Other', count: 9, desc: 'Misc runtime failures' },
  ],
}

const vqeData = {
  paper: 'Sagastizabal et al., Phys. Rev. A 100, 010302 (2019)',
  arxiv: '1902.11258',
  institution: 'QuTech / TU Delft',
  method: '4-qubit Jordan-Wigner VQE for H\u2082 ground-state energy',
  ansatz: 'PennyLane DoubleExcitation (UCCSD)',
  hamiltonian: 'OpenFermion/PySCF \u2192 Jordan-Wigner transform (15 Pauli terms)',
  mitigation: 'Z-parity symmetry verification (post-selection on even parity)',
  noiseModel: '5% depolarizing channels on all qubits (pre- and post-gate)',
  results: [
    { R: 0.3, exact: -0.60180, ideal: -0.60180, noisy: -0.19340, sv: -0.46458 },
    { R: 0.5, exact: -1.05516, ideal: -1.05516, noisy: -0.73730, sv: -0.95249 },
    { R: 0.7, exact: -1.13619, ideal: -1.13619, noisy: -0.88332, sv: -1.05198 },
    { R: 0.9, exact: -1.12056, ideal: -1.12056, noisy: -0.91199, sv: -1.04356 },
    { R: 1.1, exact: -1.07919, ideal: -1.07919, noisy: -0.89693, sv: -1.00586 },
    { R: 1.3, exact: -1.03519, ideal: -1.03519, noisy: -0.86864, sv: -0.95497 },
    { R: 1.5, exact: -0.99815, ideal: -0.99815, noisy: -0.83715, sv: -0.90859 },
    { R: 1.7, exact: -0.97143, ideal: -0.97143, noisy: -0.80961, sv: -0.86623 },
    { R: 1.9, exact: -0.95434, ideal: -0.95434, noisy: -0.79180, sv: -0.83763 },
    { R: 2.1, exact: -0.94437, ideal: -0.94437, noisy: -0.77611, sv: -0.81500 },
    { R: 2.3, exact: -0.93892, ideal: -0.93892, noisy: -0.76622, sv: -0.79880 },
    { R: 2.5, exact: -0.93605, ideal: -0.93605, noisy: -0.76137, sv: -0.78934 },
  ],
  maeIdeal: 0.000000,
  maeNoisy: 0.211460,
  maeSV: 0.106861,
  improvement: 2.0,
  // Real hardware data
  hardware: {
    ibm: {
      backend: 'ibm_torino',
      qubits: 133,
      jobId: 'd65lsrje4kfs73cvjb6g',
      note: 'Full 3-basis measurement (Z, X, Y)',
    },
    qi: {
      backend: 'Tuna-9',
      qubits: 9,
      jobId: '414342',
      // Real measurement counts at optimal theta=0.1118
      counts: { '00': 142, '01': 129, '10': 520, '11': 3305 },
      evenParity: 3447 / 4096,  // 84.2% kept after post-selection
    },
  },
}

const experiments = [
  {
    id: 'qiskit-humaneval',
    title: 'Qiskit HumanEval Benchmark',
    status: 'complete' as const,
    category: 'Benchmark',
    question: 'Can LLMs write correct quantum circuits from natural-language specs?',
    description:
      '151 Qiskit coding tasks evaluated against Gemini 3 Flash. Each task provides a function signature + docstring; the model must produce the function body. Code is executed in a sandboxed subprocess with unit tests.',
    highlight: '62.25% Pass@1 across 151 tasks',
  },
  {
    id: 'vqe-simulation',
    title: 'AI-Assisted VQE Simulation',
    status: 'complete' as const,
    category: 'Simulation',
    question: 'Can AI write correct quantum simulation code from a paper reference?',
    description:
      'Simulation of symmetry-verified VQE for H\u2082 inspired by Sagastizabal et al. (QuTech). Claude Opus 4.6 wrote the Hamiltonian construction, ansatz circuit, toy noise model, and symmetry verification \u2014 300 lines of PennyLane code. Runs in classical simulation, not on quantum hardware.',
    highlight: '12 bond distances, 3 measurement bases, 2x noise reduction via symmetry verification',
  },
  {
    id: 'viz-zoo',
    title: 'Quantum Visualization Zoo',
    status: 'complete' as const,
    category: 'Education',
    question: 'Can AI build interactive quantum simulations for teaching?',
    description:
      'Nine interactive exhibits plus a gallery of 20+ reference visualizations. Full state-vector quantum simulator in TypeScript. Bloch sphere (WebGL 3D), state vectors, measurement, Grover\'s search, entanglement, teleportation, Rabi oscillations, multi-slit interference, and Q-Sphere \u2014 all computed live, nothing mocked.',
    highlight: '9 interactive exhibits, real quantum math in the browser',
  },
  {
    id: 'circuit-optimization',
    title: 'AI Circuit Transpilation',
    status: 'planned' as const,
    category: 'Optimization',
    question: 'Can AI find shorter circuits than algorithmic transpilers?',
    description:
      'LLM-optimized circuits vs Qiskit transpiler for Quantum Inspire hardware topologies (Tuna-9). Measuring gate count, depth, and fidelity.',
    highlight: null,
  },
  {
    id: 'error-characterization',
    title: 'AI Error Characterization',
    status: 'planned' as const,
    category: 'Error Mitigation',
    question: 'Can AI agents learn device-specific noise and auto-select mitigation?',
    description:
      'Agents run characterization circuits on QI hardware, build noise profiles, and select/tune error mitigation (ZNE, PEC, symmetry verification) per-device.',
    highlight: null,
  },
  {
    id: 'literature-agent',
    title: 'Quantum Literature Scout',
    status: 'planned' as const,
    category: 'Infrastructure',
    question: 'Can AI continuously scan arxiv and queue replicable experiments?',
    description:
      'Autonomous arxiv quant-ph monitor that identifies papers with reproducible results, extracts methodology, and generates replication plans.',
    highlight: null,
  },
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
    name: 'Literature Scout',
    role: 'Paper discovery',
    description: 'Monitors arxiv quant-ph. Extracts methodologies. Identifies replicable experiments. Generates structured replication plans.',
    color: '#8b5cf6',
    file: null,
    status: 'Planned',
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
    name: 'Circuit Optimizer',
    role: 'Hardware compilation',
    description: 'Optimizes circuits for QI backends. Tests transpilation strategies on real hardware. Reports fidelity vs gate count.',
    color: '#ff6b9d',
    file: null,
    status: 'Planned',
  },
]

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

// ─── Components ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'complete' | 'planned' }) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    complete: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    planned: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  }
  const labels = { active: 'Running', complete: 'Complete', planned: 'Planned' }
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function BarChart({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = (value / max) * 100
  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="font-mono font-bold text-white tracking-wider text-sm">
            AI x Quantum
          </span>
          <span className="text-[10px] font-mono text-gray-500 hidden sm:block">
            TU Delft / Quantum Inspire
          </span>
        </div>
        <div className="flex gap-6 text-xs font-mono text-gray-500">
          <a href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</a>
          <a href="/replications" className="hover:text-[#ff8c42] transition-colors">Replications</a>
          <a href="/learn" className="hover:text-[#8b5cf6] transition-colors">Learn</a>
          <a href="/blog" className="hover:text-[#ff6b9d] transition-colors">Blog</a>
          <a href="/wp44" className="hover:text-[#ff6b9d] transition-colors hidden sm:block">WP4.4</a>
          <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </nav>
  )
}

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
        <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-8">
          An experimental research program at{' '}
          <span className="text-white font-medium">TU Delft</span> building autonomous
          AI infrastructure for quantum computing research &mdash; benchmarking LLMs on quantum
          tasks, replicating published papers, and designing agent systems that run
          experiments continuously.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-6 mb-10">
          {[
            { value: '62.25%', label: 'Pass@1 on Qiskit HumanEval', color: '#00ff88' },
            { value: '151', label: 'quantum coding tasks benchmarked', color: '#00d4ff' },
            { value: '9', label: 'interactive quantum simulations', color: '#8b5cf6' },
            { value: '4', label: 'papers replicated with AI', color: '#ff8c42' },
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

// ─── Benchmark Results ───────────────────────────────────────────────────────

function BenchmarkResults() {
  const d = benchmarkData
  return (
    <section id="results" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-3">
          Benchmark Results
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-3xl">
          Full run of the{' '}
          <a href="https://arxiv.org/abs/2406.02132" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">
            Qiskit HumanEval
          </a>
          {' '}benchmark &mdash; 151 quantum programming tasks graded by automated code execution.
        </p>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Overall score */}
          <div className="lg:col-span-1 p-6 rounded-xl border border-[#00ff8820] bg-[#00ff8805]">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">Overall</div>
            <div className="text-5xl font-black font-mono text-[#00ff88] mb-1">{d.passRate}%</div>
            <div className="text-sm text-gray-400 mb-4">Pass@1 ({d.passed}/{d.totalTasks})</div>
            <div className="text-xs text-gray-500 font-mono space-y-1">
              <div>Model: {d.model}</div>
              <div>Tokens: {d.inputTokens.toLocaleString()} in / {d.outputTokens.toLocaleString()} out</div>
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div className="lg:col-span-2 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">By Difficulty</div>
            <div className="space-y-4">
              {d.byDifficulty.map((diff) => {
                const colors: Record<string, string> = { Basic: '#00ff88', Intermediate: '#00d4ff', Difficult: '#ff6b9d' }
                return (
                  <div key={diff.level}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm text-gray-300">{diff.level}</span>
                      <span className="text-sm font-mono font-bold" style={{ color: colors[diff.level] }}>
                        {diff.rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart value={diff.passed} max={diff.total} color={colors[diff.level]} />
                      <span className="text-[10px] text-gray-500 font-mono w-12 text-right">{diff.passed}/{diff.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Key insight */}
        <div className="p-4 rounded-lg border border-[#00d4ff20] bg-[#00d4ff05]">
          <div className="text-xs font-mono text-[#00d4ff] uppercase tracking-widest mb-2">Key Insight</div>
          <p className="text-sm text-gray-300 leading-relaxed">
            The dominant failure mode is <span className="text-white font-medium">not algorithmic misunderstanding</span> &mdash;
            it&apos;s API version mismatch. 9 failures came from <code className="text-xs bg-white/5 px-1 py-0.5 rounded">SamplerV2</code> breaking
            changes in Qiskit 2.x, and 6 from IBM Runtime account requirements. The model understands quantum
            algorithms but has stale API knowledge. This suggests <span className="text-white font-medium">retrieval-augmented generation
            with current API docs</span> could push Pass@1 significantly higher.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── VQE Replication ─────────────────────────────────────────────────────────

function VQEReplication() {
  const d = vqeData
  // Scale energy values to chart coordinates
  const chartW = 600, chartH = 260, padL = 45, padR = 15, padT = 15, padB = 30
  const plotW = chartW - padL - padR, plotH = chartH - padT - padB
  const minE = -1.2, maxE = -0.1
  const minR = 0.3, maxR = 2.5
  const x = (r: number) => padL + ((r - minR) / (maxR - minR)) * plotW
  const y = (e: number) => padT + ((maxE - e) / (maxE - minE)) * plotH
  const line = (pts: { R: number; val: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.R).toFixed(1)},${y(p.val).toFixed(1)}`).join(' ')

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-3">
          VQE Simulation
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-3xl">
          AI-assisted simulation inspired by{' '}
          <a href={`https://arxiv.org/abs/${d.arxiv}`} target="_blank" rel="noopener noreferrer" className="text-[#ff8c42] hover:underline">
            Sagastizabal et al. (2019)
          </a>
          {' '}&mdash; symmetry-verified VQE for H&#x2082; from QuTech/TU Delft.
          Claude Opus 4.6 wrote the simulation code: Hamiltonian construction, variational ansatz,
          toy noise model, and parity post-selection. Classical simulation only &mdash; not yet validated on quantum hardware.
        </p>

        {/* Results chart + summary */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Energy curve chart */}
          <div className="lg:col-span-2 p-6 rounded-xl border border-[#ff8c4220] bg-[#ff8c4205]">
            <div className="text-xs font-mono text-[#ff8c42] uppercase tracking-widest mb-4">
              H&#x2082; Potential Energy Surface
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 300 }}>
              {/* Grid lines */}
              {[-1.2, -1.0, -0.8, -0.6, -0.4, -0.2].map(e => (
                <g key={e}>
                  <line x1={padL} y1={y(e)} x2={chartW - padR} y2={y(e)} stroke="white" strokeOpacity={0.05} />
                  <text x={padL - 5} y={y(e) + 3} textAnchor="end" fill="#666" fontSize={9} fontFamily="monospace">{e.toFixed(1)}</text>
                </g>
              ))}
              {[0.5, 1.0, 1.5, 2.0, 2.5].map(r => (
                <g key={r}>
                  <line x1={x(r)} y1={padT} x2={x(r)} y2={chartH - padB} stroke="white" strokeOpacity={0.05} />
                  <text x={x(r)} y={chartH - padB + 14} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">{r.toFixed(1)}</text>
                </g>
              ))}
              {/* Axis labels */}
              <text x={chartW / 2} y={chartH - 2} textAnchor="middle" fill="#888" fontSize={10} fontFamily="monospace">Bond distance (&#x212B;)</text>
              <text x={8} y={chartH / 2} textAnchor="middle" fill="#888" fontSize={10} fontFamily="monospace" transform={`rotate(-90, 8, ${chartH / 2})`}>Energy (Ha)</text>

              {/* Exact (FCI) */}
              <path d={line(d.results.map(r => ({ R: r.R, val: r.exact })))} fill="none" stroke="white" strokeWidth={2} />
              {/* Noisy */}
              <path d={line(d.results.map(r => ({ R: r.R, val: r.noisy })))} fill="none" stroke="#ff6b9d" strokeWidth={1.5} strokeDasharray="4,3" />
              {/* Symmetry-verified */}
              <path d={line(d.results.map(r => ({ R: r.R, val: r.sv })))} fill="none" stroke="#00ff88" strokeWidth={2} />
              {/* Data points */}
              {d.results.map(r => (
                <g key={r.R}>
                  <circle cx={x(r.R)} cy={y(r.exact)} r={2.5} fill="white" />
                  <circle cx={x(r.R)} cy={y(r.noisy)} r={2} fill="#ff6b9d" />
                  <circle cx={x(r.R)} cy={y(r.sv)} r={2.5} fill="#00ff88" />
                </g>
              ))}
              {/* Legend */}
              <g transform={`translate(${padL + 10}, ${padT + 10})`}>
                <line x1={0} y1={0} x2={16} y2={0} stroke="white" strokeWidth={2} />
                <text x={20} y={3} fill="white" fontSize={9} fontFamily="monospace">Exact (FCI)</text>
                <line x1={0} y1={14} x2={16} y2={14} stroke="#ff6b9d" strokeWidth={1.5} strokeDasharray="4,3" />
                <text x={20} y={17} fill="#ff6b9d" fontSize={9} fontFamily="monospace">Noisy (5% depol.)</text>
                <line x1={0} y1={28} x2={16} y2={28} stroke="#00ff88" strokeWidth={2} />
                <text x={20} y={31} fill="#00ff88" fontSize={9} fontFamily="monospace">Symmetry-verified</text>
              </g>
            </svg>
          </div>

          {/* Summary stats */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-[#00ff8820] bg-[#00ff8805]">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Mitigation Result</div>
              <div className="text-4xl font-black font-mono text-[#00ff88] mb-1">{d.improvement}x</div>
              <div className="text-sm text-gray-400">noise reduction</div>
              <div className="text-[10px] font-mono text-gray-500 mt-2">
                MAE: {d.maeNoisy.toFixed(3)} &rarr; {d.maeSV.toFixed(3)} Ha
              </div>
            </div>
            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Ideal VQE</div>
              <div className="text-2xl font-black font-mono text-white mb-1">0.000</div>
              <div className="text-sm text-gray-400">Ha MAE (exact)</div>
              <div className="text-[10px] font-mono text-gray-500 mt-2">
                DoubleExcitation ansatz + Brent optimizer
              </div>
            </div>
            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Setup</div>
              <div className="space-y-1 text-[10px] font-mono text-gray-400">
                <div>4 qubits (Jordan-Wigner)</div>
                <div>PennyLane + OpenFermion/PySCF</div>
                <div>8192 shots per point, 12 bond distances</div>
                <div>Parity post-selection on Z terms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key insight */}
        <div className="p-4 rounded-lg border border-[#ff8c4220] bg-[#ff8c4205]">
          <div className="text-xs font-mono text-[#ff8c42] uppercase tracking-widest mb-2">Key Insight</div>
          <p className="text-sm text-gray-300 leading-relaxed">
            Symmetry verification works by post-selecting measurement outcomes where the total qubit parity
            matches the expected symmetry sector. For H&#x2082;, this means keeping only even-parity samples
            when measuring Z-diagonal Hamiltonian terms. The technique is <span className="text-white font-medium">most effective near
            equilibrium</span> (up to 3x at R=0.7 &#x212B;) and degrades at large bond distances where
            electron correlation dominates.
          </p>
        </div>

        {/* Link to full results */}
        <div className="mt-6 flex items-center gap-4">
          <Link href="/experiments" className="text-xs font-mono text-[#00d4ff] hover:underline">
            Full hardware results (IBM, Tuna-9) &rarr;
          </Link>
          <Link href="/replications" className="text-xs font-mono text-[#ff8c42] hover:underline">
            Paper replications (4 papers, 16+ claims) &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Visualization Zoo ───────────────────────────────────────────────────────

function VisualizationZoo() {
  const highlights = vizExhibits.slice(0, 5)
  return (
    <section id="viz" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8b5cf6] mb-3">
              Quantum Visualization Zoo
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl">
              {vizExhibits.length} interactive exhibits powered by a real state-vector quantum simulator in TypeScript.
              Every number is computed live &mdash; nothing mocked.
            </p>
          </div>
          <Link href="/learn" className="text-xs font-mono text-[#8b5cf6] hover:underline whitespace-nowrap">
            All {vizExhibits.length} exhibits + glossary &rarr;
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

// ─── Experiments ──────────────────────────────────────────────────────────────

// ─── Agent Architecture ──────────────────────────────────────────────────────

function AgentInfrastructure() {
  return (
    <section id="agents" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff6b9d] mb-3">
          Agent-Based Research Infrastructure
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-3xl">
          Specialized AI agents for running experiments, analyzing results,
          and proposing new research directions. 3 of 5 agents are implemented.
        </p>

        {/* Pipeline */}
        <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] mb-8">
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
              { label: 'hardware run', color: '#00d4ff', done: false },
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

        {/* Agent cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

// ─── Research Context ────────────────────────────────────────────────────────

function ResearchContext() {
  return (
    <section className="py-20 px-6 border-t border-white/5">
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

        {/* Tech stack */}
        <div className="mt-16 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Technology Stack
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'Quantum Inspire', desc: 'Tuna-9 superconducting hardware', color: '#00d4ff' },
              { name: 'Qiskit 2.1 + Aer', desc: 'Circuits, simulation, noise', color: '#8b5cf6' },
              { name: 'PennyLane 0.44', desc: 'Variational algorithms & autodiff', color: '#00ff88' },
              { name: 'OpenSquirrel', desc: 'cQASM 3.0 compilation', color: '#ff8c42' },
              { name: 'Claude Opus 4.6', desc: 'Autonomous coding agent', color: '#ff6b9d' },
              { name: 'Gemini 3 Flash', desc: 'Benchmark evaluation', color: '#94a3b8' },
              { name: 'Three.js', desc: '3D quantum visualization', color: '#00d4ff' },
              { name: 'Next.js 14', desc: 'Research website framework', color: '#8b5cf6' },
            ].map((tech) => (
              <div key={tech.name} className="space-y-1">
                <div className="text-sm font-medium" style={{ color: tech.color }}>{tech.name}</div>
                <div className="text-xs text-gray-500">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* WP4.4 callout */}
        <div className="mt-8 p-6 rounded-xl border border-[#ff6b9d20] bg-[#ff6b9d05]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-[#ff6b9d] uppercase tracking-widest mb-2">Also: Design Research</div>
              <h3 className="text-lg font-bold text-white mb-1">WP4.4 &mdash; Designing Quantum for Everyone</h3>
              <p className="text-sm text-gray-400 max-w-xl">
                48-month research program on quantum computing UX &mdash; accessibility, metaphor design,
                Quantum Computational Thinking framework, and AI-powered &ldquo;quantum vibecoding&rdquo;.
              </p>
            </div>
            <Link href="/wp44" className="text-xs font-mono text-[#ff6b9d] hover:underline whitespace-nowrap">
              View &rarr;
            </Link>
          </div>
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
            TU Delft / QuTech / Quantum Inspire &mdash; 2026
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
      <Hero />
      <BenchmarkResults />
      <VQEReplication />
      <VisualizationZoo />
      <AgentInfrastructure />
      <ResearchContext />
      <Footer />
    </>
  )
}
