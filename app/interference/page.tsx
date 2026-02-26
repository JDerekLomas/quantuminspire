import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Interference — Multi-Slit Simulation',
  description: 'N-slit diffraction simulation. Watch photons accumulate into interference patterns. Adjust slit count, spacing, and wavelength interactively.',
}

export default function InterferencePage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Quantum Interference</h2>
        <p>
          Interference is the mechanism that makes quantum computing work. When a quantum system can reach
          an outcome through multiple paths, the probability amplitudes for those paths add together.
          Paths can reinforce (constructive interference) or cancel (destructive interference), creating
          patterns impossible in classical probability.
        </p>
        <p>
          The multi-slit experiment is the canonical demonstration. Single photons pass through multiple slits
          and land on a detector screen. Each photon arrives at a single point, but over many trials an
          interference pattern emerges &mdash; bright bands where amplitudes add, dark bands where they cancel.
        </p>
        <p>
          Quantum algorithms exploit interference deliberately: they amplify amplitudes for correct answers
          and suppress wrong ones. Grover&apos;s search and the quantum Fourier transform both rely on
          precisely engineered interference.
        </p>
      </section>
    </>
  )
}
