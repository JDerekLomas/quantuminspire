import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://haiqu.org'),
  title: {
    default: 'haiqu — AI x Quantum Research',
    template: '%s — haiqu',
  },
  description: 'How might generative AI accelerate quantum computing? An open research initiative from TU Delft.',
  authors: [{ name: 'J. Derek Lomas', url: 'https://dereklomas.me' }],
  openGraph: {
    title: 'haiqu — AI x Quantum Research',
    description: 'AI agents replicate 6 landmark quantum papers on 3 chips. 27 claims tested, 93% pass, chemical accuracy achieved. Open research from TU Delft.',
    type: 'website',
    siteName: 'haiqu',
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
