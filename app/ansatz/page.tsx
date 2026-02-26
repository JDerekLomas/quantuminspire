import PageClient from './PageClient'

export const metadata = {
  title: 'Ansatz Explorer — Quantum Circuit Architectures',
  description: 'Compare 4 parameterized circuit architectures from landmark papers. See how they map to Tuna-9, IQM Garnet, and IBM hardware with real transpilation data.',
}

export default function AnsatzPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Ansatz Circuits</h2>
        <p>
          An ansatz is a parameterized quantum circuit used as a trial wavefunction in variational algorithms
          like VQE. The choice of ansatz determines what states the algorithm can explore and how efficiently
          it converges. Different architectures make different trade-offs between expressibility (which states
          can be reached) and trainability (how easy it is to optimize).
        </p>
        <p>
          Hardware-efficient ans&auml;tze use only the native gates of a specific processor, minimizing
          circuit depth. Chemistry-inspired ans&auml;tze like UCCSD respect the physical symmetries of
          molecules but require more gates. The Hamiltonian variational ansatz structures its layers
          to match the problem Hamiltonian.
        </p>
        <p>
          This explorer compares 4 architectures from landmark papers, showing real transpilation data
          for Tuna-9 (CZ + Ry/Rz native gates), IQM Garnet, and IBM processors. Gate counts, circuit
          depth, and expected fidelity help determine which ansatz works best on which hardware.
        </p>
      </section>
    </>
  )
}
