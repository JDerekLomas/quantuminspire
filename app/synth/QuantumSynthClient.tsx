'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Nav from '@/components/Nav'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SpectrumData {
  molecule: string
  basis: string
  distances: Array<{
    r: number
    eigenvalues: number[]
    gaps: number[]
  }>
}

interface UniqueLevel {
  energy: number
  degeneracy: number
  idx: number
}

interface LevelParam extends UniqueLevel {
  freq: number
  amplitude: number
  gap: number
  active: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getUniqueLevels(eigenvalues: number[], tol = 0.0005): UniqueLevel[] {
  const levels: UniqueLevel[] = []
  let idx = 0
  for (const e of eigenvalues) {
    const existing = levels.find(l => Math.abs(l.energy - e) < tol)
    if (existing) {
      existing.degeneracy++
    } else {
      levels.push({ energy: e, degeneracy: 1, idx })
      idx++
    }
  }
  return levels
}

function interpolateEigenvalues(data: SpectrumData, r: number): number[] {
  const d = data.distances
  if (r <= d[0].r) return d[0].eigenvalues
  if (r >= d[d.length - 1].r) return d[d.length - 1].eigenvalues
  let i = 0
  while (i < d.length - 1 && d[i + 1].r < r) i++
  if (i >= d.length - 1) return d[d.length - 1].eigenvalues
  const t = (r - d[i].r) / (d[i + 1].r - d[i].r)
  const a = d[i].eigenvalues
  const b = d[i + 1].eigenvalues
  const len = Math.min(a.length, b.length)
  return a.slice(0, len).map((e, j) => e + t * (b[j] - e))
}

function lvColor(i: number, n: number): string {
  const t = n > 1 ? i / (n - 1) : 0
  return `rgb(${Math.round(t * 139)},${Math.round(212 - t * 140)},255)`
}

function lvColorA(i: number, n: number, a: number): string {
  const t = n > 1 ? i / (n - 1) : 0
  return `rgba(${Math.round(t * 139)},${Math.round(212 - t * 140)},255,${a})`
}

// Spectrogram color: navy → cyan → white
function specColor(mag: number): string {
  const t = mag / 255
  if (t < 0.25) {
    const s = t / 0.25
    return `rgb(${5 + s * 10},${5 + s * 20},${15 + s * 50})`
  } else if (t < 0.65) {
    const s = (t - 0.25) / 0.4
    return `rgb(${Math.round(15 * (1 - s))},${Math.round(25 + s * 187)},${Math.round(65 + s * 190)})`
  } else {
    const s = (t - 0.65) / 0.35
    return `rgb(${Math.round(s * 255)},${Math.round(212 + s * 43)},255)`
  }
}

// ─── CRT Monitor Shell ──────────────────────────────────────────────────────────

function CRTMonitor({ children, label, rightLabel }: { children: React.ReactNode; label: string; rightLabel?: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden" style={{
      background: '#0a0a0a',
      boxShadow: '0 0 30px rgba(0,180,255,0.06), inset 0 0 60px rgba(0,0,0,0.8)',
      border: '2px solid #1a1a2a',
    }}>
      {/* Bezel top with labels */}
      <div className="px-4 py-2 flex items-center justify-between" style={{
        background: 'linear-gradient(180deg, #1a1a2a 0%, #111118 100%)',
        borderBottom: '1px solid #222233',
      }}>
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</span>
        {rightLabel && <span className="text-[10px] font-mono text-gray-600">{rightLabel}</span>}
      </div>

      {/* Screen area with CRT effects */}
      <div className="relative">
        {children}

        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          mixBlendMode: 'multiply',
        }} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)',
        }} />

        {/* Subtle screen flicker */}
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{
          background: 'rgba(0,200,255,0.008)',
          animationDuration: '4s',
        }} />

        {/* Screen curvature highlight */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 120% 80% at 30% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)',
        }} />
      </div>

      {/* Bezel bottom */}
      <div className="h-2" style={{
        background: 'linear-gradient(0deg, #1a1a2a 0%, #111118 100%)',
        borderTop: '1px solid #0a0a14',
      }} />
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

const MOLECULE_INFO: Record<string, { name: string; formula: string; atoms: [string, string]; equilibrium: number; description: string }> = {
  H2: { name: 'Hydrogen', formula: 'H\u2082', atoms: ['H', 'H'], equilibrium: 0.74, description: 'The simplest molecule. Two protons, two electrons, one covalent bond.' },
  LiH: { name: 'Lithium Hydride', formula: 'LiH', atoms: ['Li', 'H'], equilibrium: 1.6, description: 'An ionic molecule. Lithium donates its electron to hydrogen — richer spectrum, more complex sound.' },
}

export default function QuantumSynthClient({ molecules, embedded }: { molecules: SpectrumData[]; embedded?: boolean }) {
  // Molecule selection
  const [molIdx, setMolIdx] = useState(0)
  const data = molecules[molIdx]
  const molInfo = MOLECULE_INFO[data.molecule] || { name: data.molecule, formula: data.molecule, atoms: ['?', '?'], equilibrium: 1.0, description: '' }

  // State
  const [bondDist, setBondDist] = useState(molInfo.equilibrium)
  const [excitation, setExcitation] = useState(1.5)
  const [baseFreq, setBaseFreq] = useState(65)
  const [octScale, setOctScale] = useState(1.2)
  const [volume, setVolume] = useState(0.35)
  const [playing, setPlaying] = useState(false)
  const [waveform, setWaveform] = useState<OscillatorType>('sine')
  const [disabled, setDisabled] = useState<Set<number>>(new Set())
  const [sweeping, setSweeping] = useState(false)
  const [sweepProgress, setSweepProgress] = useState(0)

  // Audio refs
  const ctxRef = useRef<AudioContext | null>(null)
  const oscsRef = useRef<OscillatorNode[]>([])
  const gainsRef = useRef<GainNode[]>([])
  const masterRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  // Canvas refs
  const specCanvasRef = useRef<HTMLCanvasElement>(null)
  const lvlCanvasRef = useRef<HTMLCanvasElement>(null)
  const specRafRef = useRef<number>(0)
  const sweepRafRef = useRef<number>(0)

  // Data bounds
  const minR = data.distances[0].r
  const maxR = data.distances[data.distances.length - 1].r

  // ─── Derived ────────────────────────────────────────────────────────────────

  const eigenvalues = useMemo(() => interpolateEigenvalues(data, bondDist), [data, bondDist])
  const levels = useMemo(() => getUniqueLevels(eigenvalues), [eigenvalues])

  const params: LevelParam[] = useMemo(() => {
    const e0 = levels[0]?.energy ?? 0
    return levels.map((lv, i) => {
      const gap = lv.energy - e0
      const freq = baseFreq * Math.pow(2, gap / octScale)
      const amp = i === 0 ? 1.0 : lv.degeneracy * Math.exp(-gap / excitation)
      return { ...lv, freq, amplitude: amp * (disabled.has(i) ? 0 : 1), gap, active: !disabled.has(i) }
    })
  }, [levels, baseFreq, octScale, excitation, disabled])

  const maxAmp = useMemo(() => Math.max(...params.map(p => p.amplitude), 0.001), [params])

  // Shared frequency range for both panels
  const freqRange = useMemo(() => {
    const freqs = params.map(p => p.freq)
    const lo = Math.min(...freqs)
    const hi = Math.max(...freqs)
    const pad = Math.max((hi - lo) * 0.12, 10)
    return { min: Math.max(lo - pad, 10), max: hi + pad }
  }, [params])

  // ─── Audio ──────────────────────────────────────────────────────────────────

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
      analyserRef.current = ctxRef.current.createAnalyser()
      analyserRef.current.fftSize = 4096
      analyserRef.current.smoothingTimeConstant = 0.82
      masterRef.current = ctxRef.current.createGain()
      masterRef.current.gain.value = volume
      masterRef.current.connect(analyserRef.current)
      analyserRef.current.connect(ctxRef.current.destination)
      freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array<ArrayBuffer>
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [volume])

  const startSound = useCallback(() => {
    const ctx = ensureCtx()
    oscsRef.current.forEach(o => { try { o.stop() } catch {} })
    oscsRef.current = []
    gainsRef.current = []

    const now = ctx.currentTime
    for (const p of params) {
      const osc = ctx.createOscillator()
      osc.type = waveform
      osc.frequency.setValueAtTime(Math.max(Math.min(p.freq, 4000), 20), now)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(Math.max((p.amplitude / maxAmp) * volume, 0.001), now)
      osc.connect(gain)
      gain.connect(masterRef.current!)
      osc.start(now)
      oscsRef.current.push(osc)
      gainsRef.current.push(gain)
    }
    setPlaying(true)
  }, [ensureCtx, params, maxAmp, volume, waveform])

  const stopSound = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    gainsRef.current.forEach(g => g.gain.setTargetAtTime(0, now, 0.04))
    setTimeout(() => {
      oscsRef.current.forEach(o => { try { o.stop() } catch {} })
      oscsRef.current = []
      gainsRef.current = []
    }, 200)
    setPlaying(false)
    if (sweeping) {
      cancelAnimationFrame(sweepRafRef.current)
      setSweeping(false)
    }
  }, [sweeping])

  // Update oscillators live when params change while playing
  useEffect(() => {
    if (!playing || !ctxRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime

    if (oscsRef.current.length !== params.length) {
      // Level count changed — rebuild
      oscsRef.current.forEach(o => { try { o.stop() } catch {} })
      oscsRef.current = []
      gainsRef.current = []
      for (const p of params) {
        const osc = ctx.createOscillator()
        osc.type = waveform
        osc.frequency.setValueAtTime(Math.max(Math.min(p.freq, 4000), 20), now)
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(Math.max((p.amplitude / maxAmp) * volume, 0.001), now)
        osc.connect(gain)
        gain.connect(masterRef.current!)
        osc.start(now)
        oscsRef.current.push(osc)
        gainsRef.current.push(gain)
      }
      return
    }

    params.forEach((p, i) => {
      const osc = oscsRef.current[i]
      const gain = gainsRef.current[i]
      if (!osc || !gain) return
      osc.type = waveform
      osc.frequency.cancelScheduledValues(now)
      osc.frequency.setValueAtTime(osc.frequency.value, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(Math.min(p.freq, 4000), 20), now + 0.08)
      const target = Math.max((p.amplitude / maxAmp) * volume, 0.001)
      gain.gain.setTargetAtTime(target, now, 0.04)
    })
  }, [params, maxAmp, volume, waveform, playing])

  // Master volume
  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.04)
    }
  }, [volume])

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(specRafRef.current)
      cancelAnimationFrame(sweepRafRef.current)
      oscsRef.current.forEach(o => { try { o.stop() } catch {} })
      ctxRef.current?.close()
    }
  }, [])

  // ─── Spectrogram animation ──────────────────────────────────────────────────

  // Store freq range in ref so RAF loop always sees latest
  const freqRangeRef = useRef(freqRange)
  freqRangeRef.current = freqRange
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const canvas = specCanvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#05050f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let alive = true
    const scrollPx = 2 * dpr
    const w = canvas.width
    const h = canvas.height
    const sampleRate = ctxRef.current?.sampleRate || 44100
    const binHz = sampleRate / 4096

    function draw() {
      if (!alive || !ctx || !canvas) return

      if (playing && analyserRef.current && freqDataRef.current) {
        analyserRef.current.getByteFrequencyData(freqDataRef.current)

        const { min: fMin, max: fMax } = freqRangeRef.current
        const fd = freqDataRef.current

        // Scroll left
        ctx.drawImage(canvas, -scrollPx, 0)
        ctx.fillStyle = '#05050f'
        ctx.fillRect(w - scrollPx, 0, scrollPx, h)

        // Draw new column — only bins within freq range
        const minBin = Math.max(0, Math.floor(fMin / binHz))
        const maxBin = Math.min(fd.length - 1, Math.ceil(fMax / binHz))
        for (let i = minBin; i <= maxBin; i++) {
          const freq = i * binHz
          const t = (freq - fMin) / (fMax - fMin)
          const y = h - t * h
          const barH = Math.max((binHz / (fMax - fMin)) * h, 1)
          ctx.fillStyle = specColor(fd[i])
          ctx.fillRect(w - scrollPx, y - barH / 2, scrollPx, barH)
        }

        // Overlay frequency reference lines for active levels
        const curParams = paramsRef.current
        ctx.globalAlpha = 0.2
        curParams.forEach((p, li) => {
          if (!p.active) return
          const t = (p.freq - fMin) / (fMax - fMin)
          const y = h - t * h
          if (y > 0 && y < h) {
            ctx.strokeStyle = lvColor(li, curParams.length)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(w - scrollPx, y)
            ctx.lineTo(w, y)
            ctx.stroke()
          }
        })
        ctx.globalAlpha = 1.0
      }

      specRafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { alive = false; cancelAnimationFrame(specRafRef.current) }
  }, [playing])

  // ─── Energy level diagram (y-axis = frequency, aligned with spectrogram) ───

  useEffect(() => {
    const canvas = lvlCanvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const pad = { top: 8, bottom: 8, left: 50, right: 16 }

    // Background
    ctx.fillStyle = '#05050f'
    ctx.fillRect(0, 0, w, h)

    if (params.length === 0) return

    // Use same frequency range as spectrogram
    const { min: fMin, max: fMax } = freqRange
    const fRange = fMax - fMin || 1

    // Map frequency to y-pixel (low freq at bottom, high freq at top)
    const yOf = (f: number) => {
      const t = (f - fMin) / fRange
      return h - pad.bottom - t * (h - pad.top - pad.bottom)
    }

    // Frequency axis
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left - 5, pad.top)
    ctx.lineTo(pad.left - 5, h - pad.bottom)
    ctx.stroke()

    // Axis label
    ctx.fillStyle = '#555'
    ctx.font = '9px monospace'
    ctx.save()
    ctx.translate(10, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillText('Frequency (Hz)', 0, 0)
    ctx.restore()

    // Scale ticks
    ctx.fillStyle = '#444'
    ctx.font = '8px monospace'
    ctx.textAlign = 'right'
    const nTicks = 6
    for (let i = 0; i <= nTicks; i++) {
      const f = fMin + (fRange * i) / nTicks
      const y = yOf(f)
      ctx.fillText(`${Math.round(f)}`, pad.left - 10, y + 3)
      ctx.strokeStyle = '#111'
      ctx.beginPath()
      ctx.moveTo(pad.left - 5, y)
      ctx.lineTo(pad.left - 2, y)
      ctx.stroke()
    }

    // Draw levels — positioned by their frequency
    params.forEach((p, i) => {
      const y = yOf(p.freq)
      const alpha = p.active ? 1 : 0.15
      const n = params.length

      // Glow when playing
      if (p.active && playing) {
        ctx.save()
        ctx.shadowColor = lvColor(i, n)
        ctx.shadowBlur = 14
        ctx.strokeStyle = lvColorA(i, n, 0.7)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(w - pad.right, y)
        ctx.stroke()
        ctx.restore()
      }

      // Line
      ctx.strokeStyle = lvColorA(i, n, alpha)
      ctx.lineWidth = i === 0 ? 2.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()

      // Label left
      ctx.fillStyle = lvColorA(i, n, alpha * 0.8)
      ctx.font = '9px monospace'
      ctx.textAlign = 'left'
      const subscript = i === 0 ? '\u2080' : i < 10 ? String.fromCharCode(0x2080 + i) : `${i}`
      ctx.fillText(`E${subscript}`, pad.left + 3, y - 4)

      // Freq + energy label right
      if (p.active) {
        ctx.textAlign = 'right'
        ctx.fillStyle = lvColorA(i, n, 0.5)
        ctx.fillText(`${p.freq.toFixed(0)} Hz`, w - pad.right - 2, y - 4)
      }

      // Degeneracy
      if (p.degeneracy > 1) {
        ctx.fillStyle = lvColorA(i, n, 0.35)
        ctx.font = '8px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`\u00d7${p.degeneracy}`, pad.left + 3, y + 11)
      }
    })

    // Bond distance indicator
    ctx.fillStyle = '#666'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`R = ${bondDist.toFixed(2)} \u00c5`, w - pad.right, 18)
  }, [params, freqRange, playing, bondDist])

  // ─── Sweep ──────────────────────────────────────────────────────────────────

  const handleSweep = useCallback(() => {
    if (sweeping) {
      cancelAnimationFrame(sweepRafRef.current)
      setSweeping(false)
      return
    }

    if (!playing) startSound()
    setSweeping(true)
    setSweepProgress(0)

    const duration = 12000
    const startTime = performance.now()
    const startR = minR
    const endR = maxR

    function animate(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      // Ease in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      setBondDist(startR + (endR - startR) * eased)
      setSweepProgress(t)
      if (t < 1) {
        sweepRafRef.current = requestAnimationFrame(animate)
      } else {
        setSweeping(false)
      }
    }

    sweepRafRef.current = requestAnimationFrame(animate)
  }, [sweeping, playing, startSound, minR, maxR])

  // ─── Toggle level ─────────────────────────────────────────────────────────

  const toggleLevel = useCallback((index: number) => {
    setDisabled(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────

  const activeCount = params.filter(p => p.active).length
  const topFreq = params[params.length - 1]?.freq ?? 0
  const nQubits = data.distances[0] ? Math.round(Math.log2(data.distances[0].eigenvalues.length)) : 4
  const dissociationThreshold = maxR * 0.7

  return (
    <div className={embedded ? 'text-white' : 'min-h-screen bg-black text-white'}>
      {!embedded && <Nav section="synth" />}

      <main className={embedded ? '' : 'max-w-7xl mx-auto px-6 pt-24 pb-20'}>
        {/* Hero */}
        {!embedded && (
        <section className="mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-3">Quantum Synth</p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-3">
            Hear the {molInfo.formula} Molecule
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
            {molInfo.description}{' '}
            Each energy level becomes a harmonic partial. Stretch the bond and hear
            the spectrum shift.
          </p>

          {/* Molecule selector */}
          {molecules.length > 1 && (
            <div className="flex gap-2 mt-4">
              {molecules.map((m, i) => {
                const info = MOLECULE_INFO[m.molecule]
                return (
                  <button key={m.molecule} onClick={() => {
                    if (playing) stopSound()
                    setMolIdx(i)
                    setDisabled(new Set())
                    setBondDist(info?.equilibrium ?? m.distances[Math.floor(m.distances.length / 2)].r)
                  }}
                    className={`text-xs font-mono px-4 py-2 rounded-lg border transition-all ${
                      molIdx === i
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-white/[0.02] border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                    }`}>
                    {info?.formula ?? m.molecule}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3 text-xs font-mono text-gray-500">
            <span>STO-3G basis</span>
            <span>&middot;</span>
            <span>{nQubits} qubits (Jordan-Wigner)</span>
            <span>&middot;</span>
            <span>{levels.length} unique levels</span>
            <span>&middot;</span>
            <span>Full diagonalization</span>
          </div>
        </section>
        )}

        {/* Molecule selector (embedded mode) */}
        {embedded && molecules.length > 1 && (
          <div className="flex gap-2 mb-4">
            {molecules.map((m, i) => {
              const info = MOLECULE_INFO[m.molecule]
              return (
                <button key={m.molecule} onClick={() => {
                  if (playing) stopSound()
                  setMolIdx(i)
                  setDisabled(new Set())
                  setBondDist(info?.equilibrium ?? m.distances[Math.floor(m.distances.length / 2)].r)
                }}
                  className={`text-xs font-mono px-4 py-2 rounded-lg border transition-all ${
                    molIdx === i
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-white/[0.02] border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                  }`}>
                  {info?.formula ?? m.molecule}
                </button>
              )
            })}
            <span className="text-xs font-mono text-gray-500 self-center ml-2">
              {nQubits} qubits &middot; {levels.length} levels
            </span>
          </div>
        )}

        {/* Visualization — CRT monitors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Energy levels */}
          <CRTMonitor
            label="Energy Levels"
            rightLabel={`${Math.round(freqRange.min)}\u2013${Math.round(freqRange.max)} Hz`}
          >
            <canvas ref={lvlCanvasRef} className="w-full" style={{ height: '420px' }} />
          </CRTMonitor>

          {/* Spectrogram */}
          <div className="lg:col-span-2">
            <CRTMonitor
              label="Spectrogram"
              rightLabel={playing ? undefined : `${baseFreq}\u2013${Math.round(topFreq)} Hz`}
            >
              {playing && (
                <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-red-400">REC</span>
                </div>
              )}
              <canvas ref={specCanvasRef} className="w-full" style={{ height: '420px' }} />
            </CRTMonitor>
          </div>
        </div>

        {/* Molecule + bond distance */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-3">
          <div className="flex items-center gap-6 mb-5">
            {/* Atom vis */}
            <div className="flex items-center shrink-0" style={{ width: '140px', justifyContent: 'center' }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black transition-shadow ${
                Math.abs(bondDist - molInfo.equilibrium) < 0.08
                  ? 'bg-gradient-to-br from-green-300 to-cyan-400 shadow-lg shadow-green-500/30'
                  : 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/20'
              }`}>
                {molInfo.atoms[0]}
              </div>
              <div
                className="h-0.5 transition-all duration-75"
                style={{
                  width: `${Math.max(4, (bondDist - minR) / (maxR - minR) * 60)}px`,
                  background: bondDist > dissociationThreshold
                    ? 'repeating-linear-gradient(90deg, rgba(139,92,246,0.4) 0 3px, transparent 3px 6px)'
                    : 'linear-gradient(90deg, #00d4ff, #8b5cf6)',
                  opacity: bondDist > dissociationThreshold * 1.1 ? 0.3 : 1,
                }}
              />
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black transition-shadow ${
                Math.abs(bondDist - molInfo.equilibrium) < 0.08
                  ? 'bg-gradient-to-br from-green-300 to-purple-400 shadow-lg shadow-green-500/30'
                  : 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/20'
              }`}>
                {molInfo.atoms[1]}
              </div>
            </div>

            {/* Slider */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Bond Distance</label>
                <span className="text-xs font-mono text-white">
                  {bondDist.toFixed(2)} {'\u00c5'}
                  {Math.abs(bondDist - molInfo.equilibrium) < 0.08 && (
                    <span className="text-green-400 ml-2">equilibrium</span>
                  )}
                  {bondDist > dissociationThreshold && (
                    <span className="text-red-400 ml-2">dissociating</span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min={minR}
                max={maxR}
                step={0.01}
                value={bondDist}
                onChange={e => { setBondDist(parseFloat(e.target.value)); if (sweeping) { cancelAnimationFrame(sweepRafRef.current); setSweeping(false) } }}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-600 mt-0.5">
                <span>{minR} {'\u00c5'} compressed</span>
                <span>{'\u2191'} {molInfo.equilibrium} {'\u00c5'}</span>
                <span>{maxR} {'\u00c5'} dissociated</span>
              </div>
            </div>
          </div>

          {/* Parameter knobs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Excitation</label>
                <span className="text-xs font-mono text-gray-300">{excitation.toFixed(1)}</span>
              </div>
              <input type="range" min="0.1" max="5" step="0.1" value={excitation}
                onChange={e => setExcitation(parseFloat(e.target.value))} className="w-full accent-purple-400" />
              <p className="text-[10px] text-gray-600 mt-0.5">Thermal weighting (Ha)</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Base Freq</label>
                <span className="text-xs font-mono text-gray-300">{baseFreq} Hz</span>
              </div>
              <input type="range" min="32" max="220" step="1" value={baseFreq}
                onChange={e => setBaseFreq(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
              <p className="text-[10px] text-gray-600 mt-0.5">Ground state pitch</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Spread</label>
                <span className="text-xs font-mono text-gray-300">{octScale.toFixed(1)} Ha/oct</span>
              </div>
              <input type="range" min="0.3" max="3" step="0.1" value={octScale}
                onChange={e => setOctScale(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
              <p className="text-[10px] text-gray-600 mt-0.5">Harmonic spacing</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Waveform</label>
              </div>
              <div className="flex gap-1">
                {(['sine', 'triangle', 'sawtooth', 'square'] as OscillatorType[]).map(w => (
                  <button key={w} onClick={() => setWaveform(w)}
                    className={`text-[10px] font-mono px-1.5 py-1 rounded border transition-colors ${
                      waveform === w
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300'
                    }`}>
                    {w.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">Volume</label>
                <span className="text-xs font-mono text-gray-300">{Math.round(volume * 100)}%</span>
              </div>
              <input type="range" min="0" max="0.8" step="0.01" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))} className="w-full accent-white" />
            </div>
          </div>
        </div>

        {/* Transport + layers */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-3">
          <div className="flex items-center gap-3 mb-4">
            {/* Play */}
            <button onClick={() => playing ? stopSound() : startSound()}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                playing
                  ? 'bg-red-500/20 border-2 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'
              }`}>
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="4" height="12" rx="1" />
                  <rect x="9" y="2" width="4" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <polygon points="4,1 14,8 4,15" />
                </svg>
              )}
            </button>

            {/* Sweep */}
            <button onClick={handleSweep}
              className={`text-xs font-mono px-4 py-2 rounded-lg border transition-all ${
                sweeping
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}>
              {sweeping ? 'Stop Sweep' : 'Auto-Sweep'}
            </button>

            {sweeping && (
              <div className="flex-1 max-w-xs">
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-100"
                    style={{ width: `${sweepProgress * 100}%` }} />
                </div>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                  {bondDist.toFixed(2)} {'\u00c5'} — {sweepProgress < 0.3 ? 'compressed' : sweepProgress < 0.7 ? 'equilibrium region' : 'dissociating'}
                </p>
              </div>
            )}

            <div className="flex-1" />

            <span className="text-xs font-mono text-gray-500">
              {activeCount}/{levels.length} levels
            </span>
          </div>

          {/* Level toggles */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">Harmonic Layers</p>
            <div className="flex flex-wrap gap-1.5">
              {params.map((p, i) => (
                <button key={i} onClick={() => toggleLevel(i)}
                  className={`text-[10px] font-mono px-2 py-1.5 rounded border transition-all ${
                    p.active ? 'border-white/20' : 'bg-white/[0.01] border-white/5 text-gray-600'
                  }`}
                  style={p.active ? {
                    backgroundColor: lvColorA(i, params.length, 0.12),
                    borderColor: lvColorA(i, params.length, 0.3),
                    color: lvColor(i, params.length),
                  } : undefined}>
                  E{i < 10 ? String.fromCharCode(0x2080 + i) : i}
                  {p.degeneracy > 1 && <span className="text-gray-500 ml-1">{'\u00d7'}{p.degeneracy}</span>}
                  <span className="text-gray-500 ml-1">{p.freq.toFixed(0)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* How it works */}
        {!embedded && (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-400">
            <div>
              <p className="text-white font-bold mb-1">Energy {'\u2192'} Frequency</p>
              <p>
                Each energy eigenvalue of {molInfo.formula} maps to an oscillator.
                The gap from ground state sets the pitch: f = {baseFreq} {'\u00d7'} 2{'\u207b'}{'\u0394'}E/{octScale.toFixed(1)}.
                These are the same transitions spectroscopists measure with light — now mapped to sound.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">Boltzmann Weighting</p>
              <p>
                Amplitude follows a thermal distribution: a = e{'\u207b'}{'\u0394'}E/kT.
                Low excitation emphasizes the fundamental. Crank it up and all
                levels contribute equally — like heating the molecule.
              </p>
            </div>
            <div>
              <p className="text-white font-bold mb-1">Bond Stretching</p>
              <p>
                Pull the atoms apart and listen. Near equilibrium ({molInfo.equilibrium} {'\u00c5'}),
                the ground state is deepest. At dissociation, energy levels converge and
                the harmonic structure collapses — the sound of a bond breaking.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Technical details */}
        {!embedded && (
        <details className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
          <summary className="px-6 py-3 text-xs font-mono text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
            Technical Details
          </summary>
          <div className="px-6 pb-4 text-xs text-gray-500 space-y-2 font-mono">
            <p>Hamiltonian: {molInfo.formula} in STO-3G minimal basis, Jordan-Wigner encoding on {nQubits} qubits ({Math.pow(2, nQubits)}{'\u00d7'}{Math.pow(2, nQubits)} matrix).</p>
            <p>Eigenvalues: Full diagonalization (numpy.linalg.eigvalsh) at {data.distances.length} bond distances from {minR} to {maxR} {'\u00c5'}.</p>
            <p>Degeneracies arise from symmetry: orbital angular momentum, spin. {data.molecule === 'LiH' ? 'LiH has 12 spin-orbitals giving 4096 eigenvalues.' : 'H\u2082 has 4 spin-orbitals giving 16 eigenvalues, typically 9-10 unique levels.'}</p>
            <p>Computed with PySCF + OpenFermion. Same pipeline used for our VQE hardware experiments on Tuna-9 and IBM Quantum.</p>
          </div>
        </details>
        )}
      </main>
    </div>
  )
}
