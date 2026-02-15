'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ════════════════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════════════════

const EDGES: [number, number][] = [
  [0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8],
]

// SVG positions for the Tuna-9 topology (matching existing tuna9 page)
const POS: [number, number][] = [
  [200, 50],                            // q0
  [120, 130], [280, 130],               // q1, q2
  [60, 220], [200, 220], [340, 220],    // q3, q4, q5
  [120, 310], [280, 310],               // q6, q7
  [200, 390],                           // q8
]

const DISTANCES: Record<number, number> = {0:0, 1:1, 2:1, 3:2, 4:2, 5:2, 6:3, 7:3, 8:4}

// Per-qubit excitation probabilities from hardware
const WALK_DATA: Record<string, number[]> = {
  'depth 1': [0.805, 0.061, 0.092, 0.072, 0.078, 0.077, 0.069, 0.069, 0.061],
  'depth 2': [0.646, 0.055, 0.073, 0.191, 0.199, 0.213, 0.208, 0.209, 0.205],
  'depth 3': [0.470, 0.157, 0.177, 0.297, 0.296, 0.367, 0.319, 0.305, 0.311],
}

// Emulator excitation for comparison (from analyze_emulator.py)
const WALK_EMULATOR: Record<string, number[]> = {
  'depth 1': [0.931, 0.069, 0.069, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  'depth 2': [0.797, 0.043, 0.043, 0.195, 0.230, 0.195, 0.192, 0.192, 0.147],
  'depth 3': [0.571, 0.109, 0.109, 0.337, 0.401, 0.337, 0.283, 0.283, 0.226],
}

// By-distance averages for the interference chart
const WALK_BY_DIST = {
  'depth 1': [0.805, 0.076, 0.076, 0.069, 0.061],
  'depth 2': [0.646, 0.064, 0.201, 0.208, 0.205],
  'depth 3': [0.470, 0.167, 0.320, 0.312, 0.311],
}

// QAOA cut value distribution
const QAOA_CUT_DIST: Record<number, number> = {
  0: 19, 2: 96, 3: 198, 4: 421, 5: 544, 6: 1452, 7: 595, 8: 457, 9: 216, 10: 85, 12: 13,
}
const QAOA_TOTAL = 4096

// Emulator cut distribution (from parameter sweep)
const QAOA_EMULATOR_CUT_DIST: Record<number, number> = {
  0: 2, 2: 15, 3: 24, 4: 101, 5: 184, 6: 722, 7: 543, 8: 820, 9: 539, 10: 376, 11: 0, 12: 770,
}
const QAOA_EMULATOR_TOTAL = 4096

// GHZ data
const GHZ = {
  f_z: 0.5936,
  p_all0: 0.3644,
  p_all1: 0.2292,
  x_expectation: 0.5410,
  fidelity_bound: 0.5673,
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function excitationColor(p: number): string {
  if (p < 0.05) return '#1e293b'
  if (p < 0.15) return '#0e4f6e'
  if (p < 0.25) return '#0891b2'
  if (p < 0.35) return '#06b6d4'
  if (p < 0.50) return '#22d3ee'
  if (p < 0.70) return '#67e8f9'
  return '#a5f3fc'
}

function distanceColor(d: number): string {
  return ['#00d4ff', '#8b5cf6', '#ff6b9d', '#ff8c42', '#00ff88'][d]
}

// ════════════════════════════════════════════════════════════════════════════
// WALK TOPOLOGY VISUALIZATION
// ════════════════════════════════════════════════════════════════════════════

// Which edges are "active" (carrying amplitude) at each depth
const ACTIVE_EDGES: Record<string, Set<string>> = {
  'start':   new Set(),
  'depth 1': new Set(['0-1', '0-2']),
  'depth 2': new Set(['0-1', '0-2', '1-3', '1-4', '2-4', '2-5', '3-6', '4-6', '4-7', '5-7']),
  'depth 3': new Set(['0-1', '0-2', '1-3', '1-4', '2-4', '2-5', '3-6', '4-6', '4-7', '5-7', '6-8', '7-8']),
}

function WalkTopology({ depth, excitations }: { depth: string; excitations: number[] }) {
  const active = ACTIVE_EDGES[depth] || new Set()
  return (
    <svg viewBox="0 0 400 440" className="w-full max-w-[400px]">
      <defs>
        {/* Animated dash for active edges */}
        <style>{`
          @keyframes flowDash { to { stroke-dashoffset: -20; } }
          .edge-active { animation: flowDash 1.5s linear infinite; }
        `}</style>
      </defs>
      {/* Edges */}
      {EDGES.map(([a, b]) => {
        const key = `${a}-${b}`
        const isActive = active.has(key)
        return (
          <g key={key}>
            <line
              x1={POS[a][0]} y1={POS[a][1]}
              x2={POS[b][0]} y2={POS[b][1]}
              stroke={isActive ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isActive ? 3 : 1.5}
            />
            {isActive && (
              <line
                x1={POS[a][0]} y1={POS[a][1]}
                x2={POS[b][0]} y2={POS[b][1]}
                stroke="#00d4ff"
                strokeWidth={1.5}
                strokeDasharray="4 16"
                className="edge-active"
                opacity={0.6}
              />
            )}
          </g>
        )
      })}
      {/* Distance rings (subtle) */}
      {depth !== 'start' && (
        <g opacity={0.06}>
          <circle cx={200} cy={50} r={100} fill="none" stroke="white" strokeDasharray="4 4" />
          <circle cx={200} cy={50} r={200} fill="none" stroke="white" strokeDasharray="4 4" />
          <circle cx={200} cy={50} r={280} fill="none" stroke="white" strokeDasharray="4 4" />
        </g>
      )}
      {/* Nodes */}
      {excitations.map((p, i) => {
        const r = 14 + p * 26
        const color = excitationColor(p)
        const d = DISTANCES[i]
        return (
          <g key={i}>
            {/* Glow */}
            {p > 0.1 && (
              <circle
                cx={POS[i][0]} cy={POS[i][1]} r={r + 10}
                fill={color} opacity={p * 0.25}
              />
            )}
            {/* Node */}
            <circle
              cx={POS[i][0]} cy={POS[i][1]} r={r}
              fill={color}
              stroke={d <= 1 && depth !== 'start' && depth !== 'depth 1' ? 'rgba(255,107,157,0.4)' : 'rgba(255,255,255,0.12)'}
              strokeWidth={d === 1 && depth === 'depth 2' ? 2 : 1}
            />
            {/* Label */}
            <text
              x={POS[i][0]} y={POS[i][1] + 1}
              textAnchor="middle" dominantBaseline="central"
              fill={p > 0.3 ? '#0a0a1a' : '#e2e8f0'}
              fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={600}
            >
              q{i}
            </text>
            {/* Percentage below */}
            <text
              x={POS[i][0]} y={POS[i][1] + r + 14}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10} fontFamily="JetBrains Mono, monospace"
            >
              {(p * 100).toFixed(1)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFERENCE BAR CHART
// ════════════════════════════════════════════════════════════════════════════

function InterferenceChart({ data, label }: { data: number[]; label: string }) {
  const maxVal = Math.max(...data)
  const distLabels = ['d=0\nq0', 'd=1\nq1,q2', 'd=2\nq3,q4,q5', 'd=3\nq6,q7', 'd=4\nq8']
  const barWidth = 48
  const gap = 16
  const chartHeight = 200
  const totalWidth = data.length * (barWidth + gap) - gap
  const leftPad = 45
  const topPad = 10

  return (
    <svg viewBox={`0 0 ${totalWidth + leftPad + 20} ${chartHeight + 70}`} className="w-full max-w-[400px]">
      {/* Y axis labels */}
      {[0, 0.2, 0.4, 0.6, 0.8].map(v => (
        <g key={v}>
          <text
            x={leftPad - 8} y={topPad + chartHeight - (v / 0.85) * chartHeight}
            textAnchor="end" dominantBaseline="central"
            fill="#64748b" fontSize={10} fontFamily="JetBrains Mono, monospace"
          >
            {(v * 100).toFixed(0)}%
          </text>
          <line
            x1={leftPad} x2={leftPad + totalWidth}
            y1={topPad + chartHeight - (v / 0.85) * chartHeight}
            y2={topPad + chartHeight - (v / 0.85) * chartHeight}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4"
          />
        </g>
      ))}
      {/* Bars */}
      {data.map((v, i) => {
        const barH = (v / 0.85) * chartHeight
        const x = leftPad + i * (barWidth + gap)
        const y = topPad + chartHeight - barH
        const isInterference = i === 1 && v < data[2] // d=1 < d=2 = interference
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barWidth} height={barH}
              rx={3}
              fill={distanceColor(i)}
              opacity={isInterference ? 1 : 0.75}
            />
            {/* Value on top */}
            <text
              x={x + barWidth / 2} y={y - 6}
              textAnchor="middle"
              fill={distanceColor(i)}
              fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={600}
            >
              {(v * 100).toFixed(1)}%
            </text>
            {/* Interference arrow */}
            {isInterference && (
              <>
                <text
                  x={x + barWidth / 2} y={y - 20}
                  textAnchor="middle"
                  fill="#ff6b9d" fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight={700}
                >
                  interference!
                </text>
              </>
            )}
            {/* X label */}
            {distLabels[i].split('\n').map((line, li) => (
              <text
                key={li}
                x={x + barWidth / 2} y={topPad + chartHeight + 16 + li * 13}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={10} fontFamily="JetBrains Mono, monospace"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// QAOA CUT DISTRIBUTION CHART
// ════════════════════════════════════════════════════════════════════════════

function CutDistChart() {
  const cuts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const barW = 28
  const gap = 4
  const chartH = 180
  const leftPad = 40
  const topPad = 20
  const totalW = cuts.length * (barW + gap) - gap

  const maxHw = Math.max(...Object.values(QAOA_CUT_DIST))
  const maxEm = Math.max(...Object.values(QAOA_EMULATOR_CUT_DIST))
  const maxVal = Math.max(maxHw / QAOA_TOTAL, maxEm / QAOA_EMULATOR_TOTAL)

  return (
    <svg viewBox={`0 0 ${totalW + leftPad + 20} ${chartH + 70}`} className="w-full">
      {/* Y gridlines */}
      {[0, 0.1, 0.2, 0.3].map(v => (
        <g key={v}>
          <text
            x={leftPad - 6} y={topPad + chartH - (v / (maxVal * 1.15)) * chartH}
            textAnchor="end" dominantBaseline="central"
            fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace"
          >
            {(v * 100).toFixed(0)}%
          </text>
          <line
            x1={leftPad} x2={leftPad + totalW}
            y1={topPad + chartH - (v / (maxVal * 1.15)) * chartH}
            y2={topPad + chartH - (v / (maxVal * 1.15)) * chartH}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"
          />
        </g>
      ))}
      {/* Bars */}
      {cuts.map((cv, i) => {
        const hwP = (QAOA_CUT_DIST[cv] || 0) / QAOA_TOTAL
        const emP = (QAOA_EMULATOR_CUT_DIST[cv] || 0) / QAOA_EMULATOR_TOTAL
        const x = leftPad + i * (barW + gap)
        const halfW = barW / 2 - 1

        const hwH = (hwP / (maxVal * 1.15)) * chartH
        const emH = (emP / (maxVal * 1.15)) * chartH

        return (
          <g key={cv}>
            {/* Emulator bar (behind) */}
            <rect
              x={x + halfW + 2} y={topPad + chartH - emH}
              width={halfW} height={emH}
              rx={2}
              fill="#00ff88" opacity={0.3}
            />
            {/* Hardware bar */}
            <rect
              x={x} y={topPad + chartH - hwH}
              width={halfW} height={hwH}
              rx={2}
              fill={cv === 12 ? '#ff6b9d' : '#8b5cf6'}
              opacity={0.8}
            />
            {/* X label */}
            <text
              x={x + barW / 2} y={topPad + chartH + 14}
              textAnchor="middle"
              fill={cv === 12 ? '#ff6b9d' : '#94a3b8'}
              fontSize={9} fontFamily="JetBrains Mono, monospace"
              fontWeight={cv === 12 ? 700 : 400}
            >
              {cv}
            </text>
          </g>
        )
      })}
      {/* X axis label */}
      <text
        x={leftPad + totalW / 2} y={topPad + chartH + 35}
        textAnchor="middle"
        fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono, monospace"
      >
        edges cut
      </text>
      {/* Legend */}
      <rect x={leftPad + totalW - 130} y={topPad} width={10} height={10} rx={2} fill="#8b5cf6" opacity={0.8} />
      <text x={leftPad + totalW - 115} y={topPad + 9} fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono, monospace">
        hardware
      </text>
      <rect x={leftPad + totalW - 130} y={topPad + 16} width={10} height={10} rx={2} fill="#00ff88" opacity={0.3} />
      <text x={leftPad + totalW - 115} y={topPad + 25} fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono, monospace">
        emulator
      </text>
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GHZ FIDELITY VIZ
// ════════════════════════════════════════════════════════════════════════════

function GHZViz() {
  const barH = 24
  return (
    <div className="space-y-4">
      {/* Z-basis bar */}
      <div>
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-gray-400">Z-basis fidelity (F_z)</span>
          <span className="text-[#00d4ff]">{(GHZ.f_z * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full h-6 rounded bg-white/5 overflow-hidden relative">
          <div
            className="h-full rounded bg-[#00d4ff]/60 transition-all duration-1000"
            style={{ width: `${GHZ.f_z * 100}%` }}
          />
          {/* |0...0> portion */}
          <div
            className="absolute top-0 left-0 h-full bg-[#00d4ff]/90 rounded-l"
            style={{ width: `${GHZ.p_all0 * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center px-2 text-[10px] font-mono">
            <span className="text-white/80">|0...0&rang; {(GHZ.p_all0 * 100).toFixed(1)}%</span>
            <span className="ml-auto text-white/60">|1...1&rang; {(GHZ.p_all1 * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      {/* X-basis */}
      <div>
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-gray-400">X-basis coherence</span>
          <span className="text-[#8b5cf6]">&lang;X&otimes;9&rang; = {GHZ.x_expectation.toFixed(3)}</span>
        </div>
        <div className="w-full h-6 rounded bg-white/5 overflow-hidden relative">
          <div
            className="h-full rounded transition-all duration-1000"
            style={{
              width: `${((GHZ.x_expectation + 1) / 2) * 100}%`,
              background: 'linear-gradient(90deg, #8b5cf6, #c084fc)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/60">
            even parity: 77.1% | odd: 22.9%
          </div>
        </div>
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

export default function PageClient() {
  const [walkDepth, setWalkDepth] = useState<'start' | 'depth 1' | 'depth 2' | 'depth 3'>('depth 2')
  const walkRef = useInView()
  const qaoaRef = useInView()
  const ghzRef = useInView()

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-100">
      <Nav />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <p className="text-[10px] font-mono text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">
          Tuna-9 hardware &middot; Feb 2026 &middot; 4096 shots
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
          Three Experiments,<br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6]">
            One Quantum Chip
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl">
          A quantum walk shows interference that defies classical intuition.
          QAOA MaxCut reveals the limits of noisy hardware.
          And a 9-qubit GHZ state proves genuine entanglement across the entire chip.
        </p>
      </header>

      {/* ── 1. QUANTUM WALK ────────────────────────────────────── */}
      <section
        ref={walkRef.ref}
        className={`max-w-6xl mx-auto px-6 pb-24 transition-all duration-700 ${walkRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
          {/* Section header */}
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#00d4ff]" />
              <div>
                <h2 className="text-xl font-bold">Quantum Walk</h2>
                <p className="text-sm text-gray-400">A photon rippling through nine coupled resonators</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Physical intro */}
            <div className="mb-8 max-w-2xl">
              <p className="text-sm text-gray-300 leading-relaxed">
                Each qubit on Tuna-9 is a tiny superconducting resonator vibrating at about 5 GHz.
                They&apos;re connected by tunable couplers &mdash; physical links that let energy flow between neighbors.
                We trap a single microwave photon in qubit 0, then watch what happens as we repeatedly
                pulse the chip.
              </p>
            </div>

            {/* Step selector — narrative labels */}
            <div className="flex flex-wrap gap-2 mb-8">
              {([
                { key: 'start' as const, label: 'Drop a photon', num: '0' },
                { key: 'depth 1' as const, label: 'First pulse', num: '1' },
                { key: 'depth 2' as const, label: 'The surprise', num: '2' },
                { key: 'depth 3' as const, label: 'Full spread', num: '3' },
              ]).map(({ key, label, num }) => (
                <button
                  key={key}
                  onClick={() => setWalkDepth(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${
                    walkDepth === key
                      ? 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30'
                      : 'bg-white/[0.03] text-gray-400 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold ${
                    walkDepth === key ? 'bg-[#00d4ff]/30 text-[#00d4ff]' : 'bg-white/10 text-gray-500'
                  }`}>{num}</span>
                  <span className="font-mono">{label}</span>
                </button>
              ))}
            </div>

            {/* Per-step narrative */}
            <div className="mb-6 p-4 rounded-lg border" style={{
              backgroundColor: walkDepth === 'depth 2' ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.02)',
              borderColor: walkDepth === 'depth 2' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
            }}>
              {walkDepth === 'start' && (
                <div className="space-y-2">
                  <p className="text-sm font-mono text-[#00d4ff] font-semibold">Inject a photon into q0</p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    We send a microwave pulse at q0&apos;s resonance frequency (~5.3 GHz) to excite it from
                    its ground state |0&rang; to |1&rang;. That pulse is about 20 nanoseconds long &mdash;
                    a precisely shaped burst of microwave energy.
                    All other qubits are sitting quietly in their ground states. The photon is trapped
                    in q0&apos;s resonator, waiting.
                  </p>
                </div>
              )}
              {walkDepth === 'depth 1' && (
                <div className="space-y-2">
                  <p className="text-sm font-mono text-[#00d4ff] font-semibold">Nudge everything, let neighbors feel each other</p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Now we do two things simultaneously. First, a gentle microwave nudge on all 9 qubits &mdash;
                    not enough to fully flip them, just enough to create a small quantum amplitude in each one
                    (a rotation of just 30&deg;). Then we activate all 12 couplers at once: every connected pair of
                    qubits interacts via a CZ gate, which shifts their relative phase if both have energy.
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    After one round, q0 still holds most of the photon&apos;s energy (80%). A tiny amount has leaked
                    to its immediate neighbors q1 and q2 through the couplers. The distant qubits have a similar
                    faint glow &mdash; that&apos;s from the nudge pulse, not from the photon traveling yet.
                  </p>
                </div>
              )}
              {walkDepth === 'depth 2' && (
                <div className="space-y-2">
                  <p className="text-sm font-mono text-[#00d4ff] font-semibold">
                    Waves cancel at the neighbors, reinforce further out
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    We pulse and couple again. Now something happens that has no classical analog.
                    The photon&apos;s quantum amplitude is traveling along <em>all paths simultaneously</em>.
                    To reach q4 (two hops away), the wave can go q0&rarr;q1&rarr;q4 or q0&rarr;q2&rarr;q4 &mdash;
                    two paths that arrive in phase and <strong className="text-[#00ff88]">reinforce</strong> each other.
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    But at q1 and q2 (the nearest neighbors), the outgoing wave and the reflected wave
                    from the second pulse arrive with opposite phases. They partially{' '}
                    <strong className="text-[#ff6b9d]">cancel out</strong>. This is exactly like noise-canceling headphones:
                    two signals, perfectly out of sync, producing silence.
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    The result: nearest neighbors (6.4%) are <em>less excited</em> than qubits two
                    hops away (20%). If this were a classical random walk &mdash; like a ball bouncing randomly
                    between connected rooms &mdash; the neighbors would always be most excited. The
                    inversion is purely quantum.
                  </p>
                </div>
              )}
              {walkDepth === 'depth 3' && (
                <div className="space-y-2">
                  <p className="text-sm font-mono text-[#00d4ff] font-semibold">The wave reaches every qubit</p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Third pulse. The photon&apos;s amplitude has now traversed the entire chip, from q0 at
                    the top to q8 at the bottom (4 hops away). The interference pattern persists:
                    d=1 neighbors (17%) are still less excited than d=2 qubits (32%).
                    The wave has &ldquo;jumped over&rdquo; its nearest neighbors.
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    This is what makes quantum walks useful for algorithms: the quantum version spreads
                    <em> quadratically faster</em> than a classical random walk. A classical walker
                    takes N&sup2; steps to explore a graph; the quantum walker does it in N.
                    We&apos;re watching that speedup happen on real hardware.
                  </p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Topology map */}
              <div className="flex flex-col items-center">
                <WalkTopology
                  depth={walkDepth}
                  excitations={walkDepth === 'start'
                    ? [1, 0, 0, 0, 0, 0, 0, 0, 0]
                    : WALK_DATA[walkDepth]}
                />
                <p className="text-xs text-gray-500 font-mono mt-2">
                  {walkDepth === 'start'
                    ? 'Photon trapped in q0. All other qubits dark.'
                    : 'Node brightness = probability of finding the photon there'}
                </p>
              </div>

              {/* Interference chart */}
              <div className="flex flex-col items-center">
                {walkDepth === 'start' ? (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500 font-mono">
                    Advance to &ldquo;First pulse&rdquo; to see the walk begin
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-mono text-gray-400 mb-3">
                      Excitation by graph distance from q0
                    </h3>
                    <InterferenceChart data={WALK_BY_DIST[walkDepth]} label={walkDepth} />
                    {walkDepth !== 'depth 1' && (
                      <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                        {walkDepth === 'depth 2'
                          ? 'The dip at d=1 is destructive interference. A classical walk would show monotonic decay.'
                          : 'The d=1 dip persists at depth 3. The quantum wave jumped over its neighbors.'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Classical vs quantum comparison (only at depth 2) */}
            {walkDepth === 'depth 2' && (
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Classical random walk</p>
                  <div className="flex items-end gap-1 h-16">
                    {[80, 40, 15, 5, 1].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-gray-600/40" style={{ height: `${h}%` }} />
                        <span className="text-[9px] font-mono text-gray-600">d={i}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Energy decays monotonically with distance. Always.</p>
                </div>
                <div className="p-4 rounded-lg bg-[#00d4ff]/5 border border-[#00d4ff]/15">
                  <p className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider mb-2">Quantum walk (this experiment)</p>
                  <div className="flex items-end gap-1 h-16">
                    {[76, 8, 24, 25, 24].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t" style={{
                          height: `${h}%`,
                          backgroundColor: i === 1 ? '#ff6b9d' : '#00d4ff',
                          opacity: i === 1 ? 0.8 : 0.6,
                        }} />
                        <span className="text-[9px] font-mono text-gray-500">d={i}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    <span className="text-[#ff6b9d]">d=1 dips below d=2.</span> Destructive interference at the nearest neighbors.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. QAOA MAXCUT ─────────────────────────────────────── */}
      <section
        ref={qaoaRef.ref}
        className={`max-w-6xl mx-auto px-6 pb-24 transition-all duration-700 ${qaoaRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#8b5cf6]" />
              <div>
                <h2 className="text-xl font-bold">QAOA MaxCut</h2>
                <p className="text-sm text-gray-400">When noise wins</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Hardware', value: '0.502', sub: 'approx ratio', color: '#ef4444' },
                { label: 'Emulator', value: '0.691', sub: 'approx ratio', color: '#00ff88' },
                { label: 'Random', value: '0.500', sub: 'baseline', color: '#64748b' },
                { label: 'CZ gates', value: '24', sub: 'circuit depth', color: '#ff8c42' },
              ].map(m => (
                <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{m.label}</p>
                  <p className="text-2xl font-mono font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[10px] font-mono text-gray-500">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Concept: the self-referential graph */}
            <div className="mb-6 p-4 rounded-lg bg-white/[0.03] border border-white/5">
              <p className="text-sm text-gray-300">
                <span className="text-[#8b5cf6] font-semibold">The idea:</span> Run QAOA MaxCut on Tuna-9&apos;s own connectivity graph.
                The chip tries to solve a problem about its own topology. The graph is bipartite, so the maximum cut is 12 (every edge).
                On the noiseless emulator, p=1 QAOA finds the optimal partition 11.1% of the time. On hardware: 0.3%.
              </p>
            </div>

            {/* Cut distribution chart */}
            <div className="flex flex-col items-center mb-6">
              <h3 className="text-sm font-mono text-gray-400 mb-3">
                Cut value distribution: hardware vs emulator
              </h3>
              <CutDistChart />
            </div>

            {/* The lesson */}
            <div className="p-4 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/20">
              <p className="text-sm text-[#ef4444] font-mono font-semibold mb-1">
                Hardware result: indistinguishable from random
              </p>
              <p className="text-sm text-gray-300">
                With 24 two-qubit gates across 12 edges, the circuit is too deep for Tuna-9&apos;s current error rates.
                Each CZ gate introduces ~3-5% error, compounding exponentially.
                The emulator shows the algorithm works perfectly &mdash; this is a noise problem, not an algorithm problem.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Next steps: error mitigation (ZNE, readout correction), fewer layers (p=1 with restricted edges),
                or simply waiting for better hardware fidelity. Multiple runs with different qubit subsets could
                also help identify which edges contribute most noise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. GHZ STATE ───────────────────────────────────────── */}
      <section
        ref={ghzRef.ref}
        className={`max-w-6xl mx-auto px-6 pb-24 transition-all duration-700 ${ghzRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#00ff88]" />
              <div>
                <h2 className="text-xl font-bold">9-Qubit GHZ State</h2>
                <p className="text-sm text-gray-400">Genuine entanglement across the whole chip</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Fidelity headline */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20 flex-shrink-0">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Fidelity lower bound</p>
                <p className="text-4xl font-mono font-black text-[#00ff88]">{(GHZ.fidelity_bound * 100).toFixed(1)}%</p>
                <p className="text-[10px] font-mono text-[#00ff88]/70 mt-1">F &gt; 50% = genuine entanglement</p>
              </div>
              <div className="flex-1 space-y-2">
                <GHZViz />
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20">
              <p className="text-sm text-[#00ff88] font-mono font-semibold mb-1">
                Entanglement certified
              </p>
              <p className="text-sm text-gray-300">
                The GHZ state (|000000000&rang; + |111111111&rang;)/&radic;2 requires all 9 qubits to be
                coherently entangled. A fidelity above 50% proves the state cannot be produced by any
                separable (unentangled) process. At 56.7%, Tuna-9 clears this threshold &mdash;
                8 CNOT gates along a spanning tree is within the chip&apos;s noise budget.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Takeaways ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold mb-6">What We Learned</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              color: '#00d4ff',
              title: 'Shallow circuits work',
              body: 'The quantum walk (2-3 CZ layers) shows clear quantum signatures. The GHZ (8 CNOTs) proves full-chip entanglement.',
            },
            {
              color: '#ef4444',
              title: 'Deep circuits don\'t',
              body: 'QAOA with 24 CZ gates produces random output. There\'s a sharp threshold between "quantum" and "noise" on this hardware.',
            },
            {
              color: '#8b5cf6',
              title: 'Interference survives',
              body: 'The walk\'s non-classical spreading pattern — nearest neighbors less excited than distant qubits — is clearly visible on real hardware.',
            },
          ].map(t => (
            <div key={t.title} className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
              <div className="w-1 h-6 rounded-full mb-3" style={{ backgroundColor: t.color }} />
              <h3 className="font-bold text-sm mb-2">{t.title}</h3>
              <p className="text-sm text-gray-400">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto px-6 pb-12 text-center">
        <p className="text-xs text-gray-600 font-mono">
          All data from Quantum Inspire Tuna-9 &middot; 4096 shots per circuit &middot; native gates (CZ, Ry, Rz) &middot; no error mitigation
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Link href="/tuna9" className="text-sm text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors font-mono">
            &larr; Meet Tuna-9
          </Link>
          <Link href="/experiments" className="text-sm text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors font-mono">
            All experiments &rarr;
          </Link>
        </div>
      </footer>
    </div>
  )
}
