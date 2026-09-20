"use client"

import { MoonMascot } from "@/components/student-mascot"
import { cn } from "@/lib/utils"

const MILESTONES = new Set([5, 10, 15, 20, 25])

/**
 * The Quran journey as a board of stepping stones — one per para, so a child
 * sees the whole road and how many stones are left (the old winding path drew
 * only six markers and hid 24 paras).
 *
 * `done` is the para they are on: stones before it are finished (sage), that
 * one is "you are here" (terracotta, with Hilal standing on it), the rest wait.
 * Flags mark every fifth para and the last stone is the finish.
 */
export function QuranStones({ done, total = 30 }: { done: number; total?: number }) {
  const finished = Math.max(0, Math.min(total, done - 1))
  const allDone = done >= total
  const left = Math.max(0, total - finished)

  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 sm:gap-2.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const isDone = n <= finished || allDone
          const isHere = !allDone && n === done
          const isLast = n === total
          const isMilestone = MILESTONES.has(n)

          return (
            <div key={n} className="relative">
              {isHere && (
                <MoonMascot
                  mood="awake"
                  className="pointer-events-none absolute -top-6 left-1/2 h-8 w-8 -translate-x-1/2 animate-float-gentle"
                />
              )}
              <div
                title={isLast ? `Para ${n} — the finish` : `Para ${n}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-[14px] border-[1.5px] font-heading text-[14px] font-bold transition-transform sm:text-[15px]",
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
          : finished === 0
            ? "Your first stone is waiting — bismillah!"
            : `${finished} done · ${left} to go`}
      </p>
    </div>
  )
}
