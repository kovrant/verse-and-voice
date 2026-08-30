"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowRight, CheckCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FEED_FILTERS,
  feedTypeMeta,
  matchesFeedFilter,
  type FeedFilter,
} from "@/lib/teacher-feed"
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
    <Card className="flex flex-col min-h-[420px]">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle>Live activity</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Logins, fees, achievements, and class updates — updates in real time
          </p>
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => void markAllRead()}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        <div className="flex flex-wrap gap-1.5">
          {FEED_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
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
                <div key={i} className="h-14 shimmer rounded-xl" />
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
            <ul className="space-y-1.5">
              {filtered.map((n) => {
                const meta = feedTypeMeta(n.type)
                const Icon = meta.icon
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n.id, n.link, !!n.read_at)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:bg-secondary/50",
                        !n.read_at && "bg-primary/[0.04] border-primary/20",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                          meta.tint,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">{n.title}</span>
                        {n.body && (
                          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.body}
                          </span>
                        )}
                        <span className="block text-[10px] text-muted-foreground mt-1">
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

        <Link href="/notifications" className="block pt-1">
          <Button variant="outline" size="sm" className="w-full text-xs">
            View all notifications <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
