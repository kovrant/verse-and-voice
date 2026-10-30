"use client"

import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Clock,
  CreditCard,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"

import type { MemChunk } from "@/components/memorization-chunks"
import {
  computeProgress,
  getActiveRound,
  getChronologicalRoundNumber,
  type QuranRound,
} from "@/components/quran-progress"
import type { StudentView } from "@/components/student-detail-nav"
import { type ClassSession, paraSummary } from "@/components/student-session-bits"
import { Card } from "@/components/ui/card"
import {
  type AttendanceStatus,
  buildAttendanceDays,
  scheduledDates,
  summarizeAttendance,
} from "@/lib/attendance"
import { chunkProgress, type StudentMemItem } from "@/lib/memorization"
import { pktDateKey } from "@/lib/monthly-report"
import { supabase } from "@/lib/supabase"
import {
  cn,
  type FeePayment,
  formatSessionDuration,
  safeFormatDate,
  safeFormatDistanceToNow,
  type Student,
} from "@/lib/utils"

/** Sessions shorter than this are accidental open/close, not a class. */
const MIN_CLASS_SECONDS = 60

const TINTS = {
  indigo: "bg-[rgba(87,80,241,0.10)] text-[#5750F1]",
  blue: "bg-[rgba(59,130,246,0.10)] text-[#3B82F6]",
  purple: "bg-[rgba(168,85,247,0.10)] text-[#A855F7]",
  green: "bg-[rgba(34,197,94,0.10)] text-[#22C55E]",
  orange: "bg-[rgba(249,115,22,0.10)] text-[#F97316]",
} as const

/**
 * The student's Overview: a read-only snapshot (reading, attendance, last
 * class, fee; recent classes; homework at a glance). Doing things lives in
 * the Learning section; links here jump there.
 */
export function StudentSnapshot({
  student,
  rounds,
  sessions,
  memItems,
  chunksByItem,
  memorizedChunkIds,
  currentFee,
  onNavigate,
}: {
  student: Student
  rounds: QuranRound[]
  sessions: ClassSession[]
  memItems: StudentMemItem[]
  chunksByItem: Record<string, MemChunk[]>
  memorizedChunkIds: Set<string>
  currentFee: FeePayment | undefined
  onNavigate: (view: StudentView) => void
}) {
  const [today] = useState(() => pktDateKey(new Date()))
  const [marks, setMarks] = useState<{ class_date: string; status: AttendanceStatus }[]>([])
  const [counts, setCounts] = useState<{ hadiths: number; hadithsDue: number; quizzes: number }>()

  const [year, month] = today.split("-").map(Number)
  const prefix = today.slice(0, 8)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      supabase
        .from("class_attendance")
        .select("class_date, status")
        .eq("student_id", student.id)
        .gte("class_date", `${prefix}01`)
        .lte("class_date", today),
      supabase
        .from("student_hadith_progress")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("status", "memorized"),
      supabase
        .from("hadith_assignments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("status", "pending"),
      supabase
        .from("quiz_assignments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("status", "pending"),
    ]).then(([att, memorized, due, quizzes]) => {
      if (cancelled) return
      setMarks((att.data as { class_date: string; status: AttendanceStatus }[]) ?? [])
      setCounts({
        hadiths: memorized.count ?? 0,
        hadithsDue: due.count ?? 0,
        quizzes: quizzes.count ?? 0,
      })
    })
    return () => {
      cancelled = true
    }
  }, [student.id, prefix, today])

  // Reading
  const activeRound = getActiveRound(rounds)
  const paraInfo =
    activeRound?.type === "quran"
      ? computeProgress(activeRound.desc_completed || 0, activeRound.asc_completed || 0)
      : null
  const roundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 1
  const asc = activeRound?.asc_completed || 0
  const readingValue = !activeRound
    ? "Not started"
    : activeRound.type === "qaida"
      ? "Norani Qaida"
      : `Para ${asc || "—"}`
  const readingHint =
    activeRound?.type === "quran" && paraInfo
      ? `Round ${roundNum} · ${paraInfo.total} of 30 paras`
      : activeRound?.type === "qaida"
        ? "Before the Quran"
        : "No active round"
  const readingPct = paraInfo ? Math.min(100, Math.round((paraInfo.total / 30) * 100)) : null

  // Attendance this month (same rules as the attendance calendar)
  const summary = summarizeAttendance(
    buildAttendanceDays({
      scheduled: scheduledDates(
        { year, month },
        student.class_days,
        student.started_at,
        student.ended_at,
        today,
      ),
      sessionDates: sessions
        .map((s) => pktDateKey(s.started_at))
        .filter((d) => d.startsWith(prefix)),
      marks,
    }),
  )
  const attendedOf = summary.present + summary.student_absent + summary.unmarked

  // Classes (ignore accidental open/close sessions)
  const classes = sessions.filter((s) => (s.duration_seconds || 0) >= MIN_CLASS_SECONDS)
  const lastClass = classes[0]

  const monthName = safeFormatDate(new Date(), "MMMM")
  const memorizing = memItems.filter((m) => m.status === "memorizing")
  const revising = memItems.filter((m) => m.status === "memorized" && m.revision_assigned_at)

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={BookOpen}
          tint="indigo"
          label="Reading"
          value={readingValue}
          hint={readingHint}
        >
          {readingPct !== null && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background-gray-tertiary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${readingPct}%` }} />
            </div>
          )}
        </StatTile>
        <StatTile
          icon={CalendarCheck}
          tint="green"
          label={`Attendance in ${monthName}`}
          value={attendedOf > 0 ? `${summary.present} of ${attendedOf}` : "—"}
          hint={
            attendedOf > 0
              ? summary.student_absent > 0
                ? `${summary.student_absent} missed`
                : "No classes missed"
              : "No classes yet this month"
          }
        />
        <StatTile
          icon={Clock}
          tint="blue"
          label="Last class"
          value={
            lastClass ? safeFormatDistanceToNow(lastClass.started_at, { addSuffix: true }) : "—"
          }
          hint={
            lastClass
              ? [formatSessionDuration(lastClass.duration_seconds), paraSummary(lastClass)?.label]
                  .filter(Boolean)
                  .join(" · ")
              : "No classes yet"
          }
        />
        <StatTile
          icon={CreditCard}
          tint={currentFee?.is_paid ? "green" : "orange"}
          label={`${monthName} fee`}
          value={!currentFee ? "—" : currentFee.is_paid ? "Paid" : "Unpaid"}
          hint={
            currentFee?.is_paid && currentFee.paid_at
              ? `Paid ${safeFormatDate(currentFee.paid_at, "d MMM")}`
              : "Open Fees to mark it"
          }
          valueClassName={
            currentFee ? (currentFee.is_paid ? "text-green-600" : "text-amber-600") : undefined
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent classes */}
        <Card className="p-5">
          <PanelHeader
            title="Recent classes"
            action="View all"
            onAction={() => onNavigate("sessions")}
          />
          {classes.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-tertiary">No classes yet.</p>
          ) : (
            <ul className="mt-3">
              {classes.slice(0, 4).map((s) => {
                const para = paraSummary(s)
                return (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-3 border-b border-border-primary py-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {safeFormatDate(s.started_at, "EEE d MMM")}
                      </p>
                      {s.notes ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">{s.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm text-text-secondary">
                        {formatSessionDuration(s.duration_seconds)}
                      </p>
                      {para && (
                        <p className="text-xs text-text-tertiary" title={para.title}>
                          {para.label}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Homework at a glance */}
        <Card className="p-5">
          <PanelHeader
            title="Homework at a glance"
            action="Manage"
            onAction={() => onNavigate("learning")}
          />
          <ul className="mt-3">
            {memorizing.length === 0 ? (
              <GlanceRow label="Memorization" value="Nothing assigned" muted />
            ) : (
              memorizing.map((m) => {
                const p = chunkProgress(chunksByItem[m.catalog_id] ?? [], memorizedChunkIds)
                return (
                  <GlanceRow
                    key={m.id}
                    label={m.memorization_catalog?.title ?? "Memorization"}
                    value={p.total > 0 ? `${p.done} of ${p.total} parts` : "Learning"}
                  />
                )
              })
            )}
            {revising.length > 0 && (
              <GlanceRow
                label="Revising"
                value={`${revising.length} item${revising.length === 1 ? "" : "s"}`}
              />
            )}
            <GlanceRow
              label="Hadith"
              value={
                counts
                  ? `${counts.hadiths} memorized${counts.hadithsDue ? ` · ${counts.hadithsDue} in progress` : ""}`
                  : "…"
              }
            />
            <GlanceRow
              label="Quizzes"
              value={counts ? (counts.quizzes ? `${counts.quizzes} pending` : "None pending") : "…"}
              muted={counts ? counts.quizzes === 0 : true}
            />
          </ul>
        </Card>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  tint,
  label,
  value,
  hint,
  valueClassName,
  children,
}: {
  icon: LucideIcon
  tint: keyof typeof TINTS
  label: string
  value: string
  hint: string
  valueClassName?: string
  children?: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <span className={cn("flex size-8 items-center justify-center rounded-lg", TINTS[tint])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p
        className={cn(
          "mt-5 truncate text-xl font-semibold leading-7 text-text-primary",
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="text-sm font-medium text-text-tertiary">{label}</p>
      <p className="mt-0.5 truncate text-xs text-text-tertiary">{hint}</p>
      {children}
    </Card>
  )
}

function PanelHeader({
  title,
  action,
  onAction,
}: {
  title: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">{title}</p>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-primary"
      >
        {action}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function GlanceRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border-primary py-3 last:border-0 last:pb-0">
      <span className="truncate text-sm font-medium text-text-primary">{label}</span>
      <span
        className={cn(
          "flex-shrink-0 text-sm",
          muted ? "text-text-tertiary" : "text-text-secondary",
        )}
      >
        {value}
      </span>
    </li>
  )
}
