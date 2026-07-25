"use client"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser } from "@/lib/use-current-user"
import type { StudentStatus } from "@/lib/utils"

export interface StudentRecord {
  id: string
  name: string
  guardian_name: string
  country: string | null
  started_at: string
  ended_at: string | null
  status: StudentStatus
  fee: number
  fee_currency: string
  class_time: string | null
  /** 0=Sun … 6=Sat. Empty/null = teacher hasn't configured days yet. */
  class_days: number[] | null
  created_at: string
}

interface StudentContext {
  student: StudentRecord | null
  username: string | null
  loading: boolean
  error: string | null
}

/**
 * Resolves the logged-in student's own record. RLS scopes every query to the
 * student's own rows, so the `students` select can only ever return their row.
 * Used by all /student portal pages.
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

    async function load() {
      const user = await getCurrentAuthUser()

      if (!user) {
        if (active)
          setState({ student: null, username: null, loading: false, error: "Not signed in" })
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("student_id, username")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile?.student_id) {
        if (active)
          setState({
            student: null,
            username: profile?.username ?? null,
            loading: false,
            error: "No student record is linked to this account.",
          })
        return
      }

      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", profile.student_id)
        .maybeSingle()

      if (active)
        setState({
          student: (student as StudentRecord) ?? null,
          username: profile.username ?? null,
          loading: false,
          error: error?.message ?? null,
        })
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return state
}
