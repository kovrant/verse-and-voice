"use client"

import * as Popover from "@radix-ui/react-popover"
import { CalendarDays, ChevronDown, LogOut, Menu } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Brand } from "@/components/brand"
import { BrandLogo } from "@/components/brand-logo"
import { NotificationBell } from "@/components/notification-bell"
import { NotificationCompose } from "@/components/notification-compose"
import { useSidebarVisibility } from "@/components/sidebar-visibility"
import { ThemeSwitch } from "@/components/theme-switch"
import { getHijriToday, ordinalDay } from "@/lib/hijri"
import { useCurrentUser } from "@/lib/use-current-user"

const avatarStyle = { background: "hsl(var(--primary))" }

function PortalTopBar({
  initial,
  title,
  subtitle,
  role,
  signOutNext,
  actions,
  onMenuClick,
}: {
  initial: string
  title: string
  subtitle?: string | null
  role: string
  signOutNext: string
  actions?: ReactNode
  onMenuClick: () => void
}) {
  const hijri = getHijriToday()
  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between gap-2.5 border-b-[0.5px] border-card-border bg-card-surface-area px-3 lg:px-5">
      {/* Below lg: menu button + logo (the sidebar is a drawer there) */}
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-md p-1.5 text-icon-tertiary transition-colors hover:text-text-primary"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/teacher" className="flex min-w-0 items-center gap-2">
          <BrandLogo className="h-8 w-8 flex-shrink-0" />
          <span className="hidden whitespace-nowrap text-text-primary min-[400px]:block">
            <Brand />
          </span>
        </Link>
      </div>

      {/* Today's Islamic date → Islamic History */}
      <Link
        href="/teacher/history"
        title="Islamic History"
        className="group hidden min-w-0 items-center gap-3 rounded-lg py-1 pr-2 md:flex"
      >
        <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <CalendarDays className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-sm font-semibold leading-5 text-text-primary">
            {ordinalDay(hijri.day)} {hijri.monthInfo.name} {hijri.year} AH
          </span>
          <span className="block text-xs leading-4 text-text-tertiary">Islamic date</span>
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
        <ThemeSwitch />
        {actions}
        <NotificationBell />

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="group flex items-center gap-2.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <span
                className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-primary-foreground"
                style={avatarStyle}
              >
                {initial}
              </span>
              <span className="hidden text-sm font-medium leading-5 text-text-primary md:block">
                {role}
              </span>
              <ChevronDown className="h-4 w-4 text-icon-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={10}
              className="z-50 w-[280px] overflow-hidden rounded-xl border border-card-border bg-dropdowns-background p-0 shadow-3xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
            >
              <div className="flex items-center gap-2.5 border-b border-border-secondary-alt px-4 py-3">
                <span
                  className="flex size-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                  style={avatarStyle}
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{title}</p>
                  <p className="truncate text-xs text-text-tertiary">{subtitle || role}</p>
                </div>
              </div>

              <form action={`/auth/signout?next=${signOutNext}`} method="post" className="p-1.5">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background-gray-primary hover:text-text-primary"
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
  const { visible, setMobileOpen } = useSidebarVisibility()
  const user = useCurrentUser()
  const email = user?.email || "—"
  if (!visible) return null
  return (
    <PortalTopBar
      initial={(user?.email?.[0] || "?").toUpperCase()}
      title={email}
      role="Teacher"
      signOutNext="/teacher/login"
      actions={<NotificationCompose />}
      onMenuClick={() => setMobileOpen(true)}
    />
  )
}
