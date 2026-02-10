'use client'

import { useRef, useEffect } from 'react'

interface WavCanvasProps {
  /** Controls parameters like frequency/amplitude, NOT the wave phase */
  progress: number
  width?: number
  height?: number
  /** frequency in arbitrary canvas units */
  frequency?: number
  /** 0-1, how much wave is visible */
  amplitude?: number
  color?: string
  className?: string
}

/**
 * Canvas-rendered travelling sine wave.
 * Wave animates continuously on its own clock.
 * frequency and amplitude can be driven by scroll progress.
 */
export default function WavCanvas({
  progress,
  width = 600,
  height = 120,
  frequency = 3,
  amplitude = 1,
  color = '#00d4ff',
  className = '',
}: WavCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const phaseRef = useRef(0)
  const lastTimeRef = useRef(0)
  // Store latest props in refs so the rAF loop always sees current values
  const propsRef = useRef({ frequency, amplitude, color, width, height })
  propsRef.current = { frequency, amplitude, color, width, height }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    lastTimeRef.current = performance.now()

    const draw = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time

      const { frequency: freq, amplitude: amp, color: col, width: w, height: h } = propsRef.current

      // Advance phase based on real time
      phaseRef.current += dt * 2.5 // ~2.5 radians/sec base speed

      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      const mid = h / 2
      const a = (h / 2 - 10) * amp

      ctx.beginPath()
      ctx.strokeStyle = col
      ctx.lineWidth = 2
      ctx.globalAlpha = Math.min(1, amp * 2)

      for (let x = 0; x < w; x++) {
        const t = x / w
        const y = mid + a * Math.sin(2 * Math.PI * freq * t - phaseRef.current)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, []) // single mount — props read via ref

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={className}
    />
  )
}
