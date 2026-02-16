import PulsePlayerClient from './PulsePlayerClient'

export const metadata = {
  title: 'Pulse Player — Hear Quantum Gate Control Pulses',
  description: 'Listen to the microwave and flux pulses that control superconducting qubits. DRAG, CZ, and readout pulses sonified from real physics.',
}

export default function PulsesPage() {
  return <PulsePlayerClient />
}
