'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

// ─── Navigation Structure ─────────────────────────────────────────────────────

const pillars = [
  {
    label: 'Research',
    color: '#00ff88',
    links: [
      { href: '/replications', label: 'Replications', desc: '6 papers, 27 claims tested' },
      { href: '/experiments', label: 'Experiments', desc: '100+ hardware experiments' },
      { href: '/platforms', label: 'Platforms', desc: '3 chips compared head-to-head' },
      { href: '/methodology', label: 'Methodology', desc: 'How we work — prompts & process' },
      { href: '/blog', label: 'Blog', desc: 'Research journal & findings' },
    ],
  },
  {
    label: 'Learn',
    color: '#8b5cf6',
    links: [
      { href: '/learn', label: 'Glossary & Tools', desc: '40+ terms, 14 interactive tools' },
      { href: '/how-qubits-work', label: 'How Qubits Work', desc: '6-part physics series' },
      { href: '/how-it-works', label: 'How It Works', desc: 'Scroll-driven narrative' },
      { href: '/listen', label: 'Listen', desc: 'Quantum states as sound' },
      { href: '/gallery', label: 'Gallery', desc: 'Curated visualizations' },
    ],
  },
  {
    label: 'VibeCoding',
    color: '#00d4ff',
    links: [
      { href: '/get-started', label: 'Get Started', desc: 'Setup Claude Code + quantum hardware' },
      { href: '/wp44', label: 'Research Program', desc: 'WP4.4 — Designing quantum for everyone' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Nav({ section }: { section?: string }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Close mobile menu on route change (link click)
  const handleLinkClick = () => {
    setMobileOpen(false)
    setOpenDropdown(null)
  }

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpenDropdown(label)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 150)
  }

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={handleLinkClick}>
            <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            <span className="font-mono font-bold text-white tracking-wider text-sm">
              <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span>
            </span>
          </Link>
          {section && (
            <>
              <span className="text-gray-600 font-mono">/</span>
              <span className="text-sm font-mono text-gray-400">{section}</span>
            </>
          )}
          <span className="text-[10px] font-mono text-gray-500 hidden md:block ml-1">
            TU Delft / QuTech
          </span>
        </div>

        {/* Center/Right: Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {pillars.map((pillar) => (
            <div
              key={pillar.label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(pillar.label)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="px-3 py-2 text-xs font-mono text-gray-500 transition-colors rounded hover:text-white"
                style={openDropdown === pillar.label ? { color: pillar.color } : undefined}
                onClick={() => setOpenDropdown(openDropdown === pillar.label ? null : pillar.label)}
              >
                {pillar.label}
              </button>

              {/* Dropdown */}
              {openDropdown === pillar.label && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 py-2 rounded-lg border bg-[#0a0a1a]/95 backdrop-blur-xl shadow-2xl"
                  style={{ borderColor: `${pillar.color}20` }}
                  onMouseEnter={() => handleMouseEnter(pillar.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  {pillar.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleLinkClick}
                      className="block px-4 py-2.5 hover:bg-white/5 transition-colors group"
                    >
                      <div className="text-xs font-mono text-white group-hover:underline">
                        {link.label}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {link.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <a
            href="https://github.com/JDerekLomas/quantuminspire"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-mono text-gray-500 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* Mobile: Hamburger */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0a0a1a]/95 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
          {pillars.map((pillar) => (
            <div key={pillar.label} className="border-b border-white/5">
              <div
                className="px-6 py-3 text-xs font-mono uppercase tracking-[0.2em]"
                style={{ color: pillar.color }}
              >
                {pillar.label}
              </div>
              {pillar.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleLinkClick}
                  className="block px-6 py-3 pl-10 hover:bg-white/5 transition-colors"
                >
                  <div className="text-sm text-white">{link.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{link.desc}</div>
                </Link>
              ))}
            </div>
          ))}
          <a
            href="https://github.com/JDerekLomas/quantuminspire"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-6 py-4 text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      )}
    </nav>
  )
}
