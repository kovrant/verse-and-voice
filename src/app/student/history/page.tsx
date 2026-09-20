"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { KidCard, KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import { getHijriMonthInfo, getHijriToday } from "@/lib/hijri"
import { CATEGORIES, CATEGORY_ICON, type HistoryStory as HistoryRow } from "@/lib/history"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

// The listing selects a subset of columns — keep the type honest about that.
type HistoryStory = Pick<
  HistoryRow,
  | "id"
  | "title"
  | "arabic_title"
  | "summary"
  | "category"
  | "hijri_month"
  | "cover_image_url"
  | "file_url"
  | "file_type"
>

export default function StudentHistoryPage() {
  const [stories, setStories] = useState<HistoryStory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")

  const hijri = useMemo(() => getHijriToday(), [])

  useEffect(() => {
    supabase
      .from("islamic_history")
      .select(
        "id, title, arabic_title, summary, category, hijri_month, cover_image_url, file_url, file_type",
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setStories((data as HistoryStory[]) || [])
        setLoading(false)
      })
  }, [])

  const featured = stories.filter((s) => s.hijri_month === hijri.month)
  const monthInfo = getHijriMonthInfo(hijri.month)

  const filtered = stories.filter((s) => {
    const matchesCat = filterCat === "All" || s.category === filterCat
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.summary ?? "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  if (loading) return <PageLoading variant="grid-cards" student count={6} />

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
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
                className="group flex items-center gap-3 rounded-[18px] border-[1.5px] border-border bg-card p-2.5 shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[hsl(var(--kid-teal)/0.28)] text-xl">
                  {s.cover_image_url ? (
                    <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (CATEGORY_ICON[s.category] ?? "📜")
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
            placeholder="Look for a story…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[50px] w-full rounded-full border-[1.5px] border-border bg-card pl-11 pr-4 text-[15px] font-semibold text-foreground shadow-[0_3px_0_hsl(var(--border))] outline-none placeholder:font-normal placeholder:text-muted-foreground/70 focus-visible:border-[hsl(var(--kid-teal))] focus-visible:ring-4 focus-visible:ring-[hsl(var(--kid-teal)/0.25)]"
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
                <span aria-hidden>{c === "All" ? "📚" : (CATEGORY_ICON[c] ?? "📜")}</span>
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
            <StoryBookCard key={s.id} story={s} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * One story as a book on the shelf: cover on top, title + a peek of the story
 * underneath, with a chunky teal edge. A Link, so it can't be a `KidCard`
 * (that renders a div) — it copies KidCard's shape instead.
 */
function StoryBookCard({ story }: { story: HistoryStory }) {
  const monthTag = getHijriMonthInfo(story.hijri_month)

  return (
    <Link
      href={`/student/history/${story.id}`}
      className="group flex flex-col overflow-hidden rounded-[26px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-card shadow-[0_5px_0_hsl(var(--kid-teal)/0.5)] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
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
        {monthTag && (
          <span className="absolute right-3 top-3 rounded-full bg-[hsl(var(--kid-saffron)/0.92)] px-2.5 py-1 text-[11.5px] font-extrabold text-[hsl(125_12%_16%)] shadow-[0_2px_0_hsl(var(--kid-saffron))]">
            {monthTag.name}
          </span>
        )}
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

        {story.summary && (
          <p className="mt-1.5 line-clamp-2 flex-1 text-[13.5px] font-semibold leading-relaxed text-foreground/75">
            {story.summary}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-2.5 py-1 text-[12px] font-bold text-foreground">
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
