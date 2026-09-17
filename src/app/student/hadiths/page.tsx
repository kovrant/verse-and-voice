"use client"

import {
  Award,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  calculateHadithStats,
  getHadithNextMilestone,
  HADITH_TOPICS,
  splitArabicWords,
} from "@/lib/hadiths/hadith-engine"
import type {
  Hadith,
  HadithStatus,
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

  // Filters
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Memory Peek state: set of masked word indexes per hadithId: Map<hadithId, Set<number>>
  const [peekActiveMap, setPeekActiveMap] = useState<Map<string, boolean>>(new Map())
  const [maskedWordsMap, setMaskedWordsMap] = useState<Map<string, Set<number>>>(new Map())

  // Milestone unlock celebration modal
  const [awardedBadges, setAwardedBadges] = useState<string[]>([])
  const [showBadgeModal, setShowBadgeModal] = useState(false)

  const loadData = useCallback(async () => {
    if (!student?.id) return
    try {
      const [hadithsRes, progressRes, assignmentsRes] = await Promise.all([
        supabase.from("hadiths").select("*").eq("is_active", true).order("order_index", { ascending: true }),
        supabase.from("student_hadith_progress").select("*").eq("student_id", student.id),
        supabase
          .from("hadith_assignments")
          .select("*, hadiths(*)")
          .eq("student_id", student.id)
          .order("assigned_at", { ascending: false }),
      ])

      const hadithList = (hadithsRes.data as Hadith[]) || []
      const pList = (progressRes.data as StudentHadithProgress[]) || []
      const aList = (assignmentsRes.data as any[]) || []

      const pMap = new Map<string, StudentHadithProgress>()
      for (const p of pList) {
        pMap.set(p.hadith_id, p)
      }

      const assignedSet = new Set<string>()
      for (const a of aList) {
        if (a.hadith_id) assignedSet.add(a.hadith_id)
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

  // Stats
  const stats = useMemo(() => calculateHadithStats(hadithsWithProgress), [hadithsWithProgress])
  const milestone = useMemo(() => getHadithNextMilestone(stats.memorized), [stats.memorized])

  // Filtered Hadiths
  const filteredHadiths = useMemo(() => {
    return hadithsWithProgress.filter((h) => {
      if (selectedTopic !== "all" && h.topic !== selectedTopic) return false
      if (selectedStatus === "assigned" && !h.is_assigned) return false
      if (selectedStatus === "memorized" && h.progress?.status !== "memorized") return false
      if (selectedStatus === "memorizing" && h.progress?.status !== "memorizing") return false
      if (selectedStatus === "reading" && h.progress?.status !== "reading" && h.progress != null) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = h.title.toLowerCase().includes(q)
        const matchEnglish = h.english_translation.toLowerCase().includes(q)
        const matchUrdu = h.urdu_translation.includes(q)
        const matchLesson = h.kid_lesson.toLowerCase().includes(q)
        const matchArabic = h.arabic_text.includes(q)
        if (!matchTitle && !matchEnglish && !matchUrdu && !matchLesson && !matchArabic) {
          return false
        }
      }
      return true
    })
  }, [hadithsWithProgress, selectedTopic, selectedStatus, searchQuery])

  // Featured / Assigned Hadith of the Week
  const assignedHadiths = useMemo(
    () => hadithsWithProgress.filter((h) => h.is_assigned),
    [hadithsWithProgress],
  )
  const featuredHadith = assignedHadiths.length > 0 ? assignedHadiths[0] : hadithsWithProgress[0]

  // Update status handler
  const handleUpdateStatus = async (hadithId: string, newStatus: HadithStatus) => {
    if (!student?.id) return

    // Optimistic update
    setProgressMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(hadithId)
      if (existing) {
        next.set(hadithId, {
          ...existing,
          status: newStatus,
          memorized_at: newStatus === "memorized" ? new Date().toISOString() : existing.memorized_at,
        })
      } else {
        next.set(hadithId, {
          id: `temp-${Date.now()}`,
          student_id: student.id,
          hadith_id: hadithId,
          status: newStatus,
          memorized_at: newStatus === "memorized" ? new Date().toISOString() : null,
          practice_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      return next
    })

    try {
      const res = await fetch("/api/hadiths/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          hadith_id: hadithId,
          status: newStatus,
          increment_practice: true,
        }),
      })

      const data = await res.json()
      if (data.success && data.progress) {
        setProgressMap((prev) => {
          const next = new Map(prev)
          next.set(hadithId, data.progress)
          return next
        })

        if (data.newlyAwardedBadges && data.newlyAwardedBadges.length > 0) {
          setAwardedBadges(data.newlyAwardedBadges)
          setShowBadgeModal(true)
        }
      }
    } catch (err) {
      console.error("Failed to update hadith status:", err)
      void loadData()
    }
  }

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
              Short Hadiths for Kids
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Learn, practice, and memorize precious words of Prophet Muhammad (ﷺ). Discover moral lessons for your daily life and earn beautiful milestone badges!
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
              <p className="text-lg font-bold text-amber-500 tabular-nums">{stats.memorizing}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Practicing</p>
            </div>
            <div className="rounded-xl bg-card/80 border border-border/80 px-3 py-1.5 shadow-sm">
              <p className="text-lg font-bold text-blue-500 tabular-nums">{stats.total}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Featured / Assigned Hadith of the Week */}
      {featuredHadith && (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-border/60 bg-emerald-500/10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                {featuredHadith.is_assigned ? "✨ Hadith Assigned by Teacher" : "🌟 Hadith Spotlight"}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs bg-card/80 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              {HADITH_TOPICS[featuredHadith.topic]?.label || featuredHadith.topic}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="text-center py-2 space-y-3">
              <p className="text-2xl sm:text-3xl font-bold font-amiri text-foreground leading-relaxed" dir="rtl">
                {featuredHadith.arabic_text}
              </p>
              <p className="text-sm sm:text-base font-medium text-muted-foreground italic max-w-2xl mx-auto">
                &ldquo;{featuredHadith.english_translation}&rdquo;
              </p>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200" dir="rtl">
                {featuredHadith.urdu_translation}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">What I can do today:</p>
                <p className="text-xs text-muted-foreground mt-0.5">{featuredHadith.kid_lesson}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Hadith by Arabic, English, Urdu, or moral lesson..."
              className="pl-9 bg-card"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by Status"
              className="h-10 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Progress ({stats.total})</option>
              {stats.assignedCount > 0 && <option value="assigned">Assigned ({stats.assignedCount})</option>}
              <option value="memorized">Memorized ({stats.memorized})</option>
              <option value="memorizing">Practicing ({stats.memorizing})</option>
              <option value="reading">To Learn ({stats.reading})</option>
            </select>
          </div>
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

      {/* 5. Hadith Cards List */}
      {filteredHadiths.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-3">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-base font-semibold text-foreground">No Hadiths found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search query or selecting a different topic filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTopic("all")
                setSelectedStatus("all")
                setSearchQuery("")
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredHadiths.map((hadith) => {
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
                        {hadith.order_index}
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
                    {/* Arabic Text Display or Interactive Memory Peek Game */}
                    <div className="rounded-xl bg-secondary/30 p-4 border border-border/40 text-center">
                      {!isPeekActive ? (
                        <p className="text-2xl sm:text-3xl font-bold font-amiri text-foreground leading-relaxed select-text" dir="rtl">
                          {hadith.arabic_text}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
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
                                    "rounded-lg px-3 py-1.5 font-amiri text-2xl transition-all duration-200 border select-none cursor-pointer",
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
                        &ldquo;{hadith.english_translation}&rdquo;
                      </p>
                    </div>

                    {/* Urdu Translation */}
                    <div className="space-y-1 text-right" dir="rtl">
                      <p className="text-xs font-semibold text-muted-foreground tracking-wider">ترجمہ</p>
                      <p className="text-sm font-medium text-foreground">
                        {hadith.urdu_translation}
                      </p>
                    </div>

                    {/* Kid's Daily Moral Action */}
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">What I can do:</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{hadith.kid_lesson}</p>
                      </div>
                    </div>

                    {/* Narrator & Reference */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
                      <span>Narrated by {hadith.narrator}</span>
                      <span className="font-medium text-foreground/70">{hadith.reference}</span>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Controls: Practice Mode & Progress Switcher */}
                <div className="p-4 bg-secondary/20 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Memory Peek Trigger */}
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

                  {/* 3-Stage Progress Buttons */}
                  <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleUpdateStatus(hadith.id, "reading")}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold transition-all border",
                        currentStatus === "reading"
                          ? "bg-secondary text-foreground border-border shadow-sm"
                          : "text-muted-foreground border-transparent hover:text-foreground",
                      )}
                    >
                      📖 Reading
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(hadith.id, "memorizing")}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold transition-all border",
                        currentStatus === "memorizing"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-sm"
                          : "text-muted-foreground border-transparent hover:text-foreground",
                      )}
                    >
                      🧠 Learning
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(hadith.id, "memorized")}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold transition-all border",
                        currentStatus === "memorized"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-emerald-500/10",
                      )}
                    >
                      ✅ Memorized!
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Milestone Unlock Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-emerald-500/40 bg-card shadow-2xl overflow-hidden text-center p-6 space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-bounce">
              <Trophy className="h-9 w-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Masha&apos;Allah! Milestone Reached! 🌟</h3>
              <p className="text-xs text-muted-foreground">
                You have unlocked new achievement badge{awardedBadges.length > 1 ? "s" : ""} in your trophy case:
              </p>
            </div>

            <div className="space-y-2 py-2">
              {awardedBadges.map((badgeTitle, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3 text-left"
                >
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{badgeTitle}</p>
                    <p className="text-[11px] text-muted-foreground">Added to your Trophy Case</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Link href="/student/achievements" className="flex-1">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  View Trophy Case
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowBadgeModal(false)} className="flex-1">
                Keep Practicing
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
