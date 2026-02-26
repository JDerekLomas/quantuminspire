/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  async redirects() {
    return [
      { source: '/listen', destination: '/sonification', permanent: true },
    ]
  },
}

export default nextConfig
