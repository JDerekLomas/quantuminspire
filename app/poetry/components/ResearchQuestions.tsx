'use client'

import { useInView, C } from '../lib/helpers'
import { QUESTIONS } from '../data/framework'

export default function ResearchQuestions() {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} className="px-4 sm:px-6 py-20">
      <div className={`max-w-3xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <h2 className="text-2xl font-bold text-gray-200 mb-10">Key Research Questions</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="bg-[#0a0f1a] rounded-lg border border-[#1e293b] p-5">
              <span className="text-xs font-mono block mb-2" style={{ color: C.blue + '80' }}>Q{i + 1}</span>
              <p className="text-sm text-gray-400 leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
