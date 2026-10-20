import { Analytics } from "@vercel/analytics/next"
import Link from "next/link"

import { BrandLogo } from "@/components/brand-logo"

/**
 * Chrome for the public text pages (FAQ, privacy, terms): the landing page's
 * cream and sage, a slim header with the trial button, and a footer that links
 * every public page so crawlers can find them. Rendered outside the app shell
 * (AppShell returns children for the "(site)" segment).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FEF7EC] font-body text-[#2E3A2F] antialiased">
      <header className="sticky top-0 z-10 border-b border-[#E8DCC4] bg-[#FEF7EC]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 [font-family:var(--font-heading)] text-lg font-bold"
          >
            <BrandLogo className="h-9 w-9" />
            <span>Verse &amp; Voice</span>
          </Link>
          <Link
            href="/#ch10"
            className="rounded-full bg-[#6B7F5B] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#5A6C4C]"
          >
            Free trial
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10">{children}</main>
      <footer className="border-t border-[#E8DCC4]">
        <nav
          aria-label="Footer"
          className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-sm font-semibold"
        >
          <span className="mr-auto">© {new Date().getFullYear()} Verse &amp; Voice</span>
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <Link href="/login" className="hover:underline">
            Kids login
          </Link>
        </nav>
      </footer>
      <Analytics />
    </div>
  )
}
