import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Entanglement Explorer',
  description: 'Interactive Bell states, GHZ and W state comparison, separability slider, and real hardware fidelity data from IBM and Quantum Inspire.',
}

export default function EntanglementPage() {
  return <PageClient />
}
