"use client"

import { useEffect, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { getDashboardProgress, type QuranRound } from "@/components/quran-progress"
import {
  StudentGreeting,
  StudentHomeCards,
  StudentLiveBanner,
} from "@/components/student-home-cards"
import { getHijriToday, ordinalDay } from "@/lib/hijri"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

export default function StudentDashboardPage() {
  const { student, loading, error } = useStudent()
  const [rounds, setRounds] = useState<QuranRound[]>([])

  useEffect(() => {
    if (!student) return
    supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", student.id)
      .order("started_at", { ascending: true })
      .then(({ data }) => setRounds((data as QuranRound[]) || []))
  }, [student])

  if (loading) return <PageLoading variant="student-home" student />

  if (error || !student) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">🙈</div>
        <p className="mb-1 font-bold">We couldn&apos;t load your profile</p>
        <p className="text-sm text-muted-foreground">{error || "Please contact your teacher."}</p>
      </div>
    )
  }

  // ── Real progress data ──
  const { isQaida, allQuranDone, khatms, heroPara, heroTotal } = getDashboardProgress(rounds)
  const hijri = getHijriToday()

  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in-up text-foreground">
      <StudentGreeting
        name={student.name.split(" ")[0]}
        subtitle={`${ordinalDay(hijri.day)} ${hijri.monthInfo.name} · ${
          isQaida
            ? "Ready to learn your letters?"
            : allQuranDone
              ? "MashaAllah, Quran complete!"
              : `Ready for Para ${heroPara}?`
        }`}
      />
      <StudentLiveBanner />
      <StudentHomeCards
        studentId={student.id}
        isQaida={isQaida}
        readStatus={
          isQaida ? "Norani Qaida" : allQuranDone ? `${khatms}× khatm` : `Para ${heroPara} of 30`
        }
        readRing={isQaida ? undefined : { value: heroTotal / 30, label: heroPara }}
        classTime={student.class_time}
        classDays={student.class_days}
      />
    </div>
  )
}
