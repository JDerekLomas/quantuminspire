'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  blochCoords, applySingleQubitGate,
  H_GATE, X_GATE, Y_GATE, Z_GATE, S_GATE, T_GATE, SDG_GATE, TDG_GATE,
  Rx, Ry, Rz, cMag, cPhase,
  type StateVector, type Gate, type Complex,
} from '@/lib/quantum'

const PRESETS: Record<string, StateVector> = {
  '|0\u27E9': [[1, 0], [0, 0]],
  '|1\u27E9': [[0, 0], [1, 0]],
  '|+\u27E9': [[Math.SQRT1_2, 0], [Math.SQRT1_2, 0]],
  '|\u2212\u27E9': [[Math.SQRT1_2, 0], [-Math.SQRT1_2, 0]],
  '|i\u27E9': [[Math.SQRT1_2, 0], [0, Math.SQRT1_2]],
  '|\u2212i\u27E9': [[Math.SQRT1_2, 0], [0, -Math.SQRT1_2]],
}

function formatComplex(c: Complex): string {
  const r = c[0], i = c[1]
  if (Math.abs(i) < 1e-6) return r.toFixed(3)
  if (Math.abs(r) < 1e-6) return `${i.toFixed(3)}i`
  return `${r.toFixed(3)}${i >= 0 ? '+' : ''}${i.toFixed(3)}i`
}

// Bloch sphere coords → Three.js Y-up: [bx, by, bz] → [bx, bz, by]
function toScene(b: [number, number, number]): [number, number, number] {
  return [b[0], b[2], b[1]]
}

// Generate points along a parametric ring
function ring(fn: (t: number) => [number, number, number], segments = 64): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => fn((i / segments) * Math.PI * 2))
}

// --- 3D Scene ---

function BlochScene({
  stateCoords,
  trail,
}: {
  stateCoords: [number, number, number]
  trail: [number, number, number][]
}) {
  const tipRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (tipRef.current) {
      tipRef.current.scale.setScalar(1 + 0.15 * Math.sin(Date.now() * 0.004))
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + 0.25 * Math.sin(Date.now() * 0.003))
    }
  })

  const sc = toScene(stateCoords)

  // Wireframe rings
  const equator = useMemo(() => ring(t => [Math.cos(t), 0, Math.sin(t)]), [])
  const meridianXZ = useMemo(() => ring(t => [Math.cos(t), Math.sin(t), 0]), [])
  const meridianYZ = useMemo(() => ring(t => [0, Math.sin(t), Math.cos(t)]), [])
  const latitudes = useMemo(() =>
    [-2, -1, 1, 2].map(lat => {
      const a = (lat / 3) * Math.PI / 2
      const r = Math.cos(a), y = Math.sin(a)
      return ring(t => [r * Math.cos(t), y, r * Math.sin(t)])
    }), [])

  // Axis definitions: direction, color, labels
  const axes = useMemo(() => [
    { dir: [1.3, 0, 0] as const, color: '#ff6464', labels: [{ pos: [1.55, 0, 0], text: '|+\u27E9' }, { pos: [-1.55, 0, 0], text: '|\u2212\u27E9' }] },
    { dir: [0, 1.3, 0] as const, color: '#6464ff', labels: [{ pos: [0, 1.55, 0], text: '|0\u27E9' }, { pos: [0, -1.55, 0], text: '|1\u27E9' }] },
    { dir: [0, 0, 1.3] as const, color: '#64ff64', labels: [{ pos: [0, 0, 1.55], text: '|i\u27E9' }, { pos: [0, 0, -1.55], text: '|\u2212i\u27E9' }] },
  ], [])

  // Trail positions and opacities (memoized for perf)
  const trailData = useMemo(() =>
    trail.map((t, i) => ({
      pos: toScene(t) as [number, number, number],
      opacity: (0.15 + 0.85 * (i / Math.max(trail.length - 1, 1))) * 0.6,
    })),
    [trail])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 5, 4]} intensity={0.4} />

      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={6}
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />

      {/* Translucent sphere */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#0d2847"
          transparent
          opacity={0.06}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe rings */}
      <Line points={equator} color="#1a6680" lineWidth={1.2} />
      <Line points={meridianXZ} color="#134555" lineWidth={0.8} />
      <Line points={meridianYZ} color="#134555" lineWidth={0.8} />
      {latitudes.map((pts, i) => (
        <Line key={`lat-${i}`} points={pts} color="#0a2a35" lineWidth={0.5} />
      ))}

      {/* Axes */}
      {axes.map((axis, i) => {
        const neg: [number, number, number] = [-axis.dir[0], -axis.dir[1], -axis.dir[2]]
        return (
          <group key={`axis-${i}`}>
            <Line points={[neg, [...axis.dir]]} color={axis.color} lineWidth={1.2} />
            {axis.labels.map((label, j) => (
              <Html key={j} position={label.pos as [number, number, number]} center>
                <span
                  className="text-[11px] font-mono select-none pointer-events-none whitespace-nowrap"
                  style={{ color: axis.color, opacity: 0.85 }}
                >
                  {label.text}
                </span>
              </Html>
            ))}
          </group>
        )
      })}

      {/* Trail */}
      {trailData.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={t.opacity} />
        </mesh>
      ))}

      {/* State vector line */}
      <Line points={[[0, 0, 0], sc]} color="#00d4ff" lineWidth={2.5} />

      {/* Tip outer glow */}
      <mesh ref={glowRef} position={sc}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.15} />
      </mesh>

      {/* Tip */}
      <mesh ref={tipRef} position={sc}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Origin */}
      <mesh>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </>
  )
}

// --- Page ---

export default function BlochSpherePage() {
  const [state, setState] = useState<StateVector>([[1, 0], [0, 0]])
  const [trail, setTrail] = useState<[number, number, number][]>([])
  const [rotAngle, setRotAngle] = useState(Math.PI / 4)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const coords = blochCoords(state)

  const applyGate = useCallback((gate: Gate) => {
    setState(prev => {
      const bc = blochCoords(prev)
      setTrail(t => [...t.slice(-80), bc])
      return applySingleQubitGate(gate, 0, prev, 1)
    })
  }, [])

  const resetState = useCallback(() => {
    setState([[1, 0], [0, 0]])
    setTrail([])
  }, [])

  const gates: [string, Gate][] = [
    ['H', H_GATE], ['X', X_GATE], ['Y', Y_GATE], ['Z', Z_GATE],
    ['S', S_GATE], ['T', T_GATE], ['S\u2020', SDG_GATE], ['T\u2020', TDG_GATE],
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Nav />
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#00d4ff]">Bloch Sphere</span>
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
              <BlochScene stateCoords={coords} trail={trail} />
            </Canvas>
          )}
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* State info */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Current State</h3>
            <div className="font-mono text-sm text-white mb-2">
              {formatComplex(state[0])}|0&#x27E9; + {formatComplex(state[1])}|1&#x27E9;
            </div>
            <div className="text-xs font-mono text-gray-500 space-y-1">
              <div>|&#x03B1;| = {cMag(state[0]).toFixed(4)}, &#x2220; = {(cPhase(state[0]) * 180 / Math.PI).toFixed(1)}&#xB0;</div>
              <div>|&#x03B2;| = {cMag(state[1]).toFixed(4)}, &#x2220; = {(cPhase(state[1]) * 180 / Math.PI).toFixed(1)}&#xB0;</div>
              <div className="pt-1 border-t border-white/5">
                Bloch: ({coords[0].toFixed(3)}, {coords[1].toFixed(3)}, {coords[2].toFixed(3)})
              </div>
            </div>
          </div>

          {/* Gates */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Gates</h3>
            <div className="grid grid-cols-4 gap-2">
              {gates.map(([name, gate]) => (
                <button
                  key={name}
                  onClick={() => applyGate(gate)}
                  className="px-3 py-2 text-sm font-mono bg-white/5 hover:bg-[#00d4ff]/20 border border-white/10 hover:border-[#00d4ff]/40 rounded transition-all text-white"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Rotations */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
              Rotations (&#x03B8; = {(rotAngle * 180 / Math.PI).toFixed(0)}&#xB0;)
            </h3>
            <input
              type="range"
              min={0}
              max={Math.PI * 2}
              step={0.01}
              value={rotAngle}
              onChange={e => setRotAngle(parseFloat(e.target.value))}
              className="w-full mb-3 accent-[#00d4ff]"
            />
            <div className="grid grid-cols-3 gap-2">
              {[['Rx', Rx], ['Ry', Ry], ['Rz', Rz]].map(([name, fn]) => (
                <button
                  key={name as string}
                  onClick={() => applyGate((fn as (t: number) => Gate)(rotAngle))}
                  className="px-3 py-2 text-sm font-mono bg-white/5 hover:bg-[#00d4ff]/20 border border-white/10 hover:border-[#00d4ff]/40 rounded transition-all text-white"
                >
                  {name as string}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Presets</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PRESETS).map(([name, s]) => (
                <button
                  key={name}
                  onClick={() => { setState(s); setTrail([]) }}
                  className="px-2 py-1.5 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all text-gray-300"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetState}
            className="w-full px-3 py-2 text-xs font-mono text-gray-400 border border-white/10 rounded hover:border-white/20 hover:text-white transition-all"
          >
            Reset
          </button>

          {/* Related */}
          <div className="pt-3 mt-3 border-t border-white/5">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Related</span>
            <div className="mt-2 space-y-1">
              {[
                { href: '/quantum-shooter', label: 'Play the Bloch Sphere Shooter' },
                { href: '/state-vector', label: 'State Vectors' },
                { href: '/measurement', label: 'Measurement' },
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
