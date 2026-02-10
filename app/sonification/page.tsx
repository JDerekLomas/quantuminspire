import { getAllResults, getSweepEmulator, type ExperimentResult, type SweepPoint } from '@/lib/experiments'
import SonificationClient from './SonificationClient'

export const metadata = {
  title: 'Listen to Quantum Circuits — Quantum Sonification',
  description: 'Hear the difference between a clean emulator Bell state and a noisy hardware run. Each measurement outcome becomes a sine wave.',
}

export default function SonificationPage() {
  const allResults = getAllResults()

  // Filter for experiments with usable raw_counts
  const sonifiable = allResults.filter(r => {
    if (!r.raw_counts) return false
    const keys = Object.keys(r.raw_counts)
    if (keys.length === 0) return false
    // Must have actual count data (not just metadata)
    const first = r.raw_counts[keys[0]]
    if (typeof first === 'number') return true // flat counts
    if (typeof first === 'object' && first !== null) return true // nested
    return false
  })

  // Load VQE sweep data
  const sweepEmulator = getSweepEmulator()

  return <SonificationClient experiments={sonifiable} sweepEmulator={sweepEmulator} />
}
