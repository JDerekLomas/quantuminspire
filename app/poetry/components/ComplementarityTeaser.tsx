'use client'

import { useState } from 'react'
import { useInView, C } from '../lib/helpers'

export default function ComplementarityTeaser() {
  const { ref, visible } = useInView(0.2)
  const [lens, setLens] = useState<'neither' | 'tenderness' | 'resentment'>('neither')

  const tendernessPoem = ['your hand finds mine', 'and something holds that should have broken', 'still, your warmth']
  const resentmentPoem = ['your silence fills the room', 'and something stays that should have left by now', 'still, your weight']

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-2xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <p className="text-sm text-gray-500 text-center mb-8">
          Here is a quantum state, prepared on 9 superconducting qubits.
          It contains two poems. You can only read one at a time.
        </p>

        {/* The two lenses */}
        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={() => setLens(lens === 'tenderness' ? 'neither' : 'tenderness')}
            className="px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300"
            style={{
              borderColor: lens === 'tenderness' ? C.tenderness + '80' : '#1e293b',
              backgroundColor: lens === 'tenderness' ? C.tenderness + '15' : 'transparent',
              color: lens === 'tenderness' ? C.tenderness : '#475569',
            }}
          >
            Read with tenderness
          </button>
          <button
            onClick={() => setLens(lens === 'resentment' ? 'neither' : 'resentment')}
            className="px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300"
            style={{
              borderColor: lens === 'resentment' ? C.resentment + '80' : '#1e293b',
              backgroundColor: lens === 'resentment' ? C.resentment + '15' : 'transparent',
              color: lens === 'resentment' ? C.resentment : '#475569',
            }}
          >
            Read with resentment
          </button>
        </div>

        {/* Poem display */}
        <div className="min-h-[140px] flex items-center justify-center">
          {lens === 'neither' && (
            <p className="text-sm text-gray-600 italic text-center transition-opacity duration-500">
              The poem exists in superposition. Choose a lens to collapse it.
            </p>
          )}
          {lens === 'tenderness' && (
            <div className="text-center space-y-1.5 transition-opacity duration-500">
              {tendernessPoem.map((line, i) => (
                <p key={i} className="text-xl sm:text-2xl font-light italic" style={{ color: C.tenderness }}>
                  {line}
                </p>
              ))}
              <p className="text-xs font-mono text-gray-600 mt-4">
                Z-basis measurement &mdash; Tuna-9 hardware &mdash; 337 of 4,096 shots
              </p>
            </div>
          )}
          {lens === 'resentment' && (
            <div className="text-center space-y-1.5 transition-opacity duration-500">
              {resentmentPoem.map((line, i) => (
                <p key={i} className="text-xl sm:text-2xl font-light italic" style={{ color: C.resentment }}>
                  {line}
                </p>
              ))}
              <p className="text-xs font-mono text-gray-600 mt-4">
                X-basis measurement &mdash; Tuna-9 hardware &mdash; 396 of 4,096 shots
              </p>
            </div>
          )}
        </div>

        {lens !== 'neither' && (
          <p className="text-xs text-gray-600 text-center mt-6 transition-opacity duration-500">
            Same qubits. Same state. Different measurement, different poem.
            {lens === 'tenderness' ? ' Now try the other lens.' : ' Now try the other lens.'}
          </p>
        )}
      </div>
    </div>
  )
}
