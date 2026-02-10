'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'

// Rabi oscillation physics:
// P(|1⟩, t) = (Ω/Ω_eff)² sin²(Ω_eff·t/2)
// Ω_eff = √(Ω² + Δ²)
// With damping: multiply by exp(-t/T₂)

function rabiP1(t: number, omega: number, detuning: number, t2: number): number {
  const omegaEff = Math.sqrt(omega * omega + detuning * detuning)
  if (omegaEff < 1e-10) return 0
  const ratio = omega / omegaEff
  const osc = Math.sin(omegaEff * t / 2)
  const decay = t2 > 0 ? Math.exp(-t / t2) : 1
  return ratio * ratio * osc * osc * decay
}

// Bloch coords during Rabi oscillation
function rabiBloch(t: number, omega: number, detuning: number, t2: number): [number, number, number] {
  const p1 = rabiP1(t, omega, detuning, t2)
  const p0 = 1 - p1
  const theta = 2 * Math.acos(Math.sqrt(Math.max(0, Math.min(1, p0))))
  const omegaEff = Math.sqrt(omega * omega + detuning * detuning)
  const phi = omegaEff * t
  return [
    Math.sin(theta) * Math.cos(phi),
    Math.sin(theta) * Math.sin(phi),
    Math.cos(theta),
  ]
}

// Viridis-inspired colormap: dark purple → blue → teal → green → yellow
function viridis(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t))
  // 6-stop interpolation matching viridis
  const stops: [number, number, number, number][] = [
    [0.00, 68, 1, 84],
    [0.20, 59, 82, 139],
    [0.40, 33, 145, 140],
    [0.60, 53, 183, 121],
    [0.80, 144, 215, 67],
    [1.00, 253, 231, 37],
  ]
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++
  const [t0, r0, g0, b0] = stops[i]
  const [t1, r1, g1, b1] = stops[i + 1]
  const f = (t - t0) / (t1 - t0)
  return [
    Math.round(r0 + f * (r1 - r0)),
    Math.round(g0 + f * (g1 - g0)),
    Math.round(b0 + f * (b1 - b0)),
  ]
}

export default function RabiPage() {
  const chevronRef = useRef<HTMLCanvasElement>(null)
  const sliceRef = useRef<HTMLCanvasElement>(null)
  const blochRef = useRef<HTMLCanvasElement>(null)

  const [omega, setOmega] = useState(4.0)       // Rabi frequency (MHz)
  const [t2, setT2] = useState(0)                // T2 dephasing (0 = off)
  const [qubitFreq] = useState(8.50)             // Qubit frequency (GHz)
  const [freqSpan, setFreqSpan] = useState(0.04) // Frequency span (GHz) — ±span around qubit
  const [maxPulse, setMaxPulse] = useState(2.0)  // Max pulse length (μs)

  // Crosshair position (selected point on chevron)
  const [selFreq, setSelFreq] = useState(qubitFreq) // Selected drive freq
  const [selTime, setSelTime] = useState(0.5)        // Selected pulse length
  const [isDragging, setIsDragging] = useState(false)

  const selDetuning = (selFreq - qubitFreq) * 1000 // Convert GHz offset to MHz
  const selP1 = rabiP1(selTime, omega, selDetuning, t2)
  const omegaEff = Math.sqrt(omega * omega + selDetuning * selDetuning)

  // Precompute chevron heatmap data
  const chevronData = useMemo(() => {
    const res = 200
    const data = new Float32Array(res * res)
    for (let yi = 0; yi < res; yi++) {
      const t = (yi / (res - 1)) * maxPulse
      for (let xi = 0; xi < res; xi++) {
        const freq = qubitFreq - freqSpan + (xi / (res - 1)) * 2 * freqSpan
        const det = (freq - qubitFreq) * 1000 // GHz to MHz
        data[yi * res + xi] = rabiP1(t, omega, det, t2)
      }
    }
    return { data, res }
  }, [omega, t2, qubitFreq, freqSpan, maxPulse])

  // Map pixel position to frequency/time
  const pixelToCoords = useCallback((canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    const pad = { left: 55, right: 60, top: 15, bottom: 35 }
    const cw = rect.width - pad.left - pad.right
    const ch = rect.height - pad.top - pad.bottom
    const px = clientX - rect.left - pad.left
    const py = clientY - rect.top - pad.top
    const freq = qubitFreq - freqSpan + (px / cw) * 2 * freqSpan
    const time = (py / ch) * maxPulse
    return {
      freq: Math.max(qubitFreq - freqSpan, Math.min(qubitFreq + freqSpan, freq)),
      time: Math.max(0, Math.min(maxPulse, time)),
    }
  }, [qubitFreq, freqSpan, maxPulse])

  const handleChevronMouse = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.type === 'mousedown') setIsDragging(true)
    if (e.type === 'mouseup' || e.type === 'mouseleave') { setIsDragging(false); return }
    if (e.type === 'mousemove' && !isDragging) return
    const canvas = chevronRef.current
    if (!canvas) return
    const { freq, time } = pixelToCoords(canvas, e.clientX, e.clientY)
    setSelFreq(freq)
    setSelTime(time)
  }, [isDragging, pixelToCoords])

  // ─── Chevron heatmap ───
  useEffect(() => {
    const canvas = chevronRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const pad = { left: 55, right: 60, top: 15, bottom: 35 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Render heatmap using ImageData for performance
    const { data, res } = chevronData
    const imgData = ctx.createImageData(Math.ceil(cw), Math.ceil(ch))
    const imgW = imgData.width, imgH = imgData.height

    for (let py = 0; py < imgH; py++) {
      for (let px = 0; px < imgW; px++) {
        const xi = Math.floor((px / imgW) * res)
        const yi = Math.floor((py / imgH) * res)
        const val = data[yi * res + Math.min(xi, res - 1)]
        const [r, g, b] = viridis(val)
        const idx = (py * imgW + px) * 4
        imgData.data[idx] = r
        imgData.data[idx + 1] = g
        imgData.data[idx + 2] = b
        imgData.data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, pad.left * dpr, pad.top * dpr)
    // Re-scale since putImageData ignores transforms
    // Instead, draw via offscreen canvas
    const offscreen = document.createElement('canvas')
    offscreen.width = imgW
    offscreen.height = imgH
    offscreen.getContext('2d')!.putImageData(imgData, 0, 0)
    ctx.clearRect(pad.left, pad.top, cw, ch)
    ctx.drawImage(offscreen, pad.left, pad.top, cw, ch)

    // Y-axis labels (Pulse length)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const t = (i / 4) * maxPulse
      const y = pad.top + (i / 4) * ch
      ctx.fillText(t.toFixed(1), pad.left - 6, y + 3)
      // Tick
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad.left - 3, y)
      ctx.lineTo(pad.left, y)
      ctx.stroke()
    }
    // Y-axis title
    ctx.save()
    ctx.translate(11, pad.top + ch / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Pulse length (\u03BCs)', 0, 0)
    ctx.restore()

    // X-axis labels (Drive frequency)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px JetBrains Mono, monospace'
    const nTicks = 5
    for (let i = 0; i <= nTicks; i++) {
      const freq = qubitFreq - freqSpan + (i / nTicks) * 2 * freqSpan
      const x = pad.left + (i / nTicks) * cw
      ctx.fillText(freq.toFixed(3), x, h - pad.bottom + 16)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, pad.top + ch)
      ctx.lineTo(x, pad.top + ch + 3)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.fillText('Drive frequency (GHz)', pad.left + cw / 2, h - 2)

    // Qubit frequency marker
    const qx = pad.left + ((qubitFreq - (qubitFreq - freqSpan)) / (2 * freqSpan)) * cw
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(qx, pad.top)
    ctx.lineTo(qx, pad.top + ch)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`f\u2080 = ${qubitFreq.toFixed(3)}`, qx, pad.top - 3)

    // Crosshair
    const cx = pad.left + ((selFreq - (qubitFreq - freqSpan)) / (2 * freqSpan)) * cw
    const cy = pad.top + (selTime / maxPulse) * ch
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(cx, pad.top)
    ctx.lineTo(cx, pad.top + ch)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pad.left, cy)
    ctx.lineTo(pad.left + cw, cy)
    ctx.stroke()
    ctx.setLineDash([])

    // Crosshair dot
    ctx.fillStyle = '#fff'
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Readout
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    const readX = cx + 10 > pad.left + cw - 120 ? cx - 130 : cx + 10
    const readY = cy - 10 < pad.top + 20 ? cy + 20 : cy - 10
    ctx.fillText(`f = ${selFreq.toFixed(4)} GHz`, readX, readY)
    ctx.fillText(`t = ${selTime.toFixed(3)} \u03BCs`, readX, readY + 13)
    ctx.fillStyle = '#fde725'
    ctx.fillText(`P(|1\u27E9) = ${selP1.toFixed(3)}`, readX, readY + 26)

    // Colorbar
    const cbX = w - pad.right + 12, cbY = pad.top, cbW = 14, cbH = ch
    for (let i = 0; i < cbH; i++) {
      const val = 1 - i / cbH
      const [r, g, b] = viridis(val)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(cbX, cbY + i, cbW, 1.5)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(cbX, cbY, cbW, cbH)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('1.0', cbX + cbW + 3, cbY + 4)
    ctx.fillText('0.5', cbX + cbW + 3, cbY + cbH / 2 + 3)
    ctx.fillText('0.0', cbX + cbW + 3, cbY + cbH + 3)
    // Label
    ctx.save()
    ctx.translate(cbX + cbW + 16, cbY + cbH / 2)
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('rel. excitation', 0, 0)
    ctx.restore()

  }, [chevronData, selFreq, selTime, selP1, qubitFreq, freqSpan, maxPulse])

  // ─── 1D time slice at selected detuning ───
  useEffect(() => {
    const canvas = sliceRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const pad = { left: 45, right: 10, top: 10, bottom: 25 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Grid
    for (let i = 0; i <= 2; i++) {
      const y = pad.top + ch * (1 - i / 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText((i / 2).toFixed(1), pad.left - 4, y + 3)
    }

    // X axis
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '9px JetBrains Mono, monospace'
    for (let t = 0; t <= maxPulse; t += maxPulse / 4) {
      const x = pad.left + (t / maxPulse) * cw
      ctx.fillText(t.toFixed(1), x, h - 4)
    }

    // P(|1⟩) curve at selected detuning
    ctx.strokeStyle = '#fde725'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= cw; i++) {
      const t = (i / cw) * maxPulse
      const p = rabiP1(t, omega, selDetuning, t2)
      const y = pad.top + ch * (1 - p)
      if (i === 0) ctx.moveTo(pad.left + i, y)
      else ctx.lineTo(pad.left + i, y)
    }
    ctx.stroke()

    // Envelope
    if (t2 > 0) {
      const ratio = omegaEff > 1e-10 ? (omega / omegaEff) : 0
      ctx.strokeStyle = 'rgba(253, 231, 37, 0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      for (let i = 0; i <= cw; i++) {
        const t = (i / cw) * maxPulse
        const env = ratio * ratio * Math.exp(-t / t2)
        const y = pad.top + ch * (1 - env)
        if (i === 0) ctx.moveTo(pad.left + i, y)
        else ctx.lineTo(pad.left + i, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Selected time marker
    const tx = pad.left + (selTime / maxPulse) * cw
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(tx, pad.top)
    ctx.lineTo(tx, pad.top + ch)
    ctx.stroke()
    ctx.setLineDash([])

    // Point
    const py = pad.top + ch * (1 - selP1)
    ctx.shadowColor = '#fde725'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#fde725'
    ctx.beginPath()
    ctx.arc(tx, py, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`\u0394 = ${selDetuning.toFixed(1)} MHz  |  P(|1\u27E9) vs t`, pad.left + 4, pad.top + 10)

  }, [omega, selDetuning, t2, selTime, selP1, maxPulse, omegaEff])

  // ─── Mini Bloch sphere ───
  useEffect(() => {
    const canvas = blochRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const cx = w / 2, cy = h / 2
    const R = Math.min(w, h) * 0.38

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

    // Sphere surface
    const gx = cx - R * 0.2, gy = cy - R * 0.2
    const sphereGrad = ctx.createRadialGradient(gx, gy, R * 0.05, cx, cy, R)
    sphereGrad.addColorStop(0, 'rgba(50, 60, 80, 0.18)')
    sphereGrad.addColorStop(0.7, 'rgba(20, 30, 50, 0.12)')
    sphereGrad.addColorStop(1, 'rgba(253, 231, 37, 0.04)')
    ctx.fillStyle = sphereGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()

    // Equator ring
    const segs = 48
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * Math.PI * 2
      const t1 = ((i + 1) / segs) * Math.PI * 2
      const [px0, py0, pz0] = project(Math.cos(t0), 0, Math.sin(t0))
      const [px1, py1, pz1] = project(Math.cos(t1), 0, Math.sin(t1))
      const op = (pz0 + pz1) / 2 > 0 ? 0.15 : 0.05
      ctx.strokeStyle = `rgba(253, 231, 37, ${op})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px0, py0)
      ctx.lineTo(px1, py1)
      ctx.stroke()
    }

    // Z axis
    const [zt, yt1] = project(0, 1.2, 0)
    const [zb, yb1] = project(0, -1.2, 0)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(zt, yt1)
    ctx.lineTo(zb, yb1)
    ctx.stroke()

    // Labels
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    const [lx0, ly0] = project(0, 1.35, 0)
    ctx.fillText('|0\u27E9', lx0, ly0)
    const [lx1, ly1] = project(0, -1.35, 0)
    ctx.fillText('|1\u27E9', lx1, ly1)

    // Trajectory trace (sweep pulse length at selected detuning)
    const trailSteps = 60
    for (let i = 0; i <= trailSteps; i++) {
      const tt = (i / trailSteps) * selTime
      const [bx, by, bz] = rabiBloch(tt, omega, selDetuning, t2)
      const [px, py, pz] = project(bx, bz, by)
      const age = i / trailSteps
      const depthFade = pz > 0 ? 1 : 0.3
      const val = rabiP1(tt, omega, selDetuning, t2)
      const [cr, cg, cb] = viridis(val)
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${(age * depthFade * 0.6).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(px, py, pz > 0 ? 2.2 : 1.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Current state point
    const [bx, by, bz] = rabiBloch(selTime, omega, selDetuning, t2)
    const [sx, sy] = project(bx, bz, by)
    const [ox, oy] = project(0, 0, 0)

    ctx.strokeStyle = '#fde725'
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(sx, sy)
    ctx.stroke()
    ctx.globalAlpha = 1

    const [cr, cg, cb] = viridis(selP1)
    ctx.shadowColor = `rgb(${cr},${cg},${cb})`
    ctx.shadowBlur = 14
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`
    ctx.beginPath()
    ctx.arc(sx, sy, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 6
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(sx, sy, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

  }, [selTime, omega, selDetuning, t2, selP1])

  // Resize handler
  useEffect(() => {
    const canvas = chevronRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setSelTime(t => t))
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold text-[#fde725]">Rabi Chevron</span>
        <span className="text-xs font-mono text-gray-600 ml-auto">
          click + drag on heatmap
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Visualizations */}
        <div className="flex-1 flex flex-col">
          {/* Chevron heatmap — hero */}
          <div className="flex-1 relative min-h-[320px]">
            <canvas
              ref={chevronRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              onMouseDown={handleChevronMouse}
              onMouseMove={handleChevronMouse}
              onMouseUp={handleChevronMouse}
              onMouseLeave={handleChevronMouse}
            />
          </div>
          {/* Bottom row: 1D slice + Bloch sphere */}
          <div className="h-[160px] flex border-t border-white/5">
            <div className="flex-1 relative">
              <canvas ref={sliceRef} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="w-[160px] relative border-l border-white/5">
              <canvas ref={blochRef} className="absolute inset-0 w-full h-full" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="lg:w-72 p-5 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Rabi frequency */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
              Rabi Frequency: &#x3A9; = {omega.toFixed(1)} MHz
            </h3>
            <input
              type="range" min={0.5} max={12} step={0.1} value={omega}
              onChange={e => setOmega(parseFloat(e.target.value))}
              className="w-full accent-[#fde725]"
            />
          </div>

          {/* T2 Damping */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
              T&#x2082; Dephasing: {t2 === 0 ? 'Off' : `${t2.toFixed(1)} \u03BCs`}
            </h3>
            <input
              type="range" min={0} max={10} step={0.2} value={t2}
              onChange={e => setT2(parseFloat(e.target.value))}
              className="w-full accent-[#fde725]"
            />
          </div>

          {/* Max pulse length */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
              Max Pulse: {maxPulse.toFixed(1)} &mu;s
            </h3>
            <input
              type="range" min={0.5} max={5} step={0.1} value={maxPulse}
              onChange={e => setMaxPulse(parseFloat(e.target.value))}
              className="w-full accent-[#fde725]"
            />
          </div>

          {/* Freq span */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
              Freq Span: &plusmn;{(freqSpan * 1000).toFixed(0)} MHz
            </h3>
            <input
              type="range" min={0.005} max={0.08} step={0.005} value={freqSpan}
              onChange={e => setFreqSpan(parseFloat(e.target.value))}
              className="w-full accent-[#fde725]"
            />
          </div>

          {/* Readout */}
          <div className="mb-5 p-3 rounded bg-white/[0.03] border border-white/5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Selected Point</h3>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Drive freq</span>
                <span className="text-white">{selFreq.toFixed(4)} GHz</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Detuning &#x394;</span>
                <span className="text-white">{selDetuning.toFixed(1)} MHz</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Pulse length</span>
                <span className="text-white">{selTime.toFixed(3)} &mu;s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>&#x3A9;<sub>eff</sub></span>
                <span className="text-white">{omegaEff.toFixed(2)} MHz</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-1 border-t border-white/5">
                <span>P(|1&#x27E9;)</span>
                <span className="text-[#fde725] font-bold">{selP1.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="mb-5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Presets</h3>
            <div className="space-y-1.5">
              {[
                { name: 'Clean chevron', desc: 'No damping', o: 4, t: 0, mp: 2, fs: 0.04 },
                { name: 'Wide sweep', desc: 'Large detuning range', o: 6, t: 0, mp: 1.5, fs: 0.06 },
                { name: 'Damped (realistic)', desc: 'T\u2082 = 3 \u03BCs', o: 5, t: 3, mp: 3, fs: 0.04 },
                { name: 'Slow drive', desc: 'Low Rabi freq', o: 1.5, t: 0, mp: 4, fs: 0.02 },
              ].map(p => (
                <button
                  key={p.name}
                  onClick={() => { setOmega(p.o); setT2(p.t); setMaxPulse(p.mp); setFreqSpan(p.fs) }}
                  className="w-full text-left px-3 py-1.5 rounded border bg-white/[0.02] border-white/5 text-gray-400 hover:border-[#fde725]/30 hover:text-white transition-all"
                >
                  <div className="text-xs font-medium">{p.name}</div>
                  <div className="text-[10px] font-mono text-gray-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Physics */}
          <div className="p-3 rounded bg-white/[0.02] border border-white/5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Rabi Chevron</h3>
            <div className="text-[11px] text-gray-400 space-y-1.5">
              <p>The characteristic &ldquo;V&rdquo; pattern from sweeping drive frequency vs pulse length on a superconducting qubit.</p>
              <p>At <span className="text-[#fde725]">resonance</span>: full-amplitude oscillations at &#x3A9;. Off-resonance: faster oscillations but reduced amplitude.</p>
              <p className="font-mono text-[10px] text-gray-500">P(|1&#x27E9;) = (&#x3A9;/&#x3A9;<sub>eff</sub>)&#xB2; sin&#xB2;(&#x3A9;<sub>eff</sub>t/2)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
