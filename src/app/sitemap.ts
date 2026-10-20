import type { MetadataRoute } from "next"

import { PUBLIC_PAGES, SITE } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map(({ path, priority }) => ({
    url: `${SITE.url}${path === "/" ? "" : path}`,
    lastModified: SITE.updated,
    changeFrequency: "monthly",
    priority,
  }))
}
