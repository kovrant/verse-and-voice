"use client"

import * as Popover from "@radix-ui/react-popover"
import { LogOut } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"

import { NotificationBell } from "@/components/notification-bell"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import type { KidColor } from "@/components/student-nav"
import { StudentStreakPill } from "@/components/student-streak-card"
import { useTheme } from "@/components/theme-provider"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

const MENU_LINKS: { href: string; label: string; art: string; color: KidColor }[] = [
  { href: "/student/me", label: "My page", art: "🎒", color: "sky" },
  { href: "/student/progress", label: "My progress", art: "🗺️", color: "sage" },
  { href: "/student/attendance", label: "My class days", art: "🗓️", color: "caramel" },
  { href: "/student/notifications", label: "Messages", art: "💌", color: "rose" },
]

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
          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card text-[18px] shadow-soft transition-transform duration-500",
          dark ? "translate-x-[42px]" : "translate-x-0",
        )}

        style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
      >
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  )
}

/**
 * Student top bar: no strip, no border — floating "toys" over the backdrop.
 * Left: the child's own stuff (streak; stars later). Right: day/night (tablet
 * and up — phones get it in the avatar menu), messages, and the avatar menu
 * (profile, shortcuts, sign-out set apart at the bottom).
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
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="My menu"
              title={student?.name || username || "My menu"}
              className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] font-heading text-[19px] font-bold text-foreground transition-transform hover:-translate-y-0.5 hover:rotate-6 active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=open]:rotate-6"
              style={
                {
                  background: `hsl(var(--kid-${color}) / 0.45)`,
                  borderColor: `hsl(var(--kid-${color}) / 0.7)`,
                  boxShadow: `0 4px 0 hsl(var(--kid-${color}) / 0.6)`,
                } as CSSProperties
              }
            >
              {initial}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={12}
              className="z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-[26px] border-[1.5px] border-border bg-card p-2 shadow-soft-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              {/* Who's signed in */}
              <div
                className="mb-1 flex items-center gap-3 rounded-[20px] p-3"
                style={{ background: `hsl(var(--kid-${color}) / 0.18)` }}
              >
                <span
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] font-heading text-[21px] font-bold text-foreground"
                  style={
                    {
                      background: `hsl(var(--kid-${color}) / 0.45)`,
                      borderColor: `hsl(var(--kid-${color}) / 0.7)`,
                      boxShadow: `0 4px 0 hsl(var(--kid-${color}) / 0.6)`,
                    } as CSSProperties
                  }
                >
                  {initial}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-heading text-[18px] font-bold leading-tight text-primary">
                    {student?.name || username || "Student"}
                  </span>
                  {username && (
                    <span className="block truncate text-[13px] font-semibold text-muted-foreground">
                      @{username}
                    </span>
                  )}
                </span>
              </div>

              {MENU_LINKS.map((item) => (
                <Popover.Close asChild key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[52px] items-center gap-3 rounded-[18px] px-2.5 text-[15px] font-bold text-foreground transition-colors hover:bg-[hsl(var(--surface-alt))]"
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 items-center justify-center rounded-[14px] text-[20px]"
                      style={{ background: `hsl(var(--kid-${item.color}) / 0.25)` }}
                    >
                      {item.art}
                    </span>
                    {item.label}
                  </Link>
                </Popover.Close>
              ))}

              {/* Phones: the top bar has no room for the switch, so it lives here. */}
              <div className="flex min-h-[52px] items-center gap-3 rounded-[18px] px-2.5 sm:hidden">
                <span className="flex-1 text-[15px] font-bold text-foreground">Day or night</span>
                <DayNightSwitch />
              </div>

              <div className="my-1.5 h-px bg-border" />
              <form action="/auth/signout?next=/login" method="post">
                <button
                  type="submit"
                  className="flex min-h-[48px] w-full items-center gap-3 rounded-[18px] px-2.5 text-[15px] font-bold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5" />
                  </span>
                  Sign out
                </button>
              </form>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  )
}
