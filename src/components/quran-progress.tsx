"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, BookMarked, Trophy } from "lucide-react"
import { format } from "date-fns"

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
 * Get the active (in-progress) round — the latest one without completed_at.
 */
export function getActiveRound(rounds: QuranRound[]): QuranRound | null {
  return rounds.find(r => !r.completed_at) || null
}

/**
 * Get completed rounds sorted by round_number.
 */
export function getCompletedRounds(rounds: QuranRound[]): QuranRound[] {
  return rounds.filter(r => r.completed_at).sort((a, b) => a.started_at.localeCompare(b.started_at))
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
  const completedQuran = rounds.filter(r => r.type === "quran" && r.completed_at)
  const completedQaida = rounds.filter(r => r.type === "qaida" && r.completed_at)
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
  const quranRounds = rounds.filter(r => r.type === "quran").sort((a, b) => {
    // Completed rounds first, then active
    const aActive = !a.completed_at ? 1 : 0
    const bActive = !b.completed_at ? 1 : 0
    if (aActive !== bActive) return aActive - bActive
    return a.started_at.localeCompare(b.started_at)
  })
  const idx = quranRounds.findIndex(r => r.id === round.id)
  return idx >= 0 ? idx + 1 : round.round_number
}

/**
 * Compute current para and total from desc/asc progress.
 */
function computeProgress(desc: number, asc: number) {
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
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 gap-1">
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
          {completedQuranCount > 0 && <span className="text-emerald-400/60 ml-1">({completedQuranCount}x done)</span>}
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
        <div className="p-5 rounded-2xl bg-secondary/50 border border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-sm">Quran Progress</span>
          </div>
          <p className="text-sm text-muted-foreground">No rounds started yet.</p>
        </div>
      )
    }

    if (isQaida) {
      return (
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-amber-400" />
              <span className="font-semibold text-sm">Learning Stage</span>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-sm px-3 py-1">
              Norani Qaida {activeRound && activeRoundNum > 1 ? `(Round ${activeRoundNum})` : ""}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Student is learning the basics through Norani Qaida before starting Quran reading.
          </p>
          {/* Show completed rounds if any */}
          <RoundHistory rounds={rounds} />
        </div>
      )
    }

    return (
      <div className="p-5 rounded-2xl bg-secondary/50 border border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-sm">
              Quran Progress
              {activeRound && activeRoundNum > 1 && (
                <span className="text-muted-foreground font-normal ml-1">(Round {activeRoundNum})</span>
              )}
            </span>
          </div>
          <div className="text-right">
            {!activeRound && completedQuranCount > 0 ? (
              <Badge variant="success" className="text-sm px-3 py-1">
                <Trophy className="h-3.5 w-3.5 mr-1" />
                {completedQuranCount}x Completed
              </Badge>
            ) : isCompleted ? (
              <Badge variant="success" className="text-sm px-3 py-1">Completed All 30</Badge>
            ) : currentPara ? (
              <span className="text-lg font-bold">
                Para <span className="text-emerald-400">{currentPara}</span>
                <span className="text-sm text-muted-foreground font-normal ml-1.5">({total}/30)</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Not started</span>
            )}
          </div>
        </div>
        {activeRound && (
          <>
            <Progress value={progress} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-3">
                {desc > 0 && (
                  <span>From end: <span className="text-foreground font-semibold">{desc}</span> paras</span>
                )}
                {asc > 0 && (
                  <span>From start: <span className="text-foreground font-semibold">{asc}</span> paras</span>
                )}
              </div>
              <span>{Math.round(progress)}%</span>
            </div>
          </>
        )}
        {/* Show completed rounds */}
        <RoundHistory rounds={rounds} />
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

function RoundHistory({ rounds }: { rounds: QuranRound[] }) {
  const completed = getCompletedRounds(rounds)
  if (completed.length === 0) return null

  return (
    <div className="pt-2 border-t border-border/30 space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">History</p>
      {completed.map(r => (
        <div key={r.id} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 text-[10px] py-0 px-1.5">
            {r.type === "qaida" ? "Qaida" : `Quran R${getChronologicalRoundNumber(rounds, r)}`}
          </Badge>
          <span className="text-muted-foreground">
            {format(new Date(r.started_at), "MMM yyyy")} → {r.completed_at ? format(new Date(r.completed_at), "MMM yyyy") : "..."}
          </span>
        </div>
      ))}
    </div>
  )
}
