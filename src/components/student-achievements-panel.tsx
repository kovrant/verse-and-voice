"use client"

import { format } from "date-fns"
import { Award, Loader2, RefreshCw, ScrollText, Trophy } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import type { AchievementDomain } from "@/lib/achievements"
import { backfillStudentAchievements } from "@/lib/achievements/backfill"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

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

const DOMAIN_LABEL: Record<AchievementDomain, string> = {
  quran: "Quran",
  qaida: "Qaida",
  memorization: "Memorization",
  namaz: "Namaz",
  streak: "Streaks",
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function paraSortKey(slug: string): number {
  const m = slug.match(/^para_(\d+)$/)
  return m ? Number(m[1]) : 999
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

  const byDomain = useMemo(() => {
    const map = new Map<AchievementDomain, EarnedRow[]>()
    for (const row of earned) {
      const domain = row.achievement_definitions.domain
      if (!map.has(domain)) map.set(domain, [])
      map.get(domain)!.push(row)
    }
    for (const rows of map.values()) {
      rows.sort(
        (a, b) =>
          paraSortKey(a.achievement_definitions.slug) -
          paraSortKey(b.achievement_definitions.slug),
      )
    }
    return map
  }, [earned])

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Trophies & Certificates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {earned.length} badge{earned.length === 1 ? "" : "s"}
            {certificates.length > 0
              ? ` · ${certificates.length} certificate${certificates.length === 1 ? "" : "s"}`
              : ""}
            . Awards are created when you save progress — use sync to backfill older work.
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

      {certificates.length > 0 ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Certificates
          </p>
          <div className="space-y-2">
            {certificates.map((c) => (
              <Card key={c.certificate_number} className="border-emerald-500/25">
                <CardContent className="py-4 flex gap-3 items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <ScrollText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{c.achievement_definitions.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {c.certificate_number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Issued {format(new Date(c.issued_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {(["quran", "qaida", "memorization", "namaz"] as const).map((domain) => {
        const rows = byDomain.get(domain) ?? []
        return (
          <section key={domain} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {DOMAIN_LABEL[domain]} · {rows.length}
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">None yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((row) => {
                  const def = row.achievement_definitions
                  return (
                    <Card key={`${def.slug}-${row.earned_at}`}>
                      <CardContent className="py-3 flex gap-3 items-start">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            def.issues_certificate
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {def.issues_certificate ? (
                            <Award className="h-4 w-4" />
                          ) : (
                            <Trophy className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-snug">{def.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(row.earned_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {earned.length === 0 && certificates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trophies yet. Save Quran, Qaida, memorization, or Namaz progress — or run{" "}
            <strong className="font-medium text-foreground">Sync achievements</strong> if work was
            done before this module.
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
