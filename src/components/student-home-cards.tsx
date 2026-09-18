"use client"

import { ChevronRight, Radio } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type CSSProperties, useEffect, useState } from "react"

import { useAchievementCelebrations } from "@/components/achievement-celebration-provider"
import { useLiveClass } from "@/components/live-class-provider"
import { MoonMascot, useMascotMood } from "@/components/student-mascot"
import { type KidColor, readDestination, useHasNamaz } from "@/components/student-nav"
import { formatClassTimeLocal } from "@/lib/class-time"
import { getHadithNextMilestone } from "@/lib/hadiths/hadith-engine"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

/** Big "your teacher is live" call to action — one tap joins and opens the class. */
export function StudentLiveBanner() {
  const { live, joined, join } = useLiveClass()
  const router = useRouter()
  if (!live || joined) return null
  return (
    <button
      type="button"
      onClick={() => {
        join()
        router.push("/student/classes")
      }}
      className="mb-[22px] flex w-full items-center gap-4 rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-soft-md transition-transform active:scale-[0.98]"
    >
      <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Radio className="h-7 w-7" strokeWidth={2.25} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[21px] font-bold leading-tight">
          Your class has started!
        </span>
        <span className="block text-[14px] opacity-80">Tap to join your teacher</span>
      </span>
      <ChevronRight className="h-7 w-7 flex-shrink-0" />
    </button>
  )
}

/** Small progress ring for a card corner. `value` is 0..1; `label` sits in the middle. */
function ProgressRing({ value, label }: { value: number; label: string | number }) {
  // Fills in the parent card's own colour (`--kid`, set on the card).
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <span
      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full sm:right-4 sm:top-4"
      style={{
        background: `conic-gradient(hsl(var(--kid)) ${pct}%, hsl(var(--kid) / 0.2) 0)`,
      }}
      aria-hidden
    >
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-card text-[12px] font-extrabold text-foreground">
        {label}
      </span>
    </span>
  )
}

/** Memorized hadith count, for the Hadiths card. */
function useHadithCount(studentId: string) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    void supabase
      .from("student_hadith_progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "memorized")
      .then(({ count }) => setCount(count ?? 0))
  }, [studentId])
  return count
}

/** What the student is memorizing (or revising) right now, with chunk progress. */
function useCurrentMemorization(studentId: string) {
  const [state, setState] = useState<
    | { loading: true }
    | {
        loading: false
        current: { title: string; isRevision: boolean; done: number; total: number } | null
      }
  >({ loading: true })

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from("student_memorization")
        .select("status, revision_assigned_at, catalog_id, memorization_catalog(title)")
        .eq("student_id", studentId)
        .order("last_revised_at", { ascending: false, nullsFirst: false })
      const items =
        (data as unknown as {
          status: string
          revision_assigned_at: string | null
          catalog_id: string
          memorization_catalog: { title: string } | null
        }[]) || []
      const cur =
        items.find((i) => i.status === "memorizing" && i.memorization_catalog) ||
        items.find(
          (i) => i.status === "memorized" && i.revision_assigned_at && i.memorization_catalog,
        )
      if (!cur) {
        if (active) setState({ loading: false, current: null })
        return
      }
      const [{ count: total }, { count: done }] = await Promise.all([
        supabase
          .from("memorization_chunks")
          .select("id", { count: "exact", head: true })
          .eq("catalog_id", cur.catalog_id),
        supabase
          .from("student_memorization_chunks")
          .select("chunk_id, memorization_chunks!inner(catalog_id)", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("memorization_chunks.catalog_id", cur.catalog_id),
      ])
      if (!active) return
      setState({
        loading: false,
        current: {
          title: cur.memorization_catalog!.title,
          isRevision: cur.status === "memorized",
          done: done ?? 0,
          total: total ?? 0,
        },
      })
    }
    void load()
    return () => {
      active = false
    }
  }, [studentId])

  return state
}

type HomeCard = {
  href: string
  label: string
  status: string
  /** Emoji illustration. ponytail: emoji stand in for real card art — swap for SVG illustrations later. */
  art: string
  color: KidColor
  ring?: { value: number; label: string | number }
  isNew?: boolean
  /** Text on the corner badge shown when `isNew` (default "New!"). */
  badge?: string
}

/**
 * The student home's main navigation: one big storybook card per thing a child
 * actually does. Parent-facing pages (fees, attendance, …) live under the "Me" tab.
 */
export function StudentHomeCards({
  studentId,
  isQaida,
  readStatus,
  readRing,
  classTime,
  classDays,
}: {
  studentId: string
  classTime: string | null
  classDays: number[] | null
  isQaida: boolean
  /** Short status under the Read card, e.g. "Para 7". */
  readStatus: string
  /** Quran progress ring (omitted for Qaida). */
  readRing?: { value: number; label: string | number }
}) {
  const hasNamaz = useHasNamaz(studentId, "home")
  const { live } = useLiveClass()
  const nextClass = formatClassTimeLocal(classTime, new Date(), classDays)
  const hadithCount = useHadithCount(studentId)
  const { hasUnseen: hasUnseenTrophies } = useAchievementCelebrations()
  const read = readDestination(isQaida)
  const hadithGoal = getHadithNextMilestone(hadithCount ?? 0)
  const mem = useCurrentMemorization(studentId)
  const memCurrent = mem.loading ? null : mem.current

  const cards: HomeCard[] = [
    {
      href: read.href,
      label: read.label,
      status: readStatus,
      art: isQaida ? "🔤" : "📖",
      color: "sage",
      ring: readRing,
    },
    {
      href: "/student/classes",
      label: "Class",
      status: live ? "Live now! Tap to join" : nextClass ? `Next: ${nextClass}` : "Your classes",
      art: "🏫",
      color: "sky",
      isNew: live,
      badge: "Live",
    },
    {
      href: "/student/memorization",
      label: "Memorize",
      status: mem.loading
        ? "Learn by heart"
        : memCurrent
          ? `${memCurrent.isRevision ? "Revise: " : ""}${memCurrent.title}`
          : "All caught up ✓",
      art: "🧠",
      color: "lavender",
      ring:
        memCurrent && memCurrent.total > 0
          ? { value: memCurrent.done / memCurrent.total, label: memCurrent.done }
          : undefined,
    },
    {
      href: "/student/hadiths",
      label: "Hadiths",
      status: hadithCount === null ? "Sayings of the Prophet ﷺ" : `${hadithCount} learnt`,
      art: "📜",
      color: "caramel",
      ring:
        hadithCount === null
          ? undefined
          : { value: hadithGoal.percentage / 100, label: hadithCount },
    },
    {
      href: "/student/quizzes",
      label: "Quizzes",
      status: "Test yourself",
      art: "✨",
      color: "coral",
    },
    {
      href: "/student/achievements",
      label: "Trophies",
      status: hasUnseenTrophies ? "You won something!" : "Your rewards",
      art: "🏆",
      color: "saffron",
      isNew: hasUnseenTrophies,
    },
    {
      href: "/student/history",
      label: "Stories",
      status: "Islamic history",
      art: "🏮",
      color: "teal",
    },
  ]
  if (hasNamaz)
    cards.push({
      href: "/student/namaz",
      label: "Namaz",
      status: "Learn to pray",
      art: "🕌",
      color: "rose",
    })

  return (
    <div className="mb-[26px] grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={cn(
            "group relative flex min-h-[150px] flex-col justify-between rounded-[26px] border-[1.5px] p-3.5 sm:p-5",
            // Chunky "pressable" bottom edge, like a storybook button.
            "shadow-[0_5px_0_hsl(var(--kid)/0.55)] transition-all",
            "hover:-translate-y-0.5 hover:shadow-[0_7px_0_hsl(var(--kid)/0.55)]",
            "active:translate-y-[3px] active:shadow-[0_2px_0_hsl(var(--kid)/0.55)]",
          )}
          style={
            {
              "--kid": `var(--kid-${card.color})`,
              background:
                "linear-gradient(160deg, hsl(var(--kid) / 0.24), hsl(var(--kid) / 0.1)), hsl(var(--card))",
              borderColor: "hsl(var(--kid) / 0.45)",
            } as CSSProperties
          }
        >
          <span
            className={cn(
              "flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-[hsl(var(--kid)/0.35)] text-[34px] ring-2 ring-[hsl(var(--card)/0.7)] transition-transform group-hover:-rotate-6 group-hover:scale-105",
            )}
            aria-hidden
          >
            {card.art}
          </span>
          <span className="mt-3 block">
            <span className="block font-heading text-[20px] font-bold leading-none text-primary">
              {card.label}
            </span>
            <span
              className={cn(
                "mt-1 block text-[13px] font-bold leading-snug",
                card.isNew ? "text-accent" : "text-muted-foreground",
              )}
            >
              {card.status}
            </span>
          </span>
          {card.ring && <ProgressRing value={card.ring.value} label={card.ring.label} />}
          {card.isNew && (
            <span className="absolute right-3 top-3 animate-float rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground sm:right-4 sm:top-4">
              {card.badge ?? "New!"}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

/** Mascot + speech-bubble greeting at the top of the student home. */
export function StudentGreeting({ name, subtitle }: { name: string; subtitle: string }) {
  const timeMood = useMascotMood()
  const { hasUnseen: hasUnseenTrophies } = useAchievementCelebrations()
  // Excited when there's a new trophy waiting; otherwise follows the time of day.
  const mood = hasUnseenTrophies ? "excited" : timeMood
  return (
    // Sits on a soft sky band so the top of home reads as a little scene.
    <div
      className="mb-[22px] flex items-center gap-3 rounded-[32px] p-3 sm:gap-5 sm:p-5"
      style={{
        background:
          "linear-gradient(115deg, hsl(var(--kid-sky) / 0.28), hsl(var(--kid-lavender) / 0.18) 55%, hsl(var(--kid-saffron) / 0.24))",
      }}
    >
      <MoonMascot
        mood={mood}
        className="h-[84px] w-[84px] flex-shrink-0 animate-float-gentle sm:h-[104px] sm:w-[104px]"
      />
      <div className="relative min-w-0 rounded-[24px] rounded-bl-[8px] border-[1.5px] border-border bg-card px-4 py-3 shadow-[0_4px_0_hsl(var(--border))] sm:px-6 sm:py-4">
        <div
          className="font-heading font-bold leading-[1.05] tracking-tight text-primary"
          style={{ fontSize: "clamp(22px, 6vw, 34px)" }}
        >
          Assalamu Alaikum, {name}!
        </div>
        <div className="mt-1 text-[13px] font-bold text-muted-foreground sm:text-[15px]">
          {subtitle}
        </div>
      </div>
    </div>
  )
}
