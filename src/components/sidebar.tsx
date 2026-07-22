"use client"

import {
  BookAudio,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createContext, memo, useContext, useEffect, useState } from "react"

import { Brand } from "@/components/brand"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCurrentUser } from "@/lib/use-current-user"
import { cn } from "@/lib/utils"

const COLLAPSED_KEY = "quran-academy-sidebar-collapsed"

// Context so layout can read collapsed state
const SidebarContext = createContext({ collapsed: false })
export const useSidebarState = () => useContext(SidebarContext)

const navSections = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
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

  if (pathname === "/login" || pathname === "/admin") return null

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, String(next))
  }

  return (
    <SidebarContext.Provider value={{ collapsed }}>
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

      {/* Floating restore button — visible only when sidebar is hidden (e.g. live class) */}
      {!visible && (
        <button
          type="button"
          onClick={() => setVisible(true)}
          aria-label="Show sidebar"
          className="fixed top-4 left-4 z-50 hidden lg:flex items-center justify-center p-2.5 bg-card border border-border rounded-lg shadow-soft hover:bg-muted transition-colors"
        >
          <PanelLeftOpen className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card overflow-hidden",
          "transition-all duration-300 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0",
          !visible
            ? "lg:w-0 lg:opacity-0 lg:pointer-events-none"
            : collapsed
              ? "lg:w-[72px] lg:opacity-100"
              : "lg:w-64 lg:opacity-100",
          "w-64",
          mobileOpen && visible ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Header */}
        <div className={cn("py-5 transition-all duration-300", collapsed ? "lg:px-3" : "px-5")}>
          <div
            className={cn(
              "flex items-center transition-all duration-300",
              collapsed ? "lg:justify-center" : "gap-3",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0 transition-all duration-300",
                collapsed ? "lg:h-9 lg:w-9 h-10 w-10" : "h-10 w-10",
              )}
            >
              <BookAudio className="h-5 w-5" />
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-300",
                collapsed ? "lg:hidden" : "block",
              )}
            >
              <h1 className="text-[15px] font-semibold tracking-tight text-foreground whitespace-nowrap">
                <Brand />
              </h1>
              <p className="text-[11px] text-muted-foreground tracking-wide whitespace-nowrap">
                Admin
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav
          className={cn(
            "flex-1 py-2 space-y-1 overflow-y-auto overflow-x-hidden transition-all duration-300",
            collapsed ? "lg:px-2" : "px-3",
          )}
        >
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-6" : ""}>
              {section.label && (
                <div
                  className={cn(
                    "pb-1.5 transition-all duration-300",
                    collapsed ? "lg:px-0" : "px-3",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap",
                      collapsed && "lg:hidden",
                    )}
                  >
                    {section.label}
                  </p>
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-lg text-sm font-medium transition-colors duration-150",
                        collapsed
                          ? "lg:justify-center lg:px-0 lg:py-2.5 gap-3 px-3 py-2"
                          : "gap-3 px-3 py-2",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] transition-colors flex-shrink-0",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "whitespace-nowrap transition-all duration-300",
                          collapsed ? "lg:hidden" : "block",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Signed-in identity */}
        <SidebarIdentity collapsed={collapsed} />

        {/* Theme toggle — hidden when collapsed */}
        <div className={cn(collapsed && "lg:hidden")}>
          <ThemeToggle />
        </div>

        {/* Clock — hidden when collapsed */}
        <div className={cn(collapsed && "lg:hidden")}>
          <SidebarClock />
        </div>

        {/* Sign out */}
        <form
          action="/auth/signout?next=/admin"
          method="post"
          className={cn("border-t border-border", collapsed && "lg:flex lg:justify-center")}
        >
          <button
            type="submit"
            title="Sign out"
            className={cn(
              "flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              collapsed
                ? "lg:justify-center lg:w-12 lg:px-0 lg:py-2.5 w-full px-5 py-3"
                : "w-full px-5 py-3",
            )}
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            <span className={cn("whitespace-nowrap", collapsed ? "lg:hidden" : "block")}>
              Sign out
            </span>
          </button>
        </form>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:block border-t border-border">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-full py-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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

function SidebarIdentity({ collapsed }: { collapsed: boolean }) {
  const user = useCurrentUser()
  const label = user?.email || "—"
  const initial = (user?.email?.[0] || "?").toUpperCase()

  return (
    <div className={cn("mx-4 mt-1 mb-2", collapsed && "lg:mx-2 lg:flex lg:justify-center")}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-2.5 py-2",
          collapsed && "lg:justify-center lg:px-0 lg:h-9 lg:w-9 lg:gap-0",
        )}
        title={collapsed ? `${label} · Teacher` : undefined}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
          {initial}
        </div>
        <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
          <p className="text-xs font-medium text-foreground truncate">{label}</p>
          <p className="text-[10px] text-muted-foreground">Teacher</p>
        </div>
      </div>
    </div>
  )
}

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
    <div className="mx-4 mb-3 rounded-lg bg-muted/50 border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
          <span className="text-sm text-muted-foreground">&#9784;</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground tabular-nums">{time}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {tzInfo.name} ({tzInfo.abbr})
          </p>
        </div>
      </div>
    </div>
  )
}
