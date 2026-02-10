'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Particles({ count = 2000 }) {
  const mesh = useRef<THREE.Points>(null!)
  const light = useRef<THREE.PointLight>(null!)

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const cyan = new THREE.Color('#00d4ff')
    const purple = new THREE.Color('#8b5cf6')
    const green = new THREE.Color('#00ff88')
    const palette = [cyan, purple, green]

    for (let i = 0; i < count; i++) {
      // Spherical distribution with varying density
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 3 + Math.random() * 4

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const color = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = Math.random() * 3 + 0.5
    }

    return { positions, colors, sizes }
  }, [count])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    mesh.current.rotation.y = time * 0.05
    mesh.current.rotation.x = Math.sin(time * 0.03) * 0.1

    if (light.current) {
      light.current.position.x = Math.sin(time * 0.5) * 3
      light.current.position.z = Math.cos(time * 0.5) * 3
    }

    // Animate individual particles
    const positions = mesh.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]
      const dist = Math.sqrt(x * x + y * y + z * z)
      positions[i3 + 1] += Math.sin(time * 2 + dist) * 0.002
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <>
      <pointLight ref={light} color="#00d4ff" intensity={2} distance={20} />
      <pointLight position={[0, 0, 0]} color="#8b5cf6" intensity={0.5} distance={15} />
      <points ref={mesh}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={particles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  )
}

function ConnectionLines() {
  const lineRef = useRef<THREE.LineSegments>(null!)

  const lines = useMemo(() => {
    const positions: number[] = []
    const nodeCount = 30
    const nodes: THREE.Vector3[] = []

    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      ))
    }

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 3) {
          positions.push(nodes[i].x, nodes[i].y, nodes[i].z)
          positions.push(nodes[j].x, nodes[j].y, nodes[j].z)
        }
      }
    }

    return new Float32Array(positions)
  }, [])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    lineRef.current.rotation.y = time * 0.03
    lineRef.current.rotation.z = Math.sin(time * 0.02) * 0.1
  })

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={lines.length / 3}
          array={lines}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00d4ff" transparent opacity={0.06} />
    </lineSegments>
  )
}

export default function QuantumField() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={['#0a0a1a', 5, 15]} />
        <ambientLight intensity={0.1} />
        <Particles />
        <ConnectionLines />
      </Canvas>
    </div>
  )
}
