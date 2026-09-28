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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
