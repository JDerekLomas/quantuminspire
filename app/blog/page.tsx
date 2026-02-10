import Link from 'next/link'
import { getAllPosts, categoryColors, categoryLabels } from '@/lib/blog'

export const metadata = {
  title: 'Research Blog',
  description: 'Research notes, experiment reports, and landscape analysis from the AI x Quantum project at TU Delft.',
  alternates: {
    canonical: '/blog',
  },
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="font-mono font-bold text-white tracking-wider text-sm">AI x Quantum</span>
            </Link>
            <span className="text-gray-600 font-mono">/</span>
            <span className="text-sm font-mono text-gray-400">blog</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-gray-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Research Blog
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Notes from the frontier of AI-accelerated quantum computing research.
            Experiment reports, landscape analysis, and technical deep-dives.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
                  style={{
                    color: categoryColors[post.category],
                    borderColor: `${categoryColors[post.category]}30`,
                  }}
                >
                  {categoryLabels[post.category]}
                </span>
                <span className="text-[10px] font-mono text-gray-600">{post.date}</span>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:underline mb-1">
                {post.title}
              </h2>
              {post.subtitle && (
                <p className="text-sm text-gray-400 mb-3">{post.subtitle}</p>
              )}
              <p className="text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] font-mono text-gray-600 px-2 py-0.5 rounded bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-mono">
            TU Delft / QuTech / Quantum Inspire
          </div>
          <div className="flex gap-4 text-xs text-gray-500 font-mono">
            <Link href="/" className="hover:text-white transition-colors">Research Home</Link>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </>
  )
}
