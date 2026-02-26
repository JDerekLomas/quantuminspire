import PageClient from './PageClient'

export const metadata = {
  title: 'Error Mitigation Showdown — 15 Techniques Ranked',
  description: '15 error mitigation techniques tested on real quantum hardware. TREX achieves 119x improvement on IBM; ZNE fails on Tuna-9. Every result from actual experiments.',
}

export default function ErrorMitigationPage() {
  return (
    <>
      <PageClient />
      <section className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-400 leading-relaxed space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">About Error Mitigation</h2>
        <p>
          Current quantum processors are noisy &mdash; gate errors, measurement errors, and decoherence
          corrupt results. Error mitigation techniques reduce this noise without the overhead of full
          quantum error correction. They work by running extra circuits and post-processing the results
          to extract a better estimate of the ideal answer.
        </p>
        <p>
          We tested 15 techniques on real hardware: readout error mitigation (REM), zero-noise extrapolation (ZNE),
          probabilistic error cancellation (PEC), Pauli twirling, symmetry verification, and more.
          Results vary dramatically by platform: IBM&apos;s built-in TREX achieves 119x improvement,
          while ZNE fails entirely on Tuna-9&apos;s native gate set.
        </p>
        <p>
          Every result shown here comes from actual quantum experiments &mdash; no simulated noise models.
          The rankings reflect what works in practice, not in theory.
        </p>
      </section>
    </>
  )
}
