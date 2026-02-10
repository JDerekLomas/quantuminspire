'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AudioProvider, MuteButton, useAudio } from './components/AudioEngine'
import ScrollScene from './components/ScrollScene'
import ActOne from './components/ActOne'
import ActTwo from './components/ActTwo'
import ActThree from './components/ActThree'

function AudioInitOverlay() {
  const { initialized, init } = useAudio()
  const [dismissed, setDismissed] = useState(false)

  if (initialized || dismissed) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-6">
        <h2 className="text-2xl font-bold text-white">How Quantum Computers Work</h2>
        <p className="text-gray-400 text-sm">
          This is a scroll-driven experience with ambient audio.
          Sound helps explain the physics — but you can mute anytime.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { init(); setDismissed(true) }}
            className="px-6 py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm"
          >
            Start with sound
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-6 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors font-mono text-sm"
          >
            Mute
          </button>
        </div>
        <p className="text-[11px] text-gray-600">Scroll to explore. Best on desktop.</p>
      </div>
    </div>
  )
}

function ProgressIndicator() {
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(h > 0 ? window.scrollY / h : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div className="fixed left-0 top-0 w-1 h-full z-50">
      <div
        className="w-full bg-cyan-500/50 rounded-b"
        style={{ height: `${scrollPct * 100}%`, transition: 'height 0.05s' }}
      />
    </div>
  )
}

function Content() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AudioInitOverlay />
      <MuteButton />
      <ProgressIndicator />

      {/* Hero */}
      <div className="h-screen flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            How It Works
          </h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto mb-8">
            A quantum computer is an orchestra of artificial atoms, controlled by microwaves,
            racing against decoherence.
          </p>
          <div className="animate-bounce text-gray-500 text-sm font-mono">scroll to begin</div>
        </div>
      </div>

      {/* Act I */}
      <ScrollScene id="act-one" height="1000vh">
        {(progress) => <ActOne progress={progress} />}
      </ScrollScene>

      {/* Interlude */}
      <div className="h-[50vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm font-mono max-w-md text-center px-4">
          One qubit, one note. But quantum computing needs harmony...
        </p>
      </div>

      {/* Act II */}
      <ScrollScene id="act-two" height="800vh">
        {(progress) => <ActTwo progress={progress} />}
      </ScrollScene>

      {/* Interlude */}
      <div className="h-[50vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm font-mono max-w-md text-center px-4">
          Two notes make a chord. What happens with nine?
        </p>
      </div>

      {/* Act III */}
      <ScrollScene id="act-three" height="1000vh">
        {(progress) => <ActThree progress={progress} />}
      </ScrollScene>

      {/* Outro */}
      <div className="h-screen flex items-center justify-center text-center px-6">
        <div className="space-y-6 max-w-lg">
          <p className="text-gray-400 text-lg">
            That's a quantum computer. Superconducting circuits playing notes, controlled by microwaves,
            entangled by coupling, erased by noise.
          </p>
          <p className="text-gray-500 text-sm">
            Everything you just heard corresponds to real physics on real hardware.
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <Link
              href="/resonance"
              className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded text-sm hover:bg-cyan-500/20 transition-colors"
            >
              Explore Resonance
            </Link>
            <Link
              href="/experiments"
              className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-sm hover:bg-purple-500/20 transition-colors"
            >
              See Experiments
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded text-sm hover:bg-white/10 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HowItWorksClient() {
  return (
    <AudioProvider>
      <Content />
    </AudioProvider>
  )
}
