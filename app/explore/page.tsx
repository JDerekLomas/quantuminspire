import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'Explore — See, Hear, and Interact with Quantum Computing',
  description: 'Scroll-driven tours, sonification, interactive simulations, and physics modules — all built by AI.',
}

/* ────────────────────────── data ────────────────────────── */

const experiences = [
  {
    href: '/see',
    title: 'See',
    desc: 'What does a qubit look like? Scroll through the physical hardware — chip, junction, drive line, gates, entanglement.',
    color: '#00d4ff',
    tag: 'Scroll-driven tour',
  },
  {
    href: '/listen',
    title: 'Listen',
    desc: 'The same story told through sound. Nine acts: one qubit, nine qubits, entanglement, measurement, decoherence.',
    color: '#e879f9',
    tag: '9-act sonification',
  },
]

const deepDives = [
  { href: '/resonance', title: 'Resonance', desc: 'Energy levels, Lorentzian peaks, avoided crossings, and hardware frequencies.', color: '#f59e0b' },
  { href: '/entanglement', title: 'Entanglement', desc: 'Bell states, GHZ/W comparison, separability slider, real hardware fidelity.', color: '#ff6b9d' },
  { href: '/noise', title: 'Noise Channels', desc: 'T\u2081/T\u2082 decay, dephasing vs depolarizing, Bloch sphere trajectories, error budgets.', color: '#ff6b9d' },
  { href: '/error-mitigation', title: 'Error Mitigation', desc: '15 techniques ranked on real hardware. TREX 119x, ZNE fails, and why.', color: '#00ff88' },
  { href: '/how-it-works', title: 'How It Works', desc: 'Scroll-driven explainer with ambient audio. Three acts: one qubit, two qubits, an orchestra.', color: '#00d4ff' },
  { href: '/how-qubits-work', title: 'How Qubits Work', desc: '6-part physics series: spectroscopy, coherence, coupling, gates, measurement, scaling.', color: '#8b5cf6' },
]

const learningPaths = [
  {
    title: 'First Encounter',
    desc: 'Never touched quantum? Start here.',
    color: '#00d4ff',
    steps: [
      { href: '/see', label: 'See a qubit' },
      { href: '/bloch-sphere', label: 'Play with the Bloch sphere' },
      { href: '/measurement', label: 'Measure it' },
      { href: '/entanglement', label: 'Entangle two' },
    ],
  },
  {
    title: 'The Physics',
    desc: 'Understand the hardware.',
    color: '#8b5cf6',
    steps: [
      { href: '/resonance', label: 'Why qubits respond to microwaves' },
      { href: '/how-qubits-work/coherence', label: 'Why they forget (T\u2081/T\u2082)' },
      { href: '/noise', label: 'Three noise channels' },
      { href: '/how-qubits-work/gates', label: 'How gates happen' },
    ],
  },
  {
    title: 'Run Real Experiments',
    desc: 'From simulation to hardware.',
    color: '#00ff88',
    steps: [
      { href: '/hamiltonians', label: 'Build a Hamiltonian' },
      { href: '/ansatz', label: 'Design a circuit' },
      { href: '/error-mitigation', label: 'Pick a mitigation strategy' },
      { href: '/experiments', label: 'See the results' },
    ],
  },
]

const tools = [
  { href: '/bloch-sphere', title: 'Bloch Sphere', desc: '3D state space, 8 gates, rotation controls', color: '#00d4ff' },
  { href: '/state-vector', title: 'State Vector', desc: '1–6 qubits, amplitude bars, phase coloring', color: '#8b5cf6' },
  { href: '/qsphere', title: 'Q-Sphere', desc: 'Multi-qubit states on a sphere, Hamming weight', color: '#e879f9' },
  { href: '/measurement', title: 'Measurement Lab', desc: 'Born rule convergence in real time', color: '#00ff88' },
  { href: '/entanglement', title: 'Entanglement', desc: 'Bell states, GHZ/W, hardware fidelity', color: '#ff6b9d' },
  { href: '/teleportation', title: 'Teleportation', desc: 'Step-through protocol with Bloch sphere', color: '#06b6d4' },
  { href: '/grovers', title: "Grover's Search", desc: 'Oracle + diffusion, amplitude amplification', color: '#ff8c42' },
  { href: '/interference', title: 'Multi-Slit', desc: 'N-slit diffraction, photon accumulation', color: '#14b8a6' },
  { href: '/rabi', title: 'Rabi Oscillations', desc: 'Driving field, detuning, T2 dephasing', color: '#eab308' },
  { href: '/ansatz', title: 'Ansatz Builder', desc: 'VQE circuit construction', color: '#94a3b8' },
  { href: '/hamiltonians', title: 'Hamiltonians', desc: 'Molecular Hamiltonian explorer', color: '#94a3b8' },
  { href: '/sonification', title: 'Sonification Lab', desc: 'Play real experiment data as sound', color: '#e879f9' },
]

const reference = [
  { href: '/learn', title: 'Glossary', desc: '40+ quantum computing terms with links to interactive tools', color: '#8b5cf6' },
  { href: '/gallery', title: 'Gallery', desc: 'Curated collection of the best quantum visualizations across the web', color: '#f59e0b' },
]

/* ────────────────────────── page ────────────────────────── */

export default function ExplorePage() {
  return (
    <main className="min-h-screen text-gray-200">
      <Nav section="explore" />

      {/* Hero */}
      <section className="border-b border-white/5 px-6 pt-28 pb-12">
        <div className="max-w-5xl mx-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#8b5cf6] mb-4 block">
            Explore
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6 leading-[0.95]">
            AI built all of this.
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            Scroll-driven tours, sonification, interactive simulations, and physics modules.
            Every visualization, every animation, every sound — created by AI agents through
            natural language.
          </p>
        </div>
      </section>

      {/* Start here: See & Listen */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Start Here
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {experiences.map((exp) => (
              <Link
                key={exp.href}
                href={exp.href}
                className="group relative p-8 rounded-2xl border overflow-hidden hover:scale-[1.01] transition-all"
                style={{ borderColor: `${exp.color}30`, background: `${exp.color}06` }}
              >
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3 block"
                  style={{ color: exp.color }}
                >
                  {exp.tag}
                </span>
                <h3 className="text-3xl font-black text-white mb-3 group-hover:underline">
                  {exp.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {exp.desc}
                </p>
                <span
                  className="inline-block mt-4 text-xs font-mono font-bold transition-transform group-hover:translate-x-1"
                  style={{ color: exp.color }}
                >
                  Open &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Go Deeper */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Go Deeper
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deepDives.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: d.color }} />
                <h3 className="text-white font-bold text-sm mb-2 group-hover:underline">
                  {d.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">{d.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Learning Paths
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {learningPaths.map((path) => (
              <div
                key={path.title}
                className="p-5 rounded-xl border"
                style={{ borderColor: `${path.color}20`, background: `${path.color}03` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: path.color }} />
                  <h3 className="text-white font-bold text-sm">{path.title}</h3>
                </div>
                <p className="text-gray-500 text-xs mb-4">{path.desc}</p>
                <ol className="space-y-2">
                  {path.steps.map((step, i) => (
                    <li key={step.href}>
                      <Link
                        href={step.href}
                        className="flex items-center gap-2 group hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                          style={{ backgroundColor: `${path.color}15`, color: path.color }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                          {step.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Tools */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-2">
            Interactive Tools
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            {tools.length} interactive tools. Every number computed live, nothing mocked.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tools.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <h3 className="text-white text-sm font-bold mb-1 group-hover:underline">
                  {t.title}
                </h3>
                <p className="text-gray-600 text-[10px] leading-relaxed">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reference */}
      <section className="border-b border-white/5 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">
            Reference
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {reference.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group flex items-start gap-3 p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: r.color }} />
                <div>
                  <span className="text-white text-sm font-bold group-hover:underline">{r.title}</span>
                  <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3 text-[10px] text-gray-600 font-mono text-center">
          <div>
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech &mdash; 2026
          </div>
        </div>
      </footer>
    </main>
  )
}
