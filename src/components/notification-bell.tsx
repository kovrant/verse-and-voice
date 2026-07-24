"use client"

import * as Popover from "@radix-ui/react-popover"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { type NotificationRow, useNotifications } from "@/lib/use-notifications"
import { cn } from "@/lib/utils"

/** Bell trigger + live dropdown feed, shared by the teacher and student top bars. */
export function NotificationBell() {
  const router = useRouter()
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
          className="z-50 flex max-h-[70vh] w-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-soft-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">Notifications</p>
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
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                        !n.read_at && "bg-primary/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                          n.read_at ? "bg-transparent" : "bg-primary",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm text-foreground",
                              n.read_at ? "font-medium" : "font-bold",
                            )}
                          >
                            {n.title}
                          </span>
                          {n.priority === "high" && (
                            <span className="flex-shrink-0 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                              Important
                            </span>
                          )}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
