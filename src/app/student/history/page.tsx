"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { Check, Clock, Search, Sparkles, Trophy } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { KidCard, KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import { getHijriMonthInfo, getHijriToday } from "@/lib/hijri"
import { CATEGORIES, CATEGORY_ICON, type HistoryStory as HistoryRow } from "@/lib/history"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

// The listing selects a subset of columns for the shelf view
type HistoryStory = Pick<
  HistoryRow,
  | "id"
  | "title"
  | "arabic_title"
  | "subtitle"
  | "summary"
  | "category"
  | "target_age_group"
  | "hero_virtue"
  | "reading_time_mins"
  | "quiz_id"
  | "hijri_month"
  | "cover_image_url"
  | "file_url"
  | "file_type"
>

export default function StudentHistoryPage() {
  const { student } = useStudent()
  const [stories, setStories] = useState<HistoryStory[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")

  const hijri = useMemo(() => getHijriToday(), [])

  useEffect(() => {
    supabase
      .from("islamic_history")
      .select(
        "id, title, arabic_title, subtitle, summary, category, target_age_group, hero_virtue, reading_time_mins, quiz_id, hijri_month, cover_image_url, file_url, file_type",
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setStories((data as HistoryStory[]) || [])
        setLoading(false)
      })
  }, [])

  // Fetch student completed stories
  useEffect(() => {
    if (!student?.id) return
    supabase
      .from("student_story_progress")
      .select("story_id")
      .eq("student_id", student.id)
      .then(({ data }) => {
        if (data) {
          setCompletedIds(new Set(data.map((r) => r.story_id)))
        }
      })
  }, [student?.id])

  const featured = stories.filter((s) => s.hijri_month === hijri.month)
  const monthInfo = getHijriMonthInfo(hijri.month)

  const filtered = stories.filter((s) => {
    const matchesCat = filterCat === "All" || s.category === filterCat
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.hero_virtue ?? "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  if (loading) return <PageLoading variant="grid-cards" student count={6} />

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-8">
      <KidPageHeader
        emoji="🏮"
        color="teal"
        title="Stories"
        subtitle="Tales of the prophets, their friends, and the days Muslims remember"
      />

      {/* This Islamic month — the shelf's "story of the season" */}
      <KidCard color="teal" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-foreground/75">
            <span aria-hidden>🌙</span> This Islamic month
          </span>
          <span className="rounded-full bg-card/70 px-3 py-1 text-[12.5px] font-bold text-foreground/85">
            {hijri.monthYear}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-heading text-[26px] font-bold leading-tight text-primary sm:text-[30px]">
            {monthInfo?.name ?? hijri.monthInfo.name}
          </span>
          <ArabicText className="text-[24px] text-foreground/85">
            {monthInfo?.arabic ?? hijri.monthInfo.arabic}
          </ArabicText>
        </div>
        <p className="mt-1.5 max-w-2xl text-[14.5px] font-semibold leading-relaxed text-foreground/85">
          {monthInfo?.significance ?? hijri.monthInfo.significance}
        </p>

        {/* Stories that belong to this month */}
        {featured.length > 0 && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <Link
                key={s.id}
                href={`/student/history/${s.id}`}
                className="group flex items-center gap-3 rounded-[18px] border-[1.5px] border-border bg-card p-2.5 shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[hsl(var(--kid-teal)/0.28)] text-xl">
                  {s.cover_image_url ? (
                    <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    CATEGORY_ICON[s.category] ?? "📜"
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-bold text-foreground">
                    {s.title}
                  </span>
                  <span className="block truncate text-[12.5px] font-semibold text-muted-foreground">
                    {s.category}
                  </span>
                </span>
                <span aria-hidden className="text-[18px] text-foreground/50">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </KidCard>

      {/* Find a story */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Look for a story, virtue, or prophet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[50px] w-full rounded-full border-[1.5px] border-border bg-card pl-11 pr-4 text-[15px] font-semibold text-foreground shadow-soft outline-none placeholder:font-normal placeholder:text-muted-foreground/70 focus-visible:border-[hsl(var(--kid-teal))] focus-visible:ring-4 focus-visible:ring-[hsl(var(--kid-teal)/0.25)]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["All", ...CATEGORIES].map((c) => {
            const active = filterCat === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCat(c)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                  active
                    ? "border-[hsl(var(--kid-teal)/0.6)] bg-[hsl(var(--kid-teal)/0.4)] text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden>{c === "All" ? "📚" : CATEGORY_ICON[c] ?? "📜"}</span>
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* The shelf */}
      {filtered.length === 0 ? (
        <KidEmpty
          title={stories.length === 0 ? "The shelf is empty" : "No story like that"}
          text={
            stories.length === 0
              ? "Your teacher hasn't put any stories on the shelf yet — come back soon!"
              : "Try another word, or pick a different kind of story."
          }
          mood={stories.length === 0 ? "sleepy" : "awake"}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StoryBookCard key={s.id} story={s} isCompleted={completedIds.has(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * One story as a book on the shelf: cover on top, title + a peek of the story
 * underneath, in a teal-bordered card.
 */
function StoryBookCard({
  story,
  isCompleted = false,
}: {
  story: HistoryStory
  isCompleted?: boolean
}) {
  const monthTag = getHijriMonthInfo(story.hijri_month)

  return (
    <Link
      href={`/student/history/${story.id}`}
      className="group flex flex-col overflow-hidden rounded-[26px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-card shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      {/* Cover */}
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-[hsl(var(--kid-teal)/0.25)] sm:aspect-[16/9]">
        {story.cover_image_url ? (
          <img
            src={story.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[64px]">
            {CATEGORY_ICON[story.category] ?? "📜"}
          </span>
        )}

        {/* Badges on Cover */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {monthTag && (
            <span className="rounded-full bg-[hsl(var(--kid-saffron)/0.92)] px-2.5 py-1 text-[11px] font-extrabold text-[hsl(125_12%_16%)] shadow-soft">
              {monthTag.name}
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-soft">
              <Check className="h-3 w-3 stroke-[3]" />
              Read
            </span>
          )}
        </div>
      </div>

      {/* Spine line between cover and page */}
      <div className="h-[1.5px] w-full bg-[hsl(var(--kid-teal)/0.45)]" />

      <div
        className="flex flex-1 flex-col p-4"
        style={{
          background:
            "linear-gradient(160deg, hsl(var(--kid-teal) / 0.18), hsl(var(--kid-teal) / 0.05)), hsl(var(--card))",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-[18px] font-bold leading-snug text-primary">
            {story.title}
          </h3>
          {story.arabic_title && (
            <ArabicText className="shrink-0 text-[16px] text-foreground/75">
              {story.arabic_title}
            </ArabicText>
          )}
        </div>

        {story.subtitle && (
          <p className="mt-1 text-[12.5px] font-medium leading-tight text-muted-foreground line-clamp-1">
            {story.subtitle}
          </p>
        )}

        {story.summary && (
          <p className="mt-1.5 line-clamp-2 flex-1 text-[13.5px] font-semibold leading-relaxed text-foreground/75">
            {story.summary}
          </p>
        )}

        {/* Story Features Strip */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {story.hero_virtue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--kid-teal)/0.2)] px-2.5 py-0.5 text-[11px] font-bold text-foreground/90">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {story.hero_virtue}
            </span>
          )}

          {story.reading_time_mins && (
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <Clock className="h-3 w-3" />
              {story.reading_time_mins}m
            </span>
          )}

          {story.quiz_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <Trophy className="h-3 w-3" />
              Quest
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[hsl(var(--kid-teal)/0.2)] pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-foreground">
            <span aria-hidden>{CATEGORY_ICON[story.category] ?? "📜"}</span>
            {story.category}
          </span>
          <span className="text-[13px] font-extrabold text-foreground/70 transition-transform group-hover:translate-x-0.5">
            Read →
          </span>
        </div>
      </div>
    </Link>
  )
}
