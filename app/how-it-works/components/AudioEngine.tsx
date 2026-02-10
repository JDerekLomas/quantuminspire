'use client'

import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from 'react'

interface AudioState {
  ctx: AudioContext | null
  masterGain: GainNode | null
  muted: boolean
  initialized: boolean
}

interface AudioAPI {
  /** Call from user gesture to unlock AudioContext */
  init: () => AudioContext
  getCtx: () => AudioContext | null
  getMasterGain: () => GainNode | null
  muted: boolean
  toggleMute: () => void
  initialized: boolean
  /** Create an oscillator connected to master gain, auto-tracked for cleanup */
  createOsc: (type?: OscillatorType) => { osc: OscillatorNode; gain: GainNode } | null
  /** Stop and disconnect all tracked oscillators */
  stopAll: () => void
}

const AudioCtx = createContext<AudioAPI | null>(null)

export function useAudio(): AudioAPI {
  const api = useContext(AudioCtx)
  if (!api) throw new Error('useAudio must be inside AudioProvider')
  return api
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<AudioState>({ ctx: null, masterGain: null, muted: false, initialized: false })
  const nodesRef = useRef<OscillatorNode[]>([])
  const gainsRef = useRef<GainNode[]>([])
  const [muted, setMuted] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const init = useCallback(() => {
    if (stateRef.current.ctx) {
      if (stateRef.current.ctx.state === 'suspended') stateRef.current.ctx.resume()
      return stateRef.current.ctx
    }
    const ctx = new AudioContext()
    const mg = ctx.createGain()
    mg.gain.value = 0.35
    mg.connect(ctx.destination)
    stateRef.current = { ctx, masterGain: mg, muted: false, initialized: true }
    setInitialized(true)
    return ctx
  }, [])

  const getCtx = useCallback(() => stateRef.current.ctx, [])
  const getMasterGain = useCallback(() => stateRef.current.masterGain, [])

  const toggleMute = useCallback(() => {
    const mg = stateRef.current.masterGain
    if (!mg || !stateRef.current.ctx) return
    const newMuted = !stateRef.current.muted
    stateRef.current.muted = newMuted
    mg.gain.setTargetAtTime(newMuted ? 0 : 0.35, stateRef.current.ctx.currentTime, 0.05)
    setMuted(newMuted)
  }, [])

  const stopAll = useCallback(() => {
    for (const n of nodesRef.current) {
      try { n.stop() } catch { /* ok */ }
    }
    nodesRef.current = []
    gainsRef.current = []
  }, [])

  const createOsc = useCallback((type: OscillatorType = 'sine') => {
    const ctx = stateRef.current.ctx
    const mg = stateRef.current.masterGain
    if (!ctx || !mg) return null
    const osc = ctx.createOscillator()
    osc.type = type
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(gain).connect(mg)
    nodesRef.current.push(osc)
    gainsRef.current.push(gain)
    return { osc, gain }
  }, [])

  useEffect(() => {
    return () => {
      stopAll()
      stateRef.current.ctx?.close()
    }
  }, [stopAll])

  const api: AudioAPI = { init, getCtx, getMasterGain, muted, toggleMute, initialized, createOsc, stopAll }

  return <AudioCtx.Provider value={api}>{children}</AudioCtx.Provider>
}

/** Floating mute/unmute button */
export function MuteButton() {
  const { muted, toggleMute, initialized, init } = useAudio()

  const handleClick = () => {
    if (!initialized) init()
    toggleMute()
  }

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
      aria-label={muted ? 'Unmute' : 'Mute'}
      title={muted ? 'Unmute audio' : 'Mute audio'}
    >
      {muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  )
}
