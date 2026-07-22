"use client"

import * as Popover from "@radix-ui/react-popover"
import { useStudent } from "@/lib/use-student"
import { LogOut, ChevronDown } from "lucide-react"

/**
 * Sticky top bar for the student portal. Follows the standard SaaS pattern:
 * a single avatar trigger that opens a dropdown menu (identity + sign-out),
 * rather than a cluster of controls in the bar itself.
 */
export function StudentTopBar() {
  const { student, username } = useStudent()
  const name = student?.name || username || "Student"
  const initial = (name[0] || "?").toUpperCase()

  const avatarStyle = { background: "hsl(var(--primary))" }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-border/60 bg-background/70 backdrop-blur-md px-4 pl-16 lg:px-8 lg:pl-8">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=open]:bg-card"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ring-2 ring-white/70 shadow-sm flex-shrink-0"
              style={avatarStyle}
            >
              {initial}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={10}
            className="z-50 w-60 rounded-2xl border border-border bg-card p-1.5 shadow-soft-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
          >
            {/* Identity header */}
            <div className="flex items-center gap-3 px-2.5 py-2.5">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-primary-foreground ring-2 ring-white/70 shadow-sm flex-shrink-0"
                style={avatarStyle}
              >
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{name}</p>
                {username && <p className="text-xs text-muted-foreground truncate">@{username}</p>}
                <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Student
                </span>
              </div>
            </div>

            <div className="my-1 h-px bg-border" />

            {/* Sign out */}
            <form action="/auth/signout?next=/login" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </header>
  )
}
