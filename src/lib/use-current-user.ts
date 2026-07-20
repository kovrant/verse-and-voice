"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

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
  if (cached !== undefined) return cached
  if (!inflight) {
    // getSession() reads from local storage (no network round-trip), which keeps
    // the lock held for the shortest possible time. Security is still enforced
    // server-side by middleware + RLS; this is only for display/scoping.
    inflight = supabase.auth
      .getSession()
      .then(({ data }) => {
        cached = data.session?.user ?? null
        return cached
      })
      .catch(() => null) // swallow stolen-lock / transient errors
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

// Keep the cache fresh from auth events instead of re-calling getUser().
if (typeof window !== "undefined") {
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
