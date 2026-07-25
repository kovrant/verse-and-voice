"use client"

// Real-time notifications for the current user (teacher or student).
//
// Durable source of truth: the `notifications` table. On mount we fetch the
// recent feed once, then subscribe to Supabase Realtime Postgres Changes scoped
// to this user's rows — new rows appear instantly (+ toast), mark-read updates
// reflect live across tabs. RLS guarantees a client only ever sees its own rows.

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { retentionCutoffIso } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser } from "@/lib/use-current-user"

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
const COLUMNS = "id, type, title, body, link, priority, read_at, created_at"

export function useNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([])
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

    void supabase
      .from("notifications")
      .select(COLUMNS)
      .gte("created_at", retentionCutoffIso())
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT)
      .then(({ data }) => {
        if (!active) return
        setItems((data as NotificationRow[] | null) ?? [])
        setLoading(false)
      })

    const filter = `recipient_id=eq.${userId}`
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter },
        ({ new: row }) => {
          const n = row as NotificationRow
          setItems((prev) =>
            prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, FEED_LIMIT),
          )
          // Live-class events surface via the dedicated join modal / in-session
          // pill — skip the corner toast so we don't double-alert.
          if (n.type !== "live_class") toast(n.title, { description: n.body ?? undefined })
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter },
        ({ new: row }) => {
          const n = row as NotificationRow
          setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, ...n } : p)))
        },
      )

    // RLS on postgres_changes is evaluated with the user's JWT — attach it first.
    void supabase.realtime.setAuth().finally(() => active && channel.subscribe())

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)))
    await supabase.from("notifications").update({ read_at: now }).eq("id", id).is("read_at", null)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", userId)
      .is("read_at", null)
  }, [userId])

  return { items, unread, loading, markRead, markAllRead }
}
