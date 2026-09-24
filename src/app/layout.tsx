import "./globals.css"
import "goey-toast/styles.css"

import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"

import { AppShell } from "@/components/app-shell"
import { GoeyToasterHost } from "@/components/goey-toaster"
import { SidebarVisibilityProvider } from "@/components/sidebar-visibility"
import { ThemeProvider } from "@/components/theme-provider"

// Self-hosted fonts (via @fontsource, copied into ./fonts) so the app never
// depends on Google Fonts at build/dev time.

// Baloo 2 — headings & brand (rounded, warm). Variable weight, single file.
const heading = localFont({
  src: "./fonts/baloo-2.woff2",
  variable: "--font-heading",
  weight: "500 700",
  display: "swap",
})

// Nunito Sans — body & UI (soft, readable). Variable weight, single file.
const body = localFont({
  src: "./fonts/nunito-sans.woff2",
  variable: "--font-body",
  weight: "400 700",
  display: "swap",
})

// Scheherazade New — the primary Quranic/Arabic face (first in every Arabic
// stack). Arabic subset only: Latin falls through to the next family.
const scheherazade = localFont({
  src: [
    { path: "./fonts/scheherazade-new-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/scheherazade-new-arabic-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/scheherazade-new-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-scheherazade",
  display: "swap",
})

// Noto Naskh Arabic — fallback Naskh. Arabic subset only.
const naskh = localFont({
  src: [
    { path: "./fonts/noto-naskh-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-naskh-arabic-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-naskh-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-naskh",
  display: "swap",
})

// Amiri — classical Naskh, and the only Arabic face that also carries Latin.
const arabic = localFont({
  src: [
    { path: "./fonts/amiri-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-latin-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/amiri-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Verse & Voice",
  description: "A friendly Quran learning space for kids",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Verse & Voice",
  },
}

export const viewport: Viewport = {
  themeColor: "#FEF7EC",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable} ${scheherazade.variable} ${naskh.variable} ${arabic.variable} ${body.className}`}>
        {/* Set the portal palette (and admin dark mode) before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var portal=(p==='/login'||p==='/student'||p.indexOf('/student/')===0)?'student':'admin';var d=document.documentElement;d.setAttribute('data-portal',portal);if(localStorage.getItem('qa-dark')==='true'){d.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <ThemeProvider>
          <SidebarVisibilityProvider>
            <AppShell>{children}</AppShell>
          </SidebarVisibilityProvider>
          <GoeyToasterHost />
        </ThemeProvider>
      </body>
    </html>
  )
}
