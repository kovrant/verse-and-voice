import type { AttendanceMark } from "@/lib/attendance"
import { pktDateKey } from "@/lib/monthly-report"

/** Milestone thresholds celebrated with a toast. */
const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const

export type WeekDayStatus = "off" | "done" | "missed" | "today" | "upcoming"

export interface StreakInfo {
  /** False when teacher hasn't set class_days yet — UI should hide the streak. */
  configured: boolean
  current: number
  best: number
  /** Today is a scheduled class day. */
  todayScheduled: boolean
  /** Student already has a class today (PKT). */
  todayDone: boolean
  /** Sun→Sat statuses for the current week (PKT). */
  week: WeekDayStatus[]
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Local calendar date key YYYY-MM-DD in the viewer's timezone. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function addDays(key: string, delta: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + delta)
  return localDateKey(d)
}

function dayOfWeek(key: string): number {
  return parseKey(key).getDay() // 0=Sun … 6=Sat
}

function normalizeDays(classDays: number[] | null | undefined): number[] {
  if (!classDays || classDays.length === 0) return []
  return [...new Set(classDays.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
}

/** Walk backward to the most recent class day on or before `fromKey`. */
function previousScheduledDay(
  fromKey: string,
  isClassDay: (key: string) => boolean,
): string | null {
  let key = fromKey
  for (let i = 0; i < 370; i++) {
    if (isClassDay(key)) return key
    key = addDays(key, -1)
  }
  return null
}

/**
 * Schedule-aware streak from classes (sessions, or days the teacher marked
 * present). Only scheduled class days can keep or break the streak. Days the
 * teacher marked teacher_absent or holiday are skipped like off days, so the
 * teacher's absence never breaks a child's streak. Days are PKT, the academy's
 * clock (okf/domain/class-attendance.md).
 */
export function computeStreak(
  classDays: number[] | null | undefined,
  sessionStartedAts: string[],
  now: Date = new Date(),
  marks: AttendanceMark[] = [],
): StreakInfo {
  const days = normalizeDays(classDays)
  const todayKey = pktDateKey(now)
  const scheduled = new Set(days)
  const daysOff = new Set(
    marks
      .filter((m) => m.status === "teacher_absent" || m.status === "holiday")
      .map((m) => m.class_date),
  )
  const isClassDay = (key: string) => scheduled.has(dayOfWeek(key)) && !daysOff.has(key)

  const attended = new Set([
    ...sessionStartedAts.map((iso) => pktDateKey(iso)),
    ...marks.filter((m) => m.status === "present").map((m) => m.class_date),
  ])

  const emptyWeek = (): WeekDayStatus[] => Array.from({ length: 7 }, () => "off" as WeekDayStatus)

  if (days.length === 0) {
    return {
      configured: false,
      current: 0,
      best: 0,
      todayScheduled: false,
      todayDone: false,
      week: emptyWeek(),
    }
  }

  const todayScheduled = isClassDay(todayKey)
  const todayDone = todayScheduled && attended.has(todayKey)

  // Current streak: walk backward over scheduled days only.
  // If today is scheduled and not done yet, don't break — start from the previous scheduled day.
  let current = 0
  let cursor: string | null = todayScheduled
    ? todayDone
      ? todayKey
      : previousScheduledDay(addDays(todayKey, -1), isClassDay)
    : previousScheduledDay(todayKey, isClassDay)

  while (cursor) {
    if (!attended.has(cursor)) break
    current++
    cursor = previousScheduledDay(addDays(cursor, -1), isClassDay)
  }

  // Best streak: scan all attended scheduled days chronologically.
  const attendedScheduled = [...attended].filter((k) => isClassDay(k)).sort()

  let best = 0
  let run = 0
  let prev: string | null = null
  for (const key of attendedScheduled) {
    if (!prev) {
      run = 1
    } else {
      // Count consecutive scheduled slots between prev and key with no miss.
      let walk = previousScheduledDay(addDays(key, -1), isClassDay)
      let gap = false
      while (walk && walk > prev) {
        if (!attended.has(walk)) {
          gap = true
          break
        }
        walk = previousScheduledDay(addDays(walk, -1), isClassDay)
      }
      // Contiguous if the previous scheduled day before `key` is `prev` (or we filled the gap).
      const prevSched = previousScheduledDay(addDays(key, -1), isClassDay)
      if (!gap && prevSched === prev) run++
      else run = 1
    }
    if (run > best) best = run
    prev = key
  }
  if (current > best) best = current

  // Week strip: Sun→Sat of the current PKT week. Days off read as "off".
  const weekStart = addDays(todayKey, -dayOfWeek(todayKey))
  const week: WeekDayStatus[] = []
  for (let i = 0; i < 7; i++) {
    const key = addDays(weekStart, i)
    if (!isClassDay(key)) {
      week.push("off")
      continue
    }
    if (key === todayKey) {
      week.push(attended.has(key) ? "done" : "today")
      continue
    }
    if (key > todayKey) {
      week.push("upcoming")
      continue
    }
    week.push(attended.has(key) ? "done" : "missed")
  }

  return { configured: true, current, best, todayScheduled, todayDone, week }
}

/** Next milestone strictly above `current`, or null if past the last one. */
export function nextMilestone(current: number): number | null {
  for (const m of STREAK_MILESTONES) {
    if (current < m) return m
  }
  return null
}

/** Milestones hit by this streak that haven't been celebrated yet. */
export function pendingMilestones(current: number, celebratedMax: number): number[] {
  return STREAK_MILESTONES.filter((m) => m <= current && m > celebratedMax)
}

export function milestoneStorageKey(studentId: string): string {
  return `streak-milestone-${studentId}`
}
