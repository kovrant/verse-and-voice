"use client"

import { Eye, EyeOff, Search } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { KidButton, KidCard, KidEmpty, KidPageHeader, KidStat, KidTabs } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
import {
  calculateHadithStats,
  getHadithNextMilestone,
  HADITH_TOPICS,
  splitArabicWords,
} from "@/lib/hadiths/hadith-engine"
import type {
  Hadith,
  HadithTopic,
  HadithWithProgress,
  StudentHadithProgress,
} from "@/lib/hadiths/types"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

export default function StudentHadithsPage() {
  const { student, loading: studentLoading } = useStudent()
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [progressMap, setProgressMap] = useState<Map<string, StudentHadithProgress>>(new Map())
  const [assignedHadithIds, setAssignedHadithIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Portal View Tab: "assigned" (Default) vs "library"
  const [viewTab, setViewTab] = useState<"assigned" | "library">("assigned")

  // Filters (for library view)
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Memory Peek state: set of masked word indexes per hadithId: Map<hadithId, Set<number>>
  const [peekActiveMap, setPeekActiveMap] = useState<Map<string, boolean>>(new Map())
  const [maskedWordsMap, setMaskedWordsMap] = useState<Map<string, Set<number>>>(new Map())

  const loadData = useCallback(async () => {
    if (!student?.id) return
    try {
      const [hadithsRes, progressRes, assignmentsRes] = await Promise.all([
        supabase.from("hadiths").select("*").order("hadith_number", { ascending: true }),
        supabase.from("student_hadith_progress").select("*").eq("student_id", student.id),
        supabase
          .from("hadith_assignments")
          .select("*, hadiths(*)")
          .eq("student_id", student.id)
          .order("assigned_at", { ascending: false }),
      ])

      const rawHadiths = (hadithsRes.data as any[]) || []
      const hadithList: Hadith[] = rawHadiths.map((h, index) => ({
        id: h.id,
        hadith_number: h.hadith_number || index + 1,
        arabic_text: h.arabic_text || "",
        english_text: h.english_text || h.english_translation || "",
        urdu_text: h.urdu_text || h.urdu_translation || "",
        kids_lesson: h.kids_lesson || h.kid_lesson || "",
        narrator: h.narrator || "Prophet Muhammad (ﷺ)",
        reference: h.reference || "",
        topic: (h.topic as HadithTopic) || "general",
        order_index: h.order_index || h.hadith_number || index + 1,
        is_published: h.is_published !== false,
      }))

      const pList = (progressRes.data as StudentHadithProgress[]) || []
      const aList = (assignmentsRes.data as any[]) || []

      const pMap = new Map<string, StudentHadithProgress>()
      for (const p of pList) {
        pMap.set(p.hadith_id, p)
      }

      const assignedSet = new Set<string>()
      for (const a of aList) {
        if (a.hadith_id && a.status !== "completed") assignedSet.add(a.hadith_id)
      }

      setHadiths(hadithList)
      setProgressMap(pMap)
      setAssignedHadithIds(assignedSet)
    } catch (err) {
      console.error("Error loading Hadith data:", err)
    } finally {
      setLoading(false)
    }
  }, [student?.id])

  useEffect(() => {
    if (!student?.id) {
      if (!studentLoading) setLoading(false)
      return
    }
    setLoading(true)
    void loadData()
  }, [student?.id, studentLoading, loadData])

  // Combined Hadiths with progress
  const hadithsWithProgress = useMemo<HadithWithProgress[]>(() => {
    return hadiths.map((h) => ({
      ...h,
      progress: progressMap.get(h.id) || null,
      is_assigned: assignedHadithIds.has(h.id),
    }))
  }, [hadiths, progressMap, assignedHadithIds])

  // Assigned Hadiths
  const assignedHadiths = useMemo(
    () => hadithsWithProgress.filter((h) => h.is_assigned),
    [hadithsWithProgress],
  )

  // Stats
  const stats = useMemo(() => calculateHadithStats(hadithsWithProgress), [hadithsWithProgress])
  const milestone = useMemo(() => getHadithNextMilestone(stats.memorized), [stats.memorized])

  // Filtered Library Hadiths
  const filteredLibraryHadiths = useMemo(() => {
    return hadithsWithProgress.filter((h) => {
      if (selectedTopic !== "all" && h.topic !== selectedTopic) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchEnglish = (h.english_text || "").toLowerCase().includes(q)
        const matchUrdu = (h.urdu_text || "").includes(q)
        const matchLesson = (h.kids_lesson || "").toLowerCase().includes(q)
        const matchArabic = (h.arabic_text || "").includes(q)
        const matchRef = (h.reference || "").toLowerCase().includes(q)
        if (!matchEnglish && !matchUrdu && !matchLesson && !matchArabic && !matchRef) {
          return false
        }
      }
      return true
    })
  }, [hadithsWithProgress, selectedTopic, searchQuery])

  // Toggle Memory Peek mode for a Hadith
  const toggleMemoryPeek = (hadithId: string, wordCount: number) => {
    const isCurrentlyActive = !!peekActiveMap.get(hadithId)
    const nextState = !isCurrentlyActive

    setPeekActiveMap((prev) => {
      const next = new Map(prev)
      next.set(hadithId, nextState)
      return next
    })

    if (nextState) {
      // Default: mask alternate or middle words to start the puzzle
      const initialMasked = new Set<number>()
      for (let i = 0; i < wordCount; i++) {
        if (i % 2 === 1 || (wordCount <= 4 && i === 1)) {
          initialMasked.add(i)
        }
      }
      setMaskedWordsMap((prev) => {
        const next = new Map(prev)
        next.set(hadithId, initialMasked)
        return next
      })
    }
  }

  // Toggle individual word mask
  const toggleWordMask = (hadithId: string, wordIndex: number) => {
    setMaskedWordsMap((prev) => {
      const next = new Map(prev)
      const currentSet = new Set(next.get(hadithId) || [])
      if (currentSet.has(wordIndex)) {
        currentSet.delete(wordIndex)
      } else {
        currentSet.add(wordIndex)
      }
      next.set(hadithId, currentSet)
      return next
    })
  }

  // Mask all words
  const maskAllWords = (hadithId: string, wordCount: number) => {
    setMaskedWordsMap((prev) => {
      const next = new Map(prev)
      const allSet = new Set<number>()
      for (let i = 0; i < wordCount; i++) allSet.add(i)
      next.set(hadithId, allSet)
      return next
    })
  }

  // Reveal all words
  const revealAllWords = (hadithId: string) => {
    setMaskedWordsMap((prev) => {
      const next = new Map(prev)
      next.set(hadithId, new Set())
      return next
    })
  }

  if (loading || studentLoading) {
    return <PageLoading variant="grid-cards" student />
  }

  const peekProps = (hadith: HadithWithProgress) => {
    const words = splitArabicWords(hadith.arabic_text)
    return {
      words,
      peekActive: !!peekActiveMap.get(hadith.id),
      masked: maskedWordsMap.get(hadith.id) || new Set<number>(),
      onTogglePeek: () => toggleMemoryPeek(hadith.id, words.length),
      onToggleWord: (i: number) => toggleWordMask(hadith.id, i),
      onHideAll: () => maskAllWords(hadith.id, words.length),
      onShowAll: () => revealAllWords(hadith.id),
    }
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="📜"
        color="caramel"
        title="Hadiths"
        subtitle="Sayings of the Prophet ﷺ — learn them by heart"
        right={
          <Link
            href="/student/achievements"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-[14px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
          >
            <span aria-hidden>🏆</span> Trophy case
          </Link>
        }
      />

      {/* Next badge + stats */}
      <KidCard color="caramel" className="mb-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-[70px] w-[70px] flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(hsl(var(--kid-caramel)) ${milestone.percentage}%, hsl(var(--kid-caramel) / 0.22) 0)`,
            }}
          >
            <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-card text-[28px]">
              {milestone.isComplete ? "👑" : "🏅"}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              {milestone.isComplete ? "All badges won!" : "Next badge"}
            </p>
            <p className="font-heading text-[20px] font-bold leading-tight text-primary sm:text-[22px]">
              {milestone.badgeTitle}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="h-2.5 max-w-[240px] flex-1 overflow-hidden rounded-full bg-[hsl(var(--kid-caramel)/0.25)]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--kid-caramel))] transition-all duration-500"
                  style={{ width: `${milestone.percentage}%` }}
                />
              </div>
              <span className="text-[13px] font-bold text-muted-foreground">
                {stats.memorized} of {milestone.target}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <KidStat emoji="✅" value={stats.memorized} label="Learnt" color="sage" />
          <KidStat emoji="⭐" value={assignedHadiths.length} label="From teacher" color="saffron" />
          <KidStat emoji="📚" value={stats.total} label="All hadiths" color="caramel" />
        </div>
      </KidCard>

      <div className="mb-5">
        <KidTabs
          color="caramel"
          value={viewTab}
          onChange={setViewTab}
          tabs={[
            {
              key: "assigned",
              label: "From my teacher",
              emoji: "⭐",
              count: assignedHadiths.length,
            },
            { key: "library", label: "All hadiths", emoji: "📚", count: hadiths.length },
          ]}
        />
      </div>

      {viewTab === "assigned" &&
        (assignedHadiths.length === 0 ? (
          <KidEmpty
            title="No hadith from your teacher yet"
            text="When your teacher gives you a hadith, it will show up here. You can explore all the hadiths meanwhile!"
          >
            <KidButton variant="soft" onClick={() => setViewTab("library")}>
              📚 Explore all hadiths
            </KidButton>
          </KidEmpty>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {assignedHadiths.map((hadith) => (
              <HadithCard key={hadith.id} hadith={hadith} {...peekProps(hadith)} />
            ))}
          </div>
        ))}

      {viewTab === "library" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a word or a lesson…"
              className="h-[50px] w-full rounded-full border-[1.5px] border-border bg-card pl-11 pr-4 text-[15px] font-semibold text-foreground shadow-[0_3px_0_hsl(var(--border))] outline-none placeholder:font-normal placeholder:text-muted-foreground/70 focus-visible:border-[hsl(var(--kid-caramel))] focus-visible:ring-4 focus-visible:ring-[hsl(var(--kid-caramel)/0.25)]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { key: "all", icon: "📚", label: "All", count: hadiths.length },
              ...Object.entries(HADITH_TOPICS).map(([key, topic]) => ({
                key,
                icon: topic.icon,
                label: topic.label.split(" ")[0],
                count: hadiths.filter((h) => h.topic === key).length,
              })),
            ]
              .filter((t) => t.count > 0)
              .map((t) => {
                const active = selectedTopic === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTopic(t.key)}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                      active
                        ? "border-[hsl(var(--kid-caramel)/0.6)] bg-[hsl(var(--kid-caramel)/0.4)] text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span aria-hidden>{t.icon}</span>
                    {t.label}
                    <span className="text-[11px] opacity-70">{t.count}</span>
                  </button>
                )
              })}
          </div>

          {filteredLibraryHadiths.length === 0 ? (
            <KidEmpty title="No hadith found" text="Try another word, or pick a different topic." />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredLibraryHadiths.map((hadith) => (
                <HadithCard key={hadith.id} hadith={hadith} {...peekProps(hadith)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * One hadith as a storybook card: Arabic on a clean panel (or the Memory Peek
 * word game), meaning, Urdu, and a "what I can do today" nudge. Colour shows
 * the state: learnt = sage, from the teacher = saffron, otherwise plain.
 * Read-only — only the teacher marks a hadith memorized.
 */
function HadithCard({
  hadith,
  words,
  peekActive,
  masked,
  onTogglePeek,
  onToggleWord,
  onHideAll,
  onShowAll,
}: {
  hadith: HadithWithProgress
  words: string[]
  peekActive: boolean
  masked: Set<number>
  onTogglePeek: () => void
  onToggleWord: (i: number) => void
  onHideAll: () => void
  onShowAll: () => void
}) {
  const topic = HADITH_TOPICS[hadith.topic] || HADITH_TOPICS.general
  const learnt = hadith.progress?.status === "memorized"
  const fromTeacher = hadith.is_assigned

  return (
    <KidCard
      color={learnt ? "sage" : fromTeacher ? "saffron" : undefined}
      className="flex flex-col gap-4"
    >
      {/* Top row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[hsl(var(--kid-caramel)/0.35)] px-2 font-heading text-[15px] font-bold text-primary">
          {hadith.hadith_number}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-card/80 px-3 py-1 text-[12.5px] font-bold text-foreground">
          <span aria-hidden>{topic.icon}</span>
          {topic.label}
        </span>
        <span className="ml-auto">
          {learnt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[12px] font-extrabold text-primary-foreground">
              ✓ Learnt
            </span>
          ) : fromTeacher ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--kid-saffron)/0.5)] px-3 py-1 text-[12px] font-extrabold text-foreground">
              ⭐ From teacher
            </span>
          ) : null}
        </span>
      </div>

      {/* Arabic / Memory Peek */}
      <div className="rounded-[20px] border-[1.5px] border-border bg-card p-4 text-center sm:p-5">
        {!peekActive ? (
          <p
            className="select-text font-hadith text-[26px] font-medium leading-loose text-foreground sm:text-[30px]"
            dir="rtl"
          >
            {hadith.arabic_text}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-muted-foreground">
              🎮 Tap a word to hide it — can you say the whole hadith?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 py-1" dir="rtl">
              {words.map((word, i) => {
                const hidden = masked.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onToggleWord(i)}
                    title={hidden ? "Tap to show the word" : "Tap to hide the word"}
                    className={cn(
                      "select-none rounded-[14px] border-[1.5px] px-3 py-1.5 font-hadith text-[24px] transition-transform active:scale-95",
                      hidden
                        ? "border-[hsl(var(--kid-caramel)/0.55)] bg-[hsl(var(--kid-caramel)/0.3)] font-bold tracking-widest text-muted-foreground"
                        : "border-border bg-card text-foreground shadow-[0_2px_0_hsl(var(--border))]",
                    )}
                  >
                    {hidden ? "•••" : word}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onHideAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-[12.5px] font-bold text-muted-foreground hover:text-foreground"
              >
                <EyeOff className="h-3.5 w-3.5" /> Hide all
              </button>
              <button
                type="button"
                onClick={onShowAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-[12.5px] font-bold text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5" /> Show all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meaning */}
      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
          What it means
        </p>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
          &ldquo;{hadith.english_text}&rdquo;
        </p>
      </div>
      {hadith.urdu_text && (
        <div className="text-right" dir="rtl">
          <p className="text-[12px] font-bold text-muted-foreground">ترجمہ</p>
          <p className="mt-1 text-[15px] font-semibold leading-relaxed text-foreground">
            {hadith.urdu_text}
          </p>
        </div>
      )}

      {/* Today's action */}
      {hadith.kids_lesson && (
        <div className="flex items-start gap-3 rounded-[18px] border-[1.5px] border-[hsl(var(--kid-sage)/0.45)] bg-[hsl(var(--kid-sage)/0.18)] p-3.5">
          <span aria-hidden className="text-[22px] leading-none">
            🌱
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-foreground">What I can do today</p>
            <p className="mt-0.5 text-[14px] font-semibold leading-snug text-foreground/85">
              {hadith.kids_lesson}
            </p>
          </div>
        </div>
      )}

      <p className="text-[12px] font-semibold text-muted-foreground">
        Narrated by {hadith.narrator}
        {hadith.reference ? ` · ${hadith.reference}` : ""}
      </p>

      <button
        type="button"
        onClick={onTogglePeek}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] font-heading text-[16px] font-bold transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none",
          peekActive
            ? "border-[hsl(var(--kid-caramel)/0.6)] bg-[hsl(var(--kid-caramel)/0.35)] text-foreground shadow-[0_4px_0_hsl(var(--kid-caramel)/0.55)]"
            : "border-border bg-card text-foreground shadow-[0_4px_0_hsl(var(--border))]",
        )}
      >
        {peekActive ? "👀 Show the whole hadith" : "🎮 Play the memory game"}
      </button>
    </KidCard>
  )
}
