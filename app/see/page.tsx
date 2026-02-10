'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

// Map GHz to audible Hz: 4.5 GHz → 220 Hz, 7.0 GHz → 880 Hz
function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

// ============================================================
// ACT 1: ONE QUBIT — Physical transmon visualization
// ============================================================

function TransmonScene({ playing, elapsed }: { playing: boolean; elapsed: number }) {
  // Animation phases (seconds)
  const t = elapsed / 1000
  const microwaveActive = playing && t > 0.3 && t < 3.5
  const decaying = playing && t > 2.5
  const decayFactor = decaying ? Math.exp(-(t - 2.5) / 1.5) : 1
  const qubitGlow = microwaveActive ? decayFactor : 0

  // Microwave wave animation
  const wavePhase = elapsed * 0.008

  return (
    <div className="relative w-full">
      {/* Main scene */}
      <svg viewBox="0 0 800 520" className="w-full" style={{ maxHeight: '70vh' }}>
        <defs>
          {/* Chip substrate gradient */}
          <linearGradient id="chip-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#16213e" />
          </linearGradient>
          {/* Qubit glow */}
          <radialGradient id="qubit-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity={qubitGlow * 0.6} />
            <stop offset="70%" stopColor="#00d4ff" stopOpacity={qubitGlow * 0.2} />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </radialGradient>
          {/* Ground plane pattern */}
          <pattern id="ground-dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="0.5" fill="#334155" opacity="0.3" />
          </pattern>
          {/* Microwave gradient */}
          <linearGradient id="mw-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ─── BACKGROUND: Dilution refrigerator context ─── */}
        <rect x="0" y="0" width="800" height="520" fill="#0a0a1a" />

        {/* Temperature label */}
        <text x="20" y="30" fill="#475569" fontSize="11" fontFamily="monospace">
          15 mK — mixing chamber plate
        </text>
        <text x="20" y="46" fill="#374151" fontSize="9" fontFamily="monospace">
          inside the dilution refrigerator
        </text>

        {/* ─── THE CHIP ─── */}
        {/* Chip outline — silicon substrate */}
        <rect x="180" y="80" width="440" height="380" rx="4" fill="url(#chip-grad)"
          stroke="#1e3a5f" strokeWidth="2" />
        <text x="200" y="106" fill="#2d4a6f" fontSize="9" fontFamily="monospace">
          silicon substrate — 7 mm × 7 mm
        </text>

        {/* Ground plane */}
        <rect x="195" y="115" width="410" height="330" rx="2" fill="#0f1729" />
        <rect x="195" y="115" width="410" height="330" rx="2" fill="url(#ground-dots)" />

        {/* ─── COPLANAR WAVEGUIDE — Drive line ─── */}
        {/* The drive line comes from the left edge of the chip */}
        {/* CPW: center conductor with gaps to ground */}

        {/* Gap above center conductor */}
        <rect x="180" y="262" width="200" height="5" fill="#0a0a1a" rx="1" />
        {/* Center conductor */}
        <rect x="180" y="267" width="200" height="6" fill="#7c8db5" rx="1" />
        {/* Gap below center conductor */}
        <rect x="180" y="273" width="200" height="5" fill="#0a0a1a" rx="1" />

        {/* Coupling gap — the drive line stops short of the qubit */}
        <rect x="378" y="260" width="14" height="20" fill="#0a0a1a" rx="1" />

        {/* Drive line label */}
        <text x="210" y="256" fill="#7c8db5" fontSize="8" fontFamily="monospace">
          XY drive line (coplanar waveguide)
        </text>

        {/* Label: coupling capacitor */}
        <line x1="385" y1="250" x2="385" y2="240" stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2" />
        <text x="370" y="236" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">
          coupling gap
        </text>
        <text x="370" y="245" fill="#475569" fontSize="6" fontFamily="monospace" textAnchor="middle">
          ~20 μm
        </text>

        {/* ─── MICROWAVE SIGNAL ─── */}
        {microwaveActive && (
          <g opacity={decayFactor}>
            {/* Traveling wave pulses along drive line */}
            {Array.from({ length: 12 }, (_, i) => {
              const x = 195 + ((wavePhase + i * 18) % 180)
              const amp = Math.sin((wavePhase + i * 18) * 0.15) * 8
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={270 + amp}
                  r="2.5"
                  fill="#f59e0b"
                  opacity={0.4 + 0.3 * Math.sin(i * 0.8)}
                />
              )
            })}
            {/* Wave visualization above the line */}
            <path
              d={Array.from({ length: 40 }, (_, i) => {
                const x = 195 + i * 4.5
                const y = 252 + Math.sin(wavePhase * 0.3 + i * 0.5) * 6 * decayFactor
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              opacity="0.5"
            />
          </g>
        )}

        {/* ─── THE TRANSMON QUBIT — Xmon cross shape ─── */}
        <g transform="translate(430, 270)">
          {/* Glow when driven */}
          <circle cx="0" cy="0" r="70" fill="url(#qubit-glow)" />

          {/* Cross-shaped capacitor pads */}
          {/* Vertical arm (top) — connects to readout resonator */}
          <rect x="-12" y="-55" width="24" height="40" rx="2" fill="#6366f1" opacity="0.85" />
          {/* Vertical arm (bottom) — connects to coupling bus */}
          <rect x="-12" y="15" width="24" height="40" rx="2" fill="#6366f1" opacity="0.85" />
          {/* Horizontal arm (left) — connects to drive line */}
          <rect x="-55" y="-12" width="40" height="24" rx="2" fill="#6366f1" opacity="0.85" />
          {/* Horizontal arm (right) — connects to Z line */}
          <rect x="15" y="-12" width="40" height="24" rx="2" fill="#6366f1" opacity="0.85" />
          {/* Center square */}
          <rect x="-12" y="-12" width="24" height="24" rx="1" fill="#6366f1" opacity="0.9" />

          {/* Josephson junction — tiny mark at center */}
          <rect x="-2" y="-2" width="4" height="4" rx="0.5" fill="#f472b6" />
          <circle cx="0" cy="0" r="5" fill="none" stroke="#f472b6" strokeWidth="0.5" opacity="0.6" />

          {/* Etched gaps between pads and ground plane */}
          {/* Around the entire cross */}
          <rect x="-60" y="-17" width="5" height="34" fill="#0a0a1a" rx="0.5" />
          <rect x="55" y="-17" width="5" height="34" fill="#0a0a1a" rx="0.5" />
          <rect x="-17" y="-60" width="34" height="5" fill="#0a0a1a" rx="0.5" />
          <rect x="-17" y="55" width="34" height="5" fill="#0a0a1a" rx="0.5" />

          {/* Qubit resonance animation — rings expanding outward */}
          {microwaveActive && Array.from({ length: 3 }, (_, i) => {
            const r = 20 + ((elapsed * 0.03 + i * 25) % 60)
            const opacity = Math.max(0, 0.3 - r / 200) * decayFactor
            return (
              <circle
                key={i}
                cx="0" cy="0" r={r}
                fill="none"
                stroke="#00d4ff"
                strokeWidth="1"
                opacity={opacity}
              />
            )
          })}
        </g>

        {/* ─── QUBIT LABELS ─── */}
        <text x="430" y="200" textAnchor="middle" fill="#6366f1" fontSize="9" fontFamily="monospace" fontWeight="bold">
          transmon qubit (Xmon)
        </text>

        {/* Arm labels */}
        <text x="350" y="295" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="end">
          drive
        </text>
        <text x="510" y="295" fill="#475569" fontSize="7" fontFamily="monospace">
          flux (Z)
        </text>
        <text x="430" y="215" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">
          readout ↑
        </text>
        <text x="430" y="340" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">
          ↓ coupling bus
        </text>

        {/* ─── READOUT RESONATOR — meandering CPW ─── */}
        {/* Serpentine resonator above the qubit */}
        <path
          d="M 430 215 L 430 180 L 480 180 L 480 170 L 380 170 L 380 160 L 480 160 L 480 150 L 380 150 L 380 140 L 500 140"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          opacity="0.6"
          strokeLinecap="round"
        />
        <text x="510" y="143" fill="#22c55e" fontSize="7" fontFamily="monospace" opacity="0.7">
          readout resonator
        </text>
        <text x="510" y="153" fill="#22c55e" fontSize="6" fontFamily="monospace" opacity="0.5">
          λ/4 ≈ 5 mm (meandered)
        </text>

        {/* ─── FEEDLINE — horizontal CPW across the top ─── */}
        <rect x="195" y="130" width="410" height="2" fill="#22c55e" opacity="0.3" />
        <text x="520" y="127" fill="#22c55e" fontSize="7" fontFamily="monospace" opacity="0.4">
          feedline
        </text>

        {/* ─── ZOOM INSET: Josephson junction ─── */}
        <g transform="translate(600, 340)">
          <rect x="0" y="0" width="130" height="110" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          <text x="10" y="16" fill="#f472b6" fontSize="8" fontFamily="monospace" fontWeight="bold">
            Josephson junction
          </text>
          <text x="10" y="28" fill="#475569" fontSize="6" fontFamily="monospace">
            ~200 nm × 200 nm
          </text>

          {/* Two overlapping Al strips */}
          <g transform="translate(30, 50)">
            {/* Bottom electrode */}
            <rect x="0" y="10" width="70" height="14" rx="1" fill="#94a3b8" opacity="0.7"
              transform="rotate(-8, 35, 17)" />
            <text x="75" y="22" fill="#64748b" fontSize="6" fontFamily="monospace">Al</text>

            {/* AlOx barrier (the overlap) */}
            <rect x="20" y="8" width="20" height="18" rx="1" fill="#f472b6" opacity="0.3" />

            {/* Top electrode */}
            <rect x="0" y="8" width="70" height="14" rx="1" fill="#94a3b8" opacity="0.5"
              transform="rotate(8, 35, 15)" />
            <text x="75" y="12" fill="#64748b" fontSize="6" fontFamily="monospace">Al</text>

            {/* Barrier label */}
            <line x1="30" y1="30" x2="30" y2="42" stroke="#f472b6" strokeWidth="0.5" />
            <text x="30" y="50" fill="#f472b6" fontSize="6" fontFamily="monospace" textAnchor="middle">
              AlOx barrier
            </text>
            <text x="30" y="58" fill="#475569" fontSize="5" fontFamily="monospace" textAnchor="middle">
              2-4 nm thick
            </text>
          </g>

          {/* Zoom line connecting to main qubit */}
          <line x1="0" y1="55" x2="-155" y2="-65" stroke="#f472b6" strokeWidth="0.5"
            strokeDasharray="3,3" opacity="0.4" />
        </g>

        {/* ─── CABLE FROM OUTSIDE ─── */}
        {/* Coax cable entering from left edge */}
        <line x1="0" y1="270" x2="180" y2="270" stroke="#7c8db5" strokeWidth="3" />
        <line x1="0" y1="270" x2="180" y2="270" stroke="#0a0a1a" strokeWidth="1" />
        <text x="10" y="262" fill="#475569" fontSize="8" fontFamily="monospace">
          from microwave generator
        </text>
        <text x="10" y="290" fill="#374151" fontSize="7" fontFamily="monospace">
          coax cable (attenuated)
        </text>

        {/* ─── ENERGY LEVEL DIAGRAM ─── */}
        <g transform="translate(620, 80)">
          <text x="0" y="0" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold">
            Energy levels
          </text>

          {/* |0⟩ level */}
          <line x1="10" y1="70" x2="70" y2="70" stroke="#00d4ff" strokeWidth="2" />
          <text x="80" y="74" fill="#00d4ff" fontSize="9" fontFamily="monospace">|0⟩</text>

          {/* |1⟩ level */}
          <line x1="10" y1="30" x2="70" y2="30" stroke="#00d4ff" strokeWidth="2" opacity={qubitGlow > 0.1 ? 1 : 0.4} />
          <text x="80" y="34" fill="#00d4ff" fontSize="9" fontFamily="monospace" opacity={qubitGlow > 0.1 ? 1 : 0.4}>|1⟩</text>

          {/* Transition arrow */}
          <line x1="40" y1="65" x2="40" y2="35" stroke="#f59e0b" strokeWidth="1.5"
            opacity={microwaveActive ? 0.8 : 0.2}
            markerEnd="url(#arrowhead)" />
          <text x="48" y="53" fill="#f59e0b" fontSize="7" fontFamily="monospace"
            opacity={microwaveActive ? 0.8 : 0.2}>
            5.55 GHz
          </text>

          {/* |2⟩ level (anharmonic — why it's a qubit not just a resonator) */}
          <line x1="10" y1="0" x2="70" y2="0" stroke="#475569" strokeWidth="1" strokeDasharray="3,3" />
          <text x="80" y="4" fill="#475569" fontSize="7" fontFamily="monospace">|2⟩ (detuned)</text>

          {/* Anharmonicity bracket */}
          <text x="0" y="52" fill="#374151" fontSize="6" fontFamily="monospace"
            transform="rotate(-90, 0, 52)" textAnchor="middle">
            ℏω₀₁
          </text>
        </g>

        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#f59e0b" />
          </marker>
        </defs>

        {/* ─── SCALE BAR ─── */}
        <g transform="translate(200, 470)">
          <line x1="0" y1="0" x2="60" y2="0" stroke="#475569" strokeWidth="1" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#475569" strokeWidth="1" />
          <line x1="60" y1="-3" x2="60" y2="3" stroke="#475569" strokeWidth="1" />
          <text x="30" y="12" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">
            ~1 mm
          </text>
        </g>

        {/* Chip dimensions */}
        <text x="400" y="475" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="middle">
          Qubit cross: ~300 μm &nbsp;&nbsp;|&nbsp;&nbsp; Junction: ~200 nm &nbsp;&nbsp;|&nbsp;&nbsp; Barrier: ~3 nm
        </text>

        {/* T2 decay indicator */}
        {playing && t > 2.5 && (
          <g transform="translate(430, 380)">
            <text x="0" y="0" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="monospace"
              opacity={Math.min(1, (t - 2.5) / 1.5)}>
              T2 decoherence — information leaking to environment
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function SeePage() {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)

  const stopAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setPlaying(false)
    setElapsed(0)
  }, [])

  const playQubit = useCallback(() => {
    if (playing) { stopAll(); return }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    // Play the same audio as /listen Act 1
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = ghzToHz(5.55)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.35, now + 0.1)
    gain.gain.setValueAtTime(0.35, now + 2.5)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4.8)
    osc.connect(gain).connect(master)
    osc.start(now)
    osc.stop(now + 5)

    setPlaying(true)
    startTimeRef.current = performance.now()

    // Animation loop
    const animate = () => {
      setElapsed(performance.now() - startTimeRef.current)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    // Auto-stop
    timerRef.current = setTimeout(() => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setPlaying(false)
      setElapsed(0)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }, 5200)
  }, [playing, stopAll])

  useEffect(() => () => stopAll(), [stopAll])

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-6">
          <Link href="/listen" className="text-sm text-gray-400 hover:text-quantum-accent transition-colors mb-4 inline-block">
            &larr; back to Listen
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">See a Quantum Computer</span>
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
            What does a qubit actually look like? Not the math — the metal.
            A transmon qubit is a superconducting circuit cooled to 15 millikelvin,
            driven by microwave pulses at ~5 GHz. Here&apos;s the physical picture.
          </p>
        </div>

        {/* Act 1 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-mono text-gray-600">1 / 9</span>
            <h2 className="text-lg font-bold text-[#00d4ff]">One Qubit</h2>
            <span className="text-xs text-gray-500">&mdash; a resonator with a natural frequency</span>
            <button
              onClick={playQubit}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor: playing ? '#00d4ff60' : '#00d4ff30',
                backgroundColor: playing ? '#00d4ff15' : '#00d4ff08',
                color: '#00d4ff',
              }}
            >
              <span>{playing ? '\u25A0' : '\u25B6'}</span>
              {playing ? 'Stop' : 'Play + animate'}
            </button>
          </div>

          {/* Progress bar */}
          {playing && (
            <div className="mb-4 h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00d4ff] transition-all duration-75"
                style={{ width: `${Math.min(100, (elapsed / 5000) * 100)}%` }}
              />
            </div>
          )}

          {/* Main visualization */}
          <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#0a0a1a]">
            <TransmonScene playing={playing} elapsed={elapsed} />
          </div>
        </div>

        {/* Explanation panels */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-lg bg-[#0f172a] border border-gray-800">
            <h3 className="text-xs font-bold text-[#6366f1] uppercase tracking-wider mb-2">The transmon</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              A cross-shaped superconducting circuit (niobium on silicon). The four arms connect to:
              the drive line (microwave control), flux line (frequency tuning), readout resonator (measurement),
              and coupling bus (entanglement with neighbors). At the center: a Josephson junction —
              a 200 nm aluminum sandwich that makes the energy levels unequal, turning a simple resonator into a qubit.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0f172a] border border-gray-800">
            <h3 className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-2">The microwave</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Qubit 2 on Tuna-9 resonates at 5.55 GHz — the same frequency as your Wi-Fi router,
              but with exquisite precision. A shaped microwave pulse travels down a coplanar waveguide
              and couples to the qubit across a ~20 μm gap. The pulse doesn&apos;t touch the qubit —
              it drives it through capacitive coupling, like a tuning fork resonating with a nearby surface.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0f172a] border border-gray-800">
            <h3 className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-2">The decay</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              The tone fades because quantum information is fragile. Thermal photons, magnetic fluctuations,
              and defects in the junction oxide (two-level systems) all steal energy and phase from the qubit.
              On Tuna-9, the coherence time T2 is ~10-20 μs — enough for a few hundred gate operations
              before the quantum state dissolves into classical noise.
            </p>
          </div>
        </div>

        {/* Physical scale callout */}
        <details className="mb-12 text-sm">
          <summary className="text-gray-500 hover:text-gray-300 cursor-pointer text-xs font-mono uppercase tracking-wider">
            Six orders of magnitude
          </summary>
          <div className="mt-4 space-y-2 text-gray-400 text-xs leading-relaxed border-l border-gray-800 pl-4">
            <p><strong className="text-gray-300 font-mono">7 mm</strong> — the silicon chip</p>
            <p><strong className="text-gray-300 font-mono">5 mm</strong> — the readout resonator (meandered)</p>
            <p><strong className="text-gray-300 font-mono">300 μm</strong> — the qubit cross (arm to arm)</p>
            <p><strong className="text-gray-300 font-mono">20 μm</strong> — the coupling gap</p>
            <p><strong className="text-gray-300 font-mono">200 nm</strong> — the Josephson junction</p>
            <p><strong className="text-gray-300 font-mono">3 nm</strong> — the AlOx tunnel barrier</p>
            <p className="text-gray-600 mt-2">
              The barrier that makes quantum computing possible is about 10 atoms thick.
            </p>
          </div>
        </details>

        {/* Navigation hint */}
        <div className="text-center text-xs text-gray-600 font-mono">
          Act 1 of 9 &mdash; more acts coming soon
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-12 mt-8 border-t border-gray-800">
          <Link href="/listen" className="text-[#00d4ff] hover:underline">Listen</Link>
          {' '}&middot;{' '}
          <Link href="/resonance" className="text-gray-500 hover:text-[#00d4ff]">Resonance</Link>
          {' '}&middot;{' '}
          <Link href="/" className="text-gray-500 hover:text-[#00d4ff]">haiqu</Link>
        </footer>
      </div>
    </div>
  )
}
