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
    { level: 'Intermediate', total: 67, passed: 41, rate: 61.19 },
    { level: 'Difficult', total: 5, passed: 1, rate: 20.0 },
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
  method: '2-qubit VQE for H\u2082 ground-state energy',
  bondDistances: 29,
  ansatz: 'Single-parameter exchange rotation in {|01\u27E9, |10\u27E9} subspace',
  hamiltonian: 'H = g\u2080II + g\u2081ZI + g\u2082IZ + g\u2083ZZ + g\u2084XX + g\u2085YY',
  mitigation: 'Z-parity symmetry verification (post-selection on even parity)',
  noiseModel: 'T\u2081=30\u03BCs, T\u2082=60\u03BCs, depolarizing single/two-qubit gates',
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
    id: 'vqe-replication',
    title: 'AI-Assisted Paper Replication',
    status: 'complete' as const,
    category: 'Replication',
    question: 'Can AI agents replicate published quantum experiments end-to-end?',
    description:
      'Full replication of a QuTech paper on symmetry-verified VQE for H\u2082. Claude Opus 4.6 autonomously wrote the Hamiltonian construction, ansatz circuit, noise model, and symmetry verification \u2014 300 lines of production Qiskit code.',
    highlight: '29 bond distances, 3 measurement bases, symmetry verification',
  },
  {
    id: 'viz-zoo',
    title: 'Quantum Visualization Zoo',
    status: 'complete' as const,
    category: 'Education',
    question: 'Can AI build interactive quantum simulations for teaching?',
    description:
      'Five interactive exhibits running a full state-vector quantum simulator in TypeScript. Bloch sphere, multi-qubit state vectors, measurement statistics, Grover\'s search, and entanglement analysis \u2014 all computed live, nothing mocked.',
    highlight: '5 interactive exhibits, real quantum math in the browser',
  },
  {
    id: 'circuit-optimization',
    title: 'AI Circuit Transpilation',
    status: 'planned' as const,
    category: 'Optimization',
    question: 'Can AI find shorter circuits than algorithmic transpilers?',
    description:
      'LLM-optimized circuits vs Qiskit transpiler for Quantum Inspire hardware topologies (Starmon-7, Tuna-5/9). Measuring gate count, depth, and fidelity.',
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
          <a href="#results" className="hover:text-[#00d4ff] transition-colors">Results</a>
          <a href="#experiments" className="hover:text-[#00ff88] transition-colors">Experiments</a>
          <a href="#viz" className="hover:text-[#8b5cf6] transition-colors">Viz Zoo</a>
          <a href="#agents" className="hover:text-[#ff8c42] transition-colors">Agents</a>
          <a href="/wp44" className="hover:text-[#ff6b9d] transition-colors">WP4.4</a>
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
            { value: '5', label: 'interactive quantum simulations', color: '#8b5cf6' },
            { value: '1', label: 'paper replicated autonomously', color: '#ff8c42' },
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
          <div className="lg:col-span-1 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
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

          {/* Error analysis */}
          <div className="lg:col-span-1 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
              Failure Analysis ({d.totalTasks - d.passed} failures)
            </div>
            <div className="space-y-2">
              {d.errorBreakdown.map((err) => (
                <div key={err.type} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-300 w-24 truncate" title={err.type}>{err.type}</span>
                  <div className="flex-1">
                    <BarChart value={err.count} max={13} color="#ff6b9d" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 w-4 text-right">{err.count}</span>
                </div>
              ))}
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
  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-3">
          Paper Replication
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-3xl">
          Autonomous replication of a QuTech/TU Delft paper using Claude Opus 4.6 as the coding agent.
          The AI wrote 300 lines of Qiskit simulation code from the paper reference alone.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Paper details */}
          <div className="p-6 rounded-xl border border-[#ff8c4220] bg-[#ff8c4205]">
            <div className="text-xs font-mono text-[#ff8c42] uppercase tracking-widest mb-4">Source Paper</div>
            <h3 className="text-lg font-bold text-white mb-2">
              Error Mitigation by Symmetry Verification on a VQE
            </h3>
            <div className="text-sm text-gray-400 mb-4">{vqeData.paper}</div>
            <div className="space-y-2 text-xs font-mono text-gray-400">
              <div><span className="text-gray-500">Institution:</span> <span className="text-white">{vqeData.institution}</span></div>
              <div><span className="text-gray-500">Method:</span> <span className="text-white">{vqeData.method}</span></div>
              <div><span className="text-gray-500">Bond distances:</span> <span className="text-white">{vqeData.bondDistances} points (0.2 - 3.0 &#x212B;)</span></div>
              <div><span className="text-gray-500">Ansatz:</span> <span className="text-white">{vqeData.ansatz}</span></div>
            </div>
            <a
              href={`https://arxiv.org/abs/${vqeData.arxiv}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-xs font-mono text-[#ff8c42] hover:underline"
            >
              arxiv:{vqeData.arxiv} &rarr;
            </a>
          </div>

          {/* What AI did */}
          <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
              What the AI Agent Built
            </div>
            <div className="space-y-3">
              {[
                {
                  label: 'Hamiltonian',
                  detail: vqeData.hamiltonian,
                  desc: 'Bravyi-Kitaev reduced H\u2082 with tabulated coefficients from O\'Malley et al.',
                },
                {
                  label: 'Ansatz Circuit',
                  detail: 'RXX(\u03B8) + RYY(\u03B8) on |10\u27E9',
                  desc: 'Parity-preserving exchange rotation matching the paper\'s approach',
                },
                {
                  label: 'Noise Model',
                  detail: vqeData.noiseModel,
                  desc: 'Thermal relaxation + depolarizing channels on all gates',
                },
                {
                  label: 'Error Mitigation',
                  detail: vqeData.mitigation,
                  desc: 'Post-select on states where qubit parity matches ground-state sector',
                },
                {
                  label: 'Measurement',
                  detail: 'Z, X, Y bases (3 circuits per \u03B8)',
                  desc: '8192 shots per basis. XX from H-rotated, YY from Sdg-H-rotated measurements',
                },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-mono text-[#ff8c42]">{item.label}</span>
                    <span className="text-[10px] font-mono text-gray-500">{item.detail}</span>
                  </div>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Visualization Zoo ───────────────────────────────────────────────────────

function VisualizationZoo() {
  return (
    <section id="viz" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8b5cf6] mb-3">
          Quantum Visualization Zoo
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-3xl">
          Interactive exhibits powered by a{' '}
          <span className="text-white">real state-vector quantum simulator</span> written in TypeScript.
          Every number is computed &mdash; complex amplitudes, density matrices, entanglement entropy &mdash; nothing is mocked.
          Built by AI in a single session.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vizExhibits.map((ex) => (
            <Link
              key={ex.href}
              href={ex.href}
              className="group p-5 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ borderColor: `${ex.color}20`, background: `${ex.color}05` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ex.color }} />
                <h3 className="text-sm font-bold text-white group-hover:underline">{ex.title}</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">{ex.desc}</p>
              <div className="text-[10px] font-mono text-gray-500 mb-3">{ex.features}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: ex.color }}>
                Launch &rarr;
              </div>
            </Link>
          ))}

          {/* Quantum simulation engine card */}
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <h3 className="text-sm font-bold text-gray-400">Simulation Engine</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              TypeScript quantum library powering all visualizations.
            </p>
            <div className="text-[10px] font-mono text-gray-600 space-y-1">
              <div>Complex arithmetic + gate matrices</div>
              <div>Single-qubit &amp; CNOT gate application</div>
              <div>Density matrices &amp; partial trace</div>
              <div>Von Neumann entropy &amp; concurrence</div>
              <div>Grover&apos;s oracle + diffusion operators</div>
              <div>Bloch sphere coordinate mapping</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Experiments ──────────────────────────────────────────────────────────────

function ExperimentCard({ experiment }: { experiment: typeof experiments[0] }) {
  return (
    <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{experiment.category}</span>
          <StatusBadge status={experiment.status} />
        </div>
      </div>
      <h3 className="text-base font-bold text-white mb-1">{experiment.title}</h3>
      <p className="text-xs text-[#00d4ff] font-medium mb-2 italic">&ldquo;{experiment.question}&rdquo;</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">{experiment.description}</p>
      {experiment.highlight && (
        <div className="text-[10px] font-mono text-[#00ff88] mt-2">{experiment.highlight}</div>
      )}
    </div>
  )
}

function ExperimentCatalog() {
  return (
    <section id="experiments" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-3">
          Experiment Catalog
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          {experiments.filter(e => e.status === 'complete').length} complete, {' '}
          {experiments.filter(e => e.status === 'planned').length} planned
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Agent Architecture ──────────────────────────────────────────────────────

function AgentInfrastructure() {
  return (
    <section id="agents" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff6b9d] mb-3">
          Agent-Based Research Infrastructure
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-3xl">
          Specialized AI agents that continuously run experiments, analyze results,
          and propose new research directions. 3 of 5 agents are implemented and operational.
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
              { name: 'Quantum Inspire', desc: 'Starmon-7, Tuna-5/9 hardware', color: '#00d4ff' },
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
            TU Delft / QuTech / Quantum Inspire &mdash; 2025
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
      <ExperimentCatalog />
      <AgentInfrastructure />
      <ResearchContext />
      <Footer />
    </>
  )
}
