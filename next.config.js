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
      {
        // Teacher-only audio recorder (middleware keeps students out). Later entries
        // override earlier ones for the same key, so this must stay last.
        source: "/namaz/audio",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
