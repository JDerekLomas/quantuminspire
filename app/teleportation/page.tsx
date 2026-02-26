import PageClient from './PageClient'

export const metadata = {
  title: 'Quantum Teleportation Protocol',
  description: 'Step through the quantum teleportation protocol. Bloch sphere visualization shows how a qubit state transfers using entanglement and classical communication.',
}

export default function TeleportationPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Quantum Teleportation</h2>
        <p>
          Quantum teleportation transfers the state of one qubit to another using a shared entangled pair
          and two classical bits of communication. No physical particle moves &mdash; only quantum information.
          The protocol was proposed by Bennett et al. in 1993 and first demonstrated experimentally in 1997.
        </p>
        <p>
          The steps are: Alice and Bob share a Bell pair. Alice performs a Bell measurement on her qubit
          and the state to teleport, then sends the two classical bits of result to Bob. Bob applies a
          correction gate conditioned on those bits, recovering the original state perfectly.
        </p>
        <p>
          Teleportation is not faster-than-light communication &mdash; the classical bits must travel
          conventionally. But it is a building block for quantum networks, error correction, and
          measurement-based quantum computing.
        </p>
      </section>
    </>
  )
}
