'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useInView, C, bitstringToPoem, weightedSample } from '../lib/helpers'
import { PRESENCE_LINES, ABSENCE_LINES } from '../data/wordBanks'
import { DIST_Z, DIST_X, DIST_GHZ } from '../data/distributions'
import { TOP_Z, TOP_X, TOP_GHZ, NOISE_POEMS, GHZ_HAIKU, BELL_COUPLETS } from '../data/topPoems'

function GHZHaikuCard() {
  const { ref, visible } = useInView(0.15)
  return (
    <div ref={ref} className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">GHZ-9 Haiku</h3>
            <p className="text-xs font-mono text-gray-600 mt-1">9-qubit GHZ state &middot; Tuna-9 hardware &middot; 4,096 shots</p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: C.ghz + '15', color: C.ghz }}>hardware</span>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Nine qubits, perfectly entangled: when you measure them, they all agree.
          All zeros or all ones &mdash; nothing in between. Two possible haiku, held in
          superposition until the moment of reading. The poem is both until it&apos;s one.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-4">
          {GHZ_HAIKU.map((h, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-mono mb-3" style={{ color: (i === 0 ? C.presence : C.ghz) + 'aa' }}>
                |{h.bitstring}&#x27E9; &mdash; {h.shots} shots
              </p>
              <div className="space-y-0.5">
                {h.poem.map((line, j) => (
                  <p key={j} className="text-base font-light italic" style={{ color: i === 0 ? C.presence : C.ghz }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BellCoupletsCard() {
  const { ref, visible } = useInView(0.15)
  return (
    <div ref={ref} className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">Bell Couplets</h3>
            <p className="text-xs font-mono text-gray-600 mt-1">4 Bell pairs &middot; 8 qubits &middot; qxelarator emulator &middot; 1,024 shots</p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: C.blue + '15', color: C.blue }}>emulator</span>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Four pairs of entangled qubits, each pair controlling one axis of meaning:
          subject, sensation, warmth, destination. Within each pair, the correlation is
          perfect &mdash; if one qubit says &ldquo;you&rdquo;, its partner always says &ldquo;warm&rdquo;.
          Between pairs, nearly zero correlation. Independent choices, bound together.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          The binding between each pair&apos;s lines is stronger than any classical random process
          could produce &mdash; certifiably quantum. These couplets rhyme by entanglement, not by choice.
        </p>

        <div className="space-y-5">
          {BELL_COUPLETS.map((c, i) => (
            <div key={i} className="border-l-2 pl-4 py-1" style={{ borderColor: C.blue + '40' }}>
              <p className="text-base font-light italic" style={{ color: C.blue }}>{c.line1}</p>
              <p className="text-base font-light italic" style={{ color: C.blue + 'cc' }}>{c.line2}</p>
              <p className="text-xs font-mono text-gray-600 mt-1">key: {c.key} &middot; {c.shots} shots</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ComplementaryPoems() {
  const [basis, setBasis] = useState<'Z' | 'X'>('Z')
  const isZ = basis === 'Z'
  const color = isZ ? C.presence : C.absence
  const top = isZ ? TOP_Z : TOP_X
  const label = isZ ? 'Presence' : 'Absence'
  const maxProb = top[0].prob

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-[#1e293b] p-1 bg-[#060610]">
          <button
            onClick={() => setBasis('Z')}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: isZ ? C.presence + '20' : 'transparent',
              color: isZ ? C.presence : '#475569',
            }}
          >
            Presence
          </button>
          <button
            onClick={() => setBasis('X')}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: !isZ ? C.absence + '20' : 'transparent',
              color: !isZ ? C.absence : '#475569',
            }}
          >
            Absence
          </button>
        </div>
      </div>

      {/* Featured poem */}
      <div className="text-center mb-8 transition-opacity duration-500">
        <p className="text-xs font-mono mb-4" style={{ color: color + 'aa' }}>
          {label} ({isZ ? 'Z' : 'X'}-basis) &mdash; most probable &mdash; {(top[0].prob * 100).toFixed(1)}%
        </p>
        <div className="space-y-1">
          {top[0].lines.map((line, i) => (
            <p key={i} className="text-xl sm:text-2xl font-light italic transition-colors duration-500"
              style={{ color }}>
              {line}
            </p>
          ))}
        </div>
        <p className="text-xs font-mono text-gray-600 mt-4">
          {top[0].count} of 4,096 measurements
        </p>
      </div>

      {/* Bar chart */}
      <div className="mb-6">
        <p className="text-xs font-mono text-gray-500 mb-4">Top 10 haiku by probability</p>
        <svg viewBox="0 0 700 360" className="w-full">
          {top.map((poem, i) => {
            const barW = (poem.prob / maxProb) * 380
            const y = i * 35
            return (
              <g key={i} transform={`translate(0, ${y})`}>
                <rect x="310" y="2" width={barW} height="24" rx="3"
                  fill={color} opacity={0.5 - i * 0.03}
                  className="transition-all duration-500" />
                <text x="305" y="18" textAnchor="end" fill="#9ca3af" fontSize="9" fontFamily="monospace">
                  {poem.lines[0].length > 28 ? poem.lines[0].slice(0, 28) + '...' : poem.lines[0]}
                </text>
                <text x={316 + barW} y="18" fill={color} fontSize="9" fontFamily="monospace"
                  className="transition-colors duration-500">
                  {(poem.prob * 100).toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function MeasureWidget() {
  const [activeBasis, setActiveBasis] = useState<'Z' | 'X' | 'GHZ'>('Z')
  const [result, setResult] = useState<{
    lines: string[]
    bitstring: string
    count: number
    total: number
  } | null>(null)
  const [collapsing, setCollapsing] = useState(false)
  const [collapseLines, setCollapseLines] = useState<string[]>(['', '', ''])
  const collapseRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const dists = { Z: DIST_Z, X: DIST_X, GHZ: DIST_GHZ }
  const colors = { Z: C.presence, X: C.absence, GHZ: C.ghz }
  const labels = { Z: 'Presence (Z)', X: 'Absence (X)', GHZ: 'All-or-Nothing (GHZ)' }

  const measure = useCallback(() => {
    const dist = dists[activeBasis]
    const bank = activeBasis === 'X' ? ABSENCE_LINES : PRESENCE_LINES
    const total = Object.values(dist).reduce((s, c) => s + c, 0)

    if (prefersReducedMotion.current) {
      const { bitstring, count } = weightedSample(dist)
      const lines = bitstringToPoem(bitstring, bank)
      setResult({ lines, bitstring, count, total })
      return
    }

    setCollapsing(true)
    setResult(null)

    let elapsed = 0
    const interval = 40
    collapseRef.current = setInterval(() => {
      elapsed += interval
      setCollapseLines([
        bank.line1[Math.floor(Math.random() * 8)],
        bank.line2[Math.floor(Math.random() * 8)],
        bank.line3[Math.floor(Math.random() * 8)],
      ])
      if (elapsed >= 250) {
        if (collapseRef.current) clearInterval(collapseRef.current)
        setCollapsing(false)
        const { bitstring, count } = weightedSample(dist)
        const lines = bitstringToPoem(bitstring, bank)
        setResult({ lines, bitstring, count, total })
      }
    }, interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBasis])

  useEffect(() => {
    return () => { if (collapseRef.current) clearInterval(collapseRef.current) }
  }, [])

  const color = colors[activeBasis]

  return (
    <div className="mt-8 pt-6 border-t border-[#111827]">
      <h4 className="text-base font-semibold text-gray-300 mb-2">Measure</h4>
      <p className="text-sm text-gray-500 mb-6">
        Draw a haiku from the real hardware distribution. Each click samples from 4,096 measurements
        made on Tuna-9 &mdash; weighted by how often the hardware actually produced each outcome.
        Common haiku appear often. Rare haiku are genuinely rare.
      </p>

      {/* Basis selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['Z', 'X', 'GHZ'] as const).map((b) => (
          <button key={b}
            onClick={() => { setActiveBasis(b); setResult(null) }}
            className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
            style={{
              borderColor: activeBasis === b ? colors[b] + '60' : '#1e293b',
              backgroundColor: activeBasis === b ? colors[b] + '15' : 'transparent',
              color: activeBasis === b ? colors[b] : '#475569',
            }}
          >
            {labels[b]}
          </button>
        ))}
      </div>

      {/* Measure button */}
      <button
        onClick={measure}
        disabled={collapsing}
        className="px-6 py-2.5 rounded-full border-2 text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50 mb-8"
        style={{ borderColor: color, color, backgroundColor: color + '10' }}
      >
        {collapsing ? 'Collapsing...' : 'Measure'}
      </button>

      {/* Result */}
      <div className="min-h-[150px]">
        {collapsing && (
          <div className="space-y-1 opacity-60">
            {collapseLines.map((line, i) => (
              <p key={i} className="text-lg sm:text-xl font-light italic text-gray-400">
                {line}
              </p>
            ))}
          </div>
        )}
        {result && !collapsing && (
          <div className="transition-opacity duration-300">
            <div className="space-y-1 mb-4">
              {result.lines.map((line, i) => (
                <p key={i} className="text-lg sm:text-xl font-light italic"
                  style={{ color }}>
                  {line}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-500">
              <span>
                <span style={{ color: color + 'cc' }}>{result.count}</span> / {result.total} shots
                ({(result.count / result.total * 100).toFixed(2)}%)
              </span>
              <span className="text-gray-700">|{result.bitstring}&#x27E9;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoveCard() {
  const { ref, visible } = useInView(0.1)
  const [showNoise, setShowNoise] = useState(false)

  return (
    <div ref={ref} className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">Love as Superposition</h3>
            <p className="text-xs font-mono text-gray-600 mt-1">
              9 qubits &middot; Tuna-9 hardware &middot; 12,288 shots &middot; Valentine&apos;s Day 2026
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: C.presence + '15', color: C.presence }}>hardware</span>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          One quantum state, two ways of reading it. Measure one way and you get a haiku of presence &mdash;
          love that is here, now, in the room. Measure the other way &mdash; the same state, the same qubits &mdash;
          and you get a haiku of absence &mdash; love remembered, love at a distance. Neither reading
          is more real than the other. You can&apos;t read both at once. This is complementarity:
          the quantum principle that some truths are mutually exclusive but jointly exhaustive.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          A third circuit uses a GHZ state for the all-or-nothing: every qubit agrees,
          so you get only two haiku &mdash; full presence or full intensity, never a mix.
          659 unique haiku emerged from 12,288 measurements on Tuna-9 hardware.
        </p>

        <ComplementaryPoems />
        <MeasureWidget />

        {/* Noise poems toggle */}
        <div className="mt-8 pt-6 border-t border-[#111827]">
          <button
            onClick={() => setShowNoise(!showNoise)}
            className="text-sm font-medium transition-colors"
            style={{ color: C.noise }}
          >
            {showNoise ? 'Hide' : 'Show'} noise haiku ({NOISE_POEMS.length})
          </button>

          {showNoise && (
            <div className="mt-6 space-y-6">
              <p className="text-sm text-gray-500">
                Real hardware is imperfect. Qubits lose coherence, gates introduce small errors,
                measurements go wrong. The quantum state drifts from the intended haiku into
                unexpected corners of possibility. But some of those accidents &mdash;
                the haiku the hardware wrote by mistake &mdash; are worth reading.
              </p>
              {NOISE_POEMS.map((poem, i) => (
                <div key={i} className="border-l-2 pl-4 py-1" style={{ borderColor: C.noise + '40' }}>
                  <div className="space-y-0.5 mb-2">
                    {poem.lines.map((line, j) => (
                      <p key={j} className="text-base font-light italic" style={{ color: C.noise }}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-gray-600 mb-1">
                    |{poem.bitstring}&#x27E9; &mdash; {poem.count} shots &mdash; {poem.source}
                  </p>
                  <p className="text-xs text-gray-500">{poem.commentary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Experiments() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Experiments</h2>
        <p className="text-sm text-gray-500 mb-10">
          Not haiku about quantum mechanics &mdash; haiku that are quantum. Each experiment uses a
          different quantum state to shape the poem&apos;s structure in ways no classical process can replicate.
        </p>

        <div className="space-y-8">
          <GHZHaikuCard />
          <BellCoupletsCard />
          <LoveCard />
        </div>
      </div>
    </div>
  )
}
