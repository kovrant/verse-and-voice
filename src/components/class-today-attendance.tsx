"use client"

import {
  CalendarCheck,
  CalendarOff,
  Check,
  type LucideIcon,
  RotateCcw,
  TreePalm,
  UserX,
} from "lucide-react"
import { useEffect, useState } from "react"

import type { ClassStudent } from "@/components/class-student-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  isScheduledDay,
} from "@/lib/attendance"
import { compareByClassTime } from "@/lib/class-time"
import { pktDateKey } from "@/lib/monthly-report"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

/** Shared look for an attendance status (also used by the student calendar). */
export const ATTENDANCE_TONE: Record<
  AttendanceStatus | "unmarked",
  { icon: LucideIcon | null; active: string; dot: string }
> = {
  present: {
    icon: Check,
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    dot: "bg-emerald-500",
  },
  student_absent: {
    icon: UserX,
    active: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    dot: "bg-amber-500",
  },
  teacher_absent: {
    icon: CalendarOff,
    active: "border-sky-500/30 bg-sky-500/10 text-sky-600",
    dot: "bg-sky-500",
  },
  holiday: {
    icon: TreePalm,
    active: "border-neutral-400/40 bg-neutral-500/10 text-neutral-600 dark:text-neutral-300",
    dot: "bg-neutral-400",
  },
  unmarked: {
    icon: null,
    active: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/30",
  },
}

type Marks = Record<string, AttendanceStatus>

/** Next calendar day of a "YYYY-MM-DD" date. */
function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** Class page landing: mark today's (PKT) scheduled students. A saved class reads as present. */
export function ClassTodayAttendance({ students }: { students: ClassStudent[] }) {
  const [today] = useState(() => pktDateKey(new Date()))
  const scheduled = students
    .filter((s) => isScheduledDay(today, s.class_days))
    .sort(compareByClassTime)
  const ids = scheduled.map((s) => s.id)
  const idsKey = ids.join(",")

  const [marks, setMarks] = useState<Marks>({})
  const [taught, setTaught] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!idsKey) return
    const studentIds = idsKey.split(",")
    void Promise.all([
      supabase
        .from("class_attendance")
        .select("student_id, status")
        .eq("class_date", today)
        .in("student_id", studentIds),
      supabase
        .from("class_sessions")
        .select("student_id")
        .in("student_id", studentIds)
        .gte("started_at", `${today}T00:00:00+05:00`)
        .lt("started_at", `${nextDate(today)}T00:00:00+05:00`),
    ]).then(([marksRes, sessionsRes]) => {
      if (marksRes.error) console.error("Failed to load attendance:", marksRes.error)
      const loaded: Marks = {}
      for (const r of marksRes.data ?? []) loaded[r.student_id] = r.status as AttendanceStatus
      setMarks(loaded)
      setTaught(new Set((sessionsRes.data ?? []).map((r) => r.student_id as string)))
    })
  }, [idsKey, today])

  if (scheduled.length === 0) {
    return <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
  }

  const statusOf = (id: string): AttendanceStatus | "unmarked" =>
    marks[id] ?? (taught.has(id) ? "present" : "unmarked")

  // Optimistic: apply `next`, write, roll back to `prev` on error.
  async function commit(
    next: Marks,
    write: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    const prev = marks
    setMarks(next)
    const { error } = await write()
    if (error) {
      setMarks(prev)
      toast.error(`Couldn't update attendance: ${error.message}`)
    }
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    const next = { ...marks }
    if (marks[studentId] === status) {
      // Clicking the active mark clears it.
      delete next[studentId]
      void commit(next, () =>
        supabase
          .from("class_attendance")
          .delete()
          .eq("student_id", studentId)
          .eq("class_date", today),
      )
      return
    }
    next[studentId] = status
    void commit(next, () =>
      supabase.from("class_attendance").upsert(
        {
          student_id: studentId,
          class_date: today,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,class_date" },
      ),
    )
  }

  // Day-wide: never overwrites someone already present (mark or saved class).
  function markAll(status: "teacher_absent" | "holiday") {
    const targets = ids.filter((id) => statusOf(id) !== "present")
    if (targets.length === 0) return
    const next = { ...marks }
    for (const id of targets) next[id] = status
    const now = new Date().toISOString()
    void commit(next, () =>
      supabase.from("class_attendance").upsert(
        targets.map((id) => ({ student_id: id, class_date: today, status, updated_at: now })),
        { onConflict: "student_id,class_date" },
      ),
    )
  }

  const dayOffIds = ids.filter((id) => marks[id] === "teacher_absent" || marks[id] === "holiday")

  function clearDayOff() {
    const next = { ...marks }
    for (const id of dayOffIds) delete next[id]
    void commit(next, () =>
      supabase
        .from("class_attendance")
        .delete()
        .eq("class_date", today)
        .in("student_id", dayOffIds)
        .in("status", ["teacher_absent", "holiday"]),
    )
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Today&apos;s attendance
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {scheduled.length} scheduled today · a saved class counts as present
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll("teacher_absent")}>
            <CalendarOff className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
            I&apos;m absent today
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAll("holiday")}>
            <TreePalm className="mr-1.5 h-3.5 w-3.5" />
            Holiday today
          </Button>
          {dayOffIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearDayOff}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear day off
            </Button>
          )}
        </div>
      </div>
      <CardContent className="divide-y divide-border/50 py-1">
        {scheduled.map((s) => {
          const current = statusOf(s.id)
          return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.class_time || "No class time set"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {ATTENDANCE_STATUSES.map((status) => {
                  const tone = ATTENDANCE_TONE[status]
                  const Icon = tone.icon!
                  const isActive = current === status
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setStatus(s.id, status)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? cn(tone.active, "font-semibold")
                          : "border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ATTENDANCE_LABELS[status]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
