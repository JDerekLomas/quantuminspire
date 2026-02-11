'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// Scroll-driven reveal
// ============================================================

function useInView(threshold = 0.35) {
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

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView(0.2)
  return (
    <div ref={ref}
      className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >{children}</div>
  )
}

function Divider() {
  return <div className="max-w-5xl mx-auto px-6"><div className="border-t border-gray-900" /></div>
}

function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

// ============================================================
// STEP 1: THE CHIP
// ============================================================

function StepChip() {
  return (
    <Section className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <svg viewBox="0 0 400 400" className="w-full">
          <rect x="0" y="0" width="400" height="400" fill="#060610" />
          <rect x="60" y="60" width="280" height="280" rx="4"
            fill="#0d1117" stroke="#1a2332" strokeWidth="2" />
          <rect x="75" y="75" width="250" height="250" rx="2" fill="#0a0f1a" />
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line x1={75 + i * 62.5} y1="75" x2={75 + i * 62.5} y2="325" stroke="#111827" strokeWidth="0.3" />
              <line x1="75" y1={75 + i * 62.5} x2="325" y2={75 + i * 62.5} stroke="#111827" strokeWidth="0.3" />
            </g>
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <rect x={90 + i * 33} y="62" width="12" height="14" rx="1" fill="#1e293b" />
              <rect x={90 + i * 33} y="324" width="12" height="14" rx="1" fill="#1e293b" />
              <rect x="62" y={90 + i * 33} width="14" height="12" rx="1" fill="#1e293b" />
              <rect x="324" y={90 + i * 33} width="14" height="12" rx="1" fill="#1e293b" />
            </g>
          ))}
        </svg>
        <div className="mt-8 text-center">
          <p className="text-gray-300 text-lg font-light">A silicon chip. 7 millimeters across.</p>
          <p className="text-gray-600 text-sm mt-2">
            Cooled to 15 millikelvin — colder than outer space.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ============================================================
// STEP 2: WHY SO COLD
// ============================================================

function StepWhyCold() {
  const { ref, visible } = useInView(0.3)
  return (
    <div ref={ref} className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <svg viewBox="0 0 500 220" className="w-full">
          <rect x="0" y="0" width="500" height="220" fill="#060610" />

          {/* Room temperature side */}
          <g className={`transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <text x="120" y="24" fill="#ef4444" fontSize="11" fontFamily="monospace" textAnchor="middle">
              Room temperature (300 K)
            </text>

            {/* Energy levels with thermal population */}
            <line x1="50" y1="160" x2="190" y2="160" stroke="#00d4ff" strokeWidth="2" />
            <line x1="50" y1="100" x2="190" y2="100" stroke="#00d4ff" strokeWidth="2" />
            <text x="200" y="164" fill="#00d4ff" fontSize="10" fontFamily="monospace">|0&#x27E9;</text>
            <text x="200" y="104" fill="#00d4ff" fontSize="10" fontFamily="monospace">|1&#x27E9;</text>

            {/* Thermal photons bouncing around */}
            {[
              [80, 130, '#ef4444'], [140, 120, '#f59e0b'], [100, 140, '#ef4444'],
              [160, 135, '#f59e0b'], [70, 110, '#ef4444'], [130, 145, '#f59e0b'],
            ].map(([x, y, c], i) => (
              <circle key={i} cx={Number(x)} cy={Number(y)} r="4" fill={String(c)} opacity="0.5">
                <animate attributeName="cy" values={`${Number(y)};${Number(y) - 8};${Number(y)}`}
                  dur={`${0.8 + i * 0.15}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Population bars */}
            <rect x="60" y="170" width="50" height="8" fill="#00d4ff" opacity="0.4" rx="1" />
            <rect x="60" y="80" width="40" height="8" fill="#00d4ff" opacity="0.4" rx="1" />
            <text x="120" y="178" fill="#475569" fontSize="7" fontFamily="monospace">~50%</text>
            <text x="110" y="88" fill="#475569" fontSize="7" fontFamily="monospace">~50%</text>

            <text x="120" y="200" fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="middle">
              kT &gt;&gt; &#x210F;&#x03C9; &mdash; can&apos;t prepare |0&#x27E9;
            </text>
          </g>

          {/* 15 mK side */}
          <g className={`transition-all duration-1000 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <text x="380" y="24" fill="#00d4ff" fontSize="11" fontFamily="monospace" textAnchor="middle">
              15 millikelvin
            </text>

            <line x1="310" y1="160" x2="450" y2="160" stroke="#00d4ff" strokeWidth="2" />
            <line x1="310" y1="100" x2="450" y2="100" stroke="#00d4ff" strokeWidth="2" />
            <text x="460" y="164" fill="#00d4ff" fontSize="10" fontFamily="monospace">|0&#x27E9;</text>
            <text x="460" y="104" fill="#00d4ff" fontSize="10" fontFamily="monospace">|1&#x27E9;</text>

            {/* Almost no thermal photons — just emptiness */}
            <circle cx="380" cy="130" r="2" fill="#334155" opacity="0.3" />

            {/* Population bars — almost all in |0⟩ */}
            <rect x="320" y="170" width="50" height="8" fill="#00d4ff" opacity="0.6" rx="1" />
            <rect x="320" y="80" width="2" height="8" fill="#00d4ff" opacity="0.2" rx="1" />
            <text x="380" y="178" fill="#475569" fontSize="7" fontFamily="monospace">~100%</text>
            <text x="330" y="88" fill="#475569" fontSize="7" fontFamily="monospace">~0%</text>

            <text x="380" y="200" fill="#22c55e" fontSize="8" fontFamily="monospace" textAnchor="middle">
              kT &lt;&lt; &#x210F;&#x03C9; &mdash; qubit starts in |0&#x27E9;
            </text>
          </g>

          {/* Divider */}
          <line x1="250" y1="30" x2="250" y2="210" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
        </svg>

        <div className={`mt-8 text-center transition-all duration-1000 delay-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#00d4ff] text-lg font-light">
            Cold means quiet.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            At room temperature, thermal energy is much larger than the qubit&apos;s energy gap.
            Random photons constantly kick the qubit between |0&#x27E9; and |1&#x27E9; — you can&apos;t even tell
            which state it&apos;s in. At 15 mK, thermal energy is negligible. The qubit naturally
            sits in |0&#x27E9;, waiting. You have a clean starting point.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-3">
            Same reason atoms have sharp spectral lines at low temperature.
            A transmon is an artificial atom.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 3: THE QUBIT (ARTIFICIAL ATOM)
// ============================================================

function StepQubit() {
  const { ref, visible } = useInView(0.3)
  return (
    <div ref={ref} className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <svg viewBox="0 0 400 400" className="w-full">
          <rect x="0" y="0" width="400" height="400" fill="#060610" />
          <rect x="60" y="60" width="280" height="280" rx="4" fill="#0d1117" stroke="#1a2332" strokeWidth="1.5" />
          <rect x="75" y="75" width="250" height="250" rx="2" fill="#0a0f1a" />
          <g style={{ opacity: visible ? 1 : 0, transition: 'all 2s', transform: visible ? 'scale(1)' : 'scale(0.8)', transformOrigin: '200px 200px' }}>
            <rect x="172" y="130" width="56" height="140" rx="2" fill="#0d1117" />
            <rect x="130" y="172" width="140" height="56" rx="2" fill="#0d1117" />
            <rect x="182" y="140" width="36" height="50" rx="2" fill="#6366f1" opacity="0.85" />
            <rect x="182" y="210" width="36" height="50" rx="2" fill="#6366f1" opacity="0.85" />
            <rect x="140" y="182" width="50" height="36" rx="2" fill="#6366f1" opacity="0.85" />
            <rect x="210" y="182" width="50" height="36" rx="2" fill="#6366f1" opacity="0.85" />
            <rect x="182" y="182" width="36" height="36" rx="1" fill="#6366f1" opacity="0.9" />
            <rect x="197" y="197" width="6" height="6" rx="1" fill="#f472b6" />
          </g>
        </svg>
        <div className={`mt-8 text-center transition-all duration-1000 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#6366f1] text-lg font-light">An artificial atom.</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            A real atom has discrete energy levels — it absorbs light only at specific frequencies.
            This cross-shaped circuit does the same thing, but with microwaves instead of light,
            and at frequencies engineers can choose. The energy levels come from the Josephson
            junction (the pink dot) — we&apos;ll zoom in later.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-3">
            300 μm of niobium on silicon. Four arms: drive, flux, readout, coupling.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 4: THE DRIVE LINE
// ============================================================

function StepDriveLine() {
  const { ref, visible } = useInView(0.3)
  return (
    <div ref={ref} className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <svg viewBox="0 0 600 300" className="w-full">
          <rect x="0" y="0" width="600" height="300" fill="#060610" />
          <rect x="20" y="30" width="560" height="240" rx="4" fill="#0d1117" stroke="#1a2332" strokeWidth="1.5" />
          <rect x="30" y="40" width="540" height="220" rx="2" fill="#0a0f1a" />
          <g transform="translate(420, 150)">
            <rect x="-28" y="-70" width="56" height="140" rx="2" fill="#0d1117" />
            <rect x="-70" y="-28" width="140" height="56" rx="2" fill="#0d1117" />
            <rect x="-18" y="-60" width="36" height="45" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="-18" y="15" width="36" height="45" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="-60" y="-18" width="45" height="36" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="15" y="-18" width="45" height="36" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="-18" y="-18" width="36" height="36" rx="1" fill="#6366f1" opacity="0.85" />
            <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#f472b6" />
          </g>
          <g className={`transition-all duration-[1500ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <rect x="20" y="144" width="330" height="4" fill="#0d1117" rx="1" />
            <rect x="20" y="148" width="330" height="4" fill="#7c8db5" rx="1" />
            <rect x="20" y="152" width="330" height="4" fill="#0d1117" rx="1" />
            <rect x="348" y="140" width="14" height="20" fill="#0d1117" rx="1" />
          </g>
          <g className={`transition-all duration-1000 delay-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <line x1="355" y1="132" x2="355" y2="118" stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2" />
            <text x="355" y="112" fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">gap ~20 μm</text>
            <text x="50" y="138" fill="#7c8db5" fontSize="8" fontFamily="monospace">coplanar waveguide</text>
          </g>
        </svg>
        <div className={`mt-8 text-center transition-all duration-1000 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#7c8db5] text-lg font-light">The microwave arrives.</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            A room-temperature signal generator produces microwaves at the qubit&apos;s exact frequency — 5.55 GHz
            for this qubit. How do we know the frequency? <em className="text-gray-300">Spectroscopy</em>: we sweep
            across frequencies and watch for absorption. Same technique astronomers use to identify elements in stars.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 5: RABI OSCILLATION — resonance doesn't mean "stay at 1"
// ============================================================

function StepRabi() {
  const { ref, visible } = useInView(0.25)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef<number | null>(null)
  const startRef = useRef(0)

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
    setPlaying(false); setElapsed(0)
  }, [])

  const play = useCallback(() => {
    if (playing) { stop(); return }
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.4
    master.connect(ctx.destination)
    const now = ctx.currentTime

    // Rabi oscillation sound: amplitude modulated tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const modOsc = ctx.createOscillator()
    const modGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = ghzToHz(5.55)
    // Modulate volume at ~2 Hz (Rabi frequency)
    modOsc.type = 'sine'
    modOsc.frequency.value = 2
    modGain.gain.value = 0.2
    modOsc.connect(modGain).connect(gain.gain)
    gain.gain.value = 0.2
    osc.connect(gain).connect(master)
    modOsc.start(now); osc.start(now)
    // At t=3s, stop the drive (π pulse moment)
    gain.gain.setValueAtTime(0.2, now + 3)
    gain.gain.linearRampToValueAtTime(0, now + 3.2)
    osc.stop(now + 6); modOsc.stop(now + 6)

    // After the drive stops: a pure tone representing |1⟩ state
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = ghzToHz(5.55) * 1.5
    gain2.gain.setValueAtTime(0, now + 3.3)
    gain2.gain.linearRampToValueAtTime(0.25, now + 3.5)
    gain2.gain.setValueAtTime(0.25, now + 5.5)
    gain2.gain.linearRampToValueAtTime(0, now + 6)
    osc2.connect(gain2).connect(master)
    osc2.start(now + 3.3); osc2.stop(now + 6.1)

    setPlaying(true); startRef.current = performance.now()
    const tick = () => { setElapsed(performance.now() - startRef.current); animRef.current = requestAnimationFrame(tick) }
    animRef.current = requestAnimationFrame(tick)
    timerRef.current = setTimeout(stop, 6500)
  }, [playing, stop])

  useEffect(() => () => stop(), [stop])

  const t = elapsed / 1000
  const rabiPhase = t * 2 * Math.PI * 2 // 2 Hz Rabi oscillation
  const probOne = playing && t < 3.2 ? Math.sin(rabiPhase / 2) ** 2 : (playing && t >= 3.2 ? 1 : 0)
  const piPulseHit = playing && t >= 3.0 && t < 3.5

  return (
    <div ref={ref} className="min-h-[90vh] flex flex-col items-center justify-center px-6">
      <div className={`text-center mb-4 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={play}
          className="px-6 py-3 rounded-full border text-sm transition-all hover:scale-105 active:scale-95"
          style={{ borderColor: playing ? '#f59e0b60' : '#f59e0b30', backgroundColor: playing ? '#f59e0b15' : '#f59e0b08', color: '#f59e0b' }}>
          {playing ? '\u25A0 Stop' : '\u25B6 Drive the qubit'}
        </button>
      </div>

      <div className="max-w-2xl w-full">
        <svg viewBox="0 0 600 320" className="w-full">
          <rect x="0" y="0" width="600" height="320" fill="#060610" />

          {/* Rabi oscillation plot */}
          <text x="30" y="24" fill="#475569" fontSize="10" fontFamily="monospace">
            P(|1&#x27E9;)
          </text>

          {/* Y axis */}
          <line x1="50" y1="30" x2="50" y2="180" stroke="#1e293b" strokeWidth="1" />
          <text x="44" y="38" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">1</text>
          <text x="44" y="184" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>

          {/* Rabi oscillation curve */}
          <path
            d={Array.from({ length: 100 }, (_, i) => {
              const x = 50 + i * 3.5
              const rabiT = i * 0.035
              const p = Math.sin(rabiT * 2 * Math.PI * 2 / 2) ** 2
              const y = 175 - p * 140
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}
            fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.4"
          />

          {/* Current position dot */}
          {playing && t < 3.2 && (
            <circle cx={50 + Math.min(t / 3.5, 1) * 350} cy={175 - probOne * 140}
              r="5" fill="#f59e0b" />
          )}

          {/* π pulse marker */}
          <line x1="350" y1="25" x2="350" y2="185" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
          <text x="355" y="22" fill="#22c55e" fontSize="8" fontFamily="monospace">&#x03C0; pulse</text>
          <text x="355" y="34" fill="#22c55e" fontSize="7" fontFamily="monospace">stop here!</text>

          {/* After π pulse: qubit in |1⟩ */}
          {piPulseHit && (
            <circle cx="350" cy="35" r="5" fill="#22c55e">
              <animate attributeName="r" values="5;8;5" dur="0.5s" repeatCount="3" />
            </circle>
          )}

          {/* X axis */}
          <line x1="50" y1="180" x2="400" y2="180" stroke="#1e293b" strokeWidth="1" />
          <text x="225" y="198" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
            drive duration
          </text>

          {/* Labels: too short / just right / too long */}
          <text x="120" y="210" fill="#ef4444" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            too short: still near |0&#x27E9;
          </text>
          <text x="350" y="210" fill="#22c55e" fontSize="7" fontFamily="monospace" textAnchor="middle">
            &#x03C0; pulse: exactly at |1&#x27E9;
          </text>

          {/* The qubit — right side */}
          <g transform="translate(520, 105)">
            {/* Background glow based on P(|1⟩) */}
            <circle cx="0" cy="0" r="50" fill={`rgba(0, 212, 255, ${probOne * 0.15})`} />

            <rect x="-22" y="-50" width="44" height="100" rx="2" fill="#0d1117" />
            <rect x="-50" y="-22" width="100" height="44" rx="2" fill="#0d1117" />
            <rect x="-14" y="-42" width="28" height="32" rx="2" fill="#6366f1" opacity={0.4 + probOne * 0.5} />
            <rect x="-14" y="10" width="28" height="32" rx="2" fill="#6366f1" opacity="0.6" />
            <rect x="-42" y="-14" width="32" height="28" rx="2" fill="#6366f1" opacity="0.6" />
            <rect x="10" y="-14" width="32" height="28" rx="2" fill="#6366f1" opacity="0.6" />
            <rect x="-14" y="-14" width="28" height="28" rx="1" fill="#6366f1" opacity="0.8" />
            <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#f472b6" />

            {/* State label */}
            <text x="0" y="70" fill={probOne > 0.7 ? '#00d4ff' : '#475569'} fontSize="11"
              fontFamily="monospace" textAnchor="middle">
              {probOne > 0.9 ? '|1\u27E9' : probOne < 0.1 ? '|0\u27E9' : `${(probOne * 100).toFixed(0)}% |1\u27E9`}
            </text>
          </g>

          {/* Explanation below the chart */}
          <text x="300" y="250" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
            A resonant microwave doesn&apos;t flip the qubit and stop.
          </text>
          <text x="300" y="264" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
            It makes the qubit <tspan fill="#f59e0b">oscillate</tspan> between |0&#x27E9; and |1&#x27E9;.
          </text>
          <text x="300" y="278" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
            This is <tspan fill="#00d4ff">Rabi oscillation</tspan>.
          </text>
          <text x="300" y="298" fill="#22c55e" fontSize="9" fontFamily="monospace" textAnchor="middle">
            To land at |1&#x27E9;, you stop the pulse at exactly the right moment: a &#x03C0; pulse.
          </text>
        </svg>
      </div>

      <div className={`mt-4 text-center max-w-md transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-gray-500 text-sm leading-relaxed">
          This is the key insight: <em className="text-gray-300">gates are precisely timed pulses</em>.
          A half-cycle (&pi; pulse) is an X gate. A quarter-cycle (&pi;/2 pulse) creates superposition.
          The pulse duration, amplitude, and phase determine which gate you apply.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// STEP 6: GATES — different pulses = different operations
// ============================================================

function StepGates() {
  const { ref, visible } = useInView(0.25)
  const [step, setStep] = useState(0) // 0=none, 1=X, 2=H, 3=Z

  const gates = [
    {
      name: 'X gate',
      desc: '\u03C0 pulse — flip |0\u27E9 to |1\u27E9',
      color: '#ef4444',
      pulseWidth: 1.0,
      result: '|1\u27E9',
      detail: 'Full Rabi half-cycle. Duration ~20 ns.',
    },
    {
      name: 'H gate',
      desc: '\u03C0/2 pulse — create superposition',
      color: '#22c55e',
      pulseWidth: 0.5,
      result: '(|0\u27E9 + |1\u27E9) / \u221A2',
      detail: 'Quarter Rabi cycle. Stop halfway. 50/50.',
    },
    {
      name: 'Z gate',
      desc: 'Phase shift — no microwave needed',
      color: '#8b5cf6',
      pulseWidth: 0,
      result: '|0\u27E9 (phase of |1\u27E9 flipped)',
      detail: 'Detune the qubit frequency briefly. "Virtual Z."',
    },
  ]

  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <div className={`text-center mb-6 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-gray-300 text-lg font-light mb-2">Every gate is a microwave pulse.</p>
          <p className="text-gray-600 text-sm">Different duration, different gate.</p>
        </div>

        {/* Pulse visualization */}
        <svg viewBox="0 0 600 200" className="w-full mb-6">
          <rect x="0" y="0" width="600" height="200" fill="#060610" />

          {/* Time axis */}
          <line x1="40" y1="150" x2="560" y2="150" stroke="#1e293b" strokeWidth="1" />
          <text x="300" y="170" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="middle">
            time (nanoseconds)
          </text>

          {/* Three pulse envelopes side by side */}
          {gates.map((g, i) => {
            const cx = 130 + i * 170
            const active = step === i + 1
            return (
              <g key={i}>
                {/* Pulse envelope */}
                {g.pulseWidth > 0 ? (
                  <path
                    d={(() => {
                      const w = g.pulseWidth * 80
                      const h = 90
                      const pts: string[] = []
                      for (let j = 0; j <= 40; j++) {
                        const x = cx - w + (j / 40) * w * 2
                        const t = (j / 40) * 2 - 1
                        const env = Math.exp(-t * t * 3) * h
                        const carrier = Math.sin(j * 1.2) * env * 0.8
                        pts.push(`${j === 0 ? 'M' : 'L'} ${x} ${150 - env + carrier * 0.3}`)
                      }
                      return pts.join(' ')
                    })()}
                    fill="none" stroke={g.color} strokeWidth={active ? 2.5 : 1.5}
                    opacity={active ? 1 : 0.4}
                    className="transition-all duration-300"
                  />
                ) : (
                  /* Z gate: no pulse, just a frequency shift arrow */
                  <g opacity={active ? 1 : 0.4} className="transition-all duration-300">
                    <line x1={cx - 20} y1="110" x2={cx + 20} y2="110" stroke={g.color} strokeWidth={active ? 2 : 1} />
                    <text x={cx} y="100" fill={g.color} fontSize="8" fontFamily="monospace" textAnchor="middle">
                      &#x0394;f
                    </text>
                  </g>
                )}

                {/* Label */}
                <text x={cx} y="190" fill={active ? g.color : '#475569'} fontSize="10"
                  fontFamily="monospace" textAnchor="middle" fontWeight={active ? 'bold' : 'normal'}
                  className="transition-all duration-300">
                  {g.name}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Gate buttons */}
        <div className="flex justify-center gap-3 mb-6">
          {gates.map((g, i) => (
            <button key={i} onClick={() => setStep(step === i + 1 ? 0 : i + 1)}
              className="px-4 py-2 rounded-lg border text-xs font-mono transition-all hover:scale-105"
              style={{
                borderColor: step === i + 1 ? g.color + '80' : '#1e293b',
                backgroundColor: step === i + 1 ? g.color + '15' : 'transparent',
                color: step === i + 1 ? g.color : '#6b7280',
              }}>
              {g.name}
            </button>
          ))}
        </div>

        {/* Gate detail */}
        {step > 0 && (
          <div className="text-center p-4 rounded-lg border transition-all duration-300"
            style={{ borderColor: gates[step - 1].color + '30', backgroundColor: gates[step - 1].color + '08' }}>
            <p className="text-sm font-mono" style={{ color: gates[step - 1].color }}>
              {gates[step - 1].desc}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Result: <span className="text-gray-300 font-mono">{gates[step - 1].result}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">{gates[step - 1].detail}</p>
          </div>
        )}

        <div className={`mt-6 text-center transition-all duration-1000 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-gray-600 text-xs leading-relaxed max-w-md mx-auto">
            All single-qubit gates are just microwave pulses with different durations, amplitudes,
            and phases. The pulse shape is a Gaussian envelope modulated at the qubit frequency.
            Gate times: ~20&ndash;40 nanoseconds.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 7: TWO QUBITS → ENTANGLEMENT (step by step Bell state)
// ============================================================

function StepEntanglement() {
  const { ref, visible } = useInView(0.2)
  const [step, setStep] = useState(0) // 0=start, 1=H on q0, 2=CNOT, 3=Bell state

  const steps = [
    { label: 'Start', desc: 'Both qubits in |0\u27E9. Cold. Quiet. Separate.', q0: '|0\u27E9', q1: '|0\u27E9', entangled: false, state: '|00\u27E9' },
    { label: 'H on qubit A', desc: 'A Hadamard (\u03C0/2 pulse) puts qubit A in superposition. Qubit B untouched. Still no entanglement.', q0: '|+\u27E9', q1: '|0\u27E9', entangled: false, state: '(|0\u27E9 + |1\u27E9)|0\u27E9 / \u221A2' },
    { label: 'CNOT', desc: 'A two-qubit gate. If A is |1\u27E9, flip B. If A is |0\u27E9, do nothing. This requires physical coupling between qubits — not just a microwave pulse on one qubit.', q0: '?', q1: '?', entangled: true, state: '(|00\u27E9 + |11\u27E9) / \u221A2' },
    { label: 'Bell state', desc: 'Now they\u2019re entangled. Neither qubit has a definite state on its own. Measure one, and you instantly know the other. This is the Bell state |\u03A6\u207A\u27E9.', q0: '?', q1: '?', entangled: true, state: '|\u03A6\u207A\u27E9 = (|00\u27E9 + |11\u27E9) / \u221A2' },
  ]

  const s = steps[step]

  return (
    <div ref={ref} className="min-h-[90vh] flex flex-col items-center justify-center px-6">
      <div className={`max-w-2xl w-full transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center mb-6">
          <p className="text-gray-300 text-lg font-light mb-1">Building entanglement.</p>
          <p className="text-gray-600 text-sm">Step through the circuit.</p>
        </div>

        <svg viewBox="0 0 600 250" className="w-full mb-4">
          <rect x="0" y="0" width="600" height="250" fill="#060610" />

          {/* Qubit A */}
          <g transform="translate(150, 80)">
            <circle cx="0" cy="0" r="35"
              fill={s.entangled ? '#c084fc15' : step === 1 ? '#22c55e10' : '#0d1117'}
              stroke={s.entangled ? '#c084fc' : step === 1 ? '#22c55e' : '#1e293b'}
              strokeWidth="2" className="transition-all duration-500" />
            <text x="0" y="4" fill={s.entangled ? '#c084fc' : '#e2e8f0'} fontSize="14"
              fontFamily="monospace" textAnchor="middle" className="transition-all duration-500">
              {s.q0}
            </text>
            <text x="0" y="-48" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
              qubit A
            </text>
          </g>

          {/* Qubit B */}
          <g transform="translate(450, 80)">
            <circle cx="0" cy="0" r="35"
              fill={s.entangled ? '#c084fc15' : '#0d1117'}
              stroke={s.entangled ? '#c084fc' : '#1e293b'}
              strokeWidth="2" className="transition-all duration-500" />
            <text x="0" y="4" fill={s.entangled ? '#c084fc' : '#e2e8f0'} fontSize="14"
              fontFamily="monospace" textAnchor="middle" className="transition-all duration-500">
              {s.q1}
            </text>
            <text x="0" y="-48" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
              qubit B
            </text>
          </g>

          {/* Coupling bus between them */}
          <line x1="190" y1="80" x2="410" y2="80"
            stroke={s.entangled ? '#c084fc' : '#1e293b'}
            strokeWidth={step >= 2 ? 2 : 1}
            strokeDasharray={step < 2 ? '4,4' : 'none'}
            className="transition-all duration-500" />
          {step >= 2 && (
            <text x="300" y="72" fill="#c084fc" fontSize="8" fontFamily="monospace" textAnchor="middle">
              coupling resonator
            </text>
          )}

          {/* Gate being applied */}
          {step === 1 && (
            <g>
              <rect x="130" y="125" width="40" height="24" rx="4" fill="none" stroke="#22c55e" strokeWidth="1.5" />
              <text x="150" y="141" fill="#22c55e" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="bold">H</text>
              <line x1="150" y1="115" x2="150" y2="127" stroke="#22c55e" strokeWidth="1" />
              <text x="150" y="165" fill="#22c55e" fontSize="7" fontFamily="monospace" textAnchor="middle">
                &#x03C0;/2 microwave pulse on A only
              </text>
            </g>
          )}
          {step >= 2 && (
            <g opacity={step === 2 ? 1 : 0.4}>
              <rect x="280" y="125" width="40" height="24" rx="4" fill="none"
                stroke="#c084fc" strokeWidth="1.5" />
              <text x="300" y="142" fill="#c084fc" fontSize="10" fontFamily="monospace"
                textAnchor="middle" fontWeight="bold">CZ</text>
              <line x1="300" y1="115" x2="300" y2="127" stroke="#c084fc" strokeWidth="1" />
              <text x="300" y="165" fill="#c084fc" fontSize="7" fontFamily="monospace" textAnchor="middle">
                two-qubit gate via coupling bus
              </text>
              <text x="300" y="177" fill="#475569" fontSize="6" fontFamily="monospace" textAnchor="middle">
                requires physical interaction — NOT just a pulse on one qubit
              </text>
            </g>
          )}

          {/* Combined state */}
          <text x="300" y="220" fill={s.entangled ? '#c084fc' : '#94a3b8'} fontSize="12"
            fontFamily="monospace" textAnchor="middle" className="transition-all duration-500">
            {s.state}
          </text>
        </svg>

        {/* Step buttons */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((st, i) => (
            <button key={i} onClick={() => setStep(i)}
              className="px-3 py-1.5 rounded-md border text-xs font-mono transition-all"
              style={{
                borderColor: step === i ? (st.entangled ? '#c084fc60' : '#22c55e60') : '#1e293b',
                backgroundColor: step === i ? (st.entangled ? '#c084fc10' : '#22c55e10') : 'transparent',
                color: step === i ? (st.entangled ? '#c084fc' : '#22c55e') : '#6b7280',
              }}>
              {i}. {st.label}
            </button>
          ))}
        </div>

        {/* Current step description */}
        <div className="text-center p-4 rounded-lg border transition-all duration-300"
          style={{ borderColor: s.entangled ? '#c084fc20' : '#1e293b', backgroundColor: s.entangled ? '#c084fc06' : '#0a0f1a' }}>
          <p className="text-sm text-gray-300 leading-relaxed">{s.desc}</p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs leading-relaxed max-w-md mx-auto">
            Single-qubit gates (H, X, Z) are microwave pulses on <em>one</em> qubit.
            They can create superposition but <em className="text-gray-400">never entanglement</em>.
            You need a two-qubit gate — which requires a physical coupling element
            between the qubits on the chip.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 8: COHERENCE — coherence OF WHAT
// ============================================================

function StepCoherence() {
  return (
    <Section className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <svg viewBox="0 0 500 160" className="w-full">
          <rect x="0" y="0" width="500" height="160" fill="#060610" />
          <path
            d={Array.from({ length: 80 }, (_, i) => {
              const x = 20 + i * 5.8
              const decay = Math.exp(-Math.max(0, i - 25) / 20)
              const y = 80 + Math.sin(i * 0.45) * 35 * decay
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}
            fill="none" stroke="#00d4ff" strokeWidth="2" opacity="0.8"
          />
          <path
            d={Array.from({ length: 80 }, (_, i) => {
              const x = 20 + i * 5.8
              const noise = Math.max(0, i - 30) / 50
              const y = 80 + (Math.random() - 0.5) * noise * 50
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}
            fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.3"
          />
          <text x="60" y="145" fill="#00d4ff" fontSize="9" fontFamily="monospace" opacity="0.6">definite phase</text>
          <text x="350" y="145" fill="#ef4444" fontSize="9" fontFamily="monospace" opacity="0.6">phase scrambled</text>
          <line x1="40" y1="138" x2="460" y2="138" stroke="#334155" strokeWidth="0.5" />
          <polygon points="460,136 466,138 460,140" fill="#334155" />
        </svg>
        <div className="mt-8 text-center">
          <p className="text-[#ef4444] text-lg font-light">
            Coherence is phase memory.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            When a qubit is in superposition, the <em className="text-gray-300">relative phase</em> between
            |0&#x27E9; and |1&#x27E9; carries quantum information. Decoherence means losing that phase relationship.
            The qubit &ldquo;forgets&rdquo; where it is in the oscillation cycle.
            The environment — thermal photons, magnetic noise, defects in the oxide —
            randomly shifts the phase until it&apos;s meaningless.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-3">
            T2 &#x2248; 10&ndash;20 &#x00B5;s on Tuna-9. Gates take ~20 ns. So: a few hundred operations before the phase is lost.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ============================================================
// STEP 9: THE JUNCTION (zoom)
// ============================================================

function StepJunction() {
  const { ref, visible } = useInView(0.3)
  return (
    <div ref={ref} className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <div className={`flex justify-center mb-6 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <svg viewBox="0 0 200 200" className="w-24 h-24">
            <rect x="0" y="0" width="200" height="200" fill="#060610" />
            <rect x="82" y="40" width="36" height="120" rx="2" fill="#6366f1" opacity="0.5" />
            <rect x="40" y="82" width="120" height="36" rx="2" fill="#6366f1" opacity="0.5" />
            <circle cx="100" cy="100" r="3" fill="#f472b6" />
            <circle cx="100" cy="100" r="20" fill="none" stroke="#f472b6" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          </svg>
        </div>
        <div className={`transition-all duration-[2000ms] delay-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          style={{ transformOrigin: 'center center' }}>
          <svg viewBox="0 0 400 240" className="w-full">
            <rect x="0" y="0" width="400" height="240" fill="#060610" rx="8" />
            <text x="20" y="24" fill="#f472b6" fontSize="11" fontFamily="monospace" fontWeight="bold">Josephson junction</text>
            <text x="20" y="40" fill="#475569" fontSize="9" fontFamily="monospace">~200 nm &times; 200 nm</text>
            <g transform="translate(100, 85)">
              <rect x="-10" y="10" width="200" height="28" rx="2" fill="#94a3b8" opacity="0.5" transform="rotate(-6, 90, 24)" />
              <text x="200" y="32" fill="#64748b" fontSize="9" fontFamily="monospace">Al bottom</text>
              <rect x="60" y="4" width="40" height="40" rx="2" fill="#f472b6" opacity="0.2" stroke="#f472b6" strokeWidth="1" strokeDasharray="3,3" />
              <rect x="-10" y="6" width="200" height="28" rx="2" fill="#94a3b8" opacity="0.35" transform="rotate(6, 90, 20)" />
              <text x="200" y="14" fill="#64748b" fontSize="9" fontFamily="monospace">Al top</text>
              <line x1="80" y1="50" x2="80" y2="68" stroke="#f472b6" strokeWidth="0.5" />
              <text x="80" y="80" fill="#f472b6" fontSize="10" fontFamily="monospace" textAnchor="middle">AlOx tunnel barrier</text>
              <text x="80" y="94" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="middle">2&ndash;4 nm thick &middot; ~10 atoms</text>
            </g>
          </svg>
        </div>
        <div className={`mt-8 text-center transition-all duration-1000 delay-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#f472b6] text-lg font-light">The nonlinear element.</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            This oxide layer makes the energy levels <em className="text-gray-300">anharmonic</em> — unequally spaced.
            Without it, the circuit would be a harmonic oscillator: equally spaced levels, no way to address just one transition.
            With it, you get an artificial atom with addressable levels. Ten atoms of oxide is the
            difference between a resonator and a qubit.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 10: ENERGY LEVELS
// ============================================================

function StepEnergy() {
  return (
    <Section className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <svg viewBox="0 0 360 260" className="w-full">
          <rect x="0" y="0" width="360" height="260" fill="#060610" rx="8" />

          {/* Harmonic (left) vs Anharmonic (right) */}
          {/* Harmonic */}
          <text x="90" y="24" fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">
            Without junction
          </text>
          <text x="90" y="38" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="middle">
            harmonic oscillator
          </text>
          {[0, 1, 2, 3].map(i => (
            <g key={i}>
              <line x1="30" y1={200 - i * 40} x2="150" y2={200 - i * 40}
                stroke="#475569" strokeWidth="1.5" strokeDasharray={i > 1 ? '4,3' : 'none'} opacity={i > 1 ? 0.5 : 0.8} />
              <text x="158" y={204 - i * 40} fill="#475569" fontSize="9" fontFamily="monospace">|{i}&#x27E9;</text>
            </g>
          ))}
          {/* Equal spacing brackets */}
          {[0, 1, 2].map(i => (
            <text key={i} x="20" y={184 - i * 40} fill="#374151" fontSize="7" fontFamily="monospace" textAnchor="end">
              &#x0394;E
            </text>
          ))}
          <text x="90" y="230" fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="middle">
            can&apos;t isolate one transition
          </text>

          {/* Anharmonic */}
          <text x="270" y="24" fill="#00d4ff" fontSize="10" fontFamily="monospace" textAnchor="middle">
            With junction
          </text>
          <text x="270" y="38" fill="#00d4ff" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.6">
            transmon (artificial atom)
          </text>
          <line x1="210" y1="200" x2="330" y2="200" stroke="#00d4ff" strokeWidth="2" />
          <text x="338" y="204" fill="#00d4ff" fontSize="10" fontFamily="monospace">|0&#x27E9;</text>
          <line x1="210" y1="140" x2="330" y2="140" stroke="#00d4ff" strokeWidth="2" />
          <text x="338" y="144" fill="#00d4ff" fontSize="10" fontFamily="monospace">|1&#x27E9;</text>
          <line x1="210" y1="90" x2="330" y2="90" stroke="#475569" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="338" y="94" fill="#475569" fontSize="9" fontFamily="monospace">|2&#x27E9;</text>

          {/* Unequal spacing */}
          <text x="200" y="174" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="end">
            &#x0394;E&#x2081;
          </text>
          <text x="200" y="120" fill="#374151" fontSize="7" fontFamily="monospace" textAnchor="end">
            &#x0394;E&#x2082; &#x2260; &#x0394;E&#x2081;
          </text>

          {/* Arrow on qubit transition */}
          <line x1="270" y1="195" x2="270" y2="145" stroke="#f59e0b" strokeWidth="2" />
          <polygon points="266,147 270,139 274,147" fill="#f59e0b" />

          <text x="270" y="230" fill="#22c55e" fontSize="8" fontFamily="monospace" textAnchor="middle">
            one frequency &#x2192; one transition &#x2192; qubit
          </text>
        </svg>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Same idea as real atoms: hydrogen absorbs 121.6 nm light because that&apos;s <em>one specific</em> transition.
            A transmon absorbs 5.55 GHz microwaves for the same reason — engineered instead of natural.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ============================================================
// STEP 11: THE SCALE
// ============================================================

function StepScale() {
  const { ref, visible } = useInView(0.3)
  const scales = [
    { size: '7 mm', label: 'The chip', color: '#1e293b', desc: 'Silicon substrate with niobium wiring' },
    { size: '5 mm', label: 'Readout resonator', color: '#22c55e', desc: 'Meandered coplanar waveguide, \u03BB/4' },
    { size: '300 \u00B5m', label: 'Qubit cross', color: '#6366f1', desc: 'Xmon capacitor pads' },
    { size: '20 \u00B5m', label: 'Coupling gap', color: '#f59e0b', desc: 'Drive line to qubit' },
    { size: '200 nm', label: 'Josephson junction', color: '#f472b6', desc: 'Al/AlOx/Al overlap' },
    { size: '3 nm', label: 'Tunnel barrier', color: '#ef4444', desc: 'Amorphous aluminum oxide \u2014 ~10 atoms' },
  ]
  return (
    <div ref={ref} className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="space-y-3">
          {scales.map((s, i) => (
            <div key={i} className="flex items-center gap-4 transition-all duration-700"
              style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-20px)', transitionDelay: `${i * 150}ms` }}>
              <div className="h-6 rounded-sm flex items-center justify-end pr-2 shrink-0"
                style={{ width: `${Math.max(12, 160 - i * 26)}px`, backgroundColor: s.color + '30', borderLeft: `3px solid ${s.color}` }}>
                <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.size}</span>
              </div>
              <div>
                <span className="text-sm text-gray-300">{s.label}</span>
                <span className="text-xs text-gray-600 ml-2">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-10 text-center transition-all duration-1000 delay-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-gray-300 text-lg font-light">Six orders of magnitude.</p>
          <p className="text-gray-600 text-sm mt-2">The barrier that makes quantum computing possible is about ten atoms thick.</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function SeePage() {
  return (
    <div className="min-h-screen bg-[#060610] text-white">
      <Nav />
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <Link href="/listen" className="text-sm text-gray-600 hover:text-gray-400 transition-colors inline-block">
          &larr; back to Listen
        </Link>
      </div>
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-200 mb-2">What does a qubit look like?</h1>
        <p className="text-gray-600 text-sm max-w-lg">Not the math. The metal. Scroll down.</p>
      </div>

      <div className="space-y-8">
        <StepChip />
        <Divider />
        <StepWhyCold />
        <Divider />
        <StepQubit />
        <Divider />
        <StepDriveLine />
        <Divider />
        <StepRabi />
        <Divider />
        <StepGates />
        <Divider />
        <StepEntanglement />
        <Divider />
        <StepCoherence />
        <Divider />
        <StepJunction />
        <Divider />
        <StepEnergy />
        <Divider />
        <StepScale />
      </div>

      <footer className="text-center text-xs text-gray-700 py-16 mt-8">
        Act 1 of 9 &mdash; one qubit on{' '}
        <Link href="https://www.quantum-inspire.com" className="text-gray-600 hover:text-gray-400">Tuna-9</Link>
        <br />
        <span className="text-gray-800">
          <Link href="/listen" className="hover:text-gray-500">Listen</Link>
          {' '}&middot;{' '}
          <Link href="/resonance" className="hover:text-gray-500">Resonance</Link>
          {' '}&middot;{' '}
          <Link href="/" className="hover:text-gray-500">haiqu</Link>
        </span>
      </footer>
    </div>
  )
}
