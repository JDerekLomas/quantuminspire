'use client'

import { useState, useRef, useEffect } from 'react'

// ============================================================
// SCROLL HOOK
// ============================================================

export function useInView(threshold = 0.3) {
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
// COLORS
// ============================================================

export const C = {
  tenderness: '#00ff88',
  resentment: '#ff6b9d',
  ghz: '#8b5cf6',
  noise: '#ff8c42',
  blue: '#00d4ff',
  pink: '#ff6b9d',
}

// ============================================================
// POEM HELPERS
// ============================================================

export type WordBank = {
  line1: string[]
  line2: string[]
  line3: string[]
}

export function bitstringToPoem(bs: string, bank: WordBank): string[] {
  const g1 = parseInt(bs.slice(6, 9), 2)
  const g2 = parseInt(bs.slice(3, 6), 2)
  const g3 = parseInt(bs.slice(0, 3), 2)
  return [bank.line1[g1], bank.line2[g2], bank.line3[g3]]
}

export function weightedSample(dist: Record<string, number>): { bitstring: string; count: number } {
  const entries = Object.entries(dist)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  let r = Math.random() * total
  for (const [bs, count] of entries) {
    r -= count
    if (r <= 0) return { bitstring: bs, count }
  }
  const last = entries[entries.length - 1]
  return { bitstring: last[0], count: last[1] }
}

export function sampleFromWeights(weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}
