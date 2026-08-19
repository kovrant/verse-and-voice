"use client"

import {
  Bell,
  BookAudio,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  SpellCheck,
  Upload,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createContext, memo, useContext, useEffect, useState } from "react"

import { Brand } from "@/components/brand"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import { getHijriToday, ordinalDay } from "@/lib/hijri"
import { cn } from "@/lib/utils"

const COLLAPSED_KEY = "quran-academy-sidebar-collapsed"

// Context so layout can read collapsed state
const SidebarContext = createContext({ collapsed: false })
export const useSidebarState = () => useContext(SidebarContext)

const navSections = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/students", label: "Students", icon: Users },
      { href: "/class", label: "Class Session", icon: BookOpen },
      { href: "/memorization", label: "Memorization", icon: BookMarked },
      { href: "/quran", label: "Quran Paras", icon: BookOpenCheck },
      { href: "/qaida", label: "Qaida", icon: SpellCheck },
      { href: "/namaz", label: "Namaz", icon: Moon },
      { href: "/history", label: "Islamic History", icon: ScrollText },
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

  const hijri = getHijriToday()
  const hideOnCollapse = collapsed ? "lg:hidden" : ""

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
                "flex items-center justify-center rounded-xl text-primary-foreground flex-shrink-0 shadow-soft ring-1 ring-white/10 transition-all duration-300",
                collapsed ? "lg:h-9 lg:w-9 h-10 w-10" : "h-10 w-10",
              )}
              style={{
                background: "linear-gradient(135deg, hsl(var(--c-p-500)), hsl(var(--c-a-500)))",
              }}
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

        {/* Islamic month card → Islamic History.
            Don't copy the student --primary/--sage classes: admin has no --sage
            and inverts --primary in dark mode, which made this white-on-white. */}
        <Link
          href="/history"
          title={`${ordinalDay(hijri.day)} ${hijri.monthInfo.name} ${hijri.year} AH`}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "relative mb-2 flex items-center overflow-hidden bg-gradient-to-br from-[hsl(var(--c-p-900))] to-[hsl(var(--c-p-500))] px-5 py-3 text-white shadow-[0_8px_20px_-10px_hsl(var(--c-p-500)/0.55)]",
            collapsed ? "lg:justify-center lg:px-0" : "justify-start",
          )}
        >
          <span
            aria-hidden
            className="absolute -right-3.5 -top-5 h-20 w-20 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--c-a-500) / 0.45), transparent 70%)",
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
        <nav
          className={cn(
            "flex-1 py-2 space-y-1 overflow-y-auto overflow-x-hidden transition-all duration-300",
            collapsed ? "lg:px-2" : "px-3",
          )}
        >
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-2" : ""}>
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
                        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150",
                        collapsed
                          ? "lg:justify-center lg:px-0 lg:py-2.5 gap-3 px-3 py-2"
                          : "gap-3 px-3 py-2",
                        isActive
                          ? "bg-accent/10 text-accent font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5",
                      )}
                    >
                      {/* Active indicator bar */}
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent transition-opacity duration-200",
                          isActive ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] transition-colors flex-shrink-0",
                          isActive
                            ? "text-accent"
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
