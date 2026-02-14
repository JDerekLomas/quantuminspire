'use client'

import { useState } from 'react'
import { useInView, C } from '../lib/helpers'
import { INTERFERENCE_DATA, ANGLE_LABELS } from '../data/interferenceData'

function lerpColor(t: number): string {
  // rose (#ff6b9f) → mauve → violet (#a78bfa)
  const r = Math.round(255 - t * 88)
  const g = Math.round(107 + t * 32)
  const b = Math.round(159 + t * 91)
  return `rgb(${r}, ${g}, ${b})`
}

export default function InterferenceDraft() {
  const { ref, visible } = useInView(0.1)
  const [angleIdx, setAngleIdx] = useState(0)

  const data = INTERFERENCE_DATA[angleIdx]
  const t = angleIdx / 4 // 0 to 1
  const color = lerpColor(t)
  const presenceOpacity = 1 - t
  const absenceOpacity = t

  const maxProb = Math.max(...INTERFERENCE_DATA.flatMap(d => d.top.map(p => p.prob)))

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Interference Draft</h2>
        <p className="text-sm text-gray-500 mb-2">
          The same 9-qubit state, measured through a rotating lens. At &theta;=0,
          you read presence. At &theta;=&pi;/2, absence. In between, the two readings
          interfere &mdash; not blending, but amplifying some haiku and canceling others.
          This is genuine quantum interference on a poem.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          At &theta;=&pi;/4 (maximum interference), the distribution is flattest: 409 unique haiku,
          7.54 bits of entropy. The most probable haiku drops to just 5.1%.
          Meaning is maximally uncertain &mdash; the poem is still being written.
        </p>

        {/* Angle selector */}
        <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
          <div className="mb-8">
            <div className="flex justify-between text-xs font-mono text-gray-600 mb-3">
              <span style={{ color: C.presence }}>presence</span>
              <span className="text-gray-700">interference</span>
              <span style={{ color: C.absence }}>absence</span>
            </div>
            <div className="relative">
              <div className="h-1 rounded-full" style={{
                background: `linear-gradient(to right, ${C.presence}, #d47bcd, ${C.absence})`,
                opacity: 0.3,
              }} />
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={angleIdx}
                onChange={(e) => setAngleIdx(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 -top-2.5"
              />
              <div className="flex justify-between mt-1">
                {ANGLE_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setAngleIdx(i)}
                    className="flex flex-col items-center transition-all duration-300"
                  >
                    <div
                      className="w-3 h-3 rounded-full border-2 transition-all duration-300 -mt-2"
                      style={{
                        borderColor: i === angleIdx ? lerpColor(i / 4) : '#334155',
                        backgroundColor: i === angleIdx ? lerpColor(i / 4) + '40' : 'transparent',
                        transform: i === angleIdx ? 'scale(1.4)' : 'scale(1)',
                      }}
                    />
                    <span
                      className="text-[10px] font-mono mt-1.5 transition-colors duration-300"
                      style={{ color: i === angleIdx ? lerpColor(i / 4) : '#475569' }}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 text-xs font-mono mb-6" style={{ color: color + 'aa' }}>
            <span>{data.unique} unique haiku</span>
            <span>{data.entropy} bits entropy</span>
            <span>top: {(data.top[0].prob * 100).toFixed(1)}%</span>
          </div>

          {/* Featured poem with dual reading */}
          <div className="mb-8 text-center">
            <div className="space-y-2 mb-3">
              {data.top[0].presence.map((line, i) => (
                <div key={i} className="relative">
                  <p
                    className="text-lg sm:text-xl font-light italic transition-opacity duration-500"
                    style={{ color: C.presence, opacity: Math.max(0.15, presenceOpacity) }}
                  >
                    {line}
                  </p>
                  {t > 0 && (
                    <p
                      className="text-lg sm:text-xl font-light italic transition-opacity duration-500 absolute inset-0"
                      style={{ color: C.absence, opacity: Math.max(0.15, absenceOpacity) }}
                    >
                      {data.top[0].absence[i]}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-gray-600">
              |{data.top[0].bitstring}&#x27E9; &mdash; {data.top[0].count} of 4,096 shots ({(data.top[0].prob * 100).toFixed(1)}%)
            </p>
          </div>

          {/* Bar chart: top 10 probabilities */}
          <div>
            <p className="text-xs font-mono text-gray-500 mb-4">Top 10 haiku by probability</p>
            <div className="space-y-1.5">
              {data.top.map((poem, i) => {
                const barW = (poem.prob / maxProb) * 100
                const label = poem.presence[0].length > 22
                  ? poem.presence[0].slice(0, 22) + '...'
                  : poem.presence[0]
                return (
                  <div key={poem.bitstring} className="flex items-center gap-2 group">
                    <span className="text-[10px] font-mono text-gray-600 w-[140px] sm:w-[180px] text-right truncate shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-4 relative">
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{
                          width: `${barW}%`,
                          backgroundColor: color,
                          opacity: 0.5 - i * 0.03,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono w-[40px] shrink-0 transition-colors duration-500"
                      style={{ color }}>
                      {(poem.prob * 100).toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hardware provenance */}
          <p className="text-[10px] font-mono text-gray-700 mt-6 text-center">
            Tuna-9 hardware &middot; Rz(2&theta;)+Ry(&theta;) pre-measurement rotation &middot;
            native gate set &middot; CompileStage.ROUTING &middot; 4,096 shots per angle
          </p>
        </div>
      </div>
    </div>
  )
}
