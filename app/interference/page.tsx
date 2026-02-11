'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// N-slit interference pattern:
// I(theta) = |single-slit envelope|^2 * |multi-slit interference|^2
// single-slit: sinc(alpha) where alpha = pi*a*sin(theta)/lambda
// multi-slit: sin(N*beta)/sin(beta) where beta = pi*d*sin(theta)/lambda

function intensity(
  theta: number,
  nSlits: number,
  slitWidth: number,   // a (nm)
  slitSep: number,     // d (nm)
  wavelength: number,  // lambda (nm)
): number {
  // Single-slit diffraction envelope
  const alpha = Math.PI * slitWidth * Math.sin(theta) / wavelength
  const singleSlit = Math.abs(alpha) < 1e-10 ? 1 : Math.sin(alpha) / alpha

  // Multi-slit interference
  const beta = Math.PI * slitSep * Math.sin(theta) / wavelength
  let multiSlit: number
  if (Math.abs(Math.sin(beta)) < 1e-10) {
    multiSlit = nSlits
  } else {
    multiSlit = Math.sin(nSlits * beta) / Math.sin(beta)
  }

  return (singleSlit * singleSlit) * (multiSlit * multiSlit) / (nSlits * nSlits)
}

// Wavelength to RGB color
function wavelengthToRGB(nm: number): string {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1 }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20 }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65 }
  else if (nm >= 645 && nm <= 780) { r = 1 }

  // Intensity falloff at edges
  let factor = 1
  if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40
  else if (nm > 700 && nm <= 780) factor = 0.3 + 0.7 * (780 - nm) / 80

  r = Math.round(255 * Math.pow(r * factor, 0.8))
  g = Math.round(255 * Math.pow(g * factor, 0.8))
  b = Math.round(255 * Math.pow(b * factor, 0.8))
  return `rgb(${r},${g},${b})`
}

export default function InterferencePage() {
  const patternRef = useRef<HTMLCanvasElement>(null)
  const slitsRef = useRef<HTMLCanvasElement>(null)
  const [nSlits, setNSlits] = useState(2)
  const [slitWidth, setSlitWidth] = useState(100)    // nm
  const [slitSep, setSlitSep] = useState(500)        // nm
  const [wavelength, setWavelength] = useState(550)   // nm (green)
  const [showEnvelope, setShowEnvelope] = useState(true)
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<number[]>([])
  const particleTimerRef = useRef<number>(0)

  const lightColor = wavelengthToRGB(wavelength)

  // Particle accumulation
  useEffect(() => {
    if (!showParticles) return
    setParticles([])
    const maxAngle = 0.05

    const tick = () => {
      // Sample from the interference distribution using rejection sampling
      setParticles(prev => {
        if (prev.length > 5000) return prev
        const newParticles: number[] = []
        for (let i = 0; i < 3; i++) {
          let accepted = false
          for (let attempt = 0; attempt < 50 && !accepted; attempt++) {
            const theta = (Math.random() - 0.5) * 2 * maxAngle
            const I = intensity(theta, nSlits, slitWidth, slitSep, wavelength)
            if (Math.random() < I) {
              newParticles.push(theta)
              accepted = true
            }
          }
        }
        return [...prev, ...newParticles]
      })
      particleTimerRef.current = requestAnimationFrame(tick)
    }
    particleTimerRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(particleTimerRef.current)
  }, [showParticles, nSlits, slitWidth, slitSep, wavelength])

  // Main pattern canvas
  useEffect(() => {
    const canvas = patternRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    const pad = { left: 50, right: 20, top: 30, bottom: 40 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    const maxAngle = 0.05 // radians

    // If showing particles, draw histogram
    if (showParticles && particles.length > 0) {
      const bins = 200
      const hist = new Array(bins).fill(0)
      for (const theta of particles) {
        const bin = Math.floor(((theta / maxAngle + 1) / 2) * bins)
        if (bin >= 0 && bin < bins) hist[bin]++
      }
      const maxBin = Math.max(...hist, 1)

      // Draw histogram bars
      const barW = cw / bins
      for (let i = 0; i < bins; i++) {
        if (hist[i] === 0) continue
        const x = pad.left + i * barW
        const barH = (hist[i] / maxBin) * ch
        ctx.fillStyle = lightColor
        ctx.globalAlpha = 0.4 + 0.6 * (hist[i] / maxBin)
        ctx.fillRect(x, pad.top + ch - barH, barW + 0.5, barH)
      }
      ctx.globalAlpha = 1

      // Particle count
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${particles.length} photons detected`, w - pad.right - 8, pad.top + 16)
    }

    // Draw intensity curve
    ctx.strokeStyle = showParticles ? 'rgba(255,255,255,0.3)' : lightColor
    ctx.lineWidth = showParticles ? 1 : 2
    ctx.beginPath()
    for (let i = 0; i <= cw; i++) {
      const theta = ((i / cw) - 0.5) * 2 * maxAngle
      const I = intensity(theta, nSlits, slitWidth, slitSep, wavelength)
      const y = pad.top + ch * (1 - I)
      if (i === 0) ctx.moveTo(pad.left + i, y)
      else ctx.lineTo(pad.left + i, y)
    }
    ctx.stroke()

    // Single-slit envelope (dashed)
    if (showEnvelope && nSlits > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      for (let i = 0; i <= cw; i++) {
        const theta = ((i / cw) - 0.5) * 2 * maxAngle
        const alpha = Math.PI * slitWidth * Math.sin(theta) / wavelength
        const env = Math.abs(alpha) < 1e-10 ? 1 : Math.pow(Math.sin(alpha) / alpha, 2)
        const y = pad.top + ch * (1 - env)
        if (i === 0) ctx.moveTo(pad.left + i, y)
        else ctx.lineTo(pad.left + i, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Screen strip at bottom showing color pattern
    const stripH = 20
    const stripY = pad.top + ch + 8
    for (let i = 0; i <= cw; i++) {
      const theta = ((i / cw) - 0.5) * 2 * maxAngle
      const I = intensity(theta, nSlits, slitWidth, slitSep, wavelength)
      ctx.fillStyle = lightColor
      ctx.globalAlpha = I
      ctx.fillRect(pad.left + i, stripY, 1.5, stripH)
    }
    ctx.globalAlpha = 1

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ch * (1 - i / 4)
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText((i / 4).toFixed(2), pad.left - 6, y + 3)
    }

    // X axis angle labels
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    for (let a = -4; a <= 4; a += 2) {
      const theta = (a / 100)
      const x = pad.left + ((theta / maxAngle + 1) / 2) * cw
      ctx.fillText(`${(a * 10).toFixed(0)} mrad`, x, stripY + stripH + 14)
    }

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('I(\u03B8) / I\u2080', pad.left + 4, pad.top - 10)

  }, [nSlits, slitWidth, slitSep, wavelength, showEnvelope, showParticles, particles, lightColor])

  // Slit diagram canvas
  useEffect(() => {
    const canvas = slitsRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width, h = rect.height
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    const cy = h / 2
    // Scale: map slit geometry to pixels
    const totalSpan = slitSep * (nSlits - 1) + slitWidth * nSlits
    const scale = Math.min(1, (h - 40) / totalSpan) * 0.5

    // Draw barrier
    const barrierX = w * 0.4
    const barrierW = 6

    // Calculate slit positions (centered)
    const slitPositions: number[] = []
    for (let i = 0; i < nSlits; i++) {
      const offset = (i - (nSlits - 1) / 2) * slitSep
      slitPositions.push(cy + offset * scale)
    }

    // Draw barrier with gaps
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    const halfSlit = slitWidth * scale / 2
    let lastY = 0
    for (const sy of slitPositions) {
      ctx.fillRect(barrierX, lastY, barrierW, sy - halfSlit - lastY)
      lastY = sy + halfSlit
    }
    ctx.fillRect(barrierX, lastY, barrierW, h - lastY)

    // Draw slit openings with glow
    for (const sy of slitPositions) {
      ctx.fillStyle = lightColor
      ctx.globalAlpha = 0.4
      ctx.fillRect(barrierX - 1, sy - halfSlit, barrierW + 2, halfSlit * 2)
      ctx.globalAlpha = 1
    }

    // Incoming wave (left side)
    const waveCount = 8
    for (let i = 0; i < waveCount; i++) {
      const x = barrierX - 15 - i * 12
      ctx.strokeStyle = lightColor
      ctx.globalAlpha = 0.1 + 0.15 * (1 - i / waveCount)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, cy - 40)
      ctx.lineTo(x, cy + 40)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Wavefronts emerging (right side) — circular arcs from each slit
    const screenX = w * 0.85
    for (const sy of slitPositions) {
      for (let r = 10; r < (screenX - barrierX); r += 14) {
        ctx.strokeStyle = lightColor
        ctx.globalAlpha = Math.max(0.02, 0.12 * (1 - r / (screenX - barrierX)))
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(barrierX + barrierW, sy, r, -Math.PI / 3, Math.PI / 3)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('barrier', barrierX + barrierW / 2, 12)
    ctx.fillText('incoming', barrierX - 50, 12)
    ctx.fillText('screen', screenX, 12)

    // Screen line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(screenX, 20)
    ctx.lineTo(screenX, h - 5)
    ctx.stroke()

    // Mini intensity on screen
    const maxAngle = 0.05
    const screenH = h - 30
    for (let py = 15; py < h - 5; py++) {
      const theta = ((py - cy) / (screenH / 2)) * maxAngle
      const I = intensity(theta, nSlits, slitWidth, slitSep, wavelength)
      ctx.fillStyle = lightColor
      ctx.globalAlpha = I * 0.8
      ctx.fillRect(screenX + 2, py, 8, 1.5)
    }
    ctx.globalAlpha = 1

    // Dimension annotations
    if (nSlits >= 2) {
      const y0 = slitPositions[0], y1 = slitPositions[1]
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 0.5
      const ax = barrierX - 15
      ctx.beginPath()
      ctx.moveTo(ax, y0)
      ctx.lineTo(ax, y1)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '8px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`d=${slitSep}nm`, ax - 3, (y0 + y1) / 2 + 3)
    }

  }, [nSlits, slitWidth, slitSep, wavelength, lightColor])

  // Resize handler
  useEffect(() => {
    const canvas = patternRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setNSlits(n => n))
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5 px-4 h-12 flex items-center gap-4">
        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-white transition-colors">&larr; zoo</Link>
        <span className="text-sm font-semibold" style={{ color: lightColor }}>Multi-Slit Interference</span>
        <span className="text-xs font-mono text-gray-600 ml-auto">
          {nSlits} slit{nSlits > 1 ? 's' : ''} &middot; &lambda; = {wavelength} nm
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Visualizations */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative min-h-[300px]">
            <canvas ref={patternRef} className="absolute inset-0 w-full h-full" />
          </div>
          <div className="h-[180px] relative border-t border-white/5">
            <canvas ref={slitsRef} className="absolute inset-0 w-full h-full" />
          </div>
        </div>

        {/* Controls */}
        <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          {/* Number of slits */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Slits: {nSlits}</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 8].map(n => (
                <button
                  key={n}
                  onClick={() => { setNSlits(n); setParticles([]) }}
                  className={`w-8 h-8 text-sm font-mono rounded transition-all ${
                    n === nSlits
                      ? 'text-white border'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  style={n === nSlits ? { backgroundColor: `${lightColor}30`, borderColor: `${lightColor}60` } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Slit width */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
              Slit Width: a = {slitWidth} nm
            </h3>
            <input
              type="range" min={20} max={400} step={10} value={slitWidth}
              onChange={e => { setSlitWidth(parseInt(e.target.value)); setParticles([]) }}
              className="w-full accent-[#14b8a6]"
            />
          </div>

          {/* Slit separation */}
          {nSlits > 1 && (
            <div className="mb-6">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
                Separation: d = {slitSep} nm
              </h3>
              <input
                type="range" min={100} max={2000} step={50} value={slitSep}
                onChange={e => { setSlitSep(parseInt(e.target.value)); setParticles([]) }}
                className="w-full accent-[#14b8a6]"
              />
            </div>
          )}

          {/* Wavelength */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
              Wavelength: &lambda; = {wavelength} nm
            </h3>
            <input
              type="range" min={380} max={700} step={5} value={wavelength}
              onChange={e => { setWavelength(parseInt(e.target.value)); setParticles([]) }}
              className="w-full"
              style={{ accentColor: lightColor }}
            />
            <div className="flex justify-between text-[10px] font-mono text-gray-600 mt-1">
              <span>UV 380</span>
              <span style={{ color: lightColor }}>&#x25CF;</span>
              <span>700 Red</span>
            </div>
          </div>

          {/* Options */}
          <div className="mb-6 space-y-2">
            <label className="flex items-center gap-2 text-xs font-mono text-gray-400 cursor-pointer">
              <input
                type="checkbox" checked={showEnvelope}
                onChange={e => setShowEnvelope(e.target.checked)}
                className="accent-[#14b8a6]"
              />
              Show diffraction envelope
            </label>
            <label className="flex items-center gap-2 text-xs font-mono text-gray-400 cursor-pointer">
              <input
                type="checkbox" checked={showParticles}
                onChange={e => { setShowParticles(e.target.checked); setParticles([]) }}
                className="accent-[#14b8a6]"
              />
              Photon-by-photon mode
            </label>
          </div>

          {/* Presets */}
          <div className="mb-6">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Presets</h3>
            <div className="space-y-2">
              {[
                { name: 'Young\'s double slit', n: 2, a: 100, d: 500, l: 550 },
                { name: 'Single slit diffraction', n: 1, a: 200, d: 500, l: 550 },
                { name: 'Diffraction grating', n: 6, a: 50, d: 400, l: 550 },
                { name: 'Red laser', n: 2, a: 100, d: 600, l: 650 },
                { name: 'Blue laser', n: 3, a: 80, d: 400, l: 450 },
              ].map(p => (
                <button
                  key={p.name}
                  onClick={() => { setNSlits(p.n); setSlitWidth(p.a); setSlitSep(p.d); setWavelength(p.l); setParticles([]) }}
                  className="w-full text-left px-3 py-2 rounded border bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-white transition-all"
                >
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[10px] font-mono text-gray-500">{p.n} slit{p.n > 1 ? 's' : ''}, a={p.a}nm, &lambda;={p.l}nm</div>
                </button>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="p-3 rounded bg-white/[0.02] border border-white/5">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Physics</h3>
            <div className="text-xs text-gray-400 space-y-2">
              <p>Photons passing through slits create an <span style={{ color: lightColor }}>interference pattern</span> on a screen.</p>
              <p>Each slit acts as a point source. Where waves arrive in phase, they constructively interfere. Where out of phase, they cancel.</p>
              <p>The &quot;photon-by-photon&quot; mode shows how individual quantum particles <span className="text-white">randomly</span> land, yet collectively build the wave pattern.</p>
            </div>
          </div>

          {/* Related */}
          <div className="pt-3 mt-3 border-t border-white/5">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Related</span>
            <div className="mt-2 space-y-1">
              {[
                { href: '/grovers', label: "Grover's Search" },
                { href: '/measurement', label: 'Measurement' },
                { href: '/resonance', label: 'Resonance' },
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
