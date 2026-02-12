'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ============================================================
// SCROLL REVEAL
// ============================================================

function useInView(threshold = 0.3) {
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

function useActiveInView(threshold = 0.4) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, active }
}

// ============================================================
// CONSTANTS
// ============================================================

const TUNA9_FREQS = [5.12, 5.38, 5.55, 4.95, 5.70, 6.02, 6.25, 6.48, 6.80]
const TUNA9_LABELS = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

const H2_COEFFICIENTS: Record<string, { g0: number; g1: number; g2: number; g4: number; fci: number }> = {
  '0.50': { g0: 0.0990, g1: 0.7956, g2: -0.7956, g4: 0.1745, fci: -0.8428 },
  '0.735': { g0: -0.3211, g1: 0.3979, g2: -0.3979, g4: 0.0905, fci: -1.1373 },
  '1.00': { g0: -0.5597, g1: 0.2097, g2: -0.2097, g4: 0.0537, fci: -1.1011 },
  '1.50': { g0: -0.7295, g1: 0.0710, g2: -0.0710, g4: 0.0244, fci: -0.9829 },
  '2.00': { g0: -0.7889, g1: 0.0224, g2: -0.0224, g4: 0.0108, fci: -0.9486 },
  '2.50': { g0: -0.8069, g1: 0.0069, g2: -0.0069, g4: 0.0047, fci: -0.9388 },
}

// ============================================================
// ACT DEFINITIONS
// ============================================================

interface Act {
  id: string
  title: string
  subtitle: string
  description: string
  whatYouHear: string
  physics: string
  durationMs: number
  color: string
  play: (ctx: AudioContext, master: GainNode) => void
}

function makeActs(): Act[] {
  return [
    {
      id: 'one-qubit',
      title: 'One Qubit',
      subtitle: 'A resonator with a natural frequency',
      description:
        'A transmon qubit is a superconducting resonator — a tiny circuit that oscillates at a specific microwave frequency, around 5 GHz. Drive it at exactly that frequency and it responds. Detune even slightly and it ignores you. This is the same principle as a tuning fork, but at 5 billion cycles per second.',
      whatYouHear:
        'A pure sine tone at the audible equivalent of qubit 2\'s 5.55 GHz frequency (mapped to ~497 Hz). The tone fades exponentially — this is T2 decoherence, the qubit losing its quantum information to the environment. On Tuna-9, T2 is about 10-20 microseconds.',
      physics: 'f_qubit ≈ 5.55 GHz → 497 Hz (audible). T2 decay: A(t) = A₀ · e^(-t/T₂)',
      durationMs: 5000,
      color: '#00d4ff',
      play: (ctx, master) => {
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
      },
    },
    {
      id: 'nine-qubits',
      title: 'Nine Qubits',
      subtitle: 'The chip tunes up',
      description:
        'Tuna-9 has nine transmon qubits, each deliberately tuned to a different frequency. The spread prevents crosstalk — if two qubits were too close in frequency, stray microwave photons meant for one would accidentally drive the other. The frequencies range from 4.95 to 6.80 GHz.',
      whatYouHear:
        'Nine tones enter one by one, panned across the stereo field (q0 far left to q8 far right), building into a nine-note chord. Each tone is the audible equivalent of that qubit\'s resonant frequency. The chord they form together is the "sound" of the chip.',
      physics: 'Frequencies: q0=5.12, q1=5.38, q2=5.55, q3=4.95, q4=5.70, q5=6.02, q6=6.25, q7=6.48, q8=6.80 GHz',
      durationMs: 7000,
      color: '#ff8c42',
      play: (ctx, master) => {
        const now = ctx.currentTime
        TUNA9_FREQS.forEach((ghz, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const pan = ctx.createStereoPanner()
          osc.type = 'sine'
          osc.frequency.value = ghzToHz(ghz)
          pan.pan.value = -0.8 + (i / 8) * 1.6
          const enterTime = now + i * 0.5
          gain.gain.setValueAtTime(0, now)
          gain.gain.setValueAtTime(0, enterTime)
          gain.gain.linearRampToValueAtTime(0.1, enterTime + 0.08)
          gain.gain.setValueAtTime(0.1, now + 5.5)
          gain.gain.linearRampToValueAtTime(0, now + 6.8)
          osc.connect(gain).connect(pan).connect(master)
          osc.start(now)
          osc.stop(now + 7)
        })
      },
    },
    {
      id: 'gate',
      title: 'A Gate',
      subtitle: 'A microwave pulse flips the qubit',
      description:
        'Quantum gates are precisely shaped microwave pulses. An X gate is a pi-rotation: it flips the qubit from |0⟩ to |1⟩ (or vice versa). The pulse duration is about 20-40 nanoseconds. The transition state |0⟩ is lower energy than |1⟩ — so the pitch jumps up.',
      whatYouHear:
        'A low tone (|0⟩ ground state), then a brief sawtooth burst (the gate pulse — rich in harmonics like a real microwave drive), then a higher tone (|1⟩ excited state, one octave up). The octave represents the energy difference between computational states.',
      physics: 'X gate: |0⟩ → |1⟩. Pulse duration ~20ns. f_{01} ≈ 5.55 GHz. The |1⟩ state is at a higher energy level.',
      durationMs: 5000,
      color: '#8b5cf6',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseHz = ghzToHz(5.55)
        const osc0 = ctx.createOscillator()
        const gain0 = ctx.createGain()
        osc0.type = 'sine'
        osc0.frequency.value = baseHz
        gain0.gain.setValueAtTime(0, now)
        gain0.gain.linearRampToValueAtTime(0.3, now + 0.05)
        gain0.gain.setValueAtTime(0.3, now + 1.5)
        gain0.gain.linearRampToValueAtTime(0, now + 1.7)
        osc0.connect(gain0).connect(master)
        osc0.start(now)
        osc0.stop(now + 1.8)

        const pulseOsc = ctx.createOscillator()
        const pulseGain = ctx.createGain()
        pulseOsc.type = 'sawtooth'
        pulseOsc.frequency.value = baseHz
        pulseGain.gain.setValueAtTime(0, now + 1.9)
        pulseGain.gain.linearRampToValueAtTime(0.4, now + 2.0)
        pulseGain.gain.linearRampToValueAtTime(0, now + 2.15)
        pulseOsc.connect(pulseGain).connect(master)
        pulseOsc.start(now + 1.9)
        pulseOsc.stop(now + 2.2)

        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.value = baseHz * 2
        gain1.gain.setValueAtTime(0, now + 2.2)
        gain1.gain.linearRampToValueAtTime(0.3, now + 2.3)
        gain1.gain.setValueAtTime(0.3, now + 4.0)
        gain1.gain.linearRampToValueAtTime(0, now + 4.8)
        osc1.connect(gain1).connect(master)
        osc1.start(now + 2.2)
        osc1.stop(now + 5)
      },
    },
    {
      id: 'superposition',
      title: 'Superposition',
      subtitle: 'One note becomes two',
      description:
        'A Hadamard gate rotates the qubit to an equal superposition of |0⟩ and |1⟩. The qubit is genuinely in both states simultaneously — not uncertain, not flickering between them, but existing as both at once. This is the fundamental resource that quantum computing exploits.',
      whatYouHear:
        'A single pure tone (the qubit in |0⟩), then a brief shimmer of noise (the Hadamard gate), then the note splits into two simultaneous tones a perfect fifth apart. Both tones play at equal volume — neither is "more real" than the other. This is superposition.',
      physics: 'H|0⟩ = (|0⟩ + |1⟩)/√2. The probability of each outcome is exactly 50%.',
      durationMs: 6000,
      color: '#00ff88',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseHz = 440
        const osc0 = ctx.createOscillator()
        const gain0 = ctx.createGain()
        osc0.type = 'sine'
        osc0.frequency.value = baseHz
        gain0.gain.setValueAtTime(0, now)
        gain0.gain.linearRampToValueAtTime(0.35, now + 0.05)
        gain0.gain.setValueAtTime(0.35, now + 1.5)
        gain0.gain.linearRampToValueAtTime(0.2, now + 2.2)
        gain0.gain.setValueAtTime(0.2, now + 5.0)
        gain0.gain.linearRampToValueAtTime(0, now + 5.8)
        osc0.connect(gain0).connect(master)
        osc0.start(now)
        osc0.stop(now + 6)

        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.value = baseHz * 1.5
        gain1.gain.setValueAtTime(0, now)
        gain1.gain.setValueAtTime(0, now + 1.8)
        gain1.gain.linearRampToValueAtTime(0.2, now + 2.2)
        gain1.gain.setValueAtTime(0.2, now + 5.0)
        gain1.gain.linearRampToValueAtTime(0, now + 5.8)
        osc1.connect(gain1).connect(master)
        osc1.start(now)
        osc1.stop(now + 6)

        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04))
        }
        const noise = ctx.createBufferSource()
        const noiseGain = ctx.createGain()
        noise.buffer = buf
        noiseGain.gain.value = 0.15
        noise.connect(noiseGain).connect(master)
        noise.start(now + 1.85)
      },
    },
    {
      id: 'entanglement',
      title: 'Entanglement',
      subtitle: 'Two qubits, one fate',
      description:
        'A Bell state (H then CNOT) creates maximal entanglement: measuring one qubit instantly determines the other, regardless of distance. If qubit A is |0⟩, qubit B is |0⟩. If A is |1⟩, B is |1⟩. The outcomes are individually random but perfectly correlated.',
      whatYouHear:
        'First: eight notes in your left and right ears playing the SAME random sequence — high or low, always matching. This is entanglement: perfect correlation. Then a crack, and the entanglement breaks. Now each ear plays its OWN random sequence — sometimes matching, sometimes not. The chaos of independence.',
      physics: 'Bell state: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2. Correlated: P(same) = 100%. Separable: P(same) = 50%.',
      durationMs: 8000,
      color: '#c084fc',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const lo = 330, hi = 660
        const seq: boolean[] = []
        for (let i = 0; i < 8; i++) seq.push(Math.random() > 0.5)

        for (let i = 0; i < 8; i++) {
          const t = now + i * 0.45
          const freq = seq[i] ? hi : lo
          for (const panVal of [-0.9, 0.9]) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const pan = ctx.createStereoPanner()
            osc.type = 'triangle'
            osc.frequency.value = freq
            pan.pan.value = panVal
            gain.gain.setValueAtTime(0, t)
            gain.gain.linearRampToValueAtTime(0.2, t + 0.03)
            gain.gain.linearRampToValueAtTime(0, t + 0.35)
            osc.connect(gain).connect(pan).connect(master)
            osc.start(t)
            osc.stop(t + 0.4)
          }
        }

        const breakBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
        const bd = breakBuf.getChannelData(0)
        for (let i = 0; i < bd.length; i++) bd[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (ctx.sampleRate * 0.02))
        const breakSrc = ctx.createBufferSource()
        const breakGain = ctx.createGain()
        breakSrc.buffer = breakBuf
        breakGain.gain.value = 0.3
        breakSrc.connect(breakGain).connect(master)
        breakSrc.start(now + 4.0)

        for (let i = 0; i < 7; i++) {
          const t = now + 4.5 + i * 0.42
          for (const panVal of [-0.9, 0.9]) {
            const freq = Math.random() > 0.5 ? hi : lo
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const pan = ctx.createStereoPanner()
            osc.type = 'triangle'
            osc.frequency.value = freq
            pan.pan.value = panVal
            gain.gain.setValueAtTime(0, t)
            gain.gain.linearRampToValueAtTime(0.2, t + 0.03)
            gain.gain.linearRampToValueAtTime(0, t + 0.33)
            osc.connect(gain).connect(pan).connect(master)
            osc.start(t)
            osc.stop(t + 0.38)
          }
        }
      },
    },
    {
      id: 'molecule',
      title: 'The Molecule',
      subtitle: 'H₂ as a chord progression',
      description:
        'The hydrogen molecule\'s electronic structure is described by a Hamiltonian with four coefficients (g0, g1, g2, g4) that change as the bond stretches. At equilibrium (0.735 Å), the bond is strongest and the energy is lowest. As the atoms pull apart, the interaction terms shrink and the molecule dissociates into independent atoms.',
      whatYouHear:
        'Six chords, one per bond distance (0.50 to 2.50 Å). Each chord has three voices: a root (from g0), and two qubit voices offset by g1 and g2, panned left and right. Vibrato depth comes from the exchange term g4. At short distances, the voices are spread wide with strong vibrato. At equilibrium, they resolve. At dissociation, they collapse to near-unison — the bond is gone.',
      physics: 'H = g0·I + g1·Z0 + g2·Z1 + g4·(X0X1 + Y0Y1). Equilibrium R=0.735Å, E_FCI = -1.137 Ha.',
      durationMs: 10000,
      color: '#ff6b9d',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const distances = ['0.50', '0.735', '1.00', '1.50', '2.00', '2.50']
        const stepDur = 1.5

        distances.forEach((R, i) => {
          const t = now + i * stepDur
          const c = H2_COEFFICIENTS[R]
          if (!c) return

          const rootHz = 350 + c.g0 * 200
          const voice1Hz = rootHz + c.g1 * 200
          const voice2Hz = rootHz + c.g2 * 200
          const modDepth = c.g4 * 300

          const oscR = ctx.createOscillator()
          const gainR = ctx.createGain()
          oscR.type = 'sine'
          oscR.frequency.value = rootHz
          gainR.gain.setValueAtTime(0, t)
          gainR.gain.linearRampToValueAtTime(0.12, t + 0.05)
          gainR.gain.setValueAtTime(0.12, t + stepDur - 0.3)
          gainR.gain.linearRampToValueAtTime(0, t + stepDur - 0.05)
          oscR.connect(gainR).connect(master)
          oscR.start(t)
          oscR.stop(t + stepDur)

          const osc1 = ctx.createOscillator()
          const gain1 = ctx.createGain()
          const pan1 = ctx.createStereoPanner()
          osc1.type = 'triangle'
          osc1.frequency.value = voice1Hz
          pan1.pan.value = -0.6
          gain1.gain.setValueAtTime(0, t)
          gain1.gain.linearRampToValueAtTime(0.15, t + 0.05)
          gain1.gain.setValueAtTime(0.15, t + stepDur - 0.3)
          gain1.gain.linearRampToValueAtTime(0, t + stepDur - 0.05)
          osc1.connect(gain1).connect(pan1).connect(master)
          osc1.start(t)
          osc1.stop(t + stepDur)

          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          const pan2 = ctx.createStereoPanner()
          osc2.type = 'triangle'
          osc2.frequency.value = voice2Hz
          pan2.pan.value = 0.6
          gain2.gain.setValueAtTime(0, t)
          gain2.gain.linearRampToValueAtTime(0.15, t + 0.05)
          gain2.gain.setValueAtTime(0.15, t + stepDur - 0.3)
          gain2.gain.linearRampToValueAtTime(0, t + stepDur - 0.05)
          osc2.connect(gain2).connect(pan2).connect(master)
          osc2.start(t)
          osc2.stop(t + stepDur)

          if (modDepth > 5) {
            const modOsc = ctx.createOscillator()
            const modGain = ctx.createGain()
            modOsc.type = 'sine'
            modOsc.frequency.value = modDepth / 10
            modGain.gain.value = modDepth * 0.3
            modOsc.connect(modGain).connect(osc1.frequency)
            modOsc.connect(modGain).connect(osc2.frequency)
            modOsc.start(t)
            modOsc.stop(t + stepDur)
          }
        })
      },
    },
    {
      id: 'decoherence',
      title: 'Decoherence',
      subtitle: 'The quantum state dissolves',
      description:
        'Every quantum state is temporary. The environment — thermal photons, magnetic fluctuations, cosmic rays — constantly probes the qubit. Phase information leaks out. The pure quantum state becomes a classical mixture. This process is called decoherence, and it\'s the fundamental enemy of quantum computation.',
      whatYouHear:
        'A clean Bell chord (E4 + B4, a perfect fifth) slowly decays. The upper note drifts sharp — this is dephasing (T2*), the relative phase between qubits randomizing. Beating emerges as the frequencies diverge. Meanwhile, a noise floor grows: the environment bleeding in. By the end, the quantum state is gone.',
      physics: 'T2* dephasing: Δφ(t) accumulates randomly. Detuning: 495 Hz → 520 Hz over 5s. Noise floor ∝ t/T.',
      durationMs: 7000,
      color: '#ef4444',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const dur = 6.5
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        const gain2 = ctx.createGain()
        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.value = 330
        osc2.frequency.value = 495
        const pan1 = ctx.createStereoPanner()
        const pan2 = ctx.createStereoPanner()
        pan1.pan.value = -0.5
        pan2.pan.value = 0.5
        gain1.gain.setValueAtTime(0, now)
        gain1.gain.linearRampToValueAtTime(0.25, now + 0.1)
        gain2.gain.setValueAtTime(0, now)
        gain2.gain.linearRampToValueAtTime(0.25, now + 0.1)
        osc2.frequency.setValueAtTime(495, now)
        osc2.frequency.linearRampToValueAtTime(495, now + 1.5)
        osc2.frequency.linearRampToValueAtTime(503, now + 3.5)
        osc2.frequency.linearRampToValueAtTime(520, now + 5.5)
        gain1.gain.setValueAtTime(0.25, now + 3)
        gain1.gain.linearRampToValueAtTime(0.05, now + dur)
        gain2.gain.setValueAtTime(0.25, now + 3)
        gain2.gain.linearRampToValueAtTime(0.05, now + dur)
        osc1.connect(gain1).connect(pan1).connect(master)
        osc2.connect(gain2).connect(pan2).connect(master)
        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + dur + 0.1)
        osc2.stop(now + dur + 0.1)

        const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
        const nd = noiseBuf.getChannelData(0)
        for (let i = 0; i < nd.length; i++) {
          const t = i / ctx.sampleRate
          nd[i] = (Math.random() * 2 - 1) * Math.min(1, t / 4) * 0.15
        }
        const noiseSrc = ctx.createBufferSource()
        noiseSrc.buffer = noiseBuf
        const noiseFilt = ctx.createBiquadFilter()
        noiseFilt.type = 'bandpass'
        noiseFilt.frequency.value = 400
        noiseFilt.Q.value = 2
        noiseSrc.connect(noiseFilt).connect(master)
        noiseSrc.start(now)
      },
    },
    {
      id: 'mitigation',
      title: 'Error Mitigation',
      subtitle: 'Cleaning the signal',
      description:
        'Raw hardware measurements contain errors from readout noise, gate infidelity, and decoherence. Error mitigation techniques like TREX (Twirled Readout Error eXtinction) statistically cancel these errors. On IBM Torino, TREX reduced our H₂ VQE error from 26 kcal/mol to 0.22 kcal/mol — a 119x improvement.',
      whatYouHear:
        'First: the "raw" measurement — the target Bell chord (E4 + B4) buried under wrong harmonics and sawtooth distortion. Six voices where there should be two. Then a click, and the mitigated result: a clean two-note chord. Same notes, all the noise stripped away. From messy to musical.',
      physics: 'Raw: 26.20 kcal/mol error. TREX: 0.22 kcal/mol. Improvement: 119×. IBM Torino, 4096 shots.',
      durationMs: 7000,
      color: '#22c55e',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const rawNotes = [330, 495, 360, 385, 510, 440]
        rawNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = i < 2 ? 'sine' : 'sawtooth'
          osc.frequency.value = freq
          const amp = i < 2 ? 0.15 : 0.06
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(amp, now + 0.05)
          gain.gain.setValueAtTime(amp, now + 2.5)
          gain.gain.linearRampToValueAtTime(0, now + 3.0)
          osc.connect(gain).connect(master)
          osc.start(now)
          osc.stop(now + 3.1)
        })

        const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
        const cd = clickBuf.getChannelData(0)
        for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (ctx.sampleRate * 0.01))
        const click = ctx.createBufferSource()
        click.buffer = clickBuf
        const clickGain = ctx.createGain()
        clickGain.gain.value = 0.3
        click.connect(clickGain).connect(master)
        click.start(now + 3.2)

        const cleanNotes = [330, 495]
        cleanNotes.forEach((freq) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0, now + 3.5)
          gain.gain.linearRampToValueAtTime(0.25, now + 3.6)
          gain.gain.setValueAtTime(0.25, now + 6.0)
          gain.gain.linearRampToValueAtTime(0, now + 6.8)
          osc.connect(gain).connect(master)
          osc.start(now + 3.5)
          osc.stop(now + 7)
        })
      },
    },
    {
      id: 'chemical-accuracy',
      title: 'Chemical Accuracy',
      subtitle: 'The slow pulse of success',
      description:
        'Chemical accuracy is the gold standard in quantum chemistry: an energy error below 1.6 kcal/mol (about 0.0016 Ha). At this precision, you can reliably predict which chemical reactions will happen. Our best result — 0.22 kcal/mol on IBM Torino with TREX — is well within this threshold. The error is so small it\'s hard to even measure.',
      whatYouHear:
        'Two tones tuned almost the same: the ideal energy and the measured energy. Their frequency difference creates a "beat" — a pulsing in the volume. Fast beating = large error (26 kcal/mol raw, mapped to 16 Hz). Slow, barely perceptible pulsing = chemical accuracy (0.22 kcal/mol, mapped to 0.14 Hz). The transition from buzz to stillness is the sound of success.',
      physics: 'Beat frequency f_beat = |f1 - f2|. Raw: 26 kcal/mol → 16 Hz beat. TREX: 0.22 kcal/mol → 0.14 Hz beat.',
      durationMs: 8000,
      color: '#f59e0b',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseFreq = 440

        const osc1a = ctx.createOscillator()
        const osc1b = ctx.createOscillator()
        const gain1a = ctx.createGain()
        const gain1b = ctx.createGain()
        osc1a.type = 'sine'
        osc1b.type = 'sine'
        osc1a.frequency.value = baseFreq
        osc1b.frequency.value = baseFreq + 16
        const pan1a = ctx.createStereoPanner()
        const pan1b = ctx.createStereoPanner()
        pan1a.pan.value = -0.4
        pan1b.pan.value = 0.4
        for (const g of [gain1a, gain1b]) {
          g.gain.setValueAtTime(0, now)
          g.gain.linearRampToValueAtTime(0.25, now + 0.08)
          g.gain.setValueAtTime(0.25, now + 3.0)
          g.gain.linearRampToValueAtTime(0, now + 3.5)
        }
        osc1a.connect(gain1a).connect(pan1a).connect(master)
        osc1b.connect(gain1b).connect(pan1b).connect(master)
        osc1a.start(now)
        osc1b.start(now)
        osc1a.stop(now + 3.6)
        osc1b.stop(now + 3.6)

        const osc2a = ctx.createOscillator()
        const osc2b = ctx.createOscillator()
        const gain2a = ctx.createGain()
        const gain2b = ctx.createGain()
        osc2a.type = 'sine'
        osc2b.type = 'sine'
        osc2a.frequency.value = baseFreq
        osc2b.frequency.value = baseFreq + 0.14
        const pan2a = ctx.createStereoPanner()
        const pan2b = ctx.createStereoPanner()
        pan2a.pan.value = -0.4
        pan2b.pan.value = 0.4
        for (const g of [gain2a, gain2b]) {
          g.gain.setValueAtTime(0, now + 4)
          g.gain.linearRampToValueAtTime(0.28, now + 4.1)
          g.gain.setValueAtTime(0.28, now + 7.0)
          g.gain.linearRampToValueAtTime(0, now + 7.8)
        }
        osc2a.connect(gain2a).connect(pan2a).connect(master)
        osc2b.connect(gain2b).connect(pan2b).connect(master)
        osc2a.start(now + 4)
        osc2b.start(now + 4)
        osc2a.stop(now + 8)
        osc2b.stop(now + 8)
      },
    },
  ]
}

// ============================================================
// ENHANCED VISUALS — one per act, large format
// ============================================================

function VisualOneQubit({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 600 360" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="360" fill="#060610" rx="12" />

      {/* The transmon qubit - cross shape */}
      <g transform="translate(300, 150)" className={`transition-all duration-1000 ${playing ? 'opacity-100' : 'opacity-70'}`}>
        {/* Glow */}
        <circle cx="0" cy="0" r="80" fill={playing ? '#00d4ff08' : 'none'} className="transition-all duration-500">
          {playing && <animate attributeName="r" values="60;80;60" dur="3s" repeatCount="indefinite" />}
        </circle>

        {/* Cross */}
        <rect x="-20" y="-65" width="40" height="130" rx="3" fill="#0d1117" />
        <rect x="-65" y="-20" width="130" height="40" rx="3" fill="#0d1117" />
        <rect x="-14" y="-55" width="28" height="40" rx="2" fill="#6366f1" opacity="0.8" />
        <rect x="-14" y="15" width="28" height="40" rx="2" fill="#6366f1" opacity="0.8" />
        <rect x="-55" y="-14" width="40" height="28" rx="2" fill="#6366f1" opacity="0.8" />
        <rect x="15" y="-14" width="40" height="28" rx="2" fill="#6366f1" opacity="0.8" />
        <rect x="-14" y="-14" width="28" height="28" rx="2" fill="#6366f1" opacity="0.9" />
        <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#f472b6" />

        {/* Frequency label */}
        <text x="0" y="90" fill="#00d4ff" fontSize="12" fontFamily="monospace" textAnchor="middle" opacity="0.8">
          5.55 GHz
        </text>
      </g>

      {/* Decaying sine wave emanating from qubit */}
      <path
        d={Array.from({ length: 80 }, (_, i) => {
          const x = 80 + i * 5.5
          const decay = Math.exp(-i / 30)
          const y = 290 + Math.sin(i * 0.5) * 30 * decay
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none"
        stroke={playing ? '#00d4ff' : '#1e293b'}
        strokeWidth="2.5"
        className="transition-colors duration-500"
      />

      {/* Decay envelope (dashed) */}
      <path
        d={Array.from({ length: 80 }, (_, i) => {
          const x = 80 + i * 5.5
          const decay = Math.exp(-i / 30)
          const y = 290 - 30 * decay
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none"
        stroke={playing ? '#00d4ff40' : '#1e293b40'}
        strokeWidth="1"
        strokeDasharray="4,4"
      />

      {/* T2 label on decay curve */}
      <text x="480" y="280" fill="#475569" fontSize="11" fontFamily="monospace">T2 decay</text>
      <text x="480" y="296" fill="#374151" fontSize="9" fontFamily="monospace">~10-20 &mu;s</text>

      {/* Time axis */}
      <line x1="80" y1="325" x2="520" y2="325" stroke="#1e293b" strokeWidth="1" />
      <text x="300" y="345" fill="#374151" fontSize="9" fontFamily="monospace" textAnchor="middle">time</text>
    </svg>
  )
}

function VisualNineQubits({ playing }: { playing: boolean }) {
  const positions = [
    [150, 80], [300, 80], [450, 80],
    [150, 180], [300, 180], [450, 180],
    [150, 280], [300, 280], [450, 280],
  ]
  const connections = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,8],[6,7],[7,8]]

  return (
    <svg viewBox="0 0 600 380" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="380" fill="#060610" rx="12" />

      {/* Chip border */}
      <rect x="60" y="20" width="480" height="320" rx="6" fill="#0a0f1a" stroke="#1a2332" strokeWidth="1.5" />

      {/* Grid lines */}
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i}>
          <line x1={60 + i * 160} y1="20" x2={60 + i * 160} y2="340" stroke="#111827" strokeWidth="0.3" />
          <line x1="60" y1={20 + i * 107} x2="540" y2={20 + i * 107} stroke="#111827" strokeWidth="0.3" />
        </g>
      ))}

      {/* Connections */}
      {connections.map(([a, b], i) => (
        <line key={i}
          x1={positions[a][0]} y1={positions[a][1]}
          x2={positions[b][0]} y2={positions[b][1]}
          stroke={playing ? '#ff8c4225' : '#0d1117'}
          strokeWidth="2"
          className="transition-colors duration-500"
        />
      ))}

      {/* Qubits */}
      {positions.map(([x, y], i) => {
        const freq = TUNA9_FREQS[i]
        const hue = ((freq - 4.5) / 2.5) * 30 // warm color range
        return (
          <g key={i}>
            {/* Glow ring */}
            {playing && (
              <circle cx={x} cy={y} r="28" fill="none" stroke="#ff8c42" strokeWidth="0.5" opacity="0.3">
                <animate attributeName="r" values="22;28;22" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            )}

            {/* Mini cross */}
            <rect x={x - 8} y={y - 22} width="16" height="44" rx="2" fill="#0d1117" />
            <rect x={x - 22} y={y - 8} width="44" height="16" rx="2" fill="#0d1117" />
            <rect x={x - 6} y={y - 18} width="12" height="14" rx="1" fill={playing ? '#ff8c42' : '#6366f1'} opacity={playing ? 0.6 + (i * 0.04) : 0.4} className="transition-all duration-500" />
            <rect x={x - 6} y={y + 4} width="12" height="14" rx="1" fill={playing ? '#ff8c42' : '#6366f1'} opacity={playing ? 0.6 + (i * 0.04) : 0.4} className="transition-all duration-500" />
            <rect x={x - 18} y={y - 6} width="14" height="12" rx="1" fill={playing ? '#ff8c42' : '#6366f1'} opacity={playing ? 0.6 + (i * 0.04) : 0.4} className="transition-all duration-500" />
            <rect x={x + 4} y={y - 6} width="14" height="12" rx="1" fill={playing ? '#ff8c42' : '#6366f1'} opacity={playing ? 0.6 + (i * 0.04) : 0.4} className="transition-all duration-500" />

            {/* Label */}
            <text x={x} y={y + 42} textAnchor="middle" fill={playing ? '#ff8c42' : '#475569'} fontSize="9" fontFamily="monospace" className="transition-colors duration-500">
              {TUNA9_LABELS[i]}
            </text>
            <text x={x} y={y + 54} textAnchor="middle" fill={playing ? '#ff8c4280' : '#374151'} fontSize="7" fontFamily="monospace" className="transition-colors duration-500">
              {freq} GHz
            </text>
          </g>
        )
      })}

      {/* Stereo label */}
      <text x="70" y="365" fill="#475569" fontSize="8" fontFamily="monospace">L ear</text>
      <text x="515" y="365" fill="#475569" fontSize="8" fontFamily="monospace">R ear</text>
      <line x1="100" y1="362" x2="510" y2="362" stroke="#1e293b" strokeWidth="0.5" />
      <polygon points="508,360 514,362 508,364" fill="#1e293b" />
    </svg>
  )
}

function VisualGate({ playing }: { playing: boolean }) {
  const col = playing ? '#8b5cf6' : '#334155'
  return (
    <svg viewBox="0 0 600 320" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="320" fill="#060610" rx="12" />

      {/* Energy levels */}
      <g transform="translate(300, 60)">
        <text x="0" y="0" fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">Energy levels</text>

        {/* |0⟩ level */}
        <line x1="-80" y1="100" x2="80" y2="100" stroke="#00d4ff" strokeWidth="2" />
        <text x="95" y="104" fill="#00d4ff" fontSize="12" fontFamily="monospace">|0&#x27E9;</text>
        <text x="-95" y="104" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">low</text>

        {/* |1⟩ level */}
        <line x1="-80" y1="40" x2="80" y2="40" stroke="#00d4ff" strokeWidth="2" />
        <text x="95" y="44" fill="#00d4ff" fontSize="12" fontFamily="monospace">|1&#x27E9;</text>
        <text x="-95" y="44" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">high</text>

        {/* Transition arrow */}
        <line x1="0" y1="95" x2="0" y2="48" stroke={col} strokeWidth="2.5" className="transition-colors duration-500" />
        <polygon points="-5,50 0,42 5,50" fill={col} className="transition-colors duration-500" />
        <text x="14" y="75" fill={col} fontSize="10" fontFamily="monospace" className="transition-colors duration-500">
          &#x03C0; pulse
        </text>
      </g>

      {/* Gate pulse shape */}
      <g transform="translate(0, 200)">
        <text x="60" y="0" fill="#475569" fontSize="10" fontFamily="monospace">Microwave pulse envelope</text>

        {/* Pulse envelope - Gaussian */}
        <path
          d={(() => {
            const pts: string[] = []
            for (let i = 0; i <= 60; i++) {
              const x = 60 + i * 8
              const t = (i / 60) * 2 - 1
              const env = Math.exp(-t * t * 4) * 70
              pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${90 - env}`)
            }
            return pts.join(' ')
          })()}
          fill="none" stroke={col} strokeWidth="2.5" className="transition-colors duration-500"
        />

        {/* Carrier wave inside envelope */}
        <path
          d={(() => {
            const pts: string[] = []
            for (let i = 0; i <= 60; i++) {
              const x = 60 + i * 8
              const t = (i / 60) * 2 - 1
              const env = Math.exp(-t * t * 4) * 70
              const carrier = Math.sin(i * 1.5) * env * 0.6
              pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${90 - carrier}`)
            }
            return pts.join(' ')
          })()}
          fill="none" stroke={playing ? '#8b5cf640' : '#1e293b'} strokeWidth="1" className="transition-colors duration-500"
        />

        {/* Time axis */}
        <line x1="60" y1="92" x2="540" y2="92" stroke="#1e293b" strokeWidth="1" />
        <text x="300" y="110" fill="#374151" fontSize="9" fontFamily="monospace" textAnchor="middle">~20 nanoseconds</text>
      </g>
    </svg>
  )
}

function VisualSuperposition({ playing }: { playing: boolean }) {
  const col = playing ? '#00ff88' : '#334155'
  return (
    <svg viewBox="0 0 600 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="300" fill="#060610" rx="12" />

      {/* Circuit diagram */}
      <g transform="translate(40, 50)">
        {/* Input wire */}
        <line x1="0" y1="60" x2="140" y2="60" stroke="#475569" strokeWidth="1.5" />
        <text x="10" y="50" fill="#00d4ff" fontSize="14" fontFamily="monospace">|0&#x27E9;</text>

        {/* H gate box */}
        <rect x="140" y="38" width="44" height="44" rx="6" fill="none" stroke={col} strokeWidth="2.5" className="transition-colors duration-500" />
        <text x="162" y="66" textAnchor="middle" fill={col} fontSize="20" fontWeight="bold" fontFamily="monospace" className="transition-colors duration-500">H</text>

        {/* Split into two paths */}
        <path d="M 184 60 C 230 60, 230 30, 280 30" fill="none" stroke={col} strokeWidth="1.5" className="transition-colors duration-500" />
        <path d="M 184 60 C 230 60, 230 90, 280 90" fill="none" stroke={col} strokeWidth="1.5" className="transition-colors duration-500" />

        {/* Two output states */}
        <line x1="280" y1="30" x2="420" y2="30" stroke={col} strokeWidth="1.5" className="transition-colors duration-500" />
        <line x1="280" y1="90" x2="420" y2="90" stroke={col} strokeWidth="1.5" className="transition-colors duration-500" />
        <text x="430" y="35" fill={col} fontSize="14" fontFamily="monospace" className="transition-colors duration-500">|0&#x27E9;</text>
        <text x="430" y="95" fill={col} fontSize="14" fontFamily="monospace" className="transition-colors duration-500">|1&#x27E9;</text>

        {/* Probability labels */}
        <text x="490" y="35" fill="#475569" fontSize="10" fontFamily="monospace">50%</text>
        <text x="490" y="95" fill="#475569" fontSize="10" fontFamily="monospace">50%</text>

        {/* Equal amplitude bars */}
        <rect x="350" y="14" width="60" height="8" rx="2" fill={col} opacity="0.4" className="transition-colors duration-500" />
        <rect x="350" y="96" width="60" height="8" rx="2" fill={col} opacity="0.4" className="transition-colors duration-500" />
      </g>

      {/* Sound visualization: one tone splitting into two */}
      <g transform="translate(40, 170)">
        <text x="0" y="0" fill="#475569" fontSize="9" fontFamily="monospace">SOUND</text>

        {/* Single tone */}
        <path
          d={Array.from({ length: 20 }, (_, i) => {
            const x = 20 + i * 6
            const y = 50 + Math.sin(i * 0.8) * 18
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={playing ? '#00ff88' : '#1e293b'} strokeWidth="2" className="transition-colors duration-500"
        />

        {/* Shimmer zone */}
        <rect x="148" y="30" width="20" height="40" rx="4" fill={playing ? '#00ff8815' : '#0d1117'} stroke={playing ? '#00ff8830' : '#1e293b'} strokeWidth="1" className="transition-colors duration-500" />
        <text x="158" y="80" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">gate</text>

        {/* Two tones */}
        <path
          d={Array.from({ length: 40 }, (_, i) => {
            const x = 180 + i * 8
            const y = 35 + Math.sin(i * 0.8) * 14
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={playing ? '#00ff88' : '#1e293b'} strokeWidth="1.5" className="transition-colors duration-500"
        />
        <path
          d={Array.from({ length: 40 }, (_, i) => {
            const x = 180 + i * 8
            const y = 65 + Math.sin(i * 1.2) * 14
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={playing ? '#00ff8880' : '#1e293b'} strokeWidth="1.5" className="transition-colors duration-500"
        />

        <text x="200" y="100" fill="#475569" fontSize="8" fontFamily="monospace">fundamental</text>
        <text x="360" y="100" fill="#475569" fontSize="8" fontFamily="monospace">+ perfect fifth</text>
      </g>
    </svg>
  )
}

function VisualEntanglement({ playing }: { playing: boolean }) {
  const col = playing ? '#c084fc' : '#334155'
  return (
    <svg viewBox="0 0 600 340" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="340" fill="#060610" rx="12" />

      {/* Two qubits */}
      <g transform="translate(160, 100)">
        <circle cx="0" cy="0" r="45" fill={playing ? '#c084fc10' : '#0d1117'} stroke={col} strokeWidth="2.5" className="transition-all duration-500" />
        <text x="0" y="5" textAnchor="middle" fill={col} fontSize="16" fontFamily="monospace" className="transition-colors duration-500">qA</text>
        <text x="0" y="-60" fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">left ear</text>
      </g>
      <g transform="translate(440, 100)">
        <circle cx="0" cy="0" r="45" fill={playing ? '#c084fc10' : '#0d1117'} stroke={col} strokeWidth="2.5" className="transition-all duration-500" />
        <text x="0" y="5" textAnchor="middle" fill={col} fontSize="16" fontFamily="monospace" className="transition-colors duration-500">qB</text>
        <text x="0" y="-60" fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">right ear</text>
      </g>

      {/* Entanglement link */}
      <path
        d={`M 210 100 ${Array.from({ length: 12 }, (_, i) => {
          const x = 220 + i * 17
          const y = 100 + (i % 2 === 0 ? -10 : 10)
          return `L ${x} ${y}`
        }).join(' ')} L 390 100`}
        fill="none" stroke={col} strokeWidth="2" className="transition-colors duration-500"
      />
      <text x="300" y="78" textAnchor="middle" fill={col} fontSize="10" fontFamily="monospace" opacity="0.7" className="transition-colors duration-500">
        {playing ? 'entangled' : 'coupling'}
      </text>

      {/* Correlation demo */}
      <g transform="translate(40, 200)">
        <text x="0" y="0" fill={col} fontSize="10" fontFamily="monospace" className="transition-colors duration-500">Correlated:</text>
        {/* 8 matching pairs */}
        {Array.from({ length: 8 }, (_, i) => {
          const high = [true, false, true, true, false, true, false, false][i]
          return (
            <g key={i} transform={`translate(${100 + i * 30}, 0)`}>
              <rect x="-8" y={high ? -20 : -8} width="6" height={high ? 18 : 8} rx="1" fill={col} opacity="0.7" className="transition-colors duration-500" />
              <rect x="2" y={high ? -20 : -8} width="6" height={high ? 18 : 8} rx="1" fill={col} opacity="0.7" className="transition-colors duration-500" />
              <text x="-2" y="14" fill="#374151" fontSize="6" fontFamily="monospace" textAnchor="middle">
                {high ? 'HH' : 'LL'}
              </text>
            </g>
          )
        })}
        <text x="380" y="-5" fill="#22c55e" fontSize="9" fontFamily="monospace">always match</text>
      </g>

      <g transform="translate(40, 280)">
        <text x="0" y="0" fill="#ef4444" fontSize="10" fontFamily="monospace">Broken:</text>
        {Array.from({ length: 7 }, (_, i) => {
          const l = [true, false, true, false, true, false, true][i]
          const r = [true, true, false, false, true, false, false][i]
          return (
            <g key={i} transform={`translate(${100 + i * 30}, 0)`}>
              <rect x="-8" y={l ? -20 : -8} width="6" height={l ? 18 : 8} rx="1" fill="#ef4444" opacity="0.5" />
              <rect x="2" y={r ? -20 : -8} width="6" height={r ? 18 : 8} rx="1" fill="#ef4444" opacity="0.5" />
              <text x="-2" y="14" fill="#374151" fontSize="6" fontFamily="monospace" textAnchor="middle">
                {l === r ? (l ? 'HH' : 'LL') : (l ? 'HL' : 'LH')}
              </text>
            </g>
          )
        })}
        <text x="380" y="-5" fill="#ef4444" fontSize="9" fontFamily="monospace">random</text>
      </g>
    </svg>
  )
}

function VisualMolecule({ playing }: { playing: boolean }) {
  const col = playing ? '#ff6b9d' : '#334155'
  const distances = [0.5, 0.735, 1.0, 1.5, 2.0, 2.5]
  const energies = [-0.8428, -1.1373, -1.1011, -0.9829, -0.9486, -0.9388]
  const minE = -1.2, maxE = -0.7

  return (
    <svg viewBox="0 0 600 340" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="340" fill="#060610" rx="12" />

      {/* PES curve - large */}
      <g transform="translate(40, 30)">
        <text x="0" y="12" fill={col} fontSize="11" fontFamily="monospace" className="transition-colors duration-500">
          H&#x2082; Potential Energy Surface
        </text>

        {/* Y axis */}
        <line x1="60" y1="30" x2="60" y2="230" stroke="#1e293b" strokeWidth="1" />
        <text x="20" y="130" fill="#475569" fontSize="8" fontFamily="monospace" transform="rotate(-90, 20, 130)" textAnchor="middle">
          Energy (Hartree)
        </text>

        {/* X axis */}
        <line x1="60" y1="230" x2="500" y2="230" stroke="#1e293b" strokeWidth="1" />
        <text x="280" y="258" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
          Bond distance (&#x00C5;)
        </text>

        {/* PES curve */}
        <path
          d={distances.map((r, i) => {
            const x = 60 + ((r - 0.3) / 2.5) * 420
            const y = 225 - ((energies[i] - minE) / (maxE - minE)) * 190
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={col} strokeWidth="3" className="transition-colors duration-500"
        />

        {/* Data points with labels */}
        {distances.map((r, i) => {
          const x = 60 + ((r - 0.3) / 2.5) * 420
          const y = 225 - ((energies[i] - minE) / (maxE - minE)) * 190
          const isEq = r === 0.735
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={isEq ? 6 : 4} fill={col}
                opacity={playing ? 1 : 0.5} className="transition-all duration-500" />
              <text x={x} y={240} fill={isEq ? col : '#475569'} fontSize="8" fontFamily="monospace"
                textAnchor="middle" fontWeight={isEq ? 'bold' : 'normal'} className="transition-colors duration-500">
                {r}
              </text>
              {isEq && (
                <>
                  <line x1={x} y1={y + 8} x2={x} y2={225} stroke={col} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" className="transition-colors duration-500" />
                  <text x={x + 5} y={y - 12} fill={col} fontSize="9" fontFamily="monospace" className="transition-colors duration-500">
                    equilibrium
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* H-H balls at different distances */}
        {[0, 2, 5].map((idx, j) => {
          const r = distances[idx]
          const sep = 8 + r * 16
          const bx = 60 + j * 170
          const by = 290
          return (
            <g key={j}>
              <circle cx={bx - sep / 2} cy={by} r="7" fill={col} opacity={playing ? 0.6 : 0.3} className="transition-all duration-500" />
              <circle cx={bx + sep / 2} cy={by} r="7" fill={col} opacity={playing ? 0.6 : 0.3} className="transition-all duration-500" />
              <line x1={bx - sep / 2 + 7} y1={by} x2={bx + sep / 2 - 7} y2={by} stroke={col} strokeWidth="2" opacity={playing ? 0.4 : 0.2} className="transition-all duration-500" />
              <text x={bx} y={by + 18} fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">
                {r} &#x00C5;
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function VisualDecoherence({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 600 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="300" fill="#060610" rx="12" />

      <g transform="translate(40, 30)">
        <text x="0" y="12" fill={playing ? '#ef4444' : '#475569'} fontSize="11" fontFamily="monospace" className="transition-colors duration-500">
          Phase coherence over time
        </text>

        {/* Clean wave becoming noisy */}
        <path
          d={Array.from({ length: 100 }, (_, i) => {
            const x = 20 + i * 5
            const noiseAmt = Math.max(0, i - 40) / 60
            const noise = noiseAmt > 0 ? (Math.sin(i * 7.3) + Math.sin(i * 13.7)) * noiseAmt * 15 : 0
            const decay = i > 50 ? Math.max(0.2, 1 - (i - 50) / 60) : 1
            const y = 100 + Math.sin(i * 0.35) * 40 * decay + noise
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none"
          stroke={playing ? '#00d4ff' : '#1e293b'}
          strokeWidth="2.5"
          className="transition-colors duration-500"
        />

        {/* Rising noise floor */}
        <path
          d={Array.from({ length: 100 }, (_, i) => {
            const x = 20 + i * 5
            const noise = Math.max(0, i - 30) / 70
            const y = 100 + (Math.random() - 0.5) * noise * 60
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none"
          stroke={playing ? '#ef444450' : '#1e293b30'}
          strokeWidth="1"
          className="transition-colors duration-500"
        />

        {/* Phase labels */}
        <text x="60" y="170" fill="#00d4ff" fontSize="10" fontFamily="monospace" opacity="0.6">
          definite phase
        </text>
        <text x="380" y="170" fill="#ef4444" fontSize="10" fontFamily="monospace" opacity="0.6">
          phase scrambled
        </text>

        {/* Arrow */}
        <line x1="60" y1="162" x2="480" y2="162" stroke="#334155" strokeWidth="1" />
        <polygon points="478,159 486,162 478,165" fill="#334155" />
      </g>

      {/* What's happening below */}
      <g transform="translate(40, 210)">
        <text x="0" y="0" fill="#475569" fontSize="9" fontFamily="monospace">THE ENVIRONMENT</text>

        {/* Environment sources */}
        {['thermal photons', 'magnetic noise', 'oxide defects', 'cosmic rays'].map((src, i) => (
          <g key={i} transform={`translate(${i * 130}, 20)`}>
            <circle cx="8" cy="8" r="4" fill="#ef4444" opacity={playing ? 0.5 : 0.2} className="transition-all duration-500">
              {playing && <animate attributeName="opacity" values="0.2;0.5;0.2" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />}
            </circle>
            <text x="18" y="12" fill="#475569" fontSize="8" fontFamily="monospace">{src}</text>
          </g>
        ))}

        <text x="0" y="55" fill="#374151" fontSize="8" fontFamily="monospace">
          Each randomly shifts the qubit&apos;s phase until it&apos;s meaningless.
        </text>
      </g>
    </svg>
  )
}

function VisualMitigation({ playing }: { playing: boolean }) {
  const noisyBars = [0.25, 0.20, 0.12, 0.08, 0.15, 0.10, 0.05, 0.05]
  const cleanBars = [0.48, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.52]
  const labels = ['00', '01', '10', '11', '00', '01', '10', '11']

  return (
    <svg viewBox="0 0 600 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="300" fill="#060610" rx="12" />

      {/* Raw histogram */}
      <g transform="translate(30, 30)">
        <text x="0" y="12" fill="#ef4444" fontSize="11" fontFamily="monospace" opacity="0.8">Raw measurement</text>
        <text x="0" y="26" fill="#374151" fontSize="8" fontFamily="monospace">26.20 kcal/mol error</text>

        {noisyBars.slice(0, 4).map((h, i) => (
          <g key={i}>
            <rect x={20 + i * 55} y={200 - h * 350} width="40" height={h * 350}
              fill={playing ? '#ef444470' : '#1e293b'} rx="3" className="transition-colors duration-500" />
            <text x={40 + i * 55} y={216} fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
              {labels[i]}
            </text>
            <text x={40 + i * 55} y={196 - h * 350} fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.6">
              {(h * 100).toFixed(0)}%
            </text>
          </g>
        ))}
      </g>

      {/* Arrow */}
      <g transform="translate(275, 130)">
        <line x1="0" y1="0" x2="30" y2="0" stroke={playing ? '#22c55e' : '#334155'} strokeWidth="2" className="transition-colors duration-500" />
        <polygon points="30,-4 38,0 30,4" fill={playing ? '#22c55e' : '#334155'} className="transition-colors duration-500" />
        <text x="19" y="-10" fill={playing ? '#22c55e' : '#475569'} fontSize="8" fontFamily="monospace" textAnchor="middle" className="transition-colors duration-500">
          TREX
        </text>
      </g>

      {/* Clean histogram */}
      <g transform="translate(320, 30)">
        <text x="0" y="12" fill="#22c55e" fontSize="11" fontFamily="monospace" opacity="0.8">Error-mitigated</text>
        <text x="0" y="26" fill="#374151" fontSize="8" fontFamily="monospace">0.22 kcal/mol error</text>

        {cleanBars.slice(0, 4).map((h, i) => (
          <g key={i}>
            <rect x={20 + i * 55} y={200 - h * 350} width="40" height={Math.max(0, h * 350)}
              fill={playing ? '#22c55e80' : '#1e293b'} rx="3" className="transition-colors duration-500" />
            <text x={40 + i * 55} y={216} fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
              {labels[i + 4]}
            </text>
            {h > 0 && (
              <text x={40 + i * 55} y={196 - h * 350} fill="#22c55e" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.6">
                {(h * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Result */}
      <g transform="translate(30, 250)">
        <text x="0" y="0" fill="#475569" fontSize="9" fontFamily="monospace">
          IBM Torino &middot; 4096 shots &middot; TREX readout error mitigation
        </text>
        <text x="0" y="18" fill={playing ? '#22c55e' : '#374151'} fontSize="10" fontFamily="monospace" fontWeight="bold" className="transition-colors duration-500">
          119x improvement
        </text>
        <text x="170" y="18" fill="#374151" fontSize="9" fontFamily="monospace">
          &mdash; from 6 noisy peaks to 2 clean ones
        </text>
      </g>
    </svg>
  )
}

function VisualChemicalAccuracy({ playing }: { playing: boolean }) {
  const col = playing ? '#f59e0b' : '#334155'
  return (
    <svg viewBox="0 0 600 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="300" fill="#060610" rx="12" />

      {/* Raw: fast beating */}
      <g transform="translate(30, 30)">
        <text x="0" y="12" fill="#ef4444" fontSize="11" fontFamily="monospace" opacity="0.8">Raw: 26 kcal/mol error</text>
        <text x="0" y="28" fill="#374151" fontSize="8" fontFamily="monospace">Beat frequency: 16 Hz &mdash; audible buzz</text>

        <path
          d={Array.from({ length: 60 }, (_, i) => {
            const x = 20 + i * 8.5
            const beat = Math.cos(i * 1.2)
            const y = 70 + Math.sin(i * 0.7) * 25 * beat
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={playing ? '#ef4444' : '#1e293b'} strokeWidth="2.5" className="transition-colors duration-500"
        />
      </g>

      {/* TREX: nearly flat */}
      <g transform="translate(30, 140)">
        <text x="0" y="12" fill={col} fontSize="11" fontFamily="monospace" className="transition-colors duration-500">TREX: 0.22 kcal/mol error</text>
        <text x="0" y="28" fill="#374151" fontSize="8" fontFamily="monospace">Beat frequency: 0.14 Hz &mdash; barely perceptible pulse</text>

        <path
          d={Array.from({ length: 60 }, (_, i) => {
            const x = 20 + i * 8.5
            const y = 70 + Math.sin(i * 0.7) * 28
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={col} strokeWidth="2.5" className="transition-colors duration-500"
        />
      </g>

      {/* Threshold line */}
      <g transform="translate(30, 260)">
        <line x1="0" y1="0" x2="540" y2="0" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" />
        <text x="270" y="18" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">
          Chemical accuracy threshold: 1.6 kcal/mol
        </text>
        <text x="270" y="34" textAnchor="middle" fill={col} fontSize="10" fontFamily="monospace" fontWeight="bold" className="transition-colors duration-500">
          Our result: 0.22 kcal/mol &mdash; 7x below threshold
        </text>
      </g>
    </svg>
  )
}

const ACT_VISUALS: Record<string, React.ComponentType<{ playing: boolean }>> = {
  'one-qubit': VisualOneQubit,
  'nine-qubits': VisualNineQubits,
  'gate': VisualGate,
  'superposition': VisualSuperposition,
  'entanglement': VisualEntanglement,
  'molecule': VisualMolecule,
  'decoherence': VisualDecoherence,
  'mitigation': VisualMitigation,
  'chemical-accuracy': VisualChemicalAccuracy,
}

// ============================================================
// ACT SECTION — scroll-driven
// ============================================================

function ActSection({
  act,
  index,
  isPlaying,
  progress,
  onPlay,
}: {
  act: Act
  index: number
  isPlaying: boolean
  progress: number
  onPlay: () => void
}) {
  const { ref, visible } = useInView(0.15)
  const Visual = ACT_VISUALS[act.id]

  return (
    <div ref={ref} className="min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 py-16">
      <div className={`max-w-3xl w-full transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>

        {/* Act number + title */}
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-xs font-mono shrink-0 w-6 h-6 rounded-full border flex items-center justify-center"
            style={{ borderColor: isPlaying ? act.color + '80' : '#1e293b', color: isPlaying ? act.color : '#475569' }}>
            {index + 1}
          </span>
          <div>
            <h2 className="text-2xl font-bold transition-colors duration-500"
              style={{ color: isPlaying ? act.color : '#e2e8f0' }}>
              {act.title}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{act.subtitle}</p>
          </div>
        </div>

        {/* Play button + progress */}
        <div className="flex items-center gap-4 my-6">
          <button
            onClick={onPlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: isPlaying ? act.color + '80' : act.color + '30',
              backgroundColor: isPlaying ? act.color + '15' : act.color + '08',
              color: act.color,
            }}
          >
            <span className="text-base">{isPlaying ? '\u25A0' : '\u25B6'}</span>
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          {isPlaying && (
            <div className="flex-1 h-1 bg-[#1e293b] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress * 100}%`, backgroundColor: act.color }} />
            </div>
          )}
          <span className="text-xs text-gray-700 font-mono shrink-0">
            {(act.durationMs / 1000).toFixed(0)}s
          </span>
        </div>

        {/* Visual */}
        <div className="mb-8">
          {Visual && <Visual playing={isPlaying} />}
        </div>

        {/* Description */}
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: act.color + 'cc' }}>
              What you hear
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {act.whatYouHear}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              The physics
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {act.description}
            </p>
            <p className="text-[11px] text-gray-600 font-mono mt-3 bg-[#0d1117] px-3 py-2 rounded-lg border border-[#1e293b]">
              {act.physics}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ListenPage() {
  const [playingAct, setPlayingAct] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const currentDurationRef = useRef(0)

  const acts = useMemo(() => makeActs(), [])

  const stopAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setPlayingAct(null)
    setProgress(0)
  }, [])

  const playAct = useCallback((act: Act) => {
    if (playingAct === act.id) {
      stopAll()
      return
    }
    stopAll()

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.5
    master.connect(ctx.destination)

    setPlayingAct(act.id)
    startTimeRef.current = Date.now()
    currentDurationRef.current = act.durationMs

    act.play(ctx, master)

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(1, elapsed / currentDurationRef.current))
    }, 50)

    timerRef.current = setTimeout(() => {
      setPlayingAct(null)
      setProgress(0)
      if (progressRef.current) clearInterval(progressRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }, act.durationMs + 200)
  }, [playingAct, muted, stopAll])

  const playAll = useCallback(() => {
    if (playingAct) { stopAll(); return }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.5
    master.connect(ctx.destination)

    const totalDuration = acts.reduce((sum, a) => sum + a.durationMs, 0) + (acts.length - 1) * 800
    setPlayingAct('all')
    startTimeRef.current = Date.now()
    currentDurationRef.current = totalDuration

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(1, elapsed / totalDuration))
    }, 50)

    let delay = 0
    acts.forEach((act) => {
      const actDelay = delay
      setTimeout(() => {
        if (!audioCtxRef.current) return
        setPlayingAct(act.id)
        act.play(ctx, master)
      }, actDelay)
      delay += act.durationMs + 800
    })

    timerRef.current = setTimeout(() => {
      stopAll()
    }, delay)
  }, [acts, playingAct, muted, stopAll])

  useEffect(() => () => stopAll(), [stopAll])

  return (
    <div className="min-h-screen bg-[#060610] text-white">
      <Nav />

      {/* Hero */}
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 pt-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Listen to Quantum Computing</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-3">
            Quantum computers operate in the microwave regime &mdash; the same frequencies as your Wi-Fi router,
            but at temperatures colder than outer space. These nine acts translate quantum phenomena into sound.
          </p>
          <p className="text-gray-600 text-sm mb-8">
            The frequencies are real, scaled from GHz to audible Hz. The Hamiltonian coefficients are from our
            calculations. The error numbers are from actual hardware runs on{' '}
            <span className="text-[#ff8c42]">Tuna-9</span> and{' '}
            <span className="text-[#00d4ff]">IBM Torino</span>.
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={playAll}
              className="flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor: playingAct ? '#00d4ff60' : '#00d4ff30',
                backgroundColor: playingAct ? '#00d4ff15' : '#00d4ff08',
                color: '#00d4ff',
              }}
            >
              <span className="text-lg">{playingAct ? '\u25A0' : '\u25B6'}</span>
              {playingAct ? 'Stop' : 'Play all 9 acts'}
            </button>
            <span className="text-xs text-gray-700 font-mono">
              {Math.round(acts.reduce((s, a) => s + a.durationMs, 0) / 1000)}s total
            </span>
          </div>

          {playingAct && (
            <div className="max-w-md mx-auto h-1 bg-[#1e293b] rounded-full overflow-hidden mb-6">
              <div className="h-full rounded-full transition-all duration-100 bg-[#00d4ff]"
                style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          <p className="text-gray-700 text-xs">
            Best with headphones. Scroll down to explore each act.
          </p>

          {/* Scroll indicator */}
          <div className="mt-12 animate-bounce">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto opacity-30">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Acts */}
      {acts.map((act, i) => (
        <div key={act.id}>
          {/* Divider */}
          <div className="max-w-3xl mx-auto px-6">
            <div className="border-t border-[#111827]" />
          </div>

          <ActSection
            act={act}
            index={i}
            isPlaying={playingAct === act.id}
            progress={playingAct === act.id ? progress : 0}
            onPlay={() => playAct(act)}
          />
        </div>
      ))}

      {/* How sonification works */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="border-t border-[#111827] mb-12" />

        <h2 className="text-lg font-bold text-gray-300 mb-6">How sonification works</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm text-gray-500 leading-relaxed">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Frequency mapping</h3>
            <p>Qubit frequencies (4.5&ndash;7.0 GHz) are linearly mapped to 220&ndash;880 Hz (A3 to A5). This preserves the relative spacing while making them audible.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amplitude</h3>
            <p>Measurement probabilities map to volume. Higher probability = louder tone. A perfect Bell state has two equal-volume notes; a noisy one has many quiet tones.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Beat frequencies</h3>
            <p>When two tones are close in frequency, you hear a pulsing effect at f_beat = |f1 - f2|. We use this to sonify energy error: large error = fast beating, chemical accuracy = near stillness.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Implementation</h3>
            <p>Pure Web Audio API &mdash; OscillatorNode, GainNode, StereoPannerNode, BiquadFilterNode, and AudioBufferSourceNode for noise. No samples, no libraries. Stereo panning represents different qubits or entangled subsystems.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-700 py-16 border-t border-[#111827]">
        Part of the{' '}
        <Link href="/" className="text-gray-500 hover:text-[#00d4ff]">haiqu</Link>{' '}
        research initiative &mdash; TU Delft / QuTech / Quantum Inspire
        <br />
        <span className="text-gray-800 mt-2 inline-block">
          <Link href="/see" className="hover:text-gray-500">See</Link>
          {' '}&middot;{' '}
          <Link href="/sonification" className="hover:text-gray-500">Sonification Lab</Link>
          {' '}&middot;{' '}
          <Link href="/resonance" className="hover:text-gray-500">Resonance</Link>
          {' '}&middot;{' '}
          <Link href="/explore" className="hover:text-gray-500">Explore Hub</Link>
        </span>
      </footer>
    </div>
  )
}
