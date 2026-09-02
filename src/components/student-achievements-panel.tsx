"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import type { AchievementDomain } from "@/lib/achievements"
import { backfillStudentAchievements } from "@/lib/achievements/backfill"
import { groupTrophies, trophyHeadline } from "@/lib/achievements/display"
import { toTrophyItem, TrophyCase } from "@/components/trophy-case"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"

interface AchievementDef {
  slug: string
  domain: AchievementDomain
  title: string
  description: string | null
  issues_certificate: boolean
}

interface EarnedRow {
  earned_at: string
  achievement_definitions: AchievementDef
}

interface CertificateRow {
  certificate_number: string
  issued_at: string
  achievement_definitions: Pick<AchievementDef, "title" | "description">
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function StudentAchievementsPanel({
  studentId,
  onUpdated,
}: {
  studentId: string
  onUpdated?: () => void
}) {
  const [earned, setEarned] = useState<EarnedRow[]>([])
  const [certificates, setCertificates] = useState<CertificateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [achRes, certRes] = await Promise.all([
      supabase
        .from("student_achievements")
        .select(
          "earned_at, achievement_definitions(slug, domain, title, description, issues_certificate)",
        )
        .eq("student_id", studentId)
        .order("earned_at", { ascending: false }),
      supabase
        .from("student_certificates")
        .select("certificate_number, issued_at, achievement_definitions(title, description)")
        .eq("student_id", studentId)
        .order("issued_at", { ascending: false }),
    ])

    const achRows: EarnedRow[] = []
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
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

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

  async function handleSync() {
    setSyncing(true)
    try {
      const { newlyAwarded } = await backfillStudentAchievements(supabase, studentId)
      await load()
      onUpdated?.()
      if (newlyAwarded > 0) {
        toast.success(
          newlyAwarded === 1
            ? "1 new badge awarded from existing progress."
            : `${newlyAwarded} new badges awarded from existing progress.`,
        )
      } else {
        toast.success("Achievements are up to date — nothing new to award.")
      }
    } catch {
      toast.error("Couldn't sync achievements. Try again.")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading trophies…
      </div>
    )
  }

  const isEmpty = earned.length === 0 && certificates.length === 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Trophies & Certificates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEmpty
              ? "Awards are created when you save progress — use sync to backfill older work."
              : `${headline}. Use sync to backfill older progress.`}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={syncing} onClick={() => void handleSync()}>
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync achievements
        </Button>
      </div>

      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trophies yet. Save Quran, Qaida, memorization, or Namaz progress — or run{" "}
            <strong className="font-medium text-foreground">Sync achievements</strong> if work was
            done before this module.
          </CardContent>
        </Card>
      ) : (
        <TrophyCase earned={trophyItems} certificates={trophyCerts} />
      )}
    </div>
  )
}
