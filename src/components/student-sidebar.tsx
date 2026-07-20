"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  CreditCard,
  History,
  Menu,
  X,
  BookAudio,
} from "lucide-react"

// Each item gets its own cheerful color for a friendly, playful nav.
const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true, tint: "coral" },
  { href: "/student/classes", label: "Classes", icon: History, exact: false, tint: "violet" },
  { href: "/student/memorization", label: "Memorization", icon: BookMarked, exact: false, tint: "sky" },
  { href: "/student/progress", label: "My Progress", icon: BookOpen, exact: false, tint: "mint" },
  { href: "/student/fees", label: "Fees", icon: CreditCard, exact: false, tint: "peach" },
] as const

const TINTS: Record<string, { chip: string; active: string; dot: string }> = {
  coral: { chip: "bg-primary/15 text-primary", active: "bg-primary/10 text-primary", dot: "bg-primary" },
  mint: { chip: "bg-emerald-400/20 text-emerald-600", active: "bg-emerald-400/15 text-emerald-600", dot: "bg-emerald-500" },
  sky: { chip: "bg-sky-400/20 text-sky-600", active: "bg-sky-400/15 text-sky-600", dot: "bg-sky-500" },
  violet: { chip: "bg-violet-400/20 text-violet-600", active: "bg-violet-400/15 text-violet-600", dot: "bg-violet-500" },
  peach: { chip: "bg-amber-400/25 text-amber-600", active: "bg-amber-400/15 text-amber-600", dot: "bg-amber-500" },
}

export function StudentSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (pathname === "/login") return null

  return (
    <>
      {/* Mobile toggle */}
      <button
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-2xl bg-card border border-border p-2.5 text-foreground shadow-soft lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-card overflow-hidden",
          "border-r border-border",
          "transition-transform duration-300 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0 lg:w-72",
          "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Playful gradient header */}
        <div
          className="relative overflow-hidden px-5 pb-6 pt-6"
          style={{ background: "linear-gradient(150deg, hsl(var(--c-a-400)), hsl(var(--primary)) 60%, hsl(var(--c-s-500)))" }}
        >
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25 ring-2 ring-white/40 backdrop-blur-sm flex-shrink-0">
              <BookAudio className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="font-brand text-lg font-bold text-white whitespace-nowrap drop-shadow-sm">
                VerseandVoice
              </h1>
              <p className="text-[11px] text-white/85 tracking-wide whitespace-nowrap">
                Student Portal
              </p>
            </div>
          </div>

          <button
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/20 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden px-3">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const tint = TINTS[item.tint]
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover-bounce",
                  isActive
                    ? cn(tint.active, "shadow-soft")
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-transform flex-shrink-0 group-hover:scale-105",
                    tint.chip
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
                {isActive && (
                  <span className={cn("ml-auto h-2 w-2 rounded-full", tint.dot)} />
                )}
              </Link>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
