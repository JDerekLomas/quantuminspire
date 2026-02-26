import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Measurement Lab',
  description: 'Watch the Born rule converge in real time. Measure qubits in different bases and see probability distributions emerge shot by shot.',
}

export default function MeasurementPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Quantum Measurement</h2>
        <p>
          Quantum measurement collapses a superposition into a definite outcome. The Born rule says the
          probability of each outcome equals the squared magnitude of its amplitude. A single measurement
          gives a random result &mdash; but repeat the same experiment many times and the frequencies
          converge to the predicted probabilities.
        </p>
        <p>
          The measurement basis matters. Measuring a |+&#x27E9; state in the computational (Z) basis gives
          50/50 outcomes, but measuring in the X basis gives a deterministic result. Choosing the right
          basis is fundamental to quantum algorithms, error correction, and tomography.
        </p>
        <p>
          This lab lets you prepare different quantum states, choose measurement bases, and watch
          probability distributions build up shot by shot &mdash; making the Born rule tangible.
        </p>
      </section>
    </>
  )
}
