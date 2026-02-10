'use client'

interface QubitDotProps {
  /** 0 = |0⟩ (ground, blue), 1 = |1⟩ (excited, orange) */
  excitation: number
  size?: number
  className?: string
  label?: string
  glow?: boolean
}

/**
 * Animated qubit circle that transitions color based on excitation.
 * excitation 0 = blue (#00d4ff), 1 = orange (#ff8c42), blend in between.
 */
export default function QubitDot({ excitation, size = 32, className = '', label, glow = false }: QubitDotProps) {
  const t = Math.max(0, Math.min(1, excitation))
  // Interpolate blue → orange
  const r = Math.round(0 + t * 255)
  const g = Math.round(212 + t * (140 - 212))
  const b = Math.round(255 + t * (66 - 255))
  const color = `rgb(${r},${g},${b})`

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: glow ? `0 0 ${size * 0.6}px ${color}` : 'none',
          transition: 'background-color 0.1s, box-shadow 0.1s',
        }}
      />
      {label && (
        <span className="text-xs font-mono text-gray-400 mt-1">{label}</span>
      )}
    </div>
  )
}
