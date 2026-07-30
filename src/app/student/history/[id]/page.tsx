"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { ArrowLeft, Download, FileText } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { Markdown } from "@/components/markdown"
import { logActivity } from "@/lib/activity-log"
import { getHijriMonthInfo } from "@/lib/hijri"
import { CATEGORY_ICON, type HistoryStory as HistoryRow } from "@/lib/history"
import { supabase } from "@/lib/supabase"

// The reader selects a subset of columns — keep the type honest about that.
type HistoryStory = Pick<
  HistoryRow,
  | "id"
  | "title"
  | "arabic_title"
  | "summary"
  | "content"
  | "category"
  | "hijri_month"
  | "cover_image_url"
  | "file_url"
  | "file_type"
>

export default function StudentHistoryReaderPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : params.id?.[0]

  const [story, setStory] = useState<HistoryStory | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    supabase
      .from("islamic_history")
      .select(
        "id, title, arabic_title, summary, content, category, hijri_month, cover_image_url, file_url, file_type",
      )
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (!data) {
          setNotFound(true)
        } else {
          const s = data as HistoryStory
          setStory(s)
          logActivity({
            event_type: "click",
            label: `Opened story: ${s.title}`,
            meta: { story_id: s.id, category: s.category },
          })
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
        <div className="h-6 w-24 shimmer rounded-lg" />
        <div className="h-64 shimmer rounded-2xl" />
        <div className="h-10 w-2/3 shimmer rounded-xl" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 w-full shimmer rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !story) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">🔍</div>
        <p className="mb-1 font-bold text-foreground">Story not found</p>
        <p className="mb-4 text-sm text-muted-foreground">
          This story may have been removed or isn&apos;t available.
        </p>
        <Link
          href="/student/history"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Islamic History
        </Link>
      </div>
    )
  }

  const monthTag = getHijriMonthInfo(story.hijri_month)
  const isPdf = story.file_type === "pdf" || story.file_url?.toLowerCase().endsWith(".pdf")

  return (
    <article className="mx-auto max-w-3xl animate-fade-in-up text-foreground">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/student/history")}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Islamic History
      </button>

      {/* Cover */}
      {story.cover_image_url ? (
        <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-secondary">
          <img
            src={story.cover_image_url}
            alt={story.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="mb-6 flex aspect-[21/9] w-full items-center justify-center rounded-2xl border border-border bg-secondary text-6xl">
          {CATEGORY_ICON[story.category] ?? "📜"}
        </div>
      )}

      {/* Tags */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-muted-foreground">
          {CATEGORY_ICON[story.category]} {story.category}
        </span>
        {monthTag && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
            {monthTag.name}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-heading text-[clamp(26px,6vw,38px)] font-extrabold leading-tight tracking-tight text-foreground">
          {story.title}
        </h1>
        {story.arabic_title && (
          <ArabicText className="text-[26px] text-primary">{story.arabic_title}</ArabicText>
        )}
      </div>

      {/* Summary */}
      {story.summary && (
        <p className="mb-6 border-l-4 border-primary/40 pl-4 text-[16px] italic leading-relaxed text-muted-foreground">
          {story.summary}
        </p>
      )}

      {/* Body */}
      {story.content ? (
        <Markdown content={story.content} />
      ) : (
        !story.file_url && (
          <p className="text-muted-foreground">This story doesn&apos;t have any content yet.</p>
        )
      )}

      {/* Attachment */}
      {story.file_url && (
        <div className="mt-8">
          {isPdf ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4" />
                  Attached document
                </span>
                <a
                  href={story.file_url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
              <iframe src={story.file_url} className="w-full" style={{ height: "70vh" }} />
            </div>
          ) : (
            <a
              href={story.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-soft hover:bg-secondary"
            >
              <FileText className="h-4 w-4" />
              Open attached file ↗
            </a>
          )}
        </div>
      )}
    </article>
  )
}
