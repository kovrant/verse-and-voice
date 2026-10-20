---
type: architecture
title: "SEO, GEO and the Public Text Pages"
description: "How versenvoice.com is made findable: shared site facts, metadata, sitemap/robots/llms.txt, JSON-LD, the OG card, noindex on the portals, Vercel Web Analytics, and the /faq, /privacy and /terms pages."
status: stable
verified: true
sources:
  - "src/lib/site.ts"
  - "src/app/layout.tsx"
  - "src/app/robots.ts"
  - "src/app/sitemap.ts"
  - "src/app/opengraph-image.tsx"
  - "public/llms.txt"
  - "src/app/welcome/page.tsx"
  - "src/app/(site)/layout.tsx"
  - "src/components/welcome/site-chrome.tsx"
  - "src/app/(site)/prose.tsx"
  - "src/app/(site)/faq/page.tsx"
  - "src/app/(site)/privacy/page.tsx"
  - "src/app/(site)/terms/page.tsx"
  - "src/middleware.ts"
  - "next.config.js"
tags:
  - seo
  - marketing
  - landing
  - analytics
  - legal
---

# SEO, GEO and the Public Text Pages

The public website is `/` (the [welcome page](public-welcome-page.md)) plus three text pages in the `src/app/(site)` route group: `/faq`, `/privacy`, `/terms`. Everything else is a private portal and is kept out of search.

## Single source of facts

`src/lib/site.ts` holds `SITE` (URL, name, title, description, phone, social links, countries served, last-updated date), `PUBLIC_PAGES` (drives the sitemap) and `COURSES` (drives Course JSON-LD). **Every claim there is quoted by search engines and AI answers, so it must be true.** The FAQ answers in `faq/page.tsx` are also emitted verbatim as `FAQPage` JSON-LD, and `public/llms.txt` restates the key facts for AI crawlers; change all three together.

## What serves what

| URL | Source | Notes |
|---|---|---|
| `/robots.txt` | `app/robots.ts` | Allows everything except `/api/` and `/auth/`; AI crawlers are allowed on purpose (GEO). |
| `/sitemap.xml` | `app/sitemap.ts` | Built from `PUBLIC_PAGES`; `lastModified` is `SITE.updated`. |
| `/llms.txt` | `public/llms.txt` | Plain-language summary for LLM crawlers. |
| `/opengraph-image` | `app/opengraph-image.tsx` | 1200×630 link-preview card for WhatsApp/Facebook/search, inherited by every route. |
| `/` | `welcome/page.tsx` | Canonical `/` (the page is also reachable at `/welcome`), `EducationalOrganization` + `WebSite` + `Course` JSON-LD. |
| `/faq` `/privacy` `/terms` | `(site)/*` | `(site)/layout.tsx` wraps them in the landing page's own `SiteHeader` / `SiteFooter` (see below); prose wrapper `SitePage` in `(site)/prose.tsx`. |

Root `metadata` in `app/layout.tsx` sets `metadataBase`, the `%s | Verse & Voice` title template, Open Graph/Twitter defaults, and Search Console / Bing verification from `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION`.

## One header and footer for every public page

`src/components/welcome/site-chrome.tsx` owns `SiteHeader`, `SiteFooter`, `Logo`, `SunrisePill` and `CHROME_CSS`. The landing page passes `home="#ch1"`, `trial="#ch10"`, its age toggle as `middle` and its scroll progress line as children; the text pages pass `home="/"` and `trial`/`contact` = `"/#ch10"`. Both need a `.vvw` ancestor and `CHROME_CSS` on the page. On phones the landing page hides the header's trial button (its hero has one); the text pages keep it.

## Invariants

1. **Crawler files bypass middleware.** The middleware matcher excludes `.txt`, `.xml` and `opengraph-image`; before this, `/robots.txt` and `/sitemap.xml` were 307-redirected to `/login`.
2. **A new public page** must be added to `PUBLIC_PATHS` in `src/middleware.ts`, `SITE_PAGES` in `theme-provider.tsx`, the layout's first-paint script, and `PUBLIC_PAGES` in `site.ts`. Pages inside `(site)` get no app shell because `AppShell` returns children for the `(site)` segment.
3. **Portals are noindexed by header**, not robots.txt: `next.config.js` sends `X-Robots-Tag: noindex, nofollow` on `/login`, `/student/**` and `/teacher/**`, so Google can still see the noindex.
4. **Analytics** is Vercel Web Analytics (`@vercel/analytics`), cookie-free, mounted only on the public pages (welcome page and `(site)` layout), never in the portals. It must be enabled once in the Vercel dashboard (Project → Analytics). Cookie-free is why there is no cookie banner; adding GA4 or a Meta pixel would need a consent banner for UK/EU visitors.
5. **Heading font on these pages** uses `[font-family:var(--font-heading)]` or a plain `h1`/`h2`. The Tailwind `font-heading` utility is currently invalid CSS (unquoted `Baloo 2` in `tailwind.config`), see [Known Issues](../operations/known-issues.md).
