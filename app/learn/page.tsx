import Link from 'next/link'
import Nav from '@/components/Nav'
import { CATEGORIES, GLOSSARY } from '@/content/learn/glossary'

export const metadata = {
  title: 'Quantum Computing Glossary',
  description: '40+ quantum computing terms with plain-English definitions, links to interactive tools, and connections to real experiment data.',
}

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find(c => c.id === category)
  if (!cat) return null
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
      style={{ color: cat.color, backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}25` }}
    >
      {cat.label}
    </span>
  )
}

export default function LearnPage() {
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    entries: GLOSSARY.filter(e => e.category === cat.id),
  }))

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Nav section="glossary" />

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-8 pt-12">
          <span className="font-mono text-xs text-[#8b5cf6] tracking-[0.2em] uppercase">Reference</span>
          <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4 tracking-tight leading-[0.95]">
            Glossary
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-4">
            40+ quantum computing terms with links to interactive tools and experiment data.
          </p>
          <p className="text-sm text-gray-500">
            Looking for interactive tools? <Link href="/explore" className="text-[#8b5cf6] hover:underline">Explore</Link>
          </p>
        </div>

        {/* Category jump links */}
        <div className="flex flex-wrap gap-2 mb-12 pb-8 border-b border-[#1e293b]">
          {CATEGORIES.map(cat => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:bg-white/5"
              style={{ borderColor: `${cat.color}30`, color: cat.color }}
            >
              {cat.label}
              <span className="text-gray-600 ml-1.5">
                {GLOSSARY.filter(e => e.category === cat.id).length}
              </span>
            </a>
          ))}
        </div>

        {/* Glossary entries by category */}
        {grouped.map(cat => (
          <section key={cat.id} id={cat.id} className="mb-16">
            <div className="flex items-center gap-3 mb-6 sticky top-14 bg-[#0a0a1a] py-3 z-10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <h2 className="text-xl font-bold text-white">{cat.label}</h2>
              <span className="text-gray-600 font-mono text-xs">{cat.entries.length} terms</span>
            </div>

            <div className="space-y-4">
              {cat.entries.map(entry => (
                <div
                  key={entry.term}
                  className="p-5 rounded-xl border border-[#1e293b] bg-[#111827]/20 hover:bg-[#111827]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-white font-semibold">{entry.term}</h3>
                    <div className="flex gap-2 shrink-0">
                      {entry.vizLink && (
                        <Link
                          href={entry.vizLink.href}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all hover:bg-[#8b5cf6]/10"
                          style={{ borderColor: '#8b5cf640', color: '#8b5cf6' }}
                        >
                          Try it: {entry.vizLink.label}
                        </Link>
                      )}
                      {entry.expLink && (
                        <Link
                          href={entry.expLink.href}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all hover:bg-[#00ff88]/10"
                          style={{ borderColor: '#00ff8840', color: '#00ff88' }}
                        >
                          Data: {entry.expLink.label}
                        </Link>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{entry.definition}</p>
                  {entry.related && entry.related.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-gray-600 text-xs">Related:</span>
                      {entry.related.map(r => (
                        <span key={r} className="text-gray-500 text-xs px-1.5 py-0.5 rounded bg-white/5">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/50 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono">
            haiqu — TU Delft / QuTech
          </p>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-[#00d4ff] transition-colors">Home</Link>
            <Link href="/experiments" className="hover:text-[#00ff88] transition-colors">Experiments</Link>
            <Link href="/gallery" className="hover:text-[#8b5cf6] transition-colors">Viz Gallery</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
