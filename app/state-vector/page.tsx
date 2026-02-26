import PageClient from './PageClient'

export const metadata = {
  title: 'State Vector Visualizer',
  description: 'Explore quantum state vectors for 1–6 qubits. Amplitude bars with phase coloring, gate application, and real-time state evolution.',
}

export default function StateVectorPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About State Vectors</h2>
        <p>
          A quantum state vector describes the complete state of a quantum system. For n qubits, the state vector
          has 2&#x207F; complex amplitudes &mdash; one for each possible measurement outcome. The probability of
          measuring a particular bitstring is the squared magnitude of its amplitude.
        </p>
        <p>
          This visualizer displays each amplitude as a bar whose height represents probability and whose color
          encodes phase. Apply gates to individual qubits and watch how the full state vector transforms.
          With multiple qubits, entangling gates like CNOT create correlations that cannot be described
          by independent single-qubit states.
        </p>
        <p>
          The exponential growth of the state vector &mdash; 2 amplitudes for 1 qubit, 64 for 6 qubits &mdash;
          is both the source of quantum computing&apos;s power and the reason classical simulation becomes
          intractable for large systems.
        </p>
      </section>
    </>
  )
}
