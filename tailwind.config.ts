import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        quantum: {
          bg: '#0a0a1a',
          card: '#111827',
          border: '#1e293b',
          accent: '#00d4ff',
          purple: '#8b5cf6',
          green: '#00ff88',
          pink: '#ff6b9d',
          orange: '#ff8c42',
        }
      }
    },
  },
  plugins: [],
}

export default config
