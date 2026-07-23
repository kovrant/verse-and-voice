"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { Search, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { getHijriMonthInfo, getHijriToday } from "@/lib/hijri"
import { supabase } from "@/lib/supabase"

interface HistoryStory {
  id: string
  title: string
  arabic_title: string | null
  summary: string | null
  category: string
  hijri_month: number | null
  cover_image_url: string | null
  file_url: string | null
  file_type: string | null
}

const CATEGORIES = ["Prophets", "Companions", "Battles", "Events", "Places", "Other"] as const

const CATEGORY_ICON: Record<string, string> = {
  Prophets: "🕌",
  Companions: "🤝",
  Battles: "⚔️",
  Events: "📅",
  Places: "🕋",
  Other: "📜",
}

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

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in-up">
        <div className="h-10 w-56 shimmer rounded-xl" />
        <div className="h-40 shimmer rounded-2xl" />
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up text-foreground">
      {/* Page heading */}
      <div className="mb-[26px] flex items-center gap-4">
        <div className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-[32px]">
          📜
        </div>
        <div>
          <h1
            className="font-heading font-bold tracking-tight text-foreground"
            style={{ fontSize: "clamp(26px, 6vw, 34px)" }}
          >
            Islamic History
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Stories of the prophets, companions, and events of Islam.
          </p>
        </div>
      </div>

      {/* This Islamic Month banner */}
      <div className="mb-[26px] overflow-hidden rounded-2xl border border-border bg-[hsl(var(--surface-alt))] p-[24px_26px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1.4px] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            This Islamic Month
          </div>
          <div className="text-[13px] font-medium text-muted-foreground">{hijri.monthYear}</div>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-heading text-[28px] font-extrabold text-foreground">
            {monthInfo?.name ?? hijri.monthInfo.name}
          </span>
          <ArabicText className="text-[24px] text-primary">
            {monthInfo?.arabic ?? hijri.monthInfo.arabic}
          </ArabicText>
        </div>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          {monthInfo?.significance ?? hijri.monthInfo.significance}
        </p>

        {/* Featured stories for the current month */}
        {featured.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <Link
                key={s.id}
                href={`/student/history/${s.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-[hsl(var(--border-strong))]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xl">
                  {s.cover_image_url ? (
                    <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (CATEGORY_ICON[s.category] ?? "📜")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{s.category}</div>
                </div>
                <span className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filterCat === c
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Story grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <div className="mb-3 text-5xl">📭</div>
          <p className="mb-1 font-bold text-foreground">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            {stories.length === 0
              ? "Your teacher hasn't added any stories yet — check back soon!"
              : "No stories match your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const monthTag = getHijriMonthInfo(s.hijri_month)
            return (
              <Link
                key={s.id}
                href={`/student/history/${s.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-colors hover:border-[hsl(var(--border-strong))]"
              >
                {s.cover_image_url ? (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
                    <img
                      src={s.cover_image_url}
                      alt={s.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-secondary text-5xl">
                    {CATEGORY_ICON[s.category] ?? "📜"}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-[16px_18px]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-[17px] font-bold leading-snug text-foreground">
                      {s.title}
                    </h3>
                    {s.arabic_title && (
                      <ArabicText className="shrink-0 text-[15px] text-muted-foreground">
                        {s.arabic_title}
                      </ArabicText>
                    )}
                  </div>
                  {s.summary && (
                    <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {s.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {CATEGORY_ICON[s.category]} {s.category}
                    </span>
                    {monthTag && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {monthTag.name}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
