"use client"

import { Download } from "lucide-react"
import { useEffect, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { computeProgress, getActiveRound, type QuranRound } from "@/components/quran-progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type AttendanceEntry,
  type AttendanceMark,
  type AttendanceSummary,
  buildAttendanceDays,
  scheduledDates,
  summarizeAttendance,
} from "@/lib/attendance"
import {
  attendanceTotals,
  computeMemorization,
  computeReadingProgress,
  countRevisions,
  defaultReportMonth,
  formatReportMonth,
  type LessonChunks,
  type MemorizationSummary,
  monthRange,
  parseReportMonth,
  pktDateKey,
  positionLabel,
  type ReadingProgress,
  type ReadingSession,
  type ReportMonth,
} from "@/lib/monthly-report"
import { paraLabel } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"
import { safeFormatDate, type Student } from "@/lib/utils"

// Monthly parent report: the "Monthly Report" tab on the student page — data
// loading + the printable A4 sheet. See okf/domain/monthly-parent-report.md.

/** Student page tab: pick a month, view the report, download it as a PDF. */
export function StudentMonthlyReport({ studentId }: { studentId: string }) {
  const [monthKey, setMonthKey] = useState(() => formatReportMonth(defaultReportMonth()))
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    const month = parseReportMonth(monthKey)
    if (!month) return
    let active = true
    setData(null)
    void loadReport(studentId, month).then((d) => {
      if (active) setData(d)
    })
    return () => {
      active = false
    }
  }, [studentId, monthKey])

  const month = parseReportMonth(monthKey)!
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">
          Progress for one month. Download it and send it to the parents.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label="Report month"
            value={monthKey}
            max={pktDateKey(new Date()).slice(0, 7)}
            onChange={(e) => parseReportMonth(e.target.value) && setMonthKey(e.target.value)}
            className="h-9 w-[150px]"
          />
          <Button size="sm" onClick={() => window.print()} disabled={!data}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>
      {data ? <ReportSheet data={data} month={month} /> : <PageLoading variant="detail" />}
    </div>
  )
}

type Session = ReadingSession & {
  started_at: string
  duration_seconds: number
  memorization_revised: string[] | null
}

export interface ReportData {
  student: Student
  attendance: {
    days: AttendanceEntry[]
    summary: AttendanceSummary
    attended: number
    counted: number
    sessions: number
    totalMinutes: number
  }
  reading: ReadingProgress
  completedRounds: string[]
  memorization: MemorizationSummary
  revisions: { title: string; times: number }[]
  hadiths: { label: string; text: string }[]
  quizzes: { title: string; score: number; total: number; passed: boolean }[]
  stories: string[]
  /** The current round: Quran paras done of 30, or a Qaida round. */
  round: { type: "quran" | "qaida"; parasDone: number } | null
  fee: { is_paid: boolean; paid_at: string | null } | null
}

export async function loadReport(
  studentId: string,
  month: ReportMonth,
): Promise<ReportData | null> {
  const range = monthRange(month)
  const monthKey = formatReportMonth(month)

  const [
    studentRes,
    sessionsRes,
    previousRes,
    roundsRes,
    paraProgressRes,
    memRes,
    memChunksRes,
    hadithRes,
    quizRes,
    storyRes,
    feeRes,
    marksRes,
  ] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
    supabase
      .from("class_sessions")
      .select("*")
      .eq("student_id", studentId)
      .gte("started_at", range.start)
      .lt("started_at", range.end)
      .order("started_at", { ascending: true }),
    supabase
      .from("class_sessions")
      .select("*")
      .eq("student_id", studentId)
      .lt("started_at", range.start)
      .order("started_at", { ascending: false })
      .limit(1),
    supabase.from("quran_rounds").select("*").eq("student_id", studentId),
    supabase
      .from("student_para_progress")
      .select("para_number, total_pages")
      .eq("student_id", studentId),
    supabase
      .from("student_memorization")
      .select("catalog_id, memorization_catalog(title)")
      .eq("student_id", studentId),
    supabase
      .from("student_memorization_chunks")
      .select("memorized_at, memorization_chunks(catalog_id)")
      .eq("student_id", studentId),
    supabase
      .from("student_hadith_progress")
      .select("memorized_at, hadiths(hadith_number, topic, english_text)")
      .eq("student_id", studentId)
      .gte("memorized_at", range.start)
      .lt("memorized_at", range.end)
      .order("memorized_at"),
    supabase
      .from("quiz_attempts")
      .select("score, total_questions, passed, completed_at, quizzes(title)")
      .eq("student_id", studentId)
      .gte("completed_at", range.start)
      .lt("completed_at", range.end)
      .order("completed_at"),
    supabase
      .from("student_story_progress")
      .select("completed_at, islamic_history(title)")
      .eq("student_id", studentId)
      .gte("completed_at", range.start)
      .lt("completed_at", range.end)
      .order("completed_at"),
    supabase
      .from("fee_payments")
      .select("is_paid, paid_at")
      .eq("student_id", studentId)
      .eq("month", month.month)
      .eq("year", month.year)
      .maybeSingle(),
    supabase
      .from("class_attendance")
      .select("class_date, status")
      .eq("student_id", studentId)
      .gte("class_date", range.start.slice(0, 10))
      .lt("class_date", range.end.slice(0, 10)),
  ])

  const student = studentRes.data as Student | null
  if (!student) return null

  const sessions = (sessionsRes.data || []) as Session[]
  const previous = ((previousRes.data || []) as Session[])[0] ?? null

  const totalPages: Record<number, number> = {}
  for (const r of paraProgressRes.data || []) {
    if (r.total_pages) totalPages[r.para_number] = r.total_pages
  }

  // Lessons: each assigned catalog item with all of its chunk counts and the
  // student's memorized_at per chunk.
  const catalogIds = (memRes.data || []).map((r) => r.catalog_id as string)
  const chunkCountRes = catalogIds.length
    ? await supabase.from("memorization_chunks").select("catalog_id").in("catalog_id", catalogIds)
    : { data: [] as { catalog_id: string }[] }
  const chunkCount = new Map<string, number>()
  for (const c of chunkCountRes.data || []) {
    chunkCount.set(c.catalog_id, (chunkCount.get(c.catalog_id) ?? 0) + 1)
  }
  const memorizedAt = new Map<string, string[]>()
  for (const r of (memChunksRes.data || []) as unknown as {
    memorized_at: string
    memorization_chunks: { catalog_id: string } | null
  }[]) {
    const id = r.memorization_chunks?.catalog_id
    if (id) memorizedAt.set(id, [...(memorizedAt.get(id) ?? []), r.memorized_at])
  }
  const lessons: LessonChunks[] = (
    (memRes.data || []) as unknown as {
      catalog_id: string
      memorization_catalog: { title: string } | null
    }[]
  ).map((r) => ({
    title: r.memorization_catalog?.title ?? "Lesson",
    totalChunks: chunkCount.get(r.catalog_id) ?? 0,
    memorizedAt: memorizedAt.get(r.catalog_id) ?? [],
  }))

  const completedRounds = (roundsRes.data || [])
    .filter((r) => r.completed_at?.startsWith(monthKey))
    .map((r) =>
      r.type === "qaida" ? "Completed Norani Qaida" : "Completed a full reading of the Quran",
    )

  const activeRound = getActiveRound((roundsRes.data || []) as QuranRound[])
  // Missing table (migration not applied yet) → no marks; sessions still count as present.
  const days = buildAttendanceDays({
    scheduled: scheduledDates(
      month,
      student.class_days,
      student.started_at,
      student.ended_at,
      pktDateKey(new Date()),
    ),
    sessionDates: sessions.map((s) => pktDateKey(s.started_at)),
    marks: (marksRes.data || []) as AttendanceMark[],
  })

  type Joined<T> = T | null
  return {
    student,
    attendance: {
      days,
      summary: summarizeAttendance(days),
      ...attendanceTotals(days),
      sessions: sessions.length,
      totalMinutes: Math.round(
        sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60,
      ),
    },
    reading: computeReadingProgress(sessions, previous, totalPages),
    completedRounds,
    memorization: computeMemorization(lessons, range),
    revisions: countRevisions(sessions),
    hadiths: (
      (hadithRes.data || []) as unknown as {
        hadiths: Joined<{ hadith_number: number; topic: string; english_text: string }>
      }[]
    )
      .filter((r) => r.hadiths)
      .map((r) => ({
        label: `Hadith ${r.hadiths!.hadith_number}${r.hadiths!.topic ? ` · ${r.hadiths!.topic}` : ""}`,
        text: r.hadiths!.english_text,
      })),
    quizzes: (
      (quizRes.data || []) as unknown as {
        score: number
        total_questions: number
        passed: boolean
        quizzes: Joined<{ title: string }>
      }[]
    ).map((r) => ({
      title: r.quizzes?.title ?? "Quiz",
      score: r.score,
      total: r.total_questions,
      passed: r.passed,
    })),
    stories: ((storyRes.data || []) as unknown as { islamic_history: Joined<{ title: string }> }[])
      .map((r) => r.islamic_history?.title)
      .filter((t): t is string => Boolean(t)),
    round: activeRound
      ? {
          type: activeRound.type,
          parasDone: computeProgress(
            activeRound.desc_completed || 0,
            activeRound.asc_completed || 0,
          ).total,
        }
      : null,
    fee: feeRes.data ?? null,
  }
}

// ── The printable sheet ──────────────────────────────────────────────────────
// Verse & Voice brand look (Canva / Instagram / student portal): cream paper,
// forest-green rounded headings, peach pills, sage leaves, gold geometric
// corners. Fixed hex colours, not theme tokens, so it prints the same in dark
// mode; globals.css makes the printed page full-bleed cream.

const BRAND = {
  cream: "#F8F6EE",
  sand: "#E6DAC6",
  forest: "#1F4A33",
  ink: "#2E3A2F",
  sage: "#6B7F5B",
  peach: "#F6B48F",
  terracotta: "#C96F4F",
  gold: "#C9A24A",
}

export function ReportSheet({ data, month }: { data: ReportData; month: ReportMonth }) {
  const { student, attendance, reading, memorization } = data
  const monthName = safeFormatDate(new Date(month.year, month.month - 1, 1), "MMMM yyyy")
  const pages =
    reading.pages == null ? "—" : `${reading.pagesApproximate ? "≈ " : ""}${reading.pages}`
  const isQaida = reading.paras.length > 0 && reading.paras.every((p) => p === 0)

  return (
    <article
      className="relative mx-auto w-full max-w-[210mm] overflow-hidden rounded-[28px] border px-10 pb-10 pt-8 font-body shadow-sm print:min-h-[297mm] print:max-w-none print:rounded-none print:border-0 print:px-[14mm] print:pb-[12mm] print:pt-[10mm] print:shadow-none"
      style={{ background: BRAND.cream, borderColor: BRAND.sand, color: BRAND.ink }}
    >
      <GeometricCorner className="left-0 top-0" />
      <GeometricCorner className="right-0 top-0 -scale-x-100" />
      <GeometricCorner className="bottom-0 left-0 -scale-y-100" />
      <GeometricCorner className="bottom-0 right-0 -scale-100" />
      <LeafSprig className="bottom-6 left-4" />
      <LeafSprig className="bottom-6 right-4 -scale-x-100" />

      <header className="relative text-center">
        <CrescentStars />
        <p
          className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em]"
          style={{ color: BRAND.terracotta }}
        >
          Verse &amp; Voice
        </p>
        <h1
          className="font-heading text-[30px] font-bold leading-tight"
          style={{ color: BRAND.forest }}
        >
          Monthly Progress Report
        </h1>
        <p className="mt-1 font-heading text-[22px] font-bold" style={{ color: BRAND.ink }}>
          {student.name}
        </p>
        <span
          className="mt-2 inline-block rounded-full px-4 py-1 font-heading text-[15px] font-bold"
          style={{ background: BRAND.peach, color: BRAND.ink }}
        >
          {monthName}
        </span>
        <p className="mt-2 text-[12px]" style={{ color: BRAND.sage }}>
          Guardian: {student.guardian_name}
          {student.class_time ? ` · Class time ${student.class_time}` : ""}
        </p>
      </header>

      <section className="relative mt-6 grid grid-cols-4 gap-3">
        <Tile
          value={
            attendance.counted > 0
              ? `${attendance.attended}/${attendance.counted}`
              : String(attendance.sessions)
          }
          label={attendance.counted > 0 ? "Classes attended" : "Classes held"}
        />
        <Tile
          value={isQaida ? "Qaida" : String(reading.parasCompleted.length)}
          label={isQaida ? "Book" : "Paras completed"}
        />
        <Tile value={pages} label="Pages completed" />
        <Tile value={String(memorization.partsTotal)} label="Parts memorized" />
      </section>

      <Section title="Class Days">
        {attendance.days.length === 0 ? (
          <Empty>No class days scheduled this month.</Empty>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {attendance.days.map((d) => (
                <DayChip key={d.date} day={d} />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
              {(Object.keys(DAY_STYLE) as (keyof typeof DAY_STYLE)[])
                .filter((k) => attendance.summary[k] > 0)
                .map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full border"
                      style={{ background: DAY_STYLE[k].bg, borderColor: DAY_STYLE[k].fg }}
                    />
                    {DAY_STYLE[k].label}: <b>{attendance.summary[k]}</b>
                  </span>
                ))}
              <span className="ml-auto" style={{ color: BRAND.sage }}>
                Time in class:{" "}
                <b style={{ color: BRAND.forest }}>{formatMinutes(attendance.totalMinutes)}</b>
              </span>
            </div>
          </>
        )}
      </Section>

      <Section title={isQaida ? "Norani Qaida" : "Quran Reading"}>
        {reading.end ? (
          <>
            <Line label="Started the month at" value={positionLabel(reading.start)} />
            <Line label="Ended the month at" value={positionLabel(reading.end)} />
            <Line
              label="Pages completed"
              value={reading.pages == null ? "—" : `${pages} page${reading.pages === 1 ? "" : "s"}`}
            />
            {!isQaida && (
              <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-[13px]">
                <span>Paras completed</span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  {reading.parasCompleted.length === 0 ? (
                    <span className="font-semibold">None yet — in progress</span>
                  ) : (
                    reading.parasCompleted.map((p) => <Pill key={p}>{paraLabel(p)} ✓</Pill>)
                  )}
                </span>
              </div>
            )}
          </>
        ) : (
          <Empty>No reading recorded in class this month.</Empty>
        )}
        {data.round?.type === "quran" && (
          <div className="mt-2">
            <div className="flex items-baseline justify-between text-[12px]">
              <span style={{ color: BRAND.sage }}>Progress in the current round</span>
              <span className="font-heading font-bold" style={{ color: BRAND.forest }}>
                {data.round.parasDone} / 30 paras
              </span>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full"
              style={{ background: BRAND.sand }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((data.round.parasDone / 30) * 100))}%`,
                  background: BRAND.forest,
                }}
              />
            </div>
          </div>
        )}
        {data.completedRounds.map((r) => (
          <p
            key={r}
            className="mt-2 rounded-xl px-3 py-2 text-center font-heading text-[14px] font-bold"
            style={{ background: BRAND.peach, color: BRAND.ink }}
          >
            🎉 {r}
          </p>
        ))}
        {reading.pagesApproximate && (
          <p className="mt-1.5 text-[10.5px]" style={{ color: BRAND.sage }}>
            ≈ Some pages are estimated (classes before page tracking began).
          </p>
        )}
      </Section>

      <Section title="Memorization & Revision">
        {memorization.partsByLesson.length === 0 &&
        memorization.lessonsCompleted.length === 0 &&
        data.revisions.length === 0 ? (
          <Empty>No memorization recorded this month.</Empty>
        ) : (
          <>
            {memorization.lessonsCompleted.map((t) => (
              <Line key={t} label={t} value="Completed ✓" />
            ))}
            {memorization.partsByLesson
              .filter((l) => !memorization.lessonsCompleted.includes(l.title))
              .map((l) => (
                <Line
                  key={l.title}
                  label={l.title}
                  value={`${l.parts} part${l.parts === 1 ? "" : "s"} memorized`}
                />
              ))}
            {data.revisions.length > 0 && (
              <p className="mt-1.5 text-[13px]">
                <span className="font-semibold" style={{ color: BRAND.forest }}>
                  Revised in class:{" "}
                </span>
                {data.revisions
                  .map((r) => (r.times > 1 ? `${r.title} (×${r.times})` : r.title))
                  .join(", ")}
              </p>
            )}
          </>
        )}
      </Section>

      {data.hadiths.length > 0 && (
        <Section title="Hadith Memorized">
          {data.hadiths.map((h) => (
            <p key={h.label} className="py-0.5 text-[13px]">
              <span className="font-semibold" style={{ color: BRAND.forest }}>
                {h.label}
              </span>
              {h.text && <span> — {h.text}</span>}
            </p>
          ))}
        </Section>
      )}

      {data.quizzes.length > 0 && (
        <Section title="Quizzes">
          {data.quizzes.map((q, i) => (
            <Line
              key={`${q.title}-${i}`}
              label={q.title}
              value={`${q.score}/${q.total}${q.passed ? " · Passed" : ""}`}
            />
          ))}
        </Section>
      )}

      {data.stories.length > 0 && (
        <Section title="Stories Read">
          <p className="text-[13px]">{data.stories.join(", ")}</p>
        </Section>
      )}

      <footer className="relative mt-6 flex items-center justify-between gap-3 px-12 text-[13px]">
        <span className="flex items-center gap-2">
          Fee for {monthName}:
          {data.fee ? (
            <Pill tone={data.fee.is_paid ? "green" : "amber"}>
              {data.fee.is_paid ? "Paid" : "Unpaid"}
            </Pill>
          ) : (
            <span>—</span>
          )}
        </span>
        <span className="font-heading text-[13px] font-bold" style={{ color: BRAND.forest }}>
          JazakAllahu khayran for your support
        </span>
      </footer>
    </article>
  )
}

// Class-day colours for the report (fixed, print-safe); teacher-side colours
// live in ATTENDANCE_TONE (class-today-attendance.tsx).
const DAY_STYLE = {
  present: { bg: "#DCEBDD", fg: BRAND.forest, mark: "✓", label: "Read" },
  student_absent: { bg: "#F6D3C8", fg: "#A2462B", mark: "✗", label: "Absent" },
  teacher_absent: { bg: "#F8E7B8", fg: "#8A6A12", mark: "T", label: "Teacher away" },
  holiday: { bg: "#DCE7F2", fg: "#33597E", mark: "H", label: "Holiday" },
  unmarked: { bg: "#FFFFFF", fg: "#A39A88", mark: "·", label: "Not marked" },
} as const

function DayChip({ day }: { day: AttendanceEntry }) {
  const st = DAY_STYLE[day.status]
  const [y, m, d] = day.date.split("-").map(Number)
  const weekday = safeFormatDate(new Date(y, m - 1, d), "EEE")
  return (
    <div
      className="flex w-[52px] flex-col items-center rounded-xl border py-1 leading-none"
      style={{
        background: st.bg,
        borderColor: st.fg,
        borderStyle: day.scheduled ? "solid" : "dashed",
      }}
      title={`${weekday} ${d}: ${st.label}${day.scheduled ? "" : " (extra class)"}`}
    >
      <span className="text-[9.5px] font-bold uppercase" style={{ color: st.fg }}>
        {weekday}
      </span>
      <span className="font-heading text-[16px] font-bold" style={{ color: BRAND.ink }}>
        {d}
      </span>
      <span className="text-[11px] font-bold" style={{ color: st.fg }}>
        {st.mark}
      </span>
    </div>
  )
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-2xl border bg-white/80 px-2 py-3 text-center"
      style={{ borderColor: BRAND.sand }}
    >
      <p
        className="font-heading text-[26px] font-bold leading-none tabular-nums"
        style={{ color: BRAND.forest }}
      >
        {value}
      </p>
      <p
        className="mt-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: BRAND.sage }}
      >
        {label}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="relative mt-4 break-inside-avoid rounded-2xl border bg-white/70 px-5 py-3.5"
      style={{ borderColor: BRAND.sand }}
    >
      <h2
        className="mb-1.5 flex items-center gap-2 font-heading text-[17px] font-bold"
        style={{ color: BRAND.forest }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: BRAND.terracotta }} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5 text-[13px]">
      <span>{label}</span>
      <span className="text-right font-semibold" style={{ color: BRAND.forest }}>
        {value}
      </span>
    </div>
  )
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "green" | "amber" }) {
  const style =
    tone === "green"
      ? { background: "#DCEBDD", color: BRAND.forest }
      : tone === "amber"
        ? { background: "#F8E1C8", color: "#9A4E1E" }
        : { background: BRAND.peach, color: BRAND.ink }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={style}>
      {children}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] italic" style={{ color: BRAND.sage }}>
      {children}
    </p>
  )
}

// ── Decorations (inline SVG, print-safe) ─────────────────────────────────────

function CrescentStars() {
  return (
    <svg viewBox="0 0 120 56" className="mx-auto h-12 w-28" aria-hidden>
      <path
        d="M66 6a22 22 0 1 0 14 39A18 18 0 1 1 66 6z"
        fill={BRAND.gold}
        transform="translate(-14 2)"
      />
      {[
        [30, 14, 3],
        [88, 10, 2.4],
        [96, 34, 3],
        [22, 40, 2],
      ].map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r * 2}L${x + r * 0.6} ${y - r * 0.6}L${x + r * 2} ${y}L${x + r * 0.6} ${y + r * 0.6}L${x} ${y + r * 2}L${x - r * 0.6} ${y + r * 0.6}L${x - r * 2} ${y}L${x - r * 0.6} ${y - r * 0.6}Z`}
          fill={BRAND.gold}
        />
      ))}
    </svg>
  )
}

/** Eight-point star lattice in one corner, like the Instagram posts' gold border. */
function GeometricCorner({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`pointer-events-none absolute h-28 w-28 opacity-40 ${className}`}
      aria-hidden
    >
      <g fill="none" stroke={BRAND.gold} strokeWidth="1.4">
        {[
          [24, 24, 16],
          [64, 14, 10],
          [14, 64, 10],
        ].map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} />
            <rect
              x={cx - r}
              y={cy - r}
              width={r * 2}
              height={r * 2}
              transform={`rotate(45 ${cx} ${cy})`}
            />
          </g>
        ))}
        <path d="M0 2 H110 M2 0 V110" />
      </g>
    </svg>
  )
}

function LeafSprig({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 60 90"
      className={`pointer-events-none absolute h-20 w-14 opacity-60 ${className}`}
      aria-hidden
    >
      <path d="M30 88 C30 60 28 35 34 6" stroke={BRAND.sage} strokeWidth="2" fill="none" />
      {[
        [30, 70, -1],
        [30, 52, 1],
        [31, 36, -1],
        [33, 20, 1],
      ].map(([x, y, side]) => (
        <ellipse
          key={y}
          cx={x + side * 10}
          cy={y}
          rx="10"
          ry="5"
          fill={BRAND.sage}
          transform={`rotate(${side * -30} ${x + side * 10} ${y})`}
        />
      ))}
    </svg>
  )
}
