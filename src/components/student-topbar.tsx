"use client"

import { useStudent } from "@/lib/use-student"
import { LogOut } from "lucide-react"

/**
 * Sticky top bar for the student portal. A single cohesive user pill — gradient
 * avatar + identity + sign-out — wrapped in a soft gradient hairline that echoes
 * the sunny-pastel theme.
 */
export function StudentTopBar() {
  const { student, username } = useStudent()
  // Prefer the student's real name; fall back to the login username.
  const primary = student?.name || username || "—"
  const secondary = student?.name ? username : null
  const initial = (primary[0] || "?").toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-border/60 bg-background/70 backdrop-blur-md px-4 pl-16 lg:px-8 lg:pl-8">
      {/* Gradient hairline wrapper */}
      <div
        className="rounded-full p-[1.5px] shadow-soft"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--c-a-500) / 0.55), hsl(var(--primary) / 0.5), hsl(var(--c-s-500) / 0.55))",
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-1.5">
          {/* Gradient avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/70 shadow-sm flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--c-a-500)), hsl(var(--primary)) 55%, hsl(var(--c-s-500)))",
            }}
          >
            {initial}
          </div>

          {/* Identity */}
          <div className="leading-tight pr-1">
            <p className="text-sm font-bold text-foreground max-w-[11rem] truncate">
              {primary}
            </p>
            {secondary && (
              <p className="text-[10px] font-medium text-muted-foreground -mt-0.5 max-w-[11rem] truncate">
                {secondary}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-7 w-px bg-border/80 mx-0.5" />

          {/* Sign out */}
          <form action="/auth/signout" method="post" className="flex">
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="group flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-90"
            >
              <LogOut className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
