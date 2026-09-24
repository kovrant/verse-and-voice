"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { CSSProperties, ReactNode } from "react"

import { useAchievementCelebrations } from "@/components/achievement-celebration-provider"
import { BrandLogo } from "@/components/brand-logo"
import { QaidaLettersIcon } from "@/components/kid-ui"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import {
  isPathActive,
  type KidColor,
  ME_PATHS,
  readDestination,
  useIsQaida,
} from "@/components/student-nav"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

/**
 * Student navigation: five big labelled tabs, always visible. A bottom tab bar
 * below lg (phones, tablets) and a slim left rail on desktop — never hidden
 * behind a menu button, since kids rarely discover hidden navigation. Everything
 * else is reached from the home cards or the "Me" page.
 */
export function StudentTabBar() {
  const pathname = usePathname()
  const { visible } = useSidebarVisibility()
  const { student } = useStudent()
  const isQaida = useIsQaida(student?.id)
  const { hasUnseen: hasUnseenTrophies } = useAchievementCelebrations()

  // Hidden during a live class (StudentLiveClass flips `visible` off).
  if (!visible) return null

  const read = readDestination(isQaida)
  // Every tab has its section's crayon colour (same as its home card) and an
  // emoji, like the cards. The active one gets a stronger tile + a ring.
  const tabs: {
    href: string
    label: string
    art: ReactNode
    active: boolean
    color: KidColor
    dot?: boolean
  }[] = [
    { href: "/student", label: "Home", art: "🏠", active: pathname === "/student", color: "teal" },
    {
      href: read.href,
      label: read.label,
      art: isQaida ? <QaidaLettersIcon className="text-[17px] lg:text-[20px]" /> : "📖",
      // Quran and Qaida share the one "read" tab.
      active: isPathActive(pathname, "/student/quran") || isPathActive(pathname, "/student/qaida"),
      color: "sage",
    },
    {
      href: "/student/quizzes",
      label: "Quizzes",
      art: "✨",
      active: isPathActive(pathname, "/student/quizzes"),
      color: "coral",
    },
    {
      href: "/student/achievements",
      label: "Trophies",
      art: "🏆",
      active: isPathActive(pathname, "/student/achievements"),
      color: "saffron",
      dot: hasUnseenTrophies,
    },
    {
      href: "/student/me",
      label: "Me",
      art: "🎒",
      active: ME_PATHS.some((p) => isPathActive(pathname, p)),
      color: "sky",
    },
  ]

  return (
    <nav
      aria-label="Main"
      className={cn(
        // Phones / tablets: floating bar above the bottom edge.
        "fixed inset-x-3 bottom-3 z-40 flex rounded-[28px] border-[1.5px] border-border bg-card/90 px-1.5 py-1.5 backdrop-blur-md",
        "shadow-soft-lg",
        "mb-[env(safe-area-inset-bottom)]",
        // Desktop: floating rail card on the left.
        "lg:static lg:z-auto lg:my-4 lg:ml-4 lg:w-[100px] lg:flex-shrink-0 lg:flex-col lg:items-center lg:gap-1.5 lg:rounded-[32px] lg:px-2 lg:py-4",
      )}
    >
      <Link
        href="/student"
        aria-label="Home"
        className="mb-3 hidden rounded-[22px] transition-transform hover:-rotate-6 hover:scale-105 lg:block"
      >
        <BrandLogo animated className="h-[68px] w-[68px]" />
      </Link>

      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "group relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] py-1.5 text-[12px] transition-colors",
            "lg:w-full lg:flex-none lg:py-2.5",
            tab.active
              ? "font-extrabold text-foreground"
              : "font-bold text-muted-foreground hover:text-foreground",
          )}
          // Every tab has the same shape (tile + label); the active one only gets a
          // stronger tile, a bold label and a dot — no box around the whole tab.
          style={{ "--kid": `var(--kid-${tab.color})` } as CSSProperties}
        >
          <span
            className={cn(
              "relative flex h-10 w-12 items-center justify-center rounded-[16px] text-[22px] transition-transform lg:h-12 lg:w-14 lg:text-[26px]",
              "group-hover:-rotate-6 group-hover:scale-105",
              tab.active
                ? "bg-[hsl(var(--kid)/0.55)] shadow-soft ring-2 ring-[hsl(var(--kid)/0.35)] ring-offset-2 ring-offset-card"
                : "bg-[hsl(var(--kid)/0.2)]",
            )}
            aria-hidden
          >
            {tab.art}
            {tab.dot && (
              <span
                className="absolute -right-1 -top-1 h-3 w-3 animate-float rounded-full bg-accent ring-2 ring-card"
                title="New trophies"
              />
            )}
          </span>
          <span className="relative">
            {tab.label}
            {tab.active && (
              <span
                aria-hidden
                className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[hsl(var(--kid))]"
              />
            )}
          </span>
        </Link>
      ))}
    </nav>
  )
}
