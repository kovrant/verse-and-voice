"use client"

import { format } from "date-fns"
import {
  Award,
  BookMarked,
  BookText,
  Check,
  ChevronDown,
  Moon,
  ScrollText,
  SpellCheck,
  Trophy,
} from "lucide-react"
import { useMemo, useState } from "react"

import type { AchievementDomain } from "@/lib/achievements"
import { groupTrophies, type GroupedTrophies, type TrophyItem } from "@/lib/achievements/display"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface TrophyCertificate {
  certificate_number: string
  issued_at: string
  title: string
  description: string | null
}

interface TrophyCaseProps {
  earned: TrophyItem[]
  certificates: TrophyCertificate[]
  emptyHint?: string
}

function ParaGrid({ paras }: { paras: number[] }) {
  const earned = new Set(paras)
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 30 }, (_, i) => {
        const n = i + 1
        const done = earned.has(n)
        return (
          <div
            key={n}
            title={done ? `Para ${n} completed` : `Para ${n}`}
            className={cn(
              "flex h-7 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
              done
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-secondary/80 text-muted-foreground/50",
            )}
          >
            {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
          </div>
        )
      })}
    </div>
  )
}

function MilestoneChip({ item }: { item: TrophyItem }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        item.issues_certificate
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-secondary text-foreground",
      )}
    >
      {item.issues_certificate ? (
        <Award className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Trophy className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate max-w-[12rem]">{item.title}</span>
    </div>
  )
}

function MemLessonRow({ group }: { group: GroupedTrophies["memorization"][number] }) {
  const [open, setOpen] = useState(false)
  const partCount = group.parts.length
  const showParts = !group.complete && partCount > 0

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-accent">
          <BookMarked className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{group.lessonTitle}</p>
            {group.complete ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                <Check className="h-3 w-3" />
                Done
              </span>
            ) : partCount > 0 ? (
              <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                {partCount} part{partCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {group.complete
              ? `Completed ${format(new Date(group.complete.earned_at), "MMM d, yyyy")}`
              : partCount > 0
                ? `Latest part ${format(new Date(group.parts[group.parts.length - 1]!.earned_at), "MMM d, yyyy")}`
                : null}
          </p>
        </div>
        {showParts && partCount > 4 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-expanded={open}
            aria-label={open ? "Hide parts" : "Show parts"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        ) : null}
      </div>
      {showParts && (open || partCount <= 4) ? (
        <div className="mt-2 flex flex-wrap gap-1 pl-10">
          {group.parts.map((p) => {
            const label = p.title.split(" · ")[0] ?? p.title
            return (
              <span
                key={p.slug}
                className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function DomainSection({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: typeof Trophy
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      {children}
    </section>
  )
}

export function TrophyCase({ earned, certificates, emptyHint }: TrophyCaseProps) {
  const grouped = useMemo(() => groupTrophies(earned), [earned])
  const isEmpty = earned.length === 0 && certificates.length === 0

  if (isEmpty) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyHint ?? "No trophies yet — keep learning!"}
        </CardContent>
      </Card>
    )
  }

  const simpleBadges = (items: TrophyItem[], Icon: typeof Moon | typeof SpellCheck) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.slug}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(item.earned_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      {certificates.length > 0 ? (
        <DomainSection label="Certificates" icon={ScrollText}>
          <div className="space-y-2">
            {certificates.map((c) => (
              <Card
                key={c.certificate_number}
                className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card"
              >
                <CardContent className="py-4 flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <ScrollText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{c.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                      {c.certificate_number}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(c.issued_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DomainSection>
      ) : null}

      {(grouped.quranMilestones.length > 0 || grouped.quranParas.length > 0) && (
        <DomainSection label="Quran" icon={BookText}>
          <Card>
            <CardContent className="py-4 space-y-3">
              {grouped.quranMilestones.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {grouped.quranMilestones.map((m) => (
                    <MilestoneChip key={m.slug} item={m} />
                  ))}
                </div>
              ) : null}
              {grouped.quranParas.length > 0 ? (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-2">
                    Paras completed ({grouped.quranParas.length}/30)
                  </p>
                  <ParaGrid paras={grouped.quranParas} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </DomainSection>
      )}

      {grouped.memorization.length > 0 ? (
        <DomainSection label="Memorization" icon={BookMarked}>
          <div className="space-y-2">
            {grouped.memorization.map((g) => (
              <MemLessonRow key={g.lessonTitle} group={g} />
            ))}
          </div>
        </DomainSection>
      ) : null}

      {grouped.qaida.length > 0 ? (
        <DomainSection label="Qaida" icon={SpellCheck}>
          {simpleBadges(grouped.qaida, SpellCheck)}
        </DomainSection>
      ) : null}

      {grouped.namaz.length > 0 ? (
        <DomainSection label="Namaz" icon={Moon}>
          {simpleBadges(grouped.namaz, Moon)}
        </DomainSection>
      ) : null}
    </div>
  )
}

export function toTrophyItem(row: {
  earned_at: string
  achievement_definitions: {
    slug: string
    domain: AchievementDomain
    title: string
    description: string | null
    issues_certificate: boolean
  }
}): TrophyItem {
  const d = row.achievement_definitions
  return {
    slug: d.slug,
    domain: d.domain,
    title: d.title,
    description: d.description,
    earned_at: row.earned_at,
    issues_certificate: d.issues_certificate,
  }
}
