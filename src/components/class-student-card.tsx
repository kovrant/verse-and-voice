"use client"

import { differenceInDays } from "date-fns"
import { BookMarked, BookOpen, CalendarDays, Check, Clock, Play, User } from "lucide-react"
import Link from "next/link"

import {
  getActiveRound,
  getChronologicalRoundNumber,
  getCompletedRounds,
  type QuranRound,
} from "@/components/quran-progress"
import { paraLabel, QAIDA_PARA } from "@/lib/qaida"
import { parseLocalDate, safeFormatDate, type Student } from "@/lib/utils"

export type ClassStudent = Pick<
  Student,
  | "id"
  | "name"
  | "guardian_name"
  | "started_at"
  | "class_time"
  | "class_days"
  | "qaida_media_id"
  | "gender"
>

export interface ClassSession {
  id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  starting_para: number | null
  ending_para: number | null
  ending_page?: number | null
  last_page?: number | null
  ending_line?: number | null
  ending_pointer_x?: number | null
  ending_pointer_y?: number | null
  paras_covered: number[]
  memorization_revised: string[]
  notes: string | null
}

/**
 * Where the student is now. A Qaida round is always para 0, at the latest Qaida
 * session's page/line. A Quran round uses the latest session's end, else the
 * active round's para. `sessions` must be newest first.
 */
export function classPosition(rounds: QuranRound[], sessions: ClassSession[]) {
  const activeRound = getActiveRound(rounds)
  if (activeRound?.type === "qaida") {
    const qaidaSession = sessions.find((s) => s.ending_para === QAIDA_PARA)
    return {
      activeRound,
      para: QAIDA_PARA,
      page: qaidaSession?.ending_page ?? qaidaSession?.last_page ?? null,
      line: qaidaSession?.ending_line ?? null,
    }
  }
  const latestSession = sessions[0]
  const para =
    latestSession?.ending_para && latestSession.ending_para >= 1 && latestSession.ending_para <= 30
      ? latestSession.ending_para
      : activeRound?.asc_completed || 1
  return {
    activeRound,
    para,
    page: latestSession?.ending_page ?? latestSession?.last_page ?? null,
    line: latestSession?.ending_line ?? null,
  }
}

/** The selected student's class card: schedule, position, progress, round history, Start Class. */
export function ClassStudentCard({
  student,
  rounds,
  sessions,
  starting,
  onStart,
  qaidaMissing = false,
}: {
  student: ClassStudent
  rounds: QuranRound[]
  sessions: ClassSession[]
  starting: boolean
  onStart: () => void
  /** On a Qaida round with no Qaida book assigned: block Start Class. */
  qaidaMissing?: boolean
}) {
  const {
    activeRound,
    para: latestPara,
    page: latestPage,
    line: latestLine,
  } = classPosition(rounds, sessions)
  const currentPara = latestPara

  return (
    <div className="max-w-[640px] mx-auto animate-fade-in-up">
      {/* Main Class Card — single clean white surface */}
      <div className="bg-card-background rounded-xl border border-card-border p-6 sm:p-8">
        {/* SECTION 1 — HEADER */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-[28px] font-semibold flex-shrink-0">
            {(student.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-semibold leading-8 text-text-primary">{student.name}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-text-tertiary">
              <User className="h-3.5 w-3.5" />
              <span>{student.guardian_name}</span>
            </div>
          </div>
        </div>

        <div className="my-6 h-px bg-border-primary" />

        {/* SECTION 2 — TODAY'S SESSION */}
        <div className="flex flex-wrap gap-x-12 gap-y-5">
          <div className="flex items-start gap-2.5">
            <Clock className="h-[18px] w-[18px] text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase text-text-tertiary">Class Time</p>
              <p className="text-xl font-semibold text-text-primary mt-0.5">
                {student.class_time || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-[18px] w-[18px] text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase text-text-tertiary">Currently On</p>
              <p className="text-xl font-semibold text-primary mt-0.5">
                {activeRound
                  ? `${paraLabel(latestPara)}${latestPage ? ` · Page ${latestPage}` : ""}${latestLine ? ` · Line ${latestLine}` : ""}`
                  : "Not started"}
              </p>
            </div>
          </div>
        </div>

        <div className="h-8" />

        {/* SECTION 3 — PROGRESS */}
        {(() => {
          // Qaida has no /30 maths.
          if (latestPara === QAIDA_PARA) {
            return (
              <div className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-icon-secondary" />
                <span className="text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                  Qaida
                </span>
                <span className="text-sm text-text-tertiary">
                  Learning Norani Qaida before the Quran paras
                </span>
              </div>
            )
          }
          const desc = activeRound?.desc_completed || 0
          const asc = activeRound?.asc_completed || 0
          const total = desc + (asc > 0 ? asc - 1 : 0)
          const percent = Math.min(100, Math.round((total / 30) * 100))
          const roundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 0

          return (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-icon-secondary" />
                  <span className="text-base font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                    Quran Progress
                  </span>
                  {activeRound && roundNum > 0 && (
                    <span className="text-sm text-text-tertiary">(Round {roundNum})</span>
                  )}
                </div>
                <div className="text-base font-semibold tabular-nums">
                  <span className="text-primary">{currentPara || total}</span>
                  <span className="text-text-tertiary"> / 30</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-background-gray-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
                <span>From start: {asc > 0 ? asc : total} paras</span>
                <span className="text-primary font-medium">{percent}% complete</span>
              </div>
            </div>
          )
        })()}

        <div className="h-7" />

        {/* SECTION 4 — HISTORY (timeline) */}
        {(() => {
          const completed = getCompletedRounds(rounds)
          const active = getActiveRound(rounds)
          if (completed.length === 0 && !active) return null

          // Build timeline entries: completed rounds first (chronological), then active at the bottom
          type Entry = {
            key: string
            stage: string
            type: "qaida" | "quran"
            startedAt: Date
            endedAt: Date | null
            isCurrent: boolean
          }
          const entries: Entry[] = completed.map((r) => ({
            key: r.id,
            stage:
              r.type === "qaida" ? "Qaida" : `Quran R${getChronologicalRoundNumber(rounds, r)}`,
            type: r.type,
            startedAt: parseLocalDate(r.started_at) ?? new Date(),
            endedAt: r.completed_at ? parseLocalDate(r.completed_at) : null,
            isCurrent: false,
          }))
          if (active) {
            entries.push({
              key: active.id,
              stage:
                active.type === "qaida"
                  ? "Qaida"
                  : `Quran R${getChronologicalRoundNumber(rounds, active)}`,
              type: active.type,
              startedAt: parseLocalDate(active.started_at) ?? new Date(),
              endedAt: null,
              isCurrent: true,
            })
          }

          // Format a duration as "Xyr Ymo" / "Ymo" / "Xd"
          const fmtDuration = (start: Date, end: Date) => {
            const days = Math.max(0, differenceInDays(end, start))
            if (days < 31) return `${days}d`
            const months = Math.round(days / 30.44)
            if (months < 12) return `${months}mo`
            const years = Math.floor(months / 12)
            const remMonths = months % 12
            return remMonths === 0 ? `${years}yr` : `${years}yr ${remMonths}mo`
          }

          // Total journey: earliest start → now
          const earliest = entries.reduce(
            (min, e) => (e.startedAt < min ? e.startedAt : min),
            entries[0].startedAt,
          )
          const journey = fmtDuration(earliest, new Date())

          return (
            <div>
              <div className="flex items-end justify-between mb-4">
                <p className="text-xs font-medium uppercase text-text-tertiary">History</p>
                <p className="text-xs font-medium text-text-tertiary">
                  <span className="font-semibold text-primary">{journey}</span> of journey
                </p>
              </div>
              <div className="relative pl-1">
                {/* Connecting line */}
                <div className="absolute left-[15px] top-3 bottom-3 w-[2px] rounded-full bg-border-primary" />
                <div className="space-y-2">
                  {entries.map((e) => {
                    const Icon = e.type === "qaida" ? BookMarked : BookOpen
                    const range = `${safeFormatDate(e.startedAt, "MMM yyyy")} → ${
                      e.isCurrent ? "Now" : e.endedAt ? safeFormatDate(e.endedAt, "MMM yyyy") : "…"
                    }`
                    const duration = fmtDuration(e.startedAt, e.endedAt ?? new Date())
                    return (
                      <div
                        key={e.key}
                        className={`relative flex items-center gap-3 rounded-lg py-2 pl-10 pr-3 ${
                          e.isCurrent ? "bg-primary/10" : "bg-background-gray-primary"
                        }`}
                      >
                        {/* Dot with icon — pulses on the active round */}
                        <span
                          className={`absolute left-[7px] top-1/2 -translate-y-1/2 h-[18px] w-[18px] rounded-full flex items-center justify-center ring-4 ring-card-background ${
                            e.isCurrent ? "bg-primary" : "bg-card border border-primary/40"
                          }`}
                        >
                          {e.isCurrent ? (
                            <span className="absolute inset-0 rounded-full bg-primary/60 animate-ping" />
                          ) : null}
                          <Icon
                            className={`h-[10px] w-[10px] relative ${
                              e.isCurrent ? "text-primary-foreground" : "text-primary"
                            }`}
                          />
                        </span>

                        <span
                          className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-background-gray-secondary text-text-secondary shrink-0"
                          style={{ width: 78 }}
                        >
                          {e.stage}
                        </span>

                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium truncate text-text-primary">
                            {range}
                          </span>
                          <span className="text-xs font-medium tabular-nums shrink-0 text-text-tertiary">
                            {duration}
                          </span>
                        </div>

                        {!e.isCurrent && (
                          <span
                            className="shrink-0 h-4 w-4 rounded-full bg-[hsl(var(--success)/0.12)] flex items-center justify-center"
                            title="Completed"
                          >
                            <Check
                              className="h-2.5 w-2.5 text-[hsl(var(--success))]"
                              strokeWidth={3}
                            />
                          </span>
                        )}
                        {e.isCurrent && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium uppercase text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Now
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        <div className="h-8" />

        {/* SECTION 5 — START CLASS BUTTON */}
        <button
          type="button"
          onClick={onStart}
          disabled={starting || qaidaMissing}
          aria-live="polite"
          className={`relative w-full h-12 flex items-center justify-center gap-3 rounded-lg bg-primary text-primary-foreground text-base font-medium overflow-hidden transition-colors ${
            starting
              ? "cursor-default"
              : qaidaMissing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[hsl(var(--primary-hover))]"
          }`}
        >
          {/* Default content — fades out when starting */}
          <span
            className={`flex items-center gap-3 transition-all duration-200 ${
              starting ? "opacity-0 scale-75" : "opacity-100 scale-100"
            }`}
          >
            <Play className="h-5 w-5 fill-current" />
            Start Class
          </span>

          {/* Book overlay — appears when starting */}
          {starting && (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              {/* The book — pops in with a slight bounce */}
              <BookOpen
                className="h-7 w-7 book-open-anim text-primary-foreground"
                strokeWidth={2.25}
              />
            </span>
          )}
        </button>

        {qaidaMissing && (
          <p className="mt-3 text-center text-[13px] font-medium text-text-tertiary">
            No Qaida book assigned.{" "}
            <Link href={`/teacher/students/${student.id}`} className="text-primary hover:underline">
              Assign one on the student page
            </Link>{" "}
            to start a Qaida class.
          </p>
        )}

        {/* View full profile link */}
        <div className="mt-4 mb-2 flex justify-center">
          <Link
            href={`/teacher/students/${student.id}`}
            className="text-[13px] font-medium transition-colors text-text-tertiary hover:text-primary"
          >
            View full student profile →
          </Link>
        </div>

        {/* SECTION 6 — FOOTER META */}
        <div className="pt-4 border-t border-border-primary flex items-center justify-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-icon-tertiary" />
          <p className="text-[13px] font-medium text-text-tertiary">
            <span className="font-semibold text-text-primary">
              {differenceInDays(
                new Date(),
                parseLocalDate(student.started_at) ?? new Date(),
              ).toLocaleString()}
            </span>{" "}
            days since enrollment
          </p>
        </div>
      </div>
    </div>
  )
}
