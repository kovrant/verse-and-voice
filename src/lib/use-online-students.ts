"use client"

import { useEffect, useState } from "react"
import { toast } from "@/lib/toast"

import { supabase } from "@/lib/supabase"

// Live "who's online" for students, over Supabase Realtime Presence.
//
// A student advertises itself on a shared presence channel while the portal tab
// is open; teachers observe the same channel to see who's currently logged in.
// This is ephemeral (like the live-class channel) — closing the tab drops the
// presence, so "online" means "has the app open right now".
//
// The same channel also carries a "force sign out" broadcast: a teacher can
// kick an online student's session, which lands only while their tab is open.

const ONLINE_TOPIC = "students:online"
const FORCE_SIGNOUT_EVENT = "force-signout"

/** Pure targeting: should THIS student act on a force-signout broadcast? */
export function shouldForceSignOut(
  payload: { studentId?: string } | null | undefined,
  myStudentId: string,
): boolean {
  return !!payload && payload.studentId === myStudentId
}

/** Student side — advertise this student as online while mounted. No-op if no id. */
export function useTrackStudentOnline(studentId: string | null | undefined) {
  useEffect(() => {
    if (!studentId) return

    const channel = supabase.channel(ONLINE_TOPIC, {
      config: { presence: { key: studentId } },
    })
    channel
      .on("broadcast", { event: FORCE_SIGNOUT_EVENT }, ({ payload }) => {
        if (!shouldForceSignOut(payload as { studentId?: string }, studentId)) return
        toast("You were signed out by your teacher.")
        // Global scope revokes this student's refresh tokens server-side too;
        // the student layout's onAuthStateChange handles the redirect to /login.
        supabase.auth.signOut({ scope: "global" }).catch(() => {})
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ studentId }).catch(() => {})
      })

    return () => {
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
    }
  }, [studentId])
}

/**
 * Teacher side — kick an online student by broadcasting a force-signout on the
 * shared presence channel. The student's open tab runs a GLOBAL signOut. Only
 * lands while the student has the portal open (no offline/admin revoke here).
 */
export async function forceSignOutStudent(studentId: string): Promise<void> {
  // Reuse the teacher presence channel when it exists — supabase-js dedupes by
  // topic, and removeChannel() on a shared ref would drop the dashboard listener.
  ensureTeacherChannel()
  const channel = teacherChannel!
  const res = await channel.httpSend(FORCE_SIGNOUT_EVENT, { studentId })
  if (!res.success) throw new Error("Realtime broadcast failed")
}

/** Teacher side — the set of student ids currently online (listen-only). */
type OnlineListener = (ids: Set<string>) => void

let teacherChannel: ReturnType<typeof supabase.channel> | null = null
let teacherListeners = new Set<OnlineListener>()
let teacherOnlineIds = new Set<string>()

function readPresenceIds(channel: NonNullable<typeof teacherChannel>): Set<string> {
  const state = channel.presenceState() as Record<string, Array<{ studentId?: string }>>
  const ids = new Set<string>()
  for (const key of Object.keys(state)) {
    for (const p of state[key]) if (p.studentId) ids.add(p.studentId)
  }
  return ids
}

function broadcastOnlineIds() {
  if (!teacherChannel) return
  teacherOnlineIds = readPresenceIds(teacherChannel)
  for (const fn of teacherListeners) fn(teacherOnlineIds)
}

function ensureTeacherChannel() {
  if (teacherChannel) return
  teacherChannel = supabase.channel(ONLINE_TOPIC)
  teacherChannel
    .on("presence", { event: "sync" }, broadcastOnlineIds)
    .on("presence", { event: "join" }, broadcastOnlineIds)
    .on("presence", { event: "leave" }, broadcastOnlineIds)
    .subscribe()
}

function subscribeOnline(listener: OnlineListener) {
  ensureTeacherChannel()
  listener(teacherOnlineIds)
  teacherListeners.add(listener)
}

function unsubscribeOnline(listener: OnlineListener) {
  teacherListeners.delete(listener)
  if (teacherListeners.size === 0 && teacherChannel) {
    supabase.removeChannel(teacherChannel)
    teacherChannel = null
    teacherOnlineIds = new Set()
  }
}

export function useOnlineStudents(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(() => new Set(teacherOnlineIds))

  useEffect(() => {
    const listener: OnlineListener = (ids) => setOnline(new Set(ids))
    subscribeOnline(listener)
    return () => unsubscribeOnline(listener)
  }, [])

  return online
}
