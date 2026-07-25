"use client"

import { format, formatDistanceToNow } from "date-fns"
import { Bell, CheckCheck, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { retentionCutoffIso, sanitizeSearchTerm } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser } from "@/lib/use-current-user"
import type { NotificationRow } from "@/lib/use-notifications"
import { cn } from "@/lib/utils"

const COLUMNS = "id, type, title, body, link, priority, read_at, created_at"
const PAGE_SIZE_OPTIONS = [15, 30, 50]

/**
 * Full notifications feed — descending order, type-to-search, and pagination.
 * RLS scopes every row to the current user, so the same view serves both the
 * teacher and student portals. Only the last two months are shown (older rows
 * are purged by the pg_cron job in migration_notifications_retention.sql).
 */
export function NotificationsView() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])

  useEffect(() => {
    getCurrentAuthUser().then((u) => setUserId(u?.id ?? null))
  }, [])

  // Debounce the search box, and reset to page 1 on a new term.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(sanitizeSearchTerm(searchInput))
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    const from = (page - 1) * pageSize
    let query = supabase
      .from("notifications")
      .select(COLUMNS, { count: "exact" })
      .gte("created_at", retentionCutoffIso())
      .order("created_at", { ascending: false })
    if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)

    const { data, count } = await query.range(from, from + pageSize - 1)
    setItems((data as NotificationRow[] | null) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    void load()
  }, [load])

  // Live refresh: any change to this user's notifications re-runs the current
  // query (debounced) so the page stays current without a manual refresh.
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    if (!userId) return
    const filter = `recipient_id=eq.${userId}`
    let t: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => void loadRef.current(), 400)
    }
    const channel = supabase
      .channel(`notif-page:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter }, refresh)
    void supabase.realtime.setAuth().finally(() => channel.subscribe())
    return () => {
      if (t) clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [userId])

  const unread = items.some((n) => !n.read_at)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  async function open(n: NotificationRow) {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)),
      )
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id)
        .is("read_at", null)
    }
    if (n.link) router.push(n.link)
  }

  async function markAllRead() {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    await supabase.from("notifications").update({ read_at: now }).is("read_at", null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bell className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">Your last two months of activity.</p>
          </div>
        </div>
        {unread && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notifications..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-12 pl-11"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 shimmer rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 text-base font-semibold">
              {search ? "No matching notifications" : "You're all caught up"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search term." : "New notifications will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border/60">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void open(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60",
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
                    <span
                      className="mt-1 block text-[11px] text-muted-foreground/70"
                      title={format(new Date(n.created_at), "PPpp")}
                    >
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      )}
    </div>
  )
}
