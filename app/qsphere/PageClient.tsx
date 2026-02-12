'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  zeroState, numQubits, applySingleQubitGate, applyCNOT,
  H_GATE, X_GATE, Y_GATE, Z_GATE, S_GATE, T_GATE,
  bellState, ghzState, wState, uniformSuperposition,
  cMag, cPhase, probabilities, basisLabel,
  type StateVector, type Gate, type Complex,
} from '@/lib/quantum'

// --- Helpers ---

function hammingWeight(n: number): number {
  let w = 0
  while (n) { w += n & 1; n >>= 1 }
  return w
}

// Phase → color using HSL color wheel
function phaseToHsl(phase: number): string {
  const p = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const hue = (p / (Math.PI * 2)) * 360
  return `hsl(${hue.toFixed(0)}, 85%, 60%)`
}

function phaseToThreeColor(phase: number): THREE.Color {
  const p = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const hue = p / (Math.PI * 2)
  return new THREE.Color().setHSL(hue, 0.85, 0.6)
}

// Compute Q-sphere position for a basis state
function qspherePosition(index: number, nQubits: number): [number, number, number] {
  const hw = hammingWeight(index)
  const theta = nQubits === 0 ? 0 : (hw / nQubits) * Math.PI

  // Collect all states with same Hamming weight
  const total = 1 << nQubits
  const sameHW: number[] = []
  for (let i = 0; i < total; i++) {
    if (hammingWeight(i) === hw) sameHW.push(i)
  }
  const posInGroup = sameHW.indexOf(index)
  const phi = sameHW.length <= 1 ? 0 : (posInGroup / sameHW.length) * Math.PI * 2

  // Three.js Y-up: x = sin(θ)cos(φ), y = cos(θ), z = sin(θ)sin(φ)
  return [
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),
    Math.sin(theta) * Math.sin(phi),
  ]
}

// Generate ring points
function ring(fn: (t: number) => [number, number, number], segments = 64): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => fn((i / segments) * Math.PI * 2))
}

// --- 3D Scene ---

function QSphereScene({
  state,
  nQubits: nq,
}: {
  state: StateVector
  nQubits: number
}) {
  const groupRef = useRef<THREE.Group>(null!)

  // Slow auto-rotate
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08
    }
  })

  // Precompute state data
  const stateData = useMemo(() => {
    const probs = probabilities(state)
    return state.map((amp, i) => {
      const mag = cMag(amp)
      const phase = cPhase(amp)
      const pos = qspherePosition(i, nq)
      return { index: i, mag, phase, prob: probs[i], pos, label: basisLabel(i, nq) }
    }).filter(d => d.mag > 1e-6)
  }, [state, nq])

  // Max amplitude for scaling
  const maxMag = useMemo(() => Math.max(...stateData.map(d => d.mag), 0.01), [stateData])

  // Latitude rings for each Hamming weight level
  const latitudeRings = useMemo(() => {
    const rings: { theta: number; y: number; r: number }[] = []
    for (let hw = 0; hw <= nq; hw++) {
      const theta = nq === 0 ? 0 : (hw / nq) * Math.PI
      const y = Math.cos(theta)
      const r = Math.sin(theta)
      if (r > 0.01) rings.push({ theta, y, r })
    }
    return rings
  }, [nq])

  // Wireframe rings
  const equator = useMemo(() => ring(t => [Math.cos(t), 0, Math.sin(t)]), [])
  const meridian1 = useMemo(() => ring(t => [Math.cos(t), Math.sin(t), 0]), [])
  const meridian2 = useMemo(() => ring(t => [0, Math.sin(t), Math.cos(t)]), [])

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 5, 4]} intensity={0.3} />

      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={6}
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />

      <group ref={groupRef}>
        {/* Translucent sphere */}
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshPhysicalMaterial
            color="#0d2847"
            transparent
            opacity={0.05}
            roughness={0.2}
            metalness={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Main wireframe rings */}
        <Line points={equator} color="#1a5570" lineWidth={0.8} />
        <Line points={meridian1} color="#0f3545" lineWidth={0.5} />
        <Line points={meridian2} color="#0f3545" lineWidth={0.5} />

        {/* Latitude rings at Hamming weight levels */}
        {latitudeRings.map((lr, i) => {
          const pts = ring(t => [lr.r * Math.cos(t), lr.y, lr.r * Math.sin(t)])
          return <Line key={`lat-${i}`} points={pts} color="#0f3545" lineWidth={0.5} />
        })}

        {/* Vertical axis */}
        <Line points={[[0, -1.2, 0], [0, 1.2, 0]]} color="#334455" lineWidth={0.5} />

        {/* Pole labels */}
        <Html position={[0, 1.35, 0]} center>
          <span className="text-[10px] font-mono text-gray-500 select-none pointer-events-none">HW=0</span>
        </Html>
        <Html position={[0, -1.35, 0]} center>
          <span className="text-[10px] font-mono text-gray-500 select-none pointer-events-none">HW={nq}</span>
        </Html>

        {/* State dots + lines */}
        {stateData.map(d => {
          const scale = 0.03 + (d.mag / maxMag) * 0.1
          const color = phaseToThreeColor(d.phase)
          return (
            <group key={d.index}>
              {/* Line from center to dot */}
              <Line
                points={[[0, 0, 0], d.pos]}
                color={color}
                lineWidth={1}
              />
              {/* Dot */}
              <mesh position={d.pos}>
                <sphereGeometry args={[scale, 16, 16]} />
                <meshBasicMaterial color={color} />
              </mesh>
              {/* Glow */}
              <mesh position={d.pos}>
                <sphereGeometry args={[scale * 1.8, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.15} />
              </mesh>
              {/* Label */}
              <Html position={[d.pos[0] * 1.18, d.pos[1] * 1.18, d.pos[2] * 1.18]} center>
                <span
                  className="text-[9px] font-mono select-none pointer-events-none whitespace-nowrap"
                  style={{ color: phaseToHsl(d.phase), textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {d.label}
                </span>
              </Html>
            </group>
          )
        })}

        {/* Origin dot */}
        <mesh>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
        </mesh>
      </group>
    </>
  )
}

// --- Presets ---

type Preset = { name: string; state: StateVector; qubits: number }

function makePresets(): Preset[] {
  return [
    { name: '|00\u27E9', state: zeroState(2), qubits: 2 },
    { name: '\u03A6\u207A (Bell)', state: bellState(0), qubits: 2 },
    { name: '\u03A8\u207A (Bell)', state: (() => { let s = zeroState(2); s = applySingleQubitGate(X_GATE, 0, s, 2); s = applySingleQubitGate(H_GATE, 0, s, 2); s = applyCNOT(0, 1, s, 2); return s })(), qubits: 2 },
    { name: '|+\u27E9|+\u27E9', state: (() => { let s = zeroState(2); s = applySingleQubitGate(H_GATE, 0, s, 2); s = applySingleQubitGate(H_GATE, 1, s, 2); return s })(), qubits: 2 },
    { name: 'GHZ-3', state: ghzState(3), qubits: 3 },
    { name: 'W-3', state: wState(3), qubits: 3 },
    { name: '|+\u27E9\u2297\u00B3', state: uniformSuperposition(3), qubits: 3 },
    { name: 'GHZ-4', state: ghzState(4), qubits: 4 },
    { name: '|+\u27E9\u2297\u2074', state: uniformSuperposition(4), qubits: 4 },
  ]
}

// --- Phase color legend ---

function PhaseLegend() {
  const stops = 12
  return (
    <div className="mb-6">
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Phase &rarr; Color</h3>
      <div className="flex rounded overflow-hidden h-4">
        {Array.from({ length: stops }, (_, i) => {
          const phase = (i / stops) * Math.PI * 2
          return (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: phaseToHsl(phase) }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
        <span>0</span>
        <span>&pi;/2</span>
        <span>&pi;</span>
        <span>3&pi;/2</span>
        <span>2&pi;</span>
      </div>
    </div>
  )
}

// --- Page ---

export default function QSpherePage() {
  const presets = useMemo(() => makePresets(), [])
  const [state, setState] = useState<StateVector>(presets[1].state)
  const [nQubits, setNQubits] = useState(2)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const applyGate = useCallback((gate: Gate, target: number) => {
    setState(prev => applySingleQubitGate(gate, target, prev, numQubits(prev)))
  }, [])

  const applyCnot = useCallback((control: number, target: number) => {
    setState(prev => applyCNOT(control, target, prev, numQubits(prev)))
  }, [])

  const loadPreset = useCallback((p: Preset) => {
    setNQubits(p.qubits)
    setState(p.state)
  }, [])

  // Amplitude table data
  const tableData = useMemo(() => {
    const nq = numQubits(state)
    return state.map((amp, i) => ({
      label: basisLabel(i, nq),
      mag: cMag(amp),
      phase: cPhase(amp),
      prob: cMag(amp) ** 2,
    })).filter(d => d.mag > 1e-6)
  }, [state])

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Nav />
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#00d4ff]">Q-Sphere</span>
        <span className="text-xs text-gray-600 font-mono ml-auto">drag to rotate &middot; scroll to zoom</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 3D Scene */}
        <div className="flex-1 relative min-h-[400px]">
          {mounted && (
            <Canvas
              camera={{ position: [2.5, 1.8, 2.5], fov: 35 }}
              style={{ background: '#0a0a1a' }}
              gl={{ antialias: true, alpha: false }}
            >
              <QSphereScene state={state} nQubits={nQubits} />
            </Canvas>
          )}
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Description */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 leading-relaxed">
              Multi-qubit states on a sphere. Basis states are placed by Hamming weight:
              <span className="text-gray-300"> |00...0&#x27E9;</span> at the north pole,
              <span className="text-gray-300"> |11...1&#x27E9;</span> at the south pole.
              Dot size = amplitude, dot color = phase.
            </p>
          </div>

          {/* Phase legend */}
          <PhaseLegend />

          {/* Presets */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Preset States</h3>
            <div className="space-y-1">
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(p)}
                  className="w-full text-left px-3 py-1.5 text-xs font-mono bg-white/5 hover:bg-[#00d4ff]/15 border border-white/10 hover:border-[#00d4ff]/30 rounded transition-all text-gray-300 flex items-center gap-2"
                >
                  <span className="text-gray-500">{p.qubits}q</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gates */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Gates</h3>
            {Array.from({ length: nQubits }, (_, q) => (
              <div key={q} className="mb-2">
                <div className="text-[10px] font-mono text-gray-600 mb-1">qubit {q}</div>
                <div className="flex gap-1.5">
                  {[['H', H_GATE], ['X', X_GATE], ['Y', Y_GATE], ['Z', Z_GATE], ['S', S_GATE], ['T', T_GATE]].map(([name, gate]) => (
                    <button
                      key={name as string}
                      onClick={() => applyGate(gate as Gate, q)}
                      className="px-2 py-1 text-[11px] font-mono bg-white/5 hover:bg-[#00d4ff]/20 border border-white/10 hover:border-[#00d4ff]/40 rounded transition-all text-white"
                    >
                      {name as string}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {nQubits >= 2 && (
              <div className="mt-2">
                <div className="text-[10px] font-mono text-gray-600 mb-1">entangling</div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: nQubits }, (_, c) =>
                    Array.from({ length: nQubits }, (_, t) =>
                      c !== t ? (
                        <button
                          key={`${c}-${t}`}
                          onClick={() => applyCnot(c, t)}
                          className="px-2 py-1 text-[10px] font-mono bg-white/5 hover:bg-[#00d4ff]/20 border border-white/10 hover:border-[#00d4ff]/40 rounded transition-all text-white"
                        >
                          CX {c}&rarr;{t}
                        </button>
                      ) : null
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amplitudes table */}
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
              Amplitudes ({tableData.length} non-zero)
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {tableData.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-gray-300 w-16">{d.label}</span>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: phaseToHsl(d.phase) }}
                  />
                  <span className="text-gray-500">{d.mag.toFixed(3)}</span>
                  <span className="text-gray-600">{(d.phase * 180 / Math.PI).toFixed(0)}&deg;</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.prob * 100}%`, backgroundColor: phaseToHsl(d.phase) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related */}
          <div className="pt-3 mt-3 border-t border-white/5">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Related</span>
            <div className="mt-2 space-y-1">
              {[
                { href: '/state-vector', label: 'State Vectors' },
                { href: '/bloch-sphere', label: 'Bloch Sphere' },
                { href: '/entanglement', label: 'Entanglement' },
                { href: '/explore', label: 'All Tools' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="block text-xs text-gray-500 hover:text-white transition-colors py-0.5">
                  {l.label} &rarr;
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
