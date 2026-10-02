"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { ArrowLeft, Clock, Download, FileText, Sparkles, Target } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ArabicText } from "@/components/arabic-text"
import { KidButton, KidEmpty } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import { QuranGemBox } from "@/components/quran-gem-box"
import { StoryMoralCompass } from "@/components/story-moral-compass"
import { StoryReflectionPledge } from "@/components/story-reflection-pledge"
import { StorySceneReader } from "@/components/story-scene-reader"
import { logActivity } from "@/lib/activity-log"
import { getHijriMonthInfo } from "@/lib/hijri"
import { CATEGORY_ICON, type HistoryStory as HistoryRow } from "@/lib/history"
import { supabase } from "@/lib/supabase"

// The reader selects the complete storybook record
type HistoryStory = Pick<
  HistoryRow,
  | "id"
  | "title"
  | "arabic_title"
  | "subtitle"
  | "summary"
  | "content"
  | "category"
  | "target_age_group"
  | "hero_virtue"
  | "reading_time_mins"
  | "quran_gem"
  | "life_lessons"
  | "reflection_challenge"
  | "quiz_id"
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
        "id, title, arabic_title, subtitle, summary, content, category, target_age_group, hero_virtue, reading_time_mins, quran_gem, life_lessons, reflection_challenge, quiz_id, hijri_month, cover_image_url, file_url, file_type",
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
    <article className="mx-auto max-w-3xl animate-fade-in-up pb-10">
      {/* Back to the shelf */}
      <button
        type="button"
        onClick={() => router.push("/student/history")}
        className="mb-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-[14px] font-bold text-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <ArrowLeft className="h-4 w-4" />
        All stories
      </button>

      {/* Cover Banner */}
      {story.cover_image_url ? (
        <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded-[26px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.25)] shadow-soft">
          <img src={story.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-6 flex aspect-[21/9] w-full items-center justify-center rounded-[26px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.25)] text-[64px] shadow-soft">
          {CATEGORY_ICON[story.category] ?? "📜"}
        </div>
      )}

      {/* Quick metadata tags */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3 py-1 text-[12.5px] font-bold text-foreground">
          <span aria-hidden>{CATEGORY_ICON[story.category] ?? "📜"}</span>
          {story.category}
        </span>

        {monthTag && (
          <span className="rounded-full bg-[hsl(var(--kid-saffron)/0.45)] px-3 py-1 text-[12.5px] font-extrabold text-foreground">
            🌙 {monthTag.name}
          </span>
        )}

        {story.reading_time_mins && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/80 px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {story.reading_time_mins} min read
          </span>
        )}

        {story.target_age_group && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/80 px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Ages {story.target_age_group}
          </span>
        )}

        {story.hero_virtue && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            {story.hero_virtue}
          </span>
        )}
      </div>

      {/* Title & Arabic Title */}
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-heading text-[clamp(26px,5.5vw,38px)] font-bold leading-tight tracking-tight text-primary">
          {story.title}
        </h1>
        {story.arabic_title && (
          <ArabicText className="text-[26px] text-foreground/80">{story.arabic_title}</ArabicText>
        )}
      </div>

      {/* Subtitle */}
      {story.subtitle && (
        <p className="mb-5 text-[16px] sm:text-[17.5px] font-medium leading-relaxed text-muted-foreground">
          {story.subtitle}
        </p>
      )}

      {/* 1. 🌟 The Wonder Opening (Hook) */}
      {story.summary && (
        <div className="mb-6 flex items-start gap-3.5 rounded-[22px] border-[1.5px] border-[hsl(var(--kid-teal)/0.45)] bg-[hsl(var(--kid-teal)/0.18)] p-4 sm:p-5 shadow-soft">
          <span aria-hidden className="text-[24px] leading-none">
            🌟
          </span>
          <div className="space-y-0.5">
            <span className="block text-[12px] font-black uppercase tracking-wider text-[hsl(var(--kid-teal))]">
              The Wonder Opening
            </span>
            <p className="text-[15.5px] sm:text-[16.5px] font-semibold leading-relaxed text-foreground/90">
              {story.summary}
            </p>
          </div>
        </div>
      )}

      {/* 2. 📖 The Adventure (Interactive Flip-Card Scenes) */}
      {story.content ? (
        <StorySceneReader
          content={story.content}
          storyTitle={story.title}
          className="mb-8"
        />
      ) : (
        !story.file_url && (
          <KidEmpty
            title="This story is still being written"
            text="Your teacher hasn't added the words yet — check back soon!"
            mood="sleepy"
          />
        )
      )}

      {/* 3. 💎 The Quranic Gem Card */}
      {story.quran_gem && (
        <div id="quran-gem-section">
          <QuranGemBox gem={story.quran_gem} />
        </div>
      )}

      {/* 4. 🧭 The Moral Compass (3 Life Lessons) */}
      {story.life_lessons && story.life_lessons.length > 0 && (
        <StoryMoralCompass lessons={story.life_lessons} virtue={story.hero_virtue} />
      )}

      {/* 5. 🎯 The Explorer Challenge & Quest */}
      <StoryReflectionPledge
        storyId={story.id}
        storyTitle={story.title}
        challenge={story.reflection_challenge}
        quizId={story.quiz_id}
      />

      {/* Attachment / PDF if any */}
      {story.file_url && (
        <div className="mt-8">
          {isPdf ? (
            <div className="overflow-hidden rounded-[26px] border-[1.5px] border-border bg-card shadow-soft">
              <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-border px-4 py-3 sm:px-5">
                <span className="flex items-center gap-2 text-[14.5px] font-bold text-foreground">
                  <FileText className="h-4 w-4" />
                  Something extra to read
                </span>
                <a
                  href={story.file_url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3 py-1.5 text-[12.5px] font-bold text-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
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
              className="inline-flex items-center gap-2 rounded-[18px] border-[1.5px] border-border bg-card px-4 py-3 text-[15px] font-bold text-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
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
