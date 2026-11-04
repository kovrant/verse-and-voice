"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

export interface CurrentUser {
  id: string
  email: string | null
  username: string | null
  role: string | null
}

// ── Shared, deduped auth source ──────────────────────────────────────────────
// Every component that needs the current user reads through here, so there's
// only ever ONE auth read in flight. Multiple concurrent supabase.auth.getUser()
// calls race for the auth-token Web Lock and the loser's promise rejects with
// "Lock … was released because another request stole it" — deduping avoids that.

let cached: User | null | undefined = undefined
let inflight: Promise<User | null> | null = null

async function loadUser(): Promise<User | null> {
  ensureAuthListener()
  if (cached !== undefined && !inflight) return cached
  if (!inflight) {
    // getSession() reads from local storage (no network round-trip), which keeps
    // the lock held for the shortest possible time. Security is still enforced
    // server-side by middleware + RLS; this is only for display/scoping.
    inflight = supabase.auth
      .getSession()
      .then(({ data }) => {
        const user = data.session?.user ?? null
        // Don't clobber a fresher seedAuthUser() from a concurrent sign-in.
        if (cached === undefined) cached = user
        return cached ?? user
      })
      .catch(() => cached ?? null) // swallow stolen-lock / transient errors
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

let setAuthInflight: Promise<void> | null = null

/** Deduped Realtime JWT attach — every channel subscribe can call this safely. */
export function ensureRealtimeAuth(): Promise<void> {
  if (!setAuthInflight) {
    setAuthInflight = supabase.realtime
      .setAuth()
      .catch(() => {})
      .finally(() => {
        setAuthInflight = null
      })
  }
  return setAuthInflight
}

/**
 * A private channel said "Unauthorized": the socket is on the anon key, not
 * the user's login (Mahad, 3 Nov 2026 — retries kept re-sending the same
 * anon token until he signed out and in). Force a session refresh and put the
 * fresh token on the socket. False when there's no usable login left.
 */
export async function renewRealtimeAuth(): Promise<boolean> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
  const result = await Promise.race([supabase.auth.refreshSession().catch(() => null), timeout])
  const token = result?.data.session?.access_token
  if (!token) return false
  await supabase.realtime.setAuth(token).catch(() => {})
  return true
}

/** Seed the auth cache after sign-in so nothing else needs to touch the lock. */
export function seedAuthUser(user: User | null) {
  cached = user
}

/**
 * Drop a stale/broken local session before signInWithPassword. A dead refresh
 * token holds the auth Web Lock (and middleware logs "Refresh Token Not Found");
 * the login page then hangs on "Signing in…" or bounces back to /login.
 */
export async function prepareForPasswordSignIn() {
  inflight = null
  cached = undefined
  await supabase.auth.signOut({ scope: "local" }).catch(() => {})
}

// Keep the cache fresh from auth events instead of re-calling getUser().
// Lazy: importing this module on /login used to subscribe immediately, and
// INITIAL_SESSION's token refresh stole the lock from signInWithPassword.
let listening = false
function ensureAuthListener() {
  if (listening || typeof window === "undefined") return
  listening = true
  supabase.auth.onAuthStateChange((_event, session) => {
    cached = session?.user ?? null
  })
}

export async function getCurrentAuthUser(): Promise<User | null> {
  return loadUser()
}

function toCurrentUser(u: User | null): CurrentUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? null,
    username: (u.user_metadata as { username?: string } | null)?.username ?? null,
    role: (u.app_metadata as { role?: string } | null)?.role ?? null,
  }
}

/**
 * The live auth identity for this browser session. Used by the sidebars/top bar
 * to show "signed in as …". Deduped so concurrent callers share one auth read.
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let active = true
    loadUser().then((u) => {
      if (active) setUser(toCurrentUser(u))
    })
    return () => {
      active = false
    }
  }, [])

  return user
}
