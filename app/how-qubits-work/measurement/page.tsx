'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const COLORS = {
  zero: '#00d4ff',
  one: '#ff6b9d',
  accent: '#22d3ee',
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

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1
  const absX = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * absX)
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX)
  return sign * y
}

function erfc(x: number): number {
  return 1 - erf(x)
}

export default function HowQubitsWorkMeasurementPage() {
  const [chi, setChi] = useState(6)
  const [kappa, setKappa] = useState(8)
  const [probeDelta, setProbeDelta] = useState(0)
  const [measTime, setMeasTime] = useState(0.6)
  const [noiseFloor, setNoiseFloor] = useState(0.2)

  const readoutPlot = useMemo(() => {
    const width = 720
    const height = 260
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minX = -30
    const maxX = 30
    const gamma = kappa / 2

    const zeroPts: string[] = []
    const onePts: string[] = []
    for (let i = 0; i <= 240; i += 1) {
      const frac = i / 240
      const delta = minX + frac * (maxX - minX)
      const x = pad.left + frac * (width - pad.left - pad.right)
      const p0 = lorentzian(delta + chi, gamma)
      const p1 = lorentzian(delta - chi, gamma)
      const y0 = pad.top + (1 - p0) * (height - pad.top - pad.bottom)
      const y1 = pad.top + (1 - p1) * (height - pad.top - pad.bottom)
      zeroPts.push(`${x.toFixed(2)},${y0.toFixed(2)}`)
      onePts.push(`${x.toFixed(2)},${y1.toFixed(2)}`)
    }

    const ticks = [-30, -15, 0, 15, 30].map((value) => {
      const frac = (value - minX) / (maxX - minX)
      return {
        value,
        x: pad.left + frac * (width - pad.left - pad.right),
      }
    })

    const probeX = pad.left + ((probeDelta - minX) / (maxX - minX)) * (width - pad.left - pad.right)
    const response0 = lorentzian(probeDelta + chi, gamma)
    const response1 = lorentzian(probeDelta - chi, gamma)
    const contrast = Math.abs(response0 - response1)

    return { width, height, pad, zeroPts, onePts, ticks, probeX, response0, response1, contrast }
  }, [chi, kappa, probeDelta])

  const fidelity = useMemo(() => {
    const mean = 1.2 * Math.sqrt(measTime)
    const sigma = 1 / Math.sqrt(measTime) + noiseFloor
    const err = 0.5 * erfc(mean / (Math.sqrt(2) * sigma))
    const fidelityVal = 1 - err

    const width = 720
    const height = 220
    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const minX = -3
    const maxX = 3
    const samples0: string[] = []
    const samples1: string[] = []

    for (let i = 0; i <= 240; i += 1) {
      const frac = i / 240
      const xVal = minX + frac * (maxX - minX)
      const x = pad.left + frac * (width - pad.left - pad.right)
      const g0 = Math.exp(-0.5 * Math.pow((xVal + mean) / sigma, 2))
      const g1 = Math.exp(-0.5 * Math.pow((xVal - mean) / sigma, 2))
      const y0 = pad.top + (1 - g0) * (height - pad.top - pad.bottom)
      const y1 = pad.top + (1 - g1) * (height - pad.top - pad.bottom)
      samples0.push(`${x.toFixed(2)},${y0.toFixed(2)}`)
      samples1.push(`${x.toFixed(2)},${y1.toFixed(2)}`)
    }

    const ticks = [-3, -1.5, 0, 1.5, 3].map((value) => {
      const frac = (value - minX) / (maxX - minX)
      return {
        value,
        x: pad.left + frac * (width - pad.left - pad.right),
      }
    })

    const thresholdX = pad.left + ((0 - minX) / (maxX - minX)) * (width - pad.left - pad.right)

    return { fidelityVal, err, mean, sigma, width, height, pad, samples0, samples1, ticks, thresholdX }
  }, [measTime, noiseFloor])

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
          &larr; zoo
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
          How Qubits Work
        </span>
        <span className="text-sm font-semibold text-[#22d3ee]">How We Measure</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">How We Measure</h1>
          <p className="text-gray-400 max-w-3xl">
            Readout uses a resonator coupled to the qubit. The qubit state shifts the resonator
            frequency by +/- chi, and a probe tone converts that shift into a voltage we can
            classify. This page shows how probe frequency and noise determine fidelity.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Dispersive Readout</h2>
            <AssumptionTag text="Lorentzian response" />
            <AssumptionTag text="Single resonator" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="chi" />
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={0.5}
                  value={chi}
                  onChange={(e) => setChi(clamp(parseFloat(e.target.value), 2, 12))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((chi - 2) / 10) * 100}%, #111827 ${((chi - 2) / 10) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{chi.toFixed(1)} MHz</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="kappa" />
                <input
                  type="range"
                  min={3}
                  max={20}
                  step={1}
                  value={kappa}
                  onChange={(e) => setKappa(clamp(parseFloat(e.target.value), 3, 20))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((kappa - 3) / 17) * 100}%, #111827 ${((kappa - 3) / 17) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{kappa.toFixed(0)} MHz</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="Probe delta" />
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={probeDelta}
                  onChange={(e) => setProbeDelta(clamp(parseFloat(e.target.value), -15, 15))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((probeDelta + 15) / 30) * 100}%, #111827 ${((probeDelta + 15) / 30) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{probeDelta.toFixed(1)} MHz</span>
              </div>

              <div className="ml-auto text-xs font-mono text-gray-400">
                Contrast: {readoutPlot.contrast.toFixed(2)}
              </div>
            </div>

            <svg viewBox={`0 0 ${readoutPlot.width} ${readoutPlot.height}`} className="w-full">
              <rect
                x={readoutPlot.pad.left}
                y={readoutPlot.pad.top}
                width={readoutPlot.width - readoutPlot.pad.left - readoutPlot.pad.right}
                height={readoutPlot.height - readoutPlot.pad.top - readoutPlot.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              {readoutPlot.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={readoutPlot.height - readoutPlot.pad.bottom}
                    x2={tick.x}
                    y2={readoutPlot.height - readoutPlot.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={readoutPlot.height - readoutPlot.pad.bottom + 18}
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              <polyline points={readoutPlot.zeroPts.join(' ')} fill="none" stroke={COLORS.zero} strokeWidth={2.2} />
              <polyline points={readoutPlot.onePts.join(' ')} fill="none" stroke={COLORS.one} strokeWidth={2.2} />
              <line x1={readoutPlot.probeX} y1={readoutPlot.pad.top} x2={readoutPlot.probeX} y2={readoutPlot.height - readoutPlot.pad.bottom} stroke="#94a3b8" strokeDasharray="4 4" />
              <text x={readoutPlot.pad.left + 4} y={readoutPlot.pad.top + 12} fill="#6b7280" fontSize="10" fontFamily="monospace">Response</text>
              <text x={readoutPlot.width / 2} y={readoutPlot.height - 6} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">Detuning (MHz)</text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-gray-400">
              <span>|0&gt; response: {readoutPlot.response0.toFixed(2)}</span>
              <span>|1&gt; response: {readoutPlot.response1.toFixed(2)}</span>
              <span className="text-gray-500">Probe where the two curves are most separated.</span>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Readout Fidelity</h2>
            <AssumptionTag text="Gaussian noise" />
            <AssumptionTag text="Optimal threshold" />
          </div>
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl p-6">
            <div className="flex flex-wrap gap-6 items-center mb-6">
              <div className="flex items-center gap-3">
                <AxisLabel text="Meas time" />
                <input
                  type="range"
                  min={0.2}
                  max={2.0}
                  step={0.05}
                  value={measTime}
                  onChange={(e) => setMeasTime(clamp(parseFloat(e.target.value), 0.2, 2.0))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((measTime - 0.2) / 1.8) * 100}%, #111827 ${((measTime - 0.2) / 1.8) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{measTime.toFixed(2)} us</span>
              </div>

              <div className="flex items-center gap-3">
                <AxisLabel text="Noise floor" />
                <input
                  type="range"
                  min={0.05}
                  max={0.6}
                  step={0.01}
                  value={noiseFloor}
                  onChange={(e) => setNoiseFloor(clamp(parseFloat(e.target.value), 0.05, 0.6))}
                  className="w-44 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.accent} ${((noiseFloor - 0.05) / 0.55) * 100}%, #111827 ${((noiseFloor - 0.05) / 0.55) * 100}%)`,
                  }}
                />
                <span className="text-xs font-mono text-gray-400">{noiseFloor.toFixed(2)}</span>
              </div>

              <div className="ml-auto text-xs font-mono text-gray-400">
                Fidelity: {(fidelity.fidelityVal * 100).toFixed(1)}%
              </div>
            </div>

            <svg viewBox={`0 0 ${fidelity.width} ${fidelity.height}`} className="w-full">
              <rect
                x={fidelity.pad.left}
                y={fidelity.pad.top}
                width={fidelity.width - fidelity.pad.left - fidelity.pad.right}
                height={fidelity.height - fidelity.pad.top - fidelity.pad.bottom}
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1}
              />
              {fidelity.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={tick.x}
                    y1={fidelity.height - fidelity.pad.bottom}
                    x2={tick.x}
                    y2={fidelity.height - fidelity.pad.bottom + 6}
                    stroke="#374151"
                  />
                  <text
                    x={tick.x}
                    y={fidelity.height - fidelity.pad.bottom + 18}
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              <polyline points={fidelity.samples0.join(' ')} fill="none" stroke={COLORS.zero} strokeWidth={2.2} />
              <polyline points={fidelity.samples1.join(' ')} fill="none" stroke={COLORS.one} strokeWidth={2.2} />
              <line x1={fidelity.thresholdX} y1={fidelity.pad.top} x2={fidelity.thresholdX} y2={fidelity.height - fidelity.pad.bottom} stroke="#94a3b8" strokeDasharray="4 4" />
              <text x={fidelity.pad.left + 4} y={fidelity.pad.top + 12} fill="#6b7280" fontSize="10" fontFamily="monospace">Histogram</text>
              <text x={fidelity.width / 2} y={fidelity.height - 6} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="middle">Measured voltage (arb)</text>
            </svg>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-gray-400">
              <span>Error: {(fidelity.err * 100).toFixed(1)}%</span>
              <span>Signal separation: {fidelity.mean.toFixed(2)}</span>
              <span>Noise sigma: {fidelity.sigma.toFixed(2)}</span>
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
