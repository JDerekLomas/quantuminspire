export interface BlogPost {
  slug: string
  title: string
  subtitle?: string
  date: string
  author: string
  category: 'landscape' | 'experiment' | 'technical' | 'opinion'
  tags: string[]
  heroImage?: string
  heroCaption?: string
  excerpt: string
  content: string // markdown-ish HTML content
  sources: { label: string; url: string }[]
  pinned?: boolean
}
