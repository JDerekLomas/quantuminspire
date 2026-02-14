'use client'

import { useState } from 'react'
import { useInView, C } from '../lib/helpers'

export default function ComplementarityTeaser() {
  const { ref, visible } = useInView(0.2)
  const [lens, setLens] = useState<'neither' | 'presence' | 'absence'>('neither')

  const presencePoem = ['your hand finding mine', 'you pull me closer and stay', 'the door stays open']
  const absencePoem = ['the empty pillow', 'I still remember your hands', 'the porch light still on']

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-2xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <p className="text-sm text-gray-500 text-center mb-8">
          Here is a quantum state, prepared on 9 superconducting qubits.
          It contains two haiku. You can only read one at a time.
        </p>

        {/* The two lenses */}
        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={() => setLens(lens === 'presence' ? 'neither' : 'presence')}
            className="px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300"
            style={{
              borderColor: lens === 'presence' ? C.presence + '80' : '#1e293b',
              backgroundColor: lens === 'presence' ? C.presence + '15' : 'transparent',
              color: lens === 'presence' ? C.presence : '#475569',
            }}
          >
            Read as presence
          </button>
          <button
            onClick={() => setLens(lens === 'absence' ? 'neither' : 'absence')}
            className="px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300"
            style={{
              borderColor: lens === 'absence' ? C.absence + '80' : '#1e293b',
              backgroundColor: lens === 'absence' ? C.absence + '15' : 'transparent',
              color: lens === 'absence' ? C.absence : '#475569',
            }}
          >
            Read as absence
          </button>
        </div>

        {/* Poem display */}
        <div className="min-h-[140px] flex items-center justify-center">
          {lens === 'neither' && (
            <p className="text-sm text-gray-600 italic text-center transition-opacity duration-500">
              The haiku exists in superposition. Choose a lens to collapse it.
            </p>
          )}
          {lens === 'presence' && (
            <div className="text-center space-y-1.5 transition-opacity duration-500">
              {presencePoem.map((line, i) => (
                <p key={i} className="text-xl sm:text-2xl font-light italic" style={{ color: C.presence }}>
                  {line}
                </p>
              ))}
              <p className="text-xs font-mono text-gray-600 mt-4">
                Z-basis measurement &mdash; Tuna-9 hardware &mdash; 337 of 4,096 shots
              </p>
            </div>
          )}
          {lens === 'absence' && (
            <div className="text-center space-y-1.5 transition-opacity duration-500">
              {absencePoem.map((line, i) => (
                <p key={i} className="text-xl sm:text-2xl font-light italic" style={{ color: C.absence }}>
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
            Same qubits. Same state. Different measurement, different haiku.
            Now try the other reading.
          </p>
        )}
      </div>
    </div>
  )
}
