"use client"

import { useCallback, useEffect, useState } from "react"

import { getStudentStage, type QuranRound } from "@/components/quran-progress"
import { supabase } from "@/lib/supabase"
import { useStudentNamazRealtime } from "@/lib/use-student-namaz-realtime"

/**
 * Shared state for the student portal's navigation (bottom tab bar / rail and
 * the home cards). Kids get one "Read" destination: Qaida while they're on a
 * Qaida round, the Quran otherwise.
 */

/** The kid "crayon box" colours (CSS vars `--kid-<name>` in globals.css). */
export type KidColor =
  "sage" | "sky" | "lavender" | "caramel" | "coral" | "saffron" | "teal" | "rose"

/** Pages that live under the "Me" tab (parent-facing / bookkeeping). */
export const ME_PATHS = [
  "/student/me",
  "/student/progress",
  "/student/classes",
  "/student/attendance",
  "/student/notifications",
  "/student/fees",
]

export function isPathActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

/** Does this student have a Namaz plan assigned? Live-updates when the teacher assigns one. */
export function useHasNamaz(studentId: string | null | undefined, scope: string) {
  const [hasNamaz, setHasNamaz] = useState(false)

  const refresh = useCallback(() => {
    if (!studentId) {
      setHasNamaz(false)
      return
    }
    void supabase
      .from("student_namaz")
      .select("id")
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data }) => setHasNamaz(!!data))
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useStudentNamazRealtime(studentId, refresh, scope)

  return hasNamaz
}

/** Is the student's active round a Qaida round? */
export function useIsQaida(studentId: string | null | undefined) {
  const [isQaida, setIsQaida] = useState(false)

  useEffect(() => {
    if (!studentId) return
    void supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", studentId)
      .then(({ data }) => setIsQaida(getStudentStage((data as QuranRound[]) || []).isQaida))
  }, [studentId])

  return isQaida
}

export function readDestination(isQaida: boolean) {
  return isQaida
    ? { href: "/student/qaida", label: "Qaida" }
    : { href: "/student/quran", label: "Quran" }
}
