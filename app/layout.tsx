import type { Metadata } from 'next'
import './globals.css'
import InputWidget from '@/components/InputWidget'

export const metadata: Metadata = {
  metadataBase: new URL('https://haiqu.org'),
  title: {
    default: 'haiqu — AI x Quantum Research',
    template: '%s — haiqu',
  },
  description: 'AI as the interface between humans and quantum computers. Agents replicate landmark papers on real hardware — 93% of claims pass. Open research from TU Delft.',
  authors: [{ name: 'J. Derek Lomas', url: 'https://dereklomas.me' }],
  openGraph: {
    title: 'haiqu — AI as the interface between humans & quantum',
    description: 'AI agents replicate 6 landmark quantum papers on 3 chips through natural language. 93% of claims pass, zero quantum code by hand. Open research from TU Delft / QuTech.',
    type: 'website',
    siteName: 'haiqu',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'haiqu — How might AI accelerate quantum?',
    description: 'AI agents replicate 6 landmark papers on real quantum hardware. 93% pass rate, zero hand-written quantum code.',
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
      <body className="noise-overlay quantum-grid min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#0a0a1a] focus:text-[#00d4ff] focus:border focus:border-[#00d4ff]/40 focus:rounded-lg focus:text-sm focus:font-mono"
        >
          Skip to main content
        </a>
        {children}
        <InputWidget allowedHosts={["localhost", "haiqu.org", "vercel.app"]} />
      </body>
    </html>
  )
}
