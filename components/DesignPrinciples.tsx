'use client'

import { motion } from 'framer-motion'
import ScrollReveal from './ScrollReveal'

const principles = [
  {
    number: '01',
    title: 'Accessible by Default',
    description: 'Non-quantum specialists can write and execute quantum algorithms without prior expertise. The interface scaffolds learning through progressive disclosure.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013.79 15.96l1.444-3.248A6.001 6.001 0 0112 9c2.06 0 3.88 1.038 4.964 2.617M12 3a3 3 0 100 6 3 3 0 000-6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#00d4ff',
  },
  {
    number: '02',
    title: 'Co-designed with Stakeholders',
    description: 'Iterative design with societal, educational, and industrial partners. Real users shape every decision through participatory research methods.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#8b5cf6',
  },
  {
    number: '03',
    title: 'Validated Through Measurement',
    description: 'Every UX improvement is measured for impact. From task completion rates to user satisfaction, design decisions are evidence-based.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#00ff88',
  },
  {
    number: '04',
    title: 'Societal Awareness',
    description: 'Beyond usability — the redesign aims to increase public understanding of quantum computing and its transformative potential.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#ff8c42',
  },
]

export default function DesignPrinciples() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {principles.map((p, i) => (
        <ScrollReveal key={p.number} delay={i * 0.1}>
          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="group relative p-6 rounded-xl border border-[#1e293b] bg-[#111827]/30 backdrop-blur-sm hover:border-opacity-50 transition-all duration-300"
            style={{ ['--hover-color' as string]: p.color }}
          >
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(circle at 50% 0%, ${p.color}08, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <span className="font-mono text-xs text-gray-600 tracking-widest">{p.number}</span>
                <div style={{ color: p.color }}>{p.icon}</div>
              </div>
              <h3 className="text-white font-semibold text-lg mb-3">{p.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{p.description}</p>
            </div>
          </motion.div>
        </ScrollReveal>
      ))}
    </div>
  )
}
