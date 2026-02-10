'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  bellState, ghzState, wState, zeroState,
  applySingleQubitGate, H_GATE,
  densityMatrix, partialTrace, vonNeumannEntropy2x2, concurrence,
  basisLabel, cMag, cPhase, numQubits,
  type StateVector, type Complex,
} from '@/lib/quantum'

function phaseToColor(phase: number): string {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
  return `hsl(${hue}, 80%, 60%)`
}

type Preset = {
  name: string
  symbol: string
  description: string
  build: () => StateVector
  nQubits: number
}

const PRESETS: Preset[] = [
  { name: 'Bell \u03A6+', symbol: '(|00\u27E9+|11\u27E9)/\u221A2', description: 'Maximally entangled', build: () => bellState(0), nQubits: 2 },
  { name: 'Bell \u03A6-', symbol: '(|00\u27E9-|11\u27E9)/\u221A2', description: 'Phase-flipped Bell', build: () => bellState(1), nQubits: 2 },
  { name: 'Bell \u03A8+', symbol: '(|01\u27E9+|10\u27E9)/\u221A2', description: 'Bit-flipped Bell', build: () => bellState(2), nQubits: 2 },
  { name: 'Bell \u03A8-', symbol: '(|01\u27E9-|10\u27E9)/\u221A2', description: 'Singlet state', build: () => bellState(3), nQubits: 2 },
  { name: 'GHZ-3', symbol: '(|000\u27E9+|111\u27E9)/\u221A2', description: '3-qubit GHZ', build: () => ghzState(3), nQubits: 3 },
  { name: 'W-3', symbol: '(|001\u27E9+|010\u27E9+|100\u27E9)/\u221A3', description: '3-qubit W state', build: () => wState(3), nQubits: 3 },
  { name: 'Product', symbol: '|+\u27E9\u2297|0\u27E9', description: 'NOT entangled', build: () => {
    let s = zeroState(2)
    s = applySingleQubitGate(H_GATE, 0, s, 2)
    return s
  }, nQubits: 2 },
  { name: '|00\u27E9', symbol: '|00\u27E9', description: 'Separable ground', build: () => zeroState(2), nQubits: 2 },
]

export default function EntanglementPage() {
  const [presetIdx, setPresetIdx] = useState(0)
  const [state, setState] = useState<StateVector>(bellState(0))
  const densityRef = useRef<HTMLCanvasElement>(null)
  const reducedRef = useRef<HTMLCanvasElement>(null)

  const preset = PRESETS[presetIdx]
  const nq = numQubits(state)
  const dim = state.length
  const rho = densityMatrix(state)

  // Compute entanglement metrics
  const isTwo = nq === 2
  const c = isTwo ? concurrence(state) : null
  const reduced0 = partialTrace(rho, 0, nq) // trace out qubit 0
  const entropy0 = vonNeumannEntropy2x2(reduced0)
  const reduced1 = nq >= 2 ? partialTrace(rho, nq - 1, nq) : null // trace out last qubit
  const entropy1 = reduced1 ? vonNeumannEntropy2x2(reduced1) : 0

  const selectPreset = useCallback((idx: number) => {
    setPresetIdx(idx)
    setState(PRESETS[idx].build())
  }, [])

  // Draw density matrix
  useEffect(() => {
    const canvas = densityRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const padding = 50
    const cellSize = Math.min((w - padding * 2) / dim, (h - padding * 2) / dim)
    const gridSize = cellSize * dim
    const left = (w - gridSize) / 2
    const top = (h - gridSize) / 2

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Title
    ctx.fillStyle = 'rgba(255, 107, 157, 0.8)'
    ctx.font = '12px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('\u03C1 = |\u03C8\u27E9\u27E8\u03C8| (density matrix)', w / 2, top - 20)

    // Draw cells
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        const x = left + j * cellSize
        const y = top + i * cellSize
        const mag = cMag(rho[i][j])
        const phase = cPhase(rho[i][j])

        // Cell background (magnitude as brightness)
        if (mag > 1e-6) {
          ctx.fillStyle = phaseToColor(phase)
          ctx.globalAlpha = 0.15 + 0.85 * mag
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          ctx.globalAlpha = 1
        }

        // Cell border
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx.strokeRect(x, y, cellSize, cellSize)

        // Value text for small matrices
        if (dim <= 8 && cellSize > 30 && mag > 1e-3) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.font = `${Math.min(10, cellSize / 4)}px JetBrains Mono, monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(mag.toFixed(2), x + cellSize / 2, y + cellSize / 2)
        }
      }
    }

    // Row/column labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = `${Math.min(10, cellSize / 3)}px JetBrains Mono, monospace`
    for (let i = 0; i < dim; i++) {
      // Row labels (left)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(basisLabel(i, nq), left - 5, top + i * cellSize + cellSize / 2)
      // Column labels (top)
      ctx.save()
      ctx.translate(left + i * cellSize + cellSize / 2, top - 5)
      ctx.rotate(-Math.PI / 4)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(basisLabel(i, nq), 0, 0)
      ctx.restore()
    }

    // Phase legend
    const legendX = w - 40, legendY = h - 40, legendR = 14
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
    ctx.arc(legendX, legendY, legendR - 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('phase', legendX, legendY + legendR + 10)

  }, [state, rho, dim, nq])

  // Draw reduced density matrices
  useEffect(() => {
    const canvas = reducedRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    const matrices = [
      { label: `Tr_0(\u03C1) (trace out q0)`, matrix: reduced0 },
      ...(reduced1 ? [{ label: `Tr_${nq - 1}(\u03C1) (trace out q${nq - 1})`, matrix: reduced1 }] : []),
    ]

    const cellSize = Math.min(40, (w - 40) / (matrices.length * 3))
    const matDim = reduced0.length
    const totalWidth = matrices.length * (matDim * cellSize + 30) - 30

    let offsetX = (w - totalWidth) / 2

    for (const { label, matrix } of matrices) {
      // Label
      ctx.fillStyle = 'rgba(255, 107, 157, 0.6)'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(label, offsetX + matDim * cellSize / 2, 15)

      const topY = 25

      for (let i = 0; i < matDim; i++) {
        for (let j = 0; j < matDim; j++) {
          const x = offsetX + j * cellSize
          const y = topY + i * cellSize
          const mag = cMag(matrix[i][j])
          const phase = cPhase(matrix[i][j])

          if (mag > 1e-6) {
            ctx.fillStyle = phaseToColor(phase)
            ctx.globalAlpha = 0.15 + 0.85 * mag
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
            ctx.globalAlpha = 1
          }

          ctx.strokeStyle = 'rgba(255,255,255,0.05)'
          ctx.strokeRect(x, y, cellSize, cellSize)

          if (cellSize > 25 && mag > 1e-3) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.font = '9px JetBrains Mono, monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(mag.toFixed(2), x + cellSize / 2, y + cellSize / 2)
          }
        }
      }

      offsetX += matDim * cellSize + 30
    }

  }, [state, reduced0, reduced1, nq])

  // Resize
  useEffect(() => {
    const canvas = densityRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setState(s => [...s] as StateVector))
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#ff6b9d]">Entanglement Lab</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Visualizations */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative min-h-[300px]">
            <canvas ref={densityRef} className="absolute inset-0 w-full h-full" />
          </div>
          <div className="h-[120px] relative border-t border-white/5">
            <canvas ref={reducedRef} className="absolute inset-0 w-full h-full" />
          </div>
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Presets */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">States</h3>
            <div className="space-y-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => selectPreset(i)}
                  className={`w-full text-left px-3 py-2 rounded border transition-all ${
                    i === presetIdx
                      ? 'bg-[#ff6b9d]/10 border-[#ff6b9d]/30 text-white'
                      : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-[10px] font-mono text-gray-600">{p.nQubits}q</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Entanglement metrics */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Entanglement Metrics</h3>
            <div className="space-y-3">
              {/* Concurrence */}
              {c !== null && (
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-gray-400">Concurrence</span>
                    <span className={c > 0.01 ? 'text-[#ff6b9d]' : 'text-gray-600'}>{c.toFixed(4)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff6b9d] rounded-full transition-all" style={{ width: `${c * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Entropy */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-gray-400">S(Tr_0) entropy</span>
                  <span className={entropy0 > 0.01 ? 'text-[#8b5cf6]' : 'text-gray-600'}>{entropy0.toFixed(4)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#8b5cf6] rounded-full transition-all" style={{ width: `${entropy0 * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-gray-400">S(Tr_{nq - 1}) entropy</span>
                  <span className={entropy1 > 0.01 ? 'text-[#8b5cf6]' : 'text-gray-600'}>{entropy1.toFixed(4)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#8b5cf6] rounded-full transition-all" style={{ width: `${entropy1 * 100}%` }} />
                </div>
              </div>

              {/* Entangled indicator */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <div className={`w-3 h-3 rounded-full ${entropy0 > 0.01 ? 'bg-[#ff6b9d] animate-pulse' : 'bg-gray-700'}`} />
                <span className={`text-sm font-mono ${entropy0 > 0.01 ? 'text-[#ff6b9d]' : 'text-gray-600'}`}>
                  {entropy0 > 0.01 ? 'Entangled' : 'Separable'}
                </span>
              </div>
            </div>
          </div>

          {/* State vector */}
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">State Vector</h3>
            <div className="text-xs font-mono text-gray-400 space-y-0.5 max-h-[200px] overflow-y-auto">
              {state.map((amp, i) => {
                const mag = cMag(amp)
                if (mag < 1e-6) return null
                return (
                  <div key={i} className="flex justify-between">
                    <span>{basisLabel(i, nq)}</span>
                    <span>
                      <span className="text-white">{mag.toFixed(4)}</span>
                      <span className="text-gray-600"> e^{(cPhase(amp) * 180 / Math.PI).toFixed(0)}&#xB0;i</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
