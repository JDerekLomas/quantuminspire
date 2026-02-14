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
          <span className="gradient-text-pink">Quantum Poetry</span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-4 max-w-2xl mx-auto">
          Poetry is the literary form most naturally suited to quantum computation.
        </p>
        <p className="text-gray-500 text-base leading-relaxed max-w-xl mx-auto mb-8">
          A poem holds multiple meanings at once until the reader collapses it into one.
          Its images are entangled &mdash; touch one and the others shift. Its readings
          interfere, amplifying some possibilities and canceling others.
          These aren&apos;t metaphors borrowed from physics. They&apos;re the same operations.
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
