"use client"

import { format } from "date-fns"
import { Award, BookMarked, BookText, Moon, ScrollText, SpellCheck, Trophy } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { AchievementDomain } from "@/lib/achievements"
import { PageLoading } from "@/components/page-loading"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

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

const DOMAIN_META: Record<
  AchievementDomain,
  { label: string; icon: typeof Trophy; empty: string }
> = {
  quran: {
    label: "Quran",
    icon: BookText,
    empty: "Complete paras and khatm rounds to earn Quran badges.",
  },
  qaida: {
    label: "Qaida",
    icon: SpellCheck,
    empty: "Finish Norani Qaida to earn your graduate badge.",
  },
  memorization: {
    label: "Memorization",
    icon: BookMarked,
    empty: "Memorize lessons with your teacher to collect badges here.",
  },
  namaz: {
    label: "Namaz",
    icon: Moon,
    empty: "Complete all Namaz steps to unlock the Namaz Master badge.",
  },
  streak: {
    label: "Streaks",
    icon: Trophy,
    empty: "Keep showing up to class — streak badges are coming soon.",
  },
}

function paraSortKey(slug: string): number {
  const m = slug.match(/^para_(\d+)$/)
  return m ? Number(m[1]) : 999
}

export default function StudentAchievementsPage() {
  const { student, loading } = useStudent()
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
  }, [student])

  const byDomain = useMemo(() => {
    const map = new Map<AchievementDomain, AchievementRow[]>()
    for (const row of earned) {
      const domain = row.achievement_definitions.domain
      if (!map.has(domain)) map.set(domain, [])
      map.get(domain)!.push(row)
    }
    for (const [domain, rows] of map) {
      if (domain === "quran") {
        rows.sort(
          (a, b) =>
            paraSortKey(a.achievement_definitions.slug) -
            paraSortKey(b.achievement_definitions.slug),
        )
      }
    }
    return map
  }, [earned])

  if (loading || loadingData) return <PageLoading variant="student-simple" student />

  const badgeCount = earned.length
  const certCount = certificates.length

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
          <p className="text-sm text-muted-foreground">
            {badgeCount} badge{badgeCount === 1 ? "" : "s"}
            {certCount > 0 ? ` · ${certCount} certificate${certCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </div>

      {certificates.length > 0 ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Certificates
          </p>
          <div className="space-y-3">
            {certificates.map((c) => (
              <Card
                key={c.certificate_number}
                className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500/60" />
                <CardContent className="pt-6 pb-5 flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <ScrollText className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-lg text-foreground leading-tight">
                      {c.achievement_definitions.title}
                    </p>
                    {c.achievement_definitions.description ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.achievement_definitions.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      {c.certificate_number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {format(new Date(c.issued_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Shareable certificate designs are on the way — your awards are saved and ready.
          </p>
        </section>
      ) : null}

      {(["quran", "qaida", "memorization", "namaz"] as const).map((domain) => {
        const rows = byDomain.get(domain) ?? []
        const meta = DOMAIN_META[domain]
        const Icon = meta.icon

        return (
          <section key={domain} className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </p>
            {rows.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {meta.empty}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((row) => {
                  const def = row.achievement_definitions
                  const isCert = def.issues_certificate
                  return (
                    <Card
                      key={`${def.slug}-${row.earned_at}`}
                      className={cn(
                        "overflow-hidden",
                        isCert && "border-emerald-500/20",
                      )}
                    >
                      <CardContent className="py-4 flex gap-3 items-start">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            isCert
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-secondary text-accent",
                          )}
                        >
                          {isCert ? (
                            <Award className="h-5 w-5" strokeWidth={2.25} />
                          ) : (
                            <Trophy className="h-5 w-5" strokeWidth={2.25} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground leading-snug">
                            {def.title}
                          </p>
                          {def.description ? (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {def.description}
                            </p>
                          ) : null}
                          <p className="text-[10px] text-muted-foreground mt-1.5">
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
    </div>
  )
}
