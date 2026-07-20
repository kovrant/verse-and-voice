import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarVisibilityProvider } from "@/components/sidebar-visibility"
import { Toaster } from "sonner"

// Self-hosted fonts (via @fontsource, copied into ./fonts) so the app never
// depends on Google Fonts at build/dev time.
const fredoka = localFont({
  src: "./fonts/fredoka.woff2",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
})

const baloo = localFont({
  src: "./fonts/baloo-2.woff2",
  variable: "--font-baloo",
  weight: "400 800",
  display: "swap",
})

// Amiri (Quran variant) for Arabic text
const amiri = localFont({
  src: [
    { path: "./fonts/amiri-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-latin-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/amiri-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-amiri-quran",
  display: "swap",
})

export const metadata: Metadata = {
  title: "VerseandVoice",
  description: "A friendly Quran learning space for kids",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VerseandVoice",
  },
}

export const viewport: Viewport = {
  themeColor: "#FEF7EC",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${baloo.variable} ${amiri.variable} ${baloo.className}`}>
        {/* Set the portal palette (and admin dark mode) before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var portal=(p==='/login'||p==='/student'||p.indexOf('/student/')===0)?'student':'admin';var d=document.documentElement;d.setAttribute('data-portal',portal);if(portal==='admin'&&localStorage.getItem('qa-admin-dark')==='true'){d.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <ThemeProvider>
        <SidebarVisibilityProvider>
          <AppShell>{children}</AppShell>
        </SidebarVisibilityProvider>
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
              borderRadius: "var(--radius)",
            },
          }}
        />
      </body>
    </html>
  )
}
