"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface NavState {
  paraNumber: number
  page: number
}

export type ClassRole = "teacher" | "student"

interface UseClassChannelOptions {
  /** The student the class belongs to — the channel key. */
  studentId: string | null | undefined
  /** This client's role. "live" reflects whether the *other* role is present. */
  role: ClassRole
  /** Only join when true (e.g. class is active). */
  enabled?: boolean
  /**
   * Whether to advertise this client's own presence. Default true. Toggling
   * this calls track/untrack on the *same* channel (no re-subscribe), so a
   * student can listen-only (detect) and later join without a new channel.
   */
  present?: boolean
  /** Fired when the *other* party navigates (para/page). Echoes are filtered. */
  onNav?: (nav: NavState) => void
  /** Fired when the other party explicitly ends the class. */
  onEnd?: () => void
  /** Fired when the other role newly joins (presence join) — e.g. so the
   * teacher can push its authoritative position to a fresh joiner. */
  onPeerJoin?: () => void
}

interface ClassChannel {
  /** Is the other role currently present on the channel? */
  live: boolean
  /** The other role's last-known position (for a joiner to land correctly). */
  peerNav: NavState | null
  /** Broadcast this client's position + update its presence. */
  sendNav: (nav: NavState) => void
  /** Broadcast an explicit "class ended" signal to the other party. */
  endClass: () => void
}

function genId() {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

// Private channels enforce RLS on realtime.messages (see
// supabase/migration_realtime_class_auth.sql). Env-gated so it only turns on
// AFTER that SQL is applied — otherwise the channel would be denied.
const PRIVATE_CHANNEL = process.env.NEXT_PUBLIC_REALTIME_PRIVATE === "true"

/**
 * Live-class channel over Supabase Realtime — Presence ("who's here / where")
 * + Broadcast (page/para events). No database involvement. There must be at
 * most ONE instance per topic per client (supabase-js reuses a channel by
 * topic), so the student side runs a single instance in LiveClassProvider.
 */
export function useClassChannel({
  studentId,
  role,
  enabled = true,
  present = true,
  onNav,
  onEnd,
  onPeerJoin,
}: UseClassChannelOptions): ClassChannel {
  const [clientId] = useState(genId)
  const [live, setLive] = useState(false)
  const [peerNav, setPeerNav] = useState<NavState | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const presentRef = useRef(present)
  const onNavRef = useRef(onNav)
  const onEndRef = useRef(onEnd)
  const onPeerJoinRef = useRef(onPeerJoin)
  // After an explicit end, ignore the other side's (stale) presence briefly so
  // the "live" flag can't flicker back on before presence teardown propagates.
  const endedAtRef = useRef(0)

  useEffect(() => {
    onNavRef.current = onNav
    onEndRef.current = onEnd
    onPeerJoinRef.current = onPeerJoin
  }, [onNav, onEnd, onPeerJoin])

  // Channel lifecycle — deliberately does NOT depend on `present` so joining
  // (track) doesn't tear down and rebuild the channel.
  useEffect(() => {
    if (!enabled || !studentId) return

    const channel = supabase.channel(`class:${studentId}`, {
      config: { private: PRIVATE_CHANNEL, presence: { key: clientId }, broadcast: { self: false } },
    })
    channelRef.current = channel
    subscribedRef.current = false

    const computePresence = () => {
      const state = channel.presenceState() as Record<
        string,
        Array<{ role?: ClassRole; paraNumber?: number; page?: number }>
      >
      let otherPresent = false
      let nav: NavState | null = null
      for (const key of Object.keys(state)) {
        for (const p of state[key]) {
          if (p.role && p.role !== role) {
            otherPresent = true
            if (typeof p.paraNumber === "number" && typeof p.page === "number") {
              nav = { paraNumber: p.paraNumber, page: p.page }
            }
          }
        }
      }
      // Ignore stale presence for a moment after an explicit end.
      if (otherPresent && Date.now() - endedAtRef.current < 4000) {
        otherPresent = false
        nav = null
      }
      setLive(otherPresent)
      setPeerNav(nav)
    }

    channel
      .on("presence", { event: "sync" }, computePresence)
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const others = (newPresences as Array<{ role?: ClassRole }>).some(
          (p) => p.role && p.role !== role
        )
        if (others) onPeerJoinRef.current?.()
      })
      .on("broadcast", { event: "nav" }, ({ payload }) => {
        if (!payload || (payload as { by?: string }).by === clientId) return
        const { paraNumber, page } = payload as NavState
        if (typeof paraNumber === "number" && typeof page === "number") {
          onNavRef.current?.({ paraNumber, page })
        }
      })
      .on("broadcast", { event: "end" }, ({ payload }) => {
        if (payload && (payload as { by?: string }).by === clientId) return
        endedAtRef.current = Date.now()
        setLive(false)
        setPeerNav(null)
        onEndRef.current?.()
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true
          if (presentRef.current) channel.track({ role })
        }
      })

    return () => {
      subscribedRef.current = false
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [studentId, role, enabled, clientId])

  // Present toggle — track/untrack on the existing channel.
  useEffect(() => {
    presentRef.current = present
    const ch = channelRef.current
    if (!ch || !subscribedRef.current) return
    if (present) ch.track({ role })
    else ch.untrack().catch(() => {})
  }, [present, role])

  const sendNav = useCallback(
    (nav: NavState) => {
      const ch = channelRef.current
      if (!ch) return
      ch.send({ type: "broadcast", event: "nav", payload: { ...nav, by: clientId } })
      ch.track({ role, paraNumber: nav.paraNumber, page: nav.page })
    },
    [clientId, role]
  )

  const endClass = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "end", payload: { by: clientId } })
  }, [clientId])

  return { live, peerNav, sendNav, endClass }
}
