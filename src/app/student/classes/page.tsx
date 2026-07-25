"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image isn't worth it here */

import { BookMarked, CalendarClock } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { useLiveClass } from "@/components/live-class-provider"
import { StudentLiveClass } from "@/components/student-live-class"
import { Card, CardContent } from "@/components/ui/card"
import { formatClassTimeLocal, formatCountdown, msUntilNextClass } from "@/lib/class-time"
import { computeStreak } from "@/lib/streak"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

interface CatalogItem {
  id: string
  title: string
  category: string
  image_url: string | null
}

interface StudentMemItem {
  id: string
  catalog_id: string
  status: "memorizing" | "memorized"
  last_revised_at: string | null
  memorization_catalog: CatalogItem
}

export default function StudentClassesPage() {
  const { student, loading } = useStudent()
  const { live, joined, join } = useLiveClass()
  const [items, setItems] = useState<StudentMemItem[]>([])
  const [sessionStarts, setSessionStarts] = useState<string[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!student) return
    let active = true
    Promise.all([
      supabase
        .from("student_memorization")
        .select("*, memorization_catalog(id, title, category, image_url)")
        .eq("student_id", student.id)
        .eq("status", "memorizing"),
      supabase.from("class_sessions").select("started_at").eq("student_id", student.id),
    ]).then(([mem, sessions]) => {
      if (!active) return
      setItems(((mem.data as any) || []) as StudentMemItem[])
      setSessionStarts(
        ((sessions.data as { started_at: string }[]) || []).map((r) => r.started_at),
      )
      setLoadingItems(false)
    })
    return () => {
      active = false
    }
  }, [student])

  if (joined) {
    return <StudentLiveClass />
  }

  if (loading || loadingItems) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
        <div className="h-8 w-40 shimmer rounded-lg" />
        <div className="h-40 shimmer rounded-2xl" />
        <div className="h-24 shimmer rounded-2xl" />
      </div>
    )
  }

  const classDays = student?.class_days ?? null
  const classTime = student?.class_time ?? null
  const ms = msUntilNextClass(classTime, now, classDays)
  const localTime = formatClassTimeLocal(classTime, now, classDays)
  const streak = computeStreak(classDays, sessionStarts, now)
  const streakTease =
    streak.configured && streak.current > 0 && streak.todayScheduled && !streak.todayDone

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/20 text-violet-600 flex-shrink-0">
          <CalendarClock className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">Get ready for your next class.</p>
        </div>
      </div>

      {live ? (
        <button
          type="button"
          onClick={join}
          className="group flex w-full items-center gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5 text-left transition-colors hover:from-emerald-500/20 hover:to-teal-500/15"
        >
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-bold text-foreground">Your class is live now</span>
            <span className="block text-sm text-muted-foreground">
              Tap to join and follow along with your teacher.
            </span>
          </span>
          <span className="flex-shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground group-active:scale-95 transition-transform">
            Join →
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-500">
            <CalendarClock className="h-3.5 w-3.5" />
            Next class
          </div>
          {ms !== null ? (
            <>
              <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                in {formatCountdown(ms)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {localTime
                  ? `Your class is at ${localTime} (your local time).`
                  : "Your class is coming up."}{" "}
                Revise your lesson below so you&apos;re ready.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-xl font-bold text-foreground">Stay ready</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your teacher will start your class here. Revise your lesson below so you&apos;re
                prepared.
              </p>
            </>
          )}
          {streakTease && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-600">
              🔥 Keep your {streak.current}-day streak — join today&apos;s class
            </p>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookMarked className="h-3 w-3" />
            Currently learning
          </p>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/student/memorization#mem-${item.id}`}
              className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 transition-colors hover:bg-amber-500/10"
            >
              {item.memorization_catalog?.image_url ? (
                <img
                  src={item.memorization_catalog.image_url}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 flex-shrink-0">
                  <BookMarked className="h-4 w-4 text-amber-500" />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">
                  {item.memorization_catalog?.title}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {item.memorization_catalog?.category || "Memorization"} · tap to open
                </span>
              </span>
              <span className="text-muted-foreground/50">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <BookMarked className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Nothing to revise yet</p>
            <p className="text-sm text-muted-foreground">
              Your teacher will assign memorization here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
