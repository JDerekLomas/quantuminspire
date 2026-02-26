import PageClient from './PageClient'

export const metadata = {
  title: 'Rabi Oscillations Simulator',
  description: 'Simulate driven qubit dynamics. Adjust driving field strength, detuning, and T₂ dephasing to see Rabi oscillations on the Bloch sphere.',
}

export default function RabiPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Rabi Oscillations</h2>
        <p>
          Rabi oscillations are the coherent oscillation of a qubit between |0&#x27E9; and |1&#x27E9; under
          a resonant driving field. They are the physical basis of single-qubit gates: a &#x03C0;-pulse
          (half a Rabi cycle) flips the qubit, and a &#x03C0;/2-pulse creates a superposition.
        </p>
        <p>
          When the drive frequency is detuned from the qubit&apos;s resonance, the oscillations speed up
          but no longer reach full inversion &mdash; this is called the generalized Rabi frequency
          &#x03A9;&apos; = &#x221A;(&#x03A9;&#xB2; + &#x0394;&#xB2;). Real qubits also experience
          decoherence: T&#x2081; relaxation causes energy decay toward |0&#x27E9;, while T&#x2082; dephasing
          causes the oscillation envelope to decay.
        </p>
        <p>
          This simulator lets you tune the driving strength, detuning, and dephasing time to see how
          these parameters shape the qubit dynamics on the Bloch sphere and in the measurement probability.
        </p>
      </section>
    </>
  )
}
