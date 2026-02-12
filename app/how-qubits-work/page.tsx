'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'

const modules = [
  {
    title: 'How We Tune a Qubit',
    desc: 'Spectroscopy basics. CW vs pulsed lineshapes, saturation, and power broadening.',
    href: '/how-qubits-work/spectroscopy',
    status: 'live',
    color: '#8b5cf6',
  },
  {
    title: 'Why Qubits Forget',
    desc: 'T1, T2, coherence decay, and linewidth intuition.',
    href: '/how-qubits-work/coherence',
    status: 'live',
    color: '#ff6b9d',
  },
  {
    title: 'How Qubits Talk',
    desc: 'Avoided crossings, coupling strength, and dispersive shifts.',
    href: '/how-qubits-work/coupling',
    status: 'live',
    color: '#00d4ff',
  },
  {
    title: 'How Gates Happen',
    desc: 'Pulse shaping, leakage, and control errors.',
    href: '/how-qubits-work/gates',
    status: 'live',
    color: '#f59e0b',
  },
  {
    title: 'How We Measure',
    desc: 'Dispersive readout, SNR, and fidelity.',
    href: '/how-qubits-work/measurement',
    status: 'live',
    color: '#22d3ee',
  },
  {
    title: 'How We Scale',
    desc: 'Topology, routing overhead, and spectral crowding.',
    href: '/how-qubits-work/scaling',
    status: 'live',
    color: '#a78bfa',
  },
]

export default function HowQubitsWorkIndexPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav />
      <main id="main-content">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
          &larr; zoo
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
          How Qubits Work
        </span>
        <span className="text-sm font-semibold text-[#8b5cf6]">Series Index</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">How Qubits Work</h1>
          <p className="text-gray-400 max-w-3xl">
            A short sequence of physics-first labs that explain how real quantum hardware is tuned,
            controlled, and read out. Each module isolates a specific assumption and makes it
            interactive.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-mono text-gray-500">
            <span className="px-3 py-1 rounded-full border border-white/10">Series length: 6 modules</span>
            <span className="px-3 py-1 rounded-full border border-white/10">Live: 3 modules</span>
            <span className="px-3 py-1 rounded-full border border-white/10">Format: short labs</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {modules.map((item) => (
            <div
              key={item.title}
              className={`rounded-xl border p-5 ${
                item.status === 'live'
                  ? 'border-white/20 bg-white/5'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest ${
                    item.status === 'live' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {item.status === 'live' ? 'Live' : 'Coming soon'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              </div>
              <h2 className="text-base font-semibold text-white mb-2">{item.title}</h2>
              <p className="text-xs text-gray-500 mb-4">{item.desc}</p>
              {item.status === 'live' ? (
                <Link href={item.href} className="text-xs font-mono text-[#8b5cf6] hover:underline">
                  Open &rarr;
                </Link>
              ) : (
                <span className="text-xs font-mono text-gray-600">Queued</span>
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">How To Use This Series</h2>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>Start with spectroscopy to see how a qubit frequency is found.</li>
            <li>Move to coherence to connect linewidth with T1 and T2.</li>
            <li>Then explore coupling to see how two-qubit interactions emerge.</li>
          </ul>
          <div className="mt-4">
            <Link href="/how-qubits-work/spectroscopy" className="text-xs font-mono text-[#8b5cf6] hover:underline">
              Start with Module 1 &rarr;
            </Link>
          </div>
        </div>
      </div>
      </main>
    </div>
  )
}
