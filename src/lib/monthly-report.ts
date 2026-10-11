// Monthly parent report: pure calculations. Month boundaries are PKT (UTC+5,
// no DST) — see okf/architecture/timezone-and-dates.md.

import { QAIDA_PARA } from "@/lib/qaida"

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

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

function daysInMonth({ year, month }: ReportMonth): string[] {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Array.from(
    { length: count },
    (_, i) => `${formatReportMonth({ year, month })}-${String(i + 1).padStart(2, "0")}`,
  )
}

// ── Attendance ────────────────────────────────────────────────────────────────

export interface AttendanceInput {
  month: ReportMonth
  /** 0 = Sunday … 6 = Saturday */
  classDays: number[] | null
  /** Date-only "YYYY-MM-DD" */
  startedAt: string | null
  endedAt: string | null
  sessionStarts: string[]
  sessionSeconds: number[]
  /** Today's PKT date; scheduled days after it are not counted. */
  today: string
}

export interface Attendance {
  scheduled: number
  /** Scheduled days that had a class. */
  attended: number
  missed: number
  /** Classes on days that weren't scheduled (make-up classes). */
  extra: number
  sessions: number
  totalMinutes: number
}

export function computeAttendance(input: AttendanceInput): Attendance {
  const days = new Set(input.classDays ?? [])
  const scheduled = daysInMonth(input.month).filter((date) => {
    if (input.startedAt && date < input.startedAt) return false
    if (input.endedAt && date > input.endedAt) return false
    if (date > input.today) return false
    const [y, m, d] = date.split("-").map(Number)
    return days.has(new Date(Date.UTC(y, m - 1, d)).getUTCDay())
  })
  const classDates = new Set(input.sessionStarts.map(pktDateKey))
  const attended = scheduled.filter((d) => classDates.has(d)).length
  const scheduledSet = new Set(scheduled)
  const extra = Array.from(classDates).filter((d) => !scheduledSet.has(d)).length
  const totalSeconds = input.sessionSeconds.reduce((sum, s) => sum + (s || 0), 0)
  return {
    scheduled: scheduled.length,
    attended,
    missed: scheduled.length - attended,
    extra,
    sessions: input.sessionStarts.length,
    totalMinutes: Math.round(totalSeconds / 60),
  }
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
  /** True when some pages were estimated (no starting page saved, or para size unknown). */
  pagesApproximate: boolean
}

function endOf(s: ReadingSession): Position | null {
  if (s.ending_para == null) return null
  return { para: s.ending_para, page: s.ending_page ?? s.last_page ?? null }
}

/**
 * Pages between two positions. Same para: the page difference. A different
 * para (either direction — rounds are read both ways): the rest of the old
 * para plus the pages into the new one. Without the old para's page count the
 * rest is unknown, so only the new pages are counted and it's approximate.
 */
function pagesBetween(
  a: Position,
  b: Position,
  totalPages: Record<number, number>,
): { pages: number; exact: boolean } | null {
  if (a.page == null || b.page == null) return null
  if (a.para === b.para) return { pages: Math.max(0, b.page - a.page), exact: true }
  const total = totalPages[a.para]
  const rest = total ? Math.max(0, total - a.page) : 0
  return { pages: rest + Math.max(0, b.page - 1), exact: Boolean(total) }
}

/**
 * Where the month started and ended, which paras were read, and roughly how
 * many pages. `previous` is the last session before the month (if any): its
 * end is where this month began.
 */
export function computeReadingProgress(
  sessions: ReadingSession[],
  previous: ReadingSession | null,
  totalPages: Record<number, number> = {},
): ReadingProgress {
  const paras = new Set<number>()
  for (const s of sessions) {
    for (const p of s.paras_covered ?? []) paras.add(p)
    if (s.starting_para != null) paras.add(s.starting_para)
    if (s.ending_para != null) paras.add(s.ending_para)
  }

  const first = sessions[0]
  const start: Position | null =
    (previous && endOf(previous)) ??
    (first && first.starting_para != null
      ? { para: first.starting_para, page: first.starting_page ?? null }
      : null)

  let pages: number | null = null
  let approximate = false
  let cursor = start
  for (const s of sessions) {
    const end = endOf(s)
    if (!end) continue
    // Sessions saved before starting_page existed start where the last one ended.
    const exactStart = s.starting_para != null && s.starting_page != null
    const from: Position | null = exactStart
      ? { para: s.starting_para!, page: s.starting_page! }
      : cursor
    const counted = from ? pagesBetween(from, end, totalPages) : null
    if (counted) {
      pages = (pages ?? 0) + counted.pages
      if (!counted.exact || !exactStart) approximate = true
    }
    cursor = end
  }

  const last = [...sessions].reverse().map(endOf).find(Boolean) ?? null
  return {
    start,
    end: last,
    paras: Array.from(paras).sort((a, b) => a - b),
    pages,
    pagesApproximate: approximate,
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
