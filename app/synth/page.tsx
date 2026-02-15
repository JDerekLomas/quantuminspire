import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import QuantumSynthClient from './QuantumSynthClient'

export const metadata = {
  title: 'Quantum Synth — Hear Molecules',
  description: 'Energy levels become harmonic partials. Stretch the bond, hear the spectrum shift. Real quantum chemistry, sonified.',
}

export default function SynthPage() {
  const dataDir = join(process.cwd(), 'public/data')

  const h2 = JSON.parse(readFileSync(join(dataDir, 'h2-eigenspectrum.json'), 'utf8'))

  const lihPath = join(dataDir, 'lih-eigenspectrum.json')
  const lih = existsSync(lihPath) ? JSON.parse(readFileSync(lihPath, 'utf8')) : null

  const molecules = [h2, ...(lih ? [lih] : [])]

  return <QuantumSynthClient molecules={molecules} />
}
