"use client"

import { Trophy } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { AchievementDomain } from "@/lib/achievements"
import { useAchievementCelebrations } from "@/components/achievement-celebration-provider"
import { PageLoading } from "@/components/page-loading"
import { toTrophyItem, TrophyCase } from "@/components/trophy-case"
import { groupTrophies, trophyHeadline } from "@/lib/achievements/display"
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
  const headline = useMemo(
    () => trophyHeadline(groupTrophies(trophyItems), trophyCerts.length),
    [trophyItems, trophyCerts.length],
  )

  if (loading || loadingData) return <PageLoading variant="student-simple" student />

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-accent flex-shrink-0">
          <Trophy className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Trophies & Certificates
          </h1>
          <p className="text-sm text-muted-foreground">{headline}</p>
        </div>
      </div>

      <TrophyCase
        earned={trophyItems}
        certificates={trophyCerts}
        emptyHint="Complete paras, lessons, Qaida, or Namaz with your teacher to earn trophies here."
      />

      {certificates.length > 0 ? (
        <p className="text-xs text-muted-foreground px-1">
          Shareable certificate designs are on the way — your awards are saved and ready.
        </p>
      ) : null}
    </div>
  )
}
