import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Quran Academy",
  description: "Student management dashboard for Quran Academy",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main
            className="flex-1 min-w-0 overflow-auto"
            style={{ contain: "layout style" }}
          >
            {/* Subtle background pattern */}
            <div className="fixed inset-0 islamic-pattern-gold pointer-events-none opacity-30 -z-10" />
            <div className="relative p-4 pt-16 lg:p-8 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
