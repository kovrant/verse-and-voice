"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs; next/image isn't worth it here */

import Link from "next/link"
import { useEffect, useState } from "react"

import { KidButton, KidCard, KidEmpty, KidPageHeader, QuranBookIcon } from "@/components/kid-ui"
import { useLiveClass } from "@/components/live-class-provider"
import { PageLoading } from "@/components/page-loading"
import { StudentLiveClass } from "@/components/student-live-class"
import { formatClassTimeLocal, formatCountdown, msUntilNextClass } from "@/lib/class-time"
import { STUDENT_MEM_SELECT, type StudentMemItem } from "@/lib/memorization"
import { computeStreak } from "@/lib/streak"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

export default function StudentClassesPage() {
  const { student, loading } = useStudent()
  const { live, joined, join } = useLiveClass()
  const [items, setItems] = useState<StudentMemItem[]>([])
  const [revisionItems, setRevisionItems] = useState<StudentMemItem[]>([])
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
        .select(STUDENT_MEM_SELECT)
        .eq("student_id", student.id)
        .eq("status", "memorizing"),
      supabase
        .from("student_memorization")
        .select(STUDENT_MEM_SELECT)
        .eq("student_id", student.id)
        .eq("status", "memorized")
        .not("revision_assigned_at", "is", null),
      supabase.from("class_sessions").select("started_at").eq("student_id", student.id),
    ]).then(([mem, revision, sessions]) => {
      if (!active) return
      setItems(((mem.data as any) || []) as StudentMemItem[])
      setRevisionItems(((revision.data as any) || []) as StudentMemItem[])
      setSessionStarts(((sessions.data as { started_at: string }[]) || []).map((r) => r.started_at))
      setLoadingItems(false)
    })
    return () => {
      active = false
    }
  }, [student])

  if (joined) {
    return <StudentLiveClass />
  }

  if (loading || loadingItems) return <PageLoading variant="student-simple" student />

  const classDays = student?.class_days ?? null
  const classTime = student?.class_time ?? null
  const ms = msUntilNextClass(classTime, now, classDays)
  const localTime = formatClassTimeLocal(classTime, now, classDays)
  const streak = computeStreak(classDays, sessionStarts, now)
  const streakTease =
    streak.configured && streak.current > 0 && streak.todayScheduled && !streak.todayDone

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🏫"
        color="sky"
        title="Class"
        subtitle="Your live class with your teacher"
      />

      {live ? (
        <KidCard color="sky" className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/35 motion-reduce:animate-none" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[26px]">
              🔴
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-[22px] font-bold leading-tight text-primary">
              Your class is live now!
            </span>
            <span className="block text-[14px] font-semibold text-foreground/85">
              Tap to join and read along with your teacher.
            </span>
          </span>
          <KidButton onClick={join} pad={<QuranBookIcon className="h-7 w-7" />}>
            Join class
          </KidButton>
        </KidCard>
      ) : (
        <KidCard color="sky" className="mb-6">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            Next class
          </p>
          {ms !== null ? (
            <>
              <p className="mt-1 font-heading text-[34px] font-bold leading-none tabular-nums text-primary">
                in {formatCountdown(ms)}
              </p>
              <p className="mt-2 text-[14.5px] font-semibold text-foreground/85">
                {localTime ? `Your class is at ${localTime}.` : "Your class is coming up."} Practise
                your lesson below so you&apos;re ready!
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-heading text-[26px] font-bold leading-tight text-primary">
                Stay ready 🌟
              </p>
              <p className="mt-2 text-[14.5px] font-semibold text-foreground/85">
                Your teacher will start your class here. Practise your lesson below.
              </p>
            </>
          )}
          {streakTease && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[13px] font-extrabold text-accent-foreground shadow-[0_3px_0_hsl(16_48%_40%)]">
              🔥 Keep your {streak.current}-day streak — join today&apos;s class
            </p>
          )}
        </KidCard>
      )}

      {revisionItems.length > 0 && (
        <section className="mb-6">
          <SectionTitle emoji="🔁" title="Practise before class" />
          <div className="space-y-3">
            {revisionItems.map((item) => (
              <LessonLink key={item.id} item={item} color="saffron" note="Say this one again" />
            ))}
          </div>
        </section>
      )}

      {items.length > 0 ? (
        <section>
          <SectionTitle emoji="🌱" title="Learning now" />
          <div className="space-y-3">
            {items.map((item) => (
              <LessonLink
                key={item.id}
                item={item}
                color="lavender"
                note={item.memorization_catalog?.category || "Memorization"}
              />
            ))}
          </div>
        </section>
      ) : revisionItems.length === 0 ? (
        <KidEmpty
          title="Nothing to practise yet"
          text="When your teacher gives you a surah or dua to learn, it will show up here before class."
        />
      ) : null}
    </div>
  )
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden className="text-[22px] leading-none">
        {emoji}
      </span>
      <h2 className="font-heading text-[22px] font-bold text-primary">{title}</h2>
    </div>
  )
}

/** A lesson to open before class — taps through to its card on the Memorize page. */
function LessonLink({
  item,
  color,
  note,
}: {
  item: StudentMemItem
  color: "saffron" | "lavender"
  note: string
}) {
  const title = item.memorization_catalog?.title || "Lesson"
  return (
    <Link
      href={`/student/memorization#mem-${item.id}`}
      className="flex items-center gap-3.5 rounded-[22px] border-[1.5px] p-3 transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
      style={{
        borderColor: `hsl(var(--kid-${color}) / 0.45)`,
        background: `linear-gradient(160deg, hsl(var(--kid-${color}) / 0.22), hsl(var(--kid-${color}) / 0.08)), hsl(var(--card))`,
        boxShadow: `0 4px 0 hsl(var(--kid-${color}) / 0.5)`,
      }}
    >
      {item.memorization_catalog?.image_url ? (
        <img
          src={item.memorization_catalog.image_url}
          alt=""
          className="h-12 w-12 flex-shrink-0 rounded-[14px] border-[1.5px] border-border bg-white object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] text-[24px]"
          style={{ background: `hsl(var(--kid-${color}) / 0.35)` }}
        >
          {color === "saffron" ? "🔁" : "🌱"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-[18px] font-bold text-primary">
          {title}
        </span>
        <span className="block truncate text-[13px] font-semibold text-foreground/85">{note}</span>
      </span>
      <span aria-hidden className="flex-shrink-0 text-[18px] text-muted-foreground">
        →
      </span>
    </Link>
  )
}
