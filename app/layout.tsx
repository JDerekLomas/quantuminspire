import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://haiqu.org'),
  title: {
    default: 'AI x Quantum — TU Delft / Quantum Inspire',
    template: '%s — AI x Quantum',
  },
  description: 'How might generative AI accelerate quantum computing? An open research initiative from TU Delft.',
  openGraph: {
    title: 'AI x Quantum — TU Delft / Quantum Inspire',
    description: 'How might generative AI accelerate quantum computing? Research from TU Delft.',
    type: 'website',
    siteName: 'AI x Quantum',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: '/',
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
