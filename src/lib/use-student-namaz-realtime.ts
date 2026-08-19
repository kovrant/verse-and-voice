"use client"

import { useEffect } from "react"

import { supabase } from "@/lib/supabase"
import { ensureRealtimeAuth } from "@/lib/use-current-user"

/**
 * Live Namaz progress for a student — teacher unlocks, completions, and part
 * revisions arrive over Supabase Realtime (Postgres Changes on websockets).
 * Same pattern as memorization chunk updates.
 */
export function useStudentNamazRealtime(
  studentId: string | null | undefined,
  onChange: () => void,
  /** Unique per mount site — supabase-js reuses channels by topic. */
  scope: string,
) {
  useEffect(() => {
    if (!studentId) return
    let t: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      if (t) clearTimeout(t)
      t = setTimeout(onChange, 400)
    }
    const filter = `student_id=eq.${studentId}`
    const channel = supabase
      .channel(`namaz:${scope}:${studentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_namaz", filter },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_namaz_steps", filter },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_namaz_parts", filter },
        refresh,
      )
    // RLS on postgres_changes is evaluated with the user's JWT — attach it first.
    void ensureRealtimeAuth().finally(() => channel.subscribe())
    return () => {
      if (t) clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [studentId, onChange, scope])
}
