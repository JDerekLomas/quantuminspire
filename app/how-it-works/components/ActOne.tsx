'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import ScrollScene from './ScrollScene'
import WavCanvas from './WavCanvas'
import QubitDot from './QubitDot'
import { useAudio } from './AudioEngine'
import { lorentzian, F0, ghzToHz } from '../lib/scroll-physics'
import InfoBox from './InfoBox'

// ─── Scene 1: Energy Levels ─────────────────────────────────────────────────
function EnergyLevels({ progress }: { progress: number }) {
  const opacity = Math.min(1, progress * 3)
  const gap = 5.0 // GHz
  const dotY = 1 - 0 // dot on ground state

  return (
    <div className="flex flex-col items-center gap-8" style={{ opacity }}>
      <h2 className="text-2xl font-bold text-white/90 mb-2">Act I: One Note</h2>
      <p className="text-sm text-gray-400 max-w-md text-center mb-4">
        A qubit has exactly two energy levels — a ground state and an excited state.
        The energy gap between them corresponds to a specific microwave frequency, just like
        a guitar string has a natural pitch. This qubit's note is 5.0 GHz.
      </p>
      <div className="relative w-64 h-48">
        {/* |1⟩ level */}
        <div className="absolute top-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-orange-400/70" />
          <span className="text-xs font-mono text-orange-400">|1&#x27E9;</span>
        </div>
        {/* |0⟩ level */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-cyan-400/70" />
          <span className="text-xs font-mono text-cyan-400">|0&#x27E9;</span>
        </div>
        {/* Gap label */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-lg font-mono text-white/80">{gap.toFixed(1)} GHz</div>
          <div className="text-[10px] text-gray-500 mt-1">energy gap = frequency</div>
        </div>
        {/* Qubit dot on ground state */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <QubitDot excitation={0} size={24} glow={progress > 0.3} />
        </div>
      </div>
      <InfoBox title="What is a transmon?" link={{ href: '/how-qubits-work', label: 'Explore qubit physics' }}>
        A transmon is a superconducting circuit made from aluminum on a silicon chip, cooled to 15 millikelvin.
        It behaves like an artificial atom: quantized energy levels, but engineered rather than natural.
        The &quot;5.0 GHz&quot; gap is set by the circuit geometry and a Josephson junction.
      </InfoBox>
    </div>
  )
}

// ─── Scene 2: Microwave Pulse ────────────────────────────────────────────────
function MicrowavePulse({ progress }: { progress: number }) {
  // Scroll controls the drive frequency sweep (4.0 → 6.0 GHz)
  const driveGHz = 4.0 + progress * 2.0
  const detuning = Math.abs(driveGHz - F0)
  const atResonance = detuning < 0.15
  // Gaussian response: full at resonance, drops fast off resonance
  const response = Math.exp(-detuning * detuning * 60)
  const waveFreq = 1 + progress * 6
  const waveAmp = 0.15 + 0.85 * response

  // Time-based oscillation when near resonance
  const [osc, setOsc] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const nearRef = useRef(false)

  useEffect(() => {
    const near = response > 0.05
    if (!near) { setOsc(0); nearRef.current = false; return }
    if (!nearRef.current) startRef.current = null
    nearRef.current = true
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      setOsc(Math.sin(elapsed * Math.PI * 2.0) * 0.5 + 0.5) // 0-1 at 1Hz
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [response > 0.05])

  const excitation = response * osc

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        To control a qubit, you send microwaves at it — the same kind of radiation in your kitchen,
        but precisely tuned. Scroll to sweep the microwave frequency. Only when it matches the qubit's
        natural frequency (5.0 GHz) does the qubit respond — it starts oscillating between its two states.
      </p>
      <div className="relative">
        <WavCanvas
          progress={progress}
          frequency={waveFreq}
          amplitude={waveAmp}
          color={atResonance ? '#00ff88' : response > 0.3 ? '#66ddaa' : '#00d4ff'}
          width={400}
          height={80}
        />
        {atResonance && (
          <div className="absolute inset-0 rounded-lg border-2 border-green-400/30 animate-pulse" />
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-gray-500">Drive: {driveGHz.toFixed(2)} GHz</span>
        <span className="text-xs font-mono text-gray-600">|</span>
        <span className="text-xs font-mono text-gray-500">Qubit: {F0.toFixed(1)} GHz</span>
        {atResonance ? (
          <span className="text-xs font-mono text-green-400 font-bold">RESONANCE!</span>
        ) : (
          <span className="text-xs font-mono text-red-400/60">
            &Delta; = {(detuning * 1000).toFixed(0)} MHz
          </span>
        )}
      </div>
      {/* Energy levels with excitation — dot travels full range at resonance */}
      <div className="relative w-64 h-44">
        <div className="absolute top-2 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-orange-400/50" />
          <span className="text-xs font-mono text-orange-400/70">|1&#x27E9;</span>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-cyan-400/50" />
          <span className="text-xs font-mono text-cyan-400/70">|0&#x27E9;</span>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: `${8 + excitation * 128}px` }}
        >
          <QubitDot excitation={excitation} size={24} glow={atResonance} />
        </div>
        {response < 0.05 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="text-xs font-mono text-gray-600 bg-black/50 px-2 py-0.5 rounded">no response</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scene 3: Lorentzian Response ────────────────────────────────────────────
function LorentzianResponse({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const omega = 5 // drive power
  const t2 = 20 // us

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = 400, h = 200
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    // Draw Lorentzian curve
    ctx.beginPath()
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    const freqRange = 0.08 // GHz around F0
    for (let x = 0; x < w; x++) {
      const freq = F0 - freqRange + (x / w) * 2 * freqRange
      const resp = lorentzian(freq, omega, t2)
      const y = h - 20 - resp * (h - 40)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Drive frequency indicator (vertical line sweeping)
    const driveX = progress * w
    ctx.beginPath()
    ctx.strokeStyle = '#ff8c42'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.moveTo(driveX, 0)
    ctx.lineTo(driveX, h)
    ctx.stroke()
    ctx.setLineDash([])

    // Current response dot
    const driveFreq = F0 - freqRange + progress * 2 * freqRange
    const resp = lorentzian(driveFreq, omega, t2)
    const dotY = h - 20 - resp * (h - 40)
    ctx.beginPath()
    ctx.fillStyle = '#ff8c42'
    ctx.arc(driveX, dotY, 5, 0, Math.PI * 2)
    ctx.fill()

    // Labels
    ctx.fillStyle = '#666'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Drive frequency', w / 2, h - 4)
    ctx.save()
    ctx.translate(10, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Response', 0, 0)
    ctx.restore()
  }, [progress, omega, t2])

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        If you plot the qubit's response at every frequency, you get this peak — a Lorentzian curve.
        The qubit responds strongly only in a narrow window around its resonance. This is how
        we find each qubit's frequency and how selectively we can address it.
      </p>
      <canvas ref={canvasRef} style={{ width: 400, height: 200 }} className="rounded" />
      <p className="text-[11px] font-mono text-gray-500">
        Linewidth ~ 1/(pi T2*) — sharper peak means longer coherence
      </p>
      <InfoBox title="Why a Lorentzian?" link={{ href: '/resonance', label: 'Interactive resonance explorer' }}>
        The Lorentzian lineshape comes from the qubit's finite coherence time T2*.
        Longer coherence = narrower peak = more selective control.
        Real chips like Tuna-9 have T2* ~ 20-40 &micro;s, giving linewidths of ~10 kHz.
      </InfoBox>
    </div>
  )
}

// ─── Scene 4: Rabi Oscillation ───────────────────────────────────────────────
function RabiOscillation({ progress }: { progress: number }) {
  const [excitation, setExcitation] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const RABI_HZ = 1.2 // oscillation frequency in Hz

  useEffect(() => {
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      const phase = elapsed * RABI_HZ * Math.PI * 2
      setExcitation(Math.sin(phase / 2) ** 2)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Scroll controls fade-in opacity
  const opacity = Math.min(1, progress * 3)

  return (
    <div className="flex flex-col items-center gap-6" style={{ opacity }}>
      <p className="text-sm text-gray-400 max-w-md text-center">
        Here's that oscillation up close. The qubit swings between |0&#x27E9; and |1&#x27E9; at a rate set
        by the microwave power. Stronger drive = faster oscillation. These are called Rabi oscillations,
        and controlling their timing is how we build every quantum gate.
      </p>
      <div className="relative w-64 h-48">
        {/* Levels */}
        <div className="absolute top-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-orange-400/40" />
          <span className="text-xs font-mono text-orange-400/60">|1&#x27E9;</span>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-cyan-400/40" />
          <span className="text-xs font-mono text-cyan-400/60">|0&#x27E9;</span>
        </div>
        {/* Oscillating dot */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: `${16 + excitation * (192 - 56)}px` }}
        >
          <QubitDot excitation={excitation} size={28} glow />
        </div>
      </div>
      {/* P(|1⟩) bar */}
      <div className="w-64">
        <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
          <span>P(|1&#x27E9;)</span>
          <span>{(excitation * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${excitation * 100}%`,
              backgroundColor: `rgb(${Math.round(excitation * 255)},${Math.round(140 + (1 - excitation) * 72)},${Math.round(66 + (1 - excitation) * 189)})`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Scene 5: Pi Pulse ───────────────────────────────────────────────────────
function PiPulse({ progress }: { progress: number }) {
  const [phase, setPhase] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const CYCLE = 8.0 // seconds for full demo: pi, -pi, then pi/2 superposition

  useEffect(() => {
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      setPhase((elapsed % CYCLE) / CYCLE)
      rafRef.current = requestAnimationFrame(animate)
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Phase breakdown:
  // 0.00-0.15: pi pulse (0→1)
  // 0.15-0.25: hold at |1⟩
  // 0.25-0.40: -pi pulse (1→0)
  // 0.40-0.48: hold at |0⟩
  // 0.48-0.58: pi/2 pulse (0→0.5 superposition!)
  // 0.58-0.85: hold at superposition
  // 0.85-0.93: settle to 0
  // 0.93-1.00: hold at |0⟩
  let excitation: number
  let pulseEnvelope: number
  let stageLabel: string
  let isSuperposition = false
  if (phase < 0.15) {
    const t = phase / 0.15
    excitation = Math.sin(t * Math.PI / 2) ** 2
    pulseEnvelope = Math.sin(t * Math.PI)
    stageLabel = '\u03C0 pulse (X gate)'
  } else if (phase < 0.25) {
    excitation = 1
    pulseEnvelope = 0
    stageLabel = '|1\u27E9 — flipped!'
  } else if (phase < 0.40) {
    const t = (phase - 0.25) / 0.15
    excitation = 1 - Math.sin(t * Math.PI / 2) ** 2
    pulseEnvelope = Math.sin(t * Math.PI)
    stageLabel = '\u2212\u03C0 pulse (undo)'
  } else if (phase < 0.48) {
    excitation = 0
    pulseEnvelope = 0
    stageLabel = '|0\u27E9 — back to start'
  } else if (phase < 0.58) {
    const t = (phase - 0.48) / 0.10
    excitation = 0.5 * Math.sin(t * Math.PI / 2) ** 2
    pulseEnvelope = Math.sin(t * Math.PI)
    stageLabel = '\u03C0/2 pulse (half rotation)...'
  } else if (phase < 0.85) {
    excitation = 0.5
    pulseEnvelope = 0
    isSuperposition = true
    stageLabel = '(|0\u27E9 + |1\u27E9)/\u221A2 — superposition!'
  } else if (phase < 0.93) {
    const t = (phase - 0.85) / 0.08
    excitation = 0.5 * (1 - Math.sin(t * Math.PI / 2) ** 2)
    pulseEnvelope = Math.sin(t * Math.PI) * 0.5
    stageLabel = 'measuring...'
  } else {
    excitation = 0
    pulseEnvelope = 0
    stageLabel = '|0\u27E9 — reset'
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        If you time the microwave pulse precisely — stopping at exactly half a Rabi oscillation —
        the qubit flips cleanly from |0&#x27E9; to |1&#x27E9;. This "pi pulse" is the X gate.
        But stop at a quarter oscillation (pi/2) and the qubit lands in superposition — both states at once.
      </p>
      {/* Pulse envelope visualization */}
      <div className="w-72 h-10 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gray-700" />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t"
          style={{
            width: 80,
            height: `${pulseEnvelope * 36}px`,
            background: pulseEnvelope > 0 ? 'linear-gradient(to top, rgba(0,212,255,0.3), rgba(0,212,255,0.05))' : 'transparent',
            borderTop: pulseEnvelope > 0.1 ? '2px solid rgba(0,212,255,0.6)' : 'none',
            transition: 'height 0.05s',
          }}
        />
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-400/60">
          {pulseEnvelope > 0.1 ? 'microwave on' : 'pulse off'}
        </span>
      </div>
      {/* Energy levels */}
      <div className="relative w-72 h-48">
        <div className="absolute top-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-orange-400/50" />
          <span className="text-xs font-mono text-orange-400/70">|1&#x27E9;</span>
        </div>
        {/* Superposition midline */}
        {isSuperposition && (
          <div className="absolute top-1/2 left-0 right-0 flex items-center gap-2 -translate-y-1/2">
            <div className="flex-1 h-px bg-purple-400/30 border-dashed" style={{ borderTopWidth: 1, borderStyle: 'dashed' }} />
            <span className="text-[10px] font-mono text-purple-400/70">50/50</span>
          </div>
        )}
        <div className="absolute bottom-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-cyan-400/50" />
          <span className="text-xs font-mono text-cyan-400/70">|0&#x27E9;</span>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: `${16 + excitation * 136}px` }}
        >
          <QubitDot excitation={excitation} size={32} glow />
        </div>
        {/* Arrow showing direction during pulse */}
        {pulseEnvelope > 0.2 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="text-lg text-cyan-400/50">
              {phase < 0.25 ? '\u2191' : phase < 0.48 ? '\u2193' : '\u2191'}
            </span>
          </div>
        )}
      </div>
      <p className="text-sm font-mono h-6" style={{
        color: isSuperposition ? '#a78bfa' : excitation > 0.9 ? '#4ade80' : excitation < 0.1 ? '#60a5fa' : '#9ca3af',
      }}>
        {stageLabel}
      </p>
    </div>
  )
}

// ─── Act I Audio Hook ────────────────────────────────────────────────────────
function useActOneAudio(scene: number, progress: number) {
  const { getCtx, getMasterGain, initialized } = useAudio()
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)
  const lfoGainRef = useRef<GainNode | null>(null)

  const ensureOsc = useCallback(() => {
    const ctx = getCtx()
    const mg = getMasterGain()
    if (!ctx || !mg || oscRef.current) return
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 440
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(gain).connect(mg)
    osc.start()
    oscRef.current = osc
    gainRef.current = gain
  }, [getCtx, getMasterGain])

  useEffect(() => {
    if (!initialized) return
    ensureOsc()
  }, [initialized, ensureOsc])

  // Update audio based on scene and progress
  useEffect(() => {
    const ctx = getCtx()
    const osc = oscRef.current
    const gain = gainRef.current
    if (!ctx || !osc || !gain) return

    const now = ctx.currentTime

    if (scene === 1) {
      // Scene 1: Pure tone fading in
      osc.frequency.setTargetAtTime(ghzToHz(5.0), now, 0.05)
      gain.gain.setTargetAtTime(progress * 0.2, now, 0.05)
      // Remove LFO if present
      if (lfoRef.current) {
        try { lfoRef.current.stop() } catch {}
        lfoRef.current = null
        lfoGainRef.current = null
      }
    } else if (scene === 2) {
      // Scene 2: Sweep 4.0→6.0 GHz
      const driveGHz = 4.0 + progress * 2.0
      osc.frequency.setTargetAtTime(ghzToHz(driveGHz), now, 0.02)
      const detuning = Math.abs(driveGHz - F0)
      const amp = 0.05 + 0.25 * Math.exp(-detuning * 8)
      gain.gain.setTargetAtTime(amp, now, 0.02)
    } else if (scene === 3) {
      // Scene 3: Amplitude follows Lorentzian
      const freqRange = 0.08
      const driveFreq = F0 - freqRange + progress * 2 * freqRange
      osc.frequency.setTargetAtTime(ghzToHz(driveFreq), now, 0.02)
      const resp = lorentzian(driveFreq, 5, 20)
      gain.gain.setTargetAtTime(resp * 0.3, now, 0.02)
    } else if (scene === 4) {
      // Scene 4: Tremolo via real LFO — oscillates on its own
      osc.frequency.setTargetAtTime(ghzToHz(5.0), now, 0.05)
      gain.gain.setTargetAtTime(0.2, now, 0.05)

      // Create LFO if not present
      if (!lfoRef.current && ctx) {
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.type = 'sine'
        lfo.frequency.value = 1.2 // matches visual Rabi Hz
        lfoGain.gain.value = 0.12 // modulation depth
        lfo.connect(lfoGain).connect(gain.gain)
        lfo.start()
        lfoRef.current = lfo
        lfoGainRef.current = lfoGain
      }
    } else if (scene === 5) {
      // Scene 5: Pi pulse — looping, so just set steady tone
      if (lfoRef.current) {
        try { lfoRef.current.stop() } catch {}
        lfoRef.current = null
        lfoGainRef.current = null
      }
      osc.frequency.setTargetAtTime(ghzToHz(5.0), now, 0.05)
      gain.gain.setTargetAtTime(0.15, now, 0.1)
    } else {
      gain.gain.setTargetAtTime(0, now, 0.1)
    }
  }, [scene, progress, getCtx])

  // Cleanup
  useEffect(() => {
    return () => {
      try { oscRef.current?.stop() } catch {}
      try { lfoRef.current?.stop() } catch {}
      oscRef.current = null
      gainRef.current = null
      lfoRef.current = null
      lfoGainRef.current = null
    }
  }, [])
}

// ─── Act I Composite ─────────────────────────────────────────────────────────

/** Returns which sub-scene (1-5) is active and local progress within that scene */
function subScene(globalProgress: number, numScenes: number): [number, number] {
  const idx = Math.min(numScenes - 1, Math.floor(globalProgress * numScenes))
  const local = (globalProgress * numScenes) - idx
  return [idx + 1, Math.max(0, Math.min(1, local))]
}

export default function ActOne({ progress }: { progress: number }) {
  const [scene, localP] = subScene(progress, 5)

  useActOneAudio(scene, localP)

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {scene === 1 && <EnergyLevels progress={localP} />}
      {scene === 2 && <MicrowavePulse progress={localP} />}
      {scene === 3 && <LorentzianResponse progress={localP} />}
      {scene === 4 && <RabiOscillation progress={localP} />}
      {scene === 5 && <PiPulse progress={localP} />}
    </div>
  )
}
