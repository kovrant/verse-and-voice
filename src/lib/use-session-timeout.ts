"use client"

import { useEffect } from "react"

import { getCurrentAuthUser } from "@/lib/use-current-user"
import { supabase } from "@/lib/supabase"

// Hard cap on how long a student may stay logged in. Supabase refresh tokens
// would otherwise keep a session alive indefinitely, so we anchor a login start
// time and sign the student out once this elapses.
export const MAX_SESSION_MS = 3 * 60 * 60 * 1000 // 3 hours

const PREFIX = "qa:sessionStart:"
const keyFor = (userId: string) => `${PREFIX}${userId}`

/** Pure: ms left before the session must end. <= 0 means it's already expired. */
export function msUntilExpiry(startMs: number, now: number, maxMs = MAX_SESSION_MS): number {
  return startMs + maxMs - now
}

/** Pure: pick the session anchor — fresh login always resets the 3h window. */
export function resolveSessionStartMs(
  storedRaw: string | null,
  now: number,
  opts: { freshLogin?: boolean; maxMs?: number } = {},
): { start: number } | { expired: true } {
  const maxMs = opts.maxMs ?? MAX_SESSION_MS
  const stored = storedRaw != null ? Number(storedRaw) : NaN
  if (opts.freshLogin || !storedRaw || Number.isNaN(stored)) return { start: now }
  if (msUntilExpiry(stored, now, maxMs) <= 0) return { expired: true }
  return { start: stored }
}

function clearAllStarts() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX)) localStorage.removeItem(k)
  }
}

/**
 * Caps a student's logged-in time at MAX_SESSION_MS. The start time lives in
 * localStorage so it survives reloads (a refresh can't reset the clock); we
 * schedule a sign-out for whatever time is left, and enforce immediately if the
 * window already passed. Client-cooperative, like the rest of the portal — the
 * StudentLayout auth listener handles the redirect to /login on sign-out.
 *
 * ponytail: localStorage anchor is per-browser — clearing site data resets the
 * clock. Acceptable for a trusted student portal; a server-enforced timebox
 * (Supabase session settings) would be the upgrade, but that's project-global
 * and would also cap teachers.
 */
export function useSessionTimeout() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const disarm = () => {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }

    const endSession = () => {
      clearAllStarts()
      supabase.auth.signOut().catch(() => {})
    }

    const arm = async (freshLogin = false) => {
      disarm()
      const user = await getCurrentAuthUser()
      if (cancelled || !user) return

      const k = keyFor(user.id)
      const resolved = resolveSessionStartMs(localStorage.getItem(k), Date.now(), { freshLogin })
      if ("expired" in resolved) {
        endSession()
        return
      }
      localStorage.setItem(k, String(resolved.start))
      timer = setTimeout(endSession, msUntilExpiry(resolved.start, Date.now()))
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        disarm()
        clearAllStarts()
      } else if (event === "SIGNED_IN") {
        void arm(true)
      } else if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void arm(false)
      }
    })

    return () => {
      cancelled = true
      disarm()
      sub.subscription.unsubscribe()
    }
  }, [])
}
