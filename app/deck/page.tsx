'use client'

import InputWidget from '@/components/InputWidget'

export default function DeckPage() {
  return (
    <>
      <iframe
        src="/slides/wp4-4.html"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          border: 'none',
        }}
        allowFullScreen
      />
      <InputWidget allowedHosts={['localhost', 'haiqu.org']} />
    </>
  )
}
