import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Resonance — Why Qubits Respond to Microwaves',
  description: 'Energy levels, Lorentzian peaks, avoided crossings, and hardware frequencies. Interactive guide to the physics of microwave-qubit interaction.',
}

export default function ResonancePage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Qubit Resonance</h2>
        <p>
          Superconducting qubits are controlled by microwave pulses tuned to their resonance frequency,
          typically 4&ndash;6 GHz. When the drive frequency matches the qubit&apos;s energy splitting,
          the qubit absorbs energy and transitions between states &mdash; this is the physical mechanism
          behind every quantum gate.
        </p>
        <p>
          The resonance line shape is a Lorentzian peak whose width is set by the qubit&apos;s coherence time.
          When a qubit couples to a resonator cavity, their energy levels undergo an avoided crossing:
          the bare frequencies repel, creating &quot;dressed states&quot; that are hybridizations of qubit and cavity.
          This dispersive coupling is how superconducting qubits are read out without destroying their state.
        </p>
        <p>
          This interactive shows real frequency data from Quantum Inspire Tuna-9, IQM Garnet, and IBM
          processors, alongside the physics of Lorentzian peaks, Q-factors, and cavity-qubit coupling.
        </p>
      </section>
    </>
  )
}
