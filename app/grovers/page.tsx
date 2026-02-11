'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import {
  uniformSuperposition, groverOracle, groverDiffusion, probabilities,
  basisLabel, optimalGroverIterations,
  type StateVector,
} from '@/lib/quantum'

export default function GroversPage() {
  const [nQubits, setNQubits] = useState(3)
  const [target, setTarget] = useState(5)
  const [steps, setSteps] = useState<StateVector[]>([])
  const [stepIdx, setStepIdx] = useState(0)
  const [stepType, setStepType] = useState<'init' | 'oracle' | 'diffusion'>('init')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const n = 1 << nQubits
  const optIter = optimalGroverIterations(nQubits)

  // Build all steps
  const buildSteps = useCallback((nq: number, tgt: number) => {
    const allSteps: { state: StateVector; type: 'init' | 'oracle' | 'diffusion' }[] = []
    let state = uniformSuperposition(nq)
    allSteps.push({ state: [...state.map(c => [...c])] as StateVector, type: 'init' })

    const maxIter = optimalGroverIterations(nq) + 2
    for (let i = 0; i < maxIter; i++) {
      // Oracle
      state = groverOracle(state, tgt)
      allSteps.push({ state: [...state.map(c => [...c])] as StateVector, type: 'oracle' })
      // Diffusion
      state = groverDiffusion(state)
      allSteps.push({ state: [...state.map(c => [...c])] as StateVector, type: 'diffusion' })
    }
    return allSteps
  }, [])

  const [allSteps, setAllSteps] = useState(() => buildSteps(3, 5))

  const resetSim = useCallback((nq: number, tgt: number) => {
    const t = Math.min(tgt, (1 << nq) - 1)
    setNQubits(nq)
    setTarget(t)
    const steps = buildSteps(nq, t)
    setAllSteps(steps)
    setStepIdx(0)
    setStepType('init')
  }, [buildSteps])

  const currentState = allSteps[stepIdx]?.state || uniformSuperposition(nQubits)
  const currentType = allSteps[stepIdx]?.type || 'init'
  const probs = probabilities(currentState)
  const iterNum = stepIdx === 0 ? 0 : Math.ceil(stepIdx / 2)

  const stepForward = useCallback(() => {
    setStepIdx(prev => Math.min(prev + 1, allSteps.length - 1))
  }, [allSteps])

  const stepBack = useCallback(() => {
    setStepIdx(prev => Math.max(prev - 1, 0))
  }, [])

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
    const barWidth = Math.max(12, Math.min(60, (w - 80) / n - 4))
    const gap = 4
    const totalBarWidth = n * (barWidth + gap) - gap
    const chartLeft = (w - totalBarWidth) / 2
    const chartTop = 40
    const chartHeight = h - 120
    const chartBottom = chartTop + chartHeight

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Title
    ctx.fillStyle = 'rgba(255, 140, 66, 0.8)'
    ctx.font = '12px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    const typeLabel = currentType === 'init' ? 'Initial superposition'
      : currentType === 'oracle' ? `Iteration ${iterNum}: Oracle (phase flip)`
      : `Iteration ${iterNum}: Diffusion (amplify)`
    ctx.fillText(typeLabel, chartLeft, 25)

    // Optimal marker
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`optimal: ${optIter} iterations`, w - chartLeft, 25)

    // Y axis
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '10px JetBrains Mono, monospace'
    for (let i = 0; i <= 4; i++) {
      const y = chartTop + chartHeight * (1 - i / 4)
      ctx.fillText((i / 4).toFixed(2), chartLeft - 8, y + 3)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(w - 20, y)
      ctx.stroke()
    }

    // Mean line
    const meanProb = 1 / n
    const meanY = chartBottom - meanProb * chartHeight
    ctx.strokeStyle = 'rgba(255, 140, 66, 0.3)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(chartLeft, meanY)
    ctx.lineTo(chartLeft + totalBarWidth, meanY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255, 140, 66, 0.4)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('1/N', chartLeft + totalBarWidth + 5, meanY + 3)

    // Bars
    for (let i = 0; i < n; i++) {
      const x = chartLeft + i * (barWidth + gap)
      const prob = probs[i]
      const barH = prob * chartHeight
      const isTarget = i === target

      // Bar color
      if (isTarget) {
        const gradient = ctx.createLinearGradient(x, chartBottom - barH, x, chartBottom)
        gradient.addColorStop(0, '#ff8c42')
        gradient.addColorStop(1, 'rgba(255, 140, 66, 0.4)')
        ctx.fillStyle = gradient
      } else {
        ctx.fillStyle = `rgba(148, 163, 184, ${0.2 + 0.3 * prob * n})`
      }
      ctx.fillRect(x, chartBottom - barH, barWidth, barH)

      // Border for target
      if (isTarget) {
        ctx.strokeStyle = '#ff8c42'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x, chartBottom - barH, barWidth, barH)
      }

      // Probability text
      if (barWidth > 16) {
        ctx.fillStyle = isTarget ? 'rgba(255, 140, 66, 0.9)' : 'rgba(255,255,255,0.4)'
        ctx.font = '9px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(prob.toFixed(3), x + barWidth / 2, chartBottom - barH - 6)
      }

      // Basis label
      ctx.fillStyle = isTarget ? '#ff8c42' : 'rgba(255,255,255,0.3)'
      ctx.font = `${n > 16 ? 8 : 10}px JetBrains Mono, monospace`
      ctx.textAlign = 'center'

      if (n <= 32 || i === target || i % Math.ceil(n / 16) === 0) {
        ctx.save()
        ctx.translate(x + barWidth / 2, chartBottom + 10)
        if (n > 16) ctx.rotate(-Math.PI / 4)
        ctx.textAlign = n > 16 ? 'right' : 'center'
        ctx.fillText(basisLabel(i, nQubits), 0, 0)
        ctx.restore()
      }
    }

  }, [currentState, currentType, probs, n, nQubits, target, iterNum, optIter])

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setStepIdx(s => s))
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#ff8c42]">Grover&apos;s Search</span>
        <span className="text-xs font-mono text-gray-600 ml-auto">
          P(target) = {(probs[target] * 100).toFixed(1)}%
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Chart */}
        <div className="flex-1 relative min-h-[400px]">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Step controls */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Step Through</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={stepBack}
                disabled={stepIdx === 0}
                className="flex-1 px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded disabled:opacity-30 hover:bg-white/10 transition-all text-white"
              >
                &larr; Back
              </button>
              <button
                onClick={stepForward}
                disabled={stepIdx >= allSteps.length - 1}
                className="flex-1 px-3 py-2 text-sm font-mono bg-[#ff8c42]/20 border border-[#ff8c42]/40 rounded disabled:opacity-30 hover:bg-[#ff8c42]/30 transition-all text-[#ff8c42]"
              >
                Step &rarr;
              </button>
            </div>
            <div className="text-xs font-mono text-gray-500">
              Step {stepIdx} / {allSteps.length - 1} | Iteration {iterNum}
            </div>
            <input
              type="range"
              min={0}
              max={allSteps.length - 1}
              value={stepIdx}
              onChange={e => setStepIdx(parseInt(e.target.value))}
              className="w-full mt-2 accent-[#ff8c42]"
            />
          </div>

          {/* Qubits */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Qubits</h3>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map(nq => (
                <button
                  key={nq}
                  onClick={() => resetSim(nq, Math.min(target, (1 << nq) - 1))}
                  className={`w-10 h-8 text-sm font-mono rounded transition-all ${
                    nq === nQubits
                      ? 'bg-[#ff8c42] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {nq}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-mono text-gray-600 mt-1">
              {n} states, optimal = {optIter} iterations
            </div>
          </div>

          {/* Target */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
              Target: {basisLabel(target, nQubits)}
            </h3>
            <input
              type="range"
              min={0}
              max={n - 1}
              value={target}
              onChange={e => resetSim(nQubits, parseInt(e.target.value))}
              className="w-full accent-[#ff8c42]"
            />
          </div>

          {/* Explanation */}
          <div className="p-3 rounded bg-white/[0.02] border border-white/5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">How it works</h3>
            <div className="text-xs text-gray-400 space-y-2">
              <p>1. Start with uniform superposition (all equal)</p>
              <p>2. <span className="text-[#ff8c42]">Oracle</span>: flip the sign of the target state</p>
              <p>3. <span className="text-[#ff8c42]">Diffusion</span>: reflect all amplitudes about the mean</p>
              <p>4. Repeat ~&#x03C0;/4 &middot; &#x221A;N times for maximum probability</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
