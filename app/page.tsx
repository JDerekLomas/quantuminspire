'use client'

import { useState } from 'react'

// ─── Data ────────────────────────────────────────────────────────────────────

const experiments = [
  {
    id: 'qiskit-humaneval',
    title: 'Qiskit HumanEval Benchmark',
    status: 'active' as const,
    category: 'Benchmark',
    question: 'Can LLMs write correct quantum circuits from natural-language specs?',
    description:
      'Running 151 Qiskit coding tasks from the Qiskit HumanEval dataset against frontier LLMs. Measures Pass@1 across basic, intermediate, and difficult quantum programming challenges — from simple circuit construction to VQE implementations.',
    models: ['Gemini 3 Flash', 'Claude Sonnet 4.5', 'GPT-4.1'],
    findings: [
      'Benchmark harness operational — automated LLM call, code execution, and grading',
      'Initial runs show models handle basic circuit construction but struggle with Qiskit 2.x API changes',
      'Error analysis reveals most failures are API mismatches, not algorithmic errors',
    ],
    techStack: ['Qiskit 2.1', 'Google GenAI', 'Anthropic API', 'Python subprocess sandboxing'],
    metric: 'Pass@1',
  },
  {
    id: 'vqe-replication',
    title: 'AI-Assisted Paper Replication',
    status: 'complete' as const,
    category: 'Replication',
    question: 'Can AI agents replicate published quantum experiments end-to-end?',
    description:
      'Replicating Sagastizabal et al. (Phys. Rev. A 100, 010302, 2019) — a QuTech/TU Delft paper on symmetry-verified VQE for H₂ ground-state energy. The AI agent wrote the full simulation: Hamiltonian construction, ansatz design, noise modeling, and symmetry verification error mitigation.',
    models: ['Claude Opus 4.6 (coding agent)'],
    findings: [
      'Full 2-qubit VQE sweep across 29 bond distances implemented autonomously',
      'Realistic noise model (T1/T2 relaxation + depolarizing) matches paper methodology',
      'Symmetry verification post-selection successfully reduces energy estimation errors',
      'AI agent correctly identified and implemented Bravyi-Kitaev transformation from reference data',
    ],
    techStack: ['Qiskit 2.1', 'Qiskit Aer', 'NumPy'],
    metric: 'Mean absolute error vs exact diagonalization',
  },
  {
    id: 'circuit-optimization',
    title: 'AI Circuit Transpilation',
    status: 'planned' as const,
    category: 'Optimization',
    question: 'Can AI find shorter circuits than algorithmic transpilers?',
    description:
      'Using LLMs to optimize quantum circuits for specific hardware topologies (Starmon-7, Tuna-5/9). Compare AI-generated transpilations against Qiskit\'s built-in optimization levels for gate count, depth, and fidelity on Quantum Inspire hardware.',
    models: ['TBD — multi-model comparison'],
    findings: [],
    techStack: ['Qiskit 2.1', 'Quantum Inspire SDK v3', 'OpenSquirrel'],
    metric: 'Gate count / circuit depth / hardware fidelity',
  },
  {
    id: 'error-characterization',
    title: 'AI Error Characterization',
    status: 'planned' as const,
    category: 'Error Mitigation',
    question: 'Can AI agents learn device-specific noise signatures and auto-select mitigation strategies?',
    description:
      'Deploy agents that run characterization circuits on Quantum Inspire hardware, build noise profiles, and automatically select/tune error mitigation techniques (ZNE, PEC, symmetry verification) per-device.',
    models: ['TBD'],
    findings: [],
    techStack: ['Quantum Inspire SDK v3', 'Qiskit Aer noise models'],
    metric: 'Fidelity improvement vs unmitigated',
  },
  {
    id: 'literature-agent',
    title: 'Quantum Literature Scout',
    status: 'planned' as const,
    category: 'Infrastructure',
    question: 'Can AI continuously scan arxiv for replicable quantum experiments and queue them?',
    description:
      'An autonomous agent that monitors arxiv quant-ph, identifies papers with reproducible experimental results, extracts the methodology, and generates replication plans for the VQE replication agent to execute.',
    models: ['TBD'],
    findings: [],
    techStack: ['arxiv API', 'Semantic Scholar', 'LLM extraction'],
    metric: 'Papers identified / replications queued per week',
  },
]

const agentArchitecture = [
  {
    name: 'Orchestrator',
    role: 'Central coordinator',
    description: 'Manages the research pipeline. Prioritizes experiments, allocates compute, tracks results, and decides what to investigate next based on findings.',
    color: '#00d4ff',
    connections: ['Literature Scout', 'Benchmark Runner', 'Replication Agent', 'Circuit Optimizer'],
  },
  {
    name: 'Literature Scout',
    role: 'Paper discovery & analysis',
    description: 'Monitors arxiv quant-ph daily. Extracts experimental methodologies from papers. Identifies which experiments are replicable with available hardware. Generates structured replication plans.',
    color: '#8b5cf6',
    connections: ['Orchestrator'],
  },
  {
    name: 'Benchmark Runner',
    role: 'Continuous evaluation',
    description: 'Runs Qiskit HumanEval and custom benchmarks against new LLM releases. Tracks capability trends over time. Detects regressions and breakthroughs in quantum coding ability.',
    color: '#00ff88',
    connections: ['Orchestrator'],
  },
  {
    name: 'Replication Agent',
    role: 'Experiment reproduction',
    description: 'Takes a paper + replication plan and writes the full simulation code. Runs VQE, QAOA, error mitigation experiments. Compares results against published data. Flags discrepancies.',
    color: '#ff8c42',
    connections: ['Orchestrator'],
  },
  {
    name: 'Circuit Optimizer',
    role: 'Hardware-aware compilation',
    description: 'Optimizes circuits for specific Quantum Inspire backends. Tests transpilation strategies. Runs on real hardware via QI SDK. Reports fidelity vs gate count tradeoffs.',
    color: '#ff6b9d',
    connections: ['Orchestrator'],
  },
  {
    name: 'Results Dashboard',
    role: 'Visualization & reporting',
    description: 'Auto-generates plots, tables, and summaries from experiment results. Updates this website. Produces weekly research digests.',
    color: '#94a3b8',
    connections: ['Orchestrator'],
  },
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
          <a href="#research" className="hover:text-[#00d4ff] transition-colors">Research</a>
          <a href="#experiments" className="hover:text-[#00ff88] transition-colors">Experiments</a>
          <a href="#agents" className="hover:text-[#8b5cf6] transition-colors">Agents</a>
          <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
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
        <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-10">
          An experimental research program at{' '}
          <span className="text-white font-medium">TU Delft</span> exploring whether
          generative AI can meaningfully speed up quantum computing research — from
          writing circuits to replicating papers to optimizing hardware runs.
        </p>
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
              style={{
                borderColor: `${link.color}30`,
                color: link.color,
              }}
            >
              {link.label} &rarr;
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function ResearchContext() {
  return (
    <section id="research" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#8b5cf6] mb-8">
          Research Context
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">The Hypothesis</h3>
            <p className="text-gray-400 leading-relaxed">
              Frontier LLMs already write working quantum circuits and can reason about
              quantum algorithms. If we build the right infrastructure — automated benchmarking,
              paper replication pipelines, hardware-aware optimization — AI agents could
              continuously produce useful quantum computing research with minimal human oversight.
            </p>
            <p className="text-gray-400 leading-relaxed">
              This project tests that hypothesis using{' '}
              <span className="text-[#00d4ff]">Quantum Inspire</span> hardware at TU Delft,
              open-source quantum SDKs, and frontier AI models.
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
                'Where do AI agents fail — and what does that tell us about quantum complexity?',
              ].map((q, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-[#00d4ff] font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Infrastructure stack */}
        <div className="mt-16 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Technology Stack
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'Quantum Inspire', desc: 'Spin-qubit hardware (Starmon-7, Tuna-5/9)', color: '#00d4ff' },
              { name: 'Qiskit 2.1', desc: 'Circuit design & simulation', color: '#8b5cf6' },
              { name: 'PennyLane', desc: 'Variational algorithms & autodiff', color: '#00ff88' },
              { name: 'OpenSquirrel', desc: 'cQASM 3.0 compilation', color: '#ff8c42' },
              { name: 'Claude / Gemini / GPT', desc: 'Frontier LLM backends', color: '#ff6b9d' },
              { name: 'Qiskit HumanEval', desc: '151-task quantum coding benchmark', color: '#94a3b8' },
              { name: 'Qiskit Aer', desc: 'Noise-aware simulation', color: '#00d4ff' },
              { name: 'QI SDK v3', desc: 'Remote hardware submission', color: '#8b5cf6' },
            ].map((tech) => (
              <div key={tech.name} className="space-y-1">
                <div className="text-sm font-medium" style={{ color: tech.color }}>{tech.name}</div>
                <div className="text-xs text-gray-500">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ExperimentCard({ experiment }: { experiment: typeof experiments[0] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{experiment.category}</span>
          <StatusBadge status={experiment.status} />
        </div>
        <span className="text-gray-600 text-xs font-mono">{expanded ? '−' : '+'}</span>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">{experiment.title}</h3>
      <p className="text-sm text-[#00d4ff] font-medium mb-3 italic">&ldquo;{experiment.question}&rdquo;</p>
      <p className="text-sm text-gray-400 leading-relaxed">{experiment.description}</p>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
          {experiment.findings.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#00ff88] mb-2">Findings</h4>
              <ul className="space-y-1.5">
                {experiment.findings.map((f, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-[#00ff88]">&bull;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1.5">Models</h4>
              <div className="flex flex-wrap gap-1.5">
                {experiment.models.map((m) => (
                  <span key={m} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1.5">Stack</h4>
              <div className="flex flex-wrap gap-1.5">
                {experiment.techStack.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300">{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">Primary Metric</h4>
            <span className="text-sm text-white font-mono">{experiment.metric}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Experiments() {
  return (
    <section id="experiments" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-3">
              Experiment Catalog
            </h2>
            <p className="text-gray-400 text-sm">
              {experiments.filter(e => e.status === 'active').length} running, {' '}
              {experiments.filter(e => e.status === 'complete').length} complete, {' '}
              {experiments.filter(e => e.status === 'planned').length} planned
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      </div>
    </section>
  )
}

function AgentArchitecture() {
  return (
    <section id="agents" className="py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#ff8c42] mb-3">
          Agent-Based Research Infrastructure
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-2xl">
          A system of specialized AI agents that continuously run experiments,
          analyze results, and propose new research directions — with human oversight
          at key decision points.
        </p>

        {/* Architecture diagram */}
        <div className="relative mb-12">
          {/* Orchestrator in center */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="px-6 py-4 rounded-xl border-2 text-center"
              style={{ borderColor: '#00d4ff40', background: '#00d4ff08' }}
            >
              <div className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: '#00d4ff' }}>
                Orchestrator
              </div>
              <div className="text-xs text-gray-400">Central coordinator & decision engine</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-[#00d4ff30] to-transparent" />
          </div>

          {/* Agent grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentArchitecture.filter(a => a.name !== 'Orchestrator').map((agent) => (
              <div
                key={agent.name}
                className="p-5 rounded-xl border transition-all hover:scale-[1.02]"
                style={{
                  borderColor: `${agent.color}20`,
                  background: `${agent.color}05`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                  <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: agent.color }}>
                  {agent.role}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline visualization */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Continuous Research Pipeline
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {[
              { label: 'arxiv scan', color: '#8b5cf6' },
              { label: 'paper triage', color: '#8b5cf6' },
              { label: 'replication plan', color: '#ff8c42' },
              { label: 'code generation', color: '#ff8c42' },
              { label: 'simulation', color: '#00ff88' },
              { label: 'hardware run', color: '#00d4ff' },
              { label: 'analysis', color: '#ff6b9d' },
              { label: 'report', color: '#94a3b8' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="px-3 py-1.5 rounded border"
                  style={{ borderColor: `${step.color}30`, color: step.color }}
                >
                  {step.label}
                </span>
                {i < 7 && <span className="text-gray-600">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-500 font-mono">
          TU Delft / QuTech / Quantum Inspire &mdash; 2025
        </div>
        <div className="flex gap-4 text-xs text-gray-500 font-mono">
          <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Source code
          </a>
          <a href="https://www.quantum-inspire.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">
            Quantum Inspire
          </a>
          <a href="https://qutech.nl" target="_blank" rel="noopener noreferrer" className="hover:text-[#8b5cf6] transition-colors">
            QuTech
          </a>
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
      <ResearchContext />
      <Experiments />
      <AgentArchitecture />
      <Footer />
    </>
  )
}
