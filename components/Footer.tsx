import Link from 'next/link'

type FooterLink = {
  href: string
  label: string
  hoverColor?: string
}

export default function Footer({
  maxWidth = 'max-w-4xl',
  links = [],
  showYear = false,
}: {
  maxWidth?: string
  links?: FooterLink[]
  showYear?: boolean
}) {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className={`${maxWidth} mx-auto flex flex-col sm:flex-row items-center justify-between gap-4`}>
        <div className="text-xs text-gray-500 font-mono">
          <span className="text-gray-400">h</span>AI<span className="text-gray-400">qu</span> &mdash; TU Delft / QuTech{showYear && <> &mdash; 2026</>}
        </div>
        <div className="flex gap-4 text-xs text-gray-500 font-mono">
          {links.map((link) =>
            link.href.startsWith('http') ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${link.hoverColor || 'hover:text-white'} transition-colors`}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`${link.hoverColor || 'hover:text-white'} transition-colors`}
              >
                {link.label}
              </Link>
            )
          )}
          <a
            href="https://github.com/JDerekLomas/quantuminspire"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
