'use client'

import { useState } from 'react'
import { useInView, C, sampleFromWeights } from '../lib/helpers'
import { ENTANGLED_LINES, FREE_MIDDLES } from '../data/wordBanks'
import { BELL_MATRIX } from '../data/distributions'

export default function EntanglementConstraint() {
  const { ref, visible } = useInView(0.1)
  const [firstIdx, setFirstIdx] = useState<number | null>(null)
  const [lastIdx, setLastIdx] = useState<number | null>(null)
  const [middleIdx, setMiddleIdx] = useState<number | null>(null)
  const [correlationHeld, setCorrelationHeld] = useState(true)
  const [startedFrom, setStartedFrom] = useState<'first' | 'last' | null>(null)
  const [hasBuiltOnce, setHasBuiltOnce] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const isComplete = firstIdx !== null && lastIdx !== null && middleIdx !== null

  const reset = () => {
    setFirstIdx(null)
    setLastIdx(null)
    setMiddleIdx(null)
    setStartedFrom(null)
  }

  const pickFirst = (idx: number) => {
    if (isComplete) return
    const row = BELL_MATRIX[idx]
    const last = sampleFromWeights(row)
    const mid = Math.floor(Math.random() * 8)
    setFirstIdx(idx)
    setLastIdx(last)
    setMiddleIdx(mid)
    setCorrelationHeld(idx === last)
    setStartedFrom('first')
    setHasBuiltOnce(true)
  }

  const pickLast = (idx: number) => {
    if (isComplete) return
    const col = BELL_MATRIX.map(row => row[idx])
    const first = sampleFromWeights(col)
    const mid = Math.floor(Math.random() * 8)
    setFirstIdx(first)
    setLastIdx(idx)
    setMiddleIdx(mid)
    setCorrelationHeld(first === idx)
    setStartedFrom('last')
    setHasBuiltOnce(true)
  }

  const entangleColor = C.blue
  const noiseColor = C.noise

  // CHSH data from Tuna-9 hardware
  const chshS = 2.544
  const classicalBound = 2.0
  const quantumMax = 2 * Math.SQRT2 // ~2.828

  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Write a Haiku with Entanglement</h2>
        <p className="text-sm text-gray-500 mb-3">
          Pick a first line. The last line is sampled from a distribution measured on quantum
          hardware &mdash; 4,096 shots from three Bell pairs on Tuna-9. The middle line is free:
          those qubits were never entangled with anything.
        </p>
        <p className="text-sm text-gray-500 mb-10">
          87% of the time, the first and last lines match &mdash; the entanglement held.
          13% of the time, hardware noise breaks the correlation, and you get an unexpected pairing.
          Technically, you&apos;re sampling from a stored histogram. But the distribution itself is
          certifiably non-classical: a CHSH test on the same circuit violates Bell&apos;s inequality
          at 38.8&sigma;. No classical process could have produced these statistics.
        </p>

        <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 sm:p-8">
          {/* First line section */}
          <div className="mb-2">
            <p className="text-xs font-mono text-gray-500 mb-3">First line <span className="text-gray-700">&mdash; 5 syllables</span></p>
            <div className="flex flex-wrap gap-2">
              {ENTANGLED_LINES.map((pair, i) => {
                const isChosen = firstIdx === i && startedFrom === 'first'
                const isHardware = firstIdx === i && startedFrom === 'last'
                const hwColor = correlationHeld ? entangleColor : noiseColor
                const isDisabled = isComplete && firstIdx !== i
                return (
                  <button
                    key={i}
                    onClick={() => pickFirst(i)}
                    disabled={isComplete}
                    className="px-3 py-1.5 rounded-full border text-sm transition-all duration-300"
                    style={{
                      borderColor: isChosen ? entangleColor + '80' : isHardware ? hwColor + '60' : '#1e293b',
                      backgroundColor: isChosen ? entangleColor + '20' : isHardware ? hwColor + '10' : 'transparent',
                      color: isChosen ? entangleColor : isHardware ? hwColor : isDisabled ? '#334155' : '#6b7280',
                      cursor: isComplete ? 'default' : 'pointer',
                    }}
                  >
                    {pair.first}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Entanglement indicator */}
          <div className="flex items-center py-3 pl-4">
            <div className="w-px border-l border-dashed h-6" style={{ borderColor: entangleColor + '40' }} />
            {isComplete && (
              <span className="text-[10px] font-mono ml-2 transition-opacity duration-500"
                style={{ color: correlationHeld ? entangleColor + '60' : noiseColor + '80' }}>
                {correlationHeld ? 'entangled \u2014 correlation held' : 'noise broke the correlation'}
              </span>
            )}
          </div>

          {/* Middle line — auto-sampled, shown only in poem */}
          <div className={`mb-2 transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <p className="text-xs font-mono text-gray-500 mb-3">
              Middle line <span className="text-gray-700">&mdash; 7 syllables, free qubit, uniformly random</span>
            </p>
            <div className="px-3 py-1.5 rounded-full border border-[#e2e8f0]/30 text-sm inline-block"
              style={{ color: '#e2e8f0' }}>
              {middleIdx !== null ? FREE_MIDDLES[middleIdx] : ''}
            </div>
          </div>

          {/* Entanglement indicator */}
          <div className={`flex items-center py-3 pl-4 transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-px border-l border-dashed h-6" style={{ borderColor: entangleColor + '40' }} />
          </div>

          {/* Last line section */}
          <div>
            <p className="text-xs font-mono text-gray-500 mb-3">Last line <span className="text-gray-700">&mdash; 5 syllables</span></p>
            <div className="flex flex-wrap gap-2">
              {ENTANGLED_LINES.map((pair, i) => {
                const isChosen = lastIdx === i && startedFrom === 'last'
                const isHardware = lastIdx === i && startedFrom === 'first'
                const hwColor = correlationHeld ? entangleColor : noiseColor
                const isDisabled = isComplete && lastIdx !== i
                return (
                  <button
                    key={i}
                    onClick={() => pickLast(i)}
                    disabled={isComplete}
                    className="px-3 py-1.5 rounded-full border text-sm transition-all duration-300"
                    style={{
                      borderColor: isChosen ? entangleColor + '80' : isHardware ? hwColor + '60' : '#1e293b',
                      backgroundColor: isChosen ? entangleColor + '20' : isHardware ? hwColor + '10' : 'transparent',
                      color: isChosen ? entangleColor : isHardware ? hwColor : isDisabled ? '#334155' : '#6b7280',
                      cursor: isComplete ? 'default' : 'pointer',
                    }}
                  >
                    {pair.last}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Completed poem */}
          {isComplete && firstIdx !== null && middleIdx !== null && lastIdx !== null && (
            <div className="mt-8 pt-6 border-t border-[#111827] text-center transition-opacity duration-500">
              <div className="space-y-1.5 mb-6">
                <p className="text-xl sm:text-2xl font-light italic" style={{ color: startedFrom === 'first' ? entangleColor : (correlationHeld ? entangleColor : noiseColor) }}>
                  {ENTANGLED_LINES[firstIdx].first}
                </p>
                <p className="text-xl sm:text-2xl font-light italic text-gray-300">
                  {FREE_MIDDLES[middleIdx]}
                </p>
                <p className="text-xl sm:text-2xl font-light italic" style={{ color: startedFrom === 'last' ? entangleColor : (correlationHeld ? entangleColor : noiseColor) }}>
                  {ENTANGLED_LINES[lastIdx].last}
                </p>
              </div>

              <p className="text-xs text-gray-600 mb-4">
                {correlationHeld
                  ? startedFrom === 'first'
                    ? 'You chose the first line. The hardware returned the matching last line \u2014 entanglement held across the middle.'
                    : 'You chose the last line. The hardware returned the matching first line \u2014 entanglement held across the middle.'
                  : startedFrom === 'first'
                    ? `You chose "${ENTANGLED_LINES[firstIdx].first}" \u2014 the hardware returned "${ENTANGLED_LINES[lastIdx].last}" instead of the matching line. Noise broke the Bell pair.`
                    : `You chose "${ENTANGLED_LINES[lastIdx].last}" \u2014 the hardware returned "${ENTANGLED_LINES[firstIdx].first}" instead of the matching line. Noise broke the Bell pair.`
                }
              </p>

              <button
                onClick={reset}
                className="px-4 py-2 rounded-full border text-xs font-medium transition-all hover:scale-105"
                style={{ borderColor: entangleColor + '40', color: entangleColor }}
              >
                {hasBuiltOnce && startedFrom === 'first'
                  ? 'Try again \u2014 start from the last line this time'
                  : 'Build another'}
              </button>
            </div>
          )}

          {/* Idle prompt */}
          {!isComplete && (
            <p className="text-xs text-gray-600 mt-6 text-center italic transition-opacity duration-500">
              {hasBuiltOnce
                ? 'Try starting from the other end. The correlation works both ways \u2014 neither line causes the other.'
                : 'Click any first line or any last line to begin.'}
            </p>
          )}
        </div>

        {/* Bell test statistics */}
        <div className="mt-6">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <span style={{ color: entangleColor + '60' }}>{showStats ? '\u25BC' : '\u25B6'}</span>
            {showStats ? 'Hide' : 'Show'} CHSH entanglement certification
          </button>

          {showStats && (
            <div className="mt-4 bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-5 text-xs text-gray-500 leading-relaxed">
              <p className="mb-4">
                The CHSH inequality certifies that these correlations could not have been produced
                by any classical source &mdash; no pre-programmed lookup table, no shared randomness,
                no hidden variables. If the correlations were classical, the statistic <em>S</em> can
                never exceed 2. Quantum entanglement allows up to 2&radic;2 &asymp; 2.83.
              </p>
              <p className="mb-4 text-gray-600">
                Caveat: this is not a loophole-free Bell test. All qubits share the same chip and
                cryostat &mdash; there&apos;s no space-like separation, no random basis switching.
                What the CHSH violation certifies is that the gates genuinely produced entangled states.
                The distribution you&apos;re sampling from was generated by quantum mechanics, not classical
                pre-computation.
              </p>

              {/* CHSH bar chart */}
              <div className="mb-4">
                <div className="flex items-end gap-3 h-32 mb-2">
                  {/* Classical bound bar */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-gray-600 mb-1">Classical max</span>
                    <div className="w-full rounded-t" style={{
                      height: `${(classicalBound / quantumMax) * 100}%`,
                      backgroundColor: '#334155',
                    }} />
                    <span className="text-[10px] font-mono text-gray-500 mt-1">S = 2.00</span>
                  </div>
                  {/* Hardware result bar */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] mb-1" style={{ color: entangleColor }}>Tuna-9 hardware</span>
                    <div className="w-full rounded-t" style={{
                      height: `${(chshS / quantumMax) * 100}%`,
                      backgroundColor: entangleColor + '40',
                      border: `1px solid ${entangleColor}60`,
                    }} />
                    <span className="text-[10px] font-mono mt-1" style={{ color: entangleColor }}>S = 2.54</span>
                  </div>
                  {/* Quantum max bar */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-gray-600 mb-1">Quantum max</span>
                    <div className="w-full rounded-t" style={{
                      height: '100%',
                      backgroundColor: '#1e1b4b',
                      border: '1px solid #312e81',
                    }} />
                    <span className="text-[10px] font-mono text-gray-500 mt-1">S = 2.83</span>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-600">
                  38.8&sigma; above the classical bound. Three Bell pairs, five measurement bases, 20,480 total shots.
                </p>
              </div>

              <p className="mb-2">
                <span className="font-mono" style={{ color: entangleColor + '80' }}>The circuit:</span>{' '}
                9 qubits on Tuna-9. Three Bell pairs on edges q2&ndash;q5, q4&ndash;q6, q7&ndash;q8
                (3 bits = 8 poem indices). Middle qubits q0, q1, q3 are in superposition but never
                entangled with the poem qubits &mdash; the circuit topology mirrors the poetic structure:
                first and last lines are bound, the middle stands alone.
                CHSH tested with Z, X, Ry(&pi;/4), Ry(&minus;&pi;/4) bases.
              </p>
              <p className="text-gray-700">
                Jobs 426263&ndash;426267 &middot; 2026-02-14 &middot; CompileStage.ROUTING &middot; Native CZ+Ry+Rz gate set
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
