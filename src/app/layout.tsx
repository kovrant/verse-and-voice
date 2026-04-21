import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Quran Academy",
  description: "Student management dashboard for Quran Academy",
  manifest: "/manifest.json",
  themeColor: "#0f1729",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quran Academy",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${inter.className}`}>
        <ThemeProvider>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main
              className="flex-1 min-w-0 overflow-auto"
              style={{ contain: "layout style" }}
            >
              {/* Layered premium background */}
              {/* Layer 1: Mesh gradient — themed ambient glows */}
              <div className="fixed inset-0 pointer-events-none -z-10 bg-mesh-gradient" />
              {/* Layer 2: Islamic pattern */}
              <div className="fixed inset-0 islamic-pattern-gold pointer-events-none opacity-40 -z-10" />
              {/* Layer 3: Noise texture for analog warmth */}
              <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.015] mix-blend-overlay" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
              }} />
              <div className="relative p-4 pt-16 lg:p-8 lg:pt-8">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(222 40% 13%)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "hsl(40 20% 92%)",
            },
          }}
        />
      </body>
    </html>
  )
}
