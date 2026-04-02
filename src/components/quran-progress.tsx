"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, BookMarked } from "lucide-react"

interface QuranProgressProps {
  isQaida: boolean
  descCompleted: number
  ascCompleted: number
  variant?: "compact" | "card" | "full"
}

/**
 * Compute current para and total from desc/asc progress.
 * - desc_completed: paras done from 30 going down (30, 29, 28...)
 * - asc_completed: the para number they are currently ON (e.g. 21 means reading para 21, completed 1-20)
 *   - 0 means not started ascending yet
 * - completed = desc + (asc > 0 ? asc - 1 : 0)
 * - current para = asc (the one they're reading now)
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

export function QuranProgress({ isQaida, descCompleted, ascCompleted, variant = "compact" }: QuranProgressProps) {
  const { currentPara, total, isCompleted } = computeProgress(descCompleted, ascCompleted)
  const progress = (total / 30) * 100

  if (variant === "compact") {
    if (isQaida) {
      return (
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 gap-1">
          <BookMarked className="h-3 w-3" />
          Norani Qaida
        </Badge>
      )
    }
    if (total === 0) {
      return <span className="text-muted-foreground/40">--</span>
    }
    if (isCompleted) {
      return (
        <Badge variant="success" className="gap-1">
          <BookOpen className="h-3 w-3" />
          Completed
        </Badge>
      )
    }
    return (
      <span className="text-amber-400 font-medium text-sm">
        Para {currentPara} <span className="text-muted-foreground font-normal text-xs">({total}/30)</span>
      </span>
    )
  }

  if (variant === "full") {
    if (isQaida) {
      return (
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-amber-400" />
              <span className="font-semibold text-sm">Learning Stage</span>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-sm px-3 py-1">
              Norani Qaida
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Student is learning the basics through Norani Qaida before starting Quran reading.
          </p>
        </div>
      )
    }

    return (
      <div className="p-5 rounded-2xl bg-secondary/50 border border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-sm">Quran Progress</span>
          </div>
          <div className="text-right">
            {isCompleted ? (
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
        <Progress value={progress} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-3">
            {descCompleted > 0 && (
              <span>From end: <span className="text-foreground font-semibold">{descCompleted}</span> paras</span>
            )}
            {ascCompleted > 0 && (
              <span>From start: <span className="text-foreground font-semibold">{ascCompleted}</span> paras</span>
            )}
          </div>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    )
  }

  // "card" variant — for the info cards grid
  if (isQaida) {
    return (
      <>
        <p className="text-2xl font-bold text-amber-400">Qaida</p>
        <p className="text-xs text-muted-foreground mt-1">Norani Qaida</p>
      </>
    )
  }

  if (isCompleted) {
    return (
      <>
        <p className="text-2xl font-bold text-emerald-400">30/30</p>
        <p className="text-xs text-muted-foreground mt-1">Completed</p>
      </>
    )
  }

  if (total === 0) {
    return (
      <>
        <p className="text-2xl font-bold">--</p>
        <p className="text-xs text-muted-foreground mt-1">Not started</p>
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
      <p className="text-xs text-muted-foreground mt-1">{total}/30 completed</p>
    </>
  )
}
