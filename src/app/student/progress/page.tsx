"use client"

import { format } from "date-fns"
import { useEffect, useState } from "react"

import { KidCard, KidEmpty, KidPageHeader, KidStat, QaidaLettersIcon } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import {
  computeProgress,
  getChronologicalRoundNumber,
  getDashboardProgress,
  getStudentStage,
  type QuranRound,
} from "@/components/quran-progress"
import { QuranStones } from "@/components/quran-stones"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn, parseLocalDate } from "@/lib/utils"

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

  if (loading || loadingRounds) return <PageLoading variant="student-simple" student />

  // Active rounds first, then most recent.
  const sorted = [...rounds].sort((a, b) => {
    const aActive = !a.completed_at ? 1 : 0
    const bActive = !b.completed_at ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return b.started_at.localeCompare(a.started_at)
  })
  const { isQaida, allQuranDone, khatms, heroPara } = getDashboardProgress(rounds)
  const { activeRound } = getStudentStage(rounds)
  const desc = activeRound?.desc_completed || 0
  const asc = activeRound?.asc_completed || 0
  const { total, isCompleted } = computeProgress(desc, asc)
  const finished = isCompleted || allQuranDone
  const pct = finished ? 100 : Math.round((total / 30) * 100)
  const quranRoundCount = rounds.filter((r) => r.type === "quran").length

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🗺️"
        color="sky"
        title="My progress"
        subtitle="Look how far you have come — MashaAllah ✨"
      />

      {rounds.length === 0 ? (
        <KidEmpty
          title="Your journey starts soon"
          text="When your teacher opens your Qaida or Quran round, everything you finish will show up right here."
        />
      ) : (
        <>
          {/* Where the student is right now */}
          {isQaida ? (
            <KidCard color="sky" className="mb-6">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                Right now
              </p>
              <p className="mt-1 font-heading text-[28px] font-bold leading-tight text-primary">
                Norani Qaida
              </p>
              <p className="mt-2 text-[14.5px] font-semibold text-foreground/85">
                You are learning your letters and sounds. Every reader of the Quran starts here!
              </p>
            </KidCard>
          ) : (
            <KidCard color="sky" className="mb-6">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                    Right now
                  </p>
                  <p className="mt-1 font-heading text-[30px] font-bold leading-none text-primary sm:text-[34px]">
                    {finished ? (
                      "All 30 paras! 🎉"
                    ) : (
                      <>
                        Para <span className="tabular-nums">{heroPara}</span>
                        <span className="text-[20px] font-bold text-muted-foreground"> / 30</span>
                      </>
                    )}
                  </p>
                </div>
                <span className="font-heading text-[24px] font-bold tabular-nums text-primary">
                  {pct}%
                </span>
              </div>

              <div className="mt-3 h-3.5 overflow-hidden rounded-full bg-[hsl(var(--kid-sky)/0.28)]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--kid-sky))] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {(desc > 0 || asc > 0) && (
                <p className="mt-2.5 text-[13.5px] font-semibold text-foreground/85">
                  {desc > 0 ? `${desc} para${desc === 1 ? "" : "s"} from the end` : null}
                  {desc > 0 && asc > 0 ? " · " : null}
                  {asc > 0 ? `${asc} para${asc === 1 ? "" : "s"} from the start` : null}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2.5">
                <KidStat emoji="📖" value={`${total}/30`} label="Paras done" color="sage" />
                <KidStat emoji="🏆" value={khatms} label="Quran finished" color="saffron" />
                <KidStat emoji="🔁" value={quranRoundCount} label="Quran rounds" color="sky" />
              </div>
            </KidCard>
          )}

          {!isQaida && (
            /* Winding para path. The tall variant is swapped in by CSS so the right
               size is there on first paint; the wrapper carries the accessible name. */
            <KidCard className="mb-6">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-[22px] font-bold text-primary">
                  Your Quran journey
                </h2>
                <span className="font-heading text-[18px] font-bold text-muted-foreground">
                  Para {heroPara} / 30
                </span>
              </div>
              <div
                className="rounded-2xl bg-[hsl(var(--surface-alt))] px-3 pb-4 pt-7 sm:px-4"
                role="img"
                aria-label={`Quran journey — para ${heroPara} of 30, ${heroPara - 1} finished`}
              >
                <QuranStones done={heroPara} total={30} studentId={student?.id} />
              </div>
            </KidCard>
          )}

          <div className="mb-3 flex items-center gap-2.5">
            <span aria-hidden className="text-[22px] leading-none">
              📚
            </span>
            <h2 className="font-heading text-[22px] font-bold text-primary">All my rounds</h2>
          </div>
          <div className="space-y-3">
            {sorted.map((r) => {
              const isActive = !r.completed_at
              const completedFromAsc = r.asc_completed > 0 ? r.asc_completed - 1 : 0
              const roundTotal = r.type === "quran" ? r.desc_completed + completedFromAsc : 0
              const roundPct = Math.min(100, Math.round((roundTotal / 30) * 100))
              const chronologicalNum = getChronologicalRoundNumber(rounds, r)
              // Active = sky (same colour as this page), finished = sage.
              const tone = isActive ? "sky" : "sage"

              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3.5 rounded-[22px] border-[1.5px] p-3",
                    isActive
                      ? "border-[hsl(var(--kid-sky)/0.45)] shadow-[0_4px_0_hsl(var(--kid-sky)/0.5)]"
                      : "border-[hsl(var(--kid-sage)/0.45)] shadow-[0_4px_0_hsl(var(--kid-sage)/0.5)]",
                  )}
                  style={{
                    background: `linear-gradient(160deg, hsl(var(--kid-${tone}) / 0.2), hsl(var(--kid-${tone}) / 0.07)), hsl(var(--card))`,
                  }}
                >
                  <span
                    aria-hidden
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px] text-[24px]"
                    style={{ background: `hsl(var(--kid-${tone}) / 0.35)` }}
                  >
                    {r.type === "qaida" ? (
                      <QaidaLettersIcon className="text-[19px]" />
                    ) : isActive ? (
                      "📖"
                    ) : (
                      "🏆"
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-[18px] font-bold leading-tight text-primary">
                        {r.type === "qaida" ? "Norani Qaida" : `Quran round ${chronologicalNum}`}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-accent-foreground">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-foreground/80" />
                          Now
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] font-semibold text-foreground/85">
                      {format(parseLocalDate(r.started_at) ?? new Date(), "MMM yyyy")} →{" "}
                      {r.completed_at
                        ? format(parseLocalDate(r.completed_at) ?? new Date(), "MMM yyyy")
                        : "now"}
                    </p>
                    {r.type === "quran" && (
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-card/70">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${roundPct}%`,
                            background: `hsl(var(--kid-${tone}))`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {r.type === "quran" && (
                    <span className="flex-shrink-0 font-heading text-[15px] font-bold tabular-nums text-foreground/85">
                      {roundTotal}/30
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
