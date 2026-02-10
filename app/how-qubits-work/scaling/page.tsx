'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const COLORS = {
  accent: '#8b5cf6',
  peak: '#00d4ff',
  sum: '#ff6b9d',
  border: '#1f2937',
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function AxisLabel({ text }: { text: string }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-600">
      {text}
    </span>
  )
}

function AssumptionTag({ text }: { text: string }) {
  return (
    <span className="px-2 py-1 rounded border border-white/10 text-[10px] font-mono text-gray-500 bg-white/5">
      {text}
    </span>
  )
}

function lorentzian(delta: number, gamma: number): number {
  return 1 / (1 + (delta / gamma) * (delta / gamma))
}

export default function HowQubitsWorkScalingPage() {
  const [spacing, setSpacing] = useState(4)
  const [linewidth, setLinewidth] = useState(4)
  const [twoQErrorPct, setTwoQErrorPct] = useState(0.6)
  const [swaps, setSwaps] = useState(3)

  const crowdingPlot = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minX = -40
    const maxX = 40

    const centers = [-2, -1, 0, 1, 2].map((i) => i * spacing)

    const sumPoints: string[] = []
    for (let i = 0; i <= 240; i += 1) {
      const frac = i / 240
      const xVal = minX + frac * (maxX - minX)
      const x = pad.left + frac * (width - pad.left - pad.right)
      let total = 0
      for (const c of centers) {
        total += lorentzian(xVal - c, linewidth)
      }
      const y = pad.top + (1 - Math.min(total / 2.2, 1)) * (height - pad.top - pad.bottom)
      sumPoints.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }

    const ticks = [-40, -20, 0, 20, 40].map((value) => {
      const frac = (value - minX) / (maxX - minX)
      return {
        value,
        x: pad.left + frac * (width - pad.left - pad.right),
      }
    })

    const neighborOverlap = lorentzian(spacing, linewidth)

    return { width, height, pad, centers, sumPoints, ticks, neighborOverlap }
  }, [spacing, linewidth])

  const routingPlot = useMemo(() => {
    const width = 520
    const height = 220
    const pad = { left: 40, right: 20, top: 20, bottom: 40 }
    const e = twoQErrorPct / 100
    const points: string[] = []
    for (let hop = 0; hop <= 8; hop += 1) {
      const gates = hop * 3
      const success = Math.pow(1 - e, gates)
      const x = pad.left + (hop / 8) * (width - pad.left - pad.right)
      const y = pad.top + (1 - success) * (height - pad.top - pad.bottom)
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }

    return { width, height, pad, points }
  }, [twoQErrorPct])

  const twoQError = twoQErrorPct / 100
  const totalGates = swaps * 3
  const success = Math.pow(1 - twoQError, totalGates)
  const failure = 1 - success

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
          &larr; zoo
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
          How Qubits Work
        </span>
        <span className="text-sm font-semibold text-[#a78bfa]">How We Scale</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">How We Scale</h1>
          <p className="text-gray-400 max-w-3xl">
            Scaling means avoiding frequency collisions and routing through imperfect hardware.
            This page connects spectral crowding to crosstalk, and routing distance to compounded
            two-qubit errors.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Spectral Crowding</h2>
            <AssumptionTag text="Lorentzian peaks" />
            <AssumptionTag text="5 qubits" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="Spacing" />
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={0.5}
                  value={spacing}
                  onChange={(e) => setSpacing(clamp(parseFloat(e.target.value), 1, 12))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((spacing - 1) / 11) * 100}%, #111827 ${((spacing - 1) / 11) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{spacing.toFixed(1)} MHz</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="Linewidth" />
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={linewidth}
                  onChange={(e) => setLinewidth(clamp(parseFloat(e.target.value), 1, 10))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.sum} ${((linewidth - 1) / 9) * 100}%, #111827 ${((linewidth - 1) / 9) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{linewidth.toFixed(1)} MHz</span>
              </div>

              <div className="ml-auto text-xs font-mono text-gray-400">
                Neighbor overlap: {(crowdingPlot.neighborOverlap * 100).toFixed(1)}%
              </div>
            </div>

            <svg viewBox={`0 0 ${crowdingPlot.width} ${crowdingPlot.height}`} className="w-full">
              <rect
                x={crowdingPlot.pad.left}
                y={crowdingPlot.pad.top}
                width={crowdingPlot.width - crowdingPlot.pad.left - crowdingPlot.pad.right}
                height={crowdingPlot.height - crowdingPlot.pad.top - crowdingPlot.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              {crowdingPlot.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={crowdingPlot.height - crowdingPlot.pad.bottom}
                    x2={tick.x}
                    y2={crowdingPlot.height - crowdingPlot.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={crowdingPlot.height - crowdingPlot.pad.bottom + 18}
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              {crowdingPlot.centers.map((center) => {
                const frac = (center + 40) / 80
                const x = crowdingPlot.pad.left + frac * (crowdingPlot.width - crowdingPlot.pad.left - crowdingPlot.pad.right)
                return (
                  <line
                    key={center}
                    x1={x}
                    y1={crowdingPlot.pad.top}
                    x2={x}
                    y2={crowdingPlot.height - crowdingPlot.pad.bottom}
                    stroke="#1f2937"
                    strokeDasharray="3 3"
                  />
                )
              })}
              <polyline points={crowdingPlot.sumPoints.join(' ')} fill="none" stroke={COLORS.sum} strokeWidth={2.4} />
              <text x={crowdingPlot.pad.left + 4} y={crowdingPlot.pad.top + 12} fill="#6b7280" fontSize="10" fontFamily="monospace">Sum response</text>
              <text x={crowdingPlot.width / 2} y={crowdingPlot.height - 6} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">Frequency (MHz)</text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.sum }} />
                Total response (all qubits)
              </span>
              <span className="text-gray-500">Tighter spacing or broader linewidth increases crosstalk risk.</span>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Routing Cost</h2>
            <AssumptionTag text="3 two-qubit gates per SWAP" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="Two-qubit error" />
                <input
                  type="range"
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={twoQErrorPct}
                  onChange={(e) => setTwoQErrorPct(clamp(parseFloat(e.target.value), 0.1, 2.0))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((twoQErrorPct - 0.1) / 1.9) * 100}%, #111827 ${((twoQErrorPct - 0.1) / 1.9) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{twoQErrorPct.toFixed(1)}%</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="SWAPs" />
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={swaps}
                  onChange={(e) => setSwaps(clamp(parseInt(e.target.value, 10), 0, 8))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${(swaps / 8) * 100}%, #111827 ${(swaps / 8) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{swaps}</span>
              </div>

              <div className="ml-auto text-xs font-mono text-gray-400">
                Success: {(success * 100).toFixed(1)}% (failure {(failure * 100).toFixed(1)}%)
              </div>
            </div>

            <svg viewBox={`0 0 ${routingPlot.width} ${routingPlot.height}`} className="w-full">
              <rect
                x={routingPlot.pad.left}
                y={routingPlot.pad.top}
                width={routingPlot.width - routingPlot.pad.left - routingPlot.pad.right}
                height={routingPlot.height - routingPlot.pad.top - routingPlot.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              <polyline points={routingPlot.points.join(' ')} fill="none" stroke={COLORS.accent} strokeWidth={2.4} />
              <text x={routingPlot.pad.left + 4} y={routingPlot.pad.top + 12} fill="#6b7280" fontSize="10" fontFamily="monospace">Success probability</text>
              <text x={routingPlot.width / 2} y={routingPlot.height - 6} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">SWAP count</text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-gray-400">
              <span>Total two-qubit gates: {totalGates}</span>
              <span className="text-gray-500">Routing cost compounds quickly as distance grows.</span>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Series Map</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'How We Tune a Qubit',
                desc: 'Spectroscopy + calibration basics.',
                href: '/how-qubits-work/spectroscopy',
                status: 'live',
              },
              {
                title: 'Why Qubits Forget',
                desc: 'T1, T2, decoherence, and linewidth.',
                href: '/how-qubits-work/coherence',
                status: 'live',
              },
              {
                title: 'How Qubits Talk',
                desc: 'Avoided crossings and coupling.',
                href: '/how-qubits-work/coupling',
                status: 'live',
              },
              {
                title: 'How Gates Happen',
                desc: 'Pulses, leakage, and control errors.',
                href: '/how-qubits-work/gates',
                status: 'live',
              },
              {
                title: 'How We Measure',
                desc: 'Dispersive readout + fidelity.',
                href: '/how-qubits-work/measurement',
                status: 'live',
              },
              {
                title: 'How We Scale',
                desc: 'Topology, routing, and spectral crowding.',
                href: '/how-qubits-work/scaling',
                status: 'live',
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-xl border p-4 ${
                  item.status === 'live'
                    ? 'border-white/20 bg-white/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-widest ${
                      item.status === 'live' ? 'text-[#8b5cf6]' : 'text-gray-600'
                    }`}
                  >
                    {item.status === 'live' ? 'Live' : 'Coming soon'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{item.desc}</p>
                {item.status === 'live' ? (
                  <Link href={item.href} className="text-xs font-mono text-[#8b5cf6] hover:underline">
                    Open &rarr;
                  </Link>
                ) : (
                  <span className="text-xs font-mono text-gray-600">Queued</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
