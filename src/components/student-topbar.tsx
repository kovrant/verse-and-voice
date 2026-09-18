"use client"

import Link from "next/link"
import type { CSSProperties } from "react"

import { NotificationBell } from "@/components/notification-bell"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import type { KidColor } from "@/components/student-nav"
import { StudentStreakPill } from "@/components/student-streak-card"
import { useTheme } from "@/components/theme-provider"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

const AVATAR_COLORS: KidColor[] = ["sage", "sky", "lavender", "caramel", "coral", "teal", "rose"]

/** Stable crayon colour per child, so their avatar looks the same every visit. */
function avatarColor(seed: string): KidColor {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/**
 * Day/night switch as a tiny sky scene: sky-blue track with a sun by day,
 * lavender track with a moon and stars by night. Same `useTheme` as the admin
 * toggle — only the look differs.
 */
export function DayNightSwitch({ className }: { className?: string }) {
  const { dark, toggleDark } = useTheme()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to day" : "Switch to night"}
      title={dark ? "Switch to day" : "Switch to night"}
      onClick={toggleDark}
      className={cn(
        "relative inline-flex h-11 w-[84px] flex-shrink-0 items-center rounded-full border-[1.5px] px-1 transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        className,
      )}
      style={{
        background: dark ? "hsl(var(--kid-lavender) / 0.45)" : "hsl(var(--kid-sky) / 0.4)",
        borderColor: dark ? "hsl(var(--kid-lavender) / 0.6)" : "hsl(var(--kid-sky) / 0.6)",
        boxShadow: `0 4px 0 hsl(var(--kid-${dark ? "lavender" : "sky"}) / 0.55)`,
      }}
    >
      {/* Night-time stars on the track */}
      <span
        aria-hidden
        className={cn(
          "absolute left-3 top-2 text-[9px] text-[hsl(var(--kid-saffron))] transition-opacity",
          dark ? "opacity-100" : "opacity-0",
        )}
      >
        ✦
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute bottom-2 left-7 text-[7px] text-[hsl(var(--kid-saffron))] transition-opacity",
          dark ? "opacity-100" : "opacity-0",
        )}
      >
        ✦
      </span>
      {/* Sliding knob with a little overshoot */}
      <span
        aria-hidden
        className={cn(
          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card text-[18px] shadow-soft transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]",
          dark ? "translate-x-[42px]" : "translate-x-0",
        )}
      >
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  )
}

/**
 * Student top bar: no strip, no border — floating "toys" over the backdrop.
 * Left: the child's own stuff (streak; stars later). Right: day/night (tablet
 * and up — phones get it on the Me page), messages, and the avatar, which goes
 * straight to Me. Sign-out lives only on Me, so kids can't hit it by accident.
 */
export function StudentTopBar() {
  const { visible } = useSidebarVisibility()
  const { student, username, loading } = useStudent()
  if (!visible) return null

  const seed = student?.name || username || "?"
  const initial = loading ? "…" : (student?.name?.[0] || username?.[0] || "?").toUpperCase()
  const color = avatarColor(seed)

  return (
    <header className="relative z-30 flex shrink-0 items-center gap-2 px-4 pt-4 lg:px-8 lg:pt-6">
      <StudentStreakPill />
      <div className="ml-auto flex items-center gap-2.5">
        <DayNightSwitch className="hidden sm:inline-flex" />
        <NotificationBell kid />
        <Link
          href="/student/me"
          aria-label="My page"
          title={student?.name || username || "My page"}
          className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] font-heading text-[19px] font-bold text-foreground transition-transform hover:-translate-y-0.5 hover:rotate-6 active:translate-y-[3px] active:shadow-none"
          style={
            {
              background: `hsl(var(--kid-${color}) / 0.45)`,
              borderColor: `hsl(var(--kid-${color}) / 0.7)`,
              boxShadow: `0 4px 0 hsl(var(--kid-${color}) / 0.6)`,
            } as CSSProperties
          }
        >
          {initial}
        </Link>
      </div>
    </header>
  )
}
