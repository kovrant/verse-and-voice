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
  "id" | "name" | "guardian_name" | "started_at" | "class_time" | "qaida_media_id"
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
      <div className="bg-card rounded-[20px] border border-border p-8">
        {/* SECTION 1 — HEADER */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[28px] font-bold flex-shrink-0">
            {(student.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-semibold text-[28px] leading-tight text-foreground">
                {student.name}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{student.guardian_name}</span>
            </div>
          </div>
        </div>

        <div className="my-6 h-px bg-border" />

        {/* SECTION 2 — TODAY'S SESSION */}
        <div className="flex flex-wrap gap-x-12 gap-y-5">
          <div className="flex items-start gap-2.5">
            <Clock className="h-[18px] w-[18px] text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p
                className="text-[11px] font-semibold uppercase text-muted-foreground"
                style={{ letterSpacing: "0.08em" }}
              >
                Class Time
              </p>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {student.class_time || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-[18px] w-[18px] text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p
                className="text-[11px] font-semibold uppercase text-muted-foreground"
                style={{ letterSpacing: "0.08em" }}
              >
                Currently On
              </p>
              <p className="text-xl font-bold text-primary mt-0.5">
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
                <BookMarked className="h-4 w-4 text-foreground" />
                <span className="text-base font-semibold text-foreground">Qaida</span>
                <span className="text-sm text-muted-foreground">
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
                  <BookOpen className="h-4 w-4 text-foreground" />
                  <span className="text-base font-semibold text-foreground">Quran Progress</span>
                  {activeRound && roundNum > 0 && (
                    <span className="text-sm text-muted-foreground">(Round {roundNum})</span>
                  )}
                </div>
                <div className="text-base font-bold tabular-nums">
                  <span className="text-primary">{currentPara || total}</span>
                  <span className="text-muted-foreground"> / 30</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>From start: {asc > 0 ? asc : total} paras</span>
                <span className="text-primary font-semibold">{percent}% complete</span>
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
                <p
                  className="text-[11px] font-semibold uppercase text-muted-foreground"
                  style={{ letterSpacing: "0.08em" }}
                >
                  History
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  <span className="font-bold text-primary">{journey}</span> of journey
                </p>
              </div>
              <div className="relative pl-1">
                {/* Connecting line */}
                <div className="absolute left-[15px] top-3 bottom-3 w-[2px] rounded-full bg-border" />
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
                        className={`relative flex items-center gap-3 rounded-[12px] py-2 pl-10 pr-3 transition-all hover:-translate-y-px ${
                          e.isCurrent ? "bg-secondary" : "bg-muted"
                        }`}
                      >
                        {/* Dot with icon — pulses on the active round */}
                        <span
                          className={`absolute left-[7px] top-1/2 -translate-y-1/2 h-[18px] w-[18px] rounded-full flex items-center justify-center ring-4 ring-card ${
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
                          className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-secondary-foreground shrink-0"
                          style={{ width: 78 }}
                        >
                          {e.stage}
                        </span>

                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium truncate text-foreground">
                            {range}
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums shrink-0 text-muted-foreground">
                            {duration}
                          </span>
                        </div>

                        {!e.isCurrent && (
                          <span
                            className="shrink-0 h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center"
                            title="Completed"
                          >
                            <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                          </span>
                        )}
                        {e.isCurrent && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
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
          className={`relative w-full h-14 flex items-center justify-center gap-3 rounded-[14px] bg-primary text-primary-foreground text-[17px] font-bold overflow-hidden transition-all ${
            starting
              ? "cursor-default"
              : qaidaMissing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-hover hover:-translate-y-px"
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
          <p className="mt-3 text-center text-[13px] font-medium text-muted-foreground">
            No Qaida book assigned.{" "}
            <Link href={`/students/${student.id}`} className="text-primary hover:underline">
              Assign one on the student page
            </Link>{" "}
            to start a Qaida class.
          </p>
        )}

        {/* View full profile link */}
        <div className="mt-4 mb-2 flex justify-center">
          <Link
            href={`/students/${student.id}`}
            className="text-[13px] font-medium transition-colors text-muted-foreground hover:text-primary"
          >
            View full student profile →
          </Link>
        </div>

        {/* SECTION 6 — FOOTER META */}
        <div className="pt-4 border-t border-border flex items-center justify-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[13px] font-medium text-muted-foreground">
            <span className="font-bold text-foreground">
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
