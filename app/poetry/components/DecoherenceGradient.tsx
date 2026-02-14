'use client'

import { useInView, C } from '../lib/helpers'
import { DECOHERENCE_DATA } from '../data/decoherenceData'

export default function DecoherenceGradient() {
  const { ref, visible } = useInView(0.1)

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Decoherence Gradient</h2>
        <p className="text-sm text-gray-500 mb-2">
          A GHZ state should produce exactly two poems &mdash; all qubits agree, so you get
          total tenderness or its mirror. As the entanglement chain grows longer, the qubits
          lose coherence. The poem dissolves.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          At 3 qubits (2 CZ gates), 86.5% of measurements land on the two ideal poems.
          By 9 qubits (8 CZ gates), only 57.7% do. The rest leak into 152 intermediate states &mdash;
          poems the circuit never intended, written by the hardware&apos;s imperfections.
        </p>

        <div className="space-y-4">
          {DECOHERENCE_DATA.map((depth, i) => {
            const textOpacity = 0.3 + depth.fidelity * 0.7

            return (
              <div
                key={depth.label}
                className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-5 sm:p-6 transition-all duration-500"
                style={{ opacity: visible ? 1 : 0, transitionDelay: `${i * 150}ms` }}
              >
                {/* Header row */}
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-base font-bold text-gray-200">{depth.label}</h3>
                    <span className="text-xs font-mono text-gray-600">
                      {depth.nQubits} qubits &middot; {depth.nCZ} CZ gates
                    </span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: C.ghz }}>
                    {(depth.fidelity * 100).toFixed(1)}% fidelity
                  </span>
                </div>

                {/* Fidelity bar */}
                <div className="mb-4">
                  <div className="h-1.5 rounded-full bg-[#111827]">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${depth.fidelity * 100}%`,
                        backgroundColor: C.ghz,
                        opacity: 0.6,
                        transitionDelay: `${i * 200 + 300}ms`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-700 mt-1">
                    <span>{depth.unique} unique poems</span>
                    <span>{depth.entropy} bits entropy</span>
                  </div>
                </div>

                {/* Two ideal poems */}
                <div className="grid sm:grid-cols-2 gap-4 mb-3">
                  {depth.top.slice(0, 2).map((poem, j) => (
                    <div key={j} className="transition-opacity duration-500" style={{ opacity: textOpacity }}>
                      <p className="text-[10px] font-mono mb-2" style={{ color: C.ghz + 'aa' }}>
                        |{poem.bitstring}&#x27E9; &mdash; {poem.count} shots ({(poem.prob * 100).toFixed(1)}%)
                      </p>
                      <div className="space-y-0.5">
                        {poem.lines.map((line, k) => (
                          <p key={k} className="text-sm font-light italic" style={{ color: C.ghz }}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Noise poems (top 3-5, the decoherence leaks) */}
                {depth.top.length > 2 && (
                  <div className="border-t border-[#111827] pt-3 mt-3">
                    <p className="text-[10px] font-mono text-gray-700 mb-2">
                      decoherence leaks
                    </p>
                    <div className="space-y-1.5">
                      {depth.top.slice(2).map((poem, j) => (
                        <div key={j} className="flex items-baseline gap-2" style={{ opacity: textOpacity * 0.7 }}>
                          <span className="text-[10px] font-mono shrink-0" style={{ color: C.noise + '80' }}>
                            {poem.count}
                          </span>
                          <p className="text-xs italic" style={{ color: C.noise + 'aa' }}>
                            {poem.lines.join(' / ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <p className="text-xs text-gray-600 text-center mt-6 leading-relaxed">
          Each additional CZ gate extends the entanglement chain by one qubit and costs
          roughly 3.6% fidelity. The decoherence rate per gate: ~5.4%/CZ.
          At 9 qubits, nearly half the poem has dissolved into noise &mdash; but the noise
          itself carries meaning the circuit never intended.
        </p>

        <p className="text-[10px] font-mono text-gray-700 text-center mt-3">
          Tuna-9 hardware &middot; Hamiltonian path q3&rarr;q1&rarr;q4&rarr;q2&rarr;q5&rarr;q7&rarr;q8&rarr;q6
          &middot; native CZ+Ry+Rz gate set &middot; 4,096 shots each
        </p>
      </div>
    </div>
  )
}
