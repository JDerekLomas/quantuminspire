import PageClient from './PageClient'

export const metadata = {
  title: "Grover's Search Algorithm",
  description: 'Interactive oracle and diffusion operator. Watch amplitude amplification find the marked item with quadratic speedup over classical search.',
}

export default function GroversPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Grover&apos;s Algorithm</h2>
        <p>
          Grover&apos;s algorithm finds a marked item in an unsorted database of N items using only
          &#x221A;N queries &mdash; a quadratic speedup over the classical O(N) search. It works by
          repeatedly applying two operations: an oracle that flips the phase of the target state,
          and a diffusion operator that amplifies the marked amplitude while suppressing the rest.
        </p>
        <p>
          Each iteration (called a &quot;Grover step&quot;) rotates the state vector slightly toward the target.
          After approximately &#x03C0;/4 &#xD7; &#x221A;N iterations, the target state&apos;s probability is
          near 100%. Crucially, too many iterations overshoot &mdash; the probability starts decreasing,
          making timing essential.
        </p>
        <p>
          This interactive lets you choose the number of qubits and target state, then step through
          the oracle and diffusion operations one at a time, watching amplitude amplification unfold
          in the probability histogram.
        </p>
      </section>
    </>
  )
}
