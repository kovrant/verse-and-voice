"use client"

import { useEffect, useMemo, useState } from "react"

import { useAchievementCelebrations } from "@/components/achievement-celebration-provider"
import { KidCard, KidPageHeader, KidStat } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import { toTrophyItem, TrophyCase } from "@/components/trophy-case"
import type { AchievementDomain } from "@/lib/achievements"
import { type GroupedTrophies, groupTrophies, trophyHeadline } from "@/lib/achievements/display"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

interface AchievementDef {
  slug: string
  domain: AchievementDomain
  kind: string
  title: string
  description: string | null
  issues_certificate: boolean
}

interface AchievementRow {
  earned_at: string
  achievement_definitions: AchievementDef
}

interface CertificateRow {
  certificate_number: string
  issued_at: string
  achievement_definitions: Pick<AchievementDef, "title" | "description" | "domain">
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/** Shelf tiles a child hasn't unlocked yet, with a nudge on how to win one. */
const LOCKED_HINTS: {
  emoji: string
  title: string
  hint: string
  isLocked: (g: GroupedTrophies, certificateCount: number) => boolean
}[] = [
  {
    emoji: "📖",
    title: "Para trophy",
    hint: "Finish a whole para with your teacher.",
    isLocked: (g) => g.quranParas.length === 0 && g.quranMilestones.length === 0,
  },
  {
    emoji: "🧠",
    title: "Memory badge",
    hint: "Learn a memorization lesson by heart.",
    isLocked: (g) => g.memorization.length === 0,
  },
  {
    emoji: "🏅",
    title: "Quest badge",
    hint: "Play a quiz from your teacher and pass it.",
    isLocked: (g) => g.quizzes.length === 0,
  },
  {
    emoji: "🏆",
    title: "Hadith badge",
    hint: "Learn hadiths by heart on the Hadiths page.",
    isLocked: (g) => g.hadiths.length === 0,
  },
  {
    emoji: "✏️",
    title: "Qaida star",
    hint: "Finish your Qaida book with your teacher.",
    isLocked: (g) => g.qaida.length === 0,
  },
  {
    emoji: "🕌",
    title: "Namaz badge",
    hint: "Learn your prayers, step by step.",
    isLocked: (g) => g.namaz.length === 0,
  },
  {
    emoji: "📜",
    title: "First certificate",
    hint: "The biggest trophies come with a certificate!",
    isLocked: (_g, certificateCount) => certificateCount === 0,
  },
]

export default function StudentAchievementsPage() {
  const { student, loading } = useStudent()
  const { markAllSeen } = useAchievementCelebrations()
  const [earned, setEarned] = useState<AchievementRow[]>([])
  const [certificates, setCertificates] = useState<CertificateRow[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!student) return
    let cancelled = false

    async function load() {
      const [achRes, certRes] = await Promise.all([
        supabase
          .from("student_achievements")
          .select(
            "earned_at, achievement_definitions(slug, domain, kind, title, description, issues_certificate)",
          )
          .eq("student_id", student!.id)
          .order("earned_at", { ascending: false }),
        supabase
          .from("student_certificates")
          .select(
            "certificate_number, issued_at, achievement_definitions(title, description, domain)",
          )
          .eq("student_id", student!.id)
          .order("issued_at", { ascending: false }),
      ])

      if (cancelled) return

      const achRows: AchievementRow[] = []
      for (const row of achRes.data ?? []) {
        const def = unwrapJoin(row.achievement_definitions)
        if (!def) continue
        achRows.push({ earned_at: row.earned_at, achievement_definitions: def as AchievementDef })
      }

      const certRows: CertificateRow[] = []
      for (const row of certRes.data ?? []) {
        const def = unwrapJoin(row.achievement_definitions)
        if (!def) continue
        certRows.push({
          certificate_number: row.certificate_number,
          issued_at: row.issued_at,
          achievement_definitions: def as CertificateRow["achievement_definitions"],
        })
      }

      setEarned(achRows)
      setCertificates(certRows)
      setLoadingData(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [student, markAllSeen])

  useEffect(() => {
    if (!loadingData && earned.length + certificates.length > 0) {
      markAllSeen()
    }
  }, [loadingData, earned.length, certificates.length, markAllSeen])

  const trophyItems = useMemo(() => earned.map(toTrophyItem), [earned])
  const trophyCerts = useMemo(
    () =>
      certificates.map((c) => ({
        certificate_number: c.certificate_number,
        issued_at: c.issued_at,
        title: c.achievement_definitions.title,
        description: c.achievement_definitions.description,
      })),
    [certificates],
  )
  const grouped = useMemo(() => groupTrophies(trophyItems), [trophyItems])
  const headline = useMemo(
    () => trophyHeadline(grouped, trophyCerts.length),
    [grouped, trophyCerts.length],
  )
  // One shelf trophy per thing a child would actually name — mem parts don't count
  // on their own, same rule the headline uses.
  const shelfCount =
    grouped.quranParas.length +
    grouped.quranMilestones.length +
    grouped.memorization.length +
    grouped.quizzes.length +
    grouped.hadiths.length +
    grouped.qaida.length +
    grouped.namaz.length
  const locked = LOCKED_HINTS.filter((l) => l.isLocked(grouped, trophyCerts.length))

  if (loading || loadingData) return <PageLoading variant="student-simple" student />

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🏆"
        color="saffron"
        title="Trophies"
        subtitle="Your very own shelf — every trophy here you won yourself!"
      />

      {/* Shelf summary */}
      <KidCard color="saffron" className="mb-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-[70px] w-[70px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-[hsl(var(--kid-saffron)/0.5)] bg-card text-[34px] shadow-soft"
          >
            <span className="animate-float-gentle">{shelfCount > 0 ? "🏆" : "🌱"}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-foreground/70">
              My shelf so far
            </p>
            <p className="font-heading text-[19px] font-bold leading-tight text-primary sm:text-[21px]">
              {headline}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <KidStat emoji="🏆" value={shelfCount} label="Trophies" color="saffron" />
          <KidStat emoji="📜" value={trophyCerts.length} label="Certificates" color="sage" />
          <KidStat
            emoji="📖"
            value={`${grouped.quranParas.length}/30`}
            label="Paras"
            color="teal"
          />
        </div>
      </KidCard>

      <TrophyCase
        kid
        earned={trophyItems}
        certificates={trophyCerts}
        emptyHint="Finish paras, lessons, Qaida or Namaz with your teacher — your first trophy will land right here."
      />

      {locked.length > 0 && (
        <section className="mt-8">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span aria-hidden className="text-[20px] leading-none">
              🔒
            </span>
            <h2 className="font-heading text-[20px] font-bold text-primary">Still to win</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((l) => (
              <div
                key={l.title}
                className="flex items-start gap-3 rounded-[20px] border-[1.5px] border-dashed border-border bg-secondary/30 px-3.5 py-3"
              >
                <span aria-hidden className="text-[26px] leading-none opacity-40 grayscale">
                  {l.emoji}
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-[16px] font-bold leading-tight text-muted-foreground">
                    {l.title}
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-snug text-muted-foreground">
                    {l.hint}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {trophyCerts.length > 0 ? (
        <p className="mt-6 px-1 text-center text-[13px] font-semibold text-muted-foreground">
          🎨 Pretty certificate designs are on the way — your awards are saved and safe.
        </p>
      ) : null}
    </div>
  )
}
