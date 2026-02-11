'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'

// ─── Pillar Data ──────────────────────────────────────────────────────────────

const researchHighlights = [
  { href: '/replications', label: 'Paper Replications', detail: '6 papers, 27 claims, 93% pass' },
  { href: '/experiments', label: 'Live Experiments', detail: '100+ runs across 3 chips' },
  { href: '/platforms', label: 'Platform Comparison', detail: 'Tuna-9 vs Garnet vs Torino' },
  { href: '/methodology', label: 'Methodology', detail: 'Process, prompts & sessions' },
  { href: '/blog', label: 'Research Blog', detail: '14 posts documenting discoveries' },
]

const learnHighlights = [
  { href: '/bloch-sphere', label: 'Bloch Sphere', detail: '3D state exploration' },
  { href: '/measurement', label: 'Measurement Lab', detail: 'Born rule in real time' },
  { href: '/entanglement', label: 'Entanglement Lab', detail: 'Bell states & density matrices' },
  { href: '/how-qubits-work', label: 'How Qubits Work', detail: '6-part physics series' },
  { href: '/listen', label: 'Listen', detail: 'Quantum states as sound' },
  { href: '/learn', label: 'All tools & glossary', detail: '14 interactives, 40+ terms' },
]

const vibeCodingHighlights = [
  { href: '/get-started', label: 'Setup Guide', detail: 'Claude Code + 3 quantum backends' },
  { href: '/get-started#silent-bugs', label: '8 Silent Bugs', detail: 'Traps that ruin results silently' },
  { href: '/get-started#prompts', label: 'Prompt Archaeology', detail: '349 prompts from 445 sessions' },
  { href: '/wp44', label: 'Research Program', detail: 'WP4.4 at TU Delft' },
]

// ─── Components ───────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-28 pb-12 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00d4ff] mb-6 block">
          TU Delft / QuTech — Open Research Initiative
        </span>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight mb-8">
          <span className="text-white">How might </span>
          <span className="gradient-text">AI</span>
          <br />
          <span className="text-white">accelerate </span>
          <span className="gradient-text-green">quantum</span>
          <span className="text-white">?</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-4">
          AI agents autonomously replicate quantum papers on real hardware,
          build interactive tools that make quantum accessible, and prove that
          anyone can do quantum science through natural language.
        </p>
        <p className="text-sm font-mono text-gray-600 tracking-wide">
          <span className="text-gray-500">h</span>
          <span className="gradient-text font-bold">AI</span>
          <span className="text-gray-500">qu</span>
          <span className="text-gray-700 mx-2">&mdash;</span>
          <span className="text-gray-500">AI as the interface between </span>
          <span className="text-gray-400">humans</span>
          <span className="text-gray-500"> and </span>
          <span className="text-gray-400">quantum</span>
        </p>
      </div>
    </section>
  )
}

function PillarCard({
  title,
  subtitle,
  description,
  color,
  stats,
  highlights,
  cta,
  ctaHref,
}: {
  title: string
  subtitle: string
  description: string
  color: string
  stats: { value: string; label: string }[]
  highlights: { href: string; label: string; detail: string }[]
  cta: string
  ctaHref: string
}) {
  return (
    <div
      className="rounded-2xl border p-6 sm:p-8 flex flex-col"
      style={{ borderColor: `${color}20`, background: `${color}03` }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color }}>
            {subtitle}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">{title}</h2>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 mb-6">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xl font-black font-mono" style={{ color }}>{s.value}</div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="flex-1 space-y-1 mb-6">
        {highlights.map((h) => (
          <Link
            key={h.href}
            href={h.href}
            className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{h.label}</span>
            <span className="text-[10px] text-gray-600 font-mono">{h.detail}</span>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="block text-center text-sm font-mono font-bold py-3 rounded-lg border transition-all hover:scale-[1.02]"
        style={{ borderColor: `${color}40`, color, background: `${color}08` }}
      >
        {cta} &rarr;
      </Link>
    </div>
  )
}

function Pillars() {
  return (
    <section className="pb-16 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
        <PillarCard
          title="The Evidence"
          subtitle="Research"
          description="AI agents replicate landmark quantum papers on real hardware. Every claim tested, every circuit run, every result recorded."
          color="#00ff88"
          stats={[
            { value: '6', label: 'papers' },
            { value: '27', label: 'claims' },
            { value: '3', label: 'chips' },
          ]}
          highlights={researchHighlights}
          cta="See the research"
          ctaHref="/replications"
        />
        <PillarCard
          title="The Tools"
          subtitle="Learn"
          description="14 interactive simulations built by AI — Bloch spheres, entanglement labs, sonification. Every number computed live, nothing mocked."
          color="#8b5cf6"
          stats={[
            { value: '14', label: 'interactives' },
            { value: '6', label: 'physics modules' },
            { value: '40+', label: 'concepts' },
          ]}
          highlights={learnHighlights}
          cta="Start exploring"
          ctaHref="/learn"
        />
        <PillarCard
          title="The Method"
          subtitle="Quantum VibeCoding"
          description="Describe what you want in natural language. AI writes the circuits, submits to hardware, analyzes the results. You can do this too."
          color="#00d4ff"
          stats={[
            { value: '3', label: 'platforms' },
            { value: '349', label: 'prompts' },
            { value: '8', label: 'pitfalls' },
          ]}
          highlights={vibeCodingHighlights}
          cta="Try it yourself"
          ctaHref="/get-started"
        />
      </div>
    </section>
  )
}

function KeyFindings() {
  const findings = [
    {
      stat: '0.22',
      unit: 'kcal/mol',
      title: 'Chemical accuracy on real hardware',
      detail: 'TREX error mitigation on IBM Torino achieves 119x noise reduction. The right mitigation strategy matters more than the hardware.',
      color: '#00ff88',
    },
    {
      stat: '93%',
      unit: 'claims pass',
      title: '6 papers replicated across 3 chips',
      detail: 'Emulators pass 100%. Hardware exposes the noise floor. The gap between published and reproduced is the finding.',
      color: '#ff8c42',
    },
    {
      stat: '9q > 20q',
      unit: '',
      title: 'Topology beats scale',
      detail: 'Tuna-9 (9 qubits) beats IQM Garnet (20q) on GHZ-5: 83.8% vs 81.8%. Knowing your chip matters more than qubit count.',
      color: '#8b5cf6',
    },
  ]

  return (
    <section className="py-12 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6 text-center">
          What We Found
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {findings.map((f) => (
            <div key={f.title} className="text-center">
              <div className="text-3xl font-black font-mono mb-1" style={{ color: f.color }}>
                {f.stat}
                {f.unit && <span className="text-sm font-normal text-gray-500 ml-1">{f.unit}</span>}
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-xs text-gray-500 font-mono">
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 font-mono">
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
        <div className="flex flex-col items-center gap-2 text-[10px] text-gray-600 font-mono text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:j.d.lomas@tudelft.nl" className="hover:text-[#00d4ff] transition-colors">
              j.d.lomas@tudelft.nl
            </a>
            <span className="text-gray-700">&middot;</span>
            <a href="https://dereklomas.me" target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">
              dereklomas.me
            </a>
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
      <Hero />
      <Pillars />
      <KeyFindings />
      <Footer />
    </>
  )
}
