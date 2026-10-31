"use client"

import { CalendarCheck, ClipboardList, History } from "lucide-react"
import { useEffect, useState } from "react"

import type { ClassSession, ClassStudent } from "@/components/class-student-card"
import { PanelHeader } from "@/components/panel-header"
import { paraSummary } from "@/components/student-session-bits"
import { Card } from "@/components/ui/card"
import {
  type AttendanceStatus,
  buildAttendanceDays,
  scheduledDates,
  summarizeAttendance,
} from "@/lib/attendance"
import type { MemItem } from "@/lib/memorization"
import { pktDateKey } from "@/lib/monthly-report"
import { supabase } from "@/lib/supabase"
import { cn, formatSessionDuration, safeFormatDate, safeFormatDistanceToNow } from "@/lib/utils"

/** Sessions shorter than this are accidental open/close, not a class. */
const MIN_CLASS_SECONDS = 60

/** Right column of the class screen: last class, homework, this month. */
export function ClassPrepPanel({
  student,
  sessions,
  memItems,
}: {
  student: ClassStudent
  sessions: ClassSession[]
  memItems: MemItem[]
}) {
  const [today] = useState(() => pktDateKey(new Date()))
  const [data, setData] = useState<{
    marks: { class_date: string; status: AttendanceStatus }[]
    hadithsDue: number
    quizzes: number
    fee: { is_paid: boolean; paid_at: string | null } | null
  }>()

  const [year, month] = today.split("-").map(Number)
  const prefix = today.slice(0, 8)

  useEffect(() => {
    let cancelled = false
    setData(undefined)
    void Promise.all([
      supabase
        .from("class_attendance")
        .select("class_date, status")
        .eq("student_id", student.id)
        .gte("class_date", `${prefix}01`)
        .lte("class_date", today),
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
      supabase
        .from("fee_payments")
        .select("is_paid, paid_at")
        .eq("student_id", student.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle(),
    ]).then(([att, hadiths, quizzes, fee]) => {
      if (cancelled) return
      setData({
        marks: (att.data as { class_date: string; status: AttendanceStatus }[]) ?? [],
        hadithsDue: hadiths.count ?? 0,
        quizzes: quizzes.count ?? 0,
        fee: fee.data ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [student.id, prefix, today, year, month])

  const lastClass = sessions.find((s) => (s.duration_seconds || 0) >= MIN_CLASS_SECONDS)
  const lastPara = lastClass ? paraSummary(lastClass) : null
  const memorizing = memItems.filter((m) => m.status === "memorizing")
  const revising = memItems.filter((m) => m.status === "memorized" && m.revision_assigned_at)

  // Same rules as the attendance calendar
  const summary = summarizeAttendance(
    buildAttendanceDays({
      scheduled: scheduledDates(
        { year, month },
        student.class_days,
        student.started_at,
        null,
        today,
      ),
      sessionDates: sessions
        .map((s) => pktDateKey(s.started_at))
        .filter((d) => d.startsWith(prefix)),
      marks: data?.marks ?? [],
    }),
  )
  const attendedOf = summary.present + summary.student_absent + summary.unmarked
  const monthName = safeFormatDate(new Date(), "MMMM")

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <PanelHeader
          icon={History}
          tint="sky"
          title="Last class"
          summary={
            lastClass
              ? safeFormatDistanceToNow(lastClass.started_at, { addSuffix: true })
              : "None yet"
          }
        />
        {lastClass ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Fact label="Date" value={safeFormatDate(lastClass.started_at, "EEE d MMM")} />
              <Fact label="Length" value={formatSessionDuration(lastClass.duration_seconds)} />
              {lastPara && <Fact label="Covered" value={lastPara.label} wide />}
            </div>
            {lastClass.notes && (
              <p className="rounded-lg border-l-2 border-primary bg-background-gray-primary px-3 py-2 text-sm text-text-secondary">
                {lastClass.notes}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-tertiary">This will be the first class.</p>
        )}
      </Card>

      <Card className="p-5">
        <PanelHeader
          icon={ClipboardList}
          tint="orange"
          title="Homework"
          summary="Check before you start"
        />
        <ul className="mt-3">
          {memorizing.length === 0 ? (
            <Row label="Memorization" value="Nothing assigned" muted />
          ) : (
            memorizing.map((m) => (
              <Row
                key={m.id}
                label={m.memorization_catalog?.title ?? "Memorization"}
                value="Learning"
              />
            ))
          )}
          {revising.length > 0 && (
            <Row
              label="Revising"
              value={`${revising.length} item${revising.length === 1 ? "" : "s"}`}
            />
          )}
          <Row
            label="Hadith"
            value={data ? (data.hadithsDue ? `${data.hadithsDue} in progress` : "None due") : "…"}
            muted={!data?.hadithsDue}
          />
          <Row
            label="Quizzes"
            value={data ? (data.quizzes ? `${data.quizzes} pending` : "None pending") : "…"}
            muted={!data?.quizzes}
          />
        </ul>
      </Card>

      <Card className="p-5">
        <PanelHeader icon={CalendarCheck} tint="green" title={`This month · ${monthName}`} />
        <ul className="mt-3">
          <Row
            label="Attendance"
            value={
              !data
                ? "…"
                : attendedOf > 0
                  ? `${summary.present} of ${attendedOf}${summary.student_absent ? ` · ${summary.student_absent} missed` : ""}`
                  : "No classes yet"
            }
          />
          <li className="flex items-center justify-between gap-3 py-3 last:pb-0">
            <span className="text-sm font-medium text-text-primary">Fee</span>
            {!data ? (
              <span className="text-sm text-text-tertiary">…</span>
            ) : !data.fee ? (
              <span className="text-sm text-text-tertiary">Not set</span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  data.fee.is_paid
                    ? "bg-green-500/10 text-green-600"
                    : "bg-amber-500/10 text-amber-600",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    data.fee.is_paid ? "bg-green-500" : "bg-amber-500",
                  )}
                />
                {data.fee.is_paid
                  ? `Paid${data.fee.paid_at ? ` ${safeFormatDate(data.fee.paid_at, "d MMM")}` : ""}`
                  : "Unpaid"}
              </span>
            )}
          </li>
        </ul>
      </Card>
    </div>
  )
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-lg bg-background-gray-primary px-3 py-2", wide && "col-span-2")}>
      <p className="text-[11px] font-medium uppercase text-text-tertiary">{label}</p>
      <p className="truncate text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
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
