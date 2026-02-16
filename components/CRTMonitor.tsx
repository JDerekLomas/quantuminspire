export default function CRTMonitor({ children, label, rightLabel }: { children: React.ReactNode; label: string; rightLabel?: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden" style={{
      background: '#0a0a0a',
      boxShadow: '0 0 30px rgba(0,180,255,0.06), inset 0 0 60px rgba(0,0,0,0.8)',
      border: '2px solid #1a1a2a',
    }}>
      {/* Bezel top with labels */}
      <div className="px-4 py-2 flex items-center justify-between" style={{
        background: 'linear-gradient(180deg, #1a1a2a 0%, #111118 100%)',
        borderBottom: '1px solid #222233',
      }}>
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</span>
        {rightLabel && <span className="text-[10px] font-mono text-gray-600">{rightLabel}</span>}
      </div>

      {/* Screen area with CRT effects */}
      <div className="relative">
        {children}

        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          mixBlendMode: 'multiply',
        }} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)',
        }} />

        {/* Subtle screen flicker */}
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{
          background: 'rgba(0,200,255,0.008)',
          animationDuration: '4s',
        }} />

        {/* Screen curvature highlight */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 120% 80% at 30% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)',
        }} />
      </div>

      {/* Bezel bottom */}
      <div className="h-2" style={{
        background: 'linear-gradient(0deg, #1a1a2a 0%, #111118 100%)',
        borderTop: '1px solid #0a0a14',
      }} />
    </div>
  )
}
