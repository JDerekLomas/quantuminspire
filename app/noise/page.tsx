import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Noise Channels',
  description: 'T₁/T₂ decay, dephasing vs depolarizing noise, Bloch sphere trajectories, and error budgets. Interactive noise channel explorer with real hardware data.',
}

export default function NoisePage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Quantum Noise</h2>
        <p>
          Quantum noise is the primary obstacle to useful quantum computing. Every real qubit interacts
          with its environment, causing errors that accumulate over the course of a computation.
          The two fundamental timescales are T&#x2081; (energy relaxation &mdash; how long before |1&#x27E9;
          decays to |0&#x27E9;) and T&#x2082; (dephasing &mdash; how long superposition phase information survives).
        </p>
        <p>
          Different noise channels affect the Bloch sphere differently. Amplitude damping (T&#x2081;) shrinks
          the sphere toward the north pole. Pure dephasing (T&#x2082;) collapses it to the z-axis.
          Depolarizing noise contracts it uniformly toward the center. Understanding which channel
          dominates on a given processor determines which error mitigation strategies will work.
        </p>
        <p>
          This explorer shows noise channel dynamics on the Bloch sphere with real T&#x2081;/T&#x2082;
          values from IBM Quantum, Quantum Inspire Tuna-9, and IQM Garnet processors.
        </p>
      </section>
    </>
  )
}
