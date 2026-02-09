import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WP4.4 — UX & UI Redesign for Society | Quantum Inspire',
  description: 'Redesigning the quantum computing experience. Making quantum algorithms accessible to non-specialists through human-centered design.',
  openGraph: {
    title: 'WP4.4 — UX & UI Redesign for Society',
    description: 'Making quantum computing accessible through design',
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
      <body className="noise-overlay">{children}</body>
    </html>
  )
}
