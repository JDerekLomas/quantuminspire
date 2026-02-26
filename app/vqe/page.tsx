import PageClient from './PageClient'

export const metadata = {
  title: 'VQE: Variational Quantum Eigensolver',
  description: 'A hybrid algorithm that finds molecular ground-state energies using quantum hardware and a classical optimizer. Interactive explainer with real experiment results from IBM and Tuna-9.',
}

export default function VQEPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About VQE</h2>
        <p>
          The Variational Quantum Eigensolver (VQE) is a hybrid quantum-classical algorithm for finding
          the ground-state energy of molecules. The quantum processor prepares a trial state using a
          parameterized circuit (ansatz), measures the energy, and a classical optimizer adjusts the
          parameters to minimize it. This loop repeats until convergence.
        </p>
        <p>
          VQE is designed for near-term noisy hardware: the circuits are short enough to run before
          decoherence destroys the signal, and the classical optimizer handles the noise by treating
          energy measurements as a stochastic objective function. It was first demonstrated by
          Peruzzo et al. in 2014 on a photonic processor.
        </p>
        <p>
          This page shows real VQE results from IBM Quantum and Quantum Inspire Tuna-9 for hydrogen (H&#x2082;)
          and lithium hydride (LiH), compared against exact classical solutions. The gap between hardware
          results and the exact answer reveals how noise, ansatz choice, and error mitigation affect accuracy.
        </p>
      </section>
    </>
  )
}
