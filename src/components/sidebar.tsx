"use client"

import {
  Bell,
  BookAudio,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  ChevronRight,
  Cpu,
  CreditCard,
  LayoutDashboard,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Sparkles,
  SpellCheck,
  Upload,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { memo, useEffect, useState } from "react"

import { Brand } from "@/components/brand"
import { BrandLogo } from "@/components/brand-logo"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import { getHijriToday, ordinalDay } from "@/lib/hijri"
import { cn } from "@/lib/utils"

const COLLAPSED_KEY = "quran-academy-sidebar-collapsed"

const navSections = [
  {
    label: "Main menu",
    items: [
      { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
      { href: "/teacher/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/teacher/students", label: "Students", icon: Users },
      { href: "/teacher/class", label: "Class Session", icon: BookOpen },
      { href: "/teacher/hadiths", label: "Hadiths", icon: BookAudio },
      { href: "/teacher/memorization", label: "Memorization", icon: BookMarked },
      { href: "/teacher/quran", label: "Quran Paras", icon: BookOpenCheck },
      { href: "/teacher/qaida", label: "Qaida", icon: SpellCheck },
      { href: "/teacher/namaz", label: "Namaz", icon: Moon },
      { href: "/teacher/history", label: "Islamic History", icon: ScrollText },
      { href: "/teacher/quizzes", label: "Quizzes", icon: Sparkles },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/teacher/fees", label: "Fee Management", icon: CreditCard },
      { href: "/teacher/media", label: "Media Library", icon: Upload },
      { href: "/teacher/ai-usage", label: "AI Usage", icon: Cpu },
    ],
  },
]

/**
 * Teacher sidebar, after NextAdmin Pro's: 270px, folds to a 72px icon rail
 * (remembered), section labels, neutral active pill. Below lg it is a drawer
 * opened from the top bar's menu button. Live class hides it entirely.
 */
export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { visible, setVisible, mobileOpen, setMobileOpen } = useSidebarVisibility()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY)
      if (saved === "true") setCollapsed(true)
    } catch {}
  }, [])

  if (pathname === "/login" || pathname === "/teacher/login") return null

  const hijri = getHijriToday()
  const close = () => setMobileOpen(false)

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next))
    } catch {}
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Floating restore button — visible only when sidebar is hidden (e.g. live class) */}
      {!visible && (
        <button
          type="button"
          onClick={() => setVisible(true)}
          aria-label="Show sidebar"
          className="fixed left-4 top-4 z-50 hidden size-10 items-center justify-center rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs transition-colors hover:bg-background-gray-primary lg:flex"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col overflow-hidden border-r border-card-border bg-card-surface-area",
          "transition-all duration-300 ease-in-out",
          "lg:static lg:z-auto lg:flex-shrink-0 lg:translate-x-0",
          !visible
            ? "lg:pointer-events-none lg:w-0 lg:border-r-0 lg:opacity-0"
            : collapsed
              ? "lg:w-[72px] lg:opacity-100"
              : "lg:w-[270px] lg:opacity-100",
          mobileOpen && visible ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ contain: "layout style paint" }}
      >
        {/* Header: logo + collapse toggle (stacked when collapsed) */}
        <div
          className={cn(
            "flex items-center px-4 pt-6",
            collapsed
              ? "justify-between lg:flex-col lg:justify-center lg:gap-4"
              : "justify-between",
          )}
        >
          <Link href="/teacher" onClick={close} className="flex min-w-0 items-center gap-2.5">
            <BrandLogo className="h-9 w-9 flex-shrink-0" />
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="block whitespace-nowrap text-base leading-5 text-text-primary">
                <Brand />
              </span>
              <span className="block text-xs leading-4 text-text-tertiary">Teacher</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden p-1.5 text-icon-tertiary transition-colors hover:text-text-secondary lg:block"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-icon-tertiary transition-colors hover:bg-background-gray-primary hover:text-text-primary lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav
          className={cn(
            "mt-3 flex-1 overflow-y-auto overflow-x-hidden pb-4",
            collapsed ? "px-4 lg:px-2" : "px-4",
          )}
        >
          {navSections.map((section) => (
            <div key={section.label}>
              <p
                className={cn(
                  "mb-3 mt-6 whitespace-nowrap text-xs uppercase text-text-tertiary",
                  collapsed && "lg:hidden",
                )}
              >
                {section.label}
              </p>
              {collapsed && (
                <span className="hidden items-center justify-center pb-3 pt-5 text-icon-secondary lg:flex">
                  <MoreHorizontal className="h-5 w-5" />
                </span>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/teacher"
                      ? pathname === "/teacher"
                      : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "lg:justify-center lg:py-2.5",
                        isActive
                          ? "bg-sidebar-navigation-nav-item-nav-hover-background text-text-primary"
                          : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 transition-colors",
                          isActive
                            ? "text-icon-primary"
                            : "text-icon-tertiary group-hover:text-icon-primary",
                        )}
                      />
                      <span className={cn("whitespace-nowrap", collapsed && "lg:hidden")}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: today's Islamic date → Islamic History (NextAdmin's footer card) */}
        <div className={cn("px-4 pb-4", collapsed && "lg:hidden")}>
          <Link
            href="/teacher/history"
            onClick={close}
            className="group block rounded-2xl bg-background-gray-primary px-4 py-4 transition-colors hover:bg-background-gray-tertiary"
          >
            <span className="flex items-center gap-2 text-xs uppercase text-text-tertiary">
              <Moon className="h-3.5 w-3.5" />
              Islamic date
            </span>
            <span className="mt-1.5 block whitespace-nowrap font-semibold leading-6 text-text-primary">
              {ordinalDay(hijri.day)} {hijri.monthInfo.name}
            </span>
            <span className="flex items-center justify-between text-sm text-text-tertiary">
              {hijri.year} AH
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </aside>
    </>
  )
})
