'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ============================================================
// COLORS
// ============================================================

const GOLD = '#d4a574'
const GOLD_LIGHT = '#e2cdb5'
const ROSE = '#c47a8a'
const gd = (a: number) => `rgba(212, 165, 116, ${a})`
const rs = (a: number) => `rgba(196, 122, 138, ${a})`

// ============================================================
// SPEECH SYNTHESIS
// ============================================================

function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  const prefs = ['Daniel', 'Samantha', 'Karen', 'Moira', 'Rishi', 'Google UK English Male']
  for (const name of prefs) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  return voices.find(v => v.lang.startsWith('en')) || null
}

function speak(text: string, rate = 0.72, onEnd?: () => void) {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = getPreferredVoice()
  if (voice) u.voice = voice
  u.rate = rate; u.pitch = 0.92; u.volume = 1
  const keepAlive = setInterval(() => {
    if (!speechSynthesis.speaking) { clearInterval(keepAlive); return }
    speechSynthesis.pause(); speechSynthesis.resume()
  }, 10000)
  u.onend = () => { clearInterval(keepAlive); onEnd?.() }
  u.onerror = () => { clearInterval(keepAlive) }
  speechSynthesis.speak(u)
}

function speakLines(lines: string[], pauseMs = 1800, rate = 0.72, onAllDone?: () => void) {
  let i = 0
  const next = () => {
    if (i >= lines.length) { onAllDone?.(); return }
    speak(lines[i], rate, () => { i++; if (i < lines.length) setTimeout(next, pauseMs); else onAllDone?.() })
  }
  next()
}

// ============================================================
// POEMS
// ============================================================

const SUP_A = [
  'you steal the blanket every single night',
  "we've had the same fight now since year two",
  "the kitchen counter's permanently a sight",
  'seventeen years — this is what I signed up to',
]
const SUP_B = [
  'you pull me closer every single night',
  'we still feel enough to argue through',
  "the kitchen's full — it means we're living right",
  'seventeen years — this is what I signed up to',
]

const ENT_POEMS = [
  { c1: ['you eat cereal at midnight, standing at the sink', "I've watched you do it seventeen years — more than you'd think"],
    c2: ['the spoon against the bowl, the same way every night', "some things aren't random — this whole life proves it right"] },
  { c1: ['your socks live on the floor like a gentle protest', "I step around them now — I've given up that quest"],
    c2: ["but when it's cold at three AM you pull me near", "the sock war doesn't matter — point is, we're still here"] },
  { c1: ['we bought the wrong couch twice and kept them both', 'each one a monument to our misguided oath'],
    c2: ["we'll get it right next time — we never will", 'but here we are, still wrong, and sitting still'] },
  { c1: ['you drive too slow, I brake too late — we split the map', "you call the exits out while I won't check the app"],
    c2: ["we've gotten lost in seven countries, maybe nine", 'wrong turns are how we found that place with the bad wine'] },
  { c1: ['I know your sneeze — the triple, operatic kind', "the sigh you give when I've left something behind"],
    c2: ['the way you laugh before the punchline hits the air', "seventeen years of sounds — I'd know you anywhere"] },
  { c1: ["the book you're reading lives face-down on every chair", "your reading glasses reproduce — they're everywhere"],
    c2: ['you read me passages I never asked to hear', "I never asked, but God I'm glad you're here"] },
  { c1: ['you blame the toast on the toaster every time', 'appliance warfare is your most consistent crime'],
    c2: ['the blender, the printer, that one stubborn door', "you'll fix it wrong, try twice — that's what I love you for"] },
  { c1: ['we share one pillow though the bed has room for three', 'your elbow in my ribs, your cold feet on my knee'],
    c2: ["we could spread out — we've talked about it, sure", "seventeen years compressed — proximity's the cure"] },
]

const DECO_LINES = [
  'after seventeen years I know you by the sound',
  'of footsteps on the stairs and key inside the door',
  'your laugh that always catches just before joy comes around',
  "I've memorized the frequency — I don't need more",
]

const DECO_PROTECTED = new Set([
  'seventeen', 'years', 'know', 'you', 'your', 'sound',
  'footsteps', 'stairs', 'key', 'door',
  'laugh', 'catches', 'before', 'joy',
  "i've", 'memorized', 'frequency', "don't", 'need', 'more',
])

type DecoChar = { char: string; lineIdx: number; flatIdx: number; prot: boolean }

const DECO_CHARS: DecoChar[] = (() => {
  const result: DecoChar[] = []
  let flat = 0
  for (let li = 0; li < DECO_LINES.length; li++) {
    const tokens = DECO_LINES[li].match(/\S+|\s+/g) || []
    for (const token of tokens) {
      const isSpace = /^\s+$/.test(token)
      const cleaned = token.toLowerCase().replace(/[^a-z']/g, '')
      const prot = isSpace || DECO_PROTECTED.has(cleaned)
      for (const ch of token) { result.push({ char: ch, lineIdx: li, flatIdx: flat, prot }); flat++ }
    }
  }
  return result
})()

const MEAS_LINES = [
  "each morning is a measurement — I know what I'll find:",
  'you, flung diagonal, stealing covers, breathing slow.',
  'ten thousand repetitions of the sweetest kind.',
  "same data point. same answer. nowhere else I'd go.",
]

const QR = [104,177,175,14,124,156,130,5,55,218,161,188,74,77,4,186,1,35,216,196,142,160,106,82,83,109,38,178,20,79,102,228]

// ============================================================
// PARTICLES
// ============================================================

interface Particle { x: number; y: number; vx: number; vy: number; r: number; opacity: number; hue: number; phase: number }

function makeParticle(w: number, h: number): Particle {
  const rose = Math.random() > 0.55
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25, vy: -(0.08 + Math.random() * 0.2),
    r: 1 + Math.random() * 2.5, opacity: 0.2 + Math.random() * 0.5,
    hue: rose ? 330 + Math.random() * 25 : 22 + Math.random() * 28,
    phase: Math.random() * Math.PI * 2,
  }
}

// ============================================================
// PHASE TITLES
// ============================================================

const PHASE_TITLES: Record<string, { title: string; sub: string }> = {
  superposition: { title: 'Superposition', sub: 'The same marriage holds two truths at once.\nWatch them flicker. Tap to choose one.' },
  entanglement: { title: 'Entanglement', sub: 'Two halves of a poem, measured on quantum hardware.\nThe first couplet determines the last.' },
  decoherence: { title: 'Decoherence', sub: 'A poem exposed to noise.\nMost of it erases. What survives is the signal.' },
  measurement: { title: 'Measurement', sub: 'The final reading.' },
}

// ============================================================
// COMPONENT
// ============================================================

type Phase = 'intro' | 'superposition' | 'entanglement' | 'decoherence' | 'measurement'

export default function AnniversaryClient() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [vis, setVis] = useState(true)
  const [introIn, setIntroIn] = useState(false)
  const [voiceReady, setVoiceReady] = useState(false)
  const [muted, setMuted] = useState(false)
  // Title card: shows phase name before content
  const [showTitle, setShowTitle] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Superposition — line-by-line reveal then flicker
  const [supLineVis, setSupLineVis] = useState([false, false, false, false])
  const [supFlicker, setSupFlicker] = useState(false)
  const [supVer, setSupVer] = useState(0)
  const [supDone, setSupDone] = useState(false)
  const [supCont, setSupCont] = useState(false)

  // Entanglement
  const [entLines, setEntLines] = useState<string[] | null>(null)
  const [entShow, setEntShow] = useState([false, false, false, false])
  const [entHeld, setEntHeld] = useState(true)
  const [entMeta, setEntMeta] = useState(false)

  // Decoherence — line-by-line reveal before dissolve
  const [decoLineVis, setDecoLineVis] = useState([false, false, false, false])
  const [decoDissolving, setDecoDissolving] = useState(false)
  const [decoDone, setDecoDone] = useState(false)

  // Measurement
  const [measShow, setMeasShow] = useState([false, false, false, false])
  const [measEnd, setMeasEnd] = useState(false)

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const qRef = useRef(0)
  const tRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const supInt = useRef<ReturnType<typeof setInterval> | null>(null)
  const decoEls = useRef<HTMLSpanElement[]>([])
  const decoTmr = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = muted }, [muted])

  useEffect(() => {
    const loadVoices = () => { if (speechSynthesis.getVoices().length > 0) setVoiceReady(true) }
    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const nextQ = useCallback(() => {
    const i = qRef.current++
    return i < QR.length ? QR[i] : (QR[i % QR.length] + Math.floor(Math.random() * 256)) % 256
  }, [])

  const clearT = useCallback(() => { tRef.current.forEach(clearTimeout); tRef.current = [] }, [])

  const sched = useCallback((items: [() => void, number][]) => {
    for (const [fn, ms] of items) tRef.current.push(setTimeout(fn, ms))
  }, [])

  const narrate = useCallback((lines: string[], pauseMs = 1800, rate = 0.72, onDone?: () => void) => {
    if (mutedRef.current || !voiceReady) { onDone?.(); return }
    speakLines(lines, pauseMs, rate, onDone)
  }, [voiceReady])

  const narrateOne = useCallback((text: string, rate = 0.72, onDone?: () => void) => {
    if (mutedRef.current || !voiceReady) { onDone?.(); return }
    speak(text, rate, onDone)
  }, [voiceReady])

  // Phase transition: fade out → title card → content
  const goTo = useCallback((next: Phase) => {
    clearT(); speechSynthesis.cancel()
    if (supInt.current) { clearInterval(supInt.current); supInt.current = null }
    if (decoTmr.current) { clearTimeout(decoTmr.current); decoTmr.current = null }
    setVis(false)
    setShowTitle(false)
    setShowContent(false)
    tRef.current.push(setTimeout(() => {
      setPhase(next)
      tRef.current.push(setTimeout(() => {
        setVis(true)
        // Show title card first
        tRef.current.push(setTimeout(() => setShowTitle(true), 200))
        // Then content after title settles
        tRef.current.push(setTimeout(() => setShowContent(true), next === 'measurement' ? 3000 : 4000))
      }, 100))
    }, 1500))
  }, [clearT])

  // Init
  useEffect(() => { const t = setTimeout(() => setIntroIn(true), 600); return () => clearTimeout(t) }, [])

  // Canvas particles
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1
    const resize = () => {
      dpr = window.devicePixelRatio || 1; w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    }
    resize(); window.addEventListener('resize', resize)
    const particles = Array.from({ length: 80 }, () => makeParticle(w, h))
    let t = 0
    const draw = () => {
      t += 0.006
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        p.vx += (Math.random() - 0.5) * 0.006; p.vx *= 0.997
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w }
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.5 + p.phase)
        const a = p.opacity * pulse
        // Larger, softer glow
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 60%, 70%, ${a * 0.04})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 65%, 75%, ${a * 0.12})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 75%, 85%, ${a})`; ctx.fill()
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
  }, [])

  // ---- Superposition: line-by-line reveal, then flicker ----
  useEffect(() => {
    if (phase !== 'superposition' || !vis || !showContent || supDone) return
    // Reveal lines one at a time
    sched([
      [() => setSupLineVis([true, false, false, false]), 0],
      [() => setSupLineVis([true, true, false, false]), 2500],
      [() => setSupLineVis([true, true, true, false]), 5000],
      [() => setSupLineVis([true, true, true, true]), 7500],
      // After all visible, start flickering
      [() => {
        setSupFlicker(true)
        supInt.current = setInterval(() => setSupVer(v => 1 - v), 5000)
      }, 10000],
    ])
    // Narrate after lines appear
    const voiceT = setTimeout(() => narrateOne(SUP_A.join('. '), 0.7, () => {
      setTimeout(() => narrateOne(SUP_B.join('. '), 0.7), 2000)
    }), 1000)
    return () => { if (supInt.current) clearInterval(supInt.current); clearTimeout(voiceT) }
  }, [phase, vis, showContent, supDone, sched, narrateOne])

  const collapseSup = useCallback(() => {
    if (supDone || !supFlicker) return
    speechSynthesis.cancel()
    if (supInt.current) { clearInterval(supInt.current); supInt.current = null }
    setSupVer(1); setSupDone(true)
    setTimeout(() => narrate(SUP_B, 1800, 0.7), 1500)
    tRef.current.push(setTimeout(() => setSupCont(true), 5000))
  }, [supDone, supFlicker, narrate])

  // ---- Entanglement measure ----
  const measureEnt = useCallback(() => {
    clearT(); setEntShow([false, false, false, false]); setEntMeta(false)
    speechSynthesis.cancel()
    const q1 = nextQ(), q2 = nextQ()
    const pi = q1 % ENT_POEMS.length
    const noise = q2 < 38
    const si = noise ? ((pi + 1 + (q2 % (ENT_POEMS.length - 1))) % ENT_POEMS.length) : pi
    setEntHeld(!noise)
    const lines = [ENT_POEMS[pi].c1[0], ENT_POEMS[pi].c1[1], ENT_POEMS[si].c2[0], ENT_POEMS[si].c2[1]]
    setEntLines(lines)
    sched([
      [() => { setEntShow([true, false, false, false]); narrateOne(lines[0], 0.72) }, 800],
      [() => setEntShow([true, true, false, false]), 3500],
      [() => { setEntShow([true, true, true, false]); narrateOne(lines[2], 0.72) }, 7000],
      [() => setEntShow([true, true, true, true]), 10000],
      [() => setEntMeta(true), 13000],
    ])
  }, [nextQ, clearT, sched, narrateOne])

  // ---- Decoherence: reveal lines, then dissolve ----
  useEffect(() => {
    if (phase !== 'decoherence' || !vis || !showContent) return

    // Reveal lines one at a time
    sched([
      [() => setDecoLineVis([true, false, false, false]), 0],
      [() => setDecoLineVis([true, true, false, false]), 2500],
      [() => setDecoLineVis([true, true, true, false]), 5000],
      [() => setDecoLineVis([true, true, true, true]), 7500],
    ])

    // Narrate as lines appear
    const voiceT = setTimeout(() => narrate(DECO_LINES, 1800, 0.72), 500)

    // Collect and shuffle non-protected character indices
    const unprotected = DECO_CHARS.filter(c => !c.prot).map(c => c.flatIdx)
    for (let i = unprotected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[unprotected[i], unprotected[j]] = [unprotected[j], unprotected[i]]
    }

    let cursor = 0
    // Start dissolving after all lines have been read
    const startDelay = setTimeout(() => {
      setDecoDissolving(true)
      const tick = () => {
        if (cursor >= unprotected.length) {
          setTimeout(() => {
            for (const c of DECO_CHARS) {
              if (c.prot && c.char !== ' ') {
                const el = decoEls.current[c.flatIdx]
                if (el) {
                  el.style.color = GOLD_LIGHT
                  el.style.textShadow = `0 0 14px ${gd(0.35)}`
                }
              }
            }
            const survivors = DECO_LINES.map(line => {
              const tokens = line.split(/\s+/)
              return tokens.filter(t => DECO_PROTECTED.has(t.toLowerCase().replace(/[^a-z']/g, ''))).join(' ')
            }).filter(Boolean)
            setTimeout(() => narrate(survivors, 2000, 0.65), 1500)
            setTimeout(() => setDecoDone(true), 3000)
          }, 1500)
          return
        }
        const el = decoEls.current[unprotected[cursor]]
        if (el) {
          // Drift upward as they fade
          el.style.opacity = '0'
          el.style.transform = `translateY(-${8 + Math.random() * 12}px)`
        }
        cursor++
        decoTmr.current = setTimeout(tick, 150)
      }
      tick()
    }, 12000)

    return () => { clearTimeout(startDelay); clearTimeout(voiceT); if (decoTmr.current) clearTimeout(decoTmr.current) }
  }, [phase, vis, showContent, narrate, sched])

  // ---- Measurement reveal ----
  useEffect(() => {
    if (phase !== 'measurement' || !vis || !showContent) return
    const timers = [
      setTimeout(() => { setMeasShow([true, false, false, false]); narrateOne(MEAS_LINES[0], 0.68) }, 800),
      setTimeout(() => { setMeasShow([true, true, false, false]); narrateOne(MEAS_LINES[1], 0.68) }, 5500),
      setTimeout(() => { setMeasShow([true, true, true, false]); narrateOne(MEAS_LINES[2], 0.68) }, 10500),
      setTimeout(() => { setMeasShow([true, true, true, true]); narrateOne(MEAS_LINES[3], 0.68) }, 15500),
      setTimeout(() => setMeasEnd(true), 21000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [phase, vis, showContent, narrateOne])

  useEffect(() => () => { clearT(); cancelAnimationFrame(animRef.current); speechSynthesis.cancel() }, [clearT])

  // ============================================================
  // RENDER
  // ============================================================

  const btnCls = 'px-8 py-3 rounded-full border text-xs tracking-[0.25em] uppercase font-light transition-all duration-700 hover:scale-105 active:scale-95'
  const btnSty = { borderColor: gd(0.2), color: gd(0.5) }

  // Phase-specific glow
  const glowColor = phase === 'decoherence' ? rs(0.04)
    : phase === 'measurement' ? gd(0.06)
    : gd(0.03)

  return (
    <div className="fixed inset-0 overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 50%, #0e0a14 0%, #060610 70%)' }}>

      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Phase-reactive glow behind text */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-[3000ms]"
        style={{ background: `radial-gradient(ellipse at 50% 45%, ${glowColor} 0%, transparent 50%)` }} />

      {/* Mute button */}
      <button
        onClick={() => { setMuted(m => !m); if (!muted) speechSynthesis.cancel() }}
        className="fixed top-5 right-5 z-50 w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{ borderColor: gd(0.12), background: 'rgba(6,6,16,0.7)' }}
        aria-label={muted ? 'Unmute' : 'Mute'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={gd(0.35)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {muted ? (<><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>)
            : (<><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" /></>)}
        </svg>
      </button>

      <div className={`relative z-10 h-full flex flex-col items-center justify-center px-6 sm:px-10
        transition-opacity duration-[1500ms] ${vis ? 'opacity-100' : 'opacity-0'}`}>

        {/* ======== INTRO ======== */}
        {phase === 'intro' && (
          <div className={`text-center cursor-pointer transition-all duration-[3000ms] ease-out
            ${introIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            onClick={() => goTo('superposition')}>

            {/* Decorative ring */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 rounded-full animate-pulse"
                style={{ boxShadow: `0 0 80px 20px ${gd(0.04)}, 0 0 200px 60px ${gd(0.02)}` }} />
              <p className="text-[100px] sm:text-[150px] md:text-[200px] font-extralight tracking-[0.3em] leading-none relative"
                style={{ color: gd(0.12) }}>
                XVII
              </p>
            </div>

            <p className="text-base sm:text-lg tracking-[0.4em] uppercase font-light"
              style={{ color: gd(0.55) }}>
              seventeen years
            </p>

            {/* Thin decorative line */}
            <div className="w-24 h-px mx-auto mt-8 mb-8" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.2)}, transparent)` }} />

            <p className="text-sm font-light leading-relaxed max-w-sm mx-auto mb-12"
              style={{ color: gd(0.25) }}>
              four quantum love poems
            </p>

            <div className="w-24 h-24 mx-auto rounded-full border flex items-center justify-center
              transition-all duration-700 hover:scale-110"
              style={{ borderColor: gd(0.15) }}>
              <span className="text-xs tracking-[0.3em] uppercase font-light"
                style={{ color: gd(0.4) }}>begin</span>
            </div>
            <p className="text-xs mt-5 tracking-widest animate-pulse"
              style={{ color: gd(0.12) }}>tap anywhere</p>
          </div>
        )}

        {/* ======== PHASE TITLE CARD ======== */}
        {phase !== 'intro' && !showContent && PHASE_TITLES[phase] && (
          <div className={`text-center transition-all duration-[2000ms] ease-out
            ${showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {/* Decorative ring around title */}
            <div className="relative inline-block mb-6">
              <div className="absolute -inset-8 rounded-full"
                style={{ boxShadow: `0 0 60px 15px ${phase === 'decoherence' ? rs(0.05) : gd(0.05)}` }} />
              <p className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.2em] relative"
                style={{ color: phase === 'decoherence' ? rs(0.6) : gd(0.6) }}>
                {PHASE_TITLES[phase].title}
              </p>
            </div>
            <div className="w-16 h-px mx-auto mb-6" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.15)}, transparent)` }} />
            {PHASE_TITLES[phase].sub.split('\n').map((line, i) => (
              <p key={i} className="text-sm sm:text-base font-light leading-relaxed"
                style={{ color: gd(0.3) }}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* ======== SUPERPOSITION ======== */}
        {phase === 'superposition' && showContent && (
          <div className={`text-center max-w-2xl w-full transition-opacity duration-[2000ms]`}
            onClick={supDone ? undefined : collapseSup}
            style={{ cursor: supDone || !supFlicker ? 'default' : 'pointer' }}>

            <p className="text-xs tracking-[0.3em] uppercase mb-3 font-light"
              style={{ color: gd(0.2) }}>superposition</p>
            <div className="w-12 h-px mx-auto mb-10" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.15)}, transparent)` }} />

            <div className="space-y-5">
              {SUP_A.map((lineA, i) => {
                const lineB = SUP_B[i]
                const same = lineA === lineB
                const lineVisible = supLineVis[i]

                if (same) return (
                  <div key={i} className={`transition-all duration-[2500ms] ease-out
                    ${lineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <p className="text-xl sm:text-2xl md:text-3xl font-light italic leading-relaxed"
                      style={{ color: gd(0.9) }}>{lineA}</p>
                  </div>
                )

                if (!supFlicker) {
                  // Before flicker starts — show A version appearing
                  return (
                    <div key={i} className={`transition-all duration-[2500ms] ease-out
                      ${lineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                      <p className="text-xl sm:text-2xl md:text-3xl font-light italic leading-relaxed"
                        style={{ color: gd(0.8) }}>{lineA}</p>
                    </div>
                  )
                }

                return (
                  <div key={i} className="grid">
                    <p className={`col-start-1 row-start-1 text-xl sm:text-2xl md:text-3xl font-light italic leading-relaxed
                      transition-all duration-[2500ms] ease-out`}
                      style={{ color: gd(supDone ? 0.08 : (supVer === 0 ? 0.8 : 0)) }}>
                      {lineA}
                    </p>
                    <p className={`col-start-1 row-start-1 text-xl sm:text-2xl md:text-3xl font-light italic leading-relaxed
                      transition-all duration-[2500ms] ease-out`}
                      style={{ color: gd(supVer === 1 || supDone ? 0.9 : 0) }}>
                      {lineB}
                    </p>
                  </div>
                )
              })}
            </div>

            {supFlicker && !supDone && (
              <p className="text-xs mt-12 tracking-widest animate-pulse"
                style={{ color: gd(0.18) }}>
                tap to collapse the wavefunction
              </p>
            )}

            {supDone && (
              <div className="mt-10">
                <div className="w-12 h-px mx-auto mb-4" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.15)}, transparent)` }} />
                <p className="text-xs tracking-[0.15em]"
                  style={{ color: gd(0.25) }}>
                  both readings were true &mdash; until measured
                </p>
              </div>
            )}

            {supCont && (
              <button onClick={(e) => { e.stopPropagation(); goTo('entanglement') }}
                className={`mt-10 ${btnCls}`} style={btnSty}>
                continue
              </button>
            )}
          </div>
        )}

        {/* ======== ENTANGLEMENT ======== */}
        {phase === 'entanglement' && showContent && (
          <div className="text-center max-w-2xl w-full transition-opacity duration-[2000ms]">
            <p className="text-xs tracking-[0.3em] uppercase mb-3 font-light"
              style={{ color: gd(0.2) }}>entanglement</p>
            <div className="w-12 h-px mx-auto mb-10" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.15)}, transparent)` }} />

            {!entLines ? (
              <div>
                <button onClick={measureEnt} className={btnCls} style={btnSty}>
                  measure
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-2 mb-3 text-center">
                  {entLines.slice(0, 2).map((line, i) => (
                    <p key={`a-${i}`}
                      className={`text-lg sm:text-xl md:text-2xl font-light italic leading-relaxed
                        transition-all duration-[2500ms] ease-out
                        ${entShow[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                      style={{ color: GOLD }}>
                      {line}
                    </p>
                  ))}
                </div>

                {/* Visual connection between couplets */}
                <div className={`my-6 flex items-center justify-center gap-3 transition-all duration-[2000ms]
                  ${entShow[1] ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-8 h-px" style={{ background: gd(0.12) }} />
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: entHeld ? gd(0.3) : rs(0.3) }} />
                  <div className="w-8 h-px" style={{ background: gd(0.12) }} />
                </div>

                <div className="space-y-2 text-center">
                  {entLines.slice(2).map((line, i) => (
                    <p key={`b-${i}`}
                      className={`text-lg sm:text-xl md:text-2xl font-light italic leading-relaxed
                        transition-all duration-[2500ms] ease-out
                        ${entShow[i + 2] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                      style={{ color: GOLD_LIGHT }}>
                      {line}
                    </p>
                  ))}
                </div>

                <div className={`mt-10 transition-all duration-[2500ms]
                  ${entMeta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                  <p className="text-xs tracking-[0.15em] mb-10 font-light"
                    style={{ color: entHeld ? gd(0.25) : rs(0.4) }}>
                    {entHeld
                      ? 'entanglement held \u2014 both halves from the same poem'
                      : 'noise broke the correlation \u2014 two poems crossed'}
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <button onClick={measureEnt} className={btnCls} style={btnSty}>measure again</button>
                    <button onClick={() => goTo('decoherence')} className={btnCls} style={btnSty}>continue</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== DECOHERENCE ======== */}
        {phase === 'decoherence' && showContent && (
          <div className="text-center max-w-2xl w-full transition-opacity duration-[2000ms]">
            <p className="text-xs tracking-[0.3em] uppercase mb-3 font-light"
              style={{ color: rs(0.3) }}>decoherence</p>
            <div className="w-12 h-px mx-auto mb-10" style={{ background: `linear-gradient(90deg, transparent, ${rs(0.15)}, transparent)` }} />

            <div className="text-center space-y-3">
              {DECO_LINES.map((_, li) => (
                <p key={li} className={`text-lg sm:text-xl md:text-2xl font-light italic leading-relaxed
                  transition-all duration-[2500ms] ease-out
                  ${decoLineVis[li] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                  {DECO_CHARS.filter(c => c.lineIdx === li).map(c => (
                    <span key={c.flatIdx}
                      ref={el => { if (el) decoEls.current[c.flatIdx] = el }}
                      className={`inline-block transition-all ${decoDissolving ? 'duration-[1200ms]' : 'duration-0'}`}
                      style={{ color: GOLD }}>
                      {c.char === ' ' ? '\u00A0' : c.char}
                    </span>
                  ))}
                </p>
              ))}
            </div>

            <div className={`transition-all duration-[2500ms]
              ${decoDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <div className="w-12 h-px mx-auto mt-10 mb-4" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.15)}, transparent)` }} />
              <p className="text-xs tracking-[0.15em] font-light mb-8"
                style={{ color: gd(0.25) }}>
                noise erases most things &mdash; what survives is the signal
              </p>
              <button onClick={() => goTo('measurement')} className={btnCls} style={btnSty}>continue</button>
            </div>
          </div>
        )}

        {/* ======== MEASUREMENT ======== */}
        {phase === 'measurement' && showContent && (
          <div className="text-center max-w-2xl w-full transition-opacity duration-[2000ms]">
            <div className="text-center space-y-4">
              {MEAS_LINES.map((line, i) => (
                <div key={i} className={`transition-all duration-[3000ms] ease-out
                  ${measShow[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  {/* Subtle glow pulse per line */}
                  <p className="text-xl sm:text-2xl md:text-3xl font-light italic leading-relaxed"
                    style={{ color: GOLD, textShadow: measShow[i] ? `0 0 30px ${gd(0.1)}` : 'none' }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>

            <div className={`mt-20 transition-all duration-[4000ms]
              ${measEnd ? 'opacity-100' : 'opacity-0'}`}>
              <div className="w-24 h-px mx-auto mb-6" style={{ background: `linear-gradient(90deg, transparent, ${gd(0.2)}, transparent)` }} />
              <p className="text-lg font-light tracking-[0.2em]"
                style={{ color: gd(0.5) }}>
                happy anniversary
              </p>
              <p className="text-[10px] mt-8 tracking-[0.15em] font-light"
                style={{ color: gd(0.12) }}>
                seeded from quantum vacuum fluctuations &middot; ANU QRNG &middot; 2026-02-14
              </p>
            </div>
          </div>
        )}
      </div>

      {phase !== 'measurement' && (
        <div className="fixed bottom-6 left-0 right-0 text-center z-10">
          <p className="text-[10px] tracking-[0.2em] font-light"
            style={{ color: gd(0.08) }}>quantum love poems</p>
        </div>
      )}
    </div>
  )
}
