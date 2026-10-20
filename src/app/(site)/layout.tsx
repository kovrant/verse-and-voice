import { Analytics } from "@vercel/analytics/next"

import { CHROME_CSS, SiteFooter, SiteHeader } from "@/components/welcome/site-chrome"
import { BODY } from "@/components/welcome/welcome-styles"

/**
 * Chrome for the public text pages (FAQ, privacy, terms): the landing page's own
 * header and night footer around a cream page. Links that point into the
 * landing page (trial, contact) go to "/#ch10". Rendered outside the app shell
 * (AppShell returns children for the "(site)" segment).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="vvw flex min-h-screen flex-col bg-[#FEF7EC] text-[#2E3A2F] antialiased"
      style={{ fontFamily: BODY }}
    >
      <style dangerouslySetInnerHTML={{ __html: CHROME_CSS }} />
      <SiteHeader home="/" trial="/#ch10" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-10">{children}</main>
      <div style={{ background: "#121612" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(16px,3vw,32px)" }}>
          <SiteFooter contact="/#ch10" />
        </div>
      </div>
      <Analytics />
    </div>
  )
}
