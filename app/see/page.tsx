'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

// ============================================================
// Scroll-driven reveal: each section fades in when visible
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
  const { ref, visible } = useInView(0.25)
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}

// Map GHz to audible Hz
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
          {/* Just a chip. Nothing else. */}
          <rect x="0" y="0" width="400" height="400" fill="#060610" />

          {/* Silicon substrate */}
          <rect x="60" y="60" width="280" height="280" rx="4"
            fill="#0d1117" stroke="#1a2332" strokeWidth="2" />

          {/* Ground plane — dark metal */}
          <rect x="75" y="75" width="250" height="250" rx="2" fill="#0a0f1a" />

          {/* Faint grid marks — fab alignment */}
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line x1={75 + i * 62.5} y1="75" x2={75 + i * 62.5} y2="325"
                stroke="#111827" strokeWidth="0.3" />
              <line x1="75" y1={75 + i * 62.5} x2="325" y2={75 + i * 62.5}
                stroke="#111827" strokeWidth="0.3" />
            </g>
          ))}

          {/* Wirebond pads along edges */}
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
          <p className="text-gray-300 text-lg font-light">
            A silicon chip. 7 millimeters across.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Cooled to 15 millikelvin — colder than outer space.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-4">
            Inside a dilution refrigerator. No light. No heat. Near absolute zero.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ============================================================
// STEP 2: THE QUBIT APPEARS
// ============================================================

function StepQubit() {
  const { ref, visible } = useInView(0.3)

  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <svg viewBox="0 0 400 400" className="w-full">
          <rect x="0" y="0" width="400" height="400" fill="#060610" />

          {/* Chip substrate */}
          <rect x="60" y="60" width="280" height="280" rx="4"
            fill="#0d1117" stroke="#1a2332" strokeWidth="1.5" />
          <rect x="75" y="75" width="250" height="250" rx="2" fill="#0a0f1a" />

          {/* THE CROSS — fading in */}
          <g
            className="transition-all duration-[2000ms]"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.8)', transformOrigin: '200px 200px' }}
          >
            {/* Etched gap around cross (bare substrate showing through) */}
            <rect x="172" y="130" width="56" height="140" rx="2" fill="#0d1117" />
            <rect x="130" y="172" width="140" height="56" rx="2" fill="#0d1117" />

            {/* Cross-shaped capacitor — niobium */}
            {/* Top arm */}
            <rect x="182" y="140" width="36" height="50" rx="2" fill="#6366f1" opacity="0.85" />
            {/* Bottom arm */}
            <rect x="182" y="210" width="36" height="50" rx="2" fill="#6366f1" opacity="0.85" />
            {/* Left arm */}
            <rect x="140" y="182" width="50" height="36" rx="2" fill="#6366f1" opacity="0.85" />
            {/* Right arm */}
            <rect x="210" y="182" width="50" height="36" rx="2" fill="#6366f1" opacity="0.85" />
            {/* Center */}
            <rect x="182" y="182" width="36" height="36" rx="1" fill="#6366f1" opacity="0.9" />

            {/* Junction — tiny pink dot */}
            <rect x="197" y="197" width="6" height="6" rx="1" fill="#f472b6" />
          </g>
        </svg>

        <div className={`mt-8 text-center transition-all duration-1000 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#6366f1] text-lg font-light">
            This is a qubit.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            A cross of niobium, 300 micrometers across.
            Four arms. At the center, a pink dot — we&apos;ll zoom in later.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-4">
            It&apos;s called a transmon. The cross shape is the &ldquo;Xmon&rdquo; variant.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 3: THE DRIVE LINE
// ============================================================

function StepDriveLine() {
  const { ref, visible } = useInView(0.3)

  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <svg viewBox="0 0 600 300" className="w-full">
          <rect x="0" y="0" width="600" height="300" fill="#060610" />

          {/* Chip substrate — zoomed to show the drive line */}
          <rect x="20" y="30" width="560" height="240" rx="4"
            fill="#0d1117" stroke="#1a2332" strokeWidth="1.5" />
          <rect x="30" y="40" width="540" height="220" rx="2" fill="#0a0f1a" />

          {/* The qubit cross — now on the right side */}
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

          {/* DRIVE LINE — entering from the left */}
          <g className={`transition-all duration-[1500ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Gap above */}
            <rect x="20" y="144" width="330" height="4" fill="#0d1117" rx="1" />
            {/* Center conductor */}
            <rect x="20" y="148" width="330" height="4" fill="#7c8db5" rx="1" />
            {/* Gap below */}
            <rect x="20" y="152" width="330" height="4" fill="#0d1117" rx="1" />

            {/* COUPLING GAP — the line stops short */}
            <rect x="348" y="140" width="14" height="20" fill="#0d1117" rx="1" />
          </g>

          {/* Gap callout */}
          <g className={`transition-all duration-1000 delay-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <line x1="355" y1="132" x2="355" y2="118" stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2" />
            <text x="355" y="112" fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">
              gap ~20 μm
            </text>
            <text x="355" y="124" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">
              no physical contact
            </text>
          </g>

          {/* Label: from outside */}
          <g className={`transition-all duration-1000 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <text x="50" y="138" fill="#7c8db5" fontSize="8" fontFamily="monospace">
              coplanar waveguide
            </text>
            <text x="50" y="170" fill="#475569" fontSize="7" fontFamily="monospace">
              from room-temperature electronics
            </text>
          </g>
        </svg>

        <div className={`mt-8 text-center transition-all duration-1000 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#7c8db5] text-lg font-light">
            Microwaves arrive through a waveguide.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            A strip of metal on the chip — the center conductor — carries the microwave signal.
            It approaches the qubit&apos;s left arm but <em className="text-[#f59e0b]">doesn&apos;t touch it</em>.
            A 20-micrometer gap separates them. The coupling is capacitive — energy transfers
            across empty space.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 4: THE DRIVE — play button, animated
// ============================================================

function StepDrive() {
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
    setPlaying(false)
    setElapsed(0)
  }, [])

  const play = useCallback(() => {
    if (playing) { stop(); return }
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = ghzToHz(5.55)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.35, now + 0.15)
    gain.gain.setValueAtTime(0.35, now + 2.8)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 5.5)
    osc.connect(gain).connect(master)
    osc.start(now)
    osc.stop(now + 6)

    setPlaying(true)
    startRef.current = performance.now()
    const tick = () => {
      setElapsed(performance.now() - startRef.current)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)

    timerRef.current = setTimeout(stop, 6200)
  }, [playing, stop])

  useEffect(() => () => stop(), [stop])

  const t = elapsed / 1000
  const microwaveOn = playing && t > 0.2 && t < 4
  const decayFactor = t > 2.8 ? Math.exp(-(t - 2.8) / 1.8) : 1
  const glow = microwaveOn ? decayFactor : 0
  const wavePhase = elapsed * 0.008

  return (
    <div ref={ref} className="min-h-[90vh] flex flex-col items-center justify-center px-6">
      <div className={`text-center mb-6 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-gray-400 text-sm mb-1">Press play. 5.55 GHz.</p>
        <button
          onClick={play}
          className="px-6 py-3 rounded-full border text-sm transition-all hover:scale-105 active:scale-95"
          style={{
            borderColor: playing ? '#f59e0b60' : '#f59e0b30',
            backgroundColor: playing ? '#f59e0b15' : '#f59e0b08',
            color: '#f59e0b',
          }}
        >
          {playing ? '\u25A0 Stop' : '\u25B6 Drive the qubit'}
        </button>
      </div>

      <div className="max-w-2xl w-full">
        <svg viewBox="0 0 600 300" className="w-full">
          <rect x="0" y="0" width="600" height="300" fill="#060610" />
          <rect x="20" y="30" width="560" height="240" rx="4"
            fill="#0d1117" stroke="#1a2332" strokeWidth="1.5" />
          <rect x="30" y="40" width="540" height="220" rx="2" fill="#0a0f1a" />

          {/* Qubit with glow */}
          <g transform="translate(420, 150)">
            {/* Glow */}
            <circle cx="0" cy="0" r="80" fill="none" />
            <circle cx="0" cy="0" r="60"
              fill={`rgba(0, 212, 255, ${glow * 0.15})`}
              className="transition-opacity duration-100" />

            <rect x="-28" y="-70" width="56" height="140" rx="2" fill="#0d1117" />
            <rect x="-70" y="-28" width="140" height="56" rx="2" fill="#0d1117" />

            <rect x="-18" y="-60" width="36" height="45" rx="2"
              fill={glow > 0.1 ? `rgba(99, 102, 241, ${0.75 + glow * 0.25})` : '#6366f1'}
              opacity="0.85" />
            <rect x="-18" y="15" width="36" height="45" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="-60" y="-18" width="45" height="36" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="15" y="-18" width="45" height="36" rx="2" fill="#6366f1" opacity="0.75" />
            <rect x="-18" y="-18" width="36" height="36" rx="1" fill="#6366f1" opacity="0.9" />
            <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#f472b6" />

            {/* Resonance rings */}
            {microwaveOn && Array.from({ length: 3 }, (_, i) => {
              const r = 20 + ((elapsed * 0.03 + i * 25) % 55)
              const op = Math.max(0, 0.35 - r / 160) * decayFactor
              return <circle key={i} cx="0" cy="0" r={r} fill="none" stroke="#00d4ff" strokeWidth="1" opacity={op} />
            })}
          </g>

          {/* Drive line */}
          <rect x="20" y="144" width="330" height="4" fill="#0d1117" rx="1" />
          <rect x="20" y="148" width="330" height="4" fill="#7c8db5" rx="1" />
          <rect x="20" y="152" width="330" height="4" fill="#0d1117" rx="1" />
          <rect x="348" y="140" width="14" height="20" fill="#0d1117" rx="1" />

          {/* Microwave pulses traveling */}
          {microwaveOn && (
            <g opacity={decayFactor}>
              {Array.from({ length: 14 }, (_, i) => {
                const x = 35 + ((wavePhase + i * 24) % 310)
                const amp = Math.sin((wavePhase + i * 24) * 0.12) * 8
                return (
                  <circle key={i} cx={x} cy={150 + amp} r="2.5"
                    fill="#f59e0b" opacity={0.3 + 0.3 * Math.sin(i * 0.7)} />
                )
              })}
            </g>
          )}

          {/* Frequency label */}
          {microwaveOn && (
            <text x="200" y="135" fill="#f59e0b" fontSize="10" fontFamily="monospace"
              textAnchor="middle" opacity={decayFactor}>
              5.55 GHz
            </text>
          )}

          {/* T2 decay label */}
          {playing && t > 3.5 && (
            <text x="420" y="250" fill="#ef4444" fontSize="9" fontFamily="monospace"
              textAnchor="middle" opacity={Math.min(1, (t - 3.5) / 1)}>
              coherence fading...
            </text>
          )}
        </svg>
      </div>

      <div className={`mt-6 text-center max-w-md transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-gray-500 text-sm leading-relaxed">
          The microwave pulse travels down the waveguide and resonates with the qubit.
          The qubit absorbs energy and transitions from |0&#x27E9; to |1&#x27E9;.
          {playing && t > 3 && (
            <span className="text-[#ef4444]"> Then coherence fades — T2 decoherence. The quantum state dissolves into the environment.</span>
          )}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// STEP 5: THE DECAY
// ============================================================

function StepDecay() {
  return (
    <Section className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <svg viewBox="0 0 500 160" className="w-full">
          <rect x="0" y="0" width="500" height="160" fill="#060610" />

          {/* Clean wave → decaying wave */}
          <path
            d={Array.from({ length: 80 }, (_, i) => {
              const x = 20 + i * 5.8
              const decay = Math.exp(-Math.max(0, i - 25) / 20)
              const y = 80 + Math.sin(i * 0.45) * 35 * decay
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}
            fill="none" stroke="#00d4ff" strokeWidth="2" opacity="0.8"
          />

          {/* Noise growing */}
          <path
            d={Array.from({ length: 80 }, (_, i) => {
              const x = 20 + i * 5.8
              const noise = Math.max(0, i - 30) / 50
              const y = 80 + (Math.random() - 0.5) * noise * 50
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}
            fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.3"
          />

          {/* Time labels */}
          <text x="60" y="145" fill="#00d4ff" fontSize="9" fontFamily="monospace" opacity="0.6">
            t = 0
          </text>
          <text x="280" y="145" fill="#ef4444" fontSize="9" fontFamily="monospace" opacity="0.6">
            t = T2
          </text>
          <text x="430" y="145" fill="#ef4444" fontSize="9" fontFamily="monospace" opacity="0.4">
            t &gt;&gt; T2
          </text>

          {/* Arrow */}
          <line x1="40" y1="138" x2="460" y2="138" stroke="#334155" strokeWidth="0.5" />
          <polygon points="460,136 466,138 460,140" fill="#334155" />
        </svg>

        <div className="mt-8 text-center">
          <p className="text-[#ef4444] text-lg font-light">
            Coherence is temporary.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            Thermal photons, magnetic fluctuations, defects in the junction oxide — the environment
            constantly probes the qubit. Phase information leaks out. On Tuna-9, T2 is about 10&ndash;20 microseconds.
            Enough for a few hundred gate operations before the quantum state dissolves into noise.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-4">
            This is what every quantum computer is fighting.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ============================================================
// STEP 6: THE JUNCTION — zoom in
// ============================================================

function StepJunction() {
  const { ref, visible } = useInView(0.3)

  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        {/* Context: the full cross, small, with a zoom circle */}
        <div className={`flex justify-center mb-6 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <svg viewBox="0 0 200 200" className="w-32 h-32">
            <rect x="0" y="0" width="200" height="200" fill="#060610" />
            <rect x="82" y="40" width="36" height="120" rx="2" fill="#6366f1" opacity="0.5" />
            <rect x="40" y="82" width="120" height="36" rx="2" fill="#6366f1" opacity="0.5" />
            <rect x="82" y="82" width="36" height="36" rx="1" fill="#6366f1" opacity="0.6" />
            {/* Junction dot */}
            <circle cx="100" cy="100" r="3" fill="#f472b6" />
            {/* Zoom circle */}
            <circle cx="100" cy="100" r="20" fill="none" stroke="#f472b6" strokeWidth="1"
              strokeDasharray="3,3" opacity="0.6" />
          </svg>
        </div>

        {/* Zoomed junction */}
        <div className={`transition-all duration-[2000ms] delay-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          style={{ transformOrigin: 'center center' }}>
          <svg viewBox="0 0 400 280" className="w-full">
            <rect x="0" y="0" width="400" height="280" fill="#060610" rx="8" />

            {/* SEM-style view */}
            <text x="20" y="24" fill="#f472b6" fontSize="11" fontFamily="monospace" fontWeight="bold">
              Josephson junction
            </text>
            <text x="20" y="40" fill="#475569" fontSize="9" fontFamily="monospace">
              ~200 nm &times; 200 nm
            </text>

            {/* The junction: two overlapping aluminum strips */}
            <g transform="translate(100, 100)">
              {/* Bottom electrode — angled */}
              <rect x="-10" y="10" width="200" height="28" rx="2"
                fill="#94a3b8" opacity="0.5"
                transform="rotate(-6, 90, 24)" />
              <text x="200" y="32" fill="#64748b" fontSize="9" fontFamily="monospace">
                Al bottom
              </text>

              {/* AlOx barrier — the overlap zone */}
              <rect x="60" y="4" width="40" height="40" rx="2"
                fill="#f472b6" opacity="0.2"
                stroke="#f472b6" strokeWidth="1" strokeDasharray="3,3" />

              {/* Top electrode — opposite angle */}
              <rect x="-10" y="6" width="200" height="28" rx="2"
                fill="#94a3b8" opacity="0.35"
                transform="rotate(6, 90, 20)" />
              <text x="200" y="14" fill="#64748b" fontSize="9" fontFamily="monospace">
                Al top
              </text>

              {/* Barrier label */}
              <line x1="80" y1="50" x2="80" y2="72" stroke="#f472b6" strokeWidth="0.5" />
              <text x="80" y="84" fill="#f472b6" fontSize="10" fontFamily="monospace" textAnchor="middle">
                AlOx tunnel barrier
              </text>
              <text x="80" y="98" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="middle">
                2&ndash;4 nm thick &middot; ~10 atoms of oxide
              </text>
            </g>

            {/* How it's made */}
            <g transform="translate(20, 220)">
              <text fill="#374151" fontSize="7" fontFamily="monospace">
                <tspan x="0" dy="0">Fabrication: double-angle shadow evaporation.</tspan>
                <tspan x="0" dy="12">Deposit Al at +15&deg;. Oxidize. Deposit Al at -15&deg;.</tspan>
                <tspan x="0" dy="12">Where the two layers overlap: a quantum tunnel junction.</tspan>
              </text>
            </g>
          </svg>
        </div>

        <div className={`mt-8 text-center transition-all duration-1000 delay-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#f472b6] text-lg font-light">
            The thing that makes it quantum.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            Two aluminum electrodes separated by an ultrathin oxide barrier.
            Electrons tunnel through. This nonlinear inductance makes the energy levels
            <em className="text-gray-300"> unequally spaced</em> — so you can address just the first
            transition without exciting higher levels. Without it, the transmon would be
            an ordinary microwave resonator.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 7: ENERGY LEVELS
// ============================================================

function StepEnergy() {
  return (
    <Section className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <svg viewBox="0 0 300 300" className="w-full">
          <rect x="0" y="0" width="300" height="300" fill="#060610" rx="8" />

          {/* |0⟩ level */}
          <line x1="60" y1="230" x2="200" y2="230" stroke="#00d4ff" strokeWidth="3" />
          <text x="215" y="234" fill="#00d4ff" fontSize="14" fontFamily="monospace">|0&#x27E9;</text>
          <text x="250" y="234" fill="#475569" fontSize="9" fontFamily="monospace">ground</text>

          {/* |1⟩ level */}
          <line x1="60" y1="140" x2="200" y2="140" stroke="#00d4ff" strokeWidth="3" />
          <text x="215" y="144" fill="#00d4ff" fontSize="14" fontFamily="monospace">|1&#x27E9;</text>
          <text x="250" y="144" fill="#475569" fontSize="9" fontFamily="monospace">excited</text>

          {/* |2⟩ level — dashed, anharmonic */}
          <line x1="60" y1="70" x2="200" y2="70" stroke="#475569" strokeWidth="2" strokeDasharray="6,4" />
          <text x="215" y="74" fill="#475569" fontSize="12" fontFamily="monospace">|2&#x27E9;</text>
          <text x="250" y="74" fill="#374151" fontSize="9" fontFamily="monospace">detuned</text>

          {/* Transition arrow: |0⟩ → |1⟩ */}
          <line x1="130" y1="222" x2="130" y2="148" stroke="#f59e0b" strokeWidth="2" />
          <polygon points="126,150 130,142 134,150" fill="#f59e0b" />
          <text x="130" y="195" fill="#f59e0b" fontSize="11" fontFamily="monospace" textAnchor="middle">
            5.55 GHz
          </text>

          {/* Anharmonicity bracket */}
          <line x1="45" y1="230" x2="45" y2="140" stroke="#00d4ff" strokeWidth="0.5" />
          <line x1="42" y1="230" x2="48" y2="230" stroke="#00d4ff" strokeWidth="0.5" />
          <line x1="42" y1="140" x2="48" y2="140" stroke="#00d4ff" strokeWidth="0.5" />
          <text x="40" y="188" fill="#00d4ff" fontSize="8" fontFamily="monospace" textAnchor="end">
            &#x210F;&#x03C9;&#x2080;&#x2081;
          </text>

          <line x1="45" y1="140" x2="45" y2="70" stroke="#475569" strokeWidth="0.5" />
          <line x1="42" y1="70" x2="48" y2="70" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="108" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="end">
            different
          </text>

          {/* Key insight */}
          <text x="150" y="28" fill="#374151" fontSize="9" fontFamily="monospace" textAnchor="middle">
            If these gaps were equal → harmonic oscillator
          </text>
          <text x="150" y="42" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
            Because they&apos;re not → qubit
          </text>
        </svg>

        <div className="mt-8 text-center">
          <p className="text-gray-300 text-lg font-light">
            Two levels. Unequally spaced.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            The Josephson junction makes the energy gaps <em className="text-gray-300">anharmonic</em>.
            The |0&#x27E9;&nbsp;&rarr;&nbsp;|1&#x27E9; gap is different from the |1&#x27E9;&nbsp;&rarr;&nbsp;|2&#x27E9; gap.
            A 5.55 GHz pulse excites only the first transition. The qubit acts as a two-level system — <em className="text-gray-300">a bit, but quantum</em>.
          </p>
          <p className="text-gray-700 text-xs font-mono mt-4">
            A harmonic oscillator would have equally spaced levels.
            You couldn&apos;t address just one transition. No qubit.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ============================================================
// STEP 8: THE SCALE
// ============================================================

function StepScale() {
  const { ref, visible } = useInView(0.3)

  const scales = [
    { size: '7 mm', label: 'The chip', color: '#1e293b', desc: 'Silicon substrate with niobium wiring' },
    { size: '5 mm', label: 'Readout resonator', color: '#22c55e', desc: 'Meandered coplanar waveguide, λ/4' },
    { size: '300 μm', label: 'Qubit cross', color: '#6366f1', desc: 'Xmon capacitor pads' },
    { size: '20 μm', label: 'Coupling gap', color: '#f59e0b', desc: 'Drive line to qubit' },
    { size: '200 nm', label: 'Josephson junction', color: '#f472b6', desc: 'Al/AlOx/Al overlap' },
    { size: '3 nm', label: 'Tunnel barrier', color: '#ef4444', desc: 'Amorphous aluminum oxide — ~10 atoms' },
  ]

  return (
    <div ref={ref} className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="space-y-3">
          {scales.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-4 transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                transitionDelay: `${i * 150}ms`,
              }}
            >
              {/* Bar — width proportional to log scale */}
              <div
                className="h-6 rounded-sm flex items-center justify-end pr-2 shrink-0"
                style={{
                  width: `${Math.max(12, 160 - i * 26)}px`,
                  backgroundColor: s.color + '30',
                  borderLeft: `3px solid ${s.color}`,
                }}
              >
                <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>
                  {s.size}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-300">{s.label}</span>
                <span className="text-xs text-gray-600 ml-2">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-10 text-center transition-all duration-1000 delay-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-gray-300 text-lg font-light">
            Six orders of magnitude.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            The barrier that makes quantum computing possible is about ten atoms thick.
          </p>
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
      {/* Minimal header */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <Link href="/listen" className="text-sm text-gray-600 hover:text-gray-400 transition-colors inline-block">
          &larr; back to Listen
        </Link>
      </div>

      {/* Title section */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-200 mb-2">
          What does a qubit look like?
        </h1>
        <p className="text-gray-600 text-sm max-w-lg">
          Not the math. The metal. Scroll down.
        </p>
      </div>

      {/* The sequence */}
      <div className="space-y-8">
        <StepChip />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepQubit />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepDriveLine />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepDrive />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepDecay />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepJunction />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepEnergy />

        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-gray-900" />
        </div>

        <StepScale />
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-700 py-16 mt-8">
        Act 1 of 9 &mdash; one qubit on{' '}
        <Link href="https://www.quantum-inspire.com" className="text-gray-600 hover:text-gray-400">
          Tuna-9
        </Link>
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
