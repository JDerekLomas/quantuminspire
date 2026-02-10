'use client'

import { useState } from 'react'
import Link from 'next/link'

interface InfoBoxProps {
  title: string
  children: React.ReactNode
  link?: { href: string; label: string }
}

export default function InfoBox({ title, children, link }: InfoBoxProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-md mx-auto mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded border border-white/10 hover:border-cyan-500/30 transition-colors bg-white/[0.02]"
      >
        <span className="text-cyan-400 text-xs font-mono">{open ? '\u2212' : '+'}</span>
        <span className="text-xs text-gray-400 font-mono">{title}</span>
      </button>
      {open && (
        <div className="px-3 py-3 text-[12px] text-gray-400 leading-relaxed border-x border-b border-white/10 rounded-b bg-white/[0.01]">
          {children}
          {link && (
            <Link
              href={link.href}
              className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 text-[11px] font-mono"
            >
              {link.label} &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
