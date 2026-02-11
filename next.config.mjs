/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  async redirects() {
    return [
      { source: '/sonification', destination: '/listen', permanent: true },
    ]
  },
}

export default nextConfig
