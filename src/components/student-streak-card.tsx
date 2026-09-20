"use client"

import * as Popover from "@radix-ui/react-popover"
import { Check, Flame } from "lucide-react"
import { useEffect, useState } from "react"

import { DAY_LABELS } from "@/components/class-days-picker"
import { formatClassTimeLocal } from "@/lib/class-time"
import { kidToast } from "@/lib/kid-toast"
import {
  computeStreak,
  milestoneStorageKey,
  pendingMilestones,
  type StreakInfo,
  type WeekDayStatus,
} from "@/lib/streak"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

function weekDot(status: WeekDayStatus): string {
  switch (status) {
    case "done":
      return "bg-primary text-primary-foreground"
    case "today":
      return "border-2 border-primary bg-card"
    case "missed":
    case "upcoming":
      return "border border-border bg-secondary/60"
    case "off":
    default:
      return "border border-dashed border-border bg-transparent opacity-50"
  }
}

export function useStreak(
  studentId: string,
  classDays: number[] | null,
): {
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
  kidToast(`${top} days in a row — MashaAllah!`, {
    emoji: "🔥",
    color: "coral",
    description: "Keep coming to class. You've got this!",
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
    return localTime ? `Rest day. Next class around ${localTime}` : "Rest day — streak stays alive"
  }
  return "Start a new streak — join your next class"
}

/**
 * Class-streak flame for the student top bar. Tap for the week view. Hidden
 * until the teacher sets class days. Also fires the streak-milestone toasts.
 */
export function StudentStreakPill() {
  const { student } = useStudent()
  if (!student) return null
  return (
    <StreakPillInner
      studentId={student.id}
      classDays={student.class_days}
      classTime={student.class_time}
    />
  )
}

function StreakPillInner({
  studentId,
  classDays,
  classTime,
}: {
  studentId: string
  classDays: number[] | null
  classTime: string | null
}) {
  const { info } = useStreak(studentId, classDays)

  useEffect(() => {
    if (info?.configured && info.current > 0) celebrateMilestones(studentId, info.current)
  }, [studentId, info])

  if (!info?.configured) return null
  const n = info.current

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={`${n}-day class streak`}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 font-heading text-[16px] font-bold",
            "shadow-[0_3px_0_hsl(var(--border))] transition-transform active:translate-y-[2px] active:shadow-none",
            n > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Flame
            className={cn("h-5 w-5", n > 0 ? "text-accent" : "text-muted-foreground")}
            fill={n > 0 ? "currentColor" : "none"}
          />
          {n} {n === 1 ? "day" : "days"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          className="z-50 w-[300px] rounded-3xl border-[1.5px] border-border bg-card p-4 shadow-soft-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="font-heading text-[20px] font-bold leading-tight text-primary">
            {n > 0 ? `🔥 ${n} ${n === 1 ? "day" : "days"} in a row!` : "Start your streak"}
          </div>
          <p className="mt-0.5 text-[13px] font-semibold text-muted-foreground">
            {subline(info, classTime, classDays)}
          </p>
          <div className="mt-4 flex justify-between">
            {info.week.map((status, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground">{DAY_LABELS[i]}</span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-[10px]",
                    weekDot(status),
                  )}
                >
                  {status === "done" && <Check className="h-4 w-4 stroke-[3]" aria-hidden />}
                </span>
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
