import Link from 'next/link'
import Nav from '@/components/Nav'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts, categoryColors, categoryLabels } from '@/lib/blog'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: 'Not Found' }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: post.heroImage ? [post.heroImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.heroImage ? [post.heroImage] : [],
    },
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const allPosts = getAllPosts()
  const currentIndex = allPosts.findIndex(p => p.slug === post.slug)
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'haiqu — TU Delft' },
    url: `https://haiqu.org/blog/${post.slug}`,
    ...(post.heroImage && { image: post.heroImage }),
    keywords: post.tags.join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav section="blog" />

      {/* Hero */}
      <article className="pt-24 pb-20">
        {post.heroImage && (
          <div className="max-w-5xl mx-auto px-6 mb-8">
            <div className="rounded-xl overflow-hidden border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.heroImage}
                alt={post.heroCaption || post.title}
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>
            {post.heroCaption && (
              <p className="text-xs text-gray-600 font-mono mt-2 text-center">{post.heroCaption}</p>
            )}
          </div>
        )}

        <div className="max-w-3xl mx-auto px-6">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
              style={{
                color: categoryColors[post.category],
                borderColor: `${categoryColors[post.category]}30`,
              }}
            >
              {categoryLabels[post.category]}
            </span>
            <span className="text-xs font-mono text-gray-500">{post.date}</span>
            <span className="text-xs font-mono text-gray-600">{post.author}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 leading-tight">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">{post.subtitle}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-10">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-mono text-gray-500 px-2 py-0.5 rounded bg-white/5">
                {tag}
              </span>
            ))}
          </div>

          {/* Content */}
          <div
            className="prose-quantum"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Sources */}
          {post.sources.length > 0 && (
            <div className="mt-16 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-4">Sources & References</h3>
              <ul className="space-y-2">
                {post.sources.map((source) => (
                  <li key={source.url} className="text-sm">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00d4ff] hover:underline"
                    >
                      {source.label}
                    </a>
                    <span className="text-gray-600 text-xs font-mono ml-2 break-all">{source.url}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-12 flex justify-between gap-4">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="flex-1 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group"
              >
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">&larr; Previous</span>
                <div className="text-sm text-gray-300 group-hover:text-white mt-1 line-clamp-1">{prevPost.title}</div>
              </Link>
            ) : <div />}
            {nextPost ? (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="flex-1 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group text-right"
              >
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Next &rarr;</span>
                <div className="text-sm text-gray-300 group-hover:text-white mt-1 line-clamp-1">{nextPost.title}</div>
              </Link>
            ) : <div />}
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-mono">
            <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech
          </div>
          <div className="flex gap-4 text-xs text-gray-500 font-mono">
            <Link href="/blog" className="hover:text-white transition-colors">All Posts</Link>
            <Link href="/" className="hover:text-white transition-colors">Research Home</Link>
            <a href="https://github.com/JDerekLomas/quantuminspire" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </>
  )
}
