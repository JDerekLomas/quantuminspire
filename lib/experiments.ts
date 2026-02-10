import fs from 'fs'
import path from 'path'

export interface ExperimentResult {
  id: string
  type: string
  backend: string
  submitted: string
  completed: string
  parameters: Record<string, any>
  raw_counts: Record<string, any>
  analysis: Record<string, any>
  circuit_cqasm: string
  errors?: string[] | null
}

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
    .filter((r): r is ExperimentResult => r !== null)
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

export const typeLabels: Record<string, string> = {
  bell_calibration: 'Bell Calibration',
  ghz_state: 'GHZ State',
  vqe_h2: 'H\u2082 VQE',
  rb_1qubit: 'Randomized Benchmarking',
  qaoa_maxcut: 'QAOA MaxCut',
  quantum_volume: 'Quantum Volume',
}

export const typeColors: Record<string, string> = {
  bell_calibration: '#00d4ff',
  ghz_state: '#00ff88',
  vqe_h2: '#8b5cf6',
  rb_1qubit: '#ff8c42',
  qaoa_maxcut: '#ff6b9d',
  quantum_volume: '#14b8a6',
}
