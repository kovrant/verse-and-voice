"use client"

import { Check, Flame as FlameIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "@/lib/toast"

import { DAY_LABELS } from "@/components/class-days-picker"
import { Skeleton } from "@/components/page-loading"
import { formatClassTimeLocal } from "@/lib/class-time"
import {
  computeStreak,
  milestoneStorageKey,
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

/** Week dots: light mode hero is forest (white tiles); dark mode hero is cream (green ticks). */
function heroDot(status: WeekDayStatus): string {
  switch (status) {
    case "done":
      return cn(
        "border shadow-sm",
        "border-white/35 bg-white text-emerald-700",
        "dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-400",
      )
    case "today":
      return cn(
        "border-2",
        "border-white/75 bg-white/25",
        "dark:border-emerald-500/70 dark:bg-emerald-500/10",
      )
    case "missed":
    case "upcoming":
      return cn(
        "border",
        "border-white/35 bg-white/20 text-white/75",
        "dark:border-border dark:bg-secondary dark:text-foreground/80",
      )
    case "off":
    default:
      return cn(
        "border",
        "border-white/25 bg-white/10 text-white/45",
        "dark:border-border/70 dark:bg-muted dark:text-muted-foreground/70",
      )
  }
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
      <Skeleton className="h-8 w-28 rounded-full" />
    ) : (
      <Skeleton className="h-40 w-full rounded-2xl" />
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

  return (
    <div className="relative mb-[26px] overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
        <div className="flex items-center gap-[18px]">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <FlameIcon className="h-8 w-8" style={{ color: "#f6c46a" }} fill="#f6c46a" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] opacity-75">
              Daily Streak
            </div>
            <div className="font-heading text-[26px] font-bold leading-tight sm:text-[30px]">
              {info.current > 0
                ? `${info.current} day${info.current === 1 ? "" : "s"} in a row`
                : "Start your streak"}
            </div>
            <div className="mt-0.5 text-[13.5px] opacity-80">
              {subline(info, classTime, classDays)}
            </div>
          </div>
        </div>

        {/* Week strip — Sun→Sat; off days stay dim so 3-day students aren't scared */}
        <div className="flex gap-[9px]">
          {info.week.map((status, i) => (
            <div key={i} className="flex flex-col items-center gap-[7px]">
              <span className="text-[12px] font-bold opacity-70">{DAY_LABELS[i]}</span>
              <span
                className={cn(
                  "flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-[13px] font-bold",
                  heroDot(status),
                )}
              >
                {status === "done" ? (
                  <Check className="h-4 w-4 stroke-[3]" aria-hidden />
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
