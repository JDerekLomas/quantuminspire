import PageClient from './PageClient'

export const metadata = {
  title: 'Q-Sphere Visualization',
  description: 'Multi-qubit quantum states on a sphere. Node size shows probability, color shows phase, layers organized by Hamming weight.',
}

export default function QSpherePage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About the Q-Sphere</h2>
        <p>
          The Q-sphere extends the Bloch sphere to multi-qubit systems. Each computational basis state is
          placed on a sphere, with layers organized by Hamming weight &mdash; states with zero 1-bits at the
          top (|000&#x27E9;), states with all 1-bits at the bottom (|111&#x27E9;), and states with mixed bits in between.
        </p>
        <p>
          Node size indicates measurement probability: larger nodes are more likely to be observed.
          Color encodes the complex phase of each amplitude, making interference and entanglement
          patterns visible at a glance. This representation was introduced by IBM Research as a way
          to visualize multi-qubit states that the single-qubit Bloch sphere cannot capture.
        </p>
      </section>
    </>
  )
}
