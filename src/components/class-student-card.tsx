"use client"

import { differenceInDays } from "date-fns"
import { BookMarked, BookOpen, Check, Clock, Route, User } from "lucide-react"
import Link from "next/link"

import { ClassPrepPanel } from "@/components/class-prep-panel"
import { PanelHeader } from "@/components/panel-header"
import {
  getActiveRound,
  getChronologicalRoundNumber,
  getCompletedRounds,
  type QuranRound,
} from "@/components/quran-progress"
import { StudentAvatar } from "@/components/student-avatar"
import { Card } from "@/components/ui/card"
import type { MemItem } from "@/lib/memorization"
import { paraLabel, QAIDA_PARA } from "@/lib/qaida"
import { cn, COUNTRY_FLAGS, parseLocalDate, safeFormatDate, type Student } from "@/lib/utils"

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
  | "country"
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

/**
 * Class prep screen for the selected student: who, where they are, their
 * journey and Start class on the left; last class, homework and this month on
 * the right (stacks on small screens).
 */
export function ClassStudentCard({
  student,
  rounds,
  sessions,
  memItems,
  online = false,
  starting,
  onStart,
  qaidaMissing = false,
}: {
  student: ClassStudent
  rounds: QuranRound[]
  sessions: ClassSession[]
  memItems: MemItem[]
  online?: boolean
  starting: boolean
  onStart: () => void
  /** On a Qaida round with no Qaida book assigned: block Start Class. */
  qaidaMissing?: boolean
}) {
  const { activeRound, para, page, line } = classPosition(rounds, sessions)
  const isQaida = para === QAIDA_PARA
  const desc = activeRound?.desc_completed || 0
  const asc = activeRound?.asc_completed || 0
  const total = desc + (asc > 0 ? asc - 1 : 0)
  const percent = Math.min(100, Math.round((total / 30) * 100))
  const roundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 0
  const khatms = getCompletedRounds(rounds).filter((r) => r.type === "quran").length
  const enrolledDays = differenceInDays(
    new Date(),
    parseLocalDate(student.started_at) ?? new Date(),
  )

  return (
    <div className="grid animate-fade-in-up gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        {/* Who */}
        <Card className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <div className="relative size-16 flex-shrink-0 overflow-hidden rounded-full ring-4 ring-background-gray-primary">
            <StudentAvatar
              id={student.id}
              name={student.name}
              gender={student.gender}
              sizes="64px"
              className="object-[50%_20%]"
              initialClassName="text-2xl"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-semibold leading-8 text-text-primary">
                {student.name}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  online
                    ? "bg-green-500/10 text-green-600"
                    : "bg-background-gray-secondary text-text-secondary",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    online ? "animate-pulse bg-green-500" : "bg-icon-tertiary",
                  )}
                />
                {online ? "Online now" : "Offline"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-tertiary">
              {student.guardian_name && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {student.guardian_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {student.class_time || "No class time"}
              </span>
              {student.country && (
                <span className="inline-flex items-center gap-1.5">
                  <span role="img" aria-label={student.country} className="text-base leading-none">
                    {COUNTRY_FLAGS[student.country] ?? ""}
                  </span>
                  {student.country}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Today's lesson + Start class */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-6">
            {!isQaida && activeRound ? (
              <ProgressRing percent={percent} label={`${total}/30`} />
            ) : (
              <span className="flex size-[88px] flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookMarked className="h-8 w-8" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Today&apos;s lesson starts at
              </p>
              <p className="mt-1 text-2xl font-semibold leading-8 tracking-[-0.3px] text-text-primary sm:text-[28px] sm:leading-9">
                {activeRound ? (
                  <>
                    {paraLabel(para)}
                    {page ? <span className="text-text-tertiary"> · </span> : null}
                    {page ? `Page ${page}` : null}
                    {line ? <span className="text-text-tertiary"> · </span> : null}
                    {line ? `Line ${line}` : null}
                  </>
                ) : (
                  "Not started"
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {isQaida ? (
                  <Chip>Norani Qaida · before the Quran</Chip>
                ) : (
                  activeRound && (
                    <>
                      <Chip tone="primary">Round {roundNum}</Chip>
                      <Chip>{percent}% of the Quran</Chip>
                    </>
                  )
                )}
                {khatms > 0 && (
                  <Chip>
                    {khatms} khatm{khatms === 1 ? "" : "s"}
                  </Chip>
                )}
                <Chip>{enrolledDays.toLocaleString()} days with us</Chip>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-border-primary pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/teacher/students/${student.id}`}
              className="text-center text-sm font-medium text-text-tertiary transition-colors hover:text-primary"
            >
              View full profile →
            </Link>
            <button
              type="button"
              onClick={onStart}
              disabled={starting || qaidaMissing}
              aria-live="polite"
              className={cn(
                "group relative inline-flex h-12 items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#5750F1] to-[#7B6CF9] pl-2 pr-6 text-base font-semibold text-white shadow-[0_10px_24px_-8px_rgba(87,80,241,0.7)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:min-w-[220px]",
                starting
                  ? "cursor-default"
                  : qaidaMissing
                    ? "cursor-not-allowed opacity-50"
                    : "hover:-translate-y-px hover:shadow-[0_14px_28px_-8px_rgba(87,80,241,0.8)] active:translate-y-0",
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2.5 transition-all duration-200",
                  starting ? "scale-75 opacity-0" : "scale-100 opacity-100",
                )}
              >
                <span className="relative flex size-8 items-center justify-center rounded-lg bg-white/20">
                  <BookOpen className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
                  {online && (
                    <span className="absolute -right-1 -top-1 flex size-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-3 rounded-full border-2 border-[#6A5DF5] bg-green-400" />
                    </span>
                  )}
                </span>
                Start class
              </span>
              {/* Book overlay while the class opens */}
              {starting && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <BookOpen className="book-open-anim h-7 w-7 text-white" strokeWidth={2.25} />
                </span>
              )}
            </button>
          </div>

          {qaidaMissing && (
            <p className="mt-3 text-[13px] font-medium text-text-tertiary sm:text-right">
              No Qaida book assigned.{" "}
              <Link
                href={`/teacher/students/${student.id}`}
                className="text-primary hover:underline"
              >
                Assign one on the student page
              </Link>{" "}
              to start a Qaida class.
            </p>
          )}
        </Card>

        <JourneyCard rounds={rounds} />
      </div>

      <ClassPrepPanel student={student} sessions={sessions} memItems={memItems} />
    </div>
  )
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "primary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-background-gray-secondary text-text-secondary",
      )}
    >
      {children}
    </span>
  )
}

/** Circular progress: percent of the ring filled, label in the middle. */
function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-[88px] flex-shrink-0">
      <svg viewBox="0 0 88 88" className="size-full -rotate-90">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-background-gray-secondary"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold tabular-nums text-text-primary">{label}</span>
        <span className="text-[10px] font-medium uppercase text-text-tertiary">done</span>
      </span>
    </div>
  )
}

/** Format a span as "Xyr Ymo" / "Ymo" / "Xd". */
function fmtDuration(start: Date, end: Date) {
  const days = Math.max(0, differenceInDays(end, start))
  if (days < 31) return `${days}d`
  const months = Math.round(days / 30.44)
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years}yr` : `${years}yr ${rem}mo`
}

/** Qaida → Quran rounds as a timeline, finished rounds first, the active one last. */
function JourneyCard({ rounds }: { rounds: QuranRound[] }) {
  const completed = getCompletedRounds(rounds)
  const active = getActiveRound(rounds)
  if (completed.length === 0 && !active) return null

  const entries = [...completed, ...(active ? [active] : [])].map((r) => ({
    key: r.id,
    stage: r.type === "qaida" ? "Qaida" : `Round ${getChronologicalRoundNumber(rounds, r)}`,
    type: r.type,
    startedAt: parseLocalDate(r.started_at) ?? new Date(),
    endedAt: r.completed_at ? parseLocalDate(r.completed_at) : null,
    isCurrent: r === active,
  }))
  const earliest = entries.reduce(
    (min, e) => (e.startedAt < min ? e.startedAt : min),
    entries[0].startedAt,
  )
  const khatms = completed.filter((r) => r.type === "quran").length

  return (
    <Card className="p-5 sm:p-6">
      <PanelHeader
        icon={Route}
        tint="purple"
        title="Reading journey"
        summary={`${fmtDuration(earliest, new Date())} so far${khatms ? ` · ${khatms} khatm${khatms === 1 ? "" : "s"}` : ""}`}
      />
      <ol className="relative mt-5 space-y-2 pl-1">
        <span
          aria-hidden
          className="absolute bottom-4 left-[15px] top-4 w-0.5 rounded-full bg-border-primary"
        />
        {entries.map((e) => {
          const Icon = e.type === "qaida" ? BookMarked : BookOpen
          const range = `${safeFormatDate(e.startedAt, "MMM yyyy")} → ${
            e.isCurrent ? "Now" : e.endedAt ? safeFormatDate(e.endedAt, "MMM yyyy") : "…"
          }`
          return (
            <li
              key={e.key}
              className={cn(
                "relative flex items-center gap-3 rounded-lg py-2.5 pl-10 pr-3",
                e.isCurrent ? "bg-primary/10" : "bg-background-gray-primary",
              )}
            >
              <span
                className={cn(
                  "absolute left-[6px] top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full ring-4 ring-card-background",
                  e.isCurrent ? "bg-primary" : "border border-primary/40 bg-card",
                )}
              >
                {e.isCurrent && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/50 motion-reduce:animate-none" />
                )}
                <Icon
                  className={cn(
                    "relative h-[11px] w-[11px]",
                    e.isCurrent ? "text-primary-foreground" : "text-primary",
                  )}
                />
              </span>
              <span className="w-[72px] flex-shrink-0 text-sm font-semibold text-text-primary">
                {e.stage}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{range}</span>
              <span className="flex-shrink-0 text-xs font-medium tabular-nums text-text-tertiary">
                {fmtDuration(e.startedAt, e.endedAt ?? new Date())}
              </span>
              {e.isCurrent ? (
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold uppercase text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Now
                </span>
              ) : (
                <span
                  className="flex size-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10"
                  title="Completed"
                >
                  <Check className="h-2.5 w-2.5 text-green-600" strokeWidth={3} />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
