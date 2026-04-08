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
  Upload,
  BookOpenCheck,
} from "lucide-react"
import { useState, memo } from "react"

const navSections = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/students", label: "Students", icon: Users },
      { href: "/class", label: "Class Session", icon: BookOpen },
      { href: "/memorization", label: "Memorization", icon: BookMarked },
      { href: "/quran", label: "Quran Paras", icon: BookOpenCheck },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/fees", label: "Fee Management", icon: CreditCard },
      { href: "/media", label: "Media Library", icon: Upload },
    ],
  },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-card border border-white/[0.06] p-2.5 text-foreground shadow-lg lg:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col border-r border-white/[0.04] bg-card lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Gold accent line at top */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Header */}
        <div className="relative overflow-hidden px-6 py-7">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/25 via-teal-900/15 to-transparent islamic-pattern opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

          {/* Content */}
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_16px_rgba(16,185,129,0.15)] ring-1 ring-white/10">
              <span className="text-xl text-white">&#1756;</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gradient-gold">
                Quran Academy
              </h1>
              <p className="text-[11px] text-muted-foreground/60 tracking-wider uppercase mt-0.5">Student Management</p>
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

        {/* Ornamental divider */}
        <div className="mx-5 ornament-divider py-1">
          <span className="text-amber-500/30 text-xs">&#10022;</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && (
                <p className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
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
                        "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15),0_0_12px_rgba(16,185,129,0.05)]"
                          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isActive ? "text-emerald-400" : "text-muted-foreground/60 group-hover:text-foreground"
                      )} />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mx-4 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/10">
              <span className="text-sm text-amber-400">&#9784;</span>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">PKT (UTC+5)</p>
              <p className="text-[10px] text-muted-foreground/50">Pakistan Standard Time</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
})
