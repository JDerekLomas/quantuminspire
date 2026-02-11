import { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { CATEGORIES, GLOSSARY } from '@/content/learn/glossary'

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find(c => c.id === category)
  if (!cat) return null
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
      style={{ color: cat.color, backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}25` }}
    >
      {cat.label}
    </span>
  )
}

export default function LearnPage() {
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    entries: GLOSSARY.filter(e => e.category === cat.id),
  }))

  const paths = [
    {
      title: 'How Qubits Work',
      href: '/how-qubits-work',
      desc: '6-part series: from spectroscopy to scaling. The physics of superconducting qubits, built for developers.',
      color: '#00d4ff',
      items: ['Spectroscopy', 'Coherence (T1/T2)', 'Qubit coupling', 'Pulse gates', 'Measurement', 'Scaling'],
    },
    {
      title: 'Interactive Labs',
      href: '#tools',
      desc: '20 hands-on simulations. Every number computed live, nothing mocked. Drag, click, listen.',
      color: '#8b5cf6',
      items: ['Bloch Sphere', 'Entanglement', 'Measurement', 'Interference', 'Grover\'s', 'Teleportation'],
    },
    {
      title: 'How It Works',
      href: '/how-it-works',
      desc: 'Scroll-driven narrative: from microwave pulses to quantum advantage in one page.',
      color: '#00ff88',
      items: ['Resonance', 'Superposition', 'Gates', 'Entanglement', 'Noise', 'Advantage'],
    },
    {
      title: 'Sonification',
      href: '/listen',
      desc: 'Hear quantum states. Compare clean emulator output to noisy hardware measurements.',
      color: '#ff8c42',
      items: ['Circuit sound', 'Noise as sound', 'Hardware comparison'],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav section="Learn" />

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hub hero */}
        <div className="mb-16">
          <span className="font-mono text-xs text-[#8b5cf6] tracking-[0.2em] uppercase">Learn</span>
          <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4 tracking-tight leading-[0.95]">
            Quantum made<br />
            <span className="gradient-text-pink">tangible.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            20 interactive simulations, a 6-part physics series, and a 40-term glossary —
            all built by AI, all running real math. No prerequisites. Click anything.
          </p>

          {/* Learning paths */}
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {paths.map((path) => (
              <Link
                key={path.title}
                href={path.href}
                className="group p-5 rounded-xl border bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
                style={{ borderColor: `${path.color}15` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: path.color }} />
                  <span className="text-white font-bold text-sm group-hover:underline">{path.title}</span>
                </div>
                <p className="text-gray-500 text-xs mb-3">{path.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {path.items.map((item) => (
                    <span
                      key={item}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{ borderColor: `${path.color}20`, color: `${path.color}90` }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          {/* Quick links row */}
          <div className="flex flex-wrap gap-3 mb-12">
            <Link href="/gallery" className="text-xs font-mono px-3 py-1 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 hover:bg-[#8b5cf6]/20 transition-colors">
              Gallery &rarr;
            </Link>
            <Link href="/see" className="text-xs font-mono px-3 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 hover:bg-[#00d4ff]/20 transition-colors">
              /see &rarr;
            </Link>
            <Link href="/resonance" className="text-xs font-mono px-3 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/20 transition-colors">
              Resonance &rarr;
            </Link>
            <Link href="/hamiltonians" className="text-xs font-mono px-3 py-1 rounded-full bg-[#ff8c42]/10 text-[#ff8c42] border border-[#ff8c42]/20 hover:bg-[#ff8c42]/20 transition-colors">
              Hamiltonians &rarr;
            </Link>
            <Link href="/ansatz" className="text-xs font-mono px-3 py-1 rounded-full bg-[#ff6b9d]/10 text-[#ff6b9d] border border-[#ff6b9d]/20 hover:bg-[#ff6b9d]/20 transition-colors">
              Ansatz Explorer &rarr;
            </Link>
          </div>
        </div>

        {/* Glossary header */}
        <div className="mb-8 pt-8 border-t border-[#1e293b]">
          <h2 className="text-2xl font-bold text-white mb-2">Glossary</h2>
          <p className="text-gray-400 text-sm max-w-2xl">
            40+ terms with links to interactive tools and experiment data.
          </p>
        </div>

        {/* Category jump links */}
        <div className="flex flex-wrap gap-2 mb-12 pb-8 border-b border-[#1e293b]">
          {CATEGORIES.map(cat => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:bg-white/5"
              style={{ borderColor: `${cat.color}30`, color: cat.color }}
            >
              {cat.label}
              <span className="text-gray-600 ml-1.5">
                {GLOSSARY.filter(e => e.category === cat.id).length}
              </span>
            </a>
          ))}
        </div>

        {/* Interactive tools callout */}
        <div id="tools" className="mb-12 p-6 rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5">
          <h2 className="text-white font-semibold mb-3">Interactive Visualizations</h2>
          <p className="text-gray-400 text-sm mb-4">
            Many glossary entries link to hands-on tools where you can explore the concept directly:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Bloch Sphere', href: '/bloch-sphere', desc: 'Single-qubit states & gates' },
              { name: 'State Vectors', href: '/state-vector', desc: 'Multi-qubit amplitudes' },
              { name: 'Q-Sphere', href: '/qsphere', desc: 'Hamming-distance geometry' },
              { name: 'Entanglement', href: '/entanglement', desc: 'Bell, GHZ, W states' },
              { name: 'Measurement', href: '/measurement', desc: 'Born rule & statistics' },
              { name: 'Interference', href: '/interference', desc: 'Wave-particle duality' },
              { name: "Grover's Search", href: '/grovers', desc: 'Amplitude amplification' },
              { name: 'Teleportation', href: '/teleportation', desc: 'Step-by-step protocol' },
              { name: 'Rabi Oscillations', href: '/rabi', desc: 'Qubit dynamics & T2' },
              { name: 'How We Tune a Qubit', href: '/how-qubits-work/spectroscopy', desc: 'Spectroscopy & calibration basics' },
              { name: 'Why Qubits Forget', href: '/how-qubits-work/coherence', desc: 'T1, T2, and linewidth' },
              { name: 'How Qubits Talk', href: '/how-qubits-work/coupling', desc: 'Avoided crossings & dispersive shifts' },
              { name: 'How Gates Happen', href: '/how-qubits-work/gates', desc: 'Pulse shaping & control errors' },
              { name: 'How We Measure', href: '/how-qubits-work/measurement', desc: 'Dispersive readout & fidelity' },
              { name: 'How We Scale', href: '/how-qubits-work/scaling', desc: 'Crowding & routing cost' },
              { name: 'Resonance', href: '/resonance', desc: 'Spectroscopy & avoided crossings' },
              { name: 'Error Mitigation', href: '/error-mitigation', desc: '15 techniques ranked on real hardware' },
              { name: 'Noise Channels', href: '/noise', desc: 'T\u2081/T\u2082, dephasing, depolarizing' },
              { name: 'Hamiltonians', href: '/hamiltonians', desc: 'H\u2082 Pauli decomposition' },
              { name: 'Ansatz Explorer', href: '/ansatz', desc: 'VQE circuit design' },
              { name: 'Sonification', href: '/sonification', desc: 'Quantum states as sound' },
              { name: 'How Qubits Work (Series)', href: '/how-qubits-work', desc: 'Index of physical foundations labs' },
            ].map(tool => (
              <Link
                key={tool.href}
                href={tool.href}
                className="p-3 rounded-lg border border-[#1e293b] bg-[#111827]/30 hover:bg-[#111827]/60 transition-all group"
              >
                <span className="text-white text-sm font-medium group-hover:text-[#8b5cf6] transition-colors">
                  {tool.name}
                </span>
                <span className="block text-gray-500 text-xs mt-0.5">{tool.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Glossary entries by category */}
        {grouped.map(cat => (
          <section key={cat.id} id={cat.id} className="mb-16">
            <div className="flex items-center gap-3 mb-6 sticky top-14 bg-[#0a0a1a] py-3 z-10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <h2 className="text-xl font-bold text-white">{cat.label}</h2>
              <span className="text-gray-600 font-mono text-xs">{cat.entries.length} terms</span>
            </div>

            <div className="space-y-4">
              {cat.entries.map(entry => (
                <div
                  key={entry.term}
                  className="p-5 rounded-xl border border-[#1e293b] bg-[#111827]/20 hover:bg-[#111827]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-white font-semibold">{entry.term}</h3>
                    <div className="flex gap-2 shrink-0">
                      {entry.vizLink && (
                        <Link
                          href={entry.vizLink.href}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all hover:bg-[#8b5cf6]/10"
                          style={{ borderColor: '#8b5cf640', color: '#8b5cf6' }}
                        >
                          Try it: {entry.vizLink.label}
                        </Link>
                      )}
                      {entry.expLink && (
                        <Link
                          href={entry.expLink.href}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all hover:bg-[#00ff88]/10"
                          style={{ borderColor: '#00ff8840', color: '#00ff88' }}
                        >
                          Data: {entry.expLink.label}
                        </Link>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{entry.definition}</p>
                  {entry.related && entry.related.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-gray-600 text-xs">Related:</span>
                      {entry.related.map(r => (
                        <span key={r} className="text-gray-500 text-xs px-1.5 py-0.5 rounded bg-white/5">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/50 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono">
            haiqu — TU Delft / QuTech
          </p>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-[#00d4ff] transition-colors">Home</Link>
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <Link href="/gallery" className="hover:text-[#8b5cf6] transition-colors">Viz Gallery</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
