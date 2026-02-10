'use client'

import { useEffect, useRef, useCallback } from 'react'
import ScrollScene from './ScrollScene'
import QubitDot from './QubitDot'
import WavCanvas from './WavCanvas'
import { useAudio } from './AudioEngine'
import { avoidedCrossing, ghzToHz } from '../lib/scroll-physics'

function subScene(globalProgress: number, numScenes: number): [number, number] {
  const idx = Math.min(numScenes - 1, Math.floor(globalProgress * numScenes))
  const local = (globalProgress * numScenes) - idx
  return [idx + 1, Math.max(0, Math.min(1, local))]
}

// ─── Scene 1: Two Qubits ────────────────────────────────────────────────────
function TwoQubits({ progress }: { progress: number }) {
  const opacity = Math.min(1, progress * 3)

  return (
    <div className="flex flex-col items-center gap-6" style={{ opacity }}>
      <h2 className="text-2xl font-bold text-white/90 mb-2">Act II: Two Notes</h2>
      <p className="text-sm text-gray-400 max-w-md text-center">
        Two qubits, two frequencies. A capacitor couples them — the interaction strength is g.
      </p>
      <div className="flex items-center gap-16">
        {/* Qubit A */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-32 h-36">
            <div className="absolute top-2 left-0 right-0 h-px bg-orange-400/50" />
            <div className="absolute bottom-2 left-0 right-0 h-px bg-cyan-400/50" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <QubitDot excitation={0} size={22} glow={progress > 0.4} />
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400">5.0 GHz</span>
        </div>

        {/* Coupling spring */}
        <div className="flex flex-col items-center">
          <svg width="60" height="30" viewBox="0 0 60 30">
            <path
              d="M0,15 Q10,0 15,15 T30,15 T45,15 T60,15"
              fill="none"
              stroke="#666"
              strokeWidth="1.5"
              opacity={Math.min(1, progress * 2)}
            />
          </svg>
          <span className="text-[10px] font-mono text-gray-500 mt-1">coupling g = 30 MHz</span>
        </div>

        {/* Qubit B */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-32 h-36">
            <div className="absolute top-2 left-0 right-0 h-px bg-orange-400/50" />
            <div className="absolute bottom-2 left-0 right-0 h-px bg-cyan-400/50" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <QubitDot excitation={0} size={22} glow={progress > 0.4} />
            </div>
          </div>
          <span className="text-xs font-mono text-purple-400">5.3 GHz</span>
        </div>
      </div>
    </div>
  )
}

// ─── Scene 2: Avoided Crossing ───────────────────────────────────────────────
function AvoidedCrossingScene({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const g = 30 // MHz coupling

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = 400, h = 250
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const mid = h / 2
    const scale = 0.8 // px per MHz

    // Draw bare energies (dashed)
    ctx.beginPath()
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.moveTo(0, mid - (-200) * scale * 0.5)
    ctx.lineTo(w, mid - 200 * scale * 0.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, mid - 200 * scale * 0.5)
    ctx.lineTo(w, mid - (-200) * scale * 0.5)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw dressed energies
    ctx.lineWidth = 2.5
    const drawBranch = (upper: boolean, color: string) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      for (let x = 0; x < w; x++) {
        const delta = -200 + (x / w) * 400
        const [eUp, eLow] = avoidedCrossing(delta, g)
        const e = upper ? eUp : eLow
        const y = mid - e * scale
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    drawBranch(true, '#00d4ff')
    drawBranch(false, '#ff8c42')

    // Current position indicator
    const currentDelta = -200 + progress * 400
    const currentX = progress * w
    const [eUp, eLow] = avoidedCrossing(currentDelta, g)
    ctx.beginPath()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.moveTo(currentX, 0)
    ctx.lineTo(currentX, h)
    ctx.stroke()
    ctx.setLineDash([])

    // Gap label at center
    if (Math.abs(progress - 0.5) < 0.15) {
      const gapPx = (eUp - eLow) * scale
      ctx.fillStyle = '#00ff88'
      ctx.font = '12px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`gap = 2g = ${(2 * g).toFixed(0)} MHz`, w / 2, mid + 50)
    }

    // Axis labels
    ctx.fillStyle = '#555'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Detuning (MHz)', w / 2, h - 4)
  }, [progress, g])

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        Tune the qubits toward each other. Their levels don't cross —
        they repel. The gap is twice the coupling strength.
      </p>
      <canvas ref={canvasRef} style={{ width: 400, height: 250 }} className="rounded" />
      <p className="text-[11px] font-mono text-gray-500">
        This "avoided crossing" is how we know qubits are talking
      </p>
    </div>
  )
}

// ─── Scene 3: Entanglement ───────────────────────────────────────────────────
function Entanglement({ progress }: { progress: number }) {
  const entangled = progress > 0.4
  const blendT = entangled ? Math.min(1, (progress - 0.4) / 0.3) : 0

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        At the right moment, a pulse creates entanglement — the qubits share a single quantum state.
        Neither has a definite value alone.
      </p>
      <div className="flex items-center gap-8">
        <QubitDot
          excitation={entangled ? 0.5 : 0}
          size={40}
          glow={entangled}
          label="Q0"
        />
        {/* Connection visualization */}
        <div className="relative w-24 h-4">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: entangled
                ? 'linear-gradient(90deg, #00d4ff, #8b5cf6, #ff8c42)'
                : 'transparent',
              opacity: blendT * 0.6,
              filter: `blur(${4 - blendT * 2}px)`,
            }}
          />
          {!entangled && <div className="absolute inset-y-0 left-0 right-0 border-t border-dashed border-gray-600 top-1/2" />}
        </div>
        <QubitDot
          excitation={entangled ? 0.5 : 0}
          size={40}
          glow={entangled}
          label="Q1"
        />
      </div>
      {entangled && (
        <div className="text-center mt-4" style={{ opacity: blendT }}>
          <p className="text-lg font-mono text-purple-400">
            (|00&#x27E9; + |11&#x27E9;) / √2
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Bell state — maximally entangled</p>
        </div>
      )}
    </div>
  )
}

// ─── Scene 4: Measurement ────────────────────────────────────────────────────
function Measurement({ progress }: { progress: number }) {
  const measured = progress > 0.3
  // Deterministic "random" outcome based on progress for visual consistency
  const outcome = progress > 0.7 ? '11' : '00'

  // Build histogram
  const histProg = measured ? Math.min(1, (progress - 0.3) / 0.5) : 0
  const counts00 = Math.round(histProg * 512)
  const counts11 = Math.round(histProg * 488)
  const total = counts00 + counts11 || 1

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400 max-w-md text-center">
        Measure the entangled pair. The superposition collapses — but the outcomes are correlated.
        If one is |0&#x27E9;, the other is always |0&#x27E9; too.
      </p>
      <div className="flex items-center gap-8">
        <QubitDot
          excitation={measured ? (outcome === '11' ? 1 : 0) : 0.5}
          size={36}
          glow={!measured}
          label={measured ? (outcome[0] === '1' ? '|1⟩' : '|0⟩') : '?'}
        />
        <div className="w-16 border-t border-gray-600" />
        <QubitDot
          excitation={measured ? (outcome === '11' ? 1 : 0) : 0.5}
          size={36}
          glow={!measured}
          label={measured ? (outcome[1] === '1' ? '|1⟩' : '|0⟩') : '?'}
        />
      </div>

      {/* Histogram */}
      {measured && (
        <div className="w-64 mt-4" style={{ opacity: histProg }}>
          <div className="flex items-end gap-8 justify-center h-24">
            <div className="flex flex-col items-center">
              <div
                className="w-16 bg-cyan-500/60 rounded-t"
                style={{ height: `${(counts00 / total) * 80}px` }}
              />
              <span className="text-xs font-mono text-gray-400 mt-1">|00&#x27E9;</span>
              <span className="text-[10px] font-mono text-gray-500">{counts00}</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="w-16 bg-orange-500/60 rounded-t"
                style={{ height: `${(counts11 / total) * 80}px` }}
              />
              <span className="text-xs font-mono text-gray-400 mt-1">|11&#x27E9;</span>
              <span className="text-[10px] font-mono text-gray-500">{counts11}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-2">
            Never |01&#x27E9; or |10&#x27E9; — that's entanglement
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Act II Audio ────────────────────────────────────────────────────────────
function useActTwoAudio(scene: number, progress: number) {
  const { getCtx, getMasterGain, initialized } = useAudio()
  const osc1Ref = useRef<OscillatorNode | null>(null)
  const osc2Ref = useRef<OscillatorNode | null>(null)
  const gain1Ref = useRef<GainNode | null>(null)
  const gain2Ref = useRef<GainNode | null>(null)

  const ensureOscs = useCallback(() => {
    const ctx = getCtx()
    const mg = getMasterGain()
    if (!ctx || !mg || osc1Ref.current) return

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.value = ghzToHz(5.0)
    osc2.frequency.value = ghzToHz(5.3)

    const g1 = ctx.createGain()
    const g2 = ctx.createGain()
    g1.gain.value = 0
    g2.gain.value = 0

    // Stereo separation
    const pan1 = ctx.createStereoPanner()
    const pan2 = ctx.createStereoPanner()
    pan1.pan.value = -0.4
    pan2.pan.value = 0.4

    osc1.connect(g1).connect(pan1).connect(mg)
    osc2.connect(g2).connect(pan2).connect(mg)
    osc1.start()
    osc2.start()

    osc1Ref.current = osc1
    osc2Ref.current = osc2
    gain1Ref.current = g1
    gain2Ref.current = g2
  }, [getCtx, getMasterGain])

  useEffect(() => {
    if (!initialized) return
    ensureOscs()
  }, [initialized, ensureOscs])

  useEffect(() => {
    const ctx = getCtx()
    const osc1 = osc1Ref.current
    const osc2 = osc2Ref.current
    const g1 = gain1Ref.current
    const g2 = gain2Ref.current
    if (!ctx || !osc1 || !osc2 || !g1 || !g2) return

    const now = ctx.currentTime
    const g = 30 // MHz coupling

    if (scene === 1) {
      // Two distinct tones
      osc1.frequency.setTargetAtTime(ghzToHz(5.0), now, 0.05)
      osc2.frequency.setTargetAtTime(ghzToHz(5.3), now, 0.05)
      g1.gain.setTargetAtTime(progress * 0.15, now, 0.05)
      g2.gain.setTargetAtTime(progress * 0.15, now, 0.05)
    } else if (scene === 2) {
      // Slide together — avoided crossing
      const delta = -200 + progress * 400
      const [eUp, eLow] = avoidedCrossing(delta, g)
      // Map energies to Hz
      osc1.frequency.setTargetAtTime(440 + eUp * 0.5, now, 0.02)
      osc2.frequency.setTargetAtTime(440 + eLow * 0.5, now, 0.02)
      g1.gain.setTargetAtTime(0.15, now, 0.02)
      g2.gain.setTargetAtTime(0.15, now, 0.02)
    } else if (scene === 3) {
      // Entanglement: beating resolves to chord
      const entangled = progress > 0.4
      if (entangled) {
        // Rich chord — perfect fifth
        osc1.frequency.setTargetAtTime(330, now, 0.1)
        osc2.frequency.setTargetAtTime(495, now, 0.1) // 3:2 ratio
        g1.gain.setTargetAtTime(0.12, now, 0.05)
        g2.gain.setTargetAtTime(0.12, now, 0.05)
      } else {
        // Beating: close frequencies
        osc1.frequency.setTargetAtTime(440, now, 0.05)
        osc2.frequency.setTargetAtTime(443, now, 0.05) // 3 Hz beat
        g1.gain.setTargetAtTime(0.15, now, 0.05)
        g2.gain.setTargetAtTime(0.15, now, 0.05)
      }
    } else if (scene === 4) {
      // Measurement: chord cuts to single tone
      const measured = progress > 0.3
      if (measured) {
        osc1.frequency.setTargetAtTime(ghzToHz(5.0), now, 0.02)
        g1.gain.setTargetAtTime(0.15, now, 0.02)
        g2.gain.setTargetAtTime(0, now, 0.05) // second tone drops
      } else {
        osc1.frequency.setTargetAtTime(330, now, 0.05)
        osc2.frequency.setTargetAtTime(495, now, 0.05)
        g1.gain.setTargetAtTime(0.12, now, 0.05)
        g2.gain.setTargetAtTime(0.12, now, 0.05)
      }
    } else {
      g1.gain.setTargetAtTime(0, now, 0.1)
      g2.gain.setTargetAtTime(0, now, 0.1)
    }
  }, [scene, progress, getCtx])

  useEffect(() => {
    return () => {
      try { osc1Ref.current?.stop() } catch {}
      try { osc2Ref.current?.stop() } catch {}
      osc1Ref.current = null
      osc2Ref.current = null
      gain1Ref.current = null
      gain2Ref.current = null
    }
  }, [])
}

// ─── Act II Composite ────────────────────────────────────────────────────────
export default function ActTwo({ progress }: { progress: number }) {
  const [scene, localP] = subScene(progress, 4)
  useActTwoAudio(scene, localP)

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {scene === 1 && <TwoQubits progress={localP} />}
      {scene === 2 && <AvoidedCrossingScene progress={localP} />}
      {scene === 3 && <Entanglement progress={localP} />}
      {scene === 4 && <Measurement progress={localP} />}
    </div>
  )
}
