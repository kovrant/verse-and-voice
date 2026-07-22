"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, BookMarked, Trophy } from "lucide-react"

export interface QuranRound {
  id: string
  student_id: string
  type: "qaida" | "quran"
  round_number: number
  started_at: string
  completed_at: string | null
  desc_completed: number
  asc_completed: number
}

interface QuranProgressProps {
  rounds: QuranRound[]
  variant?: "compact" | "card" | "full"
}

/**
 * Get the active (in-progress) round — the LATEST one without completed_at.
 * `rounds` may arrive in any order, so we explicitly pick the most recent by
 * started_at (then round_number) rather than relying on array position.
 */
export function getActiveRound(rounds: QuranRound[]): QuranRound | null {
  const incomplete = rounds.filter((r) => !r.completed_at)
  if (incomplete.length === 0) return null
  return incomplete.reduce((latest, r) => {
    const cmp = r.started_at.localeCompare(latest.started_at)
    if (cmp > 0) return r
    if (cmp === 0 && r.round_number > latest.round_number) return r
    return latest
  })
}

/**
 * Get completed rounds sorted by round_number.
 */
export function getCompletedRounds(rounds: QuranRound[]): QuranRound[] {
  return rounds
    .filter((r) => r.completed_at)
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
}

/**
 * Determine what stage the student is at based on rounds.
 */
export function getStudentStage(rounds: QuranRound[]): {
  isQaida: boolean
  activeRound: QuranRound | null
  completedQuranCount: number
  completedQaidaCount: number
} {
  const active = getActiveRound(rounds)
  const completedQuran = rounds.filter((r) => r.type === "quran" && r.completed_at)
  const completedQaida = rounds.filter((r) => r.type === "qaida" && r.completed_at)
  const isQaida = active?.type === "qaida"

  return {
    isQaida,
    activeRound: active,
    completedQuranCount: completedQuran.length,
    completedQaidaCount: completedQaida.length,
  }
}

/**
 * Get the chronological round number for a quran round.
 * Completed rounds are numbered first (by started_at), active rounds get the next number.
 */
export function getChronologicalRoundNumber(rounds: QuranRound[], round: QuranRound): number {
  const quranRounds = rounds
    .filter((r) => r.type === "quran")
    .sort((a, b) => {
      // Completed rounds first, then active
      const aActive = !a.completed_at ? 1 : 0
      const bActive = !b.completed_at ? 1 : 0
      if (aActive !== bActive) return aActive - bActive
      return a.started_at.localeCompare(b.started_at)
    })
  const idx = quranRounds.findIndex((r) => r.id === round.id)
  return idx >= 0 ? idx + 1 : round.round_number
}

/**
 * Compute current para and total from desc/asc progress.
 */
export function computeProgress(desc: number, asc: number) {
  const completedFromAsc = asc > 0 ? asc - 1 : 0
  const total = desc + completedFromAsc
  const isCompleted = total >= 30

  let currentPara: number | null = null
  if (!isCompleted && asc > 0) {
    currentPara = asc
  }

  return { currentPara, total, isCompleted }
}

export function QuranProgress({ rounds, variant = "compact" }: QuranProgressProps) {
  const { isQaida, activeRound, completedQuranCount } = getStudentStage(rounds)
  const desc = activeRound?.desc_completed || 0
  const asc = activeRound?.asc_completed || 0
  const { currentPara, total, isCompleted } = computeProgress(desc, asc)
  const progress = (total / 30) * 100
  const activeRoundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 1

  if (variant === "compact") {
    if (rounds.length === 0) {
      return <span className="text-muted-foreground/40">--</span>
    }
    if (isQaida) {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 text-amber-400 bg-amber-500/5 gap-1"
        >
          <BookMarked className="h-3 w-3" />
          Norani Qaida
        </Badge>
      )
    }
    if (!activeRound && completedQuranCount > 0) {
      return (
        <Badge variant="success" className="gap-1">
          <Trophy className="h-3 w-3" />
          {completedQuranCount}x Completed
        </Badge>
      )
    }
    if (activeRound && total === 0) {
      return (
        <span className="text-muted-foreground text-sm">
          Quran R{activeRoundNum}
          {completedQuranCount > 0 && (
            <span className="text-emerald-400/60 ml-1">({completedQuranCount}x done)</span>
          )}
        </span>
      )
    }
    return (
      <span className="text-amber-400 font-medium text-sm">
        {currentPara ? `Para ${currentPara}` : `${total}/30`}
        {activeRound && activeRoundNum > 1 && (
          <span className="text-muted-foreground font-normal text-xs ml-1">R{activeRoundNum}</span>
        )}
        <span className="text-muted-foreground font-normal text-xs ml-1">({total}/30)</span>
      </span>
    )
  }

  if (variant === "full") {
    if (rounds.length === 0) {
      return (
        <div className="rounded-[20px] bg-card border border-border p-5 sm:p-6 flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-secondary">
            <BookOpen className="h-5 w-5 text-muted-foreground" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase text-muted-foreground"
              style={{ letterSpacing: "0.08em" }}
            >
              Quran Progress
            </p>
            <p className="text-sm text-muted-foreground">
              No rounds started yet. Add a round to begin tracking.
            </p>
          </div>
        </div>
      )
    }

    if (isQaida) {
      return (
        <div className="rounded-[20px] bg-card border border-border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-secondary">
                <BookMarked className="h-5 w-5 text-muted-foreground" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold uppercase text-muted-foreground"
                  style={{ letterSpacing: "0.08em" }}
                >
                  Learning Stage
                </p>
                <h3 className="text-base font-bold text-foreground truncate">
                  Norani Qaida
                  {activeRound && activeRoundNum > 1 ? (
                    <span className="font-medium text-muted-foreground">
                      {" "}
                      · Round {activeRoundNum}
                    </span>
                  ) : null}
                </h3>
              </div>
            </div>
          </div>
          <p className="text-[13px] mt-3 text-muted-foreground">
            Student is learning the basics through Norani Qaida before starting Quran reading.
          </p>
        </div>
      )
    }

    const headerLabel =
      activeRound && activeRoundNum > 1 ? `Round ${activeRoundNum}` : "Current Round"

    return (
      <div className="rounded-[20px] bg-card border border-border p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-secondary">
              <BookOpen className="h-5 w-5 text-muted-foreground" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase text-muted-foreground"
                style={{ letterSpacing: "0.08em" }}
              >
                Quran Progress
              </p>
              <h3 className="text-base font-bold text-foreground truncate">{headerLabel}</h3>
            </div>
          </div>
          <div className="text-right shrink-0">
            {!activeRound && completedQuranCount > 0 ? (
              <Badge variant="success" className="text-sm px-3 py-1">
                <Trophy className="h-3.5 w-3.5 mr-1" />
                {completedQuranCount}x Completed
              </Badge>
            ) : isCompleted ? (
              <Badge variant="success" className="text-sm px-3 py-1">
                Completed All 30
              </Badge>
            ) : currentPara ? (
              <div className="leading-tight">
                <span className="text-2xl font-extrabold text-emerald-500 tabular-nums">
                  Para {currentPara}
                </span>
                <span className="text-sm font-semibold tabular-nums ml-1.5 text-muted-foreground">
                  / 30
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Not started</span>
            )}
          </div>
        </div>
        {activeRound && (
          <div className="mt-4">
            <Progress value={progress} />
            <div className="flex items-center justify-between text-xs mt-2.5">
              <div className="flex gap-4 text-muted-foreground">
                {desc > 0 && (
                  <span>
                    From end: <span className="font-bold text-foreground tabular-nums">{desc}</span>{" "}
                    paras
                  </span>
                )}
                {asc > 0 && (
                  <span>
                    From start:{" "}
                    <span className="font-bold text-foreground tabular-nums">{asc}</span> paras
                  </span>
                )}
              </div>
              <span className="font-bold text-emerald-500 tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // "card" variant — for the info cards grid
  if (rounds.length === 0) {
    return (
      <>
        <p className="text-2xl font-bold">--</p>
        <p className="text-xs text-muted-foreground mt-1">Not started</p>
      </>
    )
  }

  if (isQaida) {
    return (
      <>
        <p className="text-2xl font-bold text-amber-400">Qaida</p>
        <p className="text-xs text-muted-foreground mt-1">Norani Qaida</p>
      </>
    )
  }

  if (!activeRound && completedQuranCount > 0) {
    return (
      <>
        <p className="text-2xl font-bold text-emerald-400">{completedQuranCount}x</p>
        <p className="text-xs text-muted-foreground mt-1">Quran Completed</p>
      </>
    )
  }

  if (total === 0) {
    return (
      <>
        <p className="text-2xl font-bold">R{activeRoundNum}</p>
        <p className="text-xs text-muted-foreground mt-1">Starting</p>
      </>
    )
  }

  return (
    <>
      <p className="text-2xl font-bold">
        Para <span className="text-amber-400">{currentPara}</span>
      </p>
      <div className="mt-2">
        <Progress value={progress} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {total}/30
        {activeRound && activeRoundNum > 1 && ` · R${activeRoundNum}`}
      </p>
    </>
  )
}
