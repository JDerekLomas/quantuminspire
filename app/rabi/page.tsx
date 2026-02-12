import PageClient from './PageClient'

export const metadata = {
  title: 'Rabi Oscillations Simulator',
  description: 'Simulate driven qubit dynamics. Adjust driving field strength, detuning, and T₂ dephasing to see Rabi oscillations on the Bloch sphere.',
}

export default function RabiPage() {
  return <PageClient />
}
