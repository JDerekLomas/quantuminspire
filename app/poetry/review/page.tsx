import ReviewClient from './ReviewClient'

export const metadata = {
  title: 'Haiku Review',
  description: 'Review quantum-generated haiku from Tuna-9 hardware measurements.',
  robots: { index: false, follow: true },
}

export default function ReviewPage() {
  return <ReviewClient />
}
