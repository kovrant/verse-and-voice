"use client"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

// Live "who's online" for students, over Supabase Realtime Presence.
//
// A student advertises itself on a shared presence channel while the portal tab
// is open; teachers observe the same channel to see who's currently logged in.
// This is ephemeral (like the live-class channel) — closing the tab drops the
// presence, so "online" means "has the app open right now".

const ONLINE_TOPIC = "students:online"

/** Student side — advertise this student as online while mounted. No-op if no id. */
export function useTrackStudentOnline(studentId: string | null | undefined) {
  useEffect(() => {
    if (!studentId) return

    const channel = supabase.channel(ONLINE_TOPIC, {
      config: { presence: { key: studentId } },
    })
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ studentId }).catch(() => {})
    })

    return () => {
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
    }
  }, [studentId])
}

/** Teacher side — the set of student ids currently online (listen-only). */
export function useOnlineStudents(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const channel = supabase.channel(ONLINE_TOPIC)

    const compute = () => {
      const state = channel.presenceState() as Record<string, Array<{ studentId?: string }>>
      const ids = new Set<string>()
      for (const key of Object.keys(state)) {
        for (const p of state[key]) if (p.studentId) ids.add(p.studentId)
      }
      setOnline(ids)
    }

    channel
      .on("presence", { event: "sync" }, compute)
      .on("presence", { event: "join" }, compute)
      .on("presence", { event: "leave" }, compute)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return online
}
