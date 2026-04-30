import type { Metadata } from "next"
import { Reem_Kufi, Nunito, Amiri } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarVisibilityProvider } from "@/components/sidebar-visibility"
import { Toaster } from "sonner"

const reemKufi = Reem_Kufi({
  subsets: ["latin", "arabic"],
  variable: "--font-reem-kufi",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

// Amiri (Quran variant) for Arabic text
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  variable: "--font-amiri-quran",
  weight: ["400", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Quran Academy",
  description: "A friendly Quran learning space for kids",
  manifest: "/manifest.json",
  themeColor: "#FAF6EE",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quran Academy",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${reemKufi.variable} ${nunito.variable} ${amiri.variable} ${nunito.className}`}>
        <ThemeProvider>
        <SidebarVisibilityProvider>
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main
              className="flex-1 min-w-0 h-screen overflow-y-auto main-scroll"
              style={{ contain: "layout style" }}
            >
              {/* Layered ambient background */}
              <div className="fixed inset-0 pointer-events-none -z-10 bg-mesh-gradient" />
              <div className="fixed inset-0 islamic-pattern pointer-events-none opacity-50 dark:opacity-30 -z-10 [.light_&]:opacity-50" />
              {/* Subtle noise — only in dark for analog warmth */}
              <div className="fixed inset-0 pointer-events-none z-[9999] opacity-0 dark:opacity-[0.015] mix-blend-overlay" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
              }} />
              <div className="relative p-4 pt-16 lg:p-8 lg:pt-8">
                {children}
              </div>
            </main>
          </div>
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
