"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { ArrowLeft, Download, FileText } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { KidButton, KidCard, KidEmpty } from "@/components/kid-ui"
import { Markdown } from "@/components/markdown"
import { PageLoading } from "@/components/page-loading"
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

  if (loading) return <PageLoading variant="student-article" student />

  if (notFound || !story) {
    return (
      <KidEmpty
        title="We can't find that story"
        text="It may have been taken off the shelf. Let's look at the other ones!"
        mood="sleepy"
      >
        <KidButton href="/student/history" variant="soft" className="w-full">
          ← All stories
        </KidButton>
      </KidEmpty>
    )
  }

  const monthTag = getHijriMonthInfo(story.hijri_month)
  const isPdf = story.file_type === "pdf" || story.file_url?.toLowerCase().endsWith(".pdf")

  return (
    <article className="mx-auto max-w-3xl animate-fade-in-up pb-6">
      {/* Back to the shelf */}
      <button
        type="button"
        onClick={() => router.push("/student/history")}
        className="mb-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-[14px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
      >
        <ArrowLeft className="h-4 w-4" />
        All stories
      </button>

      {/* Cover */}
      {story.cover_image_url ? (
        <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded-[26px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.25)] shadow-[0_5px_0_hsl(var(--kid-teal)/0.5)]">
          <img src={story.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-6 flex aspect-[21/9] w-full items-center justify-center rounded-[26px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.25)] text-[64px] shadow-[0_5px_0_hsl(var(--kid-teal)/0.5)]">
          {CATEGORY_ICON[story.category] ?? "📜"}
        </div>
      )}

      {/* Tags */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3 py-1 text-[12.5px] font-bold text-foreground">
          <span aria-hidden>{CATEGORY_ICON[story.category] ?? "📜"}</span>
          {story.category}
        </span>
        {monthTag && (
          <span className="rounded-full bg-[hsl(var(--kid-saffron)/0.45)] px-3 py-1 text-[12.5px] font-extrabold text-foreground">
            🌙 {monthTag.name}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-heading text-[clamp(28px,6vw,40px)] font-bold leading-tight tracking-tight text-primary">
          {story.title}
        </h1>
        {story.arabic_title && (
          <ArabicText className="text-[26px] text-foreground/80">{story.arabic_title}</ArabicText>
        )}
      </div>

      {/* Summary — the "once upon a time" line */}
      {story.summary && (
        <div className="mb-6 flex items-start gap-3 rounded-[20px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.18)] p-4">
          <span aria-hidden className="text-[22px] leading-none">
            🏮
          </span>
          <p className="text-[16px] font-semibold leading-relaxed text-foreground/85">
            {story.summary}
          </p>
        </div>
      )}

      {/* Body — a page of the storybook */}
      {story.content ? (
        <KidCard className="px-5 py-5 sm:px-7 sm:py-6">
          <Markdown
            content={story.content}
            className="text-[17px] text-foreground/90 sm:text-[18px] [&_li]:leading-[1.8] [&_p]:my-4 [&_p]:leading-[1.85]"
          />
        </KidCard>
      ) : (
        !story.file_url && (
          <KidEmpty
            title="This story is still being written"
            text="Your teacher hasn't added the words yet — check back soon!"
            mood="sleepy"
          />
        )
      )}

      {/* Attachment */}
      {story.file_url && (
        <div className="mt-8">
          {isPdf ? (
            <div className="overflow-hidden rounded-[26px] border-[1.5px] border-border bg-card shadow-[0_5px_0_hsl(var(--border))]">
              <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-border px-4 py-3 sm:px-5">
                <span className="flex items-center gap-2 text-[14.5px] font-bold text-foreground">
                  <FileText className="h-4 w-4" />
                  Something extra to read
                </span>
                <a
                  href={story.file_url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3 py-1.5 text-[12.5px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save it
                </a>
              </div>
              <iframe src={story.file_url} className="w-full" style={{ height: "70vh" }} />
            </div>
          ) : (
            <a
              href={story.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[18px] border-[1.5px] border-border bg-card px-4 py-3 text-[15px] font-bold text-foreground shadow-[0_4px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
            >
              <FileText className="h-4 w-4" />
              Open the extra file ↗
            </a>
          )}
        </div>
      )}
    </article>
  )
}
