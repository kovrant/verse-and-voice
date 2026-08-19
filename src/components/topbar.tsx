"use client"

import * as Popover from "@radix-ui/react-popover"
import { ChevronDown, LogOut, Menu } from "lucide-react"
import type { ReactNode } from "react"

import { NotificationBell } from "@/components/notification-bell"
import { NotificationCompose } from "@/components/notification-compose"
import { ThemeSwitch } from "@/components/theme-switch"
import { useCurrentUser } from "@/lib/use-current-user"
import { useStudent } from "@/lib/use-student"

const avatarStyle = { background: "hsl(var(--primary))" }

function PortalTopBar({
  initial,
  title,
  subtitle,
  role,
  signOutNext,
  actions,
  onToggleSidebar,
}: {
  initial: string
  title: string
  subtitle?: string | null
  role: string
  signOutNext: string
  actions?: ReactNode
  onToggleSidebar?: () => void
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-1.5 border-b border-border/60 bg-background/70 backdrop-blur-md px-4 pl-16 lg:px-8 lg:pl-8">
      {onToggleSidebar ? (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Collapse or expand sidebar"
          title="Collapse / expand menu"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary lg:flex"
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : (
        <span />
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeSwitch />
        {actions}
        <NotificationBell />

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
            className="z-50 w-64 rounded-2xl border border-border bg-card p-1.5 shadow-soft-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
          >
            <div className="flex items-center gap-3 px-2.5 py-2.5">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-primary-foreground ring-2 ring-white/70 shadow-sm flex-shrink-0"
                style={avatarStyle}
              >
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{title}</p>
                {subtitle ? (
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                ) : null}
                <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {role}
                </span>
              </div>
            </div>

            <div className="my-1 h-px bg-border" />

            <form action={`/auth/signout?next=${signOutNext}`} method="post">
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
      </div>
    </header>
  )
}

export function TeacherTopBar() {
  const user = useCurrentUser()
  const email = user?.email || "—"
  return (
    <PortalTopBar
      initial={(user?.email?.[0] || "?").toUpperCase()}
      title={email}
      role="Teacher"
      signOutNext="/admin"
      actions={<NotificationCompose />}
    />
  )
}

export function StudentTopBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { student, username, loading } = useStudent()
  const name = student?.name || username || "Student"
  const initial = loading
    ? "…"
    : (student?.name?.[0] || username?.[0] || "?").toUpperCase()
  return (
    <PortalTopBar
      initial={initial}
      title={loading ? "Loading…" : name}
      subtitle={username ? `@${username}` : null}
      role="Student"
      signOutNext="/login"
      onToggleSidebar={onToggleSidebar}
    />
  )
}
