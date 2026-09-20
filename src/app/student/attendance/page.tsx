"use client"

import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"

import { DAY_LABELS } from "@/components/class-days-picker"
import { KidCard, KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import { type ClassSession, paraSummary } from "@/components/student-session-bits"
import {
  type AttendanceDayStatus,
  buildMonthAttendance,
  localDateKey,
  monthLabel,
  shiftMonth,
} from "@/lib/attendance"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn, formatSessionDuration } from "@/lib/utils"

const SESSION_SELECT =
  "id, started_at, ended_at, duration_seconds, starting_para, ending_para, paras_covered, memorization_revised, notes"

/**
 * How one scheduled day reads. "Came to class" is the only loud one — a missed
 * day stays quiet and neutral (never a scary red X) and upcoming days are calm.
 */
function statusMeta(status: AttendanceDayStatus): {
  label: string
  emoji: string
  /** Panel look for the whole row. */
  panel: string
  /** Pill look for the little status chip. */
  chip: string
} {
  switch (status) {
    case "attended":
      return {
        label: "Came to class",
        emoji: "✅",
        panel:
          "border-[hsl(var(--kid-sage)/0.45)] bg-[hsl(var(--kid-sage)/0.16)] shadow-[0_4px_0_hsl(var(--kid-sage)/0.5)]",
        chip: "bg-[hsl(var(--kid-sage)/0.4)] text-foreground",
      }
    case "missed":
      return {
        label: "No class yet",
        emoji: "🌙",
        panel: "border-border bg-card shadow-[0_4px_0_hsl(var(--border))]",
        chip: "bg-secondary/70 text-muted-foreground",
      }
    case "upcoming":
      return {
        label: "Coming up",
        emoji: "⏳",
        panel: "border-dashed border-border bg-card/60",
        chip: "bg-secondary/70 text-muted-foreground",
      }
    default:
      return {
        label: "Day off",
        emoji: "💤",
        panel: "border-dashed border-border bg-card/60",
        chip: "bg-secondary/70 text-muted-foreground",
      }
  }
}

/** Chunky round arrow for the month stepper. */
function MonthArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
    >
      {children}
    </button>
  )
}

export default function StudentAttendancePage() {
  const { student, loading } = useStudent()
  const [view, setView] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!student) return
    let active = true
    setLoadingData(true)

    const start = new Date(view.year, view.month, 1, 0, 0, 0, 0)
    const end = new Date(view.year, view.month + 1, 0, 23, 59, 59, 999)

    supabase
      .from("class_sessions")
      .select(SESSION_SELECT)
      .eq("student_id", student.id)
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setSessions((data as ClassSession[]) || [])
        setLoadingData(false)
      })

    return () => {
      active = false
    }
  }, [student, view.year, view.month])

  const summary = useMemo(
    () => buildMonthAttendance(student?.class_days ?? null, sessions, view.year, view.month),
    [student?.class_days, sessions, view.year, view.month],
  )

  const classDaysLabel = useMemo(() => {
    const days = student?.class_days ?? []
    if (days.length === 0) return null
    return [...days]
      .sort((a, b) => a - b)
      .map((d) => DAY_LABELS[d])
      .join(", ")
  }, [student?.class_days])

  if (loading || !student) return <PageLoading variant="student-simple" student />

  const canGoForward =
    view.year < new Date().getFullYear() ||
    (view.year === new Date().getFullYear() && view.month < new Date().getMonth())

  const missed = summary.dueCount - summary.attendedCount
  const donePct =
    summary.dueCount > 0 ? Math.round((summary.attendedCount / summary.dueCount) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🗓️"
        color="sky"
        title="My class days"
        subtitle="Every day you came to class with your teacher"
      />

      {!summary.configured ? (
        <KidEmpty
          title="No class days yet"
          text="Ask your teacher to set your class days. Then every class you come to will show up right here."
        />
      ) : (
        <>
          {/* Month stepper */}
          <div className="mb-5 flex items-center justify-between gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-3 py-2.5 shadow-[0_4px_0_hsl(var(--border))]">
            <MonthArrow
              label="Previous month"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </MonthArrow>
            <div className="min-w-0 text-center">
              <p className="font-heading text-[19px] font-bold leading-tight text-primary">
                {monthLabel(view.year, view.month)}
              </p>
              {classDaysLabel ? (
                <p className="mt-0.5 text-[12px] font-semibold text-muted-foreground">
                  Class days: {classDaysLabel}
                </p>
              ) : null}
            </div>
            <MonthArrow
              label="Next month"
              disabled={!canGoForward}
              onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </MonthArrow>
          </div>

          {/* This month's score */}
          <KidCard color="sky" className="mb-6">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              This month
            </p>
            <p className="mt-1 font-heading text-[32px] font-bold leading-none tabular-nums text-primary sm:text-[36px]">
              {summary.attendedCount}
              <span className="text-[19px] font-bold text-muted-foreground">
                {" "}
                / {summary.dueCount} class days
              </span>
            </p>
            {summary.dueCount > 0 && (
              <div className="mt-3 h-3.5 overflow-hidden rounded-full bg-[hsl(var(--kid-sky)/0.28)]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--kid-sage))] transition-all duration-500"
                  style={{ width: `${donePct}%` }}
                />
              </div>
            )}
            <p className="mt-2.5 text-[14.5px] font-semibold text-foreground/85">
              {summary.dueCount === 0
                ? "No class days here yet. Your next one is on its way!"
                : missed === 0
                  ? "You came to every class — MashaAllah! 🌟"
                  : `${missed} class day${missed === 1 ? "" : "s"} with no class yet. Catch the next one!`}
            </p>
          </KidCard>

          {loadingData ? (
            <p className="py-8 text-center text-[15px] font-semibold text-muted-foreground">
              Loading…
            </p>
          ) : summary.days.length === 0 ? (
            <KidEmpty
              title="No class days this month"
              text="Try another month with the arrows above."
              mood="sleepy"
            />
          ) : (
            <>
              <SectionTitle emoji="📆" title="Day by day" />
              <div className="space-y-2.5">
                {summary.days.map((day) => {
                  const meta = statusMeta(day.status)
                  const fullSession = sessions.find(
                    (s) => localDateKey(new Date(s.started_at)) === day.dateKey,
                  )
                  const paras = fullSession ? paraSummary(fullSession) : null
                  const revised = fullSession?.memorization_revised?.length ?? 0
                  return (
                    <div
                      key={day.dateKey}
                      className={cn(
                        "flex items-start gap-3.5 rounded-[22px] border-[1.5px] p-3 sm:items-center",
                        meta.panel,
                      )}
                    >
                      <span className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-[16px] border-[1.5px] border-border bg-card/80">
                        <span className="text-[10px] font-extrabold uppercase text-muted-foreground">
                          {day.weekday}
                        </span>
                        <span className="font-heading text-[17px] font-bold leading-none tabular-nums text-primary">
                          {Number(day.dateKey.split("-")[2])}
                        </span>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-extrabold",
                              meta.chip,
                            )}
                          >
                            <span aria-hidden>{meta.emoji}</span>
                            {meta.label}
                          </span>
                          {day.session ? (
                            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground/85">
                              <Clock className="h-3.5 w-3.5" />
                              {formatSessionDuration(day.session.duration_seconds)}
                            </span>
                          ) : null}
                          {paras ? (
                            <span className="text-[12.5px] font-semibold text-foreground/85">
                              {paras.label}
                            </span>
                          ) : null}
                          {revised > 0 ? (
                            <span className="text-[12.5px] font-semibold text-foreground/85">
                              🔁 {revised} revised
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {sessions.length > 0 && !loadingData ? (
            <div className="mt-6">
              <SectionTitle emoji="⏱️" title={`Class log (${sessions.length})`} />
              <div className="space-y-2.5">
                {sessions.map((session) => {
                  const started = new Date(session.started_at)
                  const paras = paraSummary(session)
                  const revised = session.memorization_revised?.length ?? 0
                  return (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[20px] border-[1.5px] border-border bg-card px-4 py-3 shadow-[0_3px_0_hsl(var(--border))]"
                    >
                      <p className="font-heading text-[16px] font-bold text-primary">
                        {format(started, "EEE, MMM d · h:mm a")}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatSessionDuration(session.duration_seconds)}
                      </span>
                      {paras ? (
                        <span className="rounded-full bg-[hsl(var(--kid-sky)/0.3)] px-2.5 py-0.5 text-[12.5px] font-bold text-foreground">
                          {paras.label}
                        </span>
                      ) : null}
                      {revised > 0 ? (
                        <span className="text-[12.5px] font-semibold text-muted-foreground">
                          🔁 {revised} item{revised === 1 ? "" : "s"} revised
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden className="text-[22px] leading-none">
        {emoji}
      </span>
      <h2 className="font-heading text-[22px] font-bold text-primary">{title}</h2>
    </div>
  )
}
