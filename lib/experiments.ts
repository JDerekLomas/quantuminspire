import fs from 'fs'
import path from 'path'

// Re-export types and constants from client-safe module
export type { ExperimentResult, SweepPoint } from './experiment-constants'
export { typeLabels, typeColors } from './experiment-constants'

import type { ExperimentResult, SweepPoint } from './experiment-constants'

export interface QueuedExperiment {
  id: string
  type: string
  status: string
  backend: string
  created: string
  parameters: Record<string, any>
  priority: number
  description: string
}

const RESULTS_DIR = path.join(process.cwd(), 'experiments', 'results')
const QUEUE_DIR = path.join(process.cwd(), 'experiments', 'queue')

export function getAllResults(): ExperimentResult[] {
  if (!fs.existsSync(RESULTS_DIR)) return []
  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'))
  return files
    .map(f => {
      try {
        const content = fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')
        return JSON.parse(content) as ExperimentResult
      } catch {
        return null
      }
    })
    .filter((r): r is ExperimentResult => r !== null && typeof r === 'object' && !Array.isArray(r) && 'id' in r && 'backend' in r)
    .sort((a, b) => (b.completed || '').localeCompare(a.completed || ''))
}

export function getResultById(id: string): ExperimentResult | undefined {
  const all = getAllResults()
  return all.find(r => r.id === id)
}

export function getResultsByType(type: string): ExperimentResult[] {
  return getAllResults().filter(r => r.type === type)
}

export function getQueue(): QueuedExperiment[] {
  if (!fs.existsSync(QUEUE_DIR)) return []
  const files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'))
  return files
    .map(f => {
      try {
        const content = fs.readFileSync(path.join(QUEUE_DIR, f), 'utf-8')
        return JSON.parse(content) as QueuedExperiment
      } catch {
        return null
      }
    })
    .filter((q): q is QueuedExperiment => q !== null)
    .sort((a, b) => a.priority - b.priority)
}

export function getStats() {
  const results = getAllResults()
  const queue = getQueue()
  const pending = queue.filter(q => q.status === 'pending').length
  const running = queue.filter(q => q.status === 'running').length
  const completed = results.length
  const failed = queue.filter(q => q.status === 'failed').length
  const backends = Array.from(new Set(results.map(r => r.backend)))
  const types = Array.from(new Set(results.map(r => r.type)))
  const lastRun = results.length > 0 ? results[0].completed : null

  return { pending, running, completed, failed, backends, types, lastRun }
}

// ---------------------------------------------------------------------------
// Study lookups (for experiment detail pages)
// ---------------------------------------------------------------------------

import { studies, type ExperimentStudy } from '@/content/experiments/studies'

export type { ExperimentStudy }

export function getAllStudies(): ExperimentStudy[] {
  return studies
}

export function getStudyBySlug(slug: string): ExperimentStudy | undefined {
  return studies.find(s => s.slug === slug)
}

export function getResultGitHubUrl(resultId: string): string {
  return `https://github.com/JDerekLomas/quantuminspire/blob/main/experiments/results/${resultId}.json`
}

// ---------------------------------------------------------------------------
// VQE Sweep Data (bond-distance scan)
// ---------------------------------------------------------------------------

export interface SweepReference {
  bond_distance: number
  fci_energy: number
  hf_energy: number
  vqe_optimal_energy: number
  theta_optimal: number
  error_vs_fci_kcal: number
  coefficients: Record<string, number>
}

export function getSweepEmulator(): SweepPoint[] {
  const file = path.join(RESULTS_DIR, 'vqe-h2-sweep-emulator.json')
  if (!fs.existsSync(file)) return []
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

export function getSweepReference(): SweepReference[] {
  const file = path.join(RESULTS_DIR, 'vqe-h2-sweep-reference.json')
  if (!fs.existsSync(file)) return []
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

export function getSweepHardware(): SweepPoint[] {
  const file = path.join(RESULTS_DIR, 'vqe-h2-sweep-tuna9.json')
  if (!fs.existsSync(file)) return []
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}
