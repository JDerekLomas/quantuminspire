import PageClient from './PageClient'

export const metadata = {
  title: 'Interactive Bloch Sphere',
  description: 'Visualize qubit states in 3D. Apply quantum gates — H, X, Y, Z, S, T, Rx, Ry — and watch rotations on the Bloch sphere in real time.',
}

export default function BlochSpherePage() {
  return <PageClient />
}
