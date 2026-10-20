import type { MetadataRoute } from "next"

import { SITE } from "@/lib/site"

/** Everyone, AI answer engines included, may read the public site; the portals are noindexed by header. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
