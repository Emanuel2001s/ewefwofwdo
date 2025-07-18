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
  serverExternalPackages: ["mysql2"],
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
console.log("NODE_ENV em next.config.mjs:", process.env.NODE_ENV);
console.log("Todas as env vars relacionadas a DB:", {
  SKIP_DB: process.env.SKIP_DB,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  NODE_ENV: process.env.NODE_ENV
});

export default nextConfig