"use client"

// Real-time notifications for the current user (teacher or student).
//
// Durable source of truth: the `notifications` table. On mount we fetch the
// recent feed once, then subscribe to Supabase Realtime Postgres Changes scoped
// to this user's rows — new rows appear instantly (+ toast), mark-read updates
// reflect live across tabs.
//
// Every query and mutation below filters on recipient_id explicitly. RLS is
// still the real boundary, but relying on it silently is what let a too-broad
// teacher policy leak (and mark-read) every user's feed — see
// supabase/migration_notifications_rls_fix.sql.

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"

import { retentionCutoffIso } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { ensureRealtimeAuth, getCurrentAuthUser } from "@/lib/use-current-user"

export interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  priority: "low" | "normal" | "high"
  read_at: string | null
  created_at: string
}

const FEED_LIMIT = 30
export const DASHBOARD_FEED_LIMIT = 50
export const NOTIFICATION_COLUMNS = "id, type, title, body, link, priority, read_at, created_at"

/**
 * Mark a single notification read. Scoped to the recipient as well as the id,
 * so a stale or leaked id can never clear someone else's unread state.
 */
export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", userId)
    .is("read_at", null)
}

/** Mark every unread notification belonging to this user read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null)
}

/** Exact unread total — the feed is capped at FEED_LIMIT, so it can't be counted from it. */
async function countUnreadNotifications(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null)
    .gte("created_at", retentionCutoffIso())
  return count ?? 0
}

type NotifSubscriber = {
  limit: number
  setItems: Dispatch<SetStateAction<NotificationRow[]>>
  refreshUnread: () => void
}

type NotifChannelEntry = {
  channel: ReturnType<typeof supabase.channel>
  subs: Set<NotifSubscriber>
}

const notifChannels = new Map<string, NotifChannelEntry>()

function dispatchInsert(userId: string, n: NotificationRow) {
  const entry = notifChannels.get(userId)
  if (!entry) return
  for (const sub of entry.subs) {
    sub.setItems((prev) =>
      prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, sub.limit),
    )
    sub.refreshUnread()
  }
  if (n.type !== "live_class") toast(n.title, { description: n.body ?? undefined })
}

function dispatchUpdate(userId: string, n: NotificationRow) {
  const entry = notifChannels.get(userId)
  if (!entry) return
  for (const sub of entry.subs) {
    sub.setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, ...n } : p)))
    sub.refreshUnread()
  }
}

function attachNotifChannel(userId: string) {
  if (notifChannels.has(userId)) return

  const filter = `recipient_id=eq.${userId}`
  const channel = supabase
    .channel(`notif:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter },
      ({ new: row }) => dispatchInsert(userId, row as NotificationRow),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications", filter },
      ({ new: row }) => dispatchUpdate(userId, row as NotificationRow),
    )

  notifChannels.set(userId, { channel, subs: new Set() })
  void ensureRealtimeAuth().finally(() => channel.subscribe())
}

function subscribeNotif(userId: string, sub: NotifSubscriber) {
  attachNotifChannel(userId)
  notifChannels.get(userId)!.subs.add(sub)
  return () => {
    const entry = notifChannels.get(userId)
    if (!entry) return
    entry.subs.delete(sub)
    if (entry.subs.size === 0) {
      supabase.removeChannel(entry.channel)
      notifChannels.delete(userId)
    }
  }
}

export function useNotifications(limit = FEED_LIMIT) {
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getCurrentAuthUser().then((u) => active && setUserId(u?.id ?? null))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)

    const refreshUnread = () =>
      void countUnreadNotifications(userId).then((n) => active && setUnread(n))

    void supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("recipient_id", userId)
      .gte("created_at", retentionCutoffIso())
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (!active) return
        setItems((data as NotificationRow[] | null) ?? [])
        setLoading(false)
      })
    refreshUnread()

    const unsub = subscribeNotif(userId, { limit, setItems, refreshUnread })

    return () => {
      active = false
      unsub()
    }
  }, [userId, limit])

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return
      const now = new Date().toISOString()
      setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)))
      setUnread((n) => Math.max(0, n - 1))
      await markNotificationRead(id, userId)
    },
    [userId],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    setUnread(0)
    await markAllNotificationsRead(userId)
  }, [userId])

  return { items, unread, loading, markRead, markAllRead }
}
