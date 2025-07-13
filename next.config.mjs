/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["mysql2"],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'mysql2']
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      dns: false,
      fs: false
    }
    return config
  }
}

console.log("SKIP_DB em next.config.mjs:", process.env.SKIP_DB);

export default nextConfig