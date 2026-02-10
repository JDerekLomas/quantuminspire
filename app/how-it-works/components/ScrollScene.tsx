'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'

interface ScrollSceneProps {
  id: string
  children: (progress: number) => ReactNode
  height?: string        // e.g. '200vh'
  className?: string
}

/**
 * Scroll-driven scene container.
 * - Outer div is tall (height prop, default 200vh) to create scroll room.
 * - Inner div is sticky, fills the viewport.
 * - `progress` (0-1) is passed to children based on scroll position within the outer div.
 */
export default function ScrollScene({ id, children, height = '200vh', className = '' }: ScrollSceneProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(outer)

    let raf = 0
    const update = () => {
      if (!outer) return
      const rect = outer.getBoundingClientRect()
      const viewH = window.innerHeight
      // progress 0 when top of outer hits bottom of viewport
      // progress 1 when bottom of outer hits top of viewport
      const totalScroll = rect.height - viewH
      if (totalScroll <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0)
      } else {
        const scrolled = -rect.top
        setProgress(Math.max(0, Math.min(1, scrolled / totalScroll)))
      }
      raf = requestAnimationFrame(update)
    }

    if (visible) {
      raf = requestAnimationFrame(update)
    }

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [visible])

  return (
    <div ref={outerRef} id={id} style={{ height }} className={`relative ${className}`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {children(progress)}
      </div>
    </div>
  )
}
