import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { getAllPosts, categoryColors, categoryLabels } from '@/lib/blog'

export const metadata = {
  title: 'Research Blog',
  description: 'Research notes, experiment reports, and landscape analysis from the haiqu project at TU Delft.',
  alternates: {
    canonical: '/blog',
  },
}

export default function BlogIndex() {
  const allPosts = getAllPosts()
  const pinned = allPosts.filter(p => p.pinned)
  const feed = allPosts.filter(p => !p.pinned)

  return (
    <>
      <Nav section="blog" />

      {/* Header */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Research Blog
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Can AI agents systematically replicate quantum computing experiments?
            We're finding out — running the same algorithms across four backends,
            testing every error mitigation technique we can find, and publishing everything.
          </p>
        </div>
      </section>

      {/* Pinned — Start Here */}
      {pinned.length > 0 && (
        <section className="px-6 pb-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              <span className="text-xs font-mono uppercase tracking-widest text-gray-500">Start here</span>
              <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
            </div>
            <p className="text-sm text-gray-500 text-center mb-6 max-w-xl mx-auto">
              The context for our empirical work: why AI-accelerated science matters, which papers define the field, and the data behind the hype.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {pinned.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group p-5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
                >
                  <span
                    className="inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border mb-3"
                    style={{
                      color: categoryColors[post.category],
                      borderColor: `${categoryColors[post.category]}30`,
                    }}
                  >
                    {categoryLabels[post.category]}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:underline leading-snug mb-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                    {post.subtitle || post.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Experiment Feed */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            <span className="text-xs font-mono uppercase tracking-widest text-gray-500">Lab notebook</span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
          </div>
          <div className="space-y-6">
          {feed.map((post) => (
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
        </div>
      </section>

      <Footer links={[{ href: '/', label: 'Research Home' }]} />
    </>
  )
}
