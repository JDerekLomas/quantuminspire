import fs from 'fs'
import path from 'path'

export interface ReplicationPaper {
  title: string
  authors: string
  journal: string
  arxiv: string
  institution: string
  hardware: string
  url: string
}

export interface BackendResult {
  measured_value?: number | boolean
  discrepancy?: number
  within_published_error?: boolean
  failure_mode?: string
  failure_description?: string
  severity?: string
  error_kcal_mol?: number
  status?: string
  note?: string
}

export interface ReplicationComparison {
  claim_id: string
  description: string
  published_value: number | boolean
  published_error?: number | null
  unit: string
  figure?: string
  results_by_backend: Record<string, BackendResult>
}

export interface ReplicationSummary {
  total_claims_tested: number
  successes: number
  success_rate: number
  failure_mode_counts: Record<string, number>
  backends_tested: string[]
}

export interface ReplicationReport {
  paper_id: string
  paper: ReplicationPaper
  generated: string
  backends_tested: string[]
  comparisons: ReplicationComparison[]
  summary: ReplicationSummary
}

const REPORTS_DIR = path.join(process.cwd(), 'research', 'replication-reports')

export function getAllReports(): ReplicationReport[] {
  if (!fs.existsSync(REPORTS_DIR)) return []
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'))
  return files
    .map(f => {
      try {
        const content = fs.readFileSync(path.join(REPORTS_DIR, f), 'utf-8')
        return JSON.parse(content) as ReplicationReport
      } catch {
        return null
      }
    })
    .filter((r): r is ReplicationReport => r !== null && 'paper_id' in r)
}

export function getReportById(paperId: string): ReplicationReport | undefined {
  const filepath = path.join(REPORTS_DIR, `${paperId}.json`)
  if (!fs.existsSync(filepath)) return undefined
  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content) as ReplicationReport
  } catch {
    return undefined
  }
}

export function getReportMarkdown(paperId: string): string | undefined {
  const filepath = path.join(REPORTS_DIR, `${paperId}.md`)
  if (!fs.existsSync(filepath)) return undefined
  try {
    return fs.readFileSync(filepath, 'utf-8')
  } catch {
    return undefined
  }
}

export function getAllReportIds(): string[] {
  if (!fs.existsSync(REPORTS_DIR)) return []
  return fs.readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}

// Papers in the pipeline (including those without reports yet)
export const PAPER_PIPELINE: Array<{
  id: string
  title: string
  authors: string
  journal: string
  arxiv: string
  status: 'completed' | 'in_progress' | 'planned'
  qubits: number
  type: string
}> = [
  {
    id: 'sagastizabal2019',
    title: 'Error Mitigation by Symmetry Verification on a VQE',
    authors: 'Sagastizabal et al.',
    journal: 'Phys. Rev. A 100, 010302(R) (2019)',
    arxiv: '1902.11258',
    status: 'completed',
    qubits: 2,
    type: 'VQE + Error Mitigation',
  },
  {
    id: 'kandala2017',
    title: 'Hardware-efficient VQE for small molecules',
    authors: 'Kandala et al.',
    journal: 'Nature 549, 242 (2017)',
    arxiv: '1704.05018',
    status: 'completed',
    qubits: 6,
    type: 'VQE',
  },
  {
    id: 'peruzzo2014',
    title: 'A variational eigenvalue solver on a photonic quantum processor',
    authors: 'Peruzzo et al.',
    journal: 'Nature Comms 5, 4213 (2014)',
    arxiv: '1304.3061',
    status: 'completed',
    qubits: 2,
    type: 'VQE (first)',
  },
  {
    id: 'cross2019',
    title: 'Validating quantum computers using randomized model circuits',
    authors: 'Cross et al.',
    journal: 'Phys. Rev. A 100, 032328 (2019)',
    arxiv: '1811.12926',
    status: 'completed',
    qubits: 5,
    type: 'Quantum Volume',
  },
  {
    id: 'harrigan2021',
    title: 'Quantum approximate optimization of non-planar graph problems on a planar superconducting processor',
    authors: 'Harrigan et al.',
    journal: 'Nature Physics 17, 332 (2021)',
    arxiv: '2004.04197',
    status: 'in_progress',
    qubits: 23,
    type: 'QAOA',
  },
]
