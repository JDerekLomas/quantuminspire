'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

const COLORS = {
  t1: '#00d4ff',
  t2: '#ff6b9d',
  accent: '#8b5cf6',
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

export default function HowQubitsWorkCoherencePage() {
  const [t1, setT1] = useState(35)
  const [t2, setT2] = useState(22)
  const [lineT2, setLineT2] = useState(20)
  const [f0, setF0] = useState(5.0)

  const decayPlot = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const maxTime = Math.max(t1, t2) * 3

    const t1Points: string[] = []
    const t2Points: string[] = []

    for (let i = 0; i <= 240; i += 1) {
      const frac = i / 240
      const time = frac * maxTime
      const x = pad.left + frac * (width - pad.left - pad.right)
      const pT1 = Math.exp(-time / t1)
      const pT2 = Math.exp(-time / t2)
      const yT1 = pad.top + (1 - pT1) * (height - pad.top - pad.bottom)
      const yT2 = pad.top + (1 - pT2) * (height - pad.top - pad.bottom)
      t1Points.push(`${x.toFixed(2)},${yT1.toFixed(2)}`)
      t2Points.push(`${x.toFixed(2)},${yT2.toFixed(2)}`)
    }

    const ticks = [0, maxTime / 3, (2 * maxTime) / 3, maxTime].map((value) => {
      const frac = value / maxTime
      return {
        value,
        x: pad.left + frac * (width - pad.left - pad.right),
      }
    })

    return { width, height, pad, t1Points, t2Points, ticks }
  }, [t1, t2])

  const linePlot = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minX = -30
    const maxX = 30
    const fwhm = 1 / (Math.PI * lineT2)
    const gamma = fwhm / 2

    const points: string[] = []
    for (let i = 0; i <= 240; i += 1) {
      const frac = i / 240
      const delta = minX + frac * (maxX - minX)
      const x = pad.left + frac * (width - pad.left - pad.right)
      const p = lorentzian(delta, gamma)
      const y = pad.top + (1 - p) * (height - pad.top - pad.bottom)
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }

    const ticks = [-30, -15, 0, 15, 30].map((value) => {
      const frac = (value - minX) / (maxX - minX)
      return {
        value,
        x: pad.left + frac * (width - pad.left - pad.right),
      }
    })

    const q = (f0 * 1000) / fwhm

    return { width, height, pad, points, ticks, fwhm, q }
  }, [lineT2, f0])

  const t2Limit = 2 * t1
  const violatesLimit = t2 > t2Limit

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav />
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
          &larr; zoo
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
          How Qubits Work
        </span>
        <span className="text-sm font-semibold text-[#ff6b9d]">Why Qubits Forget</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Why Qubits Forget</h1>
          <p className="text-gray-400 max-w-3xl">
            A qubit can lose energy (T1) and lose phase coherence (T2). These times set how long
            quantum information survives and how sharp the resonance peak becomes. Use the controls
            to see how relaxation and dephasing change the signal.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Energy Relaxation vs Dephasing</h2>
            <AssumptionTag text="Exponential decay" />
            <AssumptionTag text="Single qubit" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="T1" />
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={1}
                  value={t1}
                  onChange={(e) => setT1(clamp(parseInt(e.target.value, 10), 5, 120))}
                  className="w-48 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.t1} ${((t1 - 5) / 115) * 100}%, #111827 ${((t1 - 5) / 115) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{t1} us</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="T2" />
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={1}
                  value={t2}
                  onChange={(e) => setT2(clamp(parseInt(e.target.value, 10), 5, 120))}
                  className="w-48 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.t2} ${((t2 - 5) / 115) * 100}%, #111827 ${((t2 - 5) / 115) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{t2} us</span>
              </div>

              <div className="ml-auto text-xs font-mono">
                <span className={violatesLimit ? 'text-[#fca5a5]' : 'text-gray-500'}>
                  Ideal limit: T2 &lt;= 2 * T1 ({t2Limit.toFixed(0)} us)
                </span>
              </div>
            </div>

            <svg viewBox={`0 0 ${decayPlot.width} ${decayPlot.height}`} className="w-full">
              <rect
                x={decayPlot.pad.left}
                y={decayPlot.pad.top}
                width={decayPlot.width - decayPlot.pad.left - decayPlot.pad.right}
                height={decayPlot.height - decayPlot.pad.top - decayPlot.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              {decayPlot.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={decayPlot.height - decayPlot.pad.bottom}
                    x2={tick.x}
                    y2={decayPlot.height - decayPlot.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={decayPlot.height - decayPlot.pad.bottom + 18}
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.value.toFixed(0)}
                  </text>
                </g>
              ))}
              <polyline
                points={decayPlot.t1Points.join(' ')}
                fill="none"
                stroke={COLORS.t1}
                strokeWidth={2.2}
              />
              <polyline
                points={decayPlot.t2Points.join(' ')}
                fill="none"
                stroke={COLORS.t2}
                strokeWidth={2.2}
              />
              <text
                x={decayPlot.pad.left + 4}
                y={decayPlot.pad.top + 12}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
              >
                Remaining signal
              </text>
              <text
                x={decayPlot.width / 2}
                y={decayPlot.height - 6}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Time (us)
              </text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.t1 }} />
                Energy relaxation (T1)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.t2 }} />
                Phase coherence (T2)
              </span>
              <span className="text-gray-500">
                Dephasing usually happens faster than energy loss.
              </span>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Linewidth and Q</h2>
            <AssumptionTag text="Homogeneous broadening" />
            <AssumptionTag text="Lorentzian" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="T2" />
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={1}
                  value={lineT2}
                  onChange={(e) => setLineT2(clamp(parseInt(e.target.value, 10), 5, 120))}
                  className="w-48 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((lineT2 - 5) / 115) * 100}%, #111827 ${((lineT2 - 5) / 115) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{lineT2} us</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="f0" />
                <input
                  type="range"
                  min={4.0}
                  max={7.0}
                  step={0.05}
                  value={f0}
                  onChange={(e) => setF0(clamp(parseFloat(e.target.value), 4.0, 7.0))}
                  className="w-48 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((f0 - 4) / 3) * 100}%, #111827 ${((f0 - 4) / 3) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{f0.toFixed(2)} GHz</span>
              </div>

              <div className="ml-auto flex flex-wrap gap-4 text-xs font-mono text-gray-400">
                <span>FWHM: {linePlot.fwhm >= 1 ? linePlot.fwhm.toFixed(2) + ' MHz' : (linePlot.fwhm * 1000).toFixed(1) + ' kHz'}</span>
                <span>Q: {linePlot.q >= 1e6 ? (linePlot.q / 1e6).toFixed(2) + 'M' : linePlot.q >= 1e3 ? (linePlot.q / 1e3).toFixed(0) + 'K' : linePlot.q.toFixed(0)}</span>
              </div>
            </div>

            <svg viewBox={`0 0 ${linePlot.width} ${linePlot.height}`} className="w-full">
              <rect
                x={linePlot.pad.left}
                y={linePlot.pad.top}
                width={linePlot.width - linePlot.pad.left - linePlot.pad.right}
                height={linePlot.height - linePlot.pad.top - linePlot.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              {linePlot.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={linePlot.height - linePlot.pad.bottom}
                    x2={tick.x}
                    y2={linePlot.height - linePlot.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={linePlot.height - linePlot.pad.bottom + 18}
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              <polyline
                points={linePlot.points.join(' ')}
                fill="none"
                stroke={COLORS.accent}
                strokeWidth={2.4}
              />
              <text
                x={linePlot.pad.left + 4}
                y={linePlot.pad.top + 12}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
              >
                {'P(|1>)'}
              </text>
              <text
                x={linePlot.width / 2}
                y={linePlot.height - 6}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Detuning (MHz)
              </text>
            </svg>

            <p className="mt-4 text-xs text-gray-400">
              Linewidth is set by T2: FWHM = 1 / (pi * T2). Q is not an independent knob; it is
              fixed by f0 and linewidth.
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
