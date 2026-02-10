'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const COLORS = {
  cw: '#00d4ff',
  pulse: '#ff6b9d',
  accent: '#8b5cf6',
  muted: '#6b7280',
  panel: '#0f172a',
  border: '#1f2937',
}

type FocusMode = 'both' | 'cw' | 'pulse'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function lorentzian(delta: number, gamma: number): number {
  return 1 / (1 + (delta / gamma) * (delta / gamma))
}

function sinc(x: number): number {
  if (Math.abs(x) < 1e-8) return 1
  return Math.sin(x) / x
}

function cwSteadyState(delta: number, omega: number, gamma: number): number {
  const s = (omega * omega) / (gamma * gamma)
  const denom = 1 + s + (2 * delta / gamma) * (2 * delta / gamma)
  return 0.5 * s / denom
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

export default function HowQubitsWorkSpectroscopyPage() {
  const [focus, setFocus] = useState<FocusMode>('both')
  const [pulseLength, setPulseLength] = useState(0.35) // microseconds
  const [driveOmega, setDriveOmega] = useState(1.2) // MHz, normalized for CW saturation demo

  const spectrum = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minX = -50
    const maxX = 50
    const gamma = 8

    const points = {
      cw: [] as string[],
      pulse: [] as string[],
    }

    for (let i = 0; i <= 240; i += 1) {
      const t = i / 240
      const delta = minX + t * (maxX - minX)
      const x = pad.left + t * (width - pad.left - pad.right)

      const cwVal = lorentzian(delta, gamma)
      const pulseVal = Math.pow(sinc(Math.PI * delta * pulseLength), 2)

      const yCw = pad.top + (1 - cwVal) * (height - pad.top - pad.bottom)
      const yPulse = pad.top + (1 - pulseVal) * (height - pad.top - pad.bottom)

      points.cw.push(`${x.toFixed(2)},${yCw.toFixed(2)}`)
      points.pulse.push(`${x.toFixed(2)},${yPulse.toFixed(2)}`)
    }

    const ticks = [-50, -25, 0, 25, 50].map((value) => {
      const t = (value - minX) / (maxX - minX)
      return {
        value,
        x: pad.left + t * (width - pad.left - pad.right),
      }
    })

    return { width, height, pad, points, ticks }
  }, [pulseLength])

  const saturation = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minX = -12
    const maxX = 12
    const gamma = 1
    const omega = driveOmega

    const points = [] as string[]
    for (let i = 0; i <= 240; i += 1) {
      const t = i / 240
      const delta = minX + t * (maxX - minX)
      const x = pad.left + t * (width - pad.left - pad.right)
      const p = cwSteadyState(delta, omega, gamma)
      const y = pad.top + (1 - p * 2) * (height - pad.top - pad.bottom)
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }

    const s = (omega * omega) / (gamma * gamma)
    const peak = 0.5 * s / (1 + s)
    const fwhm = gamma * Math.sqrt(1 + s)

    const ticks = [-12, -6, 0, 6, 12].map((value) => {
      const t = (value - minX) / (maxX - minX)
      return {
        value,
        x: pad.left + t * (width - pad.left - pad.right),
      }
    })

    return { width, height, pad, points, ticks, peak, fwhm }
  }, [driveOmega])

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
          &larr; zoo
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
          How Qubits Work
        </span>
        <span className="text-sm font-semibold text-[#8b5cf6]">How We Tune a Qubit</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            How We Tune a Qubit
          </h1>
          <p className="text-gray-400 max-w-3xl">
            Calibration starts with spectroscopy: sweep frequency, find the response peak, and tune
            the microwave drive until the qubit is controllable. These interactives make the hidden
            assumptions visible: steady-state vs pulsed measurements, and why stronger drive both
            helps and hurts.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">CW vs Pulsed Spectroscopy</h2>
            <AssumptionTag text="CW = steady-state" />
            <AssumptionTag text="Pulse = finite-time" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-3 items-center mb-6">
              <AxisLabel text="Focus" />
              {(['both', 'cw', 'pulse'] as FocusMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFocus(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                    focus === mode
                      ? 'border-white/30 text-white bg-white/10'
                      : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                  }`}
                >
                  {mode === 'both' ? 'Both' : mode === 'cw' ? 'CW' : 'Pulse'}
                </button>
              ))}
              <div className="flex items-center gap-3 ml-auto">
                <AxisLabel text="Pulse Length" />
                <input
                  type="range"
                  min={0.05}
                  max={1.2}
                  step={0.01}
                  value={pulseLength}
                  onChange={(e) => setPulseLength(clamp(parseFloat(e.target.value), 0.05, 1.2))}
                  className="w-48 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.pulse} ${((pulseLength - 0.05) / 1.15) * 100}%, #111827 ${((pulseLength - 0.05) / 1.15) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">
                  {pulseLength < 1 ? `${(pulseLength * 1000).toFixed(0)} ns` : `${pulseLength.toFixed(2)} us`}
                </span>
              </div>
            </div>

            <svg viewBox={`0 0 ${spectrum.width} ${spectrum.height}`} className="w-full">
              <rect
                x={spectrum.pad.left}
                y={spectrum.pad.top}
                width={spectrum.width - spectrum.pad.left - spectrum.pad.right}
                height={spectrum.height - spectrum.pad.top - spectrum.pad.bottom}
                fill="none"
                stroke="#1f2937"
                strokeWidth={1}
              />
              {spectrum.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={spectrum.height - spectrum.pad.bottom}
                    x2={tick.x}
                    y2={spectrum.height - spectrum.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={spectrum.height - spectrum.pad.bottom + 18}
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
                points={spectrum.points.cw.join(' ')}
                fill="none"
                stroke={COLORS.cw}
                strokeWidth={2.2}
                opacity={focus === 'pulse' ? 0.25 : 0.95}
              />
              <polyline
                points={spectrum.points.pulse.join(' ')}
                fill="none"
                stroke={COLORS.pulse}
                strokeWidth={2.2}
                opacity={focus === 'cw' ? 0.25 : 0.95}
              />

              <text
                x={spectrum.pad.left + 4}
                y={spectrum.pad.top + 12}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
              >
                P(|1&gt;)
              </text>
              <text
                x={spectrum.width / 2}
                y={spectrum.height - 6}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Detuning (MHz)
              </text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.cw }} />
                CW steady-state Lorentzian
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pulse }} />
                pi-pulse sinc^2 spectrum
              </span>
              <span className="text-gray-500">
                Longer pulses narrow the main lobe but create side lobes.
              </span>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Saturation & Power Broadening</h2>
            <AssumptionTag text="Two-level CW model" />
            <AssumptionTag text="gamma = 1 MHz" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <AxisLabel text="Drive Amplitude Omega" />
              <input
                type="range"
                min={0.2}
                max={4}
                step={0.05}
                value={driveOmega}
                onChange={(e) => setDriveOmega(clamp(parseFloat(e.target.value), 0.2, 4))}
                className="w-52 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${COLORS.accent} ${((driveOmega - 0.2) / 3.8) * 100}%, #111827 ${((driveOmega - 0.2) / 3.8) * 100}%)`,
                }}
              />
              <span className="text-xs font-mono text-gray-400">{driveOmega.toFixed(2)} MHz</span>

              <div className="ml-auto flex flex-wrap gap-4 text-xs font-mono text-gray-400">
                <span>Peak: {saturation.peak.toFixed(2)}</span>
                <span>FWHM: {saturation.fwhm.toFixed(2)} MHz</span>
              </div>
            </div>

            <svg viewBox={`0 0 ${saturation.width} ${saturation.height}`} className="w-full">
              <rect
                x={saturation.pad.left}
                y={saturation.pad.top}
                width={saturation.width - saturation.pad.left - saturation.pad.right}
                height={saturation.height - saturation.pad.top - saturation.pad.bottom}
                fill="none"
                stroke="#1f2937"
                strokeWidth={1}
              />
              {saturation.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={saturation.height - saturation.pad.bottom}
                    x2={tick.x}
                    y2={saturation.height - saturation.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={saturation.height - saturation.pad.bottom + 18}
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
                points={saturation.points.join(' ')}
                fill="none"
                stroke={COLORS.accent}
                strokeWidth={2.4}
              />

              <text
                x={saturation.pad.left + 4}
                y={saturation.pad.top + 12}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
              >
                P(|1&gt;)
              </text>
              <text
                x={saturation.width / 2}
                y={saturation.height - 6}
                fill="#6b7280"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Detuning (MHz)
              </text>
            </svg>

            <p className="mt-4 text-xs text-gray-400">
              Stronger drive raises the signal but saturates at 0.5 in CW steady-state, while the
              linewidth grows as sqrt(1+s). That tradeoff is why calibration uses both weak and strong
              drives, depending on what you are measuring.
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
