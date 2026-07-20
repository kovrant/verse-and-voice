"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { parseLocalDate } from "@/lib/utils"
import {
  QuranProgress,
  type QuranRound,
  getChronologicalRoundNumber,
} from "@/components/quran-progress"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BookOpen, BookMarked, Trophy } from "lucide-react"
import { format } from "date-fns"

export default function StudentProgressPage() {
  const { student, loading } = useStudent()
  const [rounds, setRounds] = useState<QuranRound[]>([])
  const [loadingRounds, setLoadingRounds] = useState(true)

  useEffect(() => {
    if (!student) return
    supabase
      .from("quran_rounds")
      .select("*")
      .eq("student_id", student.id)
      .order("started_at", { ascending: true })
      .then(({ data }) => {
        setRounds((data as QuranRound[]) || [])
        setLoadingRounds(false)
      })
  }, [student])

  if (loading || loadingRounds) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-40 shimmer rounded-2xl" />
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    )
  }

  // Active rounds first, then most recent.
  const sorted = [...rounds].sort((a, b) => {
    const aActive = !a.completed_at ? 1 : 0
    const bActive = !b.completed_at ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return b.started_at.localeCompare(a.started_at)
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-600 flex-shrink-0">
          <BookOpen className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Progress</h1>
          <p className="text-sm text-muted-foreground">Your Quran and Qaida journey ✨</p>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
        <CardContent className="pt-8">
          <QuranProgress rounds={rounds} variant="full" />
        </CardContent>
      </Card>

      {sorted.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            All Rounds
          </p>
          <div className="space-y-2">
            {sorted.map((r) => {
              const isActive = !r.completed_at
              const desc = r.desc_completed
              const asc = r.asc_completed
              const completedFromAsc = asc > 0 ? asc - 1 : 0
              const total = r.type === "quran" ? desc + completedFromAsc : 0
              const prog = (total / 30) * 100
              const chronologicalNum = getChronologicalRoundNumber(rounds, r)
              const Icon =
                r.type === "qaida" ? BookMarked : r.completed_at ? Trophy : BookOpen

              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-card px-4 py-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">
                        {r.type === "qaida" ? "Norani Qaida" : `Quran R${chronologicalNum}`}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary bg-emerald-500/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          Active
                        </span>
                      )}
                      {r.type === "quran" && (
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {total}/30
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5 text-muted-foreground">
                      {format(parseLocalDate(r.started_at) ?? new Date(), "MMM yyyy")} →{" "}
                      {r.completed_at
                        ? format(parseLocalDate(r.completed_at) ?? new Date(), "MMM yyyy")
                        : "Now"}
                    </p>
                  </div>
                  {r.type === "quran" && (
                    <div className="w-20 shrink-0">
                      <Progress value={prog} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No rounds yet</p>
            <p className="text-sm text-muted-foreground">Your progress will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
