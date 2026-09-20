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

import { KidEmpty, KidPageHeader, KidTabs } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import type { KidColor } from "@/components/student-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

/**
 * Student portal ("storybook") face of each category: a crayon colour and an
 * emoji instead of the teacher's tinted lucide icon. Same categories, same keys
 * — only the paint differs.
 */
const KID_CATEGORY: Record<NotificationCategory, { emoji: string; color: KidColor }> = {
  all: { emoji: "💌", color: "sky" },
  classes: { emoji: "🏫", color: "sky" },
  trophies: { emoji: "🏆", color: "saffron" },
  memorization: { emoji: "✨", color: "lavender" },
  assignments: { emoji: "📝", color: "teal" },
  fees: { emoji: "🧾", color: "sage" },
  general: { emoji: "💬", color: "caramel" },
}

/** Shorter, friendlier tab labels for the student portal. */
const KID_TAB_LABELS: Record<NotificationCategory, string> = {
  all: "All",
  classes: "Class",
  trophies: "Trophies",
  memorization: "Learning",
  assignments: "Tasks",
  fees: "Fees",
  general: "Other",
}

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
        description:
          "Live class invites, join alerts, and completed session summaries will appear here.",
      }
    case "trophies":
      return {
        title: "No trophies or badges yet",
        description:
          "Attend live classes, maintain your daily streak, and complete Quran rounds to earn awards!",
      }
    case "memorization":
      return {
        title: "No memorization updates yet",
        description:
          "Assigned revisions, memorized surahs, and daily dua progress will appear here.",
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

/** Same empty states as the teacher's, in words a child reads happily. */
function getKidEmptyStateMessage(category: NotificationCategory, search: string) {
  if (search) {
    return { title: "Nothing found", description: "Try another word, or clear the search box." }
  }

  switch (category) {
    case "classes":
      return {
        title: "No class messages yet",
        description: "When your class starts or finishes, you'll hear about it here.",
      }
    case "trophies":
      return {
        title: "No trophies yet",
        description: "Join your classes and keep your streak going to win your first one!",
      }
    case "memorization":
      return {
        title: "No learning news yet",
        description: "New surahs and duas to learn will pop up here.",
      }
    case "assignments":
      return {
        title: "No tasks right now",
        description: "New Namaz steps, Qaida lessons and homework will land here.",
      }
    case "fees":
      return {
        title: "No fee notes",
        description: "Fee notes for your parents will show up here.",
      }
    case "general":
      return {
        title: "Nothing else to tell you",
        description: "Other news and sign-in notes appear here.",
      }
    case "all":
    default:
      return {
        title: "Your inbox is empty",
        description: "New messages from your teacher will land right here.",
      }
  }
}

export function NotificationsView({ kid = false }: { kid?: boolean }) {
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
      setAllItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: now } : p)))
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

    setAllItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: newReadAt } : p)))

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
  const emptyState = kid
    ? getKidEmptyStateMessage(activeCategory, search)
    : getEmptyStateMessage(activeCategory, search)

  return (
    <div
      className={cn("mx-auto space-y-6 animate-fade-in-up", kid ? "max-w-3xl pb-6" : "max-w-4xl")}
    >
      {/* Header */}
      {kid ? (
        <KidPageHeader
          className="mb-0"
          emoji="💌"
          color="sky"
          title="Messages"
          subtitle={
            hasUnread
              ? `${unreadCounts.all} new ${unreadCounts.all === 1 ? "message" : "messages"} for you!`
              : "Notes and news from your teacher."
          }
          right={
            hasUnread ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-[14px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
              >
                <CheckCheck className="h-4 w-4" />
                Read them all
              </button>
            ) : undefined
          }
        />
      ) : (
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
      )}

      {/* Category Filter Tabs & Unread Toggle */}
      <div className="flex flex-col gap-3">
        {kid ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <KidTabs
              color="sky"
              value={activeCategory}
              onChange={handleCategoryChange}
              tabs={NOTIFICATION_CATEGORIES.map((cat) => ({
                key: cat.key,
                label: KID_TAB_LABELS[cat.key],
                emoji: KID_CATEGORY[cat.key].emoji,
                count: unreadCounts[cat.key] > 0 ? unreadCounts[cat.key] : undefined,
              }))}
            />
            <button
              type="button"
              onClick={handleUnreadToggle}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 text-[14px] font-bold transition-colors",
                unreadOnly
                  ? "border-[hsl(var(--kid-sky)/0.6)] bg-[hsl(var(--kid-sky)/0.4)] text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span aria-hidden>🔵</span>
              New only
              {unreadCounts.all > 0 && (
                <span className="text-[13px] font-extrabold tabular-nums">
                  ({unreadCounts.all})
                </span>
              )}
            </button>
          </div>
        ) : (
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
                <span className="text-[11px] font-bold tabular-nums">({unreadCounts.all})</span>
              )}
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
              kid ? "h-[18px] w-[18px]" : "h-4 w-4",
            )}
          />
          {kid ? (
            <input
              placeholder="Search your messages…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-[50px] w-full rounded-full border-[1.5px] border-border bg-card pl-11 pr-4 text-[15px] font-semibold text-foreground shadow-[0_3px_0_hsl(var(--border))] outline-none placeholder:font-normal placeholder:text-muted-foreground/70 focus-visible:border-[hsl(var(--kid-sky))] focus-visible:ring-4 focus-visible:ring-[hsl(var(--kid-sky)/0.25)]"
            />
          ) : (
            <Input
              placeholder={`Search ${activeCategory === "all" ? "all" : activeCategory} notifications...`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-11 pl-11 bg-card rounded-xl shadow-xs"
            />
          )}
        </div>
      </div>

      {/* Feed Content */}
      {loading ? (
        <PageLoading variant="rows" count={6} student={kid} />
      ) : filteredItems.length === 0 ? (
        kid ? (
          <KidEmpty title={emptyState.title} text={emptyState.description} mood="sleepy" />
        ) : (
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
              <p className="mb-1 text-base font-semibold text-foreground">{emptyState.title}</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {emptyState.description}
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-6">
          {/* Timeline Section Rendering */}
          {(
            [
              { label: "Today", items: dateGroups.today },
              { label: "Yesterday", items: dateGroups.yesterday },
              { label: kid ? "This week" : "Earlier This Week", items: dateGroups.thisWeek },
              { label: kid ? "Before that" : "Older", items: dateGroups.older },
            ] as const
          )
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.label} className={kid ? "space-y-3" : "space-y-2.5"}>
                {/* Timeline Header */}
                {kid ? (
                  <div className="flex items-center gap-2.5 px-1">
                    <h2 className="font-heading text-[20px] font-bold leading-none text-primary">
                      {section.label}
                    </h2>
                    <div className="h-[2px] flex-1 rounded-full bg-[hsl(var(--kid-sky)/0.35)]" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}

                {/* Notification Cards */}
                {kid ? (
                  <ul className="space-y-3">
                    {section.items.map((n) => (
                      <KidNotificationItem
                        key={n.id}
                        n={n}
                        onOpen={() => void openItem(n)}
                        onToggleRead={(e) => void toggleRead(e, n)}
                      />
                    ))}
                  </ul>
                ) : (
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
                                  <CategoryIcon category={cat} className="h-5 w-5" />
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
                )}
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

/**
 * One message as a storybook card (student portal only). Unread cards are
 * tinted in the category's crayon colour and carry a dot; read ones go quiet.
 * Same tap-to-open and tick-to-mark-read behaviour as the teacher's row.
 */
function KidNotificationItem({
  n,
  onOpen,
  onToggleRead,
}: {
  n: NotificationRow
  onOpen: () => void
  onToggleRead: (e: React.MouseEvent) => void
}) {
  const cat = getNotificationCategory(n.type, n.title)
  const { emoji, color } = KID_CATEGORY[cat]
  const label = CATEGORY_THEMES[cat].label
  const actionLabel = getNotificationActionLabel(n.type, n.title, n.link)
  const isUnread = !n.read_at

  return (
    <li>
      <div
        onClick={onOpen}
        className={cn(
          "flex cursor-pointer flex-col gap-2.5 rounded-[22px] border-[1.5px] p-3.5 transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none",
          isUnread ? "" : "border-border bg-card shadow-[0_3px_0_hsl(var(--border))]",
        )}
        style={
          isUnread
            ? {
                borderColor: `hsl(var(--kid-${color}) / 0.5)`,
                background: `linear-gradient(160deg, hsl(var(--kid-${color}) / 0.24), hsl(var(--kid-${color}) / 0.09)), hsl(var(--card))`,
                boxShadow: `0 4px 0 hsl(var(--kid-${color}) / 0.5)`,
              }
            : undefined
        }
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-[22px]"
            style={{ background: `hsl(var(--kid-${color}) / ${isUnread ? 0.4 : 0.22})` }}
          >
            {emoji}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold text-foreground"
                  style={{ background: `hsl(var(--kid-${color}) / 0.4)` }}
                >
                  {label}
                </span>
                {n.priority === "high" && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11.5px] font-extrabold text-accent-foreground">
                    Important
                  </span>
                )}
                {isUnread && (
                  <span
                    aria-label="New"
                    className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={onToggleRead}
                title={isUnread ? "Mark as read" : "Mark as unread"}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                <Check className={cn("h-4 w-4", !isUnread && "opacity-40")} />
              </button>
            </div>

            <h3
              className={cn(
                "mt-1 font-heading text-[17px] leading-tight text-primary",
                isUnread ? "font-bold" : "font-semibold",
              )}
            >
              {n.title}
            </h3>

            {n.body && (
              <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-foreground/85">
                {n.body}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-border/50 pt-2">
          <span
            className="text-[12.5px] font-bold text-muted-foreground"
            title={format(new Date(n.created_at), "PPpp")}
          >
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
          </span>

          {actionLabel && n.link && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-extrabold",
                isUnread ? "bg-accent text-accent-foreground" : "bg-secondary/70 text-foreground",
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
}
