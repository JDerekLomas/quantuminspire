import PageClient from './PageClient'

export const metadata = {
  title: 'Presentation',
  description: 'Slide deck presenting the haiqu research initiative — AI as the interface between humans and quantum computers.',
  robots: { index: false, follow: true },
}

export default function DeckPage() {
  return <PageClient />
}
