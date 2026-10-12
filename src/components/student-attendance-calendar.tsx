"use client"

import * as Popover from "@radix-ui/react-popover"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

import { DAY_LABELS } from "@/components/class-days-picker"
import { ATTENDANCE_TONE } from "@/components/class-today-attendance"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  buildAttendanceDays,
  isScheduledDay,
  monthLabel,
  scheduledDates,
  shiftMonth,
  summarizeAttendance,
} from "@/lib/attendance"
import { pktDateKey } from "@/lib/monthly-report"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Marks = Record<string, AttendanceStatus>

const pad2 = (n: number) => String(n).padStart(2, "0")

/** Month calendar of a student's attendance; tap a past day to mark it. Dates are PKT. */
export function StudentAttendanceCalendar({
  student,
  sessionStarts,
}: {
  student: {
    id: string
    class_days: number[] | null
    started_at: string | null
    ended_at: string | null
  }
  /** class_sessions.started_at timestamps */
  sessionStarts: string[]
}) {
  const [today] = useState(() => pktDateKey(new Date()))
  const [month, setMonth] = useState(() => {
    const [year, m] = today.split("-").map(Number)
    return { year, month: m }
  })
  const [marks, setMarks] = useState<Marks>({})
  const [openDate, setOpenDate] = useState<string | null>(null)

  const prefix = `${month.year}-${pad2(month.month)}-`
  const dayCount = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate()
  const firstDate = `${prefix}01`
  const lastDate = prefix + pad2(dayCount)

  useEffect(() => {
    let cancelled = false
    void supabase
      .from("class_attendance")
      .select("class_date, status")
      .eq("student_id", student.id)
      .gte("class_date", firstDate)
      .lte("class_date", lastDate)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error("Failed to load attendance:", error)
        const loaded: Marks = {}
        for (const r of data ?? []) loaded[r.class_date] = r.status as AttendanceStatus
        setMarks(loaded)
      })
    return () => {
      cancelled = true
    }
  }, [student.id, firstDate, lastDate])

  const days = buildAttendanceDays({
    scheduled: scheduledDates(
      month,
      student.class_days,
      student.started_at,
      student.ended_at,
      today,
    ),
    sessionDates: sessionStarts.map(pktDateKey).filter((d) => d.startsWith(prefix)),
    marks: Object.entries(marks).map(([class_date, status]) => ({ class_date, status })),
  })
  const byDate = new Map(days.map((d) => [d.date, d]))
  const summary = summarizeAttendance(days)
  const [y0, m0, d0] = firstDate.split("-").map(Number)
  const leadingBlanks = new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay()
  const isCurrentMonth = today.startsWith(prefix)

  function step(delta: number) {
    const next = shiftMonth(month.year, month.month - 1, delta)
    setMonth({ year: next.year, month: next.month + 1 })
  }

  // Optimistic with rollback, like toggleFee on the student page.
  async function setStatus(date: string, status: AttendanceStatus | null) {
    setOpenDate(null)
    const prev = marks
    const next = { ...marks }
    if (status) next[date] = status
    else delete next[date]
    setMarks(next)
    const { error } = status
      ? await supabase.from("class_attendance").upsert(
          {
            student_id: student.id,
            class_date: date,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,class_date" },
        )
      : await supabase
          .from("class_attendance")
          .delete()
          .eq("student_id", student.id)
          .eq("class_date", date)
    if (error) {
      setMarks(prev)
      toast.error(`Couldn't update attendance: ${error.message}`)
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Attendance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tap a day to mark it. A saved class counts as present.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium">
            {monthLabel(month.year, month.month - 1)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => step(1)}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="space-y-4 pt-4 pb-5">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {([...ATTENDANCE_STATUSES, "unmarked"] as const).map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1"
            >
              <span className={cn("h-2 w-2 rounded-full", ATTENDANCE_TONE[status].dot)} />
              {status === "unmarked" ? "Unmarked" : ATTENDANCE_LABELS[status]}
              <span className="font-semibold">{summary[status]}</span>
            </span>
          ))}
          <span className="inline-flex items-center px-1 py-1 text-muted-foreground">
            {summary.scheduled} scheduled so far
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="py-1 text-[11px] font-medium text-muted-foreground">
              {label}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: dayCount }, (_, i) => {
            const date = prefix + pad2(i + 1)
            const entry = byDate.get(date)
            const future = date > today
            const scheduled = entry?.scheduled ?? isScheduledDay(date, student.class_days)
            const tone = entry ? ATTENDANCE_TONE[entry.status] : null
            const Icon = tone?.icon
            return (
              <Popover.Root
                key={date}
                open={openDate === date}
                onOpenChange={(open) => setOpenDate(open ? date : null)}
              >
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    disabled={future}
                    title={
                      entry && entry.status !== "unmarked"
                        ? ATTENDANCE_LABELS[entry.status]
                        : undefined
                    }
                    className={cn(
                      "flex aspect-square min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      tone && entry?.status !== "unmarked"
                        ? tone.active
                        : scheduled
                          ? "border-border bg-muted/60 font-semibold text-foreground hover:bg-secondary/60"
                          : "border-transparent text-muted-foreground hover:bg-secondary/40",
                      date === today && "ring-2 ring-primary/30",
                    )}
                  >
                    <span>{i + 1}</span>
                    {Icon ? (
                      <Icon className="h-3 w-3" />
                    ) : (
                      entry && <span className={cn("h-1.5 w-1.5 rounded-full", tone?.dot)} />
                    )}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    side="bottom"
                    sideOffset={6}
                    className="z-50 w-48 rounded-xl border border-border bg-card p-2 shadow-lg"
                  >
                    <div className="space-y-1">
                      {ATTENDANCE_STATUSES.map((status) => {
                        const StatusIcon = ATTENDANCE_TONE[status].icon!
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void setStatus(date, status)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                              marks[date] === status
                                ? ATTENDANCE_TONE[status].active
                                : "border-transparent hover:bg-secondary/60",
                            )}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {ATTENDANCE_LABELS[status]}
                          </button>
                        )
                      })}
                      {marks[date] && (
                        <button
                          type="button"
                          onClick={() => void setStatus(date, null)}
                          className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary/60"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <Popover.Arrow className="fill-border" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
