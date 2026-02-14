'use client'

import { useInView, C } from '../lib/helpers'

export default function LLMConnection() {
  const { ref, visible } = useInView(0.15)
  const points = [
    { term: 'Token generation', desc: 'An LLM writes one word at a time. Each word collapses possibilities for every word that follows \u2014 sequential measurement.' },
    { term: 'Temperature', desc: 'How spread out the probability is before collapse. Low temperature: predictable. High temperature: surprising, strange.' },
    { term: 'Top-k sampling', desc: 'How many candidate words are allowed. A haiku allows fewer possibilities than free verse. Constraint shapes meaning.' },
    { term: 'Entanglement', desc: 'Poetry\'s core challenge: each word should be locally surprising but globally coherent. Entanglement is exactly this \u2014 maximum local uncertainty, maximum global correlation.' },
    { term: 'The hybrid', desc: 'A quantum-LLM poet could use entanglement to keep a haiku structurally coherent while letting each line be as strange as high temperature allows.' },
  ]

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">The LLM Connection</h2>
        <p className="text-sm text-gray-500 mb-8">
          Every time a language model picks the next word, it collapses a probability distribution. That&apos;s already a measurement process. Quantum hardware makes it literal.
        </p>

        <div className="space-y-4">
          {points.map((p, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-sm font-mono shrink-0 w-36 sm:w-48" style={{ color: C.blue }}>{p.term}</span>
              <span className="text-sm text-gray-400">{p.desc}</span>
            </div>
          ))}
        </div>

        {/* Concrete example */}
        <div className="mt-12 bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6">
          <p className="text-xs font-mono mb-4" style={{ color: C.blue + '80' }}>Example: temperature as probability spread</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Low temperature (0.3) &mdash; predictable, safe</p>
              <p className="text-base font-light italic text-gray-400">
                &ldquo;The morning sun rose over the quiet hills&rdquo;
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Medium temperature (0.8) &mdash; interesting, risky</p>
              <p className="text-base font-light italic text-gray-300">
                &ldquo;The morning sun rose over the rusted hymns&rdquo;
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">High temperature (1.5) &mdash; strange, unconstrained</p>
              <p className="text-base font-light italic text-gray-200">
                &ldquo;The morning sun velocity the crumpled psalms&rdquo;
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Poetry lives in the middle &mdash; surprising enough to feel alive, coherent enough to mean
            something. The problem is that temperature is a single dial. Entanglement could give each
            line of a haiku its own temperature while keeping the whole poem structurally bound.
          </p>
        </div>
      </div>
    </div>
  )
}
