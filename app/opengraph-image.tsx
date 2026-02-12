import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'haiqu — AI as the interface between humans and quantum computers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0a0a1a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          fontFamily: 'monospace',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#00d4ff',
            }}
          />
          <div style={{ fontSize: 28, letterSpacing: '0.15em' }}>
            <span style={{ color: '#9ca3af' }}>h</span>
            <span style={{ color: '#fff', fontWeight: 900 }}>AI</span>
            <span style={{ color: '#9ca3af' }}>qu</span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            marginBottom: 24,
          }}
        >
          How might{' '}
          <span style={{ color: '#00d4ff' }}>AI</span>
          {' '}accelerate
          <br />
          <span style={{ color: '#00ff88' }}>quantum</span>?
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 20, color: '#9ca3af', marginBottom: 32, maxWidth: 700 }}>
          AI agents replicate landmark quantum papers on real hardware through natural language.
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 40 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#00ff88' }}>93%</span>
            <span style={{ fontSize: 16, color: '#9ca3af' }}>claims pass</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#00d4ff' }}>6</span>
            <span style={{ fontSize: 16, color: '#9ca3af' }}>papers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#8b5cf6' }}>3</span>
            <span style={{ fontSize: 16, color: '#9ca3af' }}>chips</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#ff8c42' }}>0</span>
            <span style={{ fontSize: 16, color: '#9ca3af' }}>code by hand</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: 80,
            fontSize: 14,
            color: '#555',
          }}
        >
          TU Delft / QuTech — haiqu.org
        </div>
      </div>
    ),
    { ...size }
  )
}
