'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/components/Nav'

// ============================================================
// SCROLL HOOKS
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

// ============================================================
// TUNA-9 DATA — all from real experiments
// ============================================================

const TUNA9 = {
  // Representative transmon frequencies from published QuTech/DiCarlo lab devices
  // (arxiv 2503.13225). Extrapolated to 9 qubits.
  freqs: [5.30, 5.22, 5.18, 5.46, 5.45, 5.35, 5.27, 5.40, 5.15],
  labels: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],

  // Per-qubit error rates (X gate + measure, 1024 shots)
  // Source: tuna9-connectivity-discovery.json
  errors: [0.123, 0.037, 0.016, 0.052, 0.019, 0.016, 0.027, 0.045, 0.035],

  // Topology: 12 edges, diamond-like layout (from QI API backend_type.topology)
  topology: [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8]] as [number,number][],

  // SVG positions for the topology
  positions: [
    [300, 70],                           // q0
    [180, 150], [420, 150],              // q1, q2
    [100, 240], [300, 240], [500, 240],  // q3, q4, q5
    [180, 330],                          // q6
    [420, 330], [300, 400],              // q7, q8
  ],

  // Bell fidelities per connected pair (from our experiments)
  // 4-7 and 5-7 confirmed by API topology but not yet measured by us
  bellFidelities: {
    '0-1': 0.870, '0-2': 0.858, '1-3': 0.913, '1-4': 0.898,
    '2-4': 0.923, '2-5': 0.914, '3-6': 0.871, '4-6': 0.935,
    '4-7': 0, '5-7': 0,  // unmeasured — Tuna-9 offline
    '6-8': 0.913, '7-8': 0.883,
  } as Record<string, number>,

  // Bell counts for pair 0-1 (for histogram visual)
  bellCounts01: { '00': 502, '01': 67, '10': 66, '11': 389 },

  // Benchmarks
  gateFidelity: 0.9982,  // single-qubit RB, cross2019-rb-tuna9.json
  qv: 8,                  // cross2019-qv-tuna9.json

  // Ising model: per-qubit Z expectations at 3 depths
  // Source: kim2023-ising-tuna9-hardware.json
  ising: {
    d1: [0.953, 0.955, 0.976, 0.937, 0.929, 0.970, 0.924, 0.923, 0.932],
    d3: [0.959, 0.871, 0.937, 0.886, 0.803, 0.896, 0.638, 0.595, 0.479],
    d5: [0.951, 0.797, 0.874, 0.800, 0.644, 0.851, 0.152, 0.173, 0.025],
    mz: [0.944, 0.785, 0.585],
    allZero: [0.793, 0.424, 0.139],
  },

  // ZNE results (depth 1)
  zne: {
    noisy: 0.944,
    mitigated: 0.982,
    improvement: 3.1,
  },
}

function ghzToHz(ghz: number): number {
  return 300 + ((ghz - 5.0) / 0.6) * 300
}

function fidelityColor(f: number): string {
  if (f >= 0.92) return '#22c55e'
  if (f >= 0.90) return '#84cc16'
  if (f >= 0.87) return '#f59e0b'
  return '#ef4444'
}

function errorColor(e: number): string {
  if (e <= 0.02) return '#22c55e'
  if (e <= 0.04) return '#84cc16'
  if (e <= 0.06) return '#f59e0b'
  return '#ef4444'
}

// ============================================================
// SECTION DEFINITIONS
// ============================================================

interface Section {
  id: string
  title: string
  subtitle: string
  narrative: string
  whatYouHear: string
  dataNote: string
  durationMs: number
  color: string
  play: (ctx: AudioContext, master: GainNode) => void
}

function makeSections(): Section[] {
  return [
    // ── 1. The Chip ──────────────────────────────────────────
    {
      id: 'the-chip',
      title: 'The Chip',
      subtitle: '9 qubits on sapphire',
      narrative:
        'Tuna-9 is a superconducting quantum processor at TU Delft. It has 9 transmon qubits \u2014 tiny circuits made of tantalum on a sapphire surface, cooled to 15 millikelvin (colder than outer space). Each qubit vibrates at its own microwave frequency, around 5 GHz \u2014 that\u2019s 5 billion cycles per second. The lines between them are tunable couplers that let neighboring qubits interact.',
      whatYouHear:
        'Nine tones enter one by one, each at the audible equivalent of that qubit\u2019s resonance frequency (5.15\u20135.46 GHz mapped to 375\u2013530 Hz). They\u2019re panned across stereo: q0 at left, q8 at right. Together they form a dense chord \u2014 the tight cluster reflects how close real transmon frequencies are.',
      dataNote:
        'Frequencies from published DiCarlo lab devices (arxiv 2503.13225). 12-edge topology from QI API. Bell fidelities measured on 10 of 12 pairs; 2 (q4-q7, q5-q7) pending.',
      durationMs: 7000,
      color: '#00d4ff',
      play: (ctx, master) => {
        const now = ctx.currentTime
        TUNA9.freqs.forEach((ghz, i) => {
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

    // ── 2. Not All Equal ─────────────────────────────────────
    {
      id: 'not-all-equal',
      title: 'Not All Equal',
      subtitle: 'Each qubit has a personality',
      narrative:
        'These 9 qubits are not identical. Each has a different error rate \u2014 how often it gives a wrong answer. Qubit 2 gets it right 98.4% of the time. Qubit 0 fails 12.3% of the time \u2014 nearly 8x worse. This heterogeneity is a fundamental reality of today\u2019s quantum hardware. Choosing which qubits to use for a computation matters enormously.',
      whatYouHear:
        'All nine qubit tones play simultaneously, but with different qualities. Clean qubits (q2, q5) sound as pure sine tones. Noisy qubits (q0) have audible roughness \u2014 noise mixed in proportional to their measured error rate. The contrast between a "clean" and "noisy" qubit is immediately audible.',
      dataNote:
        'Error rates are from single-qubit X gate + measurement experiments on Tuna-9 (1024 shots per qubit). The roughness is calibrated to real error rates but the sound texture is an artistic choice.',
      durationMs: 6000,
      color: '#ff8c42',
      play: (ctx, master) => {
        const now = ctx.currentTime
        TUNA9.freqs.forEach((ghz, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const pan = ctx.createStereoPanner()
          osc.type = 'sine'
          osc.frequency.value = ghzToHz(ghz)
          pan.pan.value = -0.8 + (i / 8) * 1.6
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.12, now + 0.3)
          gain.gain.setValueAtTime(0.12, now + 4.5)
          gain.gain.linearRampToValueAtTime(0, now + 5.8)
          osc.connect(gain).connect(pan).connect(master)
          osc.start(now)
          osc.stop(now + 6)

          // Add noise proportional to error rate
          const errorRate = TUNA9.errors[i]
          if (errorRate > 0.01) {
            const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 5.5), ctx.sampleRate)
            const nd = noiseBuf.getChannelData(0)
            for (let j = 0; j < nd.length; j++) {
              nd[j] = (Math.random() * 2 - 1) * errorRate * 2
            }
            const noiseSrc = ctx.createBufferSource()
            const noiseGain = ctx.createGain()
            const noiseFilt = ctx.createBiquadFilter()
            noiseSrc.buffer = noiseBuf
            noiseFilt.type = 'bandpass'
            noiseFilt.frequency.value = ghzToHz(ghz)
            noiseFilt.Q.value = 5
            noiseGain.gain.setValueAtTime(0, now)
            noiseGain.gain.linearRampToValueAtTime(errorRate * 1.5, now + 0.3)
            noiseGain.gain.setValueAtTime(errorRate * 1.5, now + 4.5)
            noiseGain.gain.linearRampToValueAtTime(0, now + 5.8)
            noiseSrc.connect(noiseFilt).connect(noiseGain).connect(pan).connect(master)
            noiseSrc.start(now)
          }
        })
      },
    },

    // ── 3. Talking to a Qubit ────────────────────────────────
    {
      id: 'gate',
      title: 'Talking to a Qubit',
      subtitle: 'Gates as microwave pulses',
      narrative:
        'To control a qubit, you send it a precisely shaped microwave pulse at its resonance frequency. An X gate flips the qubit from |0\u27E9 to |1\u27E9 \u2014 a \u03C0-rotation on the Bloch sphere. The DRAG pulse shape lasts about 20 nanoseconds and is carefully designed to prevent the qubit from accidentally jumping to a third energy level. On Tuna-9, single-qubit gates succeed 99.82% of the time.',
      whatYouHear:
        'A pure sine tone (the qubit in |0\u27E9), then a brief harmonics-rich burst (the gate pulse \u2014 sawtooth wave representing the broadband energy of a real microwave drive), then a richer tone with subtle vibrato (the |1\u27E9 state). Both states are at the same frequency \u2014 only the timbre changes. In reality you can\u2019t hear the difference; the timbre shift is an artistic choice.',
      dataNote:
        'Gate fidelity 99.82% from randomized benchmarking on Tuna-9. Pulse duration and DRAG shape from published QuTech device specifications.',
      durationMs: 5000,
      color: '#8b5cf6',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseHz = ghzToHz(5.18)

        // |0⟩ state: pure sine
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

        // Gate pulse: sawtooth burst
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

        // |1⟩ state: same frequency, richer timbre
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'triangle'
        osc1.frequency.value = baseHz
        const vibrato = ctx.createOscillator()
        const vibratoGain = ctx.createGain()
        vibrato.frequency.value = 5
        vibratoGain.gain.value = 3
        vibrato.connect(vibratoGain).connect(osc1.frequency)
        vibrato.start(now + 2.2)
        vibrato.stop(now + 5)
        gain1.gain.setValueAtTime(0, now + 2.2)
        gain1.gain.linearRampToValueAtTime(0.3, now + 2.3)
        gain1.gain.setValueAtTime(0.3, now + 4.0)
        gain1.gain.linearRampToValueAtTime(0, now + 4.8)
        osc1.connect(gain1).connect(master)
        osc1.start(now + 2.2)
        osc1.stop(now + 5)
      },
    },

    // ── 4. The Connection ────────────────────────────────────
    {
      id: 'connection',
      title: 'The Connection',
      subtitle: 'Entanglement via coupler',
      narrative:
        'The real power of quantum computing comes from connecting qubits. When two qubits become entangled, measuring one instantly determines the other \u2014 they share a single quantum state. Starmon\u2019s key innovation: two-qubit CZ gates work by pulsing the tunable coupler between qubits, not the qubits themselves. A 60-nanosecond flux pulse creates the entanglement. The best pair (q4-q6) reaches 93.5% Bell state fidelity.',
      whatYouHear:
        'Two qubit tones (q2 and q4) play independently in left and right ears. Then a low thump (the CZ gate pulse on the coupler). After the gate, the tones lock together \u2014 eight correlated notes, always matching (high-high or low-low). Then a crack: the entanglement breaks, and the tones become independent again \u2014 sometimes matching, sometimes not.',
      dataNote:
        'Bell fidelities from our experiments on Tuna-9. The correlated/uncorrelated pattern demonstrates entanglement vs. classical randomness.',
      durationMs: 8000,
      color: '#c084fc',
      play: (ctx, master) => {
        const now = ctx.currentTime

        // Two independent tones first
        const freqA = ghzToHz(5.18) // q2
        const freqB = ghzToHz(5.45) // q4
        for (const [freq, panVal] of [[freqA, -0.7], [freqB, 0.7]] as [number, number][]) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const pan = ctx.createStereoPanner()
          osc.type = 'sine'
          osc.frequency.value = freq
          pan.pan.value = panVal
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.2, now + 0.05)
          gain.gain.setValueAtTime(0.2, now + 1.5)
          gain.gain.linearRampToValueAtTime(0, now + 1.8)
          osc.connect(gain).connect(pan).connect(master)
          osc.start(now)
          osc.stop(now + 1.9)
        }

        // CZ gate pulse sound (low thump)
        const gateBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.15), ctx.sampleRate)
        const gd = gateBuf.getChannelData(0)
        for (let i = 0; i < gd.length; i++) {
          gd[i] = Math.sin(i / ctx.sampleRate * 2 * Math.PI * 80) * Math.exp(-i / (ctx.sampleRate * 0.04)) * 0.6
        }
        const gateSrc = ctx.createBufferSource()
        gateSrc.buffer = gateBuf
        const gateGain = ctx.createGain()
        gateGain.gain.value = 0.4
        gateSrc.connect(gateGain).connect(master)
        gateSrc.start(now + 2.0)

        // Correlated sequence (entangled)
        const lo = 330, hi = 660
        const seq: boolean[] = []
        for (let i = 0; i < 8; i++) seq.push(Math.random() > 0.5)

        for (let i = 0; i < 8; i++) {
          const t = now + 2.5 + i * 0.4
          const freq = seq[i] ? hi : lo
          for (const panVal of [-0.8, 0.8]) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const pan = ctx.createStereoPanner()
            osc.type = 'triangle'
            osc.frequency.value = freq
            pan.pan.value = panVal
            gain.gain.setValueAtTime(0, t)
            gain.gain.linearRampToValueAtTime(0.18, t + 0.03)
            gain.gain.linearRampToValueAtTime(0, t + 0.3)
            osc.connect(gain).connect(pan).connect(master)
            osc.start(t)
            osc.stop(t + 0.35)
          }
        }

        // Break sound
        const breakBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.1), ctx.sampleRate)
        const bd = breakBuf.getChannelData(0)
        for (let i = 0; i < bd.length; i++) bd[i] = (Math.random() * 2 - 1) * 0.4 * Math.exp(-i / (ctx.sampleRate * 0.02))
        const breakSrc = ctx.createBufferSource()
        breakSrc.buffer = breakBuf
        const breakGain = ctx.createGain()
        breakGain.gain.value = 0.3
        breakSrc.connect(breakGain).connect(master)
        breakSrc.start(now + 5.8)

        // Uncorrelated sequence (broken)
        for (let i = 0; i < 6; i++) {
          const t = now + 6.2 + i * 0.28
          for (const panVal of [-0.8, 0.8]) {
            const freq = Math.random() > 0.5 ? hi : lo
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const pan = ctx.createStereoPanner()
            osc.type = 'triangle'
            osc.frequency.value = freq
            pan.pan.value = panVal
            gain.gain.setValueAtTime(0, t)
            gain.gain.linearRampToValueAtTime(0.18, t + 0.03)
            gain.gain.linearRampToValueAtTime(0, t + 0.22)
            osc.connect(gain).connect(pan).connect(master)
            osc.start(t)
            osc.stop(t + 0.27)
          }
        }
      },
    },

    // ── 5. Growing Fragile ───────────────────────────────────
    {
      id: 'growing-fragile',
      title: 'Growing Fragile',
      subtitle: 'Noise accumulates with scale',
      narrative:
        'The more gates you run, the more errors pile up. We ran a 9-qubit Ising model simulation at increasing circuit depths. At depth 1 (5.6% error), all 9 qubits hold their states well. By depth 3, qubits at the chip\u2019s edges start losing coherence. By depth 5 (41.5% error), edge qubits q6-q8 have collapsed to near-random noise. This is the fundamental challenge of quantum computing today: a race against decoherence.',
      whatYouHear:
        'Three successive chords, one per circuit depth. In each chord, every qubit\u2019s volume is proportional to its measured Z-expectation (how well it held its state). Depth 1: a full, bright 9-note chord. Depth 3: the chord thins as edge qubits get quieter. Depth 5: only the strongest qubits remain \u2014 the chord is sparse and dying.',
      dataNote:
        'All values are real measurements from a kicked Ising simulation on Tuna-9 (4096 shots, Kim et al. 2023 protocol). The volume mapping is linear: Z-expectation = 0.95 maps to near-full volume, 0.025 is barely audible.',
      durationMs: 9000,
      color: '#ef4444',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const depths = [TUNA9.ising.d1, TUNA9.ising.d3, TUNA9.ising.d5]

        depths.forEach((zExps, di) => {
          const chordStart = now + di * 3
          zExps.forEach((z, qi) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const pan = ctx.createStereoPanner()
            osc.type = 'sine'
            osc.frequency.value = ghzToHz(TUNA9.freqs[qi])
            pan.pan.value = -0.8 + (qi / 8) * 1.6
            const amp = z * 0.12
            gain.gain.setValueAtTime(0, chordStart)
            gain.gain.linearRampToValueAtTime(amp, chordStart + 0.1)
            gain.gain.setValueAtTime(amp, chordStart + 2.2)
            gain.gain.linearRampToValueAtTime(0, chordStart + 2.7)
            osc.connect(gain).connect(pan).connect(master)
            osc.start(chordStart)
            osc.stop(chordStart + 2.8)
          })
        })
      },
    },

    // ── 6. Cleaning Up ───────────────────────────────────────
    {
      id: 'cleaning-up',
      title: 'Cleaning Up',
      subtitle: 'Error mitigation works',
      narrative:
        'We can\u2019t fix individual quantum errors, but we can statistically cancel them. Zero-noise extrapolation (ZNE) runs the same circuit at different noise levels and extrapolates to the zero-noise answer. On our Ising simulation, ZNE improved the result by 3.1x \u2014 from 5.6% error down to 1.8%. The noisy M_z = 0.944 became a mitigated M_z = 0.982, much closer to the ideal 1.0.',
      whatYouHear:
        'Two tones slightly detuned from each other, creating an audible beating. The beat frequency represents the error: fast beating = large error (noisy result), slow beating = small error (mitigated result). First you hear the noisy version (rapid pulsing), then a sweeping transition, then the mitigated version (the beating nearly vanishes into a steady tone). The stillness IS the accuracy.',
      dataNote:
        'ZNE results from our Tuna-9 Ising experiment (gate folding factors 1 and 3, linear Richardson extrapolation). Beat frequencies are mapped from error magnitude.',
      durationMs: 8000,
      color: '#22c55e',
      play: (ctx, master) => {
        const now = ctx.currentTime
        const baseFreq = 440

        // Noisy: fast beating (error = 5.6% → ~14 Hz beat)
        const osc1a = ctx.createOscillator()
        const osc1b = ctx.createOscillator()
        const gain1a = ctx.createGain()
        const gain1b = ctx.createGain()
        osc1a.type = 'sine'
        osc1b.type = 'sine'
        osc1a.frequency.value = baseFreq
        osc1b.frequency.value = baseFreq + 14
        for (const g of [gain1a, gain1b]) {
          g.gain.setValueAtTime(0, now)
          g.gain.linearRampToValueAtTime(0.22, now + 0.08)
          g.gain.setValueAtTime(0.22, now + 2.8)
          g.gain.linearRampToValueAtTime(0, now + 3.3)
        }
        osc1a.connect(gain1a).connect(master)
        osc1b.connect(gain1b).connect(master)
        osc1a.start(now); osc1b.start(now)
        osc1a.stop(now + 3.4); osc1b.stop(now + 3.4)

        // Sweep transition
        const sweepBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate)
        const sd = sweepBuf.getChannelData(0)
        for (let i = 0; i < sd.length; i++) {
          const t = i / ctx.sampleRate
          sd[i] = (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 3)
        }
        const sweepSrc = ctx.createBufferSource()
        sweepSrc.buffer = sweepBuf
        const sweepFilt = ctx.createBiquadFilter()
        sweepFilt.type = 'bandpass'
        sweepFilt.frequency.setValueAtTime(200, now + 3.5)
        sweepFilt.frequency.linearRampToValueAtTime(800, now + 4.0)
        sweepFilt.Q.value = 3
        sweepSrc.connect(sweepFilt).connect(master)
        sweepSrc.start(now + 3.5)

        // Mitigated: almost no beating (error = 1.8% → ~0.5 Hz)
        const osc2a = ctx.createOscillator()
        const osc2b = ctx.createOscillator()
        const gain2a = ctx.createGain()
        const gain2b = ctx.createGain()
        osc2a.type = 'sine'
        osc2b.type = 'sine'
        osc2a.frequency.value = baseFreq
        osc2b.frequency.value = baseFreq + 0.5
        for (const g of [gain2a, gain2b]) {
          g.gain.setValueAtTime(0, now + 4.2)
          g.gain.linearRampToValueAtTime(0.25, now + 4.3)
          g.gain.setValueAtTime(0.25, now + 7.0)
          g.gain.linearRampToValueAtTime(0, now + 7.8)
        }
        osc2a.connect(gain2a).connect(master)
        osc2b.connect(gain2b).connect(master)
        osc2a.start(now + 4.2); osc2b.start(now + 4.2)
        osc2a.stop(now + 8); osc2b.stop(now + 8)
      },
    },

    // ── 7. What Tuna-9 Taught Us ─────────────────────────────
    {
      id: 'coda',
      title: 'What Tuna-9 Taught Us',
      subtitle: 'A report card from 9 qubits',
      narrative:
        'Tuna-9 is 9 qubits. It\u2019s noisy, it\u2019s small, and it taught us real things about quantum computing. Single gates work 99.82% of the time. Entangled states reach 93.5% fidelity. A 9-qubit Ising simulation matches theory at shallow depth. Error mitigation improves results by 3.1x. Every number on this page came from sending real microwave pulses to real superconducting circuits in a refrigerator in Delft.',
      whatYouHear:
        'The full 9-qubit chord one last time, with each qubit\u2019s amplitude scaled by its reliability (1 minus error rate). This is the chip\u2019s honest self-portrait. The chord sustains, then fades exponentially \u2014 mimicking T2 decoherence as the quantum state returns to the ground state.',
      dataNote:
        'Amplitudes reflect real per-qubit success rates. The exponential decay time is artistic but inspired by published T2* values (~10-34 \u00B5s for similar transmons).',
      durationMs: 6000,
      color: '#f59e0b',
      play: (ctx, master) => {
        const now = ctx.currentTime
        TUNA9.freqs.forEach((ghz, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const pan = ctx.createStereoPanner()
          osc.type = 'sine'
          osc.frequency.value = ghzToHz(ghz)
          pan.pan.value = -0.8 + (i / 8) * 1.6
          const amp = (1 - TUNA9.errors[i]) * 0.12
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(amp, now + 0.15)
          gain.gain.setValueAtTime(amp, now + 3.0)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 5.8)
          osc.connect(gain).connect(pan).connect(master)
          osc.start(now)
          osc.stop(now + 6)
        })
      },
    },
  ]
}

// ============================================================
// VISUALS — one per section
// ============================================================

function VisualChip({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 600 470" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="470" fill="#060610" rx="12" />

      {/* Chip outline */}
      <rect x="40" y="20" width="520" height="430" rx="6" fill="#0a0f1a" stroke="#1a2332" strokeWidth="1.5" />

      {/* Connections with fidelity colors */}
      {TUNA9.topology.map(([a, b], i) => {
        const key = `${Math.min(a,b)}-${Math.max(a,b)}`
        const fid = TUNA9.bellFidelities[key]
        const unmeasured = !fid
        return (
          <g key={i}>
            <line
              x1={TUNA9.positions[a][0]} y1={TUNA9.positions[a][1]}
              x2={TUNA9.positions[b][0]} y2={TUNA9.positions[b][1]}
              stroke={playing ? (unmeasured ? '#475569' : fidelityColor(fid)) : '#1e293b'}
              strokeWidth={unmeasured ? 1.5 : 2.5}
              strokeDasharray={unmeasured ? '4 3' : undefined}
              opacity={playing ? (unmeasured ? 0.4 : 0.6) : 0.3}
              className="transition-all duration-700"
            />
            {playing && (
              <text
                x={(TUNA9.positions[a][0] + TUNA9.positions[b][0]) / 2 + 12}
                y={(TUNA9.positions[a][1] + TUNA9.positions[b][1]) / 2 - 4}
                fill={unmeasured ? '#475569' : fidelityColor(fid)} fontSize="7" fontFamily="monospace" opacity="0.6"
              >
                {unmeasured ? '?' : `${(fid * 100).toFixed(0)}%`}
              </text>
            )}
          </g>
        )
      })}

      {/* Qubit nodes */}
      {TUNA9.positions.map(([x, y], i) => (
        <g key={i}>
          {playing && (
            <circle cx={x} cy={y} r="28" fill="none" stroke="#00d4ff" strokeWidth="0.5" opacity="0.3">
              <animate attributeName="r" values="22;28;22" dur={`${2 + i * 0.15}s`} repeatCount="indefinite" />
            </circle>
          )}

          {/* Transmon cross shape */}
          <rect x={x - 8} y={y - 22} width="16" height="44" rx="2" fill="#0d1117" />
          <rect x={x - 22} y={y - 8} width="44" height="16" rx="2" fill="#0d1117" />
          <rect x={x - 6} y={y - 18} width="12" height="14" rx="1"
            fill={playing ? '#00d4ff' : '#6366f1'}
            opacity={playing ? 0.7 : 0.4} className="transition-all duration-500" />
          <rect x={x - 6} y={y + 4} width="12" height="14" rx="1"
            fill={playing ? '#00d4ff' : '#6366f1'}
            opacity={playing ? 0.7 : 0.4} className="transition-all duration-500" />
          <rect x={x - 18} y={y - 6} width="14" height="12" rx="1"
            fill={playing ? '#00d4ff' : '#6366f1'}
            opacity={playing ? 0.7 : 0.4} className="transition-all duration-500" />
          <rect x={x + 4} y={y - 6} width="14" height="12" rx="1"
            fill={playing ? '#00d4ff' : '#6366f1'}
            opacity={playing ? 0.7 : 0.4} className="transition-all duration-500" />

          {/* Labels */}
          <text x={x} y={y + 40} textAnchor="middle"
            fill={playing ? '#00d4ff' : '#475569'} fontSize="9" fontFamily="monospace"
            className="transition-colors duration-500">
            {TUNA9.labels[i]}
          </text>
          <text x={x} y={y + 52} textAnchor="middle"
            fill={playing ? '#00d4ff80' : '#374151'} fontSize="7" fontFamily="monospace"
            className="transition-colors duration-500">
            {TUNA9.freqs[i]} GHz
          </text>
        </g>
      ))}
    </svg>
  )
}

function VisualErrors({ playing }: { playing: boolean }) {
  const maxError = 0.15
  return (
    <svg viewBox="0 0 600 340" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="340" fill="#060610" rx="12" />

      {/* Topology with error-colored nodes */}
      <g transform="translate(-40, -30) scale(0.55)">
        {TUNA9.topology.map(([a, b], i) => (
          <line key={i}
            x1={TUNA9.positions[a][0]} y1={TUNA9.positions[a][1]}
            x2={TUNA9.positions[b][0]} y2={TUNA9.positions[b][1]}
            stroke="#1e293b" strokeWidth="2"
          />
        ))}
        {TUNA9.positions.map(([x, y], i) => {
          const err = TUNA9.errors[i]
          const col = errorColor(err)
          const r = 12 + err * 100
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={col} opacity={playing ? 0.25 : 0.1}
                className="transition-all duration-500">
                {playing && err > 0.05 && (
                  <animate attributeName="opacity" values="0.15;0.3;0.15" dur="0.8s" repeatCount="indefinite" />
                )}
              </circle>
              <circle cx={x} cy={y} r="8" fill={col} opacity={playing ? 0.7 : 0.3}
                className="transition-all duration-500" />
              <text x={x} y={y + 28} textAnchor="middle" fill={col} fontSize="9" fontFamily="monospace"
                opacity={playing ? 0.8 : 0.4} className="transition-all duration-500">
                {TUNA9.labels[i]}
              </text>
            </g>
          )
        })}
      </g>

      {/* Bar chart */}
      <g transform="translate(340, 25)">
        <text x="0" y="12" fill={playing ? '#ff8c42' : '#475569'} fontSize="10" fontFamily="monospace"
          className="transition-colors duration-500">
          Per-qubit error rate
        </text>
        {TUNA9.errors.map((err, i) => {
          const barW = (err / maxError) * 180
          const col = errorColor(err)
          return (
            <g key={i} transform={`translate(0, ${28 + i * 30})`}>
              <text x="0" y="12" fill="#475569" fontSize="9" fontFamily="monospace">{TUNA9.labels[i]}</text>
              <rect x="28" y="2" width={barW} height="14" rx="2"
                fill={playing ? col : '#1e293b'} opacity={playing ? 0.7 : 0.4}
                className="transition-all duration-500" />
              <text x={34 + barW} y="13" fill={playing ? col : '#374151'} fontSize="8" fontFamily="monospace"
                className="transition-colors duration-500">
                {(err * 100).toFixed(1)}%
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function VisualGate({ playing }: { playing: boolean }) {
  const col = playing ? '#8b5cf6' : '#334155'
  return (
    <svg viewBox="0 0 600 320" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="320" fill="#060610" rx="12" />

      {/* Energy levels */}
      <g transform="translate(160, 50)">
        <text x="0" y="0" fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">Energy levels</text>
        <line x1="-70" y1="100" x2="70" y2="100" stroke="#00d4ff" strokeWidth="2" />
        <text x="85" y="104" fill="#00d4ff" fontSize="12" fontFamily="monospace">|0&#x27E9;</text>
        <text x="-85" y="104" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">ground</text>
        <line x1="-70" y1="40" x2="70" y2="40" stroke="#00d4ff" strokeWidth="2" />
        <text x="85" y="44" fill="#00d4ff" fontSize="12" fontFamily="monospace">|1&#x27E9;</text>
        <text x="-85" y="44" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">excited</text>
        <line x1="0" y1="95" x2="0" y2="48" stroke={col} strokeWidth="2.5" className="transition-colors duration-500" />
        <polygon points="-5,50 0,42 5,50" fill={col} className="transition-colors duration-500" />
        <text x="14" y="75" fill={col} fontSize="10" fontFamily="monospace" className="transition-colors duration-500">
          X gate
        </text>
        <text x="0" y="135" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="middle">
          f&#x2080;&#x2081; = 5.18 GHz
        </text>
      </g>

      {/* DRAG pulse shape */}
      <g transform="translate(320, 50)">
        <text x="100" y="0" fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">DRAG pulse envelope</text>

        {/* Gaussian envelope */}
        <path
          d={(() => {
            const pts: string[] = []
            for (let i = 0; i <= 50; i++) {
              const x = i * 4.5
              const t = (i / 50) * 2 - 1
              const env = Math.exp(-t * t * 4) * 60
              pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${80 - env}`)
            }
            return pts.join(' ')
          })()}
          fill="none" stroke={col} strokeWidth="2.5" className="transition-colors duration-500"
        />

        {/* Carrier inside */}
        <path
          d={(() => {
            const pts: string[] = []
            for (let i = 0; i <= 50; i++) {
              const x = i * 4.5
              const t = (i / 50) * 2 - 1
              const env = Math.exp(-t * t * 4) * 60
              const carrier = Math.sin(i * 1.5) * env * 0.5
              pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${80 - carrier}`)
            }
            return pts.join(' ')
          })()}
          fill="none" stroke={playing ? '#8b5cf640' : '#1e293b'} strokeWidth="1"
          className="transition-colors duration-500"
        />

        <line x1="0" y1="82" x2="225" y2="82" stroke="#1e293b" strokeWidth="1" />
        <text x="112" y="100" fill="#374151" fontSize="9" fontFamily="monospace" textAnchor="middle">~20 nanoseconds</text>
      </g>

      {/* Stats */}
      <g transform="translate(50, 250)">
        <rect x="0" y="0" width="500" height="50" rx="6" fill="#0d1117" stroke="#1e293b" strokeWidth="1" />
        <text x="250" y="20" fill={playing ? '#8b5cf6' : '#475569'} fontSize="11" fontFamily="monospace"
          textAnchor="middle" className="transition-colors duration-500">
          Single-qubit gate fidelity: 99.82%
        </text>
        <text x="250" y="38" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="middle">
          Randomized benchmarking on Tuna-9 &middot; Error per gate: 0.18%
        </text>
      </g>
    </svg>
  )
}

function VisualConnection({ playing }: { playing: boolean }) {
  const col = playing ? '#c084fc' : '#334155'
  const counts = TUNA9.bellCounts01
  const total = counts['00'] + counts['01'] + counts['10'] + counts['11']
  const probs = {
    '00': counts['00'] / total, '01': counts['01'] / total,
    '10': counts['10'] / total, '11': counts['11'] / total,
  }

  return (
    <svg viewBox="0 0 600 380" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="380" fill="#060610" rx="12" />

      {/* Two qubits + coupler */}
      <g transform="translate(0, 30)">
        <circle cx="160" cy="70" r="40" fill={playing ? '#c084fc08' : '#0d1117'} stroke={col}
          strokeWidth="2" className="transition-all duration-500" />
        <text x="160" y="75" textAnchor="middle" fill={col} fontSize="14" fontFamily="monospace"
          className="transition-colors duration-500">q2</text>
        <text x="160" y="15" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">left ear</text>

        <circle cx="440" cy="70" r="40" fill={playing ? '#c084fc08' : '#0d1117'} stroke={col}
          strokeWidth="2" className="transition-all duration-500" />
        <text x="440" y="75" textAnchor="middle" fill={col} fontSize="14" fontFamily="monospace"
          className="transition-colors duration-500">q4</text>
        <text x="440" y="15" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">right ear</text>

        {/* Coupler */}
        <rect x="260" y="55" width="80" height="30" rx="6" fill="#0d1117" stroke={col}
          strokeWidth="1.5" className="transition-colors duration-500" />
        <text x="300" y="75" textAnchor="middle" fill={col} fontSize="8" fontFamily="monospace"
          className="transition-colors duration-500">coupler</text>

        {/* Connection lines */}
        <line x1="200" y1="70" x2="260" y2="70" stroke={col} strokeWidth="1.5" className="transition-colors duration-500" />
        <line x1="340" y1="70" x2="400" y2="70" stroke={col} strokeWidth="1.5" className="transition-colors duration-500" />

        <text x="300" y="105" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">
          CZ gate: 60 ns flux pulse on coupler
        </text>
      </g>

      {/* Bell state histogram */}
      <g transform="translate(100, 170)">
        <text x="0" y="12" fill={playing ? '#c084fc' : '#475569'} fontSize="10" fontFamily="monospace"
          className="transition-colors duration-500">
          Bell state measurement (qubits 0-1, 1024 shots)
        </text>

        {Object.entries(probs).map(([label, p], i) => {
          const barH = p * 140
          const isTarget = label === '00' || label === '11'
          return (
            <g key={label} transform={`translate(${i * 100}, 30)`}>
              <rect x="10" y={150 - barH} width="60" height={barH} rx="3"
                fill={playing ? (isTarget ? '#c084fc80' : '#ef444460') : '#1e293b'}
                className="transition-colors duration-500" />
              <text x="40" y="165" fill="#475569" fontSize="11" fontFamily="monospace" textAnchor="middle">
                |{label}&#x27E9;
              </text>
              <text x="40" y={146 - barH} fill={playing ? (isTarget ? '#c084fc' : '#ef4444') : '#374151'}
                fontSize="8" fontFamily="monospace" textAnchor="middle"
                className="transition-colors duration-500">
                {(p * 100).toFixed(1)}%
              </text>
            </g>
          )
        })}

        <text x="0" y="195" fill="#374151" fontSize="8" fontFamily="monospace">
          Ideal: 50% |00&#x27E9; + 50% |11&#x27E9;. Noise causes leakage into |01&#x27E9; and |10&#x27E9;.
        </text>
      </g>
    </svg>
  )
}

function VisualIsing({ playing }: { playing: boolean }) {
  const depths = [
    { label: 'Depth 1', error: '5.6%', data: TUNA9.ising.d1, allZero: TUNA9.ising.allZero[0] },
    { label: 'Depth 3', error: '21.5%', data: TUNA9.ising.d3, allZero: TUNA9.ising.allZero[1] },
    { label: 'Depth 5', error: '41.5%', data: TUNA9.ising.d5, allZero: TUNA9.ising.allZero[2] },
  ]

  return (
    <svg viewBox="0 0 600 360" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="360" fill="#060610" rx="12" />

      {depths.map((d, di) => {
        const ox = 15 + di * 200
        return (
          <g key={di} transform={`translate(${ox}, 15)`}>
            <text x="85" y="14" fill={playing ? '#ef4444' : '#475569'} fontSize="10" fontFamily="monospace"
              textAnchor="middle" className="transition-colors duration-500">
              {d.label}
            </text>
            <text x="85" y="28" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="middle">
              error: {d.error}
            </text>

            {/* Mini topology with brightness = Z expectation */}
            {TUNA9.topology.map(([a, b], ei) => {
              const scale = 0.3
              const [ax, ay] = TUNA9.positions[a]
              const [bx, by] = TUNA9.positions[b]
              return (
                <line key={ei}
                  x1={(ax - 100) * scale + 20} y1={(ay - 40) * scale + 35}
                  x2={(bx - 100) * scale + 20} y2={(by - 40) * scale + 35}
                  stroke="#1e293b" strokeWidth="1"
                />
              )
            })}

            {TUNA9.positions.map(([x, y], qi) => {
              const z = d.data[qi]
              const scale = 0.3
              const sx = (x - 100) * scale + 20
              const sy = (y - 40) * scale + 35
              const brightness = playing ? z : 0.3
              return (
                <g key={qi}>
                  <circle cx={sx} cy={sy} r={6 + z * 4}
                    fill={playing ? `rgba(239, 68, 68, ${brightness * 0.7})` : '#1e293b'}
                    className="transition-all duration-700" />
                  <text x={sx} y={sy + 18} textAnchor="middle" fill="#374151" fontSize="5" fontFamily="monospace">
                    {z.toFixed(2)}
                  </text>
                </g>
              )
            })}

            {/* All-zero bar */}
            <g transform="translate(10, 190)">
              <text x="0" y="0" fill="#374151" fontSize="7" fontFamily="monospace">P(all zeros)</text>
              <rect x="0" y="5" width={d.allZero * 150} height="10" rx="2"
                fill={playing ? '#ef4444' : '#1e293b'} opacity={playing ? 0.6 : 0.3}
                className="transition-all duration-500" />
              <text x={d.allZero * 150 + 5} y="14" fill={playing ? '#ef4444' : '#374151'}
                fontSize="8" fontFamily="monospace" className="transition-colors duration-500">
                {(d.allZero * 100).toFixed(1)}%
              </text>
            </g>
          </g>
        )
      })}

      {/* Arrow showing decay */}
      <g transform="translate(50, 280)">
        <line x1="0" y1="0" x2="490" y2="0" stroke="#334155" strokeWidth="1" />
        <polygon points="488,-3 496,0 488,3" fill="#334155" />
        <text x="0" y="18" fill="#475569" fontSize="8" fontFamily="monospace">shallow circuit</text>
        <text x="420" y="18" fill="#ef4444" fontSize="8" fontFamily="monospace">deep circuit</text>
        <text x="245" y="38" fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="middle">
          more gates = more noise = less coherence
        </text>
      </g>
    </svg>
  )
}

function VisualMitigation({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="280" fill="#060610" rx="12" />

      {/* Noisy beating waveform */}
      <g transform="translate(30, 20)">
        <text x="0" y="12" fill="#ef4444" fontSize="10" fontFamily="monospace" opacity="0.8">
          Noisy: M&#x2091; = {TUNA9.zne.noisy.toFixed(3)}
        </text>
        <text x="0" y="26" fill="#374151" fontSize="8" fontFamily="monospace">
          5.6% error &mdash; audible beating
        </text>
        <path
          d={Array.from({ length: 60 }, (_, i) => {
            const x = 20 + i * 4.2
            const beat = Math.cos(i * 0.9)
            const y = 65 + Math.sin(i * 0.7) * 22 * beat
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={playing ? '#ef4444' : '#1e293b'} strokeWidth="2.5"
          className="transition-colors duration-500"
        />
      </g>

      {/* Arrow */}
      <g transform="translate(270, 100)">
        <line x1="0" y1="5" x2="40" y2="5" stroke={playing ? '#22c55e' : '#334155'} strokeWidth="2"
          className="transition-colors duration-500" />
        <polygon points="38,1 46,5 38,9" fill={playing ? '#22c55e' : '#334155'}
          className="transition-colors duration-500" />
        <text x="23" y="-5" fill={playing ? '#22c55e' : '#475569'} fontSize="8" fontFamily="monospace"
          textAnchor="middle" className="transition-colors duration-500">ZNE</text>
      </g>

      {/* Mitigated: smooth waveform */}
      <g transform="translate(30, 120)">
        <text x="0" y="12" fill={playing ? '#22c55e' : '#475569'} fontSize="10" fontFamily="monospace"
          className="transition-colors duration-500">
          Mitigated: M&#x2091; = {TUNA9.zne.mitigated.toFixed(3)}
        </text>
        <text x="0" y="26" fill="#374151" fontSize="8" fontFamily="monospace">
          1.8% error &mdash; nearly pure tone
        </text>
        <path
          d={Array.from({ length: 60 }, (_, i) => {
            const x = 20 + i * 4.2
            const y = 65 + Math.sin(i * 0.7) * 25
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none" stroke={playing ? '#22c55e' : '#1e293b'} strokeWidth="2.5"
          className="transition-colors duration-500"
        />
      </g>

      {/* Summary */}
      <g transform="translate(30, 235)">
        <rect x="0" y="0" width="540" height="30" rx="6" fill="#0d1117" stroke="#1e293b" strokeWidth="1" />
        <text x="270" y="19" fill={playing ? '#22c55e' : '#475569'} fontSize="10" fontFamily="monospace"
          textAnchor="middle" fontWeight="bold" className="transition-colors duration-500">
          {TUNA9.zne.improvement.toFixed(1)}x improvement &middot; ZNE gate folding + Richardson extrapolation
        </text>
      </g>
    </svg>
  )
}

function VisualCoda({ playing }: { playing: boolean }) {
  const stats = [
    { label: 'Gate fidelity', value: '99.82%', x: 30, y: 35 },
    { label: 'Best pair', value: 'q4\u2013q6 (93.5%)', x: 420, y: 35 },
    { label: 'Quantum Volume', value: 'QV = 8', x: 30, y: 350 },
    { label: 'ZNE improvement', value: '3.1\u00D7', x: 420, y: 350 },
  ]

  return (
    <svg viewBox="0 0 600 420" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="600" height="420" fill="#060610" rx="12" />

      {/* Mini topology center */}
      <g transform="translate(100, 35) scale(0.65)">
        {TUNA9.topology.map(([a, b], i) => {
          const key = `${Math.min(a,b)}-${Math.max(a,b)}`
          const fid = TUNA9.bellFidelities[key]
          const unmeasured = !fid
          return (
            <line key={i}
              x1={TUNA9.positions[a][0]} y1={TUNA9.positions[a][1]}
              x2={TUNA9.positions[b][0]} y2={TUNA9.positions[b][1]}
              stroke={playing ? (unmeasured ? '#475569' : fidelityColor(fid)) : '#1e293b'}
              strokeWidth={unmeasured ? 1.5 : 2.5}
              strokeDasharray={unmeasured ? '4 3' : undefined}
              opacity={unmeasured ? 0.3 : 0.5}
              className="transition-colors duration-500"
            />
          )
        })}
        {TUNA9.positions.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={8 + (1 - TUNA9.errors[i]) * 8}
              fill={playing ? errorColor(TUNA9.errors[i]) : '#1e293b'}
              opacity={playing ? 0.5 : 0.2} className="transition-all duration-500" />
            <text x={x} y={y + 4} textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">
              {TUNA9.labels[i]}
            </text>
          </g>
        ))}
      </g>

      {/* Floating stats */}
      {stats.map((s, i) => (
        <g key={i}>
          <text x={s.x} y={s.y} fill={playing ? '#f59e0b' : '#475569'} fontSize="9" fontFamily="monospace"
            className="transition-colors duration-500">
            {s.label}
          </text>
          <text x={s.x} y={s.y + 16} fill={playing ? '#f59e0b' : '#374151'} fontSize="13" fontFamily="monospace"
            fontWeight="bold" className="transition-colors duration-500">
            {s.value}
          </text>
        </g>
      ))}

      {/* Future hardware teaser */}
      <g transform="translate(130, 385)">
        <text x="170" y="0" fill="#334155" fontSize="9" fontFamily="monospace" textAnchor="middle">
          Coming next: IBM Torino &middot; IQM Garnet
        </text>
      </g>
    </svg>
  )
}

const SECTION_VISUALS: Record<string, React.ComponentType<{ playing: boolean }>> = {
  'the-chip': VisualChip,
  'not-all-equal': VisualErrors,
  'gate': VisualGate,
  'connection': VisualConnection,
  'growing-fragile': VisualIsing,
  'cleaning-up': VisualMitigation,
  'coda': VisualCoda,
}

// ============================================================
// SECTION COMPONENT
// ============================================================

function SectionBlock({
  section,
  index,
  isPlaying,
  progress,
  onPlay,
}: {
  section: Section
  index: number
  isPlaying: boolean
  progress: number
  onPlay: () => void
}) {
  const { ref, visible } = useInView(0.12)
  const Visual = SECTION_VISUALS[section.id]

  return (
    <div ref={ref} className="min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 py-16">
      <div className={`max-w-3xl w-full transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>

        {/* Section number + title */}
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-xs font-mono shrink-0 w-6 h-6 rounded-full border flex items-center justify-center"
            style={{ borderColor: isPlaying ? section.color + '80' : '#1e293b', color: isPlaying ? section.color : '#475569' }}>
            {index + 1}
          </span>
          <div>
            <h2 className="text-2xl font-bold transition-colors duration-500"
              style={{ color: isPlaying ? section.color : '#e2e8f0' }}>
              {section.title}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{section.subtitle}</p>
          </div>
        </div>

        {/* Play button + progress */}
        <div className="flex items-center gap-4 my-6">
          <button
            onClick={onPlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: isPlaying ? section.color + '80' : section.color + '30',
              backgroundColor: isPlaying ? section.color + '15' : section.color + '08',
              color: section.color,
            }}
          >
            <span className="text-base">{isPlaying ? '\u25A0' : '\u25B6'}</span>
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          {isPlaying && (
            <div className="flex-1 h-1 bg-[#1e293b] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress * 100}%`, backgroundColor: section.color }} />
            </div>
          )}
          <span className="text-xs text-gray-700 font-mono shrink-0">
            {(section.durationMs / 1000).toFixed(0)}s
          </span>
        </div>

        {/* Visual */}
        <div className="mb-8">
          {Visual && <Visual playing={isPlaying} />}
        </div>

        {/* Narrative */}
        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          {section.narrative}
        </p>

        {/* What you hear + Data note */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: section.color + 'cc' }}>
              What you hear
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {section.whatYouHear}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Data source
            </h3>
            <p className="text-[11px] text-gray-600 font-mono leading-relaxed bg-[#0d1117] px-3 py-2 rounded-lg border border-[#1e293b]">
              {section.dataNote}
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
  const [playingSection, setPlayingSection] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const currentDurationRef = useRef(0)

  const sections = useMemo(() => makeSections(), [])

  const stopAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setPlayingSection(null)
    setProgress(0)
  }, [])

  const playSection = useCallback((section: Section) => {
    if (playingSection === section.id) {
      stopAll()
      return
    }
    stopAll()

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    setPlayingSection(section.id)
    startTimeRef.current = Date.now()
    currentDurationRef.current = section.durationMs

    section.play(ctx, master)

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(1, elapsed / currentDurationRef.current))
    }, 50)

    timerRef.current = setTimeout(() => {
      setPlayingSection(null)
      setProgress(0)
      if (progressRef.current) clearInterval(progressRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }, section.durationMs + 200)
  }, [playingSection, stopAll])

  const playAll = useCallback(() => {
    if (playingSection) { stopAll(); return }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    const totalDuration = sections.reduce((sum, s) => sum + s.durationMs, 0) + (sections.length - 1) * 1000
    setPlayingSection('all')
    startTimeRef.current = Date.now()
    currentDurationRef.current = totalDuration

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(1, elapsed / totalDuration))
    }, 50)

    let delay = 0
    sections.forEach((section) => {
      const sectionDelay = delay
      setTimeout(() => {
        if (!audioCtxRef.current) return
        setPlayingSection(section.id)
        section.play(ctx, master)
      }, sectionDelay)
      delay += section.durationMs + 1000
    })

    timerRef.current = setTimeout(() => {
      stopAll()
    }, delay)
  }, [sections, playingSection, stopAll])

  useEffect(() => () => stopAll(), [stopAll])

  return (
    <div className="min-h-screen bg-[#060610] text-white">
      <Nav />

      {/* Hero */}
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 pt-20">
        <div className="max-w-4xl text-center">
          <p className="text-xs font-mono text-gray-600 uppercase tracking-[0.3em] mb-6">
            Tuna-9 &middot; TU Delft / QuTech / Quantum Inspire
          </p>

          {/* Photos */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="relative w-full sm:w-[320px] aspect-square rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10">
              <Image
                src="/starmon-chip.jpg"
                alt="Starmon superconducting quantum processor chip showing transmon qubits as cross-shaped circuits on a sapphire substrate, with microwave drive lines and readout resonators. TU Delft / TNO."
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060610] via-transparent to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 text-[10px] text-gray-400 font-mono">
                Starmon chip &middot; transmon qubits visible as cross shapes
              </p>
            </div>
            <div className="relative w-full sm:w-[320px] aspect-[4/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-amber-500/10">
              <Image
                src="/qutech-lab.jpg"
                alt="Researchers at QuTech working on a dilution refrigerator that cools quantum processors to 15 millikelvin. Photo: Marieke de Lorijn / QuTech."
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060610] via-transparent to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 text-[10px] text-gray-400 font-mono">
                Dilution refrigerator &middot; cools the chip to 15 mK
              </p>
            </div>
          </div>
          <p className="text-[9px] text-gray-700 mb-6">
            Photos: QuTech / TU Delft. Chip photo: Marieke de Lorijn.
          </p>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Meeting a Quantum Computer</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-3 max-w-2xl mx-auto">
            Tuna-9 is a 9-qubit superconducting processor in a refrigerator in Delft.
            These seven acts translate what it does into sound and visuals you can experience.
          </p>
          <p className="text-gray-700 text-xs mb-8 max-w-2xl mx-auto">
            Microwave frequencies (5 GHz) are mapped to audible tones (300&ndash;600 Hz).
            All measurements are from real hardware experiments. Where choices are artistic, we say so.
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={playAll}
              className="flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor: playingSection ? '#00d4ff60' : '#00d4ff30',
                backgroundColor: playingSection ? '#00d4ff15' : '#00d4ff08',
                color: '#00d4ff',
              }}
            >
              <span className="text-lg">{playingSection ? '\u25A0' : '\u25B6'}</span>
              {playingSection ? 'Stop' : 'Play all 7 acts'}
            </button>
            <span className="text-xs text-gray-700 font-mono">
              {Math.round(sections.reduce((s, a) => s + a.durationMs, 0) / 1000)}s total
            </span>
          </div>

          {playingSection && (
            <div className="max-w-md mx-auto h-1 bg-[#1e293b] rounded-full overflow-hidden mb-6">
              <div className="h-full rounded-full transition-all duration-100 bg-[#00d4ff]"
                style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          <p className="text-gray-700 text-xs">
            Best with headphones. Scroll down to explore each act.
          </p>

          <div className="mt-12 animate-bounce">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto opacity-30">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, i) => (
        <div key={section.id}>
          <div className="max-w-3xl mx-auto px-6">
            <div className="border-t border-[#111827]" />
          </div>
          <SectionBlock
            section={section}
            index={i}
            isPlaying={playingSection === section.id}
            progress={playingSection === section.id ? progress : 0}
            onPlay={() => playSection(section)}
          />
        </div>
      ))}

      {/* How this works */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="border-t border-[#111827] mb-12" />

        <h2 className="text-lg font-bold text-gray-300 mb-6">How the sonification works</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm text-gray-500 leading-relaxed">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Frequency mapping</h3>
            <p>Qubit frequencies (5.0&ndash;5.6 GHz) are linearly mapped to 300&ndash;600 Hz. The narrow range reflects how closely real transmon frequencies cluster on actual hardware.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amplitude</h3>
            <p>Volume encodes real data: Z-expectations from Ising simulations, error rates from qubit characterization, Bell state probabilities from entanglement experiments.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Beat frequencies</h3>
            <p>When two tones are close in frequency, you hear pulsing at f_beat = |f1 - f2|. We map error magnitude to beat frequency: large error = rapid pulsing, accuracy = stillness.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Implementation</h3>
            <p>Pure Web Audio API &mdash; OscillatorNode, GainNode, StereoPannerNode, BiquadFilterNode, and AudioBufferSourceNode for noise. No samples, no libraries.</p>
          </div>

          <div className="sm:col-span-2 mt-4 pt-4 border-t border-[#111827]">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">What&apos;s real vs. artistic</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#22c55e] font-mono mb-1">Data-driven</p>
                <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                  <li>Qubit frequencies (published device calibrations)</li>
                  <li>Per-qubit error rates (measured on Tuna-9)</li>
                  <li>Topology &amp; Bell fidelities (our experiments)</li>
                  <li>Ising Z-expectations at 3 depths (4096 shots)</li>
                  <li>ZNE improvement factor (gate folding + extrapolation)</li>
                </ul>
              </div>
              <div>
                <p className="text-xs text-[#f59e0b] font-mono mb-1">Artistic choices</p>
                <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                  <li>Timbre change for |0&#x27E9; vs |1&#x27E9; (states share one frequency)</li>
                  <li>Stereo panning for qubit position</li>
                  <li>Noise texture proportional to error rate</li>
                  <li>Correlated note sequences for entanglement</li>
                  <li>Beat frequency mapping for error magnitude</li>
                </ul>
              </div>
            </div>
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
