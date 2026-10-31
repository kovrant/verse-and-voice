"use client"

import * as Popover from "@radix-ui/react-popover"
import {
  CalendarCheck,
  CalendarOff,
  Check,
  ChevronDown,
  type LucideIcon,
  RotateCcw,
  TreePalm,
  UserX,
} from "lucide-react"
import { useEffect, useState } from "react"

import type { ClassStudent } from "@/components/class-student-card"
import { StudentAvatar } from "@/components/student-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
    active: "border-green-500/30 bg-green-500/10 text-green-600",
    dot: "bg-green-500",
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
    active: "border-card-border bg-background-gray-secondary text-text-tertiary",
    dot: "bg-muted-foreground/30",
  },
}

type Marks = Record<string, AttendanceStatus>

/** Next calendar day of a "YYYY-MM-DD" date. */
function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/**
 * Class page landing: today's (PKT) scheduled students as small cards — time,
 * name, an attendance pill (menu of the four marks) and Start. A saved class
 * reads as present. "I'm absent" / "Holiday" for the whole day sit in a Day off menu.
 */
export function ClassTodayAttendance({
  students,
  onStart,
}: {
  students: ClassStudent[]
  onStart: (studentId: string) => void
}) {
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

  if (scheduled.length === 0) {
    return (
      <Card className="flex items-center gap-4 p-5">
        <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
          <CalendarOff className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-6 text-text-primary">No classes scheduled today</p>
          <p className="text-sm text-text-tertiary">
            You can still pick anyone below to start an extra class.
          </p>
        </div>
      </Card>
    )
  }

  const presentCount = ids.filter((id) => statusOf(id) === "present").length

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[rgba(87,80,241,0.10)] text-[#5750F1]">
            <CalendarCheck className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
              Today&apos;s classes
            </p>
            <p className="text-sm text-text-tertiary">
              {presentCount} of {scheduled.length} present · a saved class counts as present
            </p>
          </div>
        </div>

        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant="outline" size="sm">
              <CalendarOff className="mr-1.5 h-3.5 w-3.5" />
              Day off
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={6}
              className="z-50 w-56 rounded-xl border border-card-border bg-dropdowns-background p-1.5 shadow-3xl"
            >
              <MenuItem icon={CalendarOff} onClick={() => markAll("teacher_absent")}>
                I&apos;m absent today
              </MenuItem>
              <MenuItem icon={TreePalm} onClick={() => markAll("holiday")}>
                Holiday today
              </MenuItem>
              {dayOffIds.length > 0 && (
                <MenuItem icon={RotateCcw} onClick={clearDayOff}>
                  Clear day off
                </MenuItem>
              )}
              <p className="px-2.5 pb-1 pt-2 text-[11px] text-text-tertiary">
                Marks everyone not already present.
              </p>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scheduled.map((s) => {
          const current = statusOf(s.id)
          const tone = ATTENDANCE_TONE[current]
          const ToneIcon = tone.icon
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3"
            >
              <div className="relative size-11 flex-shrink-0 overflow-hidden rounded-full border border-card-border">
                <StudentAvatar
                  id={s.id}
                  name={s.name}
                  gender={s.gender}
                  sizes="44px"
                  className="origin-[50%_30%] scale-[1.7] object-[50%_30%]"
                  initialClassName="text-base"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{s.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs tabular-nums text-text-tertiary">
                    {s.class_time || "No time"}
                  </span>
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                          tone.active,
                        )}
                        title="Change attendance"
                      >
                        {ToneIcon ? (
                          <ToneIcon className="h-3 w-3" />
                        ) : (
                          <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                        )}
                        {current === "unmarked" ? "Not marked" : ATTENDANCE_LABELS[current]}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        align="start"
                        sideOffset={6}
                        className="z-50 w-48 rounded-xl border border-card-border bg-dropdowns-background p-1.5 shadow-3xl"
                      >
                        {ATTENDANCE_STATUSES.map((status) => (
                          <MenuItem
                            key={status}
                            icon={ATTENDANCE_TONE[status].icon!}
                            active={current === status}
                            onClick={() => setStatus(s.id, status)}
                          >
                            {ATTENDANCE_LABELS[status]}
                          </MenuItem>
                        ))}
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>
              <Button size="sm" onClick={() => onStart(s.id)} className="flex-shrink-0">
                Start
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Popover menu row; closes its popover when picked. */
function MenuItem({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: LucideIcon
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Popover.Close asChild>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-background-gray-primary",
          active ? "font-medium text-text-primary" : "text-text-secondary",
        )}
      >
        <Icon className="h-4 w-4 text-icon-secondary" />
        <span className="flex-1">{children}</span>
        {active && <Check className="h-4 w-4 text-primary" />}
      </button>
    </Popover.Close>
  )
}
