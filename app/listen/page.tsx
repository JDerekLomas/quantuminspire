'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ============================================================
// CONSTANTS
// ============================================================

// Tuna-9 qubit frequencies (representative, GHz)
const TUNA9_FREQS = [5.12, 5.38, 5.55, 4.95, 5.70, 6.02, 6.25, 6.48, 6.80]
const TUNA9_LABELS = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

// Map GHz to audible Hz: 4.5 GHz → 220 Hz, 7.0 GHz → 880 Hz
function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

// H2 VQE Hamiltonian coefficients at various bond distances
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
        'Quantum gates are precisely shaped microwave pulses. An X gate is a pi-rotation: it flips the qubit from |0\u27E9 to |1\u27E9 (or vice versa). The pulse duration is about 20-40 nanoseconds. The transition state |0\u27E9 is lower energy than |1\u27E9 — so the pitch jumps up.',
      whatYouHear:
        'A low tone (|0\u27E9 ground state), then a brief sawtooth burst (the gate pulse — rich in harmonics like a real microwave drive), then a higher tone (|1\u27E9 excited state, one octave up). The octave represents the energy difference between computational states.',
      physics: 'X gate: |0\u27E9 \u2192 |1\u27E9. Pulse duration ~20ns. f_{01} \u2248 5.55 GHz. The |1\u27E9 state is at a higher energy level.',
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
        'A Hadamard gate rotates the qubit to an equal superposition of |0\u27E9 and |1\u27E9. The qubit is genuinely in both states simultaneously — not uncertain, not flickering between them, but existing as both at once. This is the fundamental resource that quantum computing exploits.',
      whatYouHear:
        'A single pure tone (the qubit in |0\u27E9), then a brief shimmer of noise (the Hadamard gate), then the note splits into two simultaneous tones a perfect fifth apart. Both tones play at equal volume — neither is "more real" than the other. This is superposition.',
      physics: 'H|0\u27E9 = (|0\u27E9 + |1\u27E9)/\u221A2. The probability of each outcome is exactly 50%.',
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
        'A Bell state (H then CNOT) creates maximal entanglement: measuring one qubit instantly determines the other, regardless of distance. If qubit A is |0\u27E9, qubit B is |0\u27E9. If A is |1\u27E9, B is |1\u27E9. The outcomes are individually random but perfectly correlated.',
      whatYouHear:
        'First: eight notes in your left and right ears playing the SAME random sequence — high or low, always matching. This is entanglement: perfect correlation. Then a crack, and the entanglement breaks. Now each ear plays its OWN random sequence — sometimes matching, sometimes not. The chaos of independence.',
      physics: 'Bell state: |\u03A6\u207A\u27E9 = (|00\u27E9 + |11\u27E9)/\u221A2. Correlated: P(same) = 100%. Separable: P(same) = 50%.',
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
      subtitle: 'H\u2082 as a chord progression',
      description:
        'The hydrogen molecule\'s electronic structure is described by a Hamiltonian with four coefficients (g0, g1, g2, g4) that change as the bond stretches. At equilibrium (0.735 \u00C5), the bond is strongest and the energy is lowest. As the atoms pull apart, the interaction terms shrink and the molecule dissociates into independent atoms.',
      whatYouHear:
        'Six chords, one per bond distance (0.50 to 2.50 \u00C5). Each chord has three voices: a root (from g0), and two qubit voices offset by g1 and g2, panned left and right. Vibrato depth comes from the exchange term g4. At short distances, the voices are spread wide with strong vibrato. At equilibrium, they resolve. At dissociation, they collapse to near-unison — the bond is gone.',
      physics: 'H = g0\u00B7I + g1\u00B7Z0 + g2\u00B7Z1 + g4\u00B7(X0X1 + Y0Y1). Equilibrium R=0.735\u00C5, E_FCI = -1.137 Ha.',
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
      physics: 'T2* dephasing: \u0394\u03C6(t) accumulates randomly. Detuning: 495 Hz \u2192 520 Hz over 5s. Noise floor \u221D t/T.',
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
        'Raw hardware measurements contain errors from readout noise, gate infidelity, and decoherence. Error mitigation techniques like TREX (Twirled Readout Error eXtinction) statistically cancel these errors. On IBM Torino, TREX reduced our H\u2082 VQE error from 26 kcal/mol to 0.22 kcal/mol — a 119x improvement.',
      whatYouHear:
        'First: the "raw" measurement — the target Bell chord (E4 + B4) buried under wrong harmonics and sawtooth distortion. Six voices where there should be two. Then a click, and the mitigated result: a clean two-note chord. Same notes, all the noise stripped away. From messy to musical.',
      physics: 'Raw: 26.20 kcal/mol error. TREX: 0.22 kcal/mol. Improvement: 119\u00D7. IBM Torino, 4096 shots.',
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
      physics: 'Beat frequency f_beat = |f1 - f2|. Raw: 26 kcal/mol \u2192 16 Hz beat. TREX: 0.22 kcal/mol \u2192 0.14 Hz beat.',
      durationMs: 8000,
      color: '#f59e0b',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseFreq = 440

        // Raw: 16 Hz beat
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

        // TREX: 0.14 Hz beat
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
// SVG VISUALS — one per act
// ============================================================

function VisualOneQubit({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* Decaying sine wave */}
      <path
        d={Array.from({ length: 60 }, (_, i) => {
          const x = 10 + i * 3
          const decay = Math.exp(-i / 25)
          const y = 40 + Math.sin(i * 0.5) * 25 * decay
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none"
        stroke={active ? '#00d4ff' : '#334155'}
        strokeWidth="2"
        className="transition-colors duration-300"
      />
      {/* T2 label */}
      <text x="160" y="65" fill="#64748b" fontSize="8" fontFamily="monospace">T2 decay</text>
    </svg>
  )
}

function VisualNineQubits({ active }: { active: boolean }) {
  // 3x3 grid of qubits
  const positions = [
    [35, 20], [100, 20], [165, 20],
    [35, 45], [100, 45], [165, 45],
    [35, 70], [100, 70], [165, 70],
  ]
  return (
    <svg viewBox="0 0 200 90" className="w-full h-full">
      {positions.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x} cy={y} r="10"
            fill={active ? TUNA9_FREQS[i] > 6 ? '#ff8c4240' : '#ff8c4220' : '#1e293b'}
            stroke={active ? '#ff8c42' : '#334155'}
            strokeWidth="1.5"
            className="transition-colors duration-300"
          />
          <text x={x} y={y + 3} textAnchor="middle" fill={active ? '#ff8c42' : '#64748b'} fontSize="7" fontFamily="monospace">
            {TUNA9_LABELS[i]}
          </text>
        </g>
      ))}
      {/* Connections */}
      {[[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[6,8]].map(([a, b], i) => (
        <line key={i}
          x1={positions[a][0]} y1={positions[a][1]}
          x2={positions[b][0]} y2={positions[b][1]}
          stroke={active ? '#ff8c4230' : '#1e293b'}
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}

function VisualGate({ active }: { active: boolean }) {
  const col = active ? '#8b5cf6' : '#334155'
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* |0> state */}
      <text x="20" y="45" fill={col} fontSize="14" fontFamily="monospace">|0&#x27E9;</text>
      {/* Arrow */}
      <line x1="55" y1="40" x2="85" y2="40" stroke={col} strokeWidth="1.5" />
      <polygon points="85,35 95,40 85,45" fill={col} />
      {/* X gate box */}
      <rect x="95" y="25" width="30" height="30" rx="4" fill="none" stroke={col} strokeWidth="2" />
      <text x="110" y="45" textAnchor="middle" fill={col} fontSize="16" fontWeight="bold">X</text>
      {/* Arrow */}
      <line x1="125" y1="40" x2="150" y2="40" stroke={col} strokeWidth="1.5" />
      <polygon points="150,35 160,40 150,45" fill={col} />
      {/* |1> state */}
      <text x="162" y="45" fill={col} fontSize="14" fontFamily="monospace">|1&#x27E9;</text>
      {/* Energy label */}
      <text x="20" y="70" fill="#64748b" fontSize="7" fontFamily="monospace">low energy</text>
      <text x="150" y="70" fill="#64748b" fontSize="7" fontFamily="monospace">high energy</text>
    </svg>
  )
}

function VisualSuperposition({ active }: { active: boolean }) {
  const col = active ? '#00ff88' : '#334155'
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* Single path splitting into two */}
      <line x1="20" y1="40" x2="70" y2="40" stroke={col} strokeWidth="2" />
      {/* H gate */}
      <rect x="70" y="28" width="20" height="24" rx="3" fill="none" stroke={col} strokeWidth="1.5" />
      <text x="80" y="44" textAnchor="middle" fill={col} fontSize="11" fontWeight="bold">H</text>
      {/* Split */}
      <path d="M 90 40 C 110 40, 110 22, 130 22" fill="none" stroke={col} strokeWidth="1.5" />
      <path d="M 90 40 C 110 40, 110 58, 130 58" fill="none" stroke={col} strokeWidth="1.5" />
      {/* Labels */}
      <text x="135" y="26" fill={col} fontSize="10" fontFamily="monospace">|0&#x27E9;</text>
      <text x="135" y="62" fill={col} fontSize="10" fontFamily="monospace">|1&#x27E9;</text>
      <text x="160" y="44" fill="#64748b" fontSize="8" fontFamily="monospace">50/50</text>
    </svg>
  )
}

function VisualEntanglement({ active }: { active: boolean }) {
  const col = active ? '#c084fc' : '#334155'
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* Two qubits connected */}
      <circle cx="60" cy="40" r="18" fill="none" stroke={col} strokeWidth="2" />
      <circle cx="140" cy="40" r="18" fill="none" stroke={col} strokeWidth="2" />
      <text x="60" y="44" textAnchor="middle" fill={col} fontSize="10" fontFamily="monospace">qA</text>
      <text x="140" y="44" textAnchor="middle" fill={col} fontSize="10" fontFamily="monospace">qB</text>
      {/* Entanglement squiggly line */}
      <path
        d={`M 78 40 ${Array.from({ length: 8 }, (_, i) => {
          const x = 82 + i * 5
          const y = 40 + (i % 2 === 0 ? -5 : 5)
          return `L ${x} ${y}`
        }).join(' ')} L 122 40`}
        fill="none" stroke={col} strokeWidth="1.5" strokeDasharray={active ? 'none' : '3,3'}
      />
      {/* Correlation labels */}
      <text x="100" y="18" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="monospace">
        {active ? 'correlated' : 'measure one \u2192 know both'}
      </text>
      <text x="30" y="72" fill="#64748b" fontSize="7" fontFamily="monospace">L ear</text>
      <text x="155" y="72" fill="#64748b" fontSize="7" fontFamily="monospace">R ear</text>
    </svg>
  )
}

function VisualMolecule({ active }: { active: boolean }) {
  const col = active ? '#ff6b9d' : '#334155'
  // PES curve
  const distances = [0.5, 0.735, 1.0, 1.5, 2.0, 2.5]
  const energies = [-0.8428, -1.1373, -1.1011, -0.9829, -0.9486, -0.9388]
  const minE = -1.2, maxE = -0.7
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* PES curve */}
      <path
        d={distances.map((r, i) => {
          const x = 25 + ((r - 0.4) / 2.3) * 150
          const y = 70 - ((energies[i] - minE) / (maxE - minE)) * 55
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none" stroke={col} strokeWidth="2"
      />
      {/* Dots at data points */}
      {distances.map((r, i) => {
        const x = 25 + ((r - 0.4) / 2.3) * 150
        const y = 70 - ((energies[i] - minE) / (maxE - minE)) * 55
        return <circle key={i} cx={x} cy={y} r="3" fill={col} opacity={active ? 1 : 0.5} />
      })}
      {/* Equilibrium marker */}
      <text x="55" y="12" fill="#64748b" fontSize="7" fontFamily="monospace">R=0.735\u00C5</text>
      <line x1="55" y1="14" x2="55" y2="22" stroke="#64748b" strokeWidth="0.5" strokeDasharray="2,2" />
      {/* H-H label */}
      <text x="160" y="12" fill={col} fontSize="9" fontFamily="monospace">H\u2014H</text>
      {/* Axis labels */}
      <text x="8" y="40" fill="#64748b" fontSize="6" fontFamily="monospace" transform="rotate(-90,8,40)">Energy</text>
      <text x="95" y="78" fill="#64748b" fontSize="6" fontFamily="monospace" textAnchor="middle">Bond distance</text>
    </svg>
  )
}

function VisualDecoherence({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* Clean wave on left, noisy on right */}
      <path
        d={Array.from({ length: 60 }, (_, i) => {
          const x = 10 + i * 3
          const noise = i > 30 ? (Math.random() - 0.5) * (i - 30) * 0.7 : 0
          const amp = i > 35 ? Math.max(0.3, 1 - (i - 35) / 30) : 1
          const y = 40 + Math.sin(i * 0.4) * 20 * amp + noise
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none"
        stroke={active ? '#ef4444' : '#334155'}
        strokeWidth="1.5"
        className="transition-colors duration-300"
      />
      {/* Labels */}
      <text x="20" y="74" fill="#64748b" fontSize="7" fontFamily="monospace">coherent</text>
      <text x="140" y="74" fill="#64748b" fontSize="7" fontFamily="monospace">decohered</text>
      {/* Arrow */}
      <line x1="80" y1="70" x2="130" y2="70" stroke="#475569" strokeWidth="0.8" />
      <polygon points="130,68 135,70 130,72" fill="#475569" />
    </svg>
  )
}

function VisualMitigation({ active }: { active: boolean }) {
  const col = active ? '#22c55e' : '#334155'
  // Bar chart: noisy vs clean
  const noisyBars = [0.25, 0.20, 0.12, 0.08, 0.15, 0.10, 0.05, 0.05]
  const cleanBars = [0.48, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.52]
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* Noisy histogram */}
      {noisyBars.map((h, i) => (
        <rect key={`n${i}`} x={10 + i * 10} y={65 - h * 100} width="7" height={h * 100}
          fill={active ? '#ef444460' : '#1e293b'} rx="1" />
      ))}
      <text x="40" y="75" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">raw</text>
      {/* Arrow */}
      <line x1="95" y1="40" x2="105" y2="40" stroke={col} strokeWidth="1" />
      <polygon points="105,37 112,40 105,43" fill={col} />
      {/* Clean histogram */}
      {cleanBars.map((h, i) => (
        <rect key={`c${i}`} x={115 + i * 10} y={65 - h * 100} width="7" height={h * 100}
          fill={active ? '#22c55e80' : '#1e293b'} rx="1" />
      ))}
      <text x="150" y="75" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">TREX</text>
    </svg>
  )
}

function VisualChemicalAccuracy({ active }: { active: boolean }) {
  const col = active ? '#f59e0b' : '#334155'
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full">
      {/* Fast beating wave */}
      <path
        d={Array.from({ length: 25 }, (_, i) => {
          const x = 10 + i * 3.5
          const beat = Math.cos(i * 1.2) // fast
          const y = 25 + Math.sin(i * 0.8) * 12 * beat
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none" stroke={active ? '#ef4444' : '#334155'} strokeWidth="1.5"
      />
      <text x="10" y="48" fill="#64748b" fontSize="7" fontFamily="monospace">26 kcal/mol</text>
      {/* Slow beating wave (nearly flat) */}
      <path
        d={Array.from({ length: 25 }, (_, i) => {
          const x = 110 + i * 3.5
          const y = 25 + Math.sin(i * 0.8) * 14
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none" stroke={col} strokeWidth="1.5"
      />
      <text x="110" y="48" fill="#64748b" fontSize="7" fontFamily="monospace">0.22 kcal/mol</text>
      {/* Threshold line */}
      <line x1="0" y1="60" x2="200" y2="60" stroke="#475569" strokeWidth="0.5" strokeDasharray="3,3" />
      <text x="100" y="68" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">
        chemical accuracy threshold: 1.6 kcal/mol
      </text>
    </svg>
  )
}

const ACT_VISUALS: Record<string, React.ComponentType<{ active: boolean }>> = {
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
// PLAYER COMPONENT
// ============================================================

export default function ListenPage() {
  const [playingAct, setPlayingAct] = useState<string | null>(null)
  const [expandedAct, setExpandedAct] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
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
    // If already playing this act, stop it
    if (playingAct === act.id) {
      stopAll()
      return
    }
    // Stop any current playback
    stopAll()

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    setPlayingAct(act.id)
    startTimeRef.current = Date.now()
    currentDurationRef.current = act.durationMs

    act.play(ctx, master)

    // Progress ticker
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(1, elapsed / currentDurationRef.current))
    }, 50)

    // Auto-stop
    timerRef.current = setTimeout(() => {
      setPlayingAct(null)
      setProgress(0)
      if (progressRef.current) clearInterval(progressRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }, act.durationMs + 200)
  }, [playingAct, stopAll])

  // Play all sequentially
  const playAll = useCallback(() => {
    if (playingAct) { stopAll(); return }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
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
  }, [acts, playingAct, stopAll])

  // Cleanup
  useEffect(() => () => stopAll(), [stopAll])

  const toggleExpand = (id: string) => {
    setExpandedAct(expandedAct === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-quantum-bg text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-quantum-accent transition-colors mb-4 inline-block">
            &larr; back
          </Link>
          <h1 className="text-3xl font-bold mb-3">
            <span className="gradient-text">Listen to Quantum Computing</span>
          </h1>
        </div>

        {/* Introduction */}
        <div className="mb-10 space-y-3 text-sm text-gray-300 leading-relaxed">
          <p>
            Quantum computers operate in the microwave regime &mdash; the same frequencies as your Wi-Fi router, but at temperatures colder than outer space. Each qubit resonates at its own frequency, gates are shaped microwave pulses, and measurement collapses the quantum state into classical bits.
          </p>
          <p>
            These nine acts translate quantum phenomena into sound. The frequencies are real (scaled from GHz to audible Hz), the Hamiltonian coefficients are from our calculations, and the error numbers are from our actual hardware runs on <span className="text-quantum-accent">Tuna-9</span> and <span className="text-blue-400">IBM Torino</span>.
          </p>
          <p className="text-gray-500 text-xs">
            Best with headphones. Click any act to play it. Click the info button for details on what you&apos;re hearing.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Want to hear your own experiment data? Try the{' '}
            <Link href="/explore" className="text-[#8b5cf6] hover:underline">Explore Hub</Link> — 20+ interactive tools and learning paths.
          </p>
        </div>

        {/* Play All button */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={playAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 text-sm font-medium"
            style={{
              borderColor: playingAct ? '#00d4ff60' : '#00d4ff30',
              backgroundColor: playingAct ? '#00d4ff15' : '#00d4ff08',
              color: '#00d4ff',
            }}
          >
            <span className="text-lg">{playingAct ? '\u25A0' : '\u25B6'}</span>
            {playingAct ? 'Stop' : 'Play all 9 acts'}
          </button>
          {playingAct && (
            <div className="flex-1 h-1 bg-quantum-card rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100 bg-quantum-accent"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
          <span className="text-xs text-gray-600 font-mono">
            {Math.round(acts.reduce((s, a) => s + a.durationMs, 0) / 1000)}s
          </span>
        </div>

        {/* Acts */}
        <div className="space-y-4">
          {acts.map((act, i) => {
            const isPlaying = playingAct === act.id
            const isExpanded = expandedAct === act.id
            const Visual = ACT_VISUALS[act.id]

            return (
              <div
                key={act.id}
                className="rounded-xl border transition-all duration-300"
                style={{
                  borderColor: isPlaying ? act.color + '50' : '#1e293b',
                  backgroundColor: isPlaying ? act.color + '08' : '#0f172a',
                }}
              >
                {/* Main row: visual + info + play button */}
                <div className="flex items-center gap-4 p-4">
                  {/* Act number */}
                  <span className="text-xs font-mono text-gray-600 w-4 shrink-0">
                    {i + 1}
                  </span>

                  {/* SVG Visual */}
                  <div className="w-44 h-16 shrink-0 hidden sm:block">
                    {Visual && <Visual active={isPlaying} />}
                  </div>

                  {/* Title + subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3
                        className="text-sm font-bold transition-colors"
                        style={{ color: isPlaying ? act.color : '#e2e8f0' }}
                      >
                        {act.title}
                      </h3>
                      <span className="text-xs text-gray-500 truncate">
                        &mdash; {act.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {act.description}
                    </p>

                    {/* Progress bar for this act */}
                    {isPlaying && (
                      <div className="mt-2 h-0.5 bg-quantum-card rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-100"
                          style={{ width: `${progress * 100}%`, backgroundColor: act.color }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info toggle */}
                  <button
                    onClick={() => toggleExpand(act.id)}
                    className="text-gray-600 hover:text-gray-300 transition-colors text-xs font-mono px-2 py-1 rounded shrink-0"
                    title="What you're hearing"
                  >
                    {isExpanded ? '\u2212' : 'i'}
                  </button>

                  {/* Play button */}
                  <button
                    onClick={() => playAct(act)}
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shrink-0"
                    style={{
                      borderColor: isPlaying ? act.color + '80' : '#334155',
                      backgroundColor: isPlaying ? act.color + '20' : 'transparent',
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: isPlaying ? act.color : '#9ca3af' }}
                    >
                      {isPlaying ? '\u25A0' : '\u25B6'}
                    </span>
                  </button>
                </div>

                {/* Expanded info panel */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 border-t space-y-3"
                    style={{ borderColor: act.color + '15' }}
                  >
                    {/* Mobile visual */}
                    <div className="w-full h-16 sm:hidden mt-3">
                      {Visual && <Visual active={isPlaying} />}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          What you&apos;re hearing
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {act.whatYouHear}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          The physics
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {act.description}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-2 bg-quantum-bg/50 px-2 py-1 rounded">
                          {act.physics}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-600 font-mono">
                      Duration: {(act.durationMs / 1000).toFixed(1)}s
                      {act.id === 'nine-qubits' && ' \u00B7 9 oscillators \u00B7 stereo panning'}
                      {act.id === 'entanglement' && ' \u00B7 stereo correlation \u00B7 use headphones'}
                      {act.id === 'molecule' && ' \u00B7 6 bond distances \u00B7 real H\u2082 coefficients'}
                      {act.id === 'mitigation' && ' \u00B7 IBM Torino data \u00B7 TREX 119\u00D7 improvement'}
                      {act.id === 'chemical-accuracy' && ' \u00B7 beat frequency sonification \u00B7 0.22 kcal/mol'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* How sonification works */}
        <details className="mt-12 text-sm">
          <summary className="text-gray-500 hover:text-gray-300 cursor-pointer text-xs font-mono uppercase tracking-wider">
            How sonification works
          </summary>
          <div className="mt-4 space-y-3 text-gray-400 text-xs leading-relaxed border-l border-quantum-border pl-4">
            <p>
              <strong className="text-gray-300">Frequency mapping:</strong> Qubit frequencies (4.5&ndash;7.0 GHz) are linearly mapped to 220&ndash;880 Hz (A3 to A5). This preserves the relative spacing while making them audible.
            </p>
            <p>
              <strong className="text-gray-300">Amplitude:</strong> Measurement probabilities map to volume. Higher probability = louder tone. A perfect Bell state has two equal-volume notes; a noisy one has many quiet tones.
            </p>
            <p>
              <strong className="text-gray-300">Beat frequencies:</strong> When two tones are close in frequency, you hear a pulsing effect at f_beat = |f1 - f2|. We use this to sonify energy error: large error = fast beating, chemical accuracy = near stillness.
            </p>
            <p>
              <strong className="text-gray-300">Stereo:</strong> Left/right panning represents different qubits or entangled subsystems. Entanglement sounds like correlation between your ears.
            </p>
            <p>
              <strong className="text-gray-300">Implementation:</strong> Pure Web Audio API &mdash; OscillatorNode, GainNode, StereoPannerNode, BiquadFilterNode, and AudioBufferSourceNode for noise. No samples, no libraries.
            </p>
          </div>
        </details>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-12 mt-12 border-t border-quantum-border">
          Part of the{' '}
          <Link href="/" className="text-quantum-accent hover:underline">haiqu</Link>{' '}
          research initiative &mdash; TU Delft / QuTech / Quantum Inspire.{' '}
          <Link href="/resonance" className="text-gray-500 hover:text-quantum-accent ml-2">
            Resonance
          </Link>{' '}
          &middot;{' '}
          <Link href="/see" className="text-gray-500 hover:text-quantum-accent">
            See
          </Link>
        </footer>
      </div>
    </div>
  )
}
