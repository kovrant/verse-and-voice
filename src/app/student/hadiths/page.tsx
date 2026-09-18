"use client"

import {
  Award,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sunnah of the Beloved Prophet (ﷺ)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Hadiths
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Learn, practice, and memorize precious words of Prophet Muhammad (ﷺ). Play the interactive Memory Peek game and earn milestone trophies!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/student/achievements">
              <Button variant="outline" className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Trophy Case</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Milestone Progress Bar */}
        <div className="mt-6 pt-5 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div className="sm:col-span-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Award className="h-4 w-4 text-emerald-500" />
                Target Badge: <span className="text-emerald-600 dark:text-emerald-400">{milestone.badgeTitle}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {stats.memorized} / {milestone.target} Hadiths ({milestone.percentage}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-emerald-500/10 overflow-hidden border border-emerald-500/20">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${milestone.percentage}%` }}
              />
            </div>
          </div>

          {/* Stats Chips */}
          <div className="flex items-center justify-around sm:justify-end gap-3 text-center">
            <div className="rounded-xl bg-card/80 border border-border/80 px-3 py-1.5 shadow-sm">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.memorized}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Memorized</p>
            </div>
            <div className="rounded-xl bg-card/80 border border-border/80 px-3 py-1.5 shadow-sm">
              <p className="text-lg font-bold text-amber-500 tabular-nums">{assignedHadiths.length}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Assigned</p>
            </div>
            <div className="rounded-xl bg-card/80 border border-border/80 px-3 py-1.5 shadow-sm">
              <p className="text-lg font-bold text-blue-500 tabular-nums">{stats.total}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab("assigned")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
              viewTab === "assigned"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <Star className="h-4 w-4 fill-current text-amber-300" />
            <span>My Assigned Hadiths ({assignedHadiths.length})</span>
          </button>

          <button
            onClick={() => setViewTab("library")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
              viewTab === "library"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span>Explore All Hadiths ({hadiths.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Tab 1: Assigned Hadiths View (Default) */}
      {viewTab === "assigned" && (
        <div className="space-y-6">
          {assignedHadiths.length === 0 ? (
            <Card className="py-12 text-center border-dashed border-2">
              <CardContent className="space-y-4 max-w-md mx-auto">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <BookMarked className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">No Hadiths Assigned Yet</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your teacher has not assigned you a specific Hadith this week. As soon as your teacher assigns one, it will appear here for you to practice and memorize!
                  </p>
                </div>
                <Button
                  onClick={() => setViewTab("library")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Browse Full Library & Read Ahead</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Your Teacher&apos;s Active Assignments ({assignedHadiths.length})
                </p>
                <span className="text-xs text-muted-foreground">Practice and recite to your teacher during your live class.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {assignedHadiths.map((hadith) => {
                  const topicInfo = HADITH_TOPICS[hadith.topic] || HADITH_TOPICS.general
                  const currentStatus = hadith.progress?.status || "reading"
                  const isPeekActive = !!peekActiveMap.get(hadith.id)
                  const maskedIndexes = maskedWordsMap.get(hadith.id) || new Set<number>()
                  const words = splitArabicWords(hadith.arabic_text)

                  return (
                    <Card
                      key={hadith.id}
                      className={cn(
                        "relative flex flex-col justify-between border-2 transition-all duration-200 shadow-md",
                        currentStatus === "memorized"
                          ? "border-emerald-500/60 bg-gradient-to-br from-emerald-500/15 via-card to-card"
                          : "border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-card to-card",
                      )}
                    >
                      <div>
                        {/* Top Bar */}
                        <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between gap-2 bg-amber-500/10">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                              #{hadith.hadith_number}
                            </span>
                            <Badge variant="outline" className={cn("text-[11px] font-medium border", topicInfo.bgColor)}>
                              <span>{topicInfo.icon}</span>
                              <span className="ml-1">{topicInfo.label}</span>
                            </Badge>
                          </div>

                          <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                            Assigned by Teacher
                          </Badge>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                          {/* Arabic Text Display in Calligraphic Font or Memory Peek */}
                          <div className="rounded-2xl bg-card p-5 border border-border/60 text-center shadow-inner">
                            {!isPeekActive ? (
                              <p className="font-hadith text-2xl sm:text-3xl text-foreground font-medium select-text leading-loose" dir="rtl">
                                {hadith.arabic_text}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <Sparkles className="h-3.5 w-3.5" /> Memory Peek Active
                                  </span>
                                  <span>Tap words to hide / reveal</span>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-2.5 py-1" dir="rtl">
                                  {words.map((word, wIdx) => {
                                    const isMasked = maskedIndexes.has(wIdx)
                                    return (
                                      <button
                                        key={wIdx}
                                        onClick={() => toggleWordMask(hadith.id, wIdx)}
                                        className={cn(
                                          "rounded-xl px-3.5 py-2 font-hadith text-2xl transition-all duration-200 border select-none cursor-pointer",
                                          isMasked
                                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold tracking-widest shadow-inner"
                                            : "bg-card border-border text-foreground hover:border-emerald-500 shadow-sm",
                                        )}
                                        title={isMasked ? "Tap to reveal word" : "Tap to hide word"}
                                      >
                                        {isMasked ? "•••" : word}
                                      </button>
                                    )
                                  })}
                                </div>

                                <div className="flex items-center justify-center gap-2 pt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => maskAllWords(hadith.id, words.length)}
                                  >
                                    <EyeOff className="h-3 w-3" /> Hide All
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => revealAllWords(hadith.id)}
                                  >
                                    <Eye className="h-3 w-3" /> Reveal All
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* English Translation */}
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meaning</p>
                            <p className="text-sm font-medium text-foreground italic">
                              &ldquo;{hadith.english_text}&rdquo;
                            </p>
                          </div>

                          {/* Urdu Translation */}
                          <div className="space-y-1 text-right" dir="rtl">
                            <p className="text-xs font-semibold text-muted-foreground tracking-wider">ترجمہ</p>
                            <p className="text-sm font-medium text-foreground">
                              {hadith.urdu_text}
                            </p>
                          </div>

                          {/* Kid's Daily Moral Action */}
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 flex items-start gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground">What I can do today:</p>
                              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{hadith.kids_lesson}</p>
                            </div>
                          </div>

                          {/* Narrator & Reference */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
                            <span>Narrated by {hadith.narrator}</span>
                            <span className="font-medium text-foreground/70">{hadith.reference}</span>
                          </div>
                        </CardContent>
                      </div>

                      {/* Bottom Controls - Read Only for Students */}
                      <div className="p-4 bg-secondary/30 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Memory Peek Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMemoryPeek(hadith.id, words.length)}
                          className={cn(
                            "h-9 text-xs font-semibold gap-1.5 w-full sm:w-auto border",
                            isPeekActive
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                              : "border-border hover:bg-secondary",
                          )}
                        >
                          {isPeekActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          <span>{isPeekActive ? "Show Full Text" : "🎮 Practice with Memory Peek"}</span>
                        </Button>

                        {/* Read-Only Status Indicator */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                          {currentStatus === "memorized" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 py-1.5 px-3 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              Memorized
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              Assigned by Teacher
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Full Hadith Library View */}
      {viewTab === "library" && (
        <div className="space-y-4">
          {/* Search & Topic Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Hadith by Arabic, English, Urdu, or moral lesson..."
                className="pl-9 bg-card"
              />
            </div>

            {/* Topic Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedTopic("all")}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border",
                  selectedTopic === "all"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                All Topics ({hadiths.length})
              </button>
              {Object.entries(HADITH_TOPICS).map(([key, topic]) => {
                const count = hadiths.filter((h) => h.topic === key).length
                if (count === 0) return null
                const isSelected = selectedTopic === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTopic(key)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border flex items-center gap-1.5",
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <span>{topic.icon}</span>
                    <span>{topic.label.split(" ")[0]}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Library Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredLibraryHadiths.map((hadith) => {
              const topicInfo = HADITH_TOPICS[hadith.topic] || HADITH_TOPICS.general
              const currentStatus = hadith.progress?.status || "reading"
              const isPeekActive = !!peekActiveMap.get(hadith.id)
              const maskedIndexes = maskedWordsMap.get(hadith.id) || new Set<number>()
              const words = splitArabicWords(hadith.arabic_text)

              return (
                <Card
                  key={hadith.id}
                  className={cn(
                    "relative flex flex-col justify-between border transition-all duration-200 shadow-sm hover:shadow-md",
                    currentStatus === "memorized"
                      ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card"
                      : hadith.is_assigned
                      ? "border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-card"
                      : "border-border/80 bg-card hover:border-emerald-500/30",
                  )}
                >
                  <div>
                    {/* Top Bar */}
                    <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          {hadith.hadith_number}
                        </span>
                        <Badge variant="outline" className={cn("text-[11px] font-medium border", topicInfo.bgColor)}>
                          <span>{topicInfo.icon}</span>
                          <span className="ml-1">{topicInfo.label}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hadith.is_assigned && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                            Assigned
                          </Badge>
                        )}
                        {currentStatus === "memorized" && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Memorized
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* Arabic Text Display in Calligraphic Hadith Font */}
                      <div className="rounded-xl bg-secondary/30 p-4 border border-border/40 text-center">
                        {!isPeekActive ? (
                          <p className="font-hadith text-2xl sm:text-3xl text-foreground font-medium select-text leading-loose" dir="rtl">
                            {hadith.arabic_text}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <Sparkles className="h-3 w-3" /> Memory Peek Mode
                              </span>
                              <span>Tap word to hide / reveal</span>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 py-1" dir="rtl">
                              {words.map((word, wIdx) => {
                                const isMasked = maskedIndexes.has(wIdx)
                                return (
                                  <button
                                    key={wIdx}
                                    onClick={() => toggleWordMask(hadith.id, wIdx)}
                                    className={cn(
                                      "rounded-lg px-3 py-1.5 font-hadith text-2xl transition-all duration-200 border select-none cursor-pointer",
                                      isMasked
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold tracking-widest shadow-inner hover:bg-emerald-500/30"
                                        : "bg-card border-border/80 text-foreground hover:border-emerald-500/50 shadow-sm",
                                    )}
                                    title={isMasked ? "Tap to reveal word" : "Tap to hide word"}
                                  >
                                    {isMasked ? "•••" : word}
                                  </button>
                                )
                              })}
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => maskAllWords(hadith.id, words.length)}
                              >
                                <EyeOff className="h-3 w-3" /> Hide All
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => revealAllWords(hadith.id)}
                              >
                                <Eye className="h-3 w-3" /> Reveal All
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* English Translation */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meaning</p>
                        <p className="text-sm font-medium text-foreground italic">
                          &ldquo;{hadith.english_text}&rdquo;
                        </p>
                      </div>

                      {/* Urdu Translation */}
                      <div className="space-y-1 text-right" dir="rtl">
                        <p className="text-xs font-semibold text-muted-foreground tracking-wider">ترجمہ</p>
                        <p className="text-sm font-medium text-foreground">
                          {hadith.urdu_text}
                        </p>
                      </div>

                      {/* Kid's Daily Moral Action */}
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">What I can do:</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{hadith.kids_lesson}</p>
                        </div>
                      </div>

                      {/* Narrator & Reference */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
                        <span>Narrated by {hadith.narrator}</span>
                        <span className="font-medium text-foreground/70">{hadith.reference}</span>
                      </div>
                    </CardContent>
                  </div>

                  {/* Footer Controls - Read-Only for Students */}
                  <div className="p-4 bg-secondary/20 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMemoryPeek(hadith.id, words.length)}
                      className={cn(
                        "h-8 text-xs font-semibold gap-1.5 w-full sm:w-auto border",
                        isPeekActive
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : "border-border hover:bg-secondary",
                      )}
                    >
                      {isPeekActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <span>{isPeekActive ? "Show Full Text" : "Memory Peek"}</span>
                    </Button>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      {currentStatus === "memorized" ? (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 py-1 px-2.5 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Memorized
                        </Badge>
                      ) : hadith.is_assigned ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 py-1 px-2.5 text-xs font-semibold flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          Assigned
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
                          Library
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
