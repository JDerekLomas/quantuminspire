import PageClient from './PageClient'

export const metadata = {
  title: 'State Vector Visualizer',
  description: 'Explore quantum state vectors for 1–6 qubits. Amplitude bars with phase coloring, gate application, and real-time state evolution.',
}

export default function StateVectorPage() {
  return <PageClient />
}
