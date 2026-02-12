import PageClient from './PageClient'

export const metadata = {
  title: 'Q-Sphere Visualization',
  description: 'Multi-qubit quantum states on a sphere. Node size shows probability, color shows phase, layers organized by Hamming weight.',
}

export default function QSpherePage() {
  return <PageClient />
}
