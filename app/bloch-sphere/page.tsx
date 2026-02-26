import PageClient from './PageClient'

export const metadata = {
  title: 'Interactive Bloch Sphere',
  description: 'Visualize qubit states in 3D. Apply quantum gates — H, X, Y, Z, S, T, Rx, Ry — and watch rotations on the Bloch sphere in real time.',
}

export default function BlochSpherePage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About the Bloch Sphere</h2>
        <p>
          The Bloch sphere is the standard way to visualize a single qubit. Every point on the sphere&apos;s surface
          represents a valid quantum state. The north pole is |0&#x27E9;, the south pole is |1&#x27E9;, and the equator
          holds superposition states like |+&#x27E9; and |&minus;&#x27E9;.
        </p>
        <p>
          Quantum gates act as rotations on this sphere. The X gate flips the qubit (180&#xB0; around the x-axis),
          the Hadamard gate creates an equal superposition, and phase gates like S and T rotate around the z-axis.
          By composing rotations, any single-qubit state can be reached from any other.
        </p>
        <p>
          This interactive tool lets you apply gates and watch the state vector move in real time.
          The trail shows the path of recent transformations, making it easier to build geometric intuition
          for how quantum gates work.
        </p>
      </section>
    </>
  )
}
