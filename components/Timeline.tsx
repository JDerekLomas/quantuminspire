'use client'

import { motion } from 'framer-motion'

interface TimelineItem {
  month: number
  title: string
  description: string
  color: string
  status: 'complete' | 'active' | 'future'
}

const items: TimelineItem[] = [
  {
    month: 6,
    title: 'UX/UI v1 Release',
    description: 'Initial updated user experience and interface for quantum-inspire.com based on co-design research with stakeholders.',
    color: '#00d4ff',
    status: 'complete',
  },
  {
    month: 12,
    title: 'Control Software Stack v1',
    description: 'First version of the control software stack enabling tighter hardware-software integration.',
    color: '#8b5cf6',
    status: 'complete',
  },
  {
    month: 18,
    title: 'Publication 1',
    description: 'First scientific publication on accessible quantum interface design and user experience research.',
    color: '#00ff88',
    status: 'complete',
  },
  {
    month: 24,
    title: 'Automated Calibration + Qubit Scale-up',
    description: 'Fully automated characterization & calibration software. Updated QI stack with increased qubit count.',
    color: '#ff8c42',
    status: 'complete',
  },
  {
    month: 30,
    title: 'Publication 2',
    description: 'Second publication on iterative co-design methodologies for quantum computing interfaces.',
    color: '#00ff88',
    status: 'active',
  },
  {
    month: 36,
    title: 'UX/UI v2 Release',
    description: 'Major interface update incorporating validated design improvements and expanded user capabilities.',
    color: '#00d4ff',
    status: 'future',
  },
  {
    month: 42,
    title: 'Publication 3',
    description: 'Third publication measuring the impact of UX/UI improvements on non-specialist quantum algorithm development.',
    color: '#00ff88',
    status: 'future',
  },
  {
    month: 48,
    title: 'PhD Thesis + QML Stack v2',
    description: 'PhD thesis completion. Version 2 of hardware/software stack enabling quantum machine learning algorithms.',
    color: '#ff6b9d',
    status: 'future',
  },
]

export default function Timeline() {
  return (
    <div className="relative">
      {/* Central line */}
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#1e293b] to-transparent" />

      <div className="space-y-12 md:space-y-16">
        {items.map((item, i) => (
          <motion.div
            key={item.month}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            className={`relative flex items-start gap-6 md:gap-12 ${
              i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            {/* Dot */}
            <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  borderColor: item.color,
                  backgroundColor: item.status === 'complete' ? item.color : 'transparent',
                  boxShadow: item.status === 'active'
                    ? `0 0 12px ${item.color}40, 0 0 24px ${item.color}20`
                    : 'none',
                }}
              />
            </div>

            {/* Content */}
            <div className={`ml-16 md:ml-0 md:w-[calc(50%-3rem)] ${
              i % 2 === 0 ? 'md:text-right md:pr-8' : 'md:text-left md:pl-8'
            }`}>
              <span
                className="inline-block font-mono text-xs font-semibold tracking-widest uppercase mb-2"
                style={{ color: item.color }}
              >
                Month {item.month}
                {item.status === 'complete' && ' — Complete'}
                {item.status === 'active' && ' — In Progress'}
              </span>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
            </div>

            {/* Spacer for alternating layout */}
            <div className="hidden md:block md:w-[calc(50%-3rem)]" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
