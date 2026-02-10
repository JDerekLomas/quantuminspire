import { BlogPost } from './blogTypes'
import { posts } from '@/content/blog/posts'

export const categoryColors: Record<string, string> = {
  landscape: '#00d4ff',
  experiment: '#00ff88',
  technical: '#8b5cf6',
  opinion: '#ff8c42',
}

export const categoryLabels: Record<string, string> = {
  landscape: 'Landscape',
  experiment: 'Experiment',
  technical: 'Technical',
  opinion: 'Opinion',
}

export { posts }

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date))
}
