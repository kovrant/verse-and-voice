/** Attendance helpers: month navigation and class_attendance days. */

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Shift (year, month) by delta months. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  })
}

// ── Explicit attendance (class_attendance) ───────────────────────────────────
// Dates are PKT calendar dates "YYYY-MM-DD" (okf/domain/class-attendance.md).

export type AttendanceStatus = "present" | "student_absent" | "teacher_absent" | "holiday"

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "present",
  "student_absent",
  "teacher_absent",
  "holiday",
]

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  student_absent: "Student absent",
  teacher_absent: "Teacher absent",
  holiday: "Holiday",
}

export interface AttendanceMark {
  class_date: string
  status: AttendanceStatus
}

/** True when the date's own weekday (not the viewer's timezone) is a class day. */
export function isScheduledDay(date: string, classDays: number[] | null | undefined): boolean {
  if (!classDays?.length) return false
  const [y, m, d] = date.split("-").map(Number)
  return classDays.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())
}

/** Scheduled class dates in a month (month 1–12), from enrolment to ended_at / today inclusive. */
export function scheduledDates(
  month: { year: number; month: number },
  classDays: number[] | null | undefined,
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
  today: string,
): string[] {
  const count = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate()
  const prefix = `${month.year}-${pad2(month.month)}-`
  const out: string[] = []
  for (let day = 1; day <= count; day++) {
    const date = prefix + pad2(day)
    if (startedAt && date < startedAt) continue
    if (endedAt && date > endedAt) continue
    if (date > today) continue
    if (isScheduledDay(date, classDays)) out.push(date)
  }
  return out
}

export interface AttendanceEntry {
  date: string
  scheduled: boolean
  status: AttendanceStatus | "unmarked"
}

/** One entry per scheduled / session / marked date. A mark wins, then a session (present). */
export function buildAttendanceDays({
  scheduled,
  sessionDates,
  marks,
}: {
  scheduled: string[]
  sessionDates: string[]
  marks: AttendanceMark[]
}): AttendanceEntry[] {
  const scheduledSet = new Set(scheduled)
  const sessionSet = new Set(sessionDates)
  const markMap = new Map(marks.map((m) => [m.class_date, m.status]))
  const dates = new Set([...scheduled, ...sessionDates, ...markMap.keys()])
  return [...dates].sort().map((date) => ({
    date,
    scheduled: scheduledSet.has(date),
    status: markMap.get(date) ?? (sessionSet.has(date) ? "present" : "unmarked"),
  }))
}

export type AttendanceSummary = Record<AttendanceStatus | "unmarked", number> & {
  scheduled: number
}

export function summarizeAttendance(days: AttendanceEntry[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    present: 0,
    student_absent: 0,
    teacher_absent: 0,
    holiday: 0,
    unmarked: 0,
    scheduled: 0,
  }
  for (const d of days) {
    summary[d.status]++
    if (d.scheduled) summary.scheduled++
  }
  return summary
}
