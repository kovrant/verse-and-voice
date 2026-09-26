"use client"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser } from "@/lib/use-current-user"
import type { Student } from "@/lib/utils"

interface StudentContext {
  student: Student | null
  username: string | null
  loading: boolean
  error: string | null
}

type Resolved = Omit<StudentContext, "loading">

// ── Shared, deduped student lookup ───────────────────────────────────────────
// Up to six components call useStudent() on every student page (the page, top
// bar, streak pill, tab bar, live-class and achievement providers). Without
// sharing, each fired its own profiles + students queries: ~12 identical
// requests for one row. Same pattern as the auth cache in use-current-user.ts:
// one in-flight promise, reused by every caller for the same user.
//
// ponytail: a short TTL rather than invalidation, so a teacher's edit (e.g. a
// new class time) shows up within 30 s or on reload. Upgrade path: invalidate
// from a realtime change on `students` if that ever feels slow.
const TTL_MS = 30_000
let cache: { userId: string; at: number; promise: Promise<Resolved> } | null = null

function fetchStudent(userId: string): Promise<Resolved> {
  // One round trip: the student row is embedded through the profiles.student_id
  // foreign key. RLS still applies to the embedded row, so a student can only
  // ever receive their own record.
  return Promise.resolve(
    supabase
      .from("profiles")
      .select("username, student_id, student:students(*)")
      .eq("id", userId)
      .maybeSingle(),
  ).then(({ data, error }) => {
    if (error) return { student: null, username: null, error: error.message }
    const username = (data?.username as string | null) ?? null
    if (!data?.student_id) {
      return { student: null, username, error: "No student record is linked to this account." }
    }
    return { student: (data.student as unknown as Student) ?? null, username, error: null }
  })
}

async function loadStudent(): Promise<Resolved> {
  const user = await getCurrentAuthUser()
  if (!user) return { student: null, username: null, error: "Not signed in" }

  const fresh = cache && cache.userId === user.id && Date.now() - cache.at < TTL_MS
  if (!fresh) {
    const promise = fetchStudent(user.id)
    cache = { userId: user.id, at: Date.now(), promise }
    // Don't keep a failure around: the next caller retries.
    promise.then((r) => {
      if (r.error && cache?.promise === promise) cache = null
    })
  }
  return cache!.promise
}

/**
 * Resolves the logged-in student's own record. RLS scopes every query to the
 * student's own rows, so this can only ever return their row.
 * Used by all /student portal pages; concurrent callers share one request.
 */
export function useStudent(): StudentContext {
  const [state, setState] = useState<StudentContext>({
    student: null,
    username: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    loadStudent().then((r) => {
      if (active) setState({ ...r, loading: false })
    })
    return () => {
      active = false
    }
  }, [])

  return state
}
