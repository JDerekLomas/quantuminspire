'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import {
  zeroState, applySingleQubitGate, applyCNOT, measure, probabilities,
  basisLabel, numQubits, H_GATE, X_GATE,
  type StateVector,
} from '@/lib/quantum'

type Circuit = {
  name: string
  description: string
  build: () => StateVector
  nQubits: number
}

const CIRCUITS: Circuit[] = [
  {
    name: 'Fair coin',
    description: 'H|0\u27E9 \u2014 50/50 superposition',
    nQubits: 1,
    build: () => {
      let s = zeroState(1)
      s = applySingleQubitGate(H_GATE, 0, s, 1)
      return s
    },
  },
  {
    name: 'Bell state',
    description: '\u03A6+ = (|00\u27E9+|11\u27E9)/\u221A2',
    nQubits: 2,
    build: () => {
      let s = zeroState(2)
      s = applySingleQubitGate(H_GATE, 0, s, 2)
      s = applyCNOT(0, 1, s, 2)
      return s
    },
  },
  {
    name: 'GHZ-3',
    description: '(|000\u27E9+|111\u27E9)/\u221A2',
    nQubits: 3,
    build: () => {
      let s = zeroState(3)
      s = applySingleQubitGate(H_GATE, 0, s, 3)
      s = applyCNOT(0, 1, s, 3)
      s = applyCNOT(0, 2, s, 3)
      return s
    },
  },
  {
    name: 'W state',
    description: '(|001\u27E9+|010\u27E9+|100\u27E9)/\u221A3',
    nQubits: 3,
    build: () => {
      const amp = 1 / Math.sqrt(3)
      const s: StateVector = Array.from({ length: 8 }, () => [0, 0] as [number, number])
      s[1] = [amp, 0]
      s[2] = [amp, 0]
      s[4] = [amp, 0]
      return s
    },
  },
  {
    name: 'Biased coin',
    description: 'Rx(\u03C0/6)|0\u27E9 \u2014 93/7 split',
    nQubits: 1,
    build: () => {
      let s = zeroState(1)
      const theta = Math.PI / 6
      const c = Math.cos(theta / 2), si = Math.sin(theta / 2)
      s = [
        [c * s[0][0] - si * s[1][1], c * s[0][1] + si * s[1][0]],
        [si * s[0][0] + c * s[1][1], -si * s[0][1] + c * s[1][0]],
      ]
      // simpler: just set directly
      s = [[Math.cos(Math.PI / 12), 0], [Math.sin(Math.PI / 12), 0]]
      return s
    },
  },
  {
    name: 'Uniform 3-qubit',
    description: 'H\u2297H\u2297H|000\u27E9 \u2014 equal prob',
    nQubits: 3,
    build: () => {
      let s = zeroState(3)
      s = applySingleQubitGate(H_GATE, 0, s, 3)
      s = applySingleQubitGate(H_GATE, 1, s, 3)
      s = applySingleQubitGate(H_GATE, 2, s, 3)
      return s
    },
  },
]

export default function MeasurementPage() {
  const [circuitIdx, setCircuitIdx] = useState(1) // Bell state default
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [totalShots, setTotalShots] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(10) // shots per frame
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(false)
  const stateRef = useRef<StateVector>(CIRCUITS[1].build())

  const circuit = CIRCUITS[circuitIdx]

  const reset = useCallback(() => {
    setIsRunning(false)
    runningRef.current = false
    setCounts({})
    setTotalShots(0)
    stateRef.current = CIRCUITS[circuitIdx].build()
  }, [circuitIdx])

  const selectCircuit = useCallback((idx: number) => {
    setIsRunning(false)
    runningRef.current = false
    setCircuitIdx(idx)
    setCounts({})
    setTotalShots(0)
    stateRef.current = CIRCUITS[idx].build()
  }, [])

  // Measurement animation loop
  useEffect(() => {
    if (!isRunning) return
    runningRef.current = true

    let frame: number
    const tick = () => {
      if (!runningRef.current) return
      const state = stateRef.current

      setCounts(prev => {
        const next = { ...prev }
        for (let i = 0; i < speed; i++) {
          const outcome = measure(state)
          next[outcome] = (next[outcome] || 0) + 1
        }
        return next
      })
      setTotalShots(prev => prev + speed)

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      runningRef.current = false
      cancelAnimationFrame(frame)
    }
  }, [isRunning, speed])

  // Canvas drawing
  const theoreticalProbs = probabilities(stateRef.current)
  const nq = circuit.nQubits
  const n = 1 << nq

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const barWidth = Math.max(20, Math.min(80, (w - 80) / n - 8))
    const gap = 8
    const totalBarWidth = n * (barWidth + gap) - gap
    const chartLeft = (w - totalBarWidth) / 2
    const chartTop = 30
    const chartHeight = h - 100
    const chartBottom = chartTop + chartHeight

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Y axis
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const y = chartTop + chartHeight * (1 - i / 4)
      ctx.fillText((i / 4).toFixed(2), chartLeft - 10, y + 3)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(w - 20, y)
      ctx.stroke()
    }

    const maxCount = Math.max(...Object.values(counts), 1)
    const maxFreq = totalShots > 0 ? maxCount / totalShots : 0

    for (let i = 0; i < n; i++) {
      const x = chartLeft + i * (barWidth + gap)
      const count = counts[i] || 0
      const freq = totalShots > 0 ? count / totalShots : 0
      const theoProb = theoreticalProbs[i]

      // Measured bar
      const barH = freq * chartHeight
      if (barH > 0) {
        const gradient = ctx.createLinearGradient(x, chartBottom - barH, x, chartBottom)
        gradient.addColorStop(0, '#00ff88')
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0.3)')
        ctx.fillStyle = gradient
        ctx.fillRect(x, chartBottom - barH, barWidth, barH)
      }

      // Theoretical line
      const theoY = chartBottom - theoProb * chartHeight
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x - 2, theoY)
      ctx.lineTo(x + barWidth + 2, theoY)
      ctx.stroke()
      ctx.setLineDash([])

      // Count
      if (totalShots > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = '10px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(count.toString(), x + barWidth / 2, chartBottom - barH - 8)
      }

      // Basis label
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(basisLabel(i, nq), x + barWidth / 2, chartBottom + 20)

      // Frequency
      if (totalShots > 0) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.6)'
        ctx.font = '9px JetBrains Mono, monospace'
        ctx.fillText((freq * 100).toFixed(1) + '%', x + barWidth / 2, chartBottom + 35)
      }
    }

    // Legend
    ctx.fillStyle = 'rgba(0, 255, 136, 0.6)'
    ctx.fillRect(w - 140, 12, 10, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('measured', w - 125, 21)

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(w - 140, 32)
    ctx.lineTo(w - 130, 32)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillText('theoretical', w - 125, 36)

  }, [counts, totalShots, theoreticalProbs, n, nq])

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setCounts(c => ({ ...c })))
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#00ff88]">Measurement Lab</span>
        <span className="text-xs font-mono text-gray-600 ml-auto">{totalShots.toLocaleString()} shots</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Chart */}
        <div className="flex-1 relative min-h-[400px]">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Circuit selection */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Circuit</h3>
            <div className="space-y-2">
              {CIRCUITS.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => selectCircuit(i)}
                  className={`w-full text-left px-3 py-2 rounded border transition-all ${
                    i === circuitIdx
                      ? 'bg-[#00ff88]/10 border-[#00ff88]/30 text-white'
                      : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'
                  }`}
                >
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[10px] font-mono text-gray-500">{c.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Playback controls */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Playback</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 px-4 py-2 text-sm font-mono rounded border transition-all ${
                  isRunning
                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]'
                }`}
              >
                {isRunning ? 'Pause' : 'Run'}
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded text-gray-400 hover:text-white transition-all"
              >
                Reset
              </button>
            </div>

            <div>
              <div className="text-xs font-mono text-gray-500 mb-1">Speed: {speed} shots/frame</div>
              <input
                type="range"
                min={1}
                max={100}
                value={speed}
                onChange={e => setSpeed(parseInt(e.target.value))}
                className="w-full accent-[#00ff88]"
              />
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Statistics</h3>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Total shots</span>
                <span className="text-white">{totalShots.toLocaleString()}</span>
              </div>
              {totalShots > 0 && Object.entries(counts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([idx, count]) => {
                  const i = Number(idx)
                  const freq = count / totalShots
                  const theo = theoreticalProbs[i]
                  const error = Math.abs(freq - theo)
                  return (
                    <div key={idx} className="flex justify-between text-gray-400">
                      <span>{basisLabel(i, nq)}</span>
                      <span>
                        <span className="text-[#00ff88]">{(freq * 100).toFixed(1)}%</span>
                        <span className="text-gray-600"> (&#xB1;{(error * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                  )
                })
              }
            </div>
          </div>

          {/* Related */}
          <div className="pt-3 mt-3 border-t border-white/5">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Related</span>
            <div className="mt-2 space-y-1">
              {[
                { href: '/bloch-sphere', label: 'Bloch Sphere' },
                { href: '/entanglement', label: 'Entanglement' },
                { href: '/noise', label: 'Noise Channels' },
                { href: '/explore', label: 'All Tools' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="block text-xs text-gray-500 hover:text-white transition-colors py-0.5">
                  {l.label} &rarr;
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
