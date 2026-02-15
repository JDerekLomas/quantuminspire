'use client'

import { useState, useMemo } from 'react'
import { PRESENCE_LINES, ABSENCE_LINES } from '../data/wordBanks'
import { DIST_Z, DIST_X } from '../data/distributions'
import { C, bitstringToPoem } from '../lib/helpers'
import type { WordBank } from '../lib/helpers'

type SampledPoem = {
  bitstring: string
  count: number
  prob: number
  lines: string[]
}

function sampleFromDist(
  dist: Record<string, number>,
  bank: WordBank,
  n: number
): SampledPoem[] {
  const total = Object.values(dist).reduce((s, c) => s + c, 0)
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1])

  // Weighted sampling without replacement
  const pool = entries.map(([bs, count]) => ({ bs, count, weight: count }))
  const results: SampledPoem[] = []
  let remaining = pool.map(p => ({ ...p }))

  for (let i = 0; i < Math.min(n, remaining.length); i++) {
    const totalW = remaining.reduce((s, p) => s + p.weight, 0)
    let r = Math.random() * totalW
    let picked = 0
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].weight
      if (r <= 0) { picked = j; break }
    }
    const p = remaining[picked]
    results.push({
      bitstring: p.bs,
      count: p.count,
      prob: p.count / total,
      lines: bitstringToPoem(p.bs, bank),
    })
    remaining.splice(picked, 1)
  }
  return results
}

function topFromDist(
  dist: Record<string, number>,
  bank: WordBank
): SampledPoem[] {
  const total = Object.values(dist).reduce((s, c) => s + c, 0)
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([bs, count]) => ({
      bitstring: bs,
      count,
      prob: count / total,
      lines: bitstringToPoem(bs, bank),
    }))
}

export default function ReviewPage() {
  const [basis, setBasis] = useState<'presence' | 'absence'>('presence')
  const [mode, setMode] = useState<'hardware' | 'all'>('hardware')
  const [count, setCount] = useState(60)
  const [seed, setSeed] = useState(0)

  const bank = basis === 'presence' ? PRESENCE_LINES : ABSENCE_LINES
  const dist = basis === 'presence' ? DIST_Z : DIST_X
  const color = basis === 'presence' ? C.presence : C.absence
  const totalShots = Object.values(dist).reduce((s, c) => s + c, 0)
  const uniqueBitstrings = Object.keys(dist).length

  const allPoems = useMemo(() => topFromDist(dist, bank), [basis]) // eslint-disable-line react-hooks/exhaustive-deps
  const sampled = useMemo(() => sampleFromDist(dist, bank, count), [basis, count, seed]) // eslint-disable-line react-hooks/exhaustive-deps

  const poems = mode === 'hardware' ? sampled : allPoems

  return (
    <div className="min-h-screen bg-[#030712] text-gray-300 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <h1 className="text-xl font-bold text-gray-200 mr-4">Haiku Review</h1>

          <button
            onClick={() => setBasis('presence')}
            className="px-3 py-1.5 rounded text-sm font-mono transition-all"
            style={{
              backgroundColor: basis === 'presence' ? C.presence + '20' : 'transparent',
              color: basis === 'presence' ? C.presence : '#475569',
              border: `1px solid ${basis === 'presence' ? C.presence + '40' : '#1e293b'}`,
            }}
          >
            Z-basis &middot; presence
          </button>
          <button
            onClick={() => setBasis('absence')}
            className="px-3 py-1.5 rounded text-sm font-mono transition-all"
            style={{
              backgroundColor: basis === 'absence' ? C.absence + '20' : 'transparent',
              color: basis === 'absence' ? C.absence : '#475569',
              border: `1px solid ${basis === 'absence' ? C.absence + '40' : '#1e293b'}`,
            }}
          >
            X-basis &middot; absence
          </button>

          <div className="h-6 w-px bg-[#1e293b]" />

          <button
            onClick={() => setMode('hardware')}
            className={`px-3 py-1.5 rounded text-sm font-mono border transition-all ${mode === 'hardware' ? 'border-gray-600 text-gray-300' : 'border-[#1e293b] text-gray-600'}`}
          >
            sample {count}
          </button>
          <button
            onClick={() => setMode('all')}
            className={`px-3 py-1.5 rounded text-sm font-mono border transition-all ${mode === 'all' ? 'border-gray-600 text-gray-300' : 'border-[#1e293b] text-gray-600'}`}
          >
            all {uniqueBitstrings} measured
          </button>

          {mode === 'hardware' && (
            <>
              <div className="h-6 w-px bg-[#1e293b]" />
              <select
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="bg-[#0a0f1a] border border-[#1e293b] rounded px-2 py-1.5 text-sm font-mono text-gray-400"
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={60}>60</option>
                <option value={100}>100</option>
              </select>
              <button
                onClick={() => setSeed(s => s + 1)}
                className="px-3 py-1.5 rounded text-sm font-mono border border-[#1e293b] text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all"
              >
                re-measure
              </button>
            </>
          )}
        </div>

        {/* Hardware provenance */}
        <div className="mb-6 text-xs font-mono text-gray-600">
          Tuna-9 &middot; {totalShots.toLocaleString()} shots &middot; {uniqueBitstrings} unique bitstrings &middot;
          {basis === 'presence' ? ' Z-basis (computational)' : ' X-basis (Hadamard rotated)'}
        </div>

        {/* Word bank reference */}
        <details className="mb-8">
          <summary className="text-xs font-mono text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
            word bank reference
          </summary>
          <div className="mt-3 bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-4">
            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-600 block mb-1">line 1 (5 syl) &middot; bits [6:9]</span>
                {bank.line1.map((l, i) => (
                  <div key={i} className="text-gray-500"><span className="text-gray-700">{i.toString(2).padStart(3, '0')}</span> {l}</div>
                ))}
              </div>
              <div>
                <span className="text-gray-600 block mb-1">line 2 (7 syl) &middot; bits [3:6]</span>
                {bank.line2.map((l, i) => (
                  <div key={i} className="text-gray-500"><span className="text-gray-700">{i.toString(2).padStart(3, '0')}</span> {l}</div>
                ))}
              </div>
              <div>
                <span className="text-gray-600 block mb-1">line 3 (5 syl) &middot; bits [0:3]</span>
                {bank.line3.map((l, i) => (
                  <div key={i} className="text-gray-500"><span className="text-gray-700">{i.toString(2).padStart(3, '0')}</span> {l}</div>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Poem grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {poems.map((poem, i) => (
            <div
              key={`${seed}-${poem.bitstring}`}
              className="bg-[#0a0f1a] rounded border border-[#1e293b] p-4 hover:border-gray-700 transition-colors group"
            >
              <div className="space-y-0.5 mb-3">
                {poem.lines.map((line, j) => (
                  <p
                    key={j}
                    className="text-sm font-light italic leading-relaxed"
                    style={{ color, opacity: 0.6 + poem.prob * 4 }}
                  >
                    {line}
                  </p>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-700 group-hover:text-gray-500 transition-colors">
                  |{poem.bitstring}&#x27E9;
                </span>
                <span className="text-[10px] font-mono text-gray-700 group-hover:text-gray-500 transition-colors">
                  {poem.count} shots &middot; {(poem.prob * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-700 text-center mt-8 font-mono">
          {poems.length} haiku &middot; sampled from Tuna-9 hardware distribution &middot;
          weighted by measurement probability
        </p>
      </div>
    </div>
  )
}
