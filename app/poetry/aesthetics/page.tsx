'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { DIST_GHZ, DIST_Z, DIST_X } from '../data/distributions'
import { C } from '../lib/helpers'

// C major scale: 8 notes per register, one per haiku line
// bits[0:3] → line1 → low octave, bits[3:6] → line2 → mid, bits[6:9] → line3 → high
const SCALES = [
  [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63], // C3–C4
  [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25], // C4–C5
  [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50], // C5–C6
]

function qSample(dist: Record<string, number>): string {
  const entries = Object.entries(dist)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  let r = Math.random() * total
  for (const [bs, count] of entries) { r -= count; if (r <= 0) return bs }
  return entries.at(-1)![0]
}

function cSample(dist: Record<string, number>): string {
  const total = Object.values(dist).reduce((s, c) => s + c, 0)
  const w = [new Float64Array(8), new Float64Array(8), new Float64Array(8)]
  for (const [bs, count] of Object.entries(dist)) {
    const p = count / total
    w[0][parseInt(bs.slice(0, 3), 2)] += p
    w[1][parseInt(bs.slice(3, 6), 2)] += p
    w[2][parseInt(bs.slice(6, 9), 2)] += p
  }
  const pick = (a: Float64Array) => {
    let r = Math.random()
    for (let i = 0; i < 8; i++) { r -= a[i]; if (r <= 0) return i }
    return 7
  }
  return [0, 1, 2].map(i => pick(w[i]).toString(2).padStart(3, '0')).join('')
}

function probImage(dist: Record<string, number>): number[] {
  const total = Object.values(dist).reduce((s, c) => s + c, 0)
  const p = new Array(9).fill(0)
  for (const [bs, count] of Object.entries(dist))
    for (let i = 0; i < 9; i++) if (bs[i] === '1') p[i] += count / total
  return p
}

// --- UI components ---

function MiniGrid({ bs, color, size = 6 }: { bs: string; color: string; size?: number }) {
  return (
    <div className="inline-grid grid-cols-3" style={{ gap: 1, width: size * 3 + 2 }}>
      {bs.split('').map((b, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: 1,
          backgroundColor: b === '1' ? color : '#0a0f1a',
        }} />
      ))}
    </div>
  )
}

function BigGrid({ bs, color }: { bs: string; color: string }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {bs.split('').map((b, i) => (
        <div key={i} className="transition-colors duration-100" style={{
          width: 52, height: 52, borderRadius: 3,
          backgroundColor: b === '1' ? color : '#0a0f1a',
        }} />
      ))}
    </div>
  )
}

function ProbGrid({ probs, color, size = 52 }: { probs: number[]; color: string; size?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {probs.map((p, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: 3,
          backgroundColor: color, opacity: Math.max(0.05, p),
        }} />
      ))}
    </div>
  )
}

// --- Audio ---

function scheduleChords(
  dist: Record<string, number>,
  classical: boolean,
  ctx: AudioContext,
  pan: number,
  onSample: (bs: string) => void,
): () => void {
  const panner = ctx.createStereoPanner()
  panner.pan.value = pan
  const master = ctx.createGain()
  master.gain.value = 0.1
  master.connect(panner)
  panner.connect(ctx.destination)

  const N = 16, GAP = 0.35
  const now = ctx.currentTime + 0.05
  const oscs: OscillatorNode[] = []
  const timers: ReturnType<typeof setTimeout>[] = []

  for (let n = 0; n < N; n++) {
    const bs = classical ? cSample(dist) : qSample(dist)
    const t = now + n * GAP
    timers.push(setTimeout(() => onSample(bs), n * GAP * 1000))

    for (let reg = 0; reg < 3; reg++) {
      const idx = parseInt(bs.slice(reg * 3, reg * 3 + 3), 2)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = SCALES[reg][idx]
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.03)
      g.gain.setValueAtTime(0.05, t + GAP - 0.06)
      g.gain.linearRampToValueAtTime(0, t + GAP)
      osc.connect(g); g.connect(master)
      osc.start(t); osc.stop(t + GAP + 0.01)
      oscs.push(osc)
    }
  }
  return () => {
    oscs.forEach(o => { try { o.stop() } catch {} })
    timers.forEach(clearTimeout)
  }
}

// --- Page ---

export default function AestheticsPage() {
  const ctxRef = useRef<AudioContext | null>(null)
  const stopFns = useRef<Array<() => void>>([])

  const [playing, setPlaying] = useState<string | null>(null)
  const [qBs, setQBs] = useState('000000000')
  const [cBs, setCBs] = useState('000000000')
  const [qHist, setQHist] = useState<string[]>([])
  const [cHist, setCHist] = useState<string[]>([])
  const [texSeed, setTexSeed] = useState(0)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const stopAll = useCallback(() => {
    stopFns.current.forEach(fn => fn())
    stopFns.current = []
    setPlaying(null)
  }, [])

  const playCompare = useCallback(() => {
    stopAll()
    setQHist([]); setCHist([])
    setPlaying('ghz')
    const ctx = getCtx()
    const s1 = scheduleChords(DIST_GHZ, false, ctx, -0.7, bs => {
      setQBs(bs); setQHist(h => [...h.slice(-15), bs])
    })
    const s2 = scheduleChords(DIST_GHZ, true, ctx, 0.7, bs => {
      setCBs(bs); setCHist(h => [...h.slice(-15), bs])
    })
    stopFns.current = [s1, s2]
    setTimeout(stopAll, 16 * 350 + 200)
  }, [stopAll, getCtx])

  const playBasis = useCallback((basis: 'z' | 'x') => {
    stopAll()
    setPlaying(basis)
    const dist = basis === 'z' ? DIST_Z : DIST_X
    const s = scheduleChords(dist, false, getCtx(), 0, bs => {
      if (basis === 'z') { setQBs(bs); setQHist(h => [...h.slice(-15), bs]) }
      else { setCBs(bs); setCHist(h => [...h.slice(-15), bs]) }
    })
    stopFns.current = [s]
    setTimeout(stopAll, 16 * 350 + 200)
  }, [stopAll, getCtx])

  // Texture grids: 64 samples each
  const qTexture = useMemo(() =>
    Array.from({ length: 64 }, () => qSample(DIST_GHZ)),
    [texSeed] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const cTexture = useMemo(() =>
    Array.from({ length: 64 }, () => cSample(DIST_GHZ)),
    [texSeed] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const zProb = useMemo(() => probImage(DIST_Z), [])
  const xProb = useMemo(() => probImage(DIST_X), [])

  return (
    <div className="min-h-screen bg-[#030712] text-gray-300 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-mono text-gray-600 mb-4">
          <a href="/poetry" className="hover:text-gray-400">&larr; poetry</a>
        </p>
        <h1 className="text-2xl font-bold text-gray-200 mb-2">Quantum Aesthetics</h1>
        <p className="text-sm text-gray-500 mb-4">
          What does quantum correlation look, sound, and feel like? Three examples
          from Tuna-9 hardware data.
        </p>
        <p className="text-sm text-gray-500 mb-12">
          The mapping: each 9-bit measurement is three groups of 3 bits &mdash;
          one per haiku line, one per octave of C major. A bitstring is
          simultaneously a poem, a 3&times;3 image, and a 3-note chord.
        </p>

        {/* ---- 1. ENTANGLEMENT ---- */}
        <section className="mb-20">
          <h2 className="text-lg font-bold text-gray-200 mb-2">1. The Sound of Entanglement</h2>
          <p className="text-sm text-gray-500 mb-2">
            A GHZ state forces all 9 qubits to agree &mdash; measurement collapses to
            either all-zeros or all-ones. Mapped to C major, that&apos;s two clean chords one
            octave apart: C3+C4+C5 or C4+C5+C6.
          </p>
          <p className="text-sm text-gray-500 mb-2">
            The classical version uses the same per-note probabilities but with no correlations
            between the three registers. Each note is chosen independently. Same ingredients,
            no entanglement &mdash; the result is audibly different.
          </p>
          <p className="text-xs text-gray-600 mb-6">
            Headphones recommended. Quantum plays left, classical plays right.
          </p>

          <button
            onClick={playing === 'ghz' ? stopAll : playCompare}
            className="px-4 py-2 rounded text-sm font-mono border transition-all mb-8"
            style={{
              borderColor: playing === 'ghz' ? '#ef4444' : C.ghz,
              color: playing === 'ghz' ? '#ef4444' : C.ghz,
            }}
          >
            {playing === 'ghz' ? 'stop' : 'play: quantum (L) vs classical (R)'}
          </button>

          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-mono text-gray-600 mb-3">quantum &mdash; Tuna-9 GHZ state</p>
              <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 flex flex-col items-center">
                <BigGrid bs={qBs} color={C.ghz} />
                <p className="text-[10px] font-mono text-gray-700 mt-3">|{qBs}&#x27E9;</p>
              </div>
              <div className="flex gap-1 mt-3 flex-wrap min-h-[20px]">
                {qHist.map((bs, i) => <MiniGrid key={`q${i}`} bs={bs} color={C.ghz} />)}
              </div>
            </div>
            <div>
              <p className="text-xs font-mono text-gray-600 mb-3">classical &mdash; same marginals, no correlation</p>
              <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6 flex flex-col items-center">
                <BigGrid bs={cBs} color={C.noise} />
                <p className="text-[10px] font-mono text-gray-700 mt-3">|{cBs}&#x27E9;</p>
              </div>
              <div className="flex gap-1 mt-3 flex-wrap min-h-[20px]">
                {cHist.map((bs, i) => <MiniGrid key={`c${i}`} bs={bs} color={C.noise} />)}
              </div>
            </div>
          </div>

          {/* Texture comparison */}
          <p className="text-sm text-gray-500 mb-2">
            64 samples tiled as texture. Quantum GHZ produces coherent bands &mdash;
            all pixels in each tile agree. Classical produces salt-and-pepper.
            The per-pixel statistics are identical. Only the correlations differ.
          </p>
          <button
            onClick={() => setTexSeed(s => s + 1)}
            className="text-xs font-mono text-gray-600 hover:text-gray-400 mb-4 transition-colors"
          >
            resample
          </button>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-mono text-gray-700 mb-2">quantum</p>
              <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-4">
                <div className="grid grid-cols-8 gap-1">
                  {qTexture.map((bs, i) => <MiniGrid key={i} bs={bs} color={C.ghz} />)}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono text-gray-700 mb-2">classical</p>
              <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-4">
                <div className="grid grid-cols-8 gap-1">
                  {cTexture.map((bs, i) => <MiniGrid key={i} bs={bs} color={C.noise} />)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- 2. COMPLEMENTARITY ---- */}
        <section className="mb-20">
          <h2 className="text-lg font-bold text-gray-200 mb-2">2. Two Readings of One State</h2>
          <p className="text-sm text-gray-500 mb-6">
            Same quantum state, different measurement basis. The Z-basis produces
            chords clustered around C3+C4+C5 (low, stable, present). The X-basis
            scatters energy across E, G, and upper registers (diffuse, reaching, absent).
            The probability images below show the average brightness of each pixel &mdash;
            each row maps to one haiku line, one musical register.
          </p>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => { setQHist([]); playBasis('z') }}
              className="px-4 py-2 rounded text-sm font-mono border transition-all"
              style={{ borderColor: C.presence, color: C.presence }}
            >
              {playing === 'z' ? 'playing...' : 'play Z-basis (presence)'}
            </button>
            <button
              onClick={() => { setCHist([]); playBasis('x') }}
              className="px-4 py-2 rounded text-sm font-mono border transition-all"
              style={{ borderColor: C.absence, color: C.absence }}
            >
              {playing === 'x' ? 'playing...' : 'play X-basis (absence)'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="flex flex-col items-center">
              <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6">
                <ProbGrid probs={zProb} color={C.presence} />
              </div>
              <p className="text-xs font-mono mt-3" style={{ color: C.presence }}>
                Z-basis &middot; presence
              </p>
              <div className="grid grid-cols-3 gap-x-3 text-[10px] font-mono text-gray-700 mt-2">
                {zProb.map((p, i) => (
                  <span key={i} className="text-center">{(p * 100).toFixed(0)}%</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-700 mt-2">
                row 1 = haiku line 1 = low octave
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-6">
                <ProbGrid probs={xProb} color={C.absence} />
              </div>
              <p className="text-xs font-mono mt-3" style={{ color: C.absence }}>
                X-basis &middot; absence
              </p>
              <div className="grid grid-cols-3 gap-x-3 text-[10px] font-mono text-gray-700 mt-2">
                {xProb.map((p, i) => (
                  <span key={i} className="text-center">{(p * 100).toFixed(0)}%</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-700 mt-2">
                row 1 = haiku line 1 = low octave
              </p>
            </div>
          </div>
        </section>

        {/* ---- 3. THE CLAIM ---- */}
        <section className="mb-16">
          <h2 className="text-lg font-bold text-gray-200 mb-2">3. What&apos;s New Here</h2>
          <p className="text-sm text-gray-500 mb-4">
            Quantum noise is not random noise. It has structure &mdash; correlations
            imposed by entanglement, asymmetries carved by the physical hardware,
            interference patterns that depend on the measurement angle. That structure
            is perceptible: you can hear the difference between entangled and independent
            sampling; you can see the difference between quantum texture and classical texture.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            The same 9-bit measurement simultaneously encodes a poem (word banks), an image
            (pixel grid), and a chord (frequency registers). These aren&apos;t three separate
            mappings &mdash; they&apos;re three views of the same quantum object. When
            entanglement constrains one, it constrains all three. When decoherence dissolves
            one, it dissolves all three. The aesthetics of quantum are medium-independent.
          </p>
          <p className="text-sm text-gray-500">
            This is the hypothesis: quantum processes have a characteristic aesthetic texture
            that is distinguishable from classical randomness, and that texture transfers
            across sensory modalities because it lives in the correlation structure,
            not in any particular encoding.
          </p>
        </section>

        <p className="text-[10px] font-mono text-gray-700 text-center">
          Tuna-9 superconducting hardware &middot; 4,096 shots per distribution &middot;
          native CZ+Ry+Rz gate set &middot; all data from real measurements
        </p>
      </div>
    </div>
  )
}
