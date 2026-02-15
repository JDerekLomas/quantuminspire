// Client-safe types and constants (no fs dependency)

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

export interface SweepPoint {
  bond_distance: number
  energy_measured: number
  energy_exact: number
  fci_energy: number
  hf_energy: number
  error_kcal: number
  alpha: number
  shots: number
  raw_counts?: Record<string, any>
  coefficients?: Record<string, number>
  // Statistical fields (from multi-rep runs)
  error_std_kcal?: number
  error_mHa?: number
  error_std_mHa?: number
  n_reps?: number
  mitigation?: string
}

export const typeLabels: Record<string, string> = {
  bell_calibration: 'Bell Calibration',
  ghz_state: 'GHZ State',
  vqe_h2: 'H\u2082 VQE',
  rb_1qubit: 'Randomized Benchmarking',
  qaoa_maxcut: 'QAOA MaxCut',
  quantum_volume: 'Quantum Volume',
  qrng_certification: 'QRNG Certification',
  connectivity_probe: 'Connectivity Probe',
  repetition_code: 'Repetition Code',
  detection_code: 'Detection Code',
  vqe_mitigation_ladder: 'VQE Mitigation Ladder',
  readout_calibration: 'Readout Calibration',
}

export const typeColors: Record<string, string> = {
  bell_calibration: '#00d4ff',
  ghz_state: '#00ff88',
  vqe_h2: '#8b5cf6',
  rb_1qubit: '#ff8c42',
  qaoa_maxcut: '#ff6b9d',
  quantum_volume: '#14b8a6',
  qrng_certification: '#f59e0b',
  connectivity_probe: '#e879f9',
  repetition_code: '#22d3ee',
  detection_code: '#a78bfa',
  vqe_mitigation_ladder: '#10b981',
  readout_calibration: '#f97316',
}
