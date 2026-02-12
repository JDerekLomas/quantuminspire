import PageClient from './PageClient'

export const metadata = {
  title: 'VQE: Variational Quantum Eigensolver',
  description: 'A hybrid algorithm that finds molecular ground-state energies using quantum hardware and a classical optimizer. Interactive explainer with real experiment results from IBM and Tuna-9.',
}

export default function VQEPage() {
  return <PageClient />
}
