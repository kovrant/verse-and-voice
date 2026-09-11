"use client"

import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  Filter,
  Info,
  Receipt,
  Search,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageLoading } from "@/components/page-loading"
import { Pagination } from "@/components/ui/pagination"
import {
  CATEGORY_THEMES,
  getNotificationActionLabel,
  getNotificationCategory,
  groupNotificationsByDate,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  retentionCutoffIso,
  sanitizeSearchTerm,
} from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { ensureRealtimeAuth, getCurrentAuthUser } from "@/lib/use-current-user"
import {
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_COLUMNS,
  type NotificationRow,
} from "@/lib/use-notifications"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [15, 30, 50]

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

function getEmptyStateMessage(category: NotificationCategory, search: string) {
  if (search) {
    return {
      title: "No matching notifications",
      description: "Try a different search term or clear the filter.",
    }
  }

  switch (category) {
    case "classes":
      return {
        title: "No class notifications yet",
        description: "Live class invites, join alerts, and completed session summaries will appear here.",
      }
    case "trophies":
      return {
        title: "No trophies or badges yet",
        description: "Attend live classes, maintain your daily streak, and complete Quran rounds to earn awards!",
      }
    case "memorization":
      return {
        title: "No memorization updates yet",
        description: "Assigned revisions, memorized surahs, and daily dua progress will appear here.",
      }
    case "assignments":
      return {
        title: "All caught up on assignments",
        description: "New Namaz steps, Qaida lessons, and homework tasks will be listed here.",
      }
    case "fees":
      return {
        title: "No fee notices",
        description: "Recorded tuition fees and payment confirmations will appear here.",
      }
    case "general":
      return {
        title: "No general updates",
        description: "Sign-in activity and system announcements will appear here.",
      }
    case "all":
    default:
      return {
        title: "You're all caught up",
        description: "New notifications and activity updates will appear here in real time.",
      }
  }
}

export function NotificationsView() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [allItems, setAllItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])

  useEffect(() => {
    getCurrentAuthUser().then((u) => setUserId(u?.id ?? null))
  }, [])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(sanitizeSearchTerm(searchInput))
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset page when switching category or unread filter
  const handleCategoryChange = (cat: NotificationCategory) => {
    setActiveCategory(cat)
    setPage(1)
  }

  const handleUnreadToggle = () => {
    setUnreadOnly((prev) => !prev)
    setPage(1)
  }

  // Load all recent notifications for this user (up to 2 months)
  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS, { count: "exact" })
      .eq("recipient_id", userId)
      .gte("created_at", retentionCutoffIso())
      .order("created_at", { ascending: false })
      .limit(300) // load recent batch for responsive client categorization & live unread counters

    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
    }

    const { data } = await query
    setAllItems((data as NotificationRow[] | null) ?? [])
    setLoading(false)
  }, [search, userId])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime subscription
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
      .channel(`notif-page-live:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter },
        refresh,
      )
    void ensureRealtimeAuth().finally(() => channel.subscribe())
    return () => {
      if (t) clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Calculate unread counts per category
  const unreadCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      all: 0,
      classes: 0,
      trophies: 0,
      memorization: 0,
      assignments: 0,
      fees: 0,
      general: 0,
    }

    for (const item of allItems) {
      if (!item.read_at) {
        counts.all += 1
        const cat = getNotificationCategory(item.type, item.title)
        counts[cat] = (counts[cat] || 0) + 1
      }
    }
    return counts
  }, [allItems])

  // Filter items by active category & unread toggle
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (unreadOnly && item.read_at) return false
      if (activeCategory === "all") return true
      const cat = getNotificationCategory(item.type, item.title)
      return cat === activeCategory
    })
  }, [allItems, activeCategory, unreadOnly])

  // Pagination on filtered items
  const paginatedItems = useMemo(() => {
    const from = (page - 1) * pageSize
    return filteredItems.slice(from, from + pageSize)
  }, [filteredItems, page, pageSize])

  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

  // Smart Date Groups for the current page
  const dateGroups = useMemo(() => {
    return groupNotificationsByDate(paginatedItems)
  }, [paginatedItems])

  // Mark single item read & navigate if link exists
  async function openItem(n: NotificationRow) {
    if (!n.read_at && userId) {
      const now = new Date().toISOString()
      setAllItems((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, read_at: now } : p)),
      )
      await markNotificationRead(n.id, userId)
    }
    if (n.link) router.push(n.link)
  }

  // Toggle single item read status without navigating
  async function toggleRead(e: React.MouseEvent, n: NotificationRow) {
    e.stopPropagation()
    if (!userId) return
    const isRead = !!n.read_at
    const newReadAt = isRead ? null : new Date().toISOString()

    setAllItems((prev) =>
      prev.map((p) => (p.id === n.id ? { ...p, read_at: newReadAt } : p)),
    )

    if (!isRead) {
      await markNotificationRead(n.id, userId)
    }
  }

  // Mark all unread in current view read
  async function markAllRead() {
    if (!userId) return
    const now = new Date().toISOString()
    setAllItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    await markAllNotificationsRead(userId)
  }

  const hasUnread = unreadCounts.all > 0
  const emptyState = getEmptyStateMessage(activeCategory, search)

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bell className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Notifications
              </h1>
              {unreadCounts.all > 0 && (
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {unreadCounts.all} unread
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Categorized updates and live activity across your classes.
            </p>
          </div>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Category Filter Tabs & Unread Toggle */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const count = unreadCounts[cat.key]
              const active = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryChange(cat.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                    active
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {cat.key !== "all" ? (
                    <CategoryIcon
                      category={cat.key as Exclude<NotificationCategory, "all">}
                      className="h-3.5 w-3.5"
                    />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/20 text-primary",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Unread Only Toggle */}
          <button
            type="button"
            onClick={handleUnreadToggle}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
              unreadOnly
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Unread only</span>
            {unreadCounts.all > 0 && (
              <span className="text-[11px] font-bold tabular-nums">
                ({unreadCounts.all})
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeCategory === "all" ? "all" : activeCategory} notifications...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-11 pl-11 bg-card rounded-xl shadow-xs"
          />
        </div>
      </div>

      {/* Feed Content */}
      {loading ? (
        <PageLoading variant="rows" count={6} />
      ) : filteredItems.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
              {activeCategory === "all" ? (
                <Bell className="h-6 w-6 text-primary" />
              ) : (
                <CategoryIcon
                  category={activeCategory as Exclude<NotificationCategory, "all">}
                  className="h-6 w-6 text-primary"
                />
              )}
            </div>
            <p className="mb-1 text-base font-semibold text-foreground">
              {emptyState.title}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {emptyState.description}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Timeline Section Rendering */}
          {(
            [
              { label: "Today", items: dateGroups.today },
              { label: "Yesterday", items: dateGroups.yesterday },
              { label: "Earlier This Week", items: dateGroups.thisWeek },
              { label: "Older", items: dateGroups.older },
            ] as const
          )
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.label} className="space-y-2.5">
                {/* Timeline Header */}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                {/* Notification Cards */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                  <ul className="divide-y divide-border/60">
                    {section.items.map((n) => {
                      const cat = getNotificationCategory(n.type, n.title)
                      const theme = CATEGORY_THEMES[cat]
                      const actionLabel = getNotificationActionLabel(n.type, n.title, n.link)
                      const isUnread = !n.read_at

                      return (
                        <li key={n.id}>
                          <div
                            onClick={() => void openItem(n)}
                            className={cn(
                              "group flex flex-col gap-2.5 p-4 text-left transition-all cursor-pointer hover:bg-muted/50",
                              isUnread && "bg-primary/[0.03]",
                            )}
                          >
                            <div className="flex items-start gap-3.5">
                              {/* Category Icon Badge */}
                              <div
                                className={cn(
                                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                                  theme.iconBgClass,
                                )}
                              >
                                <CategoryIcon
                                  category={cat}
                                  className="h-5 w-5"
                                />
                              </div>

                              {/* Title, Category Tag, Body */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {/* Category Pill */}
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                        theme.badgeClass,
                                      )}
                                    >
                                      {theme.label}
                                    </span>

                                    {/* High Priority Badge */}
                                    {n.priority === "high" && (
                                      <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                                        Important
                                      </span>
                                    )}

                                    {/* Unread indicator pulse dot */}
                                    {isUnread && (
                                      <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    )}
                                  </div>

                                  {/* Quick Mark-Read Button on card */}
                                  <button
                                    type="button"
                                    onClick={(e) => void toggleRead(e, n)}
                                    title={isUnread ? "Mark as read" : "Mark as unread"}
                                    className={cn(
                                      "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground",
                                      isUnread && "hover:text-primary",
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        !isUnread && "text-muted-foreground/40",
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* Title */}
                                <h3
                                  className={cn(
                                    "text-sm text-foreground",
                                    isUnread ? "font-bold" : "font-medium",
                                  )}
                                >
                                  {n.title}
                                </h3>

                                {/* Body Description */}
                                {n.body && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {n.body}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Contextual Bottom Detail Strip */}
                            <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                              <span
                                className="flex items-center gap-1.5 font-medium"
                                title={format(new Date(n.created_at), "PPpp")}
                              >
                                {formatDistanceToNow(new Date(n.created_at), {
                                  addSuffix: true,
                                })}
                              </span>

                              {/* Direct Action Button */}
                              {actionLabel && n.link && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                                    isUnread
                                      ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                                      : "bg-secondary text-foreground hover:bg-muted",
                                  )}
                                >
                                  <span>{actionLabel}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Pagination */}
      {totalFiltered > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalFiltered}
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

