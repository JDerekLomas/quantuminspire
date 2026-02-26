import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Entanglement Explorer',
  description: 'Interactive Bell states, GHZ and W state comparison, separability slider, and real hardware fidelity data from IBM and Quantum Inspire.',
}

export default function EntanglementPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Quantum Entanglement</h2>
        <p>
          Entanglement is a quantum correlation with no classical analogue. When two qubits are entangled,
          measuring one instantly determines the other &mdash; regardless of distance. The four Bell states
          are the simplest entangled states, each producing perfectly correlated (or anti-correlated) measurement outcomes.
        </p>
        <p>
          GHZ and W states extend entanglement to three or more qubits with different properties. A GHZ state
          is maximally entangled but fragile &mdash; losing one qubit destroys all entanglement. A W state is
          more robust: losing one qubit still leaves the remaining qubits partially entangled.
        </p>
        <p>
          This explorer includes real hardware fidelity data from IBM Quantum and Quantum Inspire (Tuna-9),
          showing how well current processors can prepare and maintain entangled states.
        </p>
      </section>
    </>
  )
}
