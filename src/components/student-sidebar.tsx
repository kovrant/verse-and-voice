"use client"

import {
  BookAudio,
  BookMarked,
  BookOpen,
  BookText,
  CreditCard,
  History,
  LayoutDashboard,
  Menu,
  ScrollText,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Brand } from "@/components/brand"
import { useLiveClass } from "@/components/live-class-provider"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/student/classes", label: "Classes", icon: History, exact: false },
  { href: "/student/memorization", label: "Memorization", icon: BookMarked, exact: false },
  { href: "/student/progress", label: "My Progress", icon: BookOpen, exact: false },
  { href: "/student/quran", label: "Quran", icon: BookText, exact: false },
  { href: "/student/history", label: "Islamic History", icon: ScrollText, exact: false },
  { href: "/student/fees", label: "Fees", icon: CreditCard, exact: false },
] as const

export function StudentSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { live } = useLiveClass()

  if (pathname === "/login") return null

  return (
    <>
      {/* Mobile toggle */}
      <button
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-card border border-border p-2.5 text-foreground shadow-soft lg:hidden"
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
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Header */}
        <div className="relative px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookAudio className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight text-foreground whitespace-nowrap">
                <Brand />
              </h1>
              <p className="text-[11px] text-muted-foreground tracking-wide whitespace-nowrap">
                Student Portal
              </p>
            </div>
          </div>

          <button
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-2">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                  strokeWidth={2}
                />
                <span className="whitespace-nowrap">{item.label}</span>
                {live && item.href === "/student/classes" && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
