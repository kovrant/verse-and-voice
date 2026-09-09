"use client"

import type { RealtimeChannel } from "@supabase/supabase-js"
import { useCallback, useEffect, useRef, useState } from "react"

import { supabase } from "@/lib/supabase"
import { ensureRealtimeAuth } from "@/lib/use-current-user"

export interface NavState {
  paraNumber: number
  page: number
}

type ClassRole = "teacher" | "student"

export interface PeerDevice {
  label: string
  type: "tablet" | "laptop" | "mobile" | "desktop"
}

interface UseClassChannelOptions {
  /** The student the class belongs to — the channel key. */
  studentId: string | null | undefined
  /** This client's role. "live" reflects whether the *other* role is present. */
  role: ClassRole
  /** Optional device info to advertise in presence. */
  deviceInfo?: { label: string; type: "tablet" | "laptop" | "mobile" | "desktop" } | null
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
  /** Fired when the other party scrolls within the page (0..1 ratio). Echoes filtered. */
  onScroll?: (ratio: number) => void
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
  /** The other role's detected device (e.g. iPad (10.9"), MacBook, iPhone). */
  peerDevice: PeerDevice | null
  /** Broadcast this client's position + update its presence. */
  sendNav: (nav: NavState) => void
  /** Broadcast this client's in-page scroll ratio (0..1). Lightweight — no presence write. */
  sendScroll: (ratio: number) => void
  /** Broadcast an explicit "class ended" signal and leave presence immediately. */
  endClass: () => Promise<void>
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
  deviceInfo,
  enabled = true,
  present = true,
  onNav,
  onScroll,
  onEnd,
  onPeerJoin,
}: UseClassChannelOptions): ClassChannel {
  const [clientId] = useState(genId)
  const [live, setLive] = useState(false)
  const [peerNav, setPeerNav] = useState<NavState | null>(null)
  const [peerDevice, setPeerDevice] = useState<PeerDevice | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const presentRef = useRef(present)
  const onNavRef = useRef(onNav)
  const onScrollRef = useRef(onScroll)
  const onEndRef = useRef(onEnd)
  const onPeerJoinRef = useRef(onPeerJoin)
  // After an explicit end, ignore stale teacher presence until they join again.
  const classEndedRef = useRef(false)

  useEffect(() => {
    onNavRef.current = onNav
    onScrollRef.current = onScroll
    onEndRef.current = onEnd
    onPeerJoinRef.current = onPeerJoin
  }, [onNav, onScroll, onEnd, onPeerJoin])

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
        Array<{ role?: ClassRole; paraNumber?: number; page?: number; device?: string; deviceType?: PeerDevice["type"] }>
      >
      let otherPresent = false
      let nav: NavState | null = null
      let otherDevice: PeerDevice | null = null
      for (const key of Object.keys(state)) {
        for (const p of state[key]) {
          if (p.role && p.role !== role) {
            otherPresent = true
            if (typeof p.paraNumber === "number" && typeof p.page === "number") {
              nav = { paraNumber: p.paraNumber, page: p.page }
            }
            if (p.device) {
              otherDevice = { label: p.device, type: p.deviceType || "tablet" }
            }
          }
        }
      }
      // Stale presence can linger after end — only trust it again after a fresh join.
      if (classEndedRef.current) {
        otherPresent = false
        nav = null
        otherDevice = null
      }
      setLive(otherPresent)
      setPeerNav(nav)
      setPeerDevice(otherDevice)
    }

    channel
      .on("presence", { event: "sync" }, computePresence)
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const others = (newPresences as Array<{ role?: ClassRole }>).some(
          (p) => p.role && p.role !== role,
        )
        if (others) {
          classEndedRef.current = false
          onPeerJoinRef.current?.()
        }
      })
      .on("broadcast", { event: "nav" }, ({ payload }) => {
        if (!payload || (payload as { by?: string }).by === clientId) return
        const { paraNumber, page } = payload as NavState
        if (typeof paraNumber === "number" && typeof page === "number") {
          onNavRef.current?.({ paraNumber, page })
        }
      })
      .on("broadcast", { event: "scroll" }, ({ payload }) => {
        if (!payload || (payload as { by?: string }).by === clientId) return
        const { ratio } = payload as { ratio?: number }
        if (typeof ratio === "number") onScrollRef.current?.(ratio)
      })
      .on("broadcast", { event: "end" }, ({ payload }) => {
        if (payload && (payload as { by?: string }).by === clientId) return
        classEndedRef.current = true
        setLive(false)
        setPeerNav(null)
        onEndRef.current?.()
      })

    // Guard the (possibly deferred) subscribe against this effect being torn
    // down first — otherwise React 18 StrictMode's mount→unmount→mount in dev
    // runs cleanup before the async setAuth resolves, and we'd subscribe a
    // channel that was already removed (a zombie that flickers presence).
    let cancelled = false
    const doSubscribe = () => {
      if (cancelled) return
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true
          if (presentRef.current) {
            channel.track({
              role,
              device: deviceInfo?.label,
              deviceType: deviceInfo?.type,
            })
          }
        }
      })
    }

    // Private channels run RLS on realtime.messages, which needs the user's JWT
    // on the socket. setAuth() (no arg → current session token) attaches it
    // before subscribe; without it the server denies the subscription silently.
    if (PRIVATE_CHANNEL) {
      ensureRealtimeAuth().then(doSubscribe).catch(doSubscribe)
    } else {
      doSubscribe()
    }

    return () => {
      cancelled = true
      subscribedRef.current = false
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [studentId, role, enabled, clientId, deviceInfo])

  // Present toggle — track/untrack on the existing channel.
  useEffect(() => {
    presentRef.current = present
    const ch = channelRef.current
    if (!ch || !subscribedRef.current) return
    if (present) {
      ch.track({
        role,
        device: deviceInfo?.label,
        deviceType: deviceInfo?.type,
      })
    } else {
      ch.untrack().catch(() => {})
    }
  }, [present, role, deviceInfo])

  const sendNav = useCallback(
    (nav: NavState) => {
      const ch = channelRef.current
      // Guard: sending / tracking before the channel is joined throws
      // "tried to push … before joining". Silently no-op until subscribed.
      if (!ch || !subscribedRef.current) return
      ch.send({ type: "broadcast", event: "nav", payload: { ...nav, by: clientId } })
      ch.track({
        role,
        paraNumber: nav.paraNumber,
        page: nav.page,
        device: deviceInfo?.label,
        deviceType: deviceInfo?.type,
      }).catch(() => {})
    },
    [clientId, role, deviceInfo],
  )

  const sendScroll = useCallback(
    (ratio: number) => {
      const ch = channelRef.current
      if (!ch || !subscribedRef.current) return
      ch.send({ type: "broadcast", event: "scroll", payload: { ratio, by: clientId } })
    },
    [clientId],
  )

  const endClass = useCallback(async () => {
    const ch = channelRef.current
    if (!ch || !subscribedRef.current) return
    try {
      await ch.send({ type: "broadcast", event: "end", payload: { by: clientId } })
    } catch {
      // Best-effort — untrack below still signals leave via presence.
    }
    await ch.untrack().catch(() => {})
  }, [clientId])

  return { live, peerNav, peerDevice, sendNav, sendScroll, endClass }
}
