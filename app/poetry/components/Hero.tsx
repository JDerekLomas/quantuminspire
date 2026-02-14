'use client'

import { useInView } from '../lib/helpers'

export default function Hero() {
  const { ref, visible } = useInView(0.2)
  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col items-center justify-center px-6 pt-20">
      <div className={`max-w-3xl text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <p className="text-xs font-mono text-gray-600 uppercase tracking-[0.3em] mb-6">
          h + AI + qu
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text-pink">Quantum Haiku</span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-4 max-w-2xl mx-auto">
          Nine qubits. Three lines. Five-seven-five.
        </p>
        <p className="text-gray-500 text-base leading-relaxed max-w-xl mx-auto mb-8">
          A haiku holds two states of love at once until the reader collapses it into one.
          Measure in the Z-basis and you read presence &mdash; love that is here.
          Measure in the X-basis and the same qubits give you absence &mdash;
          love remembered. The constraint of the form &mdash;
          seventeen syllables, three lines &mdash; matches the hardware exactly:
          nine qubits, three groups of three bits.
        </p>
        <div className="mt-12 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto opacity-30">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
