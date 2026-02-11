'use client'

import Link from 'next/link'

const navLinks = [
  { href: '/experiments', label: 'Experiments', color: '#00ff88' },
  { href: '/replications', label: 'Replications', color: '#ff8c42' },
  { href: '/learn', label: 'Learn', color: '#8b5cf6' },
  { href: '/get-started', label: 'Vibe Code', color: '#00d4ff' },
  { href: '/sonification', label: 'Listen', color: '#e879f9' },
  { href: '/blog', label: 'Blog', color: '#ff6b9d' },
]

export default function Nav({ section }: { section?: string }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
          <span className="text-[10px] font-mono text-gray-500 hidden sm:block ml-1">
            TU Delft / QuTech
          </span>
        </div>
        <div className="flex gap-4 sm:gap-6 text-xs font-mono text-gray-500">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hidden sm:block"
              style={{ ['--hover-color' as string]: link.color }}
              onMouseEnter={e => (e.currentTarget.style.color = link.color)}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/JDerekLomas/quantuminspire"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  )
}
