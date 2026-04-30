/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist references Node's optional `canvas` module for server-side
    // rendering; we only use it client-side, so stub it out.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }
    return config
  },
}

module.exports = nextConfig
