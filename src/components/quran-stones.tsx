"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { MoonMascot } from "@/components/student-mascot"
import { cn } from "@/lib/utils"

const MILESTONES = new Set([5, 10, 15, 20, 25])

/** Per-device memory of how many paras were finished the last time this was seen. */
function seenKey(studentId: string) {
  return `quran_academy_paras_seen_${studentId}`
}

/**
 * Which stones to celebrate: the ones finished since this child last looked.
 * ponytail: localStorage, so the cheer follows the device, not the account —
 * good enough for a congratulation. Upgrade path: a `paras_seen` column.
 */
function useNewlyFinished(studentId: string | undefined, finished: number): Set<number> {
  const [fresh, setFresh] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!studentId || typeof window === "undefined") return
    let seen: number | null = null
    try {
      const raw = window.localStorage.getItem(seenKey(studentId))
      seen = raw === null ? null : Number(raw)
    } catch {
      return // private mode / blocked storage: skip the cheer
    }

    // First ever visit: remember where they are, don't celebrate the whole lot.
    if (seen !== null && finished > seen) {
      setFresh(new Set(Array.from({ length: finished - seen }, (_, i) => seen + 1 + i)))
    }
    try {
      window.localStorage.setItem(seenKey(studentId), String(finished))
    } catch {
      // ignore
    }
  }, [studentId, finished])

  return fresh
}

/**
 * The Quran journey as a board of stepping stones — one per para, so a child
 * sees the whole road and how many stones are left (the old winding path drew
 * only six markers and hid 24 paras).
 *
 * `done` is the para they are on: stones before it are finished (sage), that
 * one is "you are here" (terracotta, with Hilal standing on it), the rest wait.
 * Finished stones open that para; flags mark every fifth; the last is the finish.
 */
export function QuranStones({
  done,
  total = 30,
  studentId,
}: {
  done: number
  total?: number
  studentId?: string
}) {
  const finished = Math.max(0, Math.min(total, done - 1))
  const allDone = done >= total
  const left = Math.max(0, total - finished)
  const fresh = useNewlyFinished(studentId, allDone ? total : finished)

  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 sm:gap-2.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const isDone = n <= finished || allDone
          const isHere = !allDone && n === done
          const isLast = n === total
          const isMilestone = MILESTONES.has(n)
          const isFresh = fresh.has(n)
          const openable = isDone || isHere

          const stone = (
            <div
              className={cn(
                "flex aspect-square items-center justify-center rounded-[14px] border-[1.5px] font-heading text-[14px] font-bold transition-transform sm:text-[15px]",
                openable && "hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none",
                isFresh && "celebrate-pop",
                isHere
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_3px_0_hsl(16_48%_44%)] ring-4 ring-[hsl(var(--kid-coral)/0.25)]"
                  : isDone
                    ? "border-[hsl(var(--kid-sage)/0.6)] bg-[hsl(var(--kid-sage)/0.4)] text-primary shadow-[0_3px_0_hsl(var(--kid-sage)/0.55)]"
                    : isMilestone || isLast
                      ? "border-[hsl(var(--kid-saffron)/0.6)] bg-card text-muted-foreground"
                      : "border-dashed border-border bg-card/70 text-muted-foreground",
              )}
            >
              {isLast ? (allDone ? "🏆" : "🕌") : n}
            </div>
          )

          return (
            <div key={n} className="relative">
              {isHere && (
                <MoonMascot
                  mood="awake"
                  className="pointer-events-none absolute -top-6 left-1/2 h-8 w-8 -translate-x-1/2 animate-float-gentle"
                />
              )}
              {openable ? (
                <Link
                  href={`/student/quran?para=${n}`}
                  title={`Open Para ${n}`}
                  aria-label={`Open Para ${n}${isHere ? " — you are here" : ""}`}
                  className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--kid-coral)/0.35)]"
                >
                  {stone}
                </Link>
              ) : (
                <div title={isLast ? "The finish" : `Para ${n}`} aria-label={`Para ${n} — not yet`}>
                  {stone}
                </div>
              )}
              {isFresh && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1.5 -top-2 animate-float text-[13px] leading-none"
                >
                  ✨
                </span>
              )}
              {isMilestone && !isDone && !isHere && (
                <span aria-hidden className="absolute -right-1 -top-2 text-[11px] leading-none">
                  🚩
                </span>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-center text-[13.5px] font-bold text-muted-foreground">
        {allDone
          ? "🏆 You finished all 30 paras — MashaAllah!"
          : fresh.size > 0
            ? `✨ ${fresh.size === 1 ? "A new para done" : `${fresh.size} new paras done`} — MashaAllah!`
            : finished === 0
              ? "Your first stone is waiting — bismillah!"
              : `${finished} done · ${left} to go`}
      </p>
    </div>
  )
}
