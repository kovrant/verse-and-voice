/** Attendance calendar helpers — schedule vs completed class_sessions. */

export type AttendanceDayStatus = "attended" | "missed" | "upcoming" | "off"

export interface AttendanceSessionRef {
  started_at: string
  duration_seconds: number
}

export interface AttendanceDay {
  dateKey: string
  label: string
  weekday: string
  status: AttendanceDayStatus
  session: AttendanceSessionRef | null
}

export interface MonthAttendance {
  configured: boolean
  year: number
  month: number
  /** Scheduled class days in this month that are not in the future. */
  dueCount: number
  attendedCount: number
  days: AttendanceDay[]
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function normalizeDays(classDays: number[] | null | undefined): number[] {
  if (!classDays || classDays.length === 0) return []
  return [...new Set(classDays.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
}

function sessionsByDate(sessions: AttendanceSessionRef[]): Map<string, AttendanceSessionRef> {
  const map = new Map<string, AttendanceSessionRef>()
  for (const s of sessions) {
    const key = localDateKey(new Date(s.started_at))
    // Keep the longest session if multiple on one day (edge case).
    const prev = map.get(key)
    if (!prev || s.duration_seconds > prev.duration_seconds) map.set(key, s)
  }
  return map
}

/**
 * Build a month view: every calendar day that is a scheduled class day,
 * marked attended / missed / upcoming. Uses the viewer's local timezone.
 */
export function buildMonthAttendance(
  classDays: number[] | null | undefined,
  sessions: AttendanceSessionRef[],
  year: number,
  month: number,
  now: Date = new Date(),
): MonthAttendance {
  const days = normalizeDays(classDays)
  const scheduled = new Set(days)
  const attended = sessionsByDate(sessions)
  const todayKey = localDateKey(now)

  if (days.length === 0) {
    return { configured: false, year, month, dueCount: 0, attendedCount: 0, days: [] }
  }

  const lastDay = new Date(year, month + 1, 0).getDate()
  const rows: AttendanceDay[] = []
  let dueCount = 0
  let attendedCount = 0

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d)
    const dow = date.getDay()
    if (!scheduled.has(dow)) continue

    const dateKey = localDateKey(date)
    const session = attended.get(dateKey) ?? null
    let status: AttendanceDayStatus

    if (dateKey > todayKey) {
      status = "upcoming"
    } else if (session) {
      status = "attended"
      attendedCount++
      dueCount++
    } else {
      status = "missed"
      dueCount++
    }

    rows.push({
      dateKey,
      label: `${WEEKDAY_NAMES[dow]}, ${date.toLocaleString(undefined, { month: "short", day: "numeric" })}`,
      weekday: WEEKDAY_NAMES[dow],
      status,
      session,
    })
  }

  return {
    configured: true,
    year,
    month,
    dueCount,
    attendedCount,
    days: rows,
  }
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
  return parseKey(`${year}-${pad2(month + 1)}-01`).toLocaleString(undefined, {
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
