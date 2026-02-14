'use client'

import { useInView, C } from '../lib/helpers'
import { PHASES } from '../data/framework'

export default function Roadmap() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-10">Research Roadmap</h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#1e293b]" />

          <div className="space-y-10">
            {PHASES.map((phase, pi) => {
              const doneCount = phase.items.filter(i => i.done).length
              const allDone = doneCount === phase.items.length
              return (
                <div key={pi} className="relative pl-10">
                  {/* Dot */}
                  <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: allDone ? C.tenderness : '#334155',
                      backgroundColor: allDone ? C.tenderness + '20' : 'transparent',
                    }}>
                    {allDone && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={C.tenderness} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-gray-300 mb-3">{phase.label}</h3>
                  <div className="space-y-2">
                    {phase.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-3">
                        {item.done ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                            <path d="M3 7l3 3 5-5" stroke={C.tenderness} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
                          </div>
                        )}
                        <span className={`text-sm ${item.done ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
