'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import {
  zeroState, applySingleQubitGate, applyCNOT, probabilities, amplitudeInfo,
  basisLabel, H_GATE, X_GATE, Z_GATE, Ry, Rz, projectAndCollapse,
  densityMatrix, partialTrace, blochFromDensity, blochCoords,
  type StateVector, type Complex, cMagSq,
} from '@/lib/quantum'

// ─── Protocol Steps ──────────────────────────────────────────────

interface ProtocolStep {
  name: string
  narrative: string
  lookFor: string
  gates: string
}

const STEPS: ProtocolStep[] = [
  {
    name: 'Prepare |psi>',
    narrative: 'Alice has a qubit in state |psi> = cos(theta/2)|0> + e^(i*phi)*sin(theta/2)|1>. She wants to send this state to Bob, but she can only send classical bits.',
    lookFor: 'The Bloch sphere shows the dashed target |psi> — this is what Bob should end up with. Only the first two bars (|000> and |001>) are lit because only q0 has been prepared.',
    gates: 'Ry(theta), Rz(phi) on q0',
  },
  {
    name: 'Create Bell pair',
    narrative: 'Alice and Bob share an entangled Bell pair. Apply H to q1 then CNOT(q1->q2) to create |Phi+> = (|00> + |11>)/sqrt(2). Now q1 belongs to Alice and q2 to Bob.',
    lookFor: 'The amplitude bars spread across more basis states — the system is now entangled. On the Bloch sphere, Bob\'s qubit moves toward the center (mixed state). An entangled qubit has no definite state on its own.',
    gates: 'H(q1), CNOT(q1->q2)',
  },
  {
    name: "Alice's circuit",
    narrative: 'Alice entangles her unknown qubit with her half of the Bell pair. CNOT(q0->q1) followed by H(q0) rotates the joint state into the Bell basis.',
    lookFor: 'The amplitude bars rearrange again. Bob\'s qubit is still mixed (inside the Bloch sphere) — all the information about |psi> is now encoded in correlations between the three qubits, not in any single qubit.',
    gates: 'CNOT(q0->q1), H(q0)',
  },
  {
    name: 'Measurement',
    narrative: 'Alice measures both her qubits (q0 and q1). The 3-qubit state collapses — Bob\'s qubit is now in one of four states related to |psi> by a Pauli operation.',
    lookFor: 'Most amplitude bars vanish — only states consistent with Alice\'s measurement survive. Bob\'s qubit jumps to the surface of the Bloch sphere (pure state again), but may not match |psi> yet. Run this step multiple times to see different random outcomes.',
    gates: 'Measure q0, q1',
  },
  {
    name: 'Classical channel',
    narrative: 'Alice sends her 2 classical bits to Bob over a classical channel. No quantum information travels — just two bits telling Bob which correction to apply.',
    lookFor: 'The dashed yellow line in the circuit carries classical information from Alice to Bob. Nothing changes in the quantum state — this step is purely about communication. This is why teleportation can\'t be faster than light.',
    gates: '(classical communication)',
  },
  {
    name: "Bob's correction",
    narrative: 'Bob applies corrections based on Alice\'s bits: X^(m1) then Z^(m0). If Alice got |00>, no correction needed. If |11>, apply both X and Z.',
    lookFor: 'Watch Bob\'s qubit on the Bloch sphere snap toward the dashed |psi> target. The correction gates (shown in the circuit) rotate Bob\'s qubit to undo the random effect of Alice\'s measurement.',
    gates: 'X^m1, Z^m0 on q2',
  },
  {
    name: 'Teleportation complete!',
    narrative: 'Bob\'s qubit is now in the exact state |psi> that Alice started with. The original qubit was destroyed (no-cloning theorem) — the state was transferred, not copied.',
    lookFor: 'Bob\'s qubit (yellow dot) now overlaps the dashed |psi> target on the Bloch sphere. Try different theta/phi values and step through again — it always works, for any state.',
    gates: '(verification)',
  },
]

// ─── Compute state at each step ──────────────────────────────────

function computeState(
  step: number, theta: number, phi: number, m0: number, m1: number
): StateVector {
  const N = 3
  let s = zeroState(N)

  if (step >= 0) {
    // Step 0: Prepare |psi> on q0
    s = applySingleQubitGate(Ry(theta), 0, s, N)
    s = applySingleQubitGate(Rz(phi), 0, s, N)
  }
  if (step >= 1) {
    // Step 1: Bell pair on q1,q2
    s = applySingleQubitGate(H_GATE, 1, s, N)
    s = applyCNOT(1, 2, s, N)
  }
  if (step >= 2) {
    // Step 2: Alice's circuit
    s = applyCNOT(0, 1, s, N)
    s = applySingleQubitGate(H_GATE, 0, s, N)
  }
  if (step >= 3) {
    // Step 3: Measurement — collapse onto m0,m1
    s = projectAndCollapse(s, [[0, m0], [1, m1]], N)
  }
  if (step >= 5) {
    // Step 5: Bob's corrections
    if (m1 === 1) s = applySingleQubitGate(X_GATE, 2, s, N)
    if (m0 === 1) s = applySingleQubitGate(Z_GATE, 2, s, N)
  }
  return s
}

// ─── Phase to HSL color ──────────────────────────────────────────

function phaseToColor(phase: number): string {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
  return `hsl(${hue}, 80%, 60%)`
}

// ─── Component ───────────────────────────────────────────────────

export default function TeleportationPage() {
  const circuitRef = useRef<HTMLCanvasElement>(null)
  const ampRef = useRef<HTMLCanvasElement>(null)
  const blochRef = useRef<HTMLCanvasElement>(null)

  const [step, setStep] = useState(0)
  const [theta, setTheta] = useState(Math.PI / 3)
  const [phi, setPhi] = useState(Math.PI / 4)
  const [m0, setM0] = useState(0)
  const [m1, setM1] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [speed, setSpeed] = useState(1500)

  // Randomize measurement when reaching step 3
  const goToStep = useCallback((newStep: number) => {
    if (newStep === 3 && step < 3) {
      // Random measurement outcome
      setM0(Math.random() < 0.5 ? 1 : 0)
      setM1(Math.random() < 0.5 ? 1 : 0)
    }
    setStep(newStep)
  }, [step])

  const stepForward = useCallback(() => {
    if (step < 6) goToStep(step + 1)
    else setAutoPlay(false)
  }, [step, goToStep])

  const stepBack = useCallback(() => {
    if (step > 0) setStep(step - 1)
  }, [step])

  const reset = useCallback(() => {
    setStep(0)
    setAutoPlay(false)
  }, [])

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return
    if (step >= 6) { setAutoPlay(false); return }
    const timer = setTimeout(stepForward, speed)
    return () => clearTimeout(timer)
  }, [autoPlay, step, speed, stepForward])

  // Compute current state
  const state = computeState(step, theta, phi, m0, m1)
  const probs = probabilities(state)
  const amps = amplitudeInfo(state)

  // Bob's qubit Bloch vector
  const bobBloch = (() => {
    if (step >= 3) {
      // After measurement, q0 and q1 are collapsed — extract q2 as pure state
      // The state is a product state |m0 m1> x |bob>, so just extract last qubit
      const bobState: Complex[] = [[0, 0], [0, 0]]
      for (let i = 0; i < 8; i++) {
        if (((i >> 0) & 1) === m0 && ((i >> 1) & 1) === m1) {
          const bobBit = (i >> 2) & 1
          bobState[bobBit] = [
            bobState[bobBit][0] + state[i][0],
            bobState[bobBit][1] + state[i][1],
          ]
        }
      }
      // Normalize
      const norm = Math.sqrt(cMagSq(bobState[0]) + cMagSq(bobState[1]))
      if (norm > 1e-10) {
        bobState[0] = [bobState[0][0] / norm, bobState[0][1] / norm]
        bobState[1] = [bobState[1][0] / norm, bobState[1][1] / norm]
      }
      return blochCoords(bobState as StateVector)
    }
    // Before measurement, Bob's qubit is mixed — use density matrix
    const rho3 = densityMatrix(state)
    // Trace out q0 and q1 to get 2x2 density matrix for q2
    let rho2 = partialTrace(rho3, 0, 3)  // trace out q0: 4x4 -> still need to trace q1
    rho2 = partialTrace(rho2, 0, 2)       // trace out q1 (now qubit 0 in 2-qubit system)
    return blochFromDensity(rho2)
  })()

  // Original |psi> Bloch vector for comparison
  const psiBloch: [number, number, number] = [
    Math.sin(theta) * Math.cos(phi),
    Math.sin(theta) * Math.sin(phi),
    Math.cos(theta),
  ]

  // ─── Circuit diagram ────────────────────────────────────────────
  useEffect(() => {
    const canvas = circuitRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    const wireY = [h * 0.25, h * 0.5, h * 0.75]
    const wireLeft = 60, wireRight = w - 20
    const gateW = 34, gateH = 28

    // Wire labels
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#06b6d4'
    ctx.fillText('q0  |0>', wireLeft - 8, wireY[0] + 4)
    ctx.fillText('q1  |0>', wireLeft - 8, wireY[1] + 4)
    ctx.fillText('q2  |0>', wireLeft - 8, wireY[2] + 4)

    // Role labels
    ctx.textAlign = 'left'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillText('Alice', wireRight + 4, wireY[0] - 6)
    ctx.fillText('Alice', wireRight + 4, wireY[1] - 6)
    ctx.fillText('Bob', wireRight + 4, wireY[2] - 6)

    // Gate column x positions
    const cols = [
      wireLeft + 30,   // 0: Ry, Rz
      wireLeft + 80,   // (Rz)
      wireLeft + 140,  // 1: H on q1
      wireLeft + 190,  // 1: CNOT q1->q2
      wireLeft + 250,  // 2: CNOT q0->q1
      wireLeft + 300,  // 2: H on q0
      wireLeft + 360,  // 3: Measure q0
      wireLeft + 390,  // 3: Measure q1
      wireLeft + 440,  // 4: classical channel
      wireLeft + 500,  // 5: X^m1 on q2
      wireLeft + 550,  // 5: Z^m0 on q2
    ]

    // Wires
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(wireLeft, wireY[i])
      ctx.lineTo(wireRight, wireY[i])
      ctx.stroke()
    }

    // Step highlight regions (x ranges per step)
    const stepRegions: [number, number][] = [
      [cols[0] - 22, cols[1] + 22],   // step 0
      [cols[2] - 22, cols[3] + 22],   // step 1
      [cols[4] - 22, cols[5] + 22],   // step 2
      [cols[6] - 22, cols[7] + 22],   // step 3
      [cols[8] - 25, cols[8] + 25],   // step 4
      [cols[9] - 22, cols[10] + 22],  // step 5
      [wireLeft, wireRight],           // step 6: full
    ]

    // Draw highlight for current step
    if (step < 6) {
      const [x1, x2] = stepRegions[step]
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)'
      ctx.fillRect(x1, 0, x2 - x1, h)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)'
      ctx.lineWidth = 1
      ctx.strokeRect(x1, 0, x2 - x1, h)
    }

    // Helper: draw gate box
    function drawGate(x: number, y: number, label: string, active: boolean, past: boolean) {
      const opacity = active ? 1 : past ? 0.7 : 0.25
      ctx.globalAlpha = opacity
      ctx.fillStyle = active ? '#06b6d4' : past ? '#0e7490' : '#1e293b'
      ctx.fillRect(x - gateW / 2, y - gateH / 2, gateW, gateH)
      ctx.strokeStyle = active ? '#22d3ee' : past ? '#06b6d4' : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x - gateW / 2, y - gateH / 2, gateW, gateH)
      ctx.fillStyle = active ? '#fff' : past ? '#cffafe' : 'rgba(255,255,255,0.3)'
      ctx.font = `bold ${label.length > 3 ? 9 : 11}px JetBrains Mono, monospace`
      ctx.textAlign = 'center'
      ctx.fillText(label, x, y + 4)
      ctx.globalAlpha = 1
    }

    // Helper: draw CNOT
    function drawCNOT(x: number, controlY: number, targetY: number, active: boolean, past: boolean) {
      const opacity = active ? 1 : past ? 0.7 : 0.25
      ctx.globalAlpha = opacity
      // Vertical line
      ctx.strokeStyle = active ? '#22d3ee' : past ? '#06b6d4' : 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, controlY)
      ctx.lineTo(x, targetY)
      ctx.stroke()
      // Control dot
      ctx.fillStyle = active ? '#22d3ee' : past ? '#06b6d4' : 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.arc(x, controlY, 5, 0, Math.PI * 2)
      ctx.fill()
      // Target circle
      ctx.strokeStyle = active ? '#22d3ee' : past ? '#06b6d4' : 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, targetY, 10, 0, Math.PI * 2)
      ctx.stroke()
      // Plus inside target
      ctx.beginPath()
      ctx.moveTo(x - 6, targetY)
      ctx.lineTo(x + 6, targetY)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, targetY - 6)
      ctx.lineTo(x, targetY + 6)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Helper: draw measurement
    function drawMeter(x: number, y: number, active: boolean, past: boolean) {
      const opacity = active ? 1 : past ? 0.7 : 0.25
      ctx.globalAlpha = opacity
      ctx.fillStyle = active ? '#f59e0b' : past ? '#92400e' : '#1e293b'
      ctx.fillRect(x - gateW / 2, y - gateH / 2, gateW, gateH)
      ctx.strokeStyle = active ? '#fbbf24' : past ? '#f59e0b' : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x - gateW / 2, y - gateH / 2, gateW, gateH)
      // Meter arc
      ctx.strokeStyle = active ? '#fff' : past ? '#fde68a' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(x, y + 4, 8, Math.PI, 0)
      ctx.stroke()
      // Needle
      ctx.beginPath()
      ctx.moveTo(x, y + 4)
      ctx.lineTo(x + 5, y - 6)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Step 0: Ry, Rz on q0
    drawGate(cols[0], wireY[0], 'Ry', step === 0, step > 0)
    drawGate(cols[1], wireY[0], 'Rz', step === 0, step > 0)

    // Step 1: H(q1), CNOT(q1->q2)
    drawGate(cols[2], wireY[1], 'H', step === 1, step > 1)
    drawCNOT(cols[3], wireY[1], wireY[2], step === 1, step > 1)

    // Step 2: CNOT(q0->q1), H(q0)
    drawCNOT(cols[4], wireY[0], wireY[1], step === 2, step > 2)
    drawGate(cols[5], wireY[0], 'H', step === 2, step > 2)

    // Step 3: Measurement
    drawMeter(cols[6], wireY[0], step === 3, step > 3)
    drawMeter(cols[7], wireY[1], step === 3, step > 3)

    // Step 4: Classical channel (dashed line from measurements to corrections)
    const classActive = step === 4, classPast = step > 4
    const classOpacity = classActive ? 1 : classPast ? 0.6 : 0.2
    ctx.globalAlpha = classOpacity
    ctx.strokeStyle = classActive ? '#fbbf24' : classPast ? '#92400e' : 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    // From q0 measurement down to q2 correction area
    const classStartX = cols[7] + 20
    const classEndX = cols[9] - 20
    const classMidY = wireY[2] + 30
    ctx.beginPath()
    ctx.moveTo(classStartX, wireY[0] + gateH / 2)
    ctx.lineTo(classStartX, classMidY)
    ctx.lineTo(classEndX, classMidY)
    ctx.lineTo(classEndX, wireY[2] + gateH / 2)
    ctx.stroke()
    ctx.setLineDash([])
    // Arrow
    ctx.beginPath()
    ctx.moveTo(classEndX - 4, wireY[2] + gateH / 2 + 6)
    ctx.lineTo(classEndX, wireY[2] + gateH / 2)
    ctx.lineTo(classEndX + 4, wireY[2] + gateH / 2 + 6)
    ctx.stroke()
    // "2 bits" label
    if (classActive || classPast) {
      ctx.fillStyle = classActive ? '#fbbf24' : 'rgba(251, 191, 36, 0.4)'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('2 classical bits', (classStartX + classEndX) / 2, classMidY - 5)
    }
    ctx.globalAlpha = 1

    // Step 5: Bob's corrections
    const corrLabel0 = m1 === 1 ? 'X' : 'I'
    const corrLabel1 = m0 === 1 ? 'Z' : 'I'
    drawGate(cols[9], wireY[2], corrLabel0, step === 5, step > 5)
    drawGate(cols[10], wireY[2], corrLabel1, step === 5, step > 5)

    // Step 6 indicator
    if (step === 6) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = 'bold 14px JetBrains Mono, monospace'
      ctx.fillStyle = '#22d3ee'
      ctx.textAlign = 'center'
      ctx.fillText('Teleportation complete! Bob has |psi>', w / 2, h - 10)
    }

    // Measurement results shown after step 3
    if (step >= 3) {
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText(`${m0}`, cols[6], wireY[0] - gateH / 2 - 6)
      ctx.fillText(`${m1}`, cols[7], wireY[1] - gateH / 2 - 6)
    }
  }, [step, m0, m1, theta, phi])

  // ─── Amplitude bars ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = ampRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    const n = 8
    const pad = { left: 10, right: 10, top: 12, bottom: 30 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom
    const barW = Math.max(8, cw / n - 4)
    const gap = (cw - barW * n) / (n - 1 || 1)

    // Title
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.textAlign = 'left'
    ctx.fillText('Amplitudes (8 basis states)', pad.left, pad.top - 1)

    for (let i = 0; i < n; i++) {
      const x = pad.left + i * (barW + gap)
      const prob = probs[i]
      const barH = prob * ch
      const phase = amps[i].phase
      const color = prob > 1e-10 ? phaseToColor(phase) : 'rgba(255,255,255,0.05)'

      // Bar
      ctx.fillStyle = color
      ctx.globalAlpha = prob > 1e-10 ? 0.3 + 0.7 * Math.sqrt(prob) : 0.15
      ctx.fillRect(x, pad.top + ch - barH, barW, barH)
      ctx.globalAlpha = 1

      // Border
      if (prob > 1e-10) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.strokeRect(x, pad.top + ch - barH, barW, barH)
      }

      // Probability text
      if (prob > 0.01) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = '8px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(prob.toFixed(2), x + barW / 2, pad.top + ch - barH - 4)
      }

      // Basis label
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '8px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(basisLabel(i, 3), x + barW / 2, h - pad.bottom + 12)
    }
  }, [state, probs, amps])

  // ─── Mini Bloch sphere (Bob's qubit) ─────────────────────────────
  useEffect(() => {
    const canvas = blochRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const cx = w / 2, cy = h / 2 + 5
    const R = Math.min(w, h) * 0.36

    const rotX = -0.35, rotY = 0.5
    const cosRx = Math.cos(rotX), sinRx = Math.sin(rotX)
    const cosRy = Math.cos(rotY), sinRy = Math.sin(rotY)

    function project(x: number, y: number, z: number): [number, number, number] {
      const x1 = x * cosRy - z * sinRy
      const z1 = x * sinRy + z * cosRy
      const y1 = y * cosRx - z1 * sinRx
      const z2 = y * sinRx + z1 * cosRx
      return [cx + x1 * R, cy - y1 * R, z2]
    }

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Title
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.textAlign = 'center'
    ctx.fillText("Bob's qubit (q2)", w / 2, 12)

    // Sphere surface
    const sphereGrad = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.05, cx, cy, R)
    sphereGrad.addColorStop(0, 'rgba(6, 182, 212, 0.12)')
    sphereGrad.addColorStop(0.7, 'rgba(6, 40, 60, 0.08)')
    sphereGrad.addColorStop(1, 'rgba(6, 182, 212, 0.03)')
    ctx.fillStyle = sphereGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()

    // Equator
    const segs = 48
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * Math.PI * 2
      const t1 = ((i + 1) / segs) * Math.PI * 2
      const [px0, py0, pz0] = project(Math.cos(t0), 0, Math.sin(t0))
      const [px1, py1, pz1] = project(Math.cos(t1), 0, Math.sin(t1))
      const op = (pz0 + pz1) / 2 > 0 ? 0.15 : 0.05
      ctx.strokeStyle = `rgba(6, 182, 212, ${op})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px0, py0)
      ctx.lineTo(px1, py1)
      ctx.stroke()
    }

    // Z axis
    const [zt, yt1] = project(0, 1.2, 0)
    const [zb, yb1] = project(0, -1.2, 0)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(zt, yt1)
    ctx.lineTo(zb, yb1)
    ctx.stroke()

    // Labels
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    const [lx0, ly0] = project(0, 1.35, 0)
    ctx.fillText('|0>', lx0, ly0)
    const [lx1, ly1] = project(0, -1.35, 0)
    ctx.fillText('|1>', lx1, ly1)

    // Ghost: original |psi> for reference (always shown as faint target)
    const [gx, gy] = project(psiBloch[0], psiBloch[2], psiBloch[1])
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    const [ox, oy] = project(0, 0, 0)
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(gx, gy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)'
    ctx.beginPath()
    ctx.arc(gx, gy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(6, 182, 212, 0.3)'
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.fillText('|psi>', gx + 8, gy - 4)

    // Bob's qubit state
    const [bx, by, bz] = bobBloch
    const blochLen = Math.sqrt(bx * bx + by * by + bz * bz)
    const [sx, sy] = project(bx, bz, by)

    // Vector from origin
    ctx.strokeStyle = step === 6 ? '#22d3ee' : '#f59e0b'
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(sx, sy)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Point
    const ptColor = step === 6 ? '#22d3ee' : '#f59e0b'
    ctx.shadowColor = ptColor
    ctx.shadowBlur = 10
    ctx.fillStyle = ptColor
    ctx.beginPath()
    ctx.arc(sx, sy, blochLen > 0.95 ? 5 : 3 + 2 * blochLen, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 4
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(sx, sy, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Mixed state indicator
    if (blochLen < 0.95) {
      ctx.font = '8px JetBrains Mono, monospace'
      ctx.fillStyle = 'rgba(245, 158, 11, 0.6)'
      ctx.textAlign = 'center'
      ctx.fillText(`mixed (|r|=${blochLen.toFixed(2)})`, w / 2, h - 4)
    } else if (step === 6) {
      ctx.font = '8px JetBrains Mono, monospace'
      ctx.fillStyle = '#22d3ee'
      ctx.textAlign = 'center'
      ctx.fillText('matches |psi>!', w / 2, h - 4)
    }
  }, [state, bobBloch, psiBloch, step])

  // Resize observer
  useEffect(() => {
    const canvases = [circuitRef.current, ampRef.current, blochRef.current].filter(Boolean)
    const observer = new ResizeObserver(() => setStep(s => s))
    canvases.forEach(c => { if (c?.parentElement) observer.observe(c.parentElement) })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      {/* Header */}
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#06b6d4]">Quantum Teleportation</span>
        <span className="text-xs font-mono text-gray-600 ml-auto">
          Step {step}/6: {STEPS[step].name}
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Visualizations */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Circuit diagram */}
          <div className="relative" style={{ height: '220px' }}>
            <canvas ref={circuitRef} className="absolute inset-0 w-full h-full" />
          </div>

          {/* Bottom: amplitude bars + Bloch sphere */}
          <div className="flex-1 flex border-t border-white/5 min-h-[200px]">
            <div className="flex-1 relative">
              <canvas ref={ampRef} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="w-[180px] relative border-l border-white/5">
              <canvas ref={blochRef} className="absolute inset-0 w-full h-full" />
            </div>
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="lg:w-72 p-5 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Step controls */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Step Through</h3>
            <div className="flex gap-2 mb-2">
              <button
                onClick={stepBack}
                disabled={step === 0}
                className="flex-1 px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded disabled:opacity-30 hover:bg-white/10 transition-all text-white"
              >
                &larr; Back
              </button>
              <button
                onClick={stepForward}
                disabled={step >= 6}
                className="flex-1 px-3 py-2 text-sm font-mono bg-[#06b6d4]/20 border border-[#06b6d4]/40 rounded disabled:opacity-30 hover:bg-[#06b6d4]/30 transition-all text-[#06b6d4]"
              >
                Step &rarr;
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className={`flex-1 px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                  autoPlay
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4]/40 text-[#06b6d4]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {autoPlay ? 'Pause' : 'Auto-play'}
              </button>
              <button
                onClick={reset}
                className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded text-gray-400 hover:text-white transition-all"
              >
                Reset
              </button>
            </div>
            <input
              type="range"
              min={0} max={6} value={step}
              onChange={e => goToStep(parseInt(e.target.value))}
              className="w-full accent-[#06b6d4]"
            />
            <div className="text-[10px] font-mono text-gray-600 mt-1">
              Step {step}/6
            </div>
          </div>

          {/* Speed control */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
              Speed: {(speed / 1000).toFixed(1)}s/step
            </h3>
            <input
              type="range"
              min={500} max={3000} step={100} value={speed}
              onChange={e => setSpeed(parseInt(e.target.value))}
              className="w-full accent-[#06b6d4]"
            />
          </div>

          {/* Initial state sliders */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
              Initial State |psi&gt;
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                  <span>theta</span>
                  <span>{(theta / Math.PI).toFixed(2)}pi = {(theta * 180 / Math.PI).toFixed(0)}deg</span>
                </div>
                <input
                  type="range"
                  min={0} max={Math.PI} step={0.01} value={theta}
                  onChange={e => { setTheta(parseFloat(e.target.value)); if (step > 0) reset() }}
                  className="w-full accent-[#06b6d4]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                  <span>phi</span>
                  <span>{(phi / Math.PI).toFixed(2)}pi = {(phi * 180 / Math.PI).toFixed(0)}deg</span>
                </div>
                <input
                  type="range"
                  min={0} max={2 * Math.PI} step={0.01} value={phi}
                  onChange={e => { setPhi(parseFloat(e.target.value)); if (step > 0) reset() }}
                  className="w-full accent-[#06b6d4]"
                />
              </div>
            </div>
          </div>

          {/* Narrative */}
          <div className="mb-5 p-3 rounded bg-white/[0.03] border border-white/5">
            <h3 className="text-xs font-mono text-[#06b6d4] uppercase tracking-widest mb-2">
              {STEPS[step].name}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-2">
              {STEPS[step].narrative}
            </p>
            <p className="text-[10px] text-[#22d3ee]/70 leading-relaxed mb-2">
              Look for: {STEPS[step].lookFor}
            </p>
            <div className="text-[10px] font-mono text-gray-600">
              {STEPS[step].gates}
            </div>
          </div>

          {/* Measurement result + correction table */}
          {step >= 3 && (
            <div className="mb-5 p-3 rounded bg-[#f59e0b10] border border-[#f59e0b30]">
              <h3 className="text-xs font-mono text-[#f59e0b] uppercase tracking-widest mb-2">
                Measurement Result
              </h3>
              <div className="text-xs font-mono text-gray-300 space-y-2">
                <div>q0 = |{m0}&gt; &nbsp; q1 = |{m1}&gt;</div>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-0.5 pr-2">Bits</th>
                      <th className="text-left py-0.5 pr-2">Correction</th>
                      <th className="text-left py-0.5">Bob gets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ['00', 'I (none)', '|psi>'],
                      ['01', 'X', 'X|psi>'],
                      ['10', 'Z', 'Z|psi>'],
                      ['11', 'XZ', 'XZ|psi>'],
                    ] as const).map(([bits, corr, result]) => (
                      <tr
                        key={bits}
                        className={`${bits === `${m0}${m1}` ? 'text-[#fbbf24] font-bold' : 'text-gray-500'}`}
                      >
                        <td className="py-0.5 pr-2">|{bits}&gt;</td>
                        <td className="py-0.5 pr-2">{corr}</td>
                        <td className="py-0.5">{bits === `${m0}${m1}` ? '-> |psi>' : result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Why it matters */}
          <div className="mb-5 p-3 rounded bg-white/[0.02] border border-white/5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Why This Matters</h3>
            <div className="text-[11px] text-gray-400 space-y-1.5">
              <p>Teleportation isn&apos;t science fiction &mdash; it&apos;s a foundational primitive in quantum technology:</p>
              <p><span className="text-[#06b6d4]">Quantum networks:</span> Teleportation is how quantum repeaters will relay qubits across long distances, enabling a future quantum internet.</p>
              <p><span className="text-[#06b6d4]">Error correction:</span> Fault-tolerant quantum computers use teleportation-like circuits to move logical qubits without exposing them to errors.</p>
              <p><span className="text-[#06b6d4]">Gate teleportation:</span> Hard-to-implement gates can be &ldquo;pre-loaded&rdquo; into entangled states and applied via teleportation, a key trick in scalable architectures.</p>
            </div>
          </div>

          {/* Common misconceptions */}
          <div className="p-3 rounded bg-white/[0.02] border border-white/5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Common Misconceptions</h3>
            <div className="text-[11px] text-gray-400 space-y-2">
              <div>
                <p className="text-white/70 font-medium">&ldquo;Does this send information faster than light?&rdquo;</p>
                <p>No. Bob&apos;s qubit is random until he receives Alice&apos;s 2 classical bits, which travel at light speed or slower. Without the correction, Bob just has noise. Entanglement alone can&apos;t carry a message.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium">&ldquo;Is the qubit copied?&rdquo;</p>
                <p>No &mdash; the no-cloning theorem forbids it. Alice&apos;s qubit is destroyed by measurement. The state is <em>transferred</em>, not duplicated. After teleportation, only Bob has |psi&gt;.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium">&ldquo;Does matter move from Alice to Bob?&rdquo;</p>
                <p>No. Nothing physical travels. The quantum <em>state</em> (information about amplitudes and phases) is transferred to Bob&apos;s pre-existing qubit. Think of it as moving a file between computers, not shipping a hard drive.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
