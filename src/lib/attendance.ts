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
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function monthLabel(year: number, month: number): string {
  return parseKey(`${year}-${pad2(month + 1)}-01`).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  })
}
