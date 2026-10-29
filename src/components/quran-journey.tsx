"use client"

import { differenceInMonths, format } from "date-fns"
import { BookMarked, BookOpen, CheckCircle2, Pencil, Trash2, Trophy } from "lucide-react"

import {
  computeProgress,
  getActiveRound,
  getChronologicalRoundNumber,
  type QuranRound,
} from "@/components/quran-progress"
import { cn, parseLocalDate } from "@/lib/utils"

interface QuranJourneyProps {
  rounds: QuranRound[]
  onEditRound: (round: QuranRound) => void
  onDeleteRound: (roundId: string) => void
}

const PARAS = Array.from({ length: 30 }, (_, i) => i + 1)

/** "3 yrs 4 mo", "6 mo", "1 yr" — humanised span between two dates. */
function durationLabel(start: Date, end: Date): string {
  const months = Math.max(0, differenceInMonths(end, start))
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years <= 0 && rem <= 0) return "< 1 mo"
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`)
  if (rem > 0) parts.push(`${rem} mo`)
  return parts.join(" ")
}

/** Per-para state for the active round's 30-cell track. */
type ParaCell = "done" | "current" | "remaining"

export function QuranJourney({ rounds, onEditRound, onDeleteRound }: QuranJourneyProps) {
  const activeRound = getActiveRound(rounds)
  const quranRounds = rounds.filter((r) => r.type === "quran")
  const khatms = quranRounds.filter((r) => r.completed_at).length

  // ── Hero state ──────────────────────────────────────────────────────────
  const activeIsQaida = activeRound?.type === "qaida"
  const activeIsQuran = activeRound?.type === "quran"
  const desc = activeRound?.desc_completed ?? 0
  const asc = activeRound?.asc_completed ?? 0
  const { currentPara, total } = computeProgress(desc, asc)
  const allQuranDone = !activeRound && khatms > 0
  const heroTotal = allQuranDone ? 30 : total
  const heroPct = Math.round((heroTotal / 30) * 100)
  const activeRoundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : khatms

  function paraCell(n: number): ParaCell {
    if (allQuranDone) return "done"
    if (!activeIsQuran) return "remaining"
    if (currentPara != null && n === currentPara) return "current"
    const doneFromStart = asc > 0 && n < asc
    const doneFromEnd = desc > 0 && n > 30 - desc
    return doneFromStart || doneFromEnd ? "done" : "remaining"
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card-background py-14 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary">
          <BookOpen className="h-6 w-6 text-icon-secondary" />
        </div>
        <p className="mb-1 font-medium text-text-primary">No rounds yet</p>
        <p className="text-sm text-text-tertiary">
          Click &ldquo;Add Round&rdquo; to start tracking the journey
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-card-border bg-card-background">
        <div className="p-5 sm:p-6">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[rgba(87,80,241,0.10)] text-[#5750F1]">
                {activeIsQaida ? (
                  <BookMarked className="h-5 w-5" />
                ) : (
                  <BookOpen className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-text-tertiary">
                  {allQuranDone ? "Quran Journey" : "Current Round"}
                </p>
                <h3 className="text-lg font-semibold leading-tight text-text-primary">
                  {activeIsQaida
                    ? "Norani Qaida"
                    : allQuranDone
                      ? "All 30 completed"
                      : `Round ${activeRoundNum}`}
                </h3>
              </div>
            </div>

            <div className="text-right">
              {activeIsQaida ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-600">
                  <BookMarked className="h-4 w-4" />
                  Learning the basics
                </span>
              ) : (
                <div className="leading-none">
                  <span className="text-2xl font-semibold tabular-nums text-text-primary">
                    {allQuranDone ? "30" : currentPara ? `Para ${currentPara}` : `${heroTotal}`}
                  </span>
                  <span className="ml-1 text-sm font-medium text-text-tertiary">/ 30</span>
                </div>
              )}
            </div>
          </div>

          {/* 30-para track (hidden for a pure Qaida stage) */}
          {!activeIsQaida && (
            <div className="mt-6">
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
              >
                {PARAS.map((n) => {
                  const state = paraCell(n)
                  return (
                    <div
                      key={n}
                      title={`Para ${n}`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums transition-colors",
                        state === "done" && "border-green-500/30 bg-green-500/10 text-green-600",
                        state === "current" && "border-primary bg-primary text-primary-foreground",
                        state === "remaining" &&
                          "border-card-border bg-background-gray-primary text-text-tertiary",
                      )}
                    >
                      {n}
                    </div>
                  )
                })}
              </div>

              {/* Legend + percent */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-tertiary">
                <div className="flex items-center gap-3">
                  <LegendDot className="bg-green-500/10 border-green-500/30" label="Completed" />
                  <LegendDot className="bg-primary border-primary" label="Current" />
                  <LegendDot
                    className="bg-background-gray-primary border-card-border"
                    label="Remaining"
                  />
                </div>
                <span className="font-semibold text-text-primary">
                  {heroTotal}/30 · {heroPct}%
                </span>
              </div>
            </div>
          )}

          {activeIsQaida && (
            <p className="mt-4 text-sm text-text-tertiary">
              Learning the fundamentals through Norani Qaida before beginning Quran reading.
            </p>
          )}
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase text-text-tertiary">The Journey</p>
        <ol className="relative">
          {/* Vertical rail */}
          <span
            aria-hidden
            className="absolute left-[18px] top-2 bottom-2 w-px bg-border-primary"
          />
          {(() => {
            // Newest first: active on top, Qaida (the beginning) at the bottom.
            const sorted = [...rounds].sort((a, b) => {
              const aActive = !a.completed_at ? 1 : 0
              const bActive = !b.completed_at ? 1 : 0
              if (aActive !== bActive) return bActive - aActive
              return b.started_at.localeCompare(a.started_at)
            })
            return sorted.map((r) => {
              const isActive = !r.completed_at
              const isQaida = r.type === "qaida"
              const rTotal = isQaida
                ? 0
                : r.completed_at
                  ? 30
                  : computeProgress(r.desc_completed, r.asc_completed).total
              const pct = (rTotal / 30) * 100
              const num = getChronologicalRoundNumber(rounds, r)
              const start = parseLocalDate(r.started_at) ?? new Date()
              const end = r.completed_at
                ? (parseLocalDate(r.completed_at) ?? new Date())
                : new Date()
              const Icon = isQaida ? BookMarked : r.completed_at ? Trophy : BookOpen

              return (
                <li key={r.id} className="group relative pl-12 pb-3 last:pb-0">
                  {/* Node */}
                  <span
                    className={cn(
                      "absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-card-background",
                      isQaida
                        ? "border-amber-500/40 text-amber-600"
                        : r.completed_at
                          ? "border-green-500/40 text-green-600"
                          : "border-primary text-primary",
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-full ring-2 ring-primary/30 animate-pulse" />
                    )}
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>

                  {/* Card */}
                  <div
                    className={cn(
                      "rounded-lg border bg-card-background px-4 py-3 transition-colors hover:bg-background-gray-primary",
                      isActive ? "border-primary/30" : "border-card-border",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {isQaida ? "Norani Qaida" : `Quran R${num}`}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium uppercase text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Active
                        </span>
                      ) : r.completed_at && !isQaida ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium uppercase text-amber-600">
                          <Trophy className="h-3 w-3" />
                          Khatm
                        </span>
                      ) : null}
                      {!isQaida && (
                        <span
                          className={cn(
                            "ml-auto flex items-center gap-1 text-[11px] font-semibold tabular-nums",
                            r.completed_at ? "text-green-600" : "text-text-tertiary",
                          )}
                        >
                          {r.completed_at && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {rTotal}/30
                        </span>
                      )}
                      {/* Row actions */}
                      <div
                        className={cn(
                          "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                          isQaida && "ml-auto",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onEditRound(r)}
                          aria-label="Edit round"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-icon-tertiary hover:bg-background-gray-secondary hover:text-text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRound(r.id)}
                          aria-label="Delete round"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-icon-tertiary hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
                      <span>
                        {format(start, "MMM yyyy")} →{" "}
                        {r.completed_at ? format(end, "MMM yyyy") : "Now"}
                      </span>
                      <span className="text-text-tertiary">·</span>
                      <span>{durationLabel(start, end)}</span>
                    </div>

                    {!isQaida && (
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background-gray-secondary">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            r.completed_at ? "bg-green-500" : "bg-primary",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </li>
              )
            })
          })()}
        </ol>
      </div>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-[3px] border", className)} />
      {label}
    </span>
  )
}
