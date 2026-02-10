'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  zeroState, applySingleQubitGate, applyCNOT, probabilities, amplitudeInfo,
  basisLabel, numQubits, H_GATE, X_GATE, Y_GATE, Z_GATE, S_GATE, T_GATE,
  type StateVector, type Gate,
} from '@/lib/quantum'

function phaseToColor(phase: number): string {
  // Map phase [-pi, pi] to hue [0, 360]
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
  return `hsl(${hue}, 80%, 60%)`
}

export default function StateVectorPage() {
  const [nQubits, setNQubits] = useState(3)
  const [state, setState] = useState<StateVector>(zeroState(3))
  const [history, setHistory] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const resetCircuit = useCallback((n: number) => {
    setNQubits(n)
    setState(zeroState(n))
    setHistory([])
  }, [])

  const applyGate = useCallback((name: string, gate: Gate, target: number) => {
    setState(prev => {
      const nq = numQubits(prev)
      return applySingleQubitGate(gate, target, prev, nq)
    })
    setHistory(prev => [...prev, `${name}(q${target})`])
  }, [])

  const applyCnot = useCallback((control: number, target: number) => {
    setState(prev => {
      const nq = numQubits(prev)
      return applyCNOT(control, target, prev, nq)
    })
    setHistory(prev => [...prev, `CX(q${control},q${target})`])
  }, [])

  const probs = probabilities(state)
  const amps = amplitudeInfo(state)
  const nq = numQubits(state)

  // Canvas drawing
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
    const n = state.length
    const barPadding = 2
    const barWidth = Math.max(4, (w - 60) / n - barPadding)
    const chartLeft = 40
    const chartTop = 20
    const chartHeight = h - 80
    const chartBottom = chartTop + chartHeight

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Y axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const y = chartTop + (chartHeight * (1 - i / 4))
      const val = (i / 4).toFixed(2)
      ctx.fillText(val, chartLeft - 5, y + 3)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Bars
    for (let i = 0; i < n; i++) {
      const x = chartLeft + i * (barWidth + barPadding)
      const prob = probs[i]
      const barH = prob * chartHeight
      const phase = amps[i].phase
      const color = phaseToColor(phase)

      // Bar
      if (prob > 1e-10) {
        ctx.fillStyle = color
        ctx.globalAlpha = 0.3 + 0.7 * prob
        ctx.fillRect(x, chartBottom - barH, barWidth, barH)
        ctx.globalAlpha = 1

        // Phase indicator (small circle at top of bar)
        const indicatorY = chartBottom - barH - 8
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x + barWidth / 2, indicatorY, 3, 0, Math.PI * 2)
        ctx.fill()

        // Probability text if bar is tall enough
        if (barH > 20 && barWidth > 20) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.font = '9px JetBrains Mono, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(prob.toFixed(2), x + barWidth / 2, chartBottom - barH + 14)
        }
      }

      // Basis label
      if (n <= 32 || i % Math.ceil(n / 32) === 0) {
        ctx.save()
        ctx.translate(x + barWidth / 2, chartBottom + 8)
        ctx.rotate(n > 16 ? -Math.PI / 4 : 0)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.font = `${n > 16 ? 8 : 10}px JetBrains Mono, monospace`
        ctx.textAlign = n > 16 ? 'right' : 'center'
        ctx.fillText(basisLabel(i, nq), 0, 0)
        ctx.restore()
      }
    }

    // Phase color wheel legend
    const legendX = w - 50, legendY = 30, legendR = 16
    for (let i = 0; i < 64; i++) {
      const a1 = (i / 64) * Math.PI * 2
      const a2 = ((i + 1) / 64) * Math.PI * 2
      ctx.fillStyle = phaseToColor(a1 - Math.PI)
      ctx.beginPath()
      ctx.moveTo(legendX, legendY)
      ctx.arc(legendX, legendY, legendR, a1, a2)
      ctx.fill()
    }
    ctx.fillStyle = '#0a0a1a'
    ctx.beginPath()
    ctx.arc(legendX, legendY, legendR - 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('phase', legendX, legendY + legendR + 12)

  }, [state, probs, amps, nq])

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setState(s => [...s] as StateVector))
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [])

  const gateButtons: [string, Gate][] = [
    ['H', H_GATE], ['X', X_GATE], ['Y', Y_GATE], ['Z', Z_GATE],
    ['S', S_GATE], ['T', T_GATE],
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#8b5cf6]">State Vector Explorer</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Chart */}
        <div className="flex-1 relative min-h-[400px]">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Qubit count */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Qubits</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => resetCircuit(n)}
                  className={`w-8 h-8 text-sm font-mono rounded transition-all ${
                    n === nQubits
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-mono text-gray-600 mt-1">
              {state.length} basis states (2^{nQubits})
            </div>
          </div>

          {/* Apply gates */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Apply Gate</h3>
            {Array.from({ length: nQubits }, (_, qi) => (
              <div key={qi} className="mb-3">
                <div className="text-xs font-mono text-gray-500 mb-1.5">q{qi}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {gateButtons.map(([name, gate]) => (
                    <button
                      key={name}
                      onClick={() => applyGate(name, gate, qi)}
                      className="px-2 py-1 text-xs font-mono bg-white/5 hover:bg-[#8b5cf6]/20 border border-white/10 hover:border-[#8b5cf6]/40 rounded transition-all text-white"
                    >
                      {name}
                    </button>
                  ))}
                  {qi > 0 && (
                    <button
                      onClick={() => applyCnot(qi, 0)}
                      className="px-2 py-1 text-xs font-mono bg-white/5 hover:bg-[#8b5cf6]/20 border border-white/10 hover:border-[#8b5cf6]/40 rounded transition-all text-yellow-300"
                    >
                      CX&#x2192;q0
                    </button>
                  )}
                  {qi < nQubits - 1 && (
                    <button
                      onClick={() => applyCnot(qi, qi + 1)}
                      className="px-2 py-1 text-xs font-mono bg-white/5 hover:bg-[#8b5cf6]/20 border border-white/10 hover:border-[#8b5cf6]/40 rounded transition-all text-yellow-300"
                    >
                      CX&#x2192;q{qi + 1}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Circuit history */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Circuit</h3>
            <div className="text-xs font-mono text-gray-400 bg-white/[0.02] rounded p-2 min-h-[40px] max-h-[120px] overflow-y-auto">
              {history.length === 0 ? '(empty)' : history.join(' \u2192 ')}
            </div>
          </div>

          <button
            onClick={() => resetCircuit(nQubits)}
            className="w-full px-3 py-2 text-xs font-mono text-gray-400 border border-white/10 rounded hover:border-white/20 hover:text-white transition-all"
          >
            Reset Circuit
          </button>
        </div>
      </div>
    </div>
  )
}
