'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const COLORS = {
  upper: '#00d4ff',
  lower: '#ff6b9d',
  accent: '#8b5cf6',
  border: '#1f2937',
}

type Model = 'two' | 'transmon'

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

export default function HowQubitsWorkCouplingPage() {
  const [g, setG] = useState(70)
  const [model, setModel] = useState<Model>('two')
  const [dispG, setDispG] = useState(90)
  const [deltaGHz, setDeltaGHz] = useState(1.0)
  const [alpha, setAlpha] = useState(-250)

  const avoidedPlot = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minDelta = -200
    const maxDelta = 200

    const maxE = Math.sqrt((maxDelta / 2) * (maxDelta / 2) + g * g)
    const innerH = height - pad.top - pad.bottom

    const upper: string[] = []
    const lower: string[] = []
    for (let i = 0; i <= 240; i += 1) {
      const frac = i / 240
      const delta = minDelta + frac * (maxDelta - minDelta)
      const x = pad.left + frac * (width - pad.left - pad.right)
      const e = Math.sqrt((delta / 2) * (delta / 2) + g * g)
      const yUpper = pad.top + (1 - (e + maxE) / (2 * maxE)) * innerH
      const yLower = pad.top + (1 - (-e + maxE) / (2 * maxE)) * innerH
      upper.push(`${x.toFixed(2)},${yUpper.toFixed(2)}`)
      lower.push(`${x.toFixed(2)},${yLower.toFixed(2)}`)
    }

    const ticks = [-200, -100, 0, 100, 200].map((value) => {
      const frac = (value - minDelta) / (maxDelta - minDelta)
      return {
        value,
        x: pad.left + frac * (width - pad.left - pad.right),
      }
    })

    const x0 = pad.left + ((0 - minDelta) / (maxDelta - minDelta)) * (width - pad.left - pad.right)
    const gapTop = pad.top + (1 - (g + maxE) / (2 * maxE)) * innerH
    const gapBottom = pad.top + (1 - (-g + maxE) / (2 * maxE)) * innerH

    return { width, height, pad, upper, lower, ticks, x0, gapTop, gapBottom }
  }, [g])

  const dispersive = useMemo(() => {
    const deltaMHz = deltaGHz * 1000
    const chi = model === 'two'
      ? (dispG * dispG) / deltaMHz
      : (dispG * dispG * alpha) / (deltaMHz * (deltaMHz + alpha))
    const absChi = Math.abs(chi)
    const shiftPx = Math.min(absChi, 50) / 50 * 180

    return {
      chi,
      absChi,
      shiftPx,
      deltaMHz,
    }
  }, [dispG, deltaGHz, alpha, model])

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
          &larr; zoo
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
          How Qubits Work
        </span>
        <span className="text-sm font-semibold text-[#00d4ff]">How Qubits Talk</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">How Qubits Talk</h1>
          <p className="text-gray-400 max-w-3xl">
            Coupling lets qubits exchange energy. When their frequencies get close, their energy
            levels repel (an avoided crossing). Far away, the interaction leaves a small frequency
            shift that enables readout and two-qubit gates.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Avoided Crossing</h2>
            <AssumptionTag text="Two-level coupling" />
            <AssumptionTag text="Gap = 2g" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="Coupling g" />
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={1}
                  value={g}
                  onChange={(e) => setG(clamp(parseInt(e.target.value, 10), 10, 120))}
                  className="w-48 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((g - 10) / 110) * 100}%, #111827 ${((g - 10) / 110) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{g} MHz</span>
              </div>
              <div className="ml-auto text-xs font-mono text-gray-400">
                Gap at Delta=0: {2 * g} MHz
              </div>
            </div>

            <svg viewBox={`0 0 ${avoidedPlot.width} ${avoidedPlot.height}`} className="w-full">
              <rect
                x={avoidedPlot.pad.left}
                y={avoidedPlot.pad.top}
                width={avoidedPlot.width - avoidedPlot.pad.left - avoidedPlot.pad.right}
                height={avoidedPlot.height - avoidedPlot.pad.top - avoidedPlot.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              {avoidedPlot.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={avoidedPlot.height - avoidedPlot.pad.bottom}
                    x2={tick.x}
                    y2={avoidedPlot.height - avoidedPlot.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={avoidedPlot.height - avoidedPlot.pad.bottom + 18}
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              <polyline points={avoidedPlot.upper.join(' ')} fill="none" stroke={COLORS.upper} strokeWidth={2.2} />
              <polyline points={avoidedPlot.lower.join(' ')} fill="none" stroke={COLORS.lower} strokeWidth={2.2} />
              <line
                x1={avoidedPlot.x0}
                y1={avoidedPlot.gapTop}
                x2={avoidedPlot.x0}
                y2={avoidedPlot.gapBottom}
                stroke="#94a3b8"
                strokeWidth={1.2}
              />
              <text
                x={avoidedPlot.x0 + 8}
                y={(avoidedPlot.gapTop + avoidedPlot.gapBottom) / 2 + 4}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
              >
                2g
              </text>
              <text
                x={avoidedPlot.pad.left + 4}
                y={avoidedPlot.pad.top + 12}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
              >
                Energy (MHz)
              </text>
              <text
                x={avoidedPlot.width / 2}
                y={avoidedPlot.height - 6}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Detuning Delta (MHz)
              </text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.upper }} />
                Upper dressed state
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.lower }} />
                Lower dressed state
              </span>
              <span className="text-gray-500">At Delta = 0 the gap is 2g, not g.</span>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Dispersive Shift</h2>
            <AssumptionTag text="Delta much larger than g" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <AxisLabel text="Model" />
              {(['two', 'transmon'] as Model[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setModel(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                    model === mode
                      ? 'border-white/30 text-white bg-white/10'
                      : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                  }`}
                >
                  {mode === 'two' ? 'Two-level' : 'Transmon'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="g" />
                <input
                  type="range"
                  min={40}
                  max={200}
                  step={5}
                  value={dispG}
                  onChange={(e) => setDispG(clamp(parseInt(e.target.value, 10), 40, 200))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((dispG - 40) / 160) * 100}%, #111827 ${((dispG - 40) / 160) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{dispG} MHz</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="Delta" />
                <input
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.05}
                  value={deltaGHz}
                  onChange={(e) => setDeltaGHz(clamp(parseFloat(e.target.value), 0.3, 2.0))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((deltaGHz - 0.3) / 1.7) * 100}%, #111827 ${((deltaGHz - 0.3) / 1.7) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{deltaGHz.toFixed(2)} GHz</span>
              </div>

              {model === 'transmon' ? (
                <div className="flex items-center gap-3">
                  <AxisLabel text="Alpha" />
                  <input
                    type="range"
                    min={-400}
                    max={-50}
                    step={10}
                    value={alpha}
                    onChange={(e) => setAlpha(clamp(parseInt(e.target.value, 10), -400, -50))}
                    className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${COLORS.lower} ${((alpha + 400) / 350) * 100}%, #111827 ${((alpha + 400) / 350) * 100}%)`,
                    }}
                  />
                  <span className="text-xs font-mono text-gray-400">{alpha} MHz</span>
                </div>
              ) : null}

              <div className="ml-auto text-xs font-mono text-gray-400">
                chi = {dispersive.chi.toFixed(2)} MHz
              </div>
            </div>

            <svg viewBox="0 0 720 160" className="w-full">
              <rect x={60} y={30} width={600} height={80} fill="none" stroke={COLORS.border} strokeWidth={1} />
              <line x1={360} y1={40} x2={360} y2={100} stroke="#475569" strokeWidth={1} strokeDasharray="4 4" />
              <line x1={360 - dispersive.shiftPx} y1={50} x2={360 - dispersive.shiftPx} y2={90} stroke={COLORS.lower} strokeWidth={3} />
              <line x1={360 + dispersive.shiftPx} y1={50} x2={360 + dispersive.shiftPx} y2={90} stroke={COLORS.upper} strokeWidth={3} />
              <text x={360} y={24} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Cavity frequency
              </text>
              <text x={360 - dispersive.shiftPx} y={110} fill={COLORS.lower} fontSize="10" fontFamily="monospace" textAnchor="middle">
                |1&gt;
              </text>
              <text x={360 + dispersive.shiftPx} y={110} fill={COLORS.upper} fontSize="10" fontFamily="monospace" textAnchor="middle">
                |0&gt;
              </text>
              <text x={360} y={140} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">
                shift = +/- chi
              </text>
            </svg>

            <p className="mt-4 text-xs text-gray-400">
              Two-level model: chi = g^2 / Delta. Transmon model: chi = g^2 * alpha / (Delta * (Delta + alpha)).
              The correction matters when Delta is not much larger than |alpha|.
            </p>
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
                status: 'soon',
              },
              {
                title: 'How We Scale',
                desc: 'Topology, routing, and spectral crowding.',
                href: '/how-qubits-work/scaling',
                status: 'soon',
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
