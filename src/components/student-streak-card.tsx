"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { DAY_LABELS } from "@/components/class-days-picker"
import { formatClassTimeLocal } from "@/lib/class-time"
import {
  computeStreak,
  milestoneStorageKey,
  nextMilestone,
  pendingMilestones,
  type StreakInfo,
  type WeekDayStatus,
} from "@/lib/streak"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface StudentStreakCardProps {
  studentId: string
  classDays: number[] | null
  classTime: string | null
  /** Compact pill for embedding inside the Quran journey panel. */
  variant?: "hero" | "pill"
}

function weekDotClass(status: WeekDayStatus): string {
  switch (status) {
    case "done":
      return "bg-orange-500 text-white shadow-[0_0_10px_-2px_rgba(249,115,22,0.7)]"
    case "today":
      return "bg-orange-500/20 text-orange-600 ring-2 ring-orange-500 animate-pulse"
    case "missed":
      return "bg-secondary text-muted-foreground/40 line-through"
    case "upcoming":
      return "border border-border/60 bg-transparent text-muted-foreground/50"
    case "off":
    default:
      return "bg-transparent text-muted-foreground/25"
  }
}

function Flame({ intensity }: { intensity: number }) {
  // 0 = cold, 1–2 calm, 3–6 warm, 7+ hot
  const scale = intensity >= 30 ? 1.25 : intensity >= 7 ? 1.15 : intensity >= 3 ? 1.05 : 1
  const glow =
    intensity >= 30
      ? "drop-shadow-[0_0_16px_rgba(249,115,22,0.85)]"
      : intensity >= 7
        ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.65)]"
        : intensity >= 3
          ? "drop-shadow-[0_0_8px_rgba(249,115,22,0.45)]"
          : ""

  return (
    <span
      className={cn("inline-block select-none transition-transform", glow)}
      style={{ fontSize: intensity >= 7 ? 42 : 36, transform: `scale(${scale})` }}
      aria-hidden
    >
      {intensity >= 1 ? "🔥" : "🕯️"}
    </span>
  )
}

function useStreak(studentId: string, classDays: number[] | null): {
  info: StreakInfo | null
  loading: boolean
} {
  const [info, setInfo] = useState<StreakInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from("class_sessions")
      .select("started_at")
      .eq("student_id", studentId)
      .then(({ data }) => {
        if (!active) return
        const starts = ((data as { started_at: string }[]) || []).map((r) => r.started_at)
        setInfo(computeStreak(classDays, starts))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId, classDays])

  return { info, loading }
}

function celebrateMilestones(studentId: string, current: number) {
  if (typeof window === "undefined" || current <= 0) return
  const key = milestoneStorageKey(studentId)
  const celebrated = parseInt(localStorage.getItem(key) || "0", 10) || 0
  const pending = pendingMilestones(current, celebrated)
  if (pending.length === 0) return
  const top = pending[pending.length - 1]
  localStorage.setItem(key, String(top))
  toast.success(`${top}-day streak — MashaAllah! 🔥`, {
    description: "Keep showing up to class. You've got this.",
    duration: 5000,
  })
}

function subline(info: StreakInfo, classTime: string | null, classDays: number[] | null): string {
  const localTime = formatClassTimeLocal(classTime, new Date(), classDays)
  if (info.todayDone) return "Class taken today — you're on fire"
  if (info.todayScheduled) {
    return localTime
      ? `Don't break it — class usually at ${localTime}`
      : "Don't break it — join today's class"
  }
  if (info.current > 0) {
    return localTime
      ? `Rest day. Next class around ${localTime}`
      : "Rest day — streak stays alive"
  }
  return "Start a new streak — join your next class"
}

export function StudentStreakCard({
  studentId,
  classDays,
  classTime,
  variant = "hero",
}: StudentStreakCardProps) {
  const { info, loading } = useStreak(studentId, classDays)
  const daysKey = useMemo(() => (classDays || []).join(","), [classDays])

  useEffect(() => {
    if (info?.configured && info.current > 0) {
      celebrateMilestones(studentId, info.current)
    }
  }, [studentId, info, daysKey])

  if (loading) {
    return variant === "pill" ? (
      <div className="h-8 w-28 shimmer rounded-full" />
    ) : (
      <div className="h-40 shimmer rounded-2xl" />
    )
  }

  // Teacher hasn't set class days — hide entirely (they'll configure manually).
  if (!info?.configured) return null

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "flex items-center gap-[8px] rounded-full px-[15px] py-[8px] text-[13px] font-semibold",
          info.current > 0
            ? "bg-orange-500/15 text-orange-600"
            : "bg-secondary text-foreground",
        )}
        title={subline(info, classTime, classDays)}
      >
        <span aria-hidden>{info.current > 0 ? "🔥" : "🕯️"}</span>
        {info.current}-day streak
      </div>
    )
  }

  const milestone = nextMilestone(info.current)

  return (
    <div
      className={cn(
        "relative mb-[26px] overflow-hidden rounded-2xl border p-5 sm:p-6",
        info.current > 0
          ? "border-orange-500/25 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent"
          : "border-border bg-[hsl(var(--surface-alt))]",
        info.todayScheduled && !info.todayDone && "ring-1 ring-orange-500/30",
      )}
    >
      <div className="flex items-start gap-4">
        <Flame intensity={info.current} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-4xl font-extrabold tabular-nums tracking-tight text-foreground">
              {info.current}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">day streak</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subline(info, classTime, classDays)}</p>
          {info.best > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              Best: {info.best} day{info.best === 1 ? "" : "s"}
              {milestone ? ` · Next goal: ${milestone}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Week strip — Sun→Sat; off days stay dim so 3-day students aren't scared */}
      <div className="mt-5 flex justify-between gap-1.5">
        {info.week.map((status, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
                weekDotClass(status),
                status === "off" && "opacity-40",
              )}
            >
              {status === "done" ? "✓" : DAY_LABELS[i]}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/60">
              {DAY_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
