// Monthly parent report: pure calculations. Month boundaries are PKT (UTC+5,
// no DST) — see okf/architecture/timezone-and-dates.md.

import type { AttendanceEntry } from "@/lib/attendance"
import { QAIDA_PARA } from "@/lib/qaida"

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

/**
 * Pages in a para of the academy's 16-line mushaf. Most paras are 18 pages; a
 * para's own count (student_para_progress.total_pages) wins when known.
 * ponytail: per-para exceptions (e.g. Para 30) fall back to 18 until their
 * real count is recorded.
 */
export const DEFAULT_PARA_PAGES = 18

export interface ReportMonth {
  year: number
  /** 1–12 */
  month: number
}

/** "2026-09" → { year: 2026, month: 9 }; anything else → null. */
export function parseReportMonth(value: string | null | undefined): ReportMonth | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "")
  if (!m) return null
  const month = Number(m[2])
  return month >= 1 && month <= 12 ? { year: Number(m[1]), month } : null
}

export function formatReportMonth({ year, month }: ReportMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** The PKT calendar date ("YYYY-MM-DD") of an instant. */
export function pktDateKey(value: string | Date): string {
  const d = new Date(new Date(value).getTime() + PKT_OFFSET_MS)
  return d.toISOString().slice(0, 10)
}

/** Reports cover a finished month, so default to the month before today (PKT). */
export function defaultReportMonth(now: Date = new Date()): ReportMonth {
  const [y, m] = pktDateKey(now).split("-").map(Number)
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 }
}

/** Timestamptz bounds for queries: [start, end) at PKT midnight. */
export function monthRange({ year, month }: ReportMonth): { start: string; end: string } {
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return {
    start: `${formatReportMonth({ year, month })}-01T00:00:00+05:00`,
    end: `${formatReportMonth(next)}-01T00:00:00+05:00`,
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────

/**
 * Headline attendance from the month's days (see buildAttendanceDays in
 * src/lib/attendance.ts). Teacher-absent and holiday days don't count against
 * the student, so they leave the "counted" total too.
 */
export function attendanceTotals(days: AttendanceEntry[]): { attended: number; counted: number } {
  const scheduled = days.filter((d) => d.scheduled)
  const counted = scheduled.filter((d) => d.status !== "teacher_absent" && d.status !== "holiday")
  return { attended: counted.filter((d) => d.status === "present").length, counted: counted.length }
}

// ── Reading progress ─────────────────────────────────────────────────────────

export interface ReadingSession {
  starting_para: number | null
  starting_page?: number | null
  ending_para: number | null
  ending_page?: number | null
  last_page?: number | null
  paras_covered: number[] | null
}

export interface Position {
  para: number
  page: number | null
}

export interface ReadingProgress {
  start: Position | null
  end: Position | null
  /** Distinct paras opened this month, ascending (0 = Norani Qaida). */
  paras: number[]
  /** Null when no session has enough data to count pages. */
  pages: number | null
  /** True when the month's starting page isn't known exactly (first tracked month, before starting_page). */
  pagesApproximate: boolean
  /** Quran paras finished this month: every para from the start position up to (not including) the end one. */
  parasCompleted: number[]
}

function endOf(s: ReadingSession): Position | null {
  if (s.ending_para == null) return null
  return { para: s.ending_para, page: s.ending_page ?? s.last_page ?? null }
}

function paraSize(para: number, totalPages: Record<number, number>): number {
  return totalPages[para] ?? DEFAULT_PARA_PAGES
}

/**
 * Pages read moving from position a to b ("on page N" = N not finished yet).
 * Same para: the page difference. Different para (either direction — rounds
 * are read both ways): the rest of a's para, every para in between, and the
 * pages into b's para.
 */
function pagesBetween(a: Position, b: Position, totalPages: Record<number, number>): number | null {
  if (a.page == null || b.page == null) return null
  if (a.para === b.para) return Math.max(0, b.page - a.page)
  if (a.para === QAIDA_PARA || b.para === QAIDA_PARA) return Math.max(0, b.page - 1)
  const step = b.para > a.para ? 1 : -1
  let pages = Math.max(0, paraSize(a.para, totalPages) - a.page + 1)
  for (let p = a.para + step; p !== b.para; p += step) pages += paraSize(p, totalPages)
  return pages + Math.max(0, b.page - 1)
}

/**
 * The month's reading as NET movement: where the student stood at the start of
 * the month → where they stood at the end. What happens in between is ignored
 * on purpose — the teacher often opens a class on one para and clicks to
 * another to find the student's place, and a session can even end on a para
 * the teacher was only browsing. Summing every session would count all of that
 * as reading (and "complete" paras the student never read).
 *
 * Start = the last class before the month. With none (the first tracked
 * month), the first class's recorded opening page when it has one, else where
 * the first class ended — its opening para isn't trustworthy — which makes the
 * page count approximate.
 */
export function computeReadingProgress(
  sessions: ReadingSession[],
  previous: ReadingSession | null,
  totalPages: Record<number, number> = {},
): ReadingProgress {
  const paras = new Set<number>()
  for (const s of sessions) {
    for (const p of s.paras_covered ?? []) paras.add(p)
    if (s.ending_para != null) paras.add(s.ending_para)
  }

  const ends = sessions.map(endOf).filter((p): p is Position => p !== null)
  const first = sessions[0]
  const previousEnd = previous ? endOf(previous) : null
  const openedExactly =
    first?.starting_para != null && first.starting_page != null
      ? { para: first.starting_para, page: first.starting_page }
      : null
  const start: Position | null = previousEnd ?? openedExactly ?? ends[0] ?? null
  const end: Position | null = ends.at(-1) ?? null

  const parasCompleted: number[] = []
  if (
    start &&
    end &&
    start.para !== end.para &&
    start.para !== QAIDA_PARA &&
    end.para !== QAIDA_PARA
  ) {
    const step = end.para > start.para ? 1 : -1
    for (let p = start.para; p !== end.para; p += step) parasCompleted.push(p)
    parasCompleted.sort((x, y) => x - y)
  }

  return {
    start,
    end,
    paras: Array.from(paras).sort((x, y) => x - y),
    pages: start && end ? pagesBetween(start, end, totalPages) : null,
    pagesApproximate: !previousEnd && !openedExactly && sessions.length > 0,
    parasCompleted,
  }
}

export function positionLabel(p: Position | null): string {
  if (!p) return "—"
  const book = p.para === QAIDA_PARA ? "Norani Qaida" : `Para ${p.para}`
  return p.page ? `${book}, page ${p.page}` : book
}

// ── Memorization ─────────────────────────────────────────────────────────────

export interface LessonChunks {
  title: string
  totalChunks: number
  /** memorized_at of every chunk the student has memorized in this lesson. */
  memorizedAt: string[]
}

export interface MemorizationSummary {
  /** Parts memorized this month, per lesson. */
  partsByLesson: { title: string; parts: number }[]
  partsTotal: number
  /** Lessons whose final part was memorized this month. */
  lessonsCompleted: string[]
}

export function computeMemorization(
  lessons: LessonChunks[],
  range: { start: string; end: string },
): MemorizationSummary {
  const from = new Date(range.start).getTime()
  const to = new Date(range.end).getTime()
  const inMonth = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= from && t < to
  }

  const partsByLesson: { title: string; parts: number }[] = []
  const lessonsCompleted: string[] = []
  for (const l of lessons) {
    const parts = l.memorizedAt.filter(inMonth).length
    if (parts > 0) partsByLesson.push({ title: l.title, parts })
    const done = l.totalChunks > 0 && l.memorizedAt.length >= l.totalChunks
    const finishedAt = l.memorizedAt.reduce((max, t) => (t > max ? t : max), "")
    if (done && finishedAt && inMonth(finishedAt)) lessonsCompleted.push(l.title)
  }
  return {
    partsByLesson,
    partsTotal: partsByLesson.reduce((sum, l) => sum + l.parts, 0),
    lessonsCompleted,
  }
}

/** Revisions done in class this month: title → times revised, most first. */
export function countRevisions(sessions: { memorization_revised: string[] | null }[]) {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    for (const title of s.memorization_revised ?? []) {
      counts.set(title, (counts.get(title) ?? 0) + 1)
    }
  }
  return Array.from(counts, ([title, times]) => ({ title, times })).sort(
    (a, b) => b.times - a.times || a.title.localeCompare(b.title),
  )
}
