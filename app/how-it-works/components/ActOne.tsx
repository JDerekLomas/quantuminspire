'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import ScrollScene from './ScrollScene'
import WavCanvas from './WavCanvas'
import QubitDot from './QubitDot'
import { useAudio } from './AudioEngine'
import { lorentzian, F0, ghzToHz } from '../lib/scroll-physics'

// ─── Scene 1: Energy Levels ─────────────────────────────────────────────────
function EnergyLevels({ progress }: { progress: number }) {
  const opacity = Math.min(1, progress * 3)
  const gap = 5.0 // GHz
  const dotY = 1 - 0 // dot on ground state

  return (
    <div className="flex flex-col items-center gap-8" style={{ opacity }}>
      <h2 className="text-2xl font-bold text-white/90 mb-2">Act I: One Note</h2>
      <p className="text-sm text-gray-400 max-w-md text-center mb-4">
        A qubit is a superconducting circuit — an artificial atom — with two energy levels.
        The gap between them defines a frequency.
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
    </div>
  )
}

// ─── Scene 2: Microwave Pulse ────────────────────────────────────────────────
function MicrowavePulse({ progress }: { progress: number }) {
  // Scroll controls the drive frequency sweep
  const driveGHz = 4.0 + progress * 2.0
  const detuning = Math.abs(driveGHz - F0)
  const atResonance = detuning < 0.15
  const waveFreq = 1 + progress * 6 // canvas wave frequency (scroll is fine here — it's the "tuning knob")
  const waveAmp = atResonance ? 1.0 : 0.3 + 0.7 * Math.exp(-detuning * 8)

  // Time-based bob when at resonance
  const [bob, setBob] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!atResonance) { setBob(0); return }
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      setBob(Math.sin(elapsed * 2.5) * 0.5 + 0.5) // 0-1 gentle bob
      rafRef.current = requestAnimationFrame(animate)
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [atResonance])

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        Send a microwave pulse at the qubit. Sweep the frequency...
      </p>
      <div className="relative">
        <WavCanvas
          progress={progress}
          frequency={waveFreq}
          amplitude={waveAmp}
          color={atResonance ? '#00ff88' : '#00d4ff'}
          width={400}
          height={80}
        />
        {atResonance && (
          <div className="absolute inset-0 rounded-lg border-2 border-green-400/30 animate-pulse" />
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-gray-500">Drive: {driveGHz.toFixed(2)} GHz</span>
        {atResonance && (
          <span className="text-xs font-mono text-green-400 font-bold">RESONANCE</span>
        )}
      </div>
      {/* Energy levels with excitation */}
      <div className="relative w-48 h-32">
        <div className="absolute top-2 left-0 right-0 h-px bg-orange-400/50" />
        <div className="absolute bottom-2 left-0 right-0 h-px bg-cyan-400/50" />
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: `${8 + (atResonance ? bob * 0.5 : 0) * 80}px` }}
        >
          <QubitDot excitation={atResonance ? bob * 0.4 : 0} size={20} glow={atResonance} />
        </div>
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
        Sweep the drive across the qubit's frequency. The response traces a Lorentzian peak —
        maximum when you hit resonance.
      </p>
      <canvas ref={canvasRef} style={{ width: 400, height: 200 }} className="rounded" />
      <p className="text-[11px] font-mono text-gray-500">
        Linewidth ~ 1/(pi T2*) — sharper peak means longer coherence
      </p>
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
        Drive continuously at resonance and the qubit oscillates between |0&#x27E9; and |1&#x27E9;.
        These are Rabi oscillations — the heartbeat of quantum control.
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
  const [flip, setFlip] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const FLIP_DURATION = 1.5 // seconds for a single 0→1 flip

  useEffect(() => {
    const animate = (time: number) => {
      if (startRef.current === null) startRef.current = time
      const elapsed = (time - startRef.current) / 1000
      // Single smooth flip over FLIP_DURATION, then hold at 1
      const t = Math.min(1, elapsed / FLIP_DURATION)
      setFlip(t)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const excitation = Math.sin(flip * Math.PI / 2) ** 2

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        A pulse of exactly the right duration flips the qubit cleanly from |0&#x27E9; to |1&#x27E9;.
        This is a pi pulse — an X gate. Stop halfway and you get a superposition (sqrt-X).
      </p>
      <div className="relative w-64 h-48">
        <div className="absolute top-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-orange-400/50" />
          <span className="text-xs font-mono text-orange-400/70">|1&#x27E9;</span>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex items-center gap-2">
          <div className="flex-1 h-px bg-cyan-400/50" />
          <span className="text-xs font-mono text-cyan-400/70">|0&#x27E9;</span>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: `${16 + excitation * (192 - 56)}px` }}
        >
          <QubitDot excitation={excitation} size={32} glow />
        </div>
        {/* Pi label */}
        {flip > 0.1 && flip < 0.9 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ml-12">
            <span className="text-2xl font-mono text-white/50" style={{ opacity: 1 - Math.abs(flip - 0.5) * 2 }}>
              pi
            </span>
          </div>
        )}
      </div>
      {flip >= 0.95 && (
        <p className="text-sm font-mono text-green-400 animate-pulse">
          |0&#x27E9; → |1&#x27E9;  (X gate)
        </p>
      )}
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
      // Scene 5: Pi pulse — schedule a one-shot crescendo-decrescendo on entry
      // Remove LFO from scene 4
      if (lfoRef.current) {
        try { lfoRef.current.stop() } catch {}
        lfoRef.current = null
        lfoGainRef.current = null
      }
      osc.frequency.setTargetAtTime(ghzToHz(5.0), now, 0.05)
      // Smooth bell-shaped envelope over 1.5s
      gain.gain.setTargetAtTime(0.25, now, 0.3)
      gain.gain.setTargetAtTime(0.05, now + 1.2, 0.3)
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
