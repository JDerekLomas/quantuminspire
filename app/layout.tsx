import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI x Quantum — TU Delft / Quantum Inspire',
  description: 'How might generative AI accelerate quantum computing? An open research initiative from TU Delft.',
  openGraph: {
    title: 'AI x Quantum — TU Delft / Quantum Inspire',
    description: 'How might generative AI accelerate quantum computing? Research from TU Delft.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise-overlay quantum-grid min-h-screen">{children}</body>
    </html>
  )
}
