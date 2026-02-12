import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Noise Channels',
  description: 'T₁/T₂ decay, dephasing vs depolarizing noise, Bloch sphere trajectories, and error budgets. Interactive noise channel explorer with real hardware data.',
}

export default function NoisePage() {
  return <PageClient />
}
