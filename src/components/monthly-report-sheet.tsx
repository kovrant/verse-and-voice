"use client"

import { Download } from "lucide-react"
import { useEffect, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type Attendance,
  computeAttendance,
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
  notes: string | null
}

export interface ReportData {
  student: Student
  attendance: Attendance
  reading: ReadingProgress
  completedRounds: string[]
  memorization: MemorizationSummary
  revisions: { title: string; times: number }[]
  hadiths: { label: string; text: string }[]
  quizzes: { title: string; score: number; total: number; passed: boolean }[]
  stories: string[]
  trophies: string[]
  notes: { date: string; text: string }[]
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
    trophyRes,
    feeRes,
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
      .from("student_achievements")
      .select("earned_at, achievement_definitions(title)")
      .eq("student_id", studentId)
      .gte("earned_at", range.start)
      .lt("earned_at", range.end)
      .order("earned_at"),
    supabase
      .from("fee_payments")
      .select("is_paid, paid_at")
      .eq("student_id", studentId)
      .eq("month", month.month)
      .eq("year", month.year)
      .maybeSingle(),
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

  type Joined<T> = T | null
  return {
    student,
    attendance: computeAttendance({
      month,
      classDays: student.class_days ?? null,
      startedAt: student.started_at,
      endedAt: student.ended_at ?? null,
      sessionStarts: sessions.map((s) => s.started_at),
      sessionSeconds: sessions.map((s) => s.duration_seconds),
      today: pktDateKey(new Date()),
    }),
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
    trophies: (
      (trophyRes.data || []) as unknown as { achievement_definitions: Joined<{ title: string }> }[]
    )
      .map((r) => r.achievement_definitions?.title)
      .filter((t): t is string => Boolean(t)),
    notes: sessions
      .filter((s) => s.notes?.trim())
      .map((s) => ({ date: safeFormatDate(s.started_at, "EEE d MMM"), text: s.notes!.trim() })),
    fee: feeRes.data ?? null,
  }
}

// ── The printable sheet ──────────────────────────────────────────────────────
// Fixed paper colours (not theme tokens) so it prints the same in dark mode.

export function ReportSheet({ data, month }: { data: ReportData; month: ReportMonth }) {
  const { student, attendance, reading, memorization } = data
  const monthName = safeFormatDate(new Date(month.year, month.month - 1, 1), "MMMM yyyy")
  const pages =
    reading.pages == null ? "—" : `${reading.pagesApproximate ? "≈ " : ""}${reading.pages}`

  return (
    <article className="mx-auto w-full max-w-[210mm] rounded-xl border border-neutral-200 bg-white p-8 text-neutral-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b-2 border-emerald-700 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
            Verse &amp; Voice · Monthly Progress Report
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold leading-tight">{student.name}</h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            Guardian: {student.guardian_name}
            {student.class_time ? ` · Class time ${student.class_time}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-xl font-bold text-emerald-800">{monthName}</p>
          <p className="text-xs text-neutral-500">
            Issued {safeFormatDate(new Date(), "d MMM yyyy")}
          </p>
        </div>
      </header>

      {/* Headline numbers */}
      <section className="mt-5 grid grid-cols-4 gap-3">
        <Tile
          value={
            attendance.scheduled > 0
              ? `${attendance.attended}/${attendance.scheduled}`
              : String(attendance.sessions)
          }
          label={attendance.scheduled > 0 ? "Classes attended" : "Classes held"}
        />
        <Tile value={formatMinutes(attendance.totalMinutes)} label="Time in class" />
        <Tile value={pages} label="Pages read" />
        <Tile value={String(memorization.partsTotal)} label="Parts memorized" />
      </section>

      <Section title="Attendance">
        <Line label="Classes held this month" value={String(attendance.sessions)} />
        {attendance.scheduled > 0 && (
          <>
            <Line
              label="Scheduled class days attended"
              value={`${attendance.attended} of ${attendance.scheduled}`}
            />
            <Line label="Scheduled class days missed" value={String(attendance.missed)} />
          </>
        )}
        {attendance.extra > 0 && (
          <Line label="Extra (make-up) classes" value={String(attendance.extra)} />
        )}
      </Section>

      <Section
        title={
          reading.paras.every((p) => p === 0) && reading.paras.length
            ? "Norani Qaida"
            : "Quran Reading"
        }
      >
        {reading.end ? (
          <>
            <Line label="Started the month at" value={positionLabel(reading.start)} />
            <Line label="Ended the month at" value={positionLabel(reading.end)} />
            <Line
              label="Read this month"
              value={reading.paras.length ? reading.paras.map(paraLabel).join(", ") : "—"}
            />
            <Line
              label="Pages read"
              value={reading.pages == null ? "—" : `${pages} page${reading.pages === 1 ? "" : "s"}`}
            />
          </>
        ) : (
          <Empty>No reading recorded in class this month.</Empty>
        )}
        {data.completedRounds.map((r) => (
          <p
            key={r}
            className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
          >
            🎉 {r}
          </p>
        ))}
        {reading.pagesApproximate && (
          <p className="mt-2 text-[11px] text-neutral-500">≈ Page count is an estimate.</p>
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
              <p className="mt-2 text-sm">
                <span className="font-semibold">Revised in class: </span>
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
            <div key={h.label} className="py-1 text-sm">
              <span className="font-semibold">{h.label}</span>
              {h.text && <span className="text-neutral-600"> — {h.text}</span>}
            </div>
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
          <p className="text-sm">{data.stories.join(", ")}</p>
        </Section>
      )}

      {data.trophies.length > 0 && (
        <Section title="Trophies Earned">
          <p className="text-sm">🏆 {data.trophies.join(", ")}</p>
        </Section>
      )}

      {data.notes.length > 0 && (
        <Section title="Teacher's Notes from Class">
          {data.notes.map((n, i) => (
            <p key={i} className="py-1 text-sm">
              <span className="font-semibold text-neutral-600">{n.date}: </span>
              {n.text}
            </p>
          ))}
        </Section>
      )}

      <footer className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-3 text-sm">
        <span>
          Fee for {monthName}:{" "}
          {data.fee ? (
            data.fee.is_paid ? (
              <span className="font-semibold text-emerald-700">Paid</span>
            ) : (
              <span className="font-semibold text-amber-700">Unpaid</span>
            )
          ) : (
            <span className="text-neutral-500">—</span>
          )}
        </span>
        <span className="text-xs text-neutral-500">JazakAllahu khayran for your support.</span>
      </footer>
    </article>
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
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-center">
      <p className="font-heading text-2xl font-bold tabular-nums text-emerald-800">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-1.5 border-b border-neutral-200 pb-1 font-heading text-base font-bold text-emerald-800">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5 text-sm">
      <span className="text-neutral-700">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-neutral-500">{children}</p>
}
