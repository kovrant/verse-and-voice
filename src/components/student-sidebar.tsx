"use client"

import {
  Bell,
  BookAudio,
  BookMarked,
  BookOpen,
  BookText,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  SpellCheck,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Brand } from "@/components/brand"
import { useLiveClass } from "@/components/live-class-provider"
import { getHijriToday, ordinalDay } from "@/lib/hijri"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/student/notifications", label: "Notifications", icon: Bell, exact: false },
  { href: "/student/classes", label: "Classes", icon: History, exact: false, live: true },
  { href: "/student/memorization", label: "Memorization", icon: BookMarked, exact: false },
  { href: "/student/progress", label: "My Progress", icon: BookOpen, exact: false },
  { href: "/student/qaida", label: "Qaida", icon: SpellCheck, exact: false },
  { href: "/student/quran", label: "Quran", icon: BookText, exact: false },
  { href: "/student/history", label: "Islamic History", icon: ScrollText, exact: false },
  { href: "/student/fees", label: "Fees", icon: CreditCard, exact: false },
] as const

export function StudentSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { live } = useLiveClass()
  const { student, username } = useStudent()

  if (pathname === "/login") return null

  const hijri = getHijriToday()
  const initial = (student?.name?.[0] || username?.[0] || "?").toUpperCase()

  // `collapsed` only applies on desktop (lg+); the mobile drawer is always full.
  const hideOnCollapse = collapsed ? "lg:hidden" : ""

  return (
    <>
      {/* Mobile toggle */}
      <button
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2.5 text-foreground shadow-soft lg:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden bg-card",
          "border-r border-border transition-[transform,width] duration-300 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0",
          collapsed ? "lg:w-[76px]" : "lg:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Header / brand */}
        <div
          className={cn(
            "relative flex items-center gap-3 px-5 py-5",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookAudio className="h-[22px] w-[22px]" />
          </div>
          <div className={cn("min-w-0", hideOnCollapse)}>
            <h1 className="whitespace-nowrap font-heading text-[15px] font-bold tracking-tight text-foreground">
              <Brand />
            </h1>
            <p className="whitespace-nowrap text-[11px] tracking-wide text-muted-foreground">
              Student Portal
            </p>
          </div>

          <button
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Islamic month card → Islamic History */}
        <Link
          href="/student/history"
          title={`${ordinalDay(hijri.day)} ${hijri.monthInfo.name} ${hijri.year} AH`}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "relative mb-2 flex items-center overflow-hidden bg-gradient-to-br from-primary to-[hsl(var(--sage))] px-5 py-3 text-primary-foreground shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.6)]",
            collapsed ? "lg:justify-center lg:px-0" : "justify-start",
          )}
        >
          <span
            aria-hidden
            className="absolute -right-3.5 -top-5 h-20 w-20 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--gold) / 0.4), transparent 70%)",
            }}
          />
          <Moon className={cn("relative h-[22px] w-[22px]", collapsed ? "hidden lg:block" : "hidden")} />
          <span className={cn("relative", hideOnCollapse)}>
            <span className="font-heading text-[22px] font-bold leading-tight">
              {ordinalDay(hijri.day)} {hijri.monthInfo.name}
            </span>{" "}
            <span className="text-sm font-semibold opacity-80">{hijri.year} AH</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-2">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const isLive = live && "live" in item && item.live
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={item.label}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
                <span className={cn("whitespace-nowrap", hideOnCollapse)}>{item.label}</span>
                {isLive && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary",
                      isActive && "bg-white/20 text-primary-foreground",
                      hideOnCollapse,
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    LIVE
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer / user */}
        <div
          className={cn(
            "flex items-center gap-3 border-t border-border px-4 py-3.5",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl bg-secondary font-heading text-[17px] font-bold text-primary">
            {initial}
          </div>
          <div className={cn("min-w-0 flex-1", hideOnCollapse)}>
            <div className="truncate text-[13px] font-bold text-foreground">
              {student?.name || username || "Student"}
            </div>
            {username && <div className="text-[11px] text-muted-foreground">@{username}</div>}
          </div>
          <form action="/auth/signout?next=/login" method="post" className={hideOnCollapse}>
            <button
              type="submit"
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-[17px] w-[17px]" />
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
