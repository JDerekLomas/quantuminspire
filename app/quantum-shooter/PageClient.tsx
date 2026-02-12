'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Link from 'next/link'
import InputWidget from '@/components/InputWidget'
import {
  blochCoords, applySingleQubitGate,
  H_GATE, X_GATE, Y_GATE, Z_GATE, S_GATE, T_GATE, SDG_GATE, TDG_GATE,
  type StateVector, type Gate,
} from '@/lib/quantum'

// ---- Types ----

interface EnemyData {
  id: number
  dir: [number, number, number]
  speed: number
  spawnTime: number
}

interface LaserData {
  id: number
  dir: [number, number, number]
  spawnTime: number
}

interface ExplosionData {
  id: number
  pos: [number, number, number]
  spawnTime: number
  color: string
}

type GameCommand = { type: 'fire'; dir: [number, number, number] }

interface GameState {
  enemies: EnemyData[]
  lasers: LaserData[]
  explosions: ExplosionData[]
  score: number
  lives: number
  wave: number
  combo: number
  spawnTimer: number
  waveTimer: number
  nextId: number
  time: number
  phase: 'menu' | 'playing' | 'gameover'
  commands: GameCommand[]
  tutorialStep: number // -1 = free play, 0+ = tutorial step
  tutorialAdvance: boolean // signal to page that step was completed
  tutorialSpawned: boolean // whether current step's enemy exists
}

// ---- Tutorial ----

const TUTORIAL = [
  {
    title: 'YOUR FIRST SHOT',
    body: 'Your qubit starts in |0\u27E9. On the Bloch sphere, that\u2019s the north pole \u2014 your laser points straight up.',
    hint: 'Press SPACE to fire at the enemy above',
    enemyDir: [0, 1, 0] as [number, number, number],
    highlight: [] as string[],
  },
  {
    title: 'X GATE \u2014 BIT FLIP',
    body: 'The X gate is the quantum NOT. It flips |0\u27E9 \u2194 |1\u27E9, swapping north and south poles. Your aim reverses vertically.',
    hint: 'Press 2 (X gate), then SPACE',
    enemyDir: [0, -1, 0] as [number, number, number],
    highlight: ['2'],
  },
  {
    title: 'H GATE \u2014 SUPERPOSITION',
    body: 'The Hadamard gate creates superposition. From |0\u27E9, it moves your aim to |+\u27E9 on the equator \u2014 an equal mix of 0 and 1.',
    hint: 'Press 1 (H gate), then SPACE',
    enemyDir: [1, 0, 0] as [number, number, number],
    highlight: ['1'],
  },
  {
    title: 'COMBINING GATES',
    body: 'Gates compose! The Z gate flips the phase, mirroring your position across the equator\u2019s axis. H then Z takes |0\u27E9 \u2192 |+\u27E9 \u2192 |\u2212\u27E9.',
    hint: 'Press 1 (H), then 4 (Z), then SPACE',
    enemyDir: [-1, 0, 0] as [number, number, number],
    highlight: ['1', '4'],
  },
  {
    title: 'PHASE ROTATION',
    body: 'The S gate rotates 90\u00B0 around the vertical axis. Combined with H, it reaches new directions: H then S takes you to |i\u27E9.',
    hint: 'Press 1 (H), then 5 (S), then SPACE',
    enemyDir: [0, 0, 1] as [number, number, number],
    highlight: ['1', '5'],
  },
]

// ---- Gate reference ----

const GATE_REF = [
  {
    name: 'H',
    full: 'Hadamard',
    key: '1',
    effect: '|0\u27E9 \u2192 |+\u27E9,  |1\u27E9 \u2192 |\u2212\u27E9',
    desc: 'Creates superposition. Swaps between the poles and equator. The most important single gate \u2014 it\u2019s your go-to for reaching the equator from a pole.',
  },
  {
    name: 'X',
    full: 'Pauli-X',
    key: '2',
    effect: '|0\u27E9 \u2194 |1\u27E9',
    desc: 'Quantum NOT gate. Flips your aim up \u2194 down by rotating 180\u00B0 around the X axis. Equivalent to a classical bit flip.',
  },
  {
    name: 'Y',
    full: 'Pauli-Y',
    key: '3',
    effect: '|0\u27E9 \u2192 i|1\u27E9,  |1\u27E9 \u2192 \u2212i|0\u27E9',
    desc: 'Flips up \u2194 down with a phase twist. Rotates 180\u00B0 around the Y axis. Similar to X but adds a phase factor.',
  },
  {
    name: 'Z',
    full: 'Pauli-Z',
    key: '4',
    effect: '|0\u27E9 \u2192 |0\u27E9,  |1\u27E9 \u2192 \u2212|1\u27E9',
    desc: 'Phase flip. No visible effect at the poles, but mirrors your position on the equator. Rotates 180\u00B0 around the vertical axis.',
  },
  {
    name: 'S',
    full: 'Phase gate',
    key: '5',
    effect: '|1\u27E9 \u2192 i|1\u27E9',
    desc: 'Rotates 90\u00B0 around the vertical axis. On the equator, it quarter-turns your aim. Two S gates = one Z gate.',
  },
  {
    name: 'T',
    full: '\u03C0/8 gate',
    key: '6',
    effect: '|1\u27E9 \u2192 e^{i\u03C0/4}|1\u27E9',
    desc: 'Rotates 45\u00B0 around the vertical axis. Fine-grained phase control. Two T gates = one S gate.',
  },
  {
    name: 'S\u2020',
    full: 'S-dagger',
    key: '7',
    effect: '|1\u27E9 \u2192 \u2212i|1\u27E9',
    desc: 'Reverse of S. Rotates \u221290\u00B0 around the vertical axis. Undoes an S gate.',
  },
  {
    name: 'T\u2020',
    full: 'T-dagger',
    key: '8',
    effect: '|1\u27E9 \u2192 e^{\u2212i\u03C0/4}|1\u27E9',
    desc: 'Reverse of T. Rotates \u221245\u00B0 around the vertical axis. Undoes a T gate.',
  },
]

// ---- Constants ----

const SPAWN_DIST = 18
const KILL_DIST = 1.4
const LASER_DUR = 0.4
const LASER_LEN = 30
const ENEMY_R = 0.5
const HIT_R = 1.0
const TUTORIAL_HIT_R = 1.4
const SPAWN_BASE = 3.0
const SPAWN_MIN = 0.8
const MAX_ENEMIES = 15
const INIT_LIVES = 5
const BASE_SPEED = 1.5
const TUTORIAL_SPEED = 0.7
const EXPLODE_DUR = 0.5

// ---- Helpers ----

function randDir(): [number, number, number] {
  const u = Math.random() * 2 - 1
  const th = Math.random() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return [r * Math.cos(th), u, r * Math.sin(th)]
}

function getEnemyPos(e: EnemyData, t: number): THREE.Vector3 {
  const d = Math.max(0, SPAWN_DIST - e.speed * (t - e.spawnTime))
  return new THREE.Vector3(e.dir[0] * d, e.dir[1] * d, e.dir[2] * d)
}

function b2s(b: [number, number, number]): [number, number, number] {
  return [b[0], b[2], b[1]]
}

function freshGame(tutorial: boolean): GameState {
  return {
    enemies: [], lasers: [], explosions: [],
    score: 0, lives: INIT_LIVES, wave: 1, combo: 0,
    spawnTimer: 0, waveTimer: 0, nextId: 0, time: 0,
    phase: 'menu', commands: [],
    tutorialStep: tutorial ? 0 : -1,
    tutorialAdvance: false,
    tutorialSpawned: false,
  }
}

// ---- 3D: Bloch wireframe ----

function BlochWire() {
  const rings = useMemo(() => {
    const mk = (fn: (t: number) => [number, number, number]) =>
      Array.from({ length: 65 }, (_, i) => fn((i / 64) * Math.PI * 2))
    return [
      mk(t => [Math.cos(t), 0, Math.sin(t)]),
      mk(t => [Math.cos(t), Math.sin(t), 0]),
      mk(t => [0, Math.sin(t), Math.cos(t)]),
    ]
  }, [])
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {rings.map((pts, i) => (
        <Line key={i} points={pts} color="#00d4ff" lineWidth={i === 0 ? 1 : 0.6} />
      ))}
    </group>
  )
}

// ---- 3D: Aim line ----

function AimLine({ dir }: { dir: [number, number, number] }) {
  const tipRef = useRef<THREE.Mesh>(null!)
  useFrame(() => {
    if (tipRef.current) tipRef.current.scale.setScalar(1 + 0.2 * Math.sin(Date.now() * 0.005))
  })
  const end: [number, number, number] = [dir[0] * 1.4, dir[1] * 1.4, dir[2] * 1.4]
  return (
    <group>
      <Line points={[[0, 0, 0], end]} color="#00ffff" lineWidth={2.5} />
      <mesh ref={tipRef} position={dir}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={dir}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

// ---- 3D: Enemy ----

function EnemyMesh({ data }: { data: EnemyData }) {
  const gRef = useRef<THREE.Group>(null!)
  const coreRef = useRef<THREE.Mesh>(null!)
  const dataRef = useRef(data)
  dataRef.current = data

  useFrame((state) => {
    if (!gRef.current) return
    const t = state.clock.getElapsedTime()
    const d = dataRef.current
    const dist = Math.max(0, SPAWN_DIST - d.speed * (t - d.spawnTime))
    gRef.current.position.set(d.dir[0] * dist, d.dir[1] * dist, d.dir[2] * dist)
    gRef.current.rotation.x += 0.008
    gRef.current.rotation.y += 0.011
    if (coreRef.current) {
      const intensity = Math.max(0.3, 1 - dist / SPAWN_DIST)
      ;(coreRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.8
    }
  })

  return (
    <group ref={gRef}>
      <mesh>
        <icosahedronGeometry args={[ENEMY_R, 0]} />
        <meshBasicMaterial color="#ff3333" wireframe />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[ENEMY_R * 1.3, 0]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.1} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[ENEMY_R * 0.35, 8, 8]} />
        <meshBasicMaterial color="#ff6644" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// ---- 3D: Laser beam ----

function LaserBeam({ data }: { data: LaserData }) {
  const innerRef = useRef<THREE.MeshBasicMaterial>(null!)
  const outerRef = useRef<THREE.MeshBasicMaterial>(null!)
  const dataRef = useRef(data)

  const quat = useMemo(() => {
    const d = new THREE.Vector3(...data.dir).normalize()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
  }, [data.dir[0], data.dir[1], data.dir[2]])

  useFrame((state) => {
    const age = state.clock.getElapsedTime() - dataRef.current.spawnTime
    const opacity = Math.max(0, 1 - age / LASER_DUR)
    if (innerRef.current) innerRef.current.opacity = opacity
    if (outerRef.current) outerRef.current.opacity = opacity * 0.3
  })

  return (
    <group quaternion={quat}>
      <mesh position={[0, LASER_LEN / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, LASER_LEN, 6, 1]} />
        <meshBasicMaterial ref={innerRef} color="#00ffff" transparent opacity={1} />
      </mesh>
      <mesh position={[0, LASER_LEN / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, LASER_LEN, 6, 1]} />
        <meshBasicMaterial ref={outerRef} color="#00d4ff" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ---- 3D: Explosion ----

function Boom({ data }: { data: ExplosionData }) {
  const ref = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  const dataRef = useRef(data)

  useFrame((state) => {
    const age = state.clock.getElapsedTime() - dataRef.current.spawnTime
    const t = age / EXPLODE_DUR
    if (ref.current) ref.current.scale.setScalar(0.3 + t * 2.5)
    if (matRef.current) matRef.current.opacity = Math.max(0, 1 - t) * 0.6
  })

  return (
    <mesh ref={ref} position={data.pos}>
      <icosahedronGeometry args={[0.5, 1]} />
      <meshBasicMaterial ref={matRef} color={data.color} transparent opacity={0.6} wireframe />
    </mesh>
  )
}

// ---- 3D: Game world ----

function GameWorld({
  gsRef,
  aimDir,
}: {
  gsRef: React.MutableRefObject<GameState>
  aimDir: [number, number, number]
}) {
  const [renderTick, setRenderTick] = useState(0)
  const prevCounts = useRef([0, 0, 0])

  useFrame((state, dt) => {
    const gs = gsRef.current
    if (gs.phase !== 'playing') return

    const t = state.clock.getElapsedTime()
    gs.time = t
    const delta = Math.min(dt, 0.1)
    let changed = false
    const isTutorial = gs.tutorialStep >= 0 && gs.tutorialStep < TUTORIAL.length

    // Process fire commands
    for (const cmd of gs.commands) {
      if (cmd.type === 'fire') {
        gs.lasers.push({ id: gs.nextId++, dir: cmd.dir, spawnTime: t })
        const dir = new THREE.Vector3(...cmd.dir).normalize()
        let hits = 0
        const hitRadius = isTutorial ? TUTORIAL_HIT_R : HIT_R
        gs.enemies = gs.enemies.filter(e => {
          const p = getEnemyPos(e, t)
          const cross = new THREE.Vector3().crossVectors(dir, p)
          const perpDist = cross.length()
          const forward = p.dot(dir) > 0
          if (forward && perpDist < hitRadius) {
            hits++
            const dist = p.length()
            gs.score += 100 + Math.floor(dist * 5)
            gs.explosions.push({
              id: gs.nextId++, pos: [p.x, p.y, p.z], spawnTime: t, color: '#00ffcc',
            })
            if (isTutorial) {
              gs.tutorialAdvance = true
              gs.tutorialSpawned = false
            }
            return false
          }
          return true
        })
        gs.combo = hits > 0 ? gs.combo + hits : 0
        changed = true
      }
    }
    gs.commands = []

    if (isTutorial) {
      // Tutorial: spawn one enemy at the step's direction
      if (!gs.tutorialSpawned && !gs.tutorialAdvance && gs.enemies.length === 0) {
        const step = TUTORIAL[gs.tutorialStep]
        gs.enemies.push({
          id: gs.nextId++,
          dir: step.enemyDir,
          speed: TUTORIAL_SPEED,
          spawnTime: t,
        })
        gs.tutorialSpawned = true
        changed = true
      }

      // Tutorial enemies reaching center: respawn without damage
      gs.enemies = gs.enemies.filter(e => {
        const dist = SPAWN_DIST - e.speed * (t - e.spawnTime)
        if (dist < KILL_DIST) {
          gs.explosions.push({
            id: gs.nextId++, pos: [e.dir[0] * KILL_DIST, e.dir[1] * KILL_DIST, e.dir[2] * KILL_DIST],
            spawnTime: t, color: '#ff8800',
          })
          gs.tutorialSpawned = false // will respawn next frame
          return false
        }
        return true
      })
    } else {
      // Free play: spawn random enemies
      gs.spawnTimer += delta
      const interval = Math.max(SPAWN_MIN, SPAWN_BASE - gs.wave * 0.12)
      if (gs.spawnTimer >= interval && gs.enemies.length < MAX_ENEMIES) {
        gs.spawnTimer = 0
        gs.enemies.push({
          id: gs.nextId++,
          dir: randDir(),
          speed: BASE_SPEED + gs.wave * 0.15 + Math.random() * 0.3,
          spawnTime: t,
        })
        changed = true
      }

      // Enemies reaching center: damage
      const beforeLen = gs.enemies.length
      gs.enemies = gs.enemies.filter(e => {
        const dist = SPAWN_DIST - e.speed * (t - e.spawnTime)
        if (dist < KILL_DIST) {
          const p = getEnemyPos(e, t)
          gs.explosions.push({
            id: gs.nextId++, pos: [p.x, p.y, p.z], spawnTime: t, color: '#ff4444',
          })
          gs.lives = Math.max(0, gs.lives - 1)
          if (gs.lives <= 0) gs.phase = 'gameover'
          return false
        }
        return true
      })
      if (gs.enemies.length !== beforeLen) changed = true

      // Wave progression
      gs.waveTimer += delta
      if (gs.waveTimer > 30) {
        gs.waveTimer = 0
        gs.wave++
      }
    }

    // Clean up expired
    gs.lasers = gs.lasers.filter(l => t - l.spawnTime < LASER_DUR)
    gs.explosions = gs.explosions.filter(x => t - x.spawnTime < EXPLODE_DUR)

    const counts = [gs.enemies.length, gs.lasers.length, gs.explosions.length]
    if (changed || counts[0] !== prevCounts.current[0] || counts[1] !== prevCounts.current[1] || counts[2] !== prevCounts.current[2]) {
      prevCounts.current = counts
      setRenderTick(k => k + 1)
    }
  })

  const gs = gsRef.current
  return (
    <>
      <ambientLight intensity={0.2} />
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.3} />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        dampingFactor={0.08}
        rotateSpeed={0.4}
        enableDamping
      />
      <BlochWire />
      <AimLine dir={aimDir} />
      {gs.enemies.map(e => <EnemyMesh key={e.id} data={e} />)}
      {gs.lasers.map(l => <LaserBeam key={l.id} data={l} />)}
      {gs.explosions.map(x => <Boom key={x.id} data={x} />)}
    </>
  )
}

// ---- Gate definitions ----

const GATES: [string, string, Gate, string][] = [
  ['1', 'H', H_GATE, 'Superposition'],
  ['2', 'X', X_GATE, 'Bit flip'],
  ['3', 'Y', Y_GATE, 'Flip + phase'],
  ['4', 'Z', Z_GATE, 'Phase flip'],
  ['5', 'S', S_GATE, '90\u00B0 phase'],
  ['6', 'T', T_GATE, '45\u00B0 phase'],
  ['7', 'S\u2020', SDG_GATE, '\u221290\u00B0'],
  ['8', 'T\u2020', TDG_GATE, '\u221245\u00B0'],
]

// ---- Page ----

export default function QuantumShooterPage() {
  const [mounted, setMounted] = useState(false)
  const [qubitState, setQubitState] = useState<StateVector>([[1, 0], [0, 0]])
  const [lastGate, setLastGate] = useState('')
  const [hudTick, setHudTick] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const gsRef = useRef<GameState>(freshGame(true))

  useEffect(() => setMounted(true), [])

  // HUD sync ~15fps + tutorial step advancement
  useEffect(() => {
    const iv = setInterval(() => {
      const gs = gsRef.current
      if (gs.tutorialAdvance) {
        gs.tutorialAdvance = false
        gs.tutorialStep++
        // Reset qubit to |0⟩ for clean next step
        setQubitState([[1, 0], [0, 0]])
        if (gs.tutorialStep >= TUTORIAL.length) {
          gs.tutorialStep = -1 // switch to free play
        }
      }
      setHudTick(t => t + 1)
    }, 66)
    return () => clearInterval(iv)
  }, [])

  const coords = blochCoords(qubitState)
  const aimDir = b2s(coords)

  const applyGate = useCallback((name: string, gate: Gate) => {
    setQubitState(prev => applySingleQubitGate(gate, 0, prev, 1))
    setLastGate(name)
    setTimeout(() => setLastGate(''), 400)
  }, [])

  const fire = useCallback(() => {
    const gs = gsRef.current
    if (gs.phase !== 'playing') return
    gs.commands.push({ type: 'fire', dir: aimDir })
  }, [aimDir])

  const startGame = useCallback((tutorial: boolean) => {
    const gs = gsRef.current
    Object.assign(gs, freshGame(tutorial))
    gs.phase = 'playing'
    setQubitState([[1, 0], [0, 0]])
    setLastGate('')
    setShowInfo(false)
    setHudTick(t => t + 1)
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const gs = gsRef.current

      if (e.code === 'Space') {
        e.preventDefault()
        if (gs.phase === 'playing') fire()
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        setShowInfo(v => !v)
        return
      }

      if (gs.phase !== 'playing') return
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < GATES.length) {
        const [, name, gate] = GATES[idx]
        applyGate(name, gate)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fire, applyGate])

  const gs = gsRef.current
  const isTutorial = gs.tutorialStep >= 0 && gs.tutorialStep < TUTORIAL.length
  const tutorialStep = isTutorial ? TUTORIAL[gs.tutorialStep] : null

  return (
    <div className="h-screen w-screen bg-[#050510] overflow-hidden relative select-none">
      {/* 3D Canvas */}
      {mounted && (
        <Canvas
          camera={{ position: [0, 3, 8], fov: 55, near: 0.1, far: 200 }}
          style={{ background: '#050510' }}
          gl={{ antialias: true, alpha: false }}
        >
          <GameWorld gsRef={gsRef} aimDir={aimDir} />
        </Canvas>
      )}

      {/* ---- HUD: Playing ---- */}
      {gs.phase === 'playing' && (
        <>
          {/* Score + wave */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="text-3xl font-mono font-bold text-white tabular-nums">
              {gs.score.toLocaleString()}
            </div>
            {!isTutorial && (
              <div className="text-xs font-mono text-gray-500 mt-1">WAVE {gs.wave}</div>
            )}
            {gs.combo > 1 && (
              <div className="text-sm font-mono text-[#00ffcc] mt-1">{gs.combo}x COMBO</div>
            )}
          </div>

          {/* Lives */}
          {!isTutorial && (
            <div className="absolute top-4 right-4 pointer-events-none">
              <div className="text-[10px] font-mono text-gray-600 mb-1 text-right">SHIELDS</div>
              <div className="flex gap-1.5 justify-end">
                {Array.from({ length: INIT_LIVES }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < gs.lives ? 'bg-[#00d4ff] shadow-[0_0_6px_#00d4ff]' : 'bg-gray-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tutorial step indicator */}
          {isTutorial && (
            <div className="absolute top-4 right-4 pointer-events-none">
              <div className="text-[10px] font-mono text-gray-600">
                TUTORIAL {gs.tutorialStep + 1}/{TUTORIAL.length}
              </div>
            </div>
          )}

          {/* Gate flash */}
          {lastGate && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="text-5xl font-mono text-[#00d4ff]/25 font-bold">{lastGate}</div>
            </div>
          )}

          {/* Tutorial panel */}
          {tutorialStep && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-md pointer-events-none">
              <div className="bg-black/80 backdrop-blur-md border border-[#00d4ff]/30 rounded-lg px-5 py-4">
                <div className="text-xs font-mono text-[#00d4ff] tracking-widest mb-2">
                  {tutorialStep.title}
                </div>
                <p className="text-sm font-mono text-gray-300 leading-relaxed mb-3 whitespace-pre-line">
                  {tutorialStep.body}
                </p>
                <div className="text-sm font-mono text-[#00ffcc] animate-pulse">
                  {tutorialStep.hint}
                </div>
              </div>
            </div>
          )}

          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-6 h-6 border border-[#00d4ff]/30 rounded-full" />
          </div>

          {/* Gate bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 pb-4">
            <div className="flex justify-center gap-1.5 flex-wrap">
              {GATES.map(([key, name, gate, desc]) => {
                const highlighted = tutorialStep?.highlight.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => applyGate(name, gate)}
                    className={`group relative px-3 py-2 font-mono text-sm rounded transition-all active:scale-95 ${
                      highlighted
                        ? 'bg-[#00d4ff]/20 border-2 border-[#00d4ff] text-[#00ffff] animate-pulse shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                        : 'bg-black/70 backdrop-blur-sm border border-white/10 hover:border-[#00d4ff]/50 hover:bg-[#00d4ff]/10 text-white'
                    }`}
                  >
                    <span className="text-[10px] text-gray-500 mr-1">{key}</span>
                    {name}
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {desc}
                    </span>
                  </button>
                )
              })}
              <button
                onClick={fire}
                className="px-5 py-2 font-mono text-sm bg-[#00d4ff]/20 border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30 rounded text-[#00ffff] font-bold transition-all active:scale-95 ml-1"
              >
                FIRE
              </button>
              <button
                onClick={() => setShowInfo(v => !v)}
                className="px-3 py-2 font-mono text-sm bg-black/70 border border-white/10 hover:border-white/30 rounded text-gray-400 hover:text-white transition-all active:scale-95"
                title="Gate reference (Tab)"
              >
                ?
              </button>
            </div>
            <div className="text-center text-[10px] font-mono text-gray-700 mt-2">
              ({coords[0].toFixed(2)}, {coords[1].toFixed(2)}, {coords[2].toFixed(2)})
              <span className="ml-3 text-gray-800">drag to look around</span>
            </div>
          </div>

          {/* Gate reference panel */}
          {showInfo && (
            <div className="absolute top-12 right-0 bottom-16 w-80 overflow-y-auto">
              <div className="bg-black/90 backdrop-blur-md border-l border-[#00d4ff]/20 p-4 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-mono text-[#00d4ff] tracking-widest">GATE REFERENCE</h2>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="text-gray-500 hover:text-white text-xs font-mono"
                  >
                    [Tab] close
                  </button>
                </div>
                <div className="space-y-4">
                  {GATE_REF.map(g => (
                    <div key={g.key} className="border-b border-white/5 pb-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-white font-mono font-bold">{g.name}</span>
                        <span className="text-gray-500 font-mono text-xs">{g.full}</span>
                        <span className="text-gray-700 font-mono text-[10px] ml-auto">[{g.key}]</span>
                      </div>
                      <div className="text-xs font-mono text-[#00d4ff]/70 mb-1">{g.effect}</div>
                      <p className="text-xs font-mono text-gray-400 leading-relaxed">{g.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] font-mono text-gray-600 leading-relaxed">
                    Gates are unitary operations on a qubit. Each one rotates the state vector on the Bloch sphere.
                    Combining gates lets you reach any point on the sphere.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- Menu ---- */}
      {gs.phase === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-bold font-mono text-[#00d4ff] mb-3 tracking-tight">
            QUANTUM SHOOTER
          </h1>
          <p className="text-gray-400 font-mono text-sm mb-6 max-w-md text-center leading-relaxed px-4">
            Enemies approach your Bloch sphere. Apply quantum gates to aim
            your laser, then fire. Learn what each gate does by surviving.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => startGame(true)}
              className="px-8 py-3 font-mono text-white bg-[#00d4ff]/10 border border-[#00d4ff]/50 rounded hover:bg-[#00d4ff]/20 transition-all w-56"
            >
              Tutorial
            </button>
            <button
              onClick={() => startGame(false)}
              className="px-8 py-3 font-mono text-gray-400 border border-white/15 rounded hover:bg-white/5 hover:text-white transition-all w-56"
            >
              Free Play
            </button>
          </div>
          <p className="text-gray-700 font-mono text-xs mt-8 max-w-sm text-center">
            Keys 1&ndash;8 = gates &middot; SPACE = fire &middot; drag = look around &middot; Tab = gate reference
          </p>
        </div>
      )}

      {/* ---- Game Over ---- */}
      {gs.phase === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <h1 className="text-4xl md:text-5xl font-bold font-mono text-red-500 mb-4">
            DECOHERENCE
          </h1>
          <div className="text-4xl font-mono text-white mb-1 tabular-nums">
            {gs.score.toLocaleString()}
          </div>
          <div className="text-sm font-mono text-gray-500 mb-8">Wave {gs.wave}</div>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => startGame(true)}
              className="px-8 py-3 font-mono text-white border border-[#00d4ff]/50 rounded hover:bg-[#00d4ff]/10 transition-all w-56"
            >
              Tutorial
            </button>
            <button
              onClick={() => startGame(false)}
              className="px-8 py-3 font-mono text-gray-400 border border-white/20 rounded hover:bg-white/5 hover:text-white transition-all w-56"
            >
              Free Play
            </button>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/bloch-sphere"
        className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-mono text-gray-700 hover:text-white transition-colors z-10"
      >
        &larr; bloch sphere
      </Link>

      <InputWidget />
    </div>
  )
}
