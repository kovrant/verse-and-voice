"use client"

import { format } from "date-fns"
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Minus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { paraSummary, type ClassSession } from "@/components/student-session-bits"
import { PageLoading } from "@/components/page-loading"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  buildMonthAttendance,
  localDateKey,
  monthLabel,
  shiftMonth,
  type AttendanceDayStatus,
} from "@/lib/attendance"
import { DAY_LABELS } from "@/components/class-days-picker"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn, formatSessionDuration } from "@/lib/utils"

const SESSION_SELECT =
  "id, started_at, ended_at, duration_seconds, starting_para, ending_para, paras_covered, memorization_revised, notes"

function statusMeta(status: AttendanceDayStatus): {
  label: string
  className: string
  icon: typeof Check
} {
  switch (status) {
    case "attended":
      return {
        label: "Attended",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        icon: Check,
      }
    case "missed":
      return {
        label: "No record",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
        icon: X,
      }
    case "upcoming":
      return {
        label: "Upcoming",
        className: "bg-secondary text-muted-foreground",
        icon: Minus,
      }
    default:
      return { label: "Off", className: "bg-secondary text-muted-foreground", icon: Minus }
  }
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
    () =>
      buildMonthAttendance(student?.class_days ?? null, sessions, view.year, view.month),
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 flex-shrink-0">
          <CalendarCheck className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Class days you attended — saved when your teacher ends live class.
          </p>
        </div>
      </div>

      {!summary.configured ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your class schedule isn&apos;t set up yet. Ask your teacher to add your class days —
            then this page will show which days you attended.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 text-center">
              <p className="font-semibold text-foreground">{monthLabel(view.year, view.month)}</p>
              {classDaysLabel ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">Class days: {classDaysLabel}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={!canGoForward}
              onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card">
            <CardContent className="py-5 px-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                This month
              </p>
              <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-foreground">
                {summary.attendedCount}
                <span className="text-lg font-semibold text-muted-foreground">
                  {" "}
                  / {summary.dueCount} class days
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.dueCount === 0
                  ? "No scheduled class days yet this month."
                  : summary.attendedCount === summary.dueCount
                    ? "Perfect attendance so far — MashaAllah."
                    : `${summary.dueCount - summary.attendedCount} scheduled day${summary.dueCount - summary.attendedCount === 1 ? "" : "s"} without a class record.`}
              </p>
            </CardContent>
          </Card>

          {loadingData ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : summary.days.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No scheduled class days this month.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Scheduled days
              </p>
              <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
                {summary.days.map((day) => {
                  const meta = statusMeta(day.status)
                  const Icon = meta.icon
                  const fullSession = sessions.find(
                    (s) => localDateKey(new Date(s.started_at)) === day.dateKey,
                  )
                  const paras = fullSession ? paraSummary(fullSession) : null
                  const revised = fullSession?.memorization_revised?.length ?? 0
                  return (
                    <div
                      key={day.dateKey}
                      className="flex items-start gap-3 px-4 py-3.5 sm:items-center"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-secondary/50">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">
                          {day.weekday}
                        </span>
                        <span className="text-sm font-bold tabular-nums leading-none">
                          {Number(day.dateKey.split("-")[2])}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              meta.className,
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          {day.session ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatSessionDuration(day.session.duration_seconds)}
                            </span>
                          ) : null}
                          {paras ? (
                            <span className="text-[11px] text-muted-foreground">{paras.label}</span>
                          ) : null}
                          {revised > 0 ? (
                            <span className="text-[11px] text-muted-foreground">
                              {revised} revised
                            </span>
                          ) : null}
                        </div>
                        {day.status === "missed" ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            No live class was recorded on this day.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {sessions.length > 0 && !loadingData ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class log ({sessions.length})
              </p>
              <div className="space-y-2">
                {sessions.map((session) => {
                  const started = new Date(session.started_at)
                  const paras = paraSummary(session)
                  const revised = session.memorization_revised?.length ?? 0
                  return (
                    <Card key={session.id}>
                      <CardContent className="py-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {format(started, "EEE, MMM d · h:mm a")}
                        </p>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatSessionDuration(session.duration_seconds)}
                        </span>
                        {paras ? (
                          <span className="text-[11px] rounded-md bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                            {paras.label}
                          </span>
                        ) : null}
                        {revised > 0 ? (
                          <span className="text-[11px] text-muted-foreground">
                            {revised} item{revised === 1 ? "" : "s"} revised
                          </span>
                        ) : null}
                      </CardContent>
                    </Card>
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
