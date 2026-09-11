"use client"

import * as Popover from "@radix-ui/react-popover"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  CheckCheck,
  CheckSquare,
  Info,
  Receipt,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
  CATEGORY_THEMES,
  getNotificationCategory,
  type NotificationCategory,
} from "@/lib/notifications"
import { type NotificationRow, useNotifications } from "@/lib/use-notifications"
import { cn } from "@/lib/utils"

function CategoryIcon({
  category,
  className,
}: {
  category: Exclude<NotificationCategory, "all">
  className?: string
}) {
  switch (category) {
    case "classes":
      return <Video className={className} />
    case "trophies":
      return <Trophy className={className} />
    case "memorization":
      return <Sparkles className={className} />
    case "assignments":
      return <CheckSquare className={className} />
    case "fees":
      return <Receipt className={className} />
    case "general":
    default:
      return <Info className={className} />
  }
}

/** Bell trigger + live dropdown feed, shared by the teacher and student top bars. */
export function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const allHref = pathname.startsWith("/student") ? "/student/notifications" : "/notifications"
  const { items, unread, loading, markRead, markAllRead } = useNotifications()

  function open(n: NotificationRow) {
    if (!n.read_at) void markRead(n.id)
    if (n.link) router.push(n.link)
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=open]:bg-card data-[state=open]:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[16px] text-primary-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 flex max-h-[75vh] w-[23rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-soft-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 bg-card">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.2 text-[10px] font-bold text-primary">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </span>
                <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
                <p className="text-xs text-muted-foreground">No new activity to show</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((n) => {
                  const cat = getNotificationCategory(n.type, n.title)
                  const theme = CATEGORY_THEMES[cat]
                  const isUnread = !n.read_at

                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => open(n)}
                        className={cn(
                          "flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted/60",
                          isUnread && "bg-primary/[0.03]",
                        )}
                      >
                        {/* Category Icon */}
                        <div
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5",
                            theme.iconBgClass,
                          )}
                        >
                          <CategoryIcon category={cat} className="h-4 w-4" />
                        </div>

                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase",
                                theme.badgeClass,
                              )}
                            >
                              {theme.label}
                            </span>
                            {n.priority === "high" && (
                              <span className="rounded bg-destructive/15 px-1 py-0.2 text-[9px] font-bold text-destructive">
                                Urgent
                              </span>
                            )}
                            {isUnread && (
                              <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </span>

                          <span
                            className={cn(
                              "block truncate text-xs text-foreground",
                              isUnread ? "font-bold" : "font-medium",
                            )}
                          >
                            {n.title}
                          </span>

                          {n.body && (
                            <span className="line-clamp-1 block text-[11px] text-muted-foreground">
                              {n.body}
                            </span>
                          )}

                          <span
                            className="block text-[10px] text-muted-foreground/70"
                            title={formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                            })}
                          >
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border p-2 bg-card">
            <Popover.Close asChild>
              <Link
                href={allHref}
                className="flex w-full items-center justify-center rounded-xl bg-muted/60 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
              >
                View all notifications
              </Link>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
