"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BookMarked,
  CreditCard,
  Menu,
  X,
  Moon,
} from "lucide-react"
import { useState, memo } from "react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/class", label: "Class Session", icon: BookOpen },
  { href: "/memorization", label: "Memorization", icon: BookMarked },
  { href: "/fees", label: "Fee Management", icon: CreditCard },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-card border border-border p-2.5 text-foreground shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col border-r border-border/50 bg-card lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Header with Islamic pattern */}
        <div className="relative overflow-hidden px-6 py-6">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-card islamic-pattern" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

          {/* Content */}
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg glow-sm-emerald">
              <span className="text-xl text-white">&#1756;</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gradient-gold">
                Quran Academy
              </h1>
              <p className="text-xs text-muted-foreground">Student Management</p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Decorative divider */}
        <div className="mx-4 flex items-center gap-2 py-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <Moon className="h-3 w-3 text-amber-500/40" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 glow-sm-emerald"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  isActive ? "text-emerald-400" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="mx-4 mb-4 rounded-xl bg-secondary/50 border border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <span className="text-sm text-amber-400">&#9784;</span>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">PKT (UTC+5)</p>
              <p className="text-[10px] text-muted-foreground">Pakistan Standard Time</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
})
