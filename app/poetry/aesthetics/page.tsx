import AestheticsClient from './AestheticsClient'

export const metadata = {
  title: 'Quantum Aesthetics',
  description: 'What does quantum correlation look, sound, and feel like? Three examples from Tuna-9 hardware data.',
  robots: { index: false, follow: true },
}

export default function AestheticsPage() {
  return <AestheticsClient />
}
