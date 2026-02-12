'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import type { ExperimentResult, SweepPoint } from '@/lib/experiment-constants'
import { typeLabels, typeColors } from '@/lib/experiment-constants'
import {
  SonificationEngine,
  countsToPartials,
  getEffectiveCounts,
  extractQAOASteps,
  getSonificationMode,
  getNumQubits,
  type Partial as SonPartial,
  type SonificationMode,
  type SonificationStep,
} from '@/lib/sonification'

function isEmulator(backend: string): boolean {
  if (!backend) return false
  const lower = backend.toLowerCase()
  return lower.includes('emulator') || lower.includes('qxelarator')
}

function BackendBadge({ backend }: { backend: string }) {
  const lower = (backend || '').toLowerCase()
  const isHw = lower.includes('ibm') || lower.includes('tuna') || lower.includes('iqm') || lower.includes('garnet')
  let label = backend
  if (lower.includes('emulator') || lower.includes('qxelarator')) label = 'QI Emulator'
  else if (lower.includes('tuna')) label = 'Tuna-9'
  else if (lower.includes('ibm_torino')) label = 'IBM Torino'
  else if (lower.includes('ibm')) label = 'IBM'

  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${
      isHw
        ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30'
        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
    }`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  experiments: ExperimentResult[]
  sweepEmulator: SweepPoint[]
}

type GroupKey = 'bell_calibration' | 'ghz_state' | 'vqe_h2' | 'qaoa_maxcut' | 'other'

const GROUP_ORDER: GroupKey[] = ['bell_calibration', 'ghz_state', 'vqe_h2', 'qaoa_maxcut', 'other']
const GROUP_LABELS: Record<GroupKey, string> = {
  bell_calibration: 'Bell States',
  ghz_state: 'GHZ States',
  vqe_h2: 'VQE Chemistry',
  qaoa_maxcut: 'QAOA MaxCut',
  other: 'Other',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupExperiments(exps: ExperimentResult[]): Record<GroupKey, ExperimentResult[]> {
  const groups: Record<GroupKey, ExperimentResult[]> = {
    bell_calibration: [],
    ghz_state: [],
    vqe_h2: [],
    qaoa_maxcut: [],
    other: [],
  }
  for (const e of exps) {
    const key = e.type in groups ? (e.type as GroupKey) : 'other'
    groups[key].push(e)
  }
  return groups
}

function getMetric(e: ExperimentResult): string {
  if (e.analysis?.fidelity != null) return `${(e.analysis.fidelity as number * 100).toFixed(1)}%`
  if (e.analysis?.error_kcal_mol != null) return `${(e.analysis.error_kcal_mol as number).toFixed(1)} kcal/mol`
  if (e.analysis?.best_approximation_ratio != null) return `${((e.analysis.best_approximation_ratio as number) * 100).toFixed(0)}% ratio`
  if (e.analysis?.energy_hartree != null) return `${(e.analysis.energy_hartree as number).toFixed(4)} Ha`
  return ''
}

function freqToColor(freq: number): string {
  // 220 Hz = cyan, 880 Hz = purple
  const t = (freq - 220) / 660
  const r = Math.round(0 + t * 139)
  const g = Math.round(212 - t * 120)
  const b = Math.round(255)
  return `rgb(${r},${g},${b})`
}

// ---------------------------------------------------------------------------
// Histogram Bar visualization
// ---------------------------------------------------------------------------

function HistogramBars({
  partials,
  activePartials,
}: {
  partials: SonPartial[]
  activePartials: boolean
}) {
  if (partials.length === 0) return <div className="text-xs text-gray-500 font-mono">No measurement data</div>
  const maxProb = Math.max(...partials.map(p => p.probability))

  return (
    <div className="space-y-1">
      {partials.slice(0, 12).map(p => {
        const pct = (p.probability / maxProb) * 100
        const color = freqToColor(p.frequency)
        return (
          <div key={p.bitstring} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-500 w-12 text-right shrink-0">|{p.bitstring}&#x27E9;</span>
            <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden relative">
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  opacity: activePartials ? 1 : 0.5,
                  boxShadow: activePartials ? `0 0 8px ${color}` : 'none',
                }}
              />
            </div>
            <span className="text-gray-400 w-14 text-right shrink-0">{(p.probability * 100).toFixed(1)}%</span>
            <span className="text-gray-600 w-16 text-right shrink-0">{p.frequency.toFixed(0)} Hz</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export default function SonificationClient({ experiments, sweepEmulator }: Props) {
  const engineRef = useRef<SonificationEngine | null>(null)
  const [selected, setSelected] = useState<ExperimentResult | null>(null)
  const [sweepMode, setSweepMode] = useState(false) // whether playing VQE sweep
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [speed, setSpeed] = useState(1)
  const [currentStep, setCurrentStep] = useState(-1)
  const [activeBasis, setActiveBasis] = useState<string>('z_basis')
  const [comparisonMode, setComparisonMode] = useState<'left' | 'right' | 'stereo'>('stereo')

  const groups = groupExperiments(experiments)

  // Find matching emulator/hardware pairs for comparison
  const findCompanion = useCallback((exp: ExperimentResult): ExperimentResult | null => {
    const isEmu = isEmulator(exp.backend)
    return experiments.find(e =>
      e.id !== exp.id &&
      e.type === exp.type &&
      isEmulator(e.backend) !== isEmu &&
      Math.abs((e.parameters?.bond_distance || 0) - (exp.parameters?.bond_distance || 0)) < 0.01
    ) || null
  }, [experiments])

  // Get engine, init on first use
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new SonificationEngine()
    }
    engineRef.current.init()
    return engineRef.current
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => { engineRef.current?.dispose() }
  }, [])

  // Update volume
  useEffect(() => {
    engineRef.current?.setVolume(volume)
  }, [volume])

  // ---------------------------------------------------------------------------
  // Play handlers
  // ---------------------------------------------------------------------------

  const handlePlayChord = useCallback((exp: ExperimentResult, basis?: string) => {
    const engine = getEngine()
    engine.stop()
    const nq = getNumQubits(exp)
    const qubits = exp.parameters?.qubits as number[] | undefined
    const counts = getEffectiveCounts(exp.raw_counts, qubits, basis)
    const partials = countsToPartials(counts, qubits ? qubits.length : nq)
    engine.playChord(partials, 2 / speed)
    setPlaying(true)
    setTimeout(() => setPlaying(false), (2 / speed) * 1000 + 150)
  }, [getEngine, speed])

  const handlePlayMultiBasis = useCallback((exp: ExperimentResult) => {
    const engine = getEngine()
    engine.stop()
    const nq = getNumQubits(exp)
    const qubits = exp.parameters?.qubits as number[] | undefined
    const logicalQ = qubits ? qubits.length : nq
    const bases = ['z_basis', 'x_basis', 'y_basis']
    const steps: SonificationStep[] = bases
      .filter(b => exp.raw_counts[b])
      .map(b => {
        const counts = getEffectiveCounts(exp.raw_counts, qubits, b)
        return { label: b.replace('_', ' ').toUpperCase(), partials: countsToPartials(counts, logicalQ) }
      })

    setPlaying(true)
    setCurrentStep(0)
    const stepDur = 2 / speed
    engine.playSequence(steps, stepDur, (i) => {
      setCurrentStep(i)
      setActiveBasis(bases[i])
    })
    setTimeout(() => {
      setPlaying(false)
      setCurrentStep(-1)
    }, steps.length * stepDur * 1000 + 200)
  }, [getEngine, speed])

  const handlePlaySweep = useCallback(() => {
    if (sweepEmulator.length === 0) return
    const engine = getEngine()
    engine.stop()
    setSweepMode(true)
    setPlaying(true)
    setCurrentStep(0)

    const steps: SonificationStep[] = sweepEmulator
      .filter(pt => pt.raw_counts)
      .map(pt => {
        const counts = getEffectiveCounts(pt.raw_counts!, undefined, 'z_basis')
        const nq = Object.keys(counts)[0]?.length || 2
        return {
          label: `R=${pt.bond_distance.toFixed(2)} A`,
          partials: countsToPartials(counts, nq),
          meta: { energy: pt.energy_measured, error: pt.error_kcal, bond_distance: pt.bond_distance },
        }
      })

    const stepDur = 1.5 / speed
    engine.playSequence(steps, stepDur, (i) => setCurrentStep(i))
    setTimeout(() => {
      setPlaying(false)
      setSweepMode(false)
      setCurrentStep(-1)
    }, steps.length * stepDur * 1000 + 200)
  }, [getEngine, speed, sweepEmulator])

  const handlePlayQAOA = useCallback((exp: ExperimentResult) => {
    const engine = getEngine()
    engine.stop()
    setPlaying(true)
    setCurrentStep(0)

    const qaoaSteps = extractQAOASteps(exp.raw_counts)
    const nq = getNumQubits(exp)
    const qubits = exp.parameters?.qubits as number[] | undefined
    const logicalQ = qubits ? qubits.length : nq

    const steps: SonificationStep[] = qaoaSteps.map(s => {
      const counts = qubits && Object.keys(s.counts)[0]?.length > logicalQ
        ? getEffectiveCounts({ flat: s.counts }, qubits)
        : s.counts
      return {
        label: s.label,
        partials: countsToPartials(counts, logicalQ),
        meta: { gammaIdx: s.gammaIdx, betaIdx: s.betaIdx },
      }
    })

    const stepDur = 1.2 / speed
    engine.playSequence(steps, stepDur, (i) => setCurrentStep(i))
    setTimeout(() => {
      setPlaying(false)
      setCurrentStep(-1)
    }, steps.length * stepDur * 1000 + 200)
  }, [getEngine, speed])

  const handlePlayComparison = useCallback((exp: ExperimentResult, companion: ExperimentResult) => {
    const engine = getEngine()
    engine.stop()
    setPlaying(true)

    const nq1 = getNumQubits(exp)
    const nq2 = getNumQubits(companion)
    const q1 = exp.parameters?.qubits as number[] | undefined
    const q2 = companion.parameters?.qubits as number[] | undefined
    const counts1 = getEffectiveCounts(exp.raw_counts, q1)
    const counts2 = getEffectiveCounts(companion.raw_counts, q2)
    const p1 = countsToPartials(counts1, q1?.length || nq1)
    const p2 = countsToPartials(counts2, q2?.length || nq2)

    const dur = 2.5 / speed

    if (comparisonMode === 'stereo') {
      const emu = isEmulator(exp.backend) ? p1 : p2
      const hw = isEmulator(exp.backend) ? p2 : p1
      engine.playStereoComparison(emu, hw, dur)
    } else if (comparisonMode === 'left') {
      engine.playChord(p1, dur)
    } else {
      engine.playChord(p2, dur)
    }

    setTimeout(() => setPlaying(false), dur * 1000 + 150)
  }, [getEngine, speed, comparisonMode])

  const handleStop = useCallback(() => {
    engineRef.current?.stop()
    setPlaying(false)
    setSweepMode(false)
    setCurrentStep(-1)
  }, [])

  // Get current partials for visualization
  const getCurrentPartials = useCallback((): SonPartial[] => {
    if (!selected) return []
    const nq = getNumQubits(selected)
    const qubits = selected.parameters?.qubits as number[] | undefined
    const counts = getEffectiveCounts(selected.raw_counts, qubits, activeBasis)
    return countsToPartials(counts, qubits?.length || nq)
  }, [selected, activeBasis])

  // Determine mode for selected experiment
  const mode: SonificationMode = selected ? getSonificationMode(selected) : 'chord'
  const companion = selected ? findCompanion(selected) : null
  const partials = getCurrentPartials()

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav section="listen" />

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        {/* Hero */}
        <section className="mb-12">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-4">Quantum Sonification</p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            Listen to Quantum Circuits
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
            Each measurement outcome becomes a sine wave. Probability controls amplitude,
            bitstring value controls frequency. A perfect Bell state is a clean two-note octave.
            A noisy hardware run is a fuzzy cluster of tones.
          </p>
          <div className="flex gap-2 mt-4 text-xs font-mono text-gray-500">
            <span>{experiments.length} experiments</span>
            <span>&middot;</span>
            <span>220 Hz (A3) to 880 Hz (A5)</span>
            <span>&middot;</span>
            <span>Web Audio API</span>
          </div>
          <p className="text-gray-600 text-xs mt-3">
            New to quantum sound? Start with the{' '}
            <a href="/tuna9" className="text-[#00d4ff] hover:underline">Meeting Tuna-9</a> — a guided tour of a 9-qubit quantum computer.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Experiment Browser — left panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* VQE Sweep special card */}
            {sweepEmulator.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-2">Featured</h3>
                <button
                  onClick={() => { setSelected(null); handlePlaySweep() }}
                  className="w-full text-left bg-gradient-to-r from-[#8b5cf6]/10 to-[#00d4ff]/10 border border-[#8b5cf6]/20 rounded-lg p-4 hover:border-[#8b5cf6]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">H2 Bond Sweep</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                      QI Emulator
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{sweepEmulator.length} bond distances, hear the energy landscape evolve</p>
                  <p className="text-xs font-mono text-[#8b5cf6] mt-1">Click to play sweep</p>
                </button>
              </div>
            )}

            {GROUP_ORDER.map(groupKey => {
              const items = groups[groupKey]
              if (items.length === 0) return null
              return (
                <div key={groupKey}>
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-2">
                    {GROUP_LABELS[groupKey]}
                    <span className="text-gray-600 ml-2">{items.length}</span>
                  </h3>
                  <div className="space-y-1">
                    {items.slice(0, 12).map(exp => {
                      const isActive = selected?.id === exp.id
                      const metric = getMetric(exp)
                      return (
                        <button
                          key={exp.id}
                          onClick={() => { setSelected(exp); setCurrentStep(-1); setSweepMode(false) }}
                          className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                            isActive
                              ? 'bg-white/[0.06] border border-white/10'
                              : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: typeColors[exp.type] || '#666' }}
                            />
                            <span className="text-xs font-mono text-gray-300 truncate flex-1">
                              {exp.id}
                            </span>
                            <BackendBadge backend={exp.backend} />
                          </div>
                          {metric && (
                            <span className="text-[10px] font-mono text-gray-500 ml-4">{metric}</span>
                          )}
                        </button>
                      )
                    })}
                    {items.length > 12 && (
                      <p className="text-[10px] font-mono text-gray-600 px-3">+{items.length - 12} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Player — right panel */}
          <div className="lg:col-span-3">
            <div className="sticky top-20">
              {/* Sweep progress */}
              {sweepMode && currentStep >= 0 && sweepEmulator.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 mb-4">
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-3">Bond Distance Sweep</p>
                  <div className="flex gap-1 mb-3">
                    {sweepEmulator.filter(pt => pt.raw_counts).map((pt, i) => (
                      <div
                        key={pt.bond_distance}
                        className="flex-1 h-8 rounded relative overflow-hidden"
                        style={{
                          backgroundColor: i === currentStep ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.03)',
                          borderWidth: 1,
                          borderColor: i === currentStep ? 'rgba(139,92,246,0.5)' : 'transparent',
                        }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-mono text-gray-500 pb-0.5">
                          {pt.bond_distance.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentStep >= 0 && currentStep < sweepEmulator.length && (
                    <div className="flex gap-4 text-xs font-mono">
                      <span className="text-gray-400">R = <span className="text-white">{sweepEmulator[currentStep].bond_distance.toFixed(3)} A</span></span>
                      <span className="text-gray-400">E = <span className="text-[#8b5cf6]">{sweepEmulator[currentStep].energy_measured.toFixed(4)} Ha</span></span>
                      <span className="text-gray-400">Error: <span className="text-yellow-400">{sweepEmulator[currentStep].error_kcal.toFixed(2)} kcal/mol</span></span>
                    </div>
                  )}
                </div>
              )}

              {/* Selected experiment player */}
              {selected ? (
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 space-y-5">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-bold text-white">
                        {typeLabels[selected.type] || selected.type}
                      </h2>
                      <BackendBadge backend={selected.backend} />
                    </div>
                    <p className="text-xs font-mono text-gray-500">{selected.id}</p>
                    {getMetric(selected) && (
                      <p className="text-sm font-mono text-gray-300 mt-1">{getMetric(selected)}</p>
                    )}
                  </div>

                  {/* Histogram visualization */}
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">
                      Frequency Spectrum
                      {mode === 'multi_basis' && (
                        <span className="ml-2 text-[#8b5cf6]">{activeBasis.replace('_', ' ')}</span>
                      )}
                    </p>
                    <HistogramBars partials={partials} activePartials={playing} />
                  </div>

                  {/* Multi-basis selector */}
                  {mode === 'multi_basis' && (
                    <div className="flex gap-2">
                      {['z_basis', 'x_basis', 'y_basis'].map(b => (
                        <button
                          key={b}
                          onClick={() => setActiveBasis(b)}
                          className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                            activeBasis === b
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {b.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* QAOA grid visualization */}
                  {mode === 'qaoa_sweep' && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">QAOA Parameter Grid</p>
                      <div className="inline-grid gap-[2px]" style={{
                        gridTemplateColumns: `repeat(${Math.max(...extractQAOASteps(selected.raw_counts).map(s => s.betaIdx)) + 1}, 28px)`
                      }}>
                        {extractQAOASteps(selected.raw_counts).map((s, i) => (
                          <div
                            key={s.label}
                            className="w-7 h-7 rounded text-[8px] font-mono flex items-center justify-center"
                            style={{
                              backgroundColor: i === currentStep ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.05)',
                              border: i === currentStep ? '1px solid rgba(139,92,246,0.7)' : '1px solid transparent',
                              color: i === currentStep ? '#fff' : '#666',
                            }}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transport controls */}
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    {/* Play button */}
                    <button
                      onClick={() => {
                        if (playing) {
                          handleStop()
                        } else if (mode === 'qaoa_sweep') {
                          handlePlayQAOA(selected)
                        } else if (mode === 'multi_basis') {
                          handlePlayMultiBasis(selected)
                        } else {
                          handlePlayChord(selected, activeBasis)
                        }
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        playing
                          ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                          : 'bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/30'
                      }`}
                    >
                      {playing ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <rect x="2" y="2" width="4" height="10" rx="1" />
                          <rect x="8" y="2" width="4" height="10" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <polygon points="3,1 13,7 3,13" />
                        </svg>
                      )}
                    </button>

                    {/* Single basis play for multi-basis */}
                    {mode === 'multi_basis' && !playing && (
                      <button
                        onClick={() => handlePlayChord(selected, activeBasis)}
                        className="text-xs font-mono px-3 py-1.5 rounded bg-white/[0.04] border border-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        Play {activeBasis.replace('_', ' ')} only
                      </button>
                    )}

                    {/* Comparison controls */}
                    {companion && (
                      <div className="flex items-center gap-2">
                        <select
                          value={comparisonMode}
                          onChange={e => setComparisonMode(e.target.value as 'left' | 'right' | 'stereo')}
                          className="text-xs font-mono bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-gray-300"
                        >
                          <option value="stereo">Stereo (L/R)</option>
                          <option value="left">This only</option>
                          <option value="right">Companion only</option>
                        </select>
                        <button
                          onClick={() => handlePlayComparison(selected, companion)}
                          className="text-xs font-mono px-3 py-1.5 rounded bg-[#e879f9]/10 border border-[#e879f9]/30 text-[#e879f9] hover:bg-[#e879f9]/20 transition-colors"
                        >
                          Compare
                        </button>
                      </div>
                    )}

                    <div className="flex-1" />

                    {/* Speed */}
                    <div className="flex items-center gap-1">
                      {[0.5, 1, 2].map(s => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={`text-[10px] font-mono px-2 py-1 rounded ${
                            speed === s ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-500" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={e => setVolume(parseFloat(e.target.value))}
                        className="w-20 accent-[#00d4ff]"
                      />
                    </div>
                  </div>

                  {/* Companion info */}
                  {companion && (
                    <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                      <span>Comparison pair:</span>
                      <BackendBadge backend={companion.backend} />
                      <span>{companion.id}</span>
                    </div>
                  )}
                </div>
              ) : !sweepMode ? (
                /* Empty state */
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-12 text-center">
                  <div className="text-4xl mb-4 opacity-20">&#x266B;</div>
                  <p className="text-gray-400 text-sm mb-2">Select an experiment to listen</p>
                  <p className="text-gray-600 text-xs font-mono">
                    Each measurement outcome becomes a tone. Probability is amplitude, bitstring value is frequency.
                  </p>
                </div>
              ) : null}

              {/* How it works */}
              <div className="mt-6 bg-white/[0.02] border border-white/5 rounded-lg p-6">
                <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-400 mb-3">How It Works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
                  <div>
                    <p className="text-white font-bold mb-1">Frequency</p>
                    <p>Bitstring integer value mapped linearly from 220 Hz (|00...0&#x27E9;) to 880 Hz (|11...1&#x27E9;).</p>
                  </div>
                  <div>
                    <p className="text-white font-bold mb-1">Amplitude</p>
                    <p>Measurement probability controls the volume of each tone. Rare outcomes are quiet.</p>
                  </div>
                  <div>
                    <p className="text-white font-bold mb-1">Noise = Fuzz</p>
                    <p>A perfect Bell state: two clean notes. Noisy hardware: many quiet tones blur the chord.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 pt-8 mt-16 text-center">
          <p className="text-xs font-mono text-gray-500">
            All experiments designed and executed by Claude Opus 4.6 via MCP tool calls.
            Data: <Link href="/experiments" className="text-[#00d4ff] hover:underline">experiments dashboard</Link>.
            Source: <a href="https://github.com/JDerekLomas/quantuminspire" className="text-[#00d4ff] hover:underline">GitHub</a>.
          </p>
        </footer>
      </main>
    </div>
  )
}
