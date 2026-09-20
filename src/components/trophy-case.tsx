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
  Sparkles,
  SpellCheck,
  Trophy,
} from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { useMemo, useState } from "react"

import { KidEmpty } from "@/components/kid-ui"
import type { KidColor } from "@/components/student-nav"
import { Card, CardContent } from "@/components/ui/card"
import type { AchievementDomain } from "@/lib/achievements"
import { type GroupedTrophies, groupTrophies, type TrophyItem } from "@/lib/achievements/display"
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
  /**
   * Storybook look for the student portal. The teacher's student detail page
   * renders the same case and must keep the plain admin styling, so every
   * kid-only class lives behind this flag.
   */
  kid?: boolean
}

/**
 * ponytail: "new" is simply "earned in the last week". The unseen-trophy state
 * lives in the celebration provider and is cleared the moment this page opens,
 * so it can't drive the shine here; upgrade path is to thread those unseen
 * slugs in as a prop.
 */
const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
function isFresh(iso: string): boolean {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && Date.now() - t < FRESH_WINDOW_MS
}

function FreshPill() {
  return (
    <span className="celebrate-pop inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--kid-saffron)/0.55)] px-2 py-0.5 text-[11px] font-extrabold text-foreground">
      ✨ New
    </span>
  )
}

/** One earned trophy on the student's shelf: chunky tinted tile with a big emoji. */
function KidTrophyTile({
  color,
  emoji,
  title,
  sub,
  meta,
  fresh,
}: {
  color: KidColor
  emoji: string
  title: ReactNode
  sub?: ReactNode
  meta?: ReactNode
  fresh?: boolean
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-[20px] border-[1.5px] border-[hsl(var(--kid)/0.5)] bg-[hsl(var(--kid)/0.18)] px-3.5 py-3 shadow-[0_4px_0_hsl(var(--kid)/0.5)] transition-transform hover:-translate-y-0.5"
      style={{ "--kid": `var(--kid-${color})` } as CSSProperties}
    >
      <span aria-hidden className={cn("text-[26px] leading-none", fresh && "animate-float-gentle")}>
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-[16px] font-bold leading-tight text-foreground">
            {title}
          </p>
          {fresh && <FreshPill />}
        </div>
        {sub && (
          <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground/85">{sub}</p>
        )}
        {meta && <p className="mt-1 text-[12px] font-bold text-foreground/70">{meta}</p>}
      </div>
    </div>
  )
}

function ParaGrid({ paras, kid = false }: { paras: number[]; kid?: boolean }) {
  const earned = new Set(paras)
  return (
    <div className={cn("grid grid-cols-10", kid ? "gap-1.5" : "gap-1")}>
      {Array.from({ length: 30 }, (_, i) => {
        const n = i + 1
        const done = earned.has(n)
        return (
          <div
            key={n}
            title={done ? `Para ${n} completed` : `Para ${n} — not yet`}
            className={cn(
              kid
                ? "flex h-9 items-center justify-center rounded-[13px] border-[1.5px] text-[12px] font-extrabold tabular-nums"
                : "flex h-7 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
              kid
                ? done
                  ? "border-[hsl(var(--kid-sage)/0.6)] bg-[hsl(var(--kid-sage)/0.45)] text-foreground shadow-[0_2px_0_hsl(var(--kid-sage)/0.55)]"
                  : "border-dashed border-[hsl(var(--border-strong))] bg-secondary/30 text-muted-foreground"
                : done
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-secondary/80 text-muted-foreground/50",
            )}
          >
            {done ? <Check className={kid ? "h-4 w-4" : "h-3 w-3"} strokeWidth={3} /> : n}
          </div>
        )
      })}
    </div>
  )
}

function MilestoneChip({ item, kid = false }: { item: TrophyItem; kid?: boolean }) {
  if (kid) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold text-foreground",
          item.issues_certificate
            ? "border-[hsl(var(--kid-saffron)/0.6)] bg-[hsl(var(--kid-saffron)/0.35)]"
            : "border-[hsl(var(--kid-sage)/0.55)] bg-[hsl(var(--kid-sage)/0.3)]",
        )}
      >
        <span aria-hidden className={cn(isFresh(item.earned_at) && "animate-float-gentle")}>
          {item.issues_certificate ? "🏅" : "🏆"}
        </span>
        <span className="max-w-[12rem] truncate">{item.title}</span>
      </span>
    )
  }
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

function MemLessonRow({
  group,
  kid = false,
}: {
  group: GroupedTrophies["memorization"][number]
  kid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const partCount = group.parts.length
  const showParts = !group.complete && partCount > 0

  return (
    <div
      className={cn(
        kid
          ? "rounded-[20px] border-[1.5px] border-[hsl(var(--kid-lavender)/0.5)] bg-[hsl(var(--kid-lavender)/0.18)] px-3.5 py-3 shadow-[0_4px_0_hsl(var(--kid-lavender)/0.5)]"
          : "rounded-xl border border-border/60 bg-card/50 px-3 py-2.5",
      )}
    >
      <div className="flex items-start gap-2.5">
        {kid ? (
          <span aria-hidden className="text-[24px] leading-none">
            🧠
          </span>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-accent">
            <BookMarked className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate",
                kid
                  ? "font-heading text-[16px] font-bold text-foreground"
                  : "font-semibold text-sm",
              )}
            >
              {group.lessonTitle}
            </p>
            {group.complete ? (
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-0.5 rounded-full",
                  kid
                    ? "bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-primary-foreground"
                    : "bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300",
                )}
              >
                <Check className="h-3 w-3" />
                Done
              </span>
            ) : partCount > 0 ? (
              <span
                className={cn(
                  "shrink-0",
                  kid
                    ? "text-[12px] font-bold text-foreground/70"
                    : "text-[10px] font-medium text-muted-foreground",
                )}
              >
                {partCount} part{partCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-0.5",
              kid
                ? "text-[12px] font-semibold text-foreground/70"
                : "text-[10px] text-muted-foreground",
            )}
          >
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
            className={cn(
              "shrink-0",
              kid
                ? "rounded-full p-1.5 text-foreground/70 hover:bg-card/70 hover:text-foreground"
                : "rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-expanded={open}
            aria-label={open ? "Hide parts" : "Show parts"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        ) : null}
      </div>
      {showParts && (open || partCount <= 4) ? (
        <div className={cn("mt-2 flex flex-wrap gap-1", kid ? "pl-9" : "pl-10")}>
          {group.parts.map((p) => {
            const label = p.title.split(" · ")[0] ?? p.title
            return (
              <span
                key={p.slug}
                className={cn(
                  kid
                    ? "rounded-full bg-card/70 px-2.5 py-1 text-[12px] font-bold text-foreground"
                    : "rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
                )}
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
  emoji,
  kid = false,
  children,
}: {
  label: string
  icon: typeof Trophy
  emoji: string
  kid?: boolean
  children: React.ReactNode
}) {
  if (kid) {
    return (
      <section>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span aria-hidden className="text-[20px] leading-none">
            {emoji}
          </span>
          <h2 className="font-heading text-[20px] font-bold text-primary">{label}</h2>
        </div>
        {children}
      </section>
    )
  }
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

export function TrophyCase({ earned, certificates, emptyHint, kid = false }: TrophyCaseProps) {
  const grouped = useMemo(() => groupTrophies(earned), [earned])
  const isEmpty = earned.length === 0 && certificates.length === 0

  if (isEmpty) {
    if (kid) {
      return (
        <KidEmpty
          title="Your shelf is empty… for now!"
          text={emptyHint ?? "Keep learning — your first trophy is on its way."}
          mood="sleepy"
        />
      )
    }
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyHint ?? "No trophies yet — keep learning!"}
        </CardContent>
      </Card>
    )
  }

  const simpleBadges = (
    items: TrophyItem[],
    Icon: typeof Moon | typeof SpellCheck,
    kidEmoji: string,
    kidColor: KidColor,
  ) =>
    kid ? (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <KidTrophyTile
            key={item.slug}
            color={kidColor}
            emoji={kidEmoji}
            title={item.title}
            meta={`Won ${format(new Date(item.earned_at), "MMM d, yyyy")}`}
            fresh={isFresh(item.earned_at)}
          />
        ))}
      </div>
    ) : (
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
    <div className={kid ? "space-y-7" : "space-y-5"}>
      {certificates.length > 0 ? (
        <DomainSection label="Certificates" icon={ScrollText} emoji="📜" kid={kid}>
          {kid ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {certificates.map((c) => (
                <KidTrophyTile
                  key={c.certificate_number}
                  color="saffron"
                  emoji="📜"
                  title={c.title}
                  sub={<span className="font-mono text-[12px]">{c.certificate_number}</span>}
                  meta={`Given ${format(new Date(c.issued_at), "MMM d, yyyy")}`}
                  fresh={isFresh(c.issued_at)}
                />
              ))}
            </div>
          ) : (
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
          )}
        </DomainSection>
      ) : null}

      {(grouped.quranMilestones.length > 0 || grouped.quranParas.length > 0) && (
        <DomainSection label="Quran" icon={BookText} emoji="📖" kid={kid}>
          {kid ? (
            <div
              className="rounded-[24px] border-[1.5px] border-[hsl(var(--kid-sage)/0.45)] p-4 shadow-[0_5px_0_hsl(var(--kid-sage)/0.5)] sm:p-5"
              style={{
                background:
                  "linear-gradient(160deg, hsl(var(--kid-sage) / 0.22), hsl(var(--kid-sage) / 0.08)), hsl(var(--card))",
              }}
            >
              {grouped.quranMilestones.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {grouped.quranMilestones.map((m) => (
                    <MilestoneChip key={m.slug} item={m} kid />
                  ))}
                </div>
              ) : null}
              <p className="mb-2 text-[13px] font-extrabold text-foreground">
                Paras finished — {grouped.quranParas.length} of 30
              </p>
              <ParaGrid paras={grouped.quranParas} kid />
              {grouped.quranParas.length < 30 && (
                <p className="mt-2.5 text-[12.5px] font-semibold text-foreground/75">
                  🔒 The dotted ones are still to win — finish a para with your teacher to light it
                  up.
                </p>
              )}
            </div>
          ) : (
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
          )}
        </DomainSection>
      )}

      {grouped.memorization.length > 0 ? (
        <DomainSection label="Memorization" icon={BookMarked} emoji="🧠" kid={kid}>
          <div className={kid ? "grid grid-cols-1 gap-3" : "space-y-2"}>
            {grouped.memorization.map((g) => (
              <MemLessonRow key={g.lessonTitle} group={g} kid={kid} />
            ))}
          </div>
        </DomainSection>
      ) : null}

      {grouped.qaida.length > 0 ? (
        <DomainSection label="Qaida" icon={SpellCheck} emoji="✏️" kid={kid}>
          {simpleBadges(grouped.qaida, SpellCheck, "✏️", "teal")}
        </DomainSection>
      ) : null}

      {grouped.namaz.length > 0 ? (
        <DomainSection label="Namaz" icon={Moon} emoji="🕌" kid={kid}>
          {simpleBadges(grouped.namaz, Moon, "🕌", "rose")}
        </DomainSection>
      ) : null}

      {grouped.quizzes.length > 0 ? (
        <DomainSection label="Quests & Quizzes" icon={Sparkles} emoji="✨" kid={kid}>
          {kid ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grouped.quizzes.map((item) => (
                <KidTrophyTile
                  key={item.slug}
                  color="coral"
                  emoji="🏅"
                  title={item.title}
                  sub={item.description}
                  meta={`Won ${format(new Date(item.earned_at), "MMM d, yyyy")}`}
                  fresh={isFresh(item.earned_at)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {grouped.quizzes.map((item) => (
                <div
                  key={item.slug}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-border/60 bg-gradient-to-r from-amber-500/10 via-card to-card px-3.5 py-2.5 shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium">
                      Unlocked {format(new Date(item.earned_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DomainSection>
      ) : null}

      {grouped.hadiths.length > 0 ? (
        <DomainSection label="Hadith Milestones" icon={Award} emoji="📜" kid={kid}>
          {kid ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grouped.hadiths.map((item) => (
                <KidTrophyTile
                  key={item.slug}
                  color="caramel"
                  emoji="🏆"
                  title={item.title}
                  sub={item.description}
                  meta={`Won ${format(new Date(item.earned_at), "MMM d, yyyy")}`}
                  fresh={isFresh(item.earned_at)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {grouped.hadiths.map((item) => (
                <div
                  key={item.slug}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-card to-card px-3.5 py-2.5 shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium">
                      Unlocked {format(new Date(item.earned_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
