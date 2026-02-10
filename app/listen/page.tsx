'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ============================================================
// ACTS — the script of our quantum sonification play
// ============================================================

interface Act {
  id: string
  title: string
  subtitle: string
  description: string
  durationMs: number
  color: string
  play: (ctx: AudioContext, master: GainNode) => void
}

// Tuna-9 qubit frequencies (representative, GHz)
const TUNA9_FREQS = [5.12, 5.38, 5.55, 4.95, 5.70, 6.02, 6.25, 6.48, 6.80]

// Map GHz to audible Hz: 4.5 GHz → 220 Hz, 7.0 GHz → 880 Hz
function ghzToHz(ghz: number): number {
  return 220 + ((ghz - 4.5) / 2.5) * 660
}

// H2 VQE Hamiltonian coefficients at various bond distances
const H2_COEFFICIENTS: Record<string, { g0: number; g1: number; g2: number; g4: number }> = {
  '0.50': { g0: 0.0990, g1: 0.7956, g2: -0.7956, g4: 0.1745 },
  '0.735': { g0: -0.3211, g1: 0.3979, g2: -0.3979, g4: 0.0905 },
  '1.00': { g0: -0.5597, g1: 0.2097, g2: -0.2097, g4: 0.0537 },
  '1.50': { g0: -0.7295, g1: 0.0710, g2: -0.0710, g4: 0.0244 },
  '2.00': { g0: -0.7889, g1: 0.0224, g2: -0.0224, g4: 0.0108 },
  '2.50': { g0: -0.8069, g1: 0.0069, g2: -0.0069, g4: 0.0047 },
}

function makeActs(): Act[] {
  return [
    // ─── ACT 1: One Qubit ─────────────────────────────────
    {
      id: 'one-qubit',
      title: 'One Qubit',
      subtitle: 'A resonator with a natural frequency',
      description:
        'A qubit is a resonator. It has a natural frequency — around 5 GHz for a transmon. ' +
        'Drive it at that frequency and it responds. This is qubit 2 on Tuna-9, at 5.55 GHz.',
      durationMs: 5000,
      color: '#00d4ff',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = ghzToHz(5.55) // qubit 2
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.35, now + 0.1)
        gain.gain.setValueAtTime(0.35, now + 2.5)
        // T2 decay — the tone fades as coherence is lost
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.8)
        osc.connect(gain).connect(master)
        osc.start(now)
        osc.stop(now + 5)
      },
    },

    // ─── ACT 2: Nine Qubits ──────────────────────────────
    {
      id: 'nine-qubits',
      title: 'Nine Qubits',
      subtitle: 'The chip tunes up',
      description:
        'Tuna-9 has nine qubits, each at a different frequency. ' +
        'They enter one by one — like an orchestra tuning. Together they form a chord. ' +
        'The spread prevents crosstalk; the spacing is deliberate.',
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

    // ─── ACT 3: A Gate ────────────────────────────────────
    {
      id: 'gate',
      title: 'A Gate',
      subtitle: 'A microwave pulse flips the qubit',
      description:
        'A quantum gate is a precisely shaped microwave burst. ' +
        'This X gate flips qubit 2 from |0\u27E9 to |1\u27E9. ' +
        'Listen: the pitch jumps as the state changes.',
      durationMs: 5000,
      color: '#8b5cf6',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseHz = ghzToHz(5.55)

        // |0⟩ tone
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

        // Gate pulse — brief broadband click at t=2s
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

        // |1⟩ tone — higher pitch (octave up)
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

    // ─── ACT 4: Superposition ─────────────────────────────
    {
      id: 'superposition',
      title: 'Superposition',
      subtitle: 'One note becomes two',
      description:
        'A Hadamard gate creates superposition — the qubit exists in both |0\u27E9 and |1\u27E9 simultaneously. ' +
        'One pitch splits into two, sounding together. Neither is "the answer" until you measure.',
      durationMs: 6000,
      color: '#00ff88',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseHz = 440

        // Pure |0⟩
        const osc0 = ctx.createOscillator()
        const gain0 = ctx.createGain()
        osc0.type = 'sine'
        osc0.frequency.value = baseHz
        gain0.gain.setValueAtTime(0, now)
        gain0.gain.linearRampToValueAtTime(0.35, now + 0.05)
        gain0.gain.setValueAtTime(0.35, now + 1.5)
        // Crossfade: solo → chord
        gain0.gain.linearRampToValueAtTime(0.2, now + 2.2)
        gain0.gain.setValueAtTime(0.2, now + 5.0)
        gain0.gain.linearRampToValueAtTime(0, now + 5.8)
        osc0.connect(gain0).connect(master)
        osc0.start(now)
        osc0.stop(now + 6)

        // |1⟩ enters at the Hadamard moment
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.value = baseHz * 1.5 // perfect fifth — consonant
        gain1.gain.setValueAtTime(0, now)
        gain1.gain.setValueAtTime(0, now + 1.8)
        gain1.gain.linearRampToValueAtTime(0.2, now + 2.2)
        gain1.gain.setValueAtTime(0.2, now + 5.0)
        gain1.gain.linearRampToValueAtTime(0, now + 5.8)
        osc1.connect(gain1).connect(master)
        osc1.start(now)
        osc1.stop(now + 6)

        // Hadamard "shimmer" — brief noise burst at transition
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

    // ─── ACT 5: Entanglement ──────────────────────────────
    {
      id: 'entanglement',
      title: 'Entanglement',
      subtitle: 'Two qubits, one fate',
      description:
        'In a Bell state, measuring one qubit instantly determines the other. ' +
        'Left ear and right ear play the same random sequence — perfectly correlated. ' +
        'Then we break the entanglement: the correlation vanishes.',
      durationMs: 8000,
      color: '#8b5cf6',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const lo = 330
        const hi = 660

        // Generate a random binary sequence
        const seq: boolean[] = []
        for (let i = 0; i < 8; i++) seq.push(Math.random() > 0.5)

        // Part 1 (0-4s): Entangled — both ears play the SAME sequence
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

        // Brief pause + "break" sound
        const breakBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
        const bd = breakBuf.getChannelData(0)
        for (let i = 0; i < bd.length; i++) bd[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (ctx.sampleRate * 0.02))
        const breakSrc = ctx.createBufferSource()
        const breakGain = ctx.createGain()
        breakSrc.buffer = breakBuf
        breakGain.gain.value = 0.3
        breakSrc.connect(breakGain).connect(master)
        breakSrc.start(now + 4.0)

        // Part 2 (4.5-7.5s): NOT entangled — ears play DIFFERENT random sequences
        for (let i = 0; i < 7; i++) {
          const t = now + 4.5 + i * 0.42

          // Left plays its own random
          const freqL = Math.random() > 0.5 ? hi : lo
          const oscL = ctx.createOscillator()
          const gainL = ctx.createGain()
          const panL = ctx.createStereoPanner()
          oscL.type = 'triangle'
          oscL.frequency.value = freqL
          panL.pan.value = -0.9
          gainL.gain.setValueAtTime(0, t)
          gainL.gain.linearRampToValueAtTime(0.2, t + 0.03)
          gainL.gain.linearRampToValueAtTime(0, t + 0.33)
          oscL.connect(gainL).connect(panL).connect(master)
          oscL.start(t)
          oscL.stop(t + 0.38)

          // Right plays its own random (different)
          const freqR = Math.random() > 0.5 ? hi : lo
          const oscR = ctx.createOscillator()
          const gainR = ctx.createGain()
          const panR = ctx.createStereoPanner()
          oscR.type = 'triangle'
          oscR.frequency.value = freqR
          panR.pan.value = 0.9
          gainR.gain.setValueAtTime(0, t)
          gainR.gain.linearRampToValueAtTime(0.2, t + 0.03)
          gainR.gain.linearRampToValueAtTime(0, t + 0.33)
          oscR.connect(gainR).connect(panR).connect(master)
          oscR.start(t)
          oscR.stop(t + 0.38)
        }
      },
    },

    // ─── ACT 6: The Molecule ──────────────────────────────
    {
      id: 'molecule',
      title: 'The Molecule',
      subtitle: 'H\u2082 as a chord progression',
      description:
        'The H\u2082 Hamiltonian defines the energy structure of hydrogen. ' +
        'Each bond distance has different coefficients — a different chord. ' +
        'At equilibrium (0.735 \u00C5) the chord resolves. ' +
        'At dissociation, the voices separate into independent tones.',
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

          // Root note from g0: maps [-0.8, 0.1] → [200, 500] Hz
          const rootHz = 350 + c.g0 * 200

          // Two "qubit" voices offset by g1 and g2
          const voice1Hz = rootHz + c.g1 * 200
          const voice2Hz = rootHz + c.g2 * 200

          // Exchange term: modulation depth from g4
          const modDepth = c.g4 * 300

          // Root
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

          // Voice 1 (left)
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

          // Voice 2 (right)
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

          // Exchange modulation — subtle vibrato from g4
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

    // ─── ACT 7: Decoherence ───────────────────────────────
    {
      id: 'decoherence',
      title: 'Decoherence',
      subtitle: 'The quantum state dissolves',
      description:
        'A perfect Bell state — two qubits in quantum harmony. ' +
        'But the environment intrudes. Phase noise creeps in. ' +
        'The pure chord degrades into mush. ' +
        'This is what every quantum computer is fighting.',
      durationMs: 7000,
      color: '#ff6b9d',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const dur = 6.5

        // Pure Bell state chord: two notes, perfect fifth
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        const gain2 = ctx.createGain()

        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.value = 330 // E4
        osc2.frequency.value = 495 // B4 (perfect fifth)

        const pan1 = ctx.createStereoPanner()
        const pan2 = ctx.createStereoPanner()
        pan1.pan.value = -0.5
        pan2.pan.value = 0.5

        // Start clean
        gain1.gain.setValueAtTime(0, now)
        gain1.gain.linearRampToValueAtTime(0.25, now + 0.1)
        gain2.gain.setValueAtTime(0, now)
        gain2.gain.linearRampToValueAtTime(0.25, now + 0.1)

        // Gradually detune (dephasing) — T2* effect
        osc2.frequency.setValueAtTime(495, now)
        osc2.frequency.linearRampToValueAtTime(495, now + 1.5)
        osc2.frequency.linearRampToValueAtTime(503, now + 3.5) // beating emerges
        osc2.frequency.linearRampToValueAtTime(520, now + 5.5) // fully detuned

        // Fade out as coherence is lost
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

        // Growing noise floor (environment)
        const noiseDur = dur
        const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseDur), ctx.sampleRate)
        const nd = noiseBuf.getChannelData(0)
        for (let i = 0; i < nd.length; i++) {
          const t = i / ctx.sampleRate
          const envNoise = Math.min(1, t / 4) * 0.15 // grows over 4s
          nd[i] = (Math.random() * 2 - 1) * envNoise
        }
        const noiseSrc = ctx.createBufferSource()
        const noiseGain = ctx.createGain()
        noiseSrc.buffer = noiseBuf
        noiseGain.gain.value = 1
        // Band-pass the noise around the qubit frequencies
        const noiseFilt = ctx.createBiquadFilter()
        noiseFilt.type = 'bandpass'
        noiseFilt.frequency.value = 400
        noiseFilt.Q.value = 2
        noiseSrc.connect(noiseFilt).connect(noiseGain).connect(master)
        noiseSrc.start(now)
      },
    },

    // ─── ACT 8: Error Mitigation ──────────────────────────
    {
      id: 'mitigation',
      title: 'Error Mitigation',
      subtitle: 'Cleaning the signal',
      description:
        'First: raw hardware measurement — noisy, dissonant. ' +
        'Then: TREX mitigation on IBM Torino — the noise melts away. ' +
        'From 26 kcal/mol error to 0.22. A 119x improvement.',
      durationMs: 7000,
      color: '#00ff88',
      play: (ctx, master) => {
        const now = ctx.currentTime

        // PART 1 (0-3s): Raw hardware — noisy Bell chord
        const rawNotes = [330, 495, 360, 385, 510, 440] // extra wrong harmonics = noise
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

        // Brief transition sound
        const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
        const cd = clickBuf.getChannelData(0)
        for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (ctx.sampleRate * 0.01))
        const click = ctx.createBufferSource()
        click.buffer = clickBuf
        const clickGain = ctx.createGain()
        clickGain.gain.value = 0.3
        click.connect(clickGain).connect(master)
        click.start(now + 3.2)

        // PART 2 (3.5-6.5s): TREX mitigated — clean Bell chord
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

    // ─── ACT 9: Chemical Accuracy ─────────────────────────
    {
      id: 'chemical-accuracy',
      title: 'Chemical Accuracy',
      subtitle: 'The slow pulse of success',
      description:
        'Two tones — ideal energy and measured energy — beating against each other. ' +
        'Fast beating means large error. Slow pulsing means chemical accuracy. ' +
        'At 0.22 kcal/mol, the beat is barely perceptible. We did it.',
      durationMs: 8000,
      color: '#00d4ff',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseFreq = 440

        // Part 1 (0-3.5s): Raw hardware — 26 kcal/mol error → ~16 Hz beat
        const rawBeatHz = 16
        const osc1a = ctx.createOscillator()
        const osc1b = ctx.createOscillator()
        const gain1a = ctx.createGain()
        const gain1b = ctx.createGain()
        osc1a.type = 'sine'
        osc1b.type = 'sine'
        osc1a.frequency.value = baseFreq
        osc1b.frequency.value = baseFreq + rawBeatHz

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

        // Part 2 (4-7.5s): TREX — 0.22 kcal/mol → ~0.14 Hz beat (barely audible pulsing)
        const trexBeatHz = 0.14
        const osc2a = ctx.createOscillator()
        const osc2b = ctx.createOscillator()
        const gain2a = ctx.createGain()
        const gain2b = ctx.createGain()
        osc2a.type = 'sine'
        osc2b.type = 'sine'
        osc2a.frequency.value = baseFreq
        osc2b.frequency.value = baseFreq + trexBeatHz

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
// PLAYER COMPONENT
// ============================================================

export default function ListenPage() {
  const [playing, setPlaying] = useState(false)
  const [currentAct, setCurrentAct] = useState(-1)
  const [progress, setProgress] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actsRef = useRef<Act[]>([])
  const startTimeRef = useRef(0)

  // Memoize acts
  useEffect(() => {
    actsRef.current = makeActs()
  }, [])

  const totalDuration = useMemo(() => {
    const acts = makeActs()
    return acts.reduce((sum, act) => sum + act.durationMs, 0) + (acts.length - 1) * 800 // gaps
  }, [])

  const stopAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
      masterGainRef.current = null
    }
    setPlaying(false)
    setCurrentAct(-1)
    setProgress(0)
  }, [])

  const startPlay = useCallback(() => {
    if (playing) {
      stopAll()
      return
    }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
    masterGainRef.current = master

    const acts = makeActs()
    actsRef.current = acts
    setPlaying(true)
    startTimeRef.current = Date.now()

    // Start progress ticker
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(1, elapsed / totalDuration))
    }, 50)

    // Schedule acts
    let delay = 0
    acts.forEach((act, i) => {
      const actDelay = delay
      setTimeout(() => {
        if (!audioCtxRef.current) return // stopped
        setCurrentAct(i)
        act.play(ctx, master)
      }, actDelay)
      delay += act.durationMs + 800 // gap between acts
    })

    // Auto-stop after all acts
    timerRef.current = setTimeout(() => {
      setPlaying(false)
      setCurrentAct(-1)
      setProgress(1)
      if (progressRef.current) clearInterval(progressRef.current)
    }, delay)
  }, [playing, stopAll, totalDuration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [stopAll])

  const acts = useMemo(() => makeActs(), [])

  return (
    <div className="min-h-screen bg-quantum-bg text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-gray-400 hover:text-quantum-accent transition-colors mb-4 inline-block">
            &larr; back
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Listen</span>
          </h1>
          <p className="text-gray-400 max-w-xl">
            A quantum computer in nine acts. Each act sonifies a different aspect of
            quantum computation &mdash; from a single qubit&apos;s voice to the slow pulse
            of chemical accuracy. Best with headphones.
          </p>
          <p className="text-xs text-gray-600 font-mono mt-2">
            {Math.round(totalDuration / 1000)}s &middot; 9 acts &middot; stereo &middot; Web Audio API
          </p>
        </div>

        {/* Play button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={startPlay}
            className="group relative w-24 h-24 rounded-full border-2 transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: playing
                ? (currentAct >= 0 ? acts[currentAct]?.color : '#00d4ff') + '80'
                : '#00d4ff40',
              backgroundColor: playing
                ? (currentAct >= 0 ? acts[currentAct]?.color : '#00d4ff') + '15'
                : '#00d4ff08',
            }}
          >
            <span
              className="text-3xl"
              style={{ color: currentAct >= 0 ? acts[currentAct]?.color : '#00d4ff' }}
            >
              {playing ? '\u25A0' : '\u25B6'}
            </span>
          </button>
        </div>

        {/* Progress bar */}
        {(playing || progress > 0) && (
          <div className="mb-8">
            <div className="h-1 bg-quantum-card rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: currentAct >= 0 ? acts[currentAct]?.color : '#00d4ff',
                }}
              />
            </div>
          </div>
        )}

        {/* Current act display */}
        {currentAct >= 0 && playing && (
          <div
            className="mb-12 p-8 rounded-xl border transition-all duration-500"
            style={{
              borderColor: acts[currentAct].color + '30',
              backgroundColor: acts[currentAct].color + '06',
            }}
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                Act {currentAct + 1}/{acts.length}
              </span>
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: acts[currentAct].color }}
              />
            </div>
            <h2
              className="text-2xl font-bold mb-1"
              style={{ color: acts[currentAct].color }}
            >
              {acts[currentAct].title}
            </h2>
            <p className="text-sm text-gray-400 italic mb-3">
              {acts[currentAct].subtitle}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {acts[currentAct].description}
            </p>
          </div>
        )}

        {/* Act list — shows as program notes */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Program
          </h2>
          {acts.map((act, i) => {
            const isCurrent = i === currentAct && playing
            const isPast = playing && currentAct > i
            return (
              <div
                key={act.id}
                className="flex items-center gap-4 py-2.5 px-4 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: isCurrent ? act.color + '10' : 'transparent',
                  borderLeft: isCurrent ? `3px solid ${act.color}` : '3px solid transparent',
                }}
              >
                <span className="text-xs font-mono text-gray-600 w-4">
                  {i + 1}
                </span>
                <span
                  className="text-sm font-semibold transition-colors"
                  style={{
                    color: isCurrent ? act.color : isPast ? '#4b5563' : '#9ca3af',
                  }}
                >
                  {act.title}
                </span>
                <span className="text-xs text-gray-600 font-mono">
                  &mdash; {act.subtitle}
                </span>
                <span className="text-[10px] text-gray-700 font-mono ml-auto">
                  {(act.durationMs / 1000).toFixed(0)}s
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-12 mt-12 border-t border-quantum-border">
          Part of the{' '}
          <Link href="/" className="text-quantum-accent hover:underline">haiqu</Link>{' '}
          research initiative.{' '}
          <Link href="/resonance" className="text-gray-500 hover:text-quantum-accent">
            Resonance Explorer
          </Link>{' '}
          &middot;{' '}
          <Link href="/sonification" className="text-gray-500 hover:text-quantum-accent">
            Experiment Sonification
          </Link>
        </footer>
      </div>
    </div>
  )
}
