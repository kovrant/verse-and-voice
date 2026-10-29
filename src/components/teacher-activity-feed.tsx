"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowRight, CheckCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FEED_FILTERS, type FeedFilter, feedTypeMeta, matchesFeedFilter } from "@/lib/teacher-feed"
import { DASHBOARD_FEED_LIMIT, useNotifications } from "@/lib/use-notifications"
import { cn } from "@/lib/utils"

export function TeacherActivityFeed({ onFeePaid }: { onFeePaid?: () => void }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FeedFilter>("all")
  const { items, unread, loading, markRead, markAllRead } = useNotifications(DASHBOARD_FEED_LIMIT)

  const lastFeeNotified = useRef<string | null>(null)
  useEffect(() => {
    if (!onFeePaid) return
    const fee = items.find((n) => n.type === "fee_paid")
    if (fee && fee.id !== lastFeeNotified.current) {
      lastFeeNotified.current = fee.id
      onFeePaid()
    }
  }, [items, onFeePaid])

  const filtered = items.filter((n) => matchesFeedFilter(n.type, filter))

  function open(id: string, link: string | null, read: boolean) {
    if (!read) void markRead(id)
    if (link) router.push(link)
  }

  return (
    <Card className="flex min-h-[420px] flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <p className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            Live activity
          </p>
          <p className="text-sm text-text-tertiary">
            Logins, fees, achievements, and class updates — updates in real time
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FEED_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-background-gray-secondary text-text-secondary hover:text-text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[480px] -mx-1 px-1">
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 shimmer rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-foreground">Nothing here yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Student logins, fee payments, and milestones will show up as they happen.
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((n) => {
                const meta = feedTypeMeta(n.type)
                const Icon = meta.icon
                return (
                  <li key={n.id} className="border-b border-border-primary last:border-0">
                    <button
                      type="button"
                      onClick={() => open(n.id, n.link, !!n.read_at)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-background-gray-primary",
                        !n.read_at && "bg-primary/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
                          meta.tint,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-5 text-text-primary">
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-text-tertiary">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-text-tertiary">
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

        <Link href="/teacher/notifications" className="block pt-1">
          <Button variant="outline" size="sm" className="w-full text-xs">
            View all notifications <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
