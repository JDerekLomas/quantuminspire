'use client'

import { motion } from 'framer-motion'

const stakeholders = [
  {
    name: 'TUD-IDE',
    full: 'TU Delft — Industrial Design Engineering',
    role: 'UX research, co-design methodology, iterative validation',
    color: '#00d4ff',
    position: 'top-left',
  },
  {
    name: 'THUAS',
    full: 'The Hague University of Applied Sciences',
    role: 'Applied UX design, accessibility standards, user testing',
    color: '#8b5cf6',
    position: 'top-right',
  },
  {
    name: 'TNO-QuTech',
    full: 'QuTech / TNO',
    role: 'Quantum hardware integration, platform architecture, API design',
    color: '#00ff88',
    position: 'bottom-center',
  },
]

const connections = [
  { label: 'WP5.1', desc: 'User Needs', color: '#ff8c42' },
  { label: 'WP5.2', desc: 'Use Cases', color: '#ff6b9d' },
]

export default function StakeholderMap() {
  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Central node */}
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative mx-auto w-40 h-40 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
          border: '1px solid rgba(0,212,255,0.2)',
        }}
      >
        <div className="text-center">
          <div className="font-mono text-xs text-[#00d4ff] tracking-widest">WP4.4</div>
          <div className="text-white font-semibold text-sm mt-1">UX/UI<br/>Redesign</div>
        </div>
      </motion.div>

      {/* Stakeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {stakeholders.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            className="relative p-5 rounded-xl border bg-[#111827]/50 backdrop-blur-sm"
            style={{ borderColor: `${s.color}20` }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${s.color}40, transparent)` }}
            />
            <span className="font-mono text-xs font-bold tracking-widest" style={{ color: s.color }}>
              {s.name}
            </span>
            <h4 className="text-white text-sm font-medium mt-2">{s.full}</h4>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">{s.role}</p>
          </motion.div>
        ))}
      </div>

      {/* Input connections */}
      <div className="flex justify-center gap-8 mt-10">
        {connections.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            <div>
              <span className="font-mono text-xs font-bold" style={{ color: c.color }}>
                {c.label}
              </span>
              <span className="text-gray-500 text-xs ml-2">{c.desc}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
