import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: '404 — Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="main-content" className="pt-32 pb-20 min-h-[60vh] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#ff6b9d] mb-4">
            404
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-4">
            Page not found
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            This page doesn&apos;t exist — it may have been moved or removed.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="text-xs font-mono px-4 py-2 rounded-lg border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all"
            >
              Research Home
            </Link>
            <Link
              href="/blog"
              className="text-xs font-mono px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              Blog
            </Link>
            <Link
              href="/replications"
              className="text-xs font-mono px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              Replications
            </Link>
            <Link
              href="/experiments"
              className="text-xs font-mono px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              Experiments
            </Link>
          </div>
        </div>
      </main>
      <Footer links={[{ href: '/', label: 'Home' }]} />
    </>
  )
}
