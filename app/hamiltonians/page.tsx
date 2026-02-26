import PageClient from './PageClient'

export const metadata = {
  title: 'Molecular Hamiltonians — From Molecules to Quantum Circuits',
  description: 'Explore how molecules become quantum circuits. Interactive Pauli decomposition, bond-distance energy sweeps, and real VQE data for hydrogen.',
}

export default function HamiltoniansPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Molecular Hamiltonians</h2>
        <p>
          To simulate a molecule on a quantum computer, its Hamiltonian (energy operator) must be
          decomposed into a sum of Pauli operators &mdash; tensor products of I, X, Y, and Z matrices.
          Each Pauli term can then be measured on quantum hardware, and their weighted sum gives
          the total energy.
        </p>
        <p>
          For hydrogen (H&#x2082;), the Hamiltonian has 5 Pauli terms whose coefficients change as the
          bond stretches. At equilibrium (0.735 &#xC5;), the molecule sits at the bottom of its potential energy
          surface. Stretching the bond raises the energy until the atoms dissociate. The full configuration
          interaction (FCI) energy is the exact answer; Hartree-Fock is the best classical single-determinant
          approximation.
        </p>
        <p>
          This interactive shows how the Pauli decomposition coefficients evolve with bond distance,
          and how VQE results from real quantum hardware compare to the exact energy curve.
        </p>
      </section>
    </>
  )
}
