'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import ScrollReveal from '@/components/ScrollReveal'

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center px-6 pt-24 pb-12">
      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-8 block">
        TU Delft / QuTech — Open Research Initiative
      </span>
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight mb-8 text-center">
        <span className="text-white">How might </span>
        <span className="gradient-text">AI</span>
        <br />
        <span className="text-white">accelerate </span>
        <span className="gradient-text-green">quantum</span>
        <span className="text-white">?</span>
      </h1>
      <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed text-center mb-6">
        AI agents run real quantum experiments on real hardware, through natural language.
      </p>
      <div className="flex items-center gap-4 mb-8">
        <a
          href="/haiqu-paper.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-lg text-sm font-mono font-bold bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all"
        >
          Read the paper (PDF)
        </a>
      </div>
      <p className="text-sm font-mono text-gray-400 tracking-wide text-center mb-12">
        <span className="text-gray-400">h</span>
        <span className="gradient-text font-bold">AI</span>
        <span className="text-gray-400">qu</span>
        <span className="hidden sm:inline text-gray-500 mx-2">&mdash;</span>
        <br className="sm:hidden" />
        <span className="text-gray-400">AI as the interface between </span>
        <span className="text-gray-300">humans</span>
        <span className="text-gray-400"> &amp; </span>
        <span className="text-gray-300">quantum</span>
      </p>
      <div className="text-gray-400 animate-bounce text-sm font-mono" aria-hidden="true">
        &#8595; scroll
      </div>
    </section>
  )
}

// ─── Section 1: Vibecoding ──────────────────────────────────────────────────

function VibecodingSection() {
  return (
    <section className="min-h-screen flex items-center px-6 py-24 border-l-2 border-[#00d4ff]/20 ml-4 sm:ml-8 lg:ml-0 lg:border-l-0">
      <div className="max-w-4xl mx-auto w-full">
        <ScrollReveal>
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-4 block">
            The Question
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Quantum <span className="text-[#00d4ff]">vibecoding?</span>
          </h2>
          <p className="text-gray-400 max-w-xl mb-4">
            Can AI actually support quantum computing work? We tested this by connecting
            Claude Code to real quantum hardware through MCP servers. Describe the experiment
            in natural language. The agent derives Hamiltonians, writes circuits, submits to
            real chips, and analyzes the results.
          </p>
          <p className="text-sm text-gray-500 font-mono mb-12">
            445 sessions. 349 prompts. 3 quantum chips. 0 lines of quantum code by hand.
          </p>
        </ScrollReveal>

        {/* One real prompt */}
        <ScrollReveal delay={0.1}>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5 sm:p-6 mb-12">
            <p className="font-mono text-sm text-gray-300 leading-relaxed mb-3">
              &gt; Replicate Sagastizabal 2019 on IBM Torino. Try every error mitigation strategy and rank them.
            </p>
            <p className="text-sm text-[#00ff88] leading-relaxed pl-4 border-l border-[#00ff88]/30">
              TREX achieves 0.22 kcal/mol — 119x improvement over raw. Adding more mitigation makes it worse.
            </p>
          </div>
        </ScrollReveal>

        {/* Entry points as cards */}
        <ScrollReveal delay={0.3}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/quantum-vibecoding"
              className="rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/[0.03] p-5 hover:bg-[#00d4ff]/[0.06] hover:border-[#00d4ff]/40 transition-all group"
            >
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#00d4ff] transition-colors">The workflow</h3>
              <p className="text-xs text-gray-500">5 prompt patterns that emerged from 445 sessions</p>
            </Link>
            <Link
              href="/methodology"
              className="rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/[0.03] p-5 hover:bg-[#00d4ff]/[0.06] hover:border-[#00d4ff]/40 transition-all group"
            >
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#00d4ff] transition-colors">349 prompts, annotated</h3>
              <p className="text-xs text-gray-500">Every prompt and what it discovered</p>
            </Link>
            <Link
              href="/get-started"
              className="rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/[0.03] p-5 hover:bg-[#00d4ff]/[0.06] hover:border-[#00d4ff]/40 transition-all group"
            >
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#00d4ff] transition-colors">Try it yourself</h3>
              <p className="text-xs text-gray-500">Claude Code + MCP servers for 3 quantum backends</p>
            </Link>
            <Link
              href="/get-started#silent-bugs"
              className="rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/[0.03] p-5 hover:bg-[#00d4ff]/[0.06] hover:border-[#00d4ff]/40 transition-all group"
            >
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#00d4ff] transition-colors">8 silent bugs</h3>
              <p className="text-xs text-gray-500">Traps that produce wrong results without errors</p>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ─── Section 2: Science ─────────────────────────────────────────────────────

function EvalChart() {
  // Qiskit HumanEval benchmark data points
  const data = [
    { label: 'Granite-8b', date: 'Sep 2024', score: 46.5, color: '#666' },
    { label: 'QSpark', date: 'Mar 2025', score: 56.3, color: '#666' },
    { label: 'Claude 3.5\nzero-shot', date: 'Jun 2025', score: 58.9, color: '#9ca3af' },
    { label: 'Claude 4.6\n+ RAG', date: 'Jan 2026', score: 70.9, color: '#ff8c42' },
    { label: 'Ensemble\n(5 models)', date: 'Jan 2026', score: 79.5, color: '#ff8c42' },
  ]

  const W = 600
  const H = 280
  const padL = 12
  const padR = 12
  const padT = 24
  const padB = 48

  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const xStep = chartW / (data.length - 1)
  const yMin = 30
  const yMax = 90

  const toX = (i: number) => padL + i * xStep
  const toY = (score: number) => padT + chartH - ((score - yMin) / (yMax - yMin)) * chartH

  // Grid lines
  const gridLines = [40, 50, 60, 70, 80]

  return (
    <div className="rounded-xl border border-[#ff8c42]/20 bg-[#ff8c42]/[0.03] p-6 sm:p-8">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#ff8c42]/80 mb-4">
        Qiskit HumanEval Benchmark — 151 tasks — pass@1
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart showing Qiskit HumanEval benchmark scores over time. Granite-8b: 46.5%, QSpark: 56.3%, Claude 3.5 zero-shot: 58.9%, Claude 4.6 + RAG: 70.9%, Ensemble: 79.5%.">
        {/* Y-axis grid */}
        {gridLines.map(v => (
          <g key={v}>
            <line
              x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
            <text x={padL - 4} y={toY(v) + 3} textAnchor="end" fill="#666" fontSize="9" fontFamily="monospace">
              {v}%
            </text>
          </g>
        ))}

        {/* Connecting line */}
        <polyline
          points={data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ')}
          fill="none" stroke="rgba(255,140,66,0.3)" strokeWidth="2"
        />

        {/* Data points and labels */}
        {data.map((d, i) => (
          <g key={d.label}>
            <circle cx={toX(i)} cy={toY(d.score)} r={i >= 3 ? 5 : 3.5} fill={d.color} />
            <text
              x={toX(i)} y={toY(d.score) - 12}
              textAnchor="middle" fill={d.color} fontSize="12" fontWeight="900" fontFamily="monospace"
            >
              {d.score}%
            </text>
            {/* Date label */}
            <text
              x={toX(i)} y={H - padB + 16}
              textAnchor="middle" fill="#666" fontSize="8" fontFamily="monospace"
            >
              {d.date}
            </text>
            {/* Model label */}
            {d.label.split('\n').map((line, li) => (
              <text
                key={li}
                x={toX(i)} y={H - padB + 28 + li * 10}
                textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace"
              >
                {line}
              </text>
            ))}
          </g>
        ))}
      </svg>
      <p className="text-xs text-gray-400 leading-relaxed mt-4">
        General-purpose frontier models beat every fine-tuned quantum specialist zero-shot.
        Dynamic RAG adds +14%. Ensemble ceiling: 79.5%.
      </p>
    </div>
  )
}

function ScienceSection() {
  return (
    <section className="min-h-screen flex items-center px-6 py-24 border-l-2 border-[#00ff88]/20 ml-4 sm:ml-8 lg:ml-0 lg:border-l-0">
      <div className="max-w-4xl mx-auto w-full">
        <ScrollReveal>
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-4 block">
            The Evidence
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            And it actually <span className="text-[#00ff88]">works</span>
          </h2>
          <p className="text-gray-400 max-w-xl mb-16">
            AI agents replicated 6 landmark quantum papers on real hardware and set a new state-of-the-art on quantum code generation.
          </p>
        </ScrollReveal>

        {/* 93% claims pass — the one stat */}
        <ScrollReveal delay={0.1}>
          <div className="mb-12">
            <div className="mb-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-[#00ff88]">93%</span>
              <span className="text-sm font-mono text-gray-400 ml-3">claims pass</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              27 claims tested across 6 landmark papers, 3 quantum chips.
            </p>
          </div>
        </ScrollReveal>

        {/* Eval chart */}
        <ScrollReveal delay={0.3}>
          <EvalChart />
        </ScrollReveal>

        <ScrollReveal delay={0.5}>
          <div className="mt-16 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Link
              href="/replications"
              className="text-sm font-mono font-bold text-[#00ff88] hover:text-white transition-colors"
            >
              See the replications &rarr;
            </Link>
            <a
              href="/haiqu-paper.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono font-bold text-gray-500 hover:text-white transition-colors"
            >
              Download the paper (PDF) &rarr;
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ─── Section 3: Education ───────────────────────────────────────────────────

function EducationSection() {
  const experiences = [
    {
      title: 'See',
      description: 'A scroll-driven tour through a quantum chip',
      href: '/see',
    },
    {
      title: 'Listen',
      description: 'Quantum states as sound',
      href: '/listen',
    },
  ]

  const visualizations = [
    { title: 'Bloch Sphere', href: '/bloch-sphere', desc: '3D single-qubit state space' },
    { title: 'State Vector', href: '/state-vector', desc: 'Multi-qubit amplitudes & phases' },
    { title: 'Q-Sphere', href: '/qsphere', desc: 'States mapped to a sphere' },
    { title: 'Entanglement', href: '/entanglement', desc: 'Bell states & correlations' },
    { title: 'Measurement', href: '/measurement', desc: 'Born rule in real time' },
    { title: 'Interference', href: '/interference', desc: 'N-slit quantum patterns' },
  ]

  return (
    <section className="min-h-screen flex items-center px-6 py-24 border-l-2 border-[#8b5cf6]/20 ml-4 sm:ml-8 lg:ml-0 lg:border-l-0">
      <div className="max-w-4xl mx-auto w-full">
        <ScrollReveal>
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#8b5cf6] mb-4 block">
            Learning &amp; Education
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Making quantum <span className="text-[#8b5cf6]">intuitive</span>
          </h2>
          <p className="text-gray-400 max-w-xl mb-16">
            AI-generated visualizations, simulations, and interactive tools that build new mental models for quantum computing — designed for learners, not just experts.
          </p>
        </ScrollReveal>

        {/* Featured experiences */}
        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {experiences.map((exp, i) => (
            <ScrollReveal key={exp.title} delay={0.1 + i * 0.15}>
              <Link
                href={exp.href}
                className="block rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/[0.03] p-6 sm:p-8 hover:bg-[#8b5cf6]/[0.06] hover:border-[#8b5cf6]/40 transition-all group"
              >
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#8b5cf6] transition-colors">
                  {exp.title}
                </h3>
                <p className="text-sm text-gray-400">{exp.description}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        {/* Interactive visualizations grid */}
        <ScrollReveal delay={0.3}>
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">
            Interactive Visualizations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
            {visualizations.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:bg-[#8b5cf6]/[0.04] hover:border-[#8b5cf6]/20 transition-all group"
              >
                <div className="text-sm font-bold text-white group-hover:text-[#8b5cf6] transition-colors">{v.title}</div>
                <div className="text-[10px] text-gray-500">{v.desc}</div>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        {/* Links */}
        <ScrollReveal delay={0.5}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Link
              href="/explore"
              className="text-sm font-mono font-bold text-[#8b5cf6] hover:text-white transition-colors"
            >
              All 20+ interactives &rarr;
            </Link>
            <Link
              href="/how-qubits-work"
              className="text-sm font-mono font-bold text-gray-500 hover:text-white transition-colors"
            >
              6-part physics series &rarr;
            </Link>
            <Link
              href="/wp44"
              className="text-sm font-mono font-bold text-gray-500 hover:text-white transition-colors"
            >
              Research context (WP4.4) &rarr;
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function HomeFooter() {
  const bibtex = `@misc{lomas2026haiqu,
  author = {Lomas, J. Derek},
  title  = {haiqu: AI-Accelerated Quantum Science},
  year   = {2026},
  url    = {https://haiqu.org},
  note   = {Open research initiative, TU Delft / QuTech.
            Source: https://github.com/JDerekLomas/quantuminspire}
}`

  return (
    <footer id="cite" className="py-12 px-6 border-t border-white/5">
      <div className="max-w-4xl mx-auto">
        {/* Top row: identity + links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 text-sm font-mono">
            <a href="https://dereklomas.me" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
              J. Derek Lomas
            </a>
            <span className="text-gray-500" aria-hidden="true">&mdash;</span>
            <span className="text-gray-400">TU Delft / QuTech</span>
            <a href="https://orcid.org/0000-0003-2329-7831" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#a6ce39] text-xs transition-colors">
              ORCID<span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 font-mono">
            <a href="/haiqu-paper.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Paper (PDF)
            </a>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://www.quantum-inspire.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">
              Quantum Inspire
            </a>
            <a href="https://qutech.nl" target="_blank" rel="noopener noreferrer" className="hover:text-[#8b5cf6] transition-colors">
              QuTech
            </a>
          </div>
        </div>

        {/* Citation block */}
        <div className="mb-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-3">
            Cite this work
          </h3>
          <pre className="text-[11px] font-mono text-gray-500 bg-white/[0.02] border border-white/5 rounded-lg p-4 overflow-x-auto leading-relaxed">
            {bibtex}
          </pre>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-2 text-[10px] text-gray-400 font-mono text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:j.d.lomas@tudelft.nl" className="hover:text-[#00d4ff] transition-colors">
              j.d.lomas@tudelft.nl
            </a>
            <span className="text-gray-500" aria-hidden="true">&middot;</span>
            <span className="text-gray-300">h</span>AI<span className="text-gray-300">qu</span> &mdash; 2026
          </div>
          <div>
            Built with AI agents. This entire website, its quantum simulations, and the research
            infrastructure were created through human-AI collaboration using Claude Code.
          </div>
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
      <main id="main-content">
        <Hero />
        <VibecodingSection />
        <ScienceSection />
        <EducationSection />
      </main>
      <HomeFooter />
    </>
  )
}
