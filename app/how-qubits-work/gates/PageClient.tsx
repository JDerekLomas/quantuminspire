'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

const COLORS = {
  square: '#00d4ff',
  gauss: '#ff6b9d',
  drag: '#8b5cf6',
  accent: '#22d3ee',
  border: '#1f2937',
}

type Shape = 'square' | 'gaussian' | 'drag'

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

function rotateVector(v: [number, number, number], n: [number, number, number], theta: number): [number, number, number] {
  const [vx, vy, vz] = v
  const [nx, ny, nz] = n
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const dot = vx * nx + vy * ny + vz * nz

  const cx = ny * vz - nz * vy
  const cy = nz * vx - nx * vz
  const cz = nx * vy - ny * vx

  return [
    vx * cos + cx * sin + nx * dot * (1 - cos),
    vy * cos + cy * sin + ny * dot * (1 - cos),
    vz * cos + cz * sin + nz * dot * (1 - cos),
  ]
}

function normalize(v: [number, number, number]): [number, number, number] {
  const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
  return [v[0] / norm, v[1] / norm, v[2] / norm]
}

function dftMagnitudes(samples: { re: number; im: number }[]): number[] {
  const N = samples.length
  const mags: number[] = []
  for (let k = 0; k < N / 2; k += 1) {
    let re = 0
    let im = 0
    for (let n = 0; n < N; n += 1) {
      const angle = (-2 * Math.PI * k * n) / N
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      re += samples[n].re * cos - samples[n].im * sin
      im += samples[n].re * sin + samples[n].im * cos
    }
    mags.push(Math.sqrt(re * re + im * im))
  }
  const max = Math.max(...mags, 1e-6)
  return mags.map((m) => m / max)
}

export default function HowQubitsWorkGatesPage() {
  const [shape, setShape] = useState<Shape>('square')
  const [pulseLength, setPulseLength] = useState(40)
  const [dragBeta, setDragBeta] = useState(0.4)
  const [ampError, setAmpError] = useState(0)
  const [detuning, setDetuning] = useState(0)
  const [phaseError, setPhaseError] = useState(0)

  const pulse = useMemo(() => {
    const N = 128
    const sigma = 0.18
    const samples: { t: number; i: number; q: number }[] = []

    for (let i = 0; i < N; i += 1) {
      const t = i / (N - 1)
      if (shape === 'square') {
        samples.push({ t, i: 1, q: 0 })
      } else {
        const g = Math.exp(-0.5 * Math.pow((t - 0.5) / sigma, 2))
        if (shape === 'gaussian') {
          samples.push({ t, i: g, q: 0 })
        } else {
          const dg = -((t - 0.5) / (sigma * sigma)) * g
          samples.push({ t, i: g, q: dragBeta * dg })
        }
      }
    }

    const spectrum = dftMagnitudes(samples.map((s) => ({ re: s.i, im: s.q })))
    const leakageStart = Math.floor(spectrum.length * 0.15)
    const leakage = spectrum.slice(leakageStart).reduce((acc, v) => acc + v * v, 0)

    return { samples, spectrum, leakage }
  }, [shape, dragBeta])

  const errorModel = useMemo(() => {
    const target: [number, number, number] = [0, 1, 0]
    const init: [number, number, number] = [0, 0, 1]
    const phaseRad = (phaseError * Math.PI) / 180
    const axis = normalize([Math.cos(phaseRad), Math.sin(phaseRad), detuning])
    const theta = (Math.PI / 2) * (1 + ampError)

    const final = rotateVector(init, axis, theta)
    const dot = final[0] * target[0] + final[1] * target[1] + final[2] * target[2]
    const infidelity = (1 - dot) / 2
    const p1 = (1 - final[2]) / 2

    return { final, infidelity, p1, axis }
  }, [ampError, detuning, phaseError])

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
        <span className="text-sm font-semibold text-[#f59e0b]">How Gates Happen</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">How Gates Happen</h1>
          <p className="text-gray-400 max-w-3xl">
            Gates are shaped microwave pulses. The pulse shape controls spectral leakage, while
            small amplitude, detuning, and phase errors set the final state error. Explore both
            levers below.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Pulse Shape and Leakage</h2>
            <AssumptionTag text="Unit amplitude" />
            <AssumptionTag text="Simple DFT" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <AxisLabel text="Shape" />
              {(['square', 'gaussian', 'drag'] as Shape[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setShape(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                    shape === mode
                      ? 'border-white/30 text-white bg-white/10'
                      : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                  }`}
                >
                  {mode === 'square' ? 'Square' : mode === 'gaussian' ? 'Gaussian' : 'DRAG'}
                </button>
              ))}

              <div className="flex items-center gap-3 ml-auto">
                <AxisLabel text="Pulse Length" />
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={1}
                  value={pulseLength}
                  onChange={(e) => setPulseLength(clamp(parseInt(e.target.value, 10), 10, 80))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((pulseLength - 10) / 70) * 100}%, #111827 ${((pulseLength - 10) / 70) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{pulseLength} ns</span>
              </div>

              {shape === 'drag' ? (
                <div className="flex items-center gap-3">
                  <AxisLabel text="DRAG beta" />
                  <input
                    type="range"
                    min={0}
                    max={0.8}
                    step={0.05}
                    value={dragBeta}
                    onChange={(e) => setDragBeta(clamp(parseFloat(e.target.value), 0, 0.8))}
                    className="w-36 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${COLORS.drag} ${(dragBeta / 0.8) * 100}%, #111827 ${(dragBeta / 0.8) * 100}%)`,
                    }}
                  />
                  <span className="text-xs font-mono text-gray-400">{dragBeta.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2">Time domain</div>
                <svg viewBox="0 0 320 160" className="w-full">
                  <rect x={30} y={20} width={260} height={110} fill="none" stroke={COLORS.border} strokeWidth={1} />
                  <polyline
                    points={pulse.samples.map((s, i) => {
                      const x = 30 + (i / (pulse.samples.length - 1)) * 260
                      const y = 20 + (1 - s.i) * 110
                      return `${x.toFixed(2)},${y.toFixed(2)}`
                    }).join(' ')}
                    fill="none"
                    stroke={shape === 'square' ? COLORS.square : shape === 'gaussian' ? COLORS.gauss : COLORS.drag}
                    strokeWidth={2.2}
                  />
                  {shape === 'drag' ? (
                    <polyline
                      points={pulse.samples.map((s, i) => {
                        const x = 30 + (i / (pulse.samples.length - 1)) * 260
                        const y = 20 + (1 - (s.q + 1) / 2) * 110
                        return `${x.toFixed(2)},${y.toFixed(2)}`
                      }).join(' ')}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  ) : null}
                  <text x={35} y={15} fill="#6b7280" fontSize="9" fontFamily="monospace">Amplitude</text>
                  <text x={160} y={150} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    time
                  </text>
                </svg>
              </div>
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2">Frequency domain</div>
                <svg viewBox="0 0 320 160" className="w-full">
                  <rect x={30} y={20} width={260} height={110} fill="none" stroke={COLORS.border} strokeWidth={1} />
                  <polyline
                    points={pulse.spectrum.map((v, i) => {
                      const x = 30 + (i / (pulse.spectrum.length - 1)) * 260
                      const y = 20 + (1 - v) * 110
                      return `${x.toFixed(2)},${y.toFixed(2)}`
                    }).join(' ')}
                    fill="none"
                    stroke={shape === 'square' ? COLORS.square : shape === 'gaussian' ? COLORS.gauss : COLORS.drag}
                    strokeWidth={2.2}
                  />
                  <text x={35} y={15} fill="#6b7280" fontSize="9" fontFamily="monospace">Magnitude</text>
                  <text x={160} y={150} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    frequency
                  </text>
                </svg>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-gray-400">
              <span>Leakage metric: {pulse.leakage.toFixed(3)}</span>
              <span className="text-gray-500">Smoother pulses concentrate power near the carrier.</span>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Control Errors</h2>
            <AssumptionTag text="Target = pi/2 around X" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="Amp error" />
                <input
                  type="range"
                  min={-0.3}
                  max={0.3}
                  step={0.02}
                  value={ampError}
                  onChange={(e) => setAmpError(clamp(parseFloat(e.target.value), -0.3, 0.3))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((ampError + 0.3) / 0.6) * 100}%, #111827 ${((ampError + 0.3) / 0.6) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{(ampError * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="Detuning" />
                <input
                  type="range"
                  min={-0.8}
                  max={0.8}
                  step={0.05}
                  value={detuning}
                  onChange={(e) => setDetuning(clamp(parseFloat(e.target.value), -0.8, 0.8))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((detuning + 0.8) / 1.6) * 100}%, #111827 ${((detuning + 0.8) / 1.6) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{detuning.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="Phase" />
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={2}
                  value={phaseError}
                  onChange={(e) => setPhaseError(clamp(parseInt(e.target.value, 10), -30, 30))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((phaseError + 30) / 60) * 100}%, #111827 ${((phaseError + 30) / 60) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{phaseError} deg</span>
              </div>

              <div className="ml-auto text-xs font-mono text-gray-400">
                Infidelity ~ {errorModel.infidelity.toFixed(3)}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2">Bloch YZ plane</div>
                <svg viewBox="0 0 220 220" className="w-full max-w-[240px]">
                  <circle cx={110} cy={110} r={80} fill="none" stroke={COLORS.border} strokeWidth={2} />
                  <line x1={110} y1={30} x2={110} y2={190} stroke="#1f2937" />
                  <line x1={30} y1={110} x2={190} y2={110} stroke="#1f2937" />
                  <line
                    x1={110}
                    y1={110}
                    x2={110 + errorModel.final[1] * 80}
                    y2={110 - errorModel.final[2] * 80}
                    stroke={COLORS.accent}
                    strokeWidth={3}
                  />
                  <line
                    x1={110}
                    y1={110}
                    x2={110 + 1 * 80}
                    y2={110}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                  <circle cx={110 + errorModel.final[1] * 80} cy={110 - errorModel.final[2] * 80} r={4} fill={COLORS.accent} />
                  <text x={190} y={115} fill="#6b7280" fontSize="9" fontFamily="monospace">+Y</text>
                  <text x={110} y={25} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">+Z</text>
                </svg>
              </div>
              <div className="text-xs font-mono text-gray-400 space-y-2">
                <div>Axis: [{errorModel.axis.map((v) => v.toFixed(2)).join(', ')}]</div>
                <div>P(|1&#x27E9;) after gate: {errorModel.p1.toFixed(3)}</div>
                <div>Target state: +Y axis (ideal pi/2 about X)</div>
                <div className="text-gray-500">Small axis or angle errors accumulate into measurable gate infidelity.</div>
              </div>
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
