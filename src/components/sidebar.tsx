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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useState, useEffect, memo, createContext, useContext } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSidebarVisibility } from "@/components/sidebar-visibility"

const COLLAPSED_KEY = "quran-academy-sidebar-collapsed"

// Context so layout can read collapsed state
const SidebarContext = createContext({ collapsed: false })
export const useSidebarState = () => useContext(SidebarContext)

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { visible, setVisible } = useSidebarVisibility()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY)
      if (saved === "true") setCollapsed(true)
    } catch {}
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, String(next))
  }

  const isExpanded = !collapsed

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      {/* Mobile toggle */}
      <button
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-card border border-white/[0.06] p-2.5 text-foreground shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Floating restore button — visible only when sidebar is hidden (e.g. live class) */}
      {!visible && (
        <button
          type="button"
          onClick={() => setVisible(true)}
          aria-label="Show sidebar"
          className="fixed top-4 left-4 z-50 hidden lg:flex items-center justify-center p-2.5 bg-card border border-[#E5DCC8] rounded-lg shadow-md hover:bg-[#F5EFE3] transition-colors"
        >
          <PanelLeftOpen className="h-5 w-5 text-primary" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.04] bg-card overflow-hidden",
          // Smooth transition
          "transition-all duration-300 ease-in-out",
          // Desktop: static positioning, variable width — visibility takes precedence over collapsed
          "lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0",
          !visible
            ? "lg:w-0 lg:opacity-0 lg:pointer-events-none"
            : collapsed
              ? "lg:w-[72px] lg:opacity-100"
              : "lg:w-72 lg:opacity-100",
          // Mobile: always w-72, slide in/out
          "w-72",
          mobileOpen && visible ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Gold accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Header */}
        <div className={cn(
          "relative overflow-hidden py-5 transition-all duration-300",
          collapsed ? "lg:px-3" : "px-6"
        )}>
          {/* Background decorations */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/25 via-teal-900/15 to-transparent islamic-pattern opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

          <div className={cn(
            "relative flex items-center transition-all duration-300",
            collapsed ? "lg:justify-center" : "gap-4"
          )}>
            <div className={cn(
              "flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-logo-glow ring-1 ring-white/10 flex-shrink-0 transition-all duration-300",
              collapsed ? "lg:h-10 lg:w-10 h-12 w-12" : "h-12 w-12"
            )}>
              <span className={cn("text-white transition-all duration-300", collapsed ? "lg:text-base text-xl" : "text-xl")}>&#1756;</span>
            </div>
            {/* Text — hidden when collapsed */}
            <div className={cn(
              "min-w-0 transition-all duration-300",
              collapsed ? "lg:hidden" : "block"
            )}>
              <h1 className="font-brand text-xl font-semibold tracking-tight text-primary whitespace-nowrap">
                Quran Academy
              </h1>
              <p className="text-[11px] text-muted-foreground/60 tracking-wider uppercase mt-0.5 whitespace-nowrap">Student Management</p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ornamental divider */}
        <div className={cn(
          "ornament-divider py-1 transition-all duration-300",
          collapsed ? "lg:mx-3" : "mx-5"
        )}>
          <span className="text-amber-500/30 text-xs">&#10022;</span>
        </div>

        {/* Nav */}
        <nav className={cn(
          "flex-1 py-2 space-y-1 overflow-y-auto overflow-x-hidden transition-all duration-300",
          collapsed ? "lg:px-2" : "px-3"
        )}>
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-5" : ""}>
              {/* Section label */}
              {section.label && (
                <div className={cn(
                  "pb-1.5 overflow-hidden transition-all duration-300",
                  collapsed ? "lg:px-0" : "px-4"
                )}>
                  {collapsed ? (
                    <div className="hidden lg:flex justify-center">
                      <div className="h-px w-6 bg-amber-500/40 my-1" />
                    </div>
                  ) : (
                    <div className="h-px w-full bg-amber-500/40 mb-2" />
                  )}
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap",
                    collapsed && "lg:hidden"
                  )}>
                    {section.label}
                  </p>
                </div>
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
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                        // Spacing
                        collapsed
                          ? "lg:justify-center lg:px-0 lg:py-2.5 lg:mx-0 gap-3 px-4 py-2.5"
                          : "gap-3 px-4 py-2.5",
                        // Colors
                        isActive
                          ? "bg-secondary/50 text-primary shadow-nav-active"
                          : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-[18px] w-[18px] transition-colors flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                      )} />
                      {/* Label — hidden when collapsed on desktop */}
                      <span className={cn(
                        "whitespace-nowrap transition-all duration-300",
                        collapsed ? "lg:hidden" : "block"
                      )}>{item.label}</span>
                      {/* Active dot */}
                      {isActive && isExpanded && (
                        <div className={cn(
                          "ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-dot-glow",
                          collapsed && "lg:hidden"
                        )} />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Theme toggle — hidden when collapsed */}
        <div className={cn(collapsed && "lg:hidden")}>
          <ThemeToggle />
        </div>

        {/* Clock — hidden when collapsed */}
        <div className={cn(collapsed && "lg:hidden")}>
          <SidebarClock />
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:block border-t border-white/[0.04]">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-full py-3.5 text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.03] transition-all"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  )
})

function SidebarClock() {
  const [time, setTime] = useState("")
  const [tzInfo, setTzInfo] = useState({ abbr: "", offset: "", name: "" })

  useEffect(() => {
    function update() {
      const now = new Date()
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }))
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offsetMin = -new Date().getTimezoneOffset()
    const sign = offsetMin >= 0 ? "+" : "-"
    const h = Math.floor(Math.abs(offsetMin) / 60)
    const m = Math.abs(offsetMin) % 60
    const offsetStr = `UTC${sign}${h}${m ? `:${m.toString().padStart(2, "0")}` : ""}`
    const short = tz.split("/").pop()?.replace(/_/g, " ") || tz
    setTzInfo({ abbr: offsetStr, offset: offsetStr, name: short })

    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <div className="mx-4 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/10">
          <span className="text-sm text-amber-400">&#9784;</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground tabular-nums">{time}</p>
          <p className="text-[10px] text-muted-foreground/50 truncate">{tzInfo.name} ({tzInfo.abbr})</p>
        </div>
      </div>
    </div>
  )
}
