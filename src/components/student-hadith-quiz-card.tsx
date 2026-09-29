"use client"

import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { getHadithNextMilestone } from "@/lib/hadiths/hadith-engine"
import type { Hadith, HadithAssignment, StudentHadithProgress } from "@/lib/hadiths/types"
import type { Quiz, QuizAssignment, QuizAttempt } from "@/lib/quizzes/types"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn, safeFormatDate } from "@/lib/utils"

interface StudentHadithQuizCardProps {
  studentId: string
  studentName: string
  onAchievementEarned?: () => void
}

interface RawHadithRow {
  id: string
  hadith_number?: number
  arabic_text?: string
  english_text?: string
  english_translation?: string
  urdu_text?: string
  urdu_translation?: string
  kids_lesson?: string
  kid_lesson?: string
  narrator?: string
  reference?: string
  topic?: string
  order_index?: number
  is_published?: boolean
}

export function StudentHadithQuizCard({
  studentId,
  studentName,
  onAchievementEarned,
}: StudentHadithQuizCardProps) {
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [hadithAssignments, setHadithAssignments] = useState<HadithAssignment[]>([])
  const [hadithProgress, setHadithProgress] = useState<StudentHadithProgress[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizAssignments, setQuizAssignments] = useState<QuizAssignment[]>([])
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)

  const [assignHadithOpen, setAssignHadithOpen] = useState(false)
  const [assignQuizOpen, setAssignQuizOpen] = useState(false)
  const [memorizedDrawerOpen, setMemorizedDrawerOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [
      hadithsRes,
      hAssignRes,
      hProgRes,
      quizzesRes,
      qAssignRes,
      qAttemptsRes,
    ] = await Promise.all([
      supabase.from("hadiths").select("*").order("hadith_number", { ascending: true }),
      supabase
        .from("hadith_assignments")
        .select("*")
        .eq("student_id", studentId)
        .order("assigned_at", { ascending: false }),
      supabase.from("student_hadith_progress").select("*").eq("student_id", studentId),
      supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
      supabase
        .from("quiz_assignments")
        .select("*")
        .eq("student_id", studentId)
        .order("assigned_at", { ascending: false }),
      supabase
        .from("quiz_attempts")
        .select("*")
        .eq("student_id", studentId)
        .order("completed_at", { ascending: false }),
    ])

    const rawHadiths = (hadithsRes.data as RawHadithRow[]) || []
    const formattedHadiths: Hadith[] = rawHadiths.map((h, idx) => ({
      id: h.id,
      hadith_number: h.hadith_number || idx + 1,
      arabic_text: h.arabic_text || "",
      english_text: h.english_text || h.english_translation || "",
      urdu_text: h.urdu_text || h.urdu_translation || "",
      kids_lesson: h.kids_lesson || h.kid_lesson || "",
      narrator: h.narrator || "Prophet Muhammad (ﷺ)",
      reference: h.reference || "Sahih al-Bukhari",
      topic: (h.topic as Hadith["topic"]) || "manners",
      order_index: h.order_index || h.hadith_number || idx + 1,
      is_published: h.is_published ?? true,
    }))

    setHadiths(formattedHadiths)
    setHadithAssignments((hAssignRes.data as HadithAssignment[]) || [])
    setHadithProgress((hProgRes.data as StudentHadithProgress[]) || [])
    setQuizzes((quizzesRes.data as Quiz[]) || [])
    setQuizAssignments((qAssignRes.data as QuizAssignment[]) || [])
    setQuizAttempts((qAttemptsRes.data as QuizAttempt[]) || [])
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const hadithById = useMemo(() => new Map(hadiths.map((h) => [h.id, h])), [hadiths])
  const quizById = useMemo(() => new Map(quizzes.map((q) => [q.id, q])), [quizzes])

  const memorizedHadithIds = useMemo(
    () => new Set(hadithProgress.filter((p) => p.status === "memorized").map((p) => p.hadith_id)),
    [hadithProgress],
  )

  const activeHadithItems = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ hadith: Hadith; assignmentId?: string; assignedAt?: string }> = []

    for (const a of hadithAssignments) {
      if (a.status === "pending" && !memorizedHadithIds.has(a.hadith_id)) {
        const h = hadithById.get(a.hadith_id)
        if (h && !seen.has(h.id)) {
          seen.add(h.id)
          result.push({ hadith: h, assignmentId: a.id, assignedAt: a.assigned_at })
        }
      }
    }

    for (const p of hadithProgress) {
      if (p.status === "memorizing" && !seen.has(p.hadith_id)) {
        const h = hadithById.get(p.hadith_id)
        if (h) {
          seen.add(h.id)
          result.push({ hadith: h })
        }
      }
    }

    return result
  }, [hadithAssignments, hadithProgress, memorizedHadithIds, hadithById])

  const memorizedHadiths = useMemo(() => {
    return hadithProgress
      .filter((p) => p.status === "memorized")
      .map((p) => ({
        progress: p,
        hadith: hadithById.get(p.hadith_id),
      }))
      .filter((item): item is { progress: StudentHadithProgress; hadith: Hadith } =>
        Boolean(item.hadith),
      )
  }, [hadithProgress, hadithById])

  const availableHadithsToAssign = useMemo(() => {
    const activeIds = new Set(activeHadithItems.map((i) => i.hadith.id))
    return hadiths.filter((h) => !memorizedHadithIds.has(h.id) && !activeIds.has(h.id))
  }, [hadiths, memorizedHadithIds, activeHadithItems])

  const milestone = useMemo(
    () => getHadithNextMilestone(memorizedHadiths.length),
    [memorizedHadiths.length],
  )

  async function handleAssignHadith(hadith: Hadith) {
    setBusyId(`assign-h-${hadith.id}`)
    try {
      const res = await fetch("/api/hadiths/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hadith_id: hadith.id,
          student_ids: [studentId],
          append: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to assign Hadith")
      toast.success(`Assigned Hadith #${hadith.hadith_number}`)
      setAssignHadithOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign Hadith")
    } finally {
      setBusyId(null)
    }
  }

  async function handleMarkHadithMemorized(hadith: Hadith) {
    setBusyId(`mem-h-${hadith.id}`)
    try {
      const res = await fetch("/api/hadiths/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          hadith_id: hadith.id,
          status: "memorized",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to mark Hadith memorized")

      if (data.newlyAwardedBadges && data.newlyAwardedBadges.length > 0) {
        toast.success(
          `Masha'Allah! Hadith #${hadith.hadith_number} memorized for ${studentName}. Badges awarded!`,
        )
        onAchievementEarned?.()
      } else {
        toast.success(`Hadith #${hadith.hadith_number} marked as memorized`)
      }
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark memorized")
    } finally {
      setBusyId(null)
    }
  }

  async function handleUnassignHadith(hadithId: string, assignmentId?: string) {
    setBusyId(`unassign-h-${hadithId}`)
    try {
      if (assignmentId) {
        await supabase.from("hadith_assignments").delete().eq("id", assignmentId)
      }
      await supabase
        .from("student_hadith_progress")
        .delete()
        .eq("student_id", studentId)
        .eq("hadith_id", hadithId)
        .eq("status", "memorizing")
      toast.success("Hadith unassigned")
      await loadData()
    } catch {
      toast.error("Failed to unassign Hadith")
    } finally {
      setBusyId(null)
    }
  }

  async function handleAssignQuiz(quiz: Quiz, isReassign = false) {
    setBusyId(`assign-q-${quiz.id}`)
    try {
      const res = await fetch("/api/quizzes/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          student_ids: [studentId],
          reassign: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to assign quiz")
      toast.success(isReassign ? `Reassigned "${quiz.title}"` : `Assigned "${quiz.title}"`)
      setAssignQuizOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign quiz")
    } finally {
      setBusyId(null)
    }
  }

  async function handleUnassignQuiz(assignmentId: string) {
    setBusyId(`unassign-q-${assignmentId}`)
    try {
      const { error } = await supabase.from("quiz_assignments").delete().eq("id", assignmentId)
      if (error) throw error
      toast.success("Quiz assignment removed")
      await loadData()
    } catch {
      toast.error("Failed to remove quiz assignment")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <>
        <div className="py-4 space-y-2">
          <div className="h-4 w-32 shimmer rounded" />
          <div className="h-8 w-full shimmer rounded-lg" />
        </div>
        <div className="py-4 space-y-2">
          <div className="h-4 w-32 shimmer rounded" />
          <div className="h-8 w-full shimmer rounded-lg" />
        </div>
      </>
    )
  }

  const pendingQuizzes = quizAssignments.filter((a) => a.status === "pending")
  const completedQuizzes = quizAssignments.filter((a) => a.status !== "pending")
  const nextHadith = availableHadithsToAssign[0]

  return (
    <>
      {/* SECTION 2: HADITH */}
      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Hadith</p>
            <p className="text-xs text-muted-foreground">
              {memorizedHadiths.length}/50 memorized
              {!milestone.isComplete &&
                ` · Next: ${milestone.badgeTitle} (${milestone.target - milestone.current} left)`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activeHadithItems.length === 0 && nextHadith ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!!busyId}
                  onClick={() => void handleAssignHadith(nextHadith)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Assign Hadith #{nextHadith.hadith_number}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAssignHadithOpen((v) => !v)}
                  title="Choose another Hadith"
                >
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", assignHadithOpen && "rotate-180")}
                  />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAssignHadithOpen((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Assign Hadith
              </Button>
            )}
          </div>
        </div>

        {/* Inline Hadith Picker */}
        {assignHadithOpen && (
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Hadith for {studentName}
              </p>
              <Link
                href="/hadiths"
                className="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                Full library →
              </Link>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 main-scroll">
              {availableHadithsToAssign.slice(0, 15).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  disabled={!!busyId}
                  onClick={() => void handleAssignHadith(h)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-secondary/60 disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    <strong className="text-foreground">#{h.hadith_number}</strong> · {h.english_text}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex-shrink-0">
                    + Assign
                  </span>
                </button>
              ))}
              {availableHadithsToAssign.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">
                  All published Hadiths are already assigned or memorized.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Active Hadith items (only rendered when assigned) */}
        {activeHadithItems.length > 0 && (
          <div className="space-y-2">
            {activeHadithItems.map(({ hadith, assignmentId }) => {
              const isMarking = busyId === `mem-h-${hadith.id}`
              return (
                <div
                  key={hadith.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-secondary/25 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-600">
                        #{hadith.hadith_number}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {hadith.english_text}
                      </span>
                    </div>
                    {hadith.arabic_text && (
                      <p
                        dir="rtl"
                        className="mt-0.5 font-arabic text-xs text-muted-foreground truncate"
                      >
                        {hadith.arabic_text}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!busyId}
                      onClick={() => void handleMarkHadithMemorized(hadith)}
                      className="h-7 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                    >
                      {isMarking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Memorized
                        </>
                      )}
                    </Button>
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => void handleUnassignHadith(hadith.id, assignmentId)}
                      title="Unassign Hadith"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quiet collapsible row for Memorized Hadiths */}
        {memorizedHadiths.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setMemorizedDrawerOpen((o) => !o)}
              className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>
                <strong className="font-medium text-foreground">Memorized Hadiths</strong> (
                {memorizedHadiths.length} completed)
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  memorizedDrawerOpen && "rotate-180",
                )}
              />
            </button>
            {memorizedDrawerOpen && (
              <div className="mt-1.5 space-y-1 border-l-2 border-border/60 pl-3 max-h-40 overflow-y-auto main-scroll">
                {memorizedHadiths.map(({ hadith, progress }) => (
                  <div
                    key={hadith.id}
                    className="flex items-center justify-between gap-2 text-xs py-0.5"
                  >
                    <span className="truncate text-muted-foreground">
                      <strong className="text-foreground">#{hadith.hadith_number}</strong> ·{" "}
                      {hadith.english_text}
                    </span>
                    {progress.memorized_at && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {safeFormatDate(progress.memorized_at, "MMM d")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: QUIZZES */}
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Quizzes</p>
            <p className="text-xs text-muted-foreground">
              {pendingQuizzes.length} pending
              {completedQuizzes.length > 0 && ` · ${completedQuizzes.length} completed`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs flex-shrink-0"
            onClick={() => setAssignQuizOpen((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Assign Quiz
          </Button>
        </div>

        {/* Inline Quiz Picker */}
        {assignQuizOpen && (
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Quiz for {studentName}
              </p>
              <Link
                href="/quizzes"
                className="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                Quiz builder →
              </Link>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 main-scroll">
              {quizzes.map((q) => {
                const existing = quizAssignments.find((a) => a.quiz_id === q.id)
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void handleAssignQuiz(q, !!existing)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-secondary/60 disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-foreground">{q.title}</span>
                      <span className="text-muted-foreground"> · {q.category}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 flex-shrink-0">
                      {existing ? "Reassign" : "+ Assign"}
                    </span>
                  </button>
                )
              })}
              {quizzes.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">No quizzes created yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Active / Pending Quizzes */}
        {pendingQuizzes.length > 0 && (
          <div className="space-y-1.5">
            {pendingQuizzes.map((assignment) => {
              const quiz = quizById.get(assignment.quiz_id)
              if (!quiz) return null
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                      Pending
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {quiz.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void handleUnassignQuiz(assignment.id)}
                    title="Remove quiz assignment"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Completed Quizzes tucked into a quiet collapsible toggle */}
        {completedQuizzes.length > 0 && (
          <PastQuizzesDrawer
            completedQuizzes={completedQuizzes}
            quizById={quizById}
            quizAttempts={quizAttempts}
            busyId={busyId}
            onReassign={(q) => void handleAssignQuiz(q, true)}
            onRemove={(id) => void handleUnassignQuiz(id)}
          />
        )}
      </div>
    </>
  )
}

function PastQuizzesDrawer({
  completedQuizzes,
  quizById,
  quizAttempts,
  busyId,
  onReassign,
  onRemove,
}: {
  completedQuizzes: QuizAssignment[]
  quizById: Map<string, Quiz>
  quizAttempts: QuizAttempt[]
  busyId: string | null
  onReassign: (quiz: Quiz) => void
  onRemove: (assignmentId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          <strong className="font-medium text-foreground">
            Past {completedQuizzes.length} quiz{completedQuizzes.length === 1 ? "" : "zes"}
          </strong>
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          Past {completedQuizzes.length} quiz{completedQuizzes.length === 1 ? "" : "zes"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5 border-l-2 border-border/60 pl-3 max-h-48 overflow-y-auto main-scroll">
          {completedQuizzes.map((assignment) => {
            const quiz = quizById.get(assignment.quiz_id)
            if (!quiz) return null
            const latestAttempt = quizAttempts.find((at) => at.quiz_id === quiz.id)
            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-2 py-1 text-xs"
              >
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-foreground">{quiz.title}</span>
                  {latestAttempt && (
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {latestAttempt.score}% · {latestAttempt.passed ? "Passed" : "Done"}
                      {latestAttempt.completed_at &&
                        ` · ${safeFormatDate(latestAttempt.completed_at, "MMM d")}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => onReassign(quiz)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reassign
                  </button>
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => onRemove(assignment.id)}
                    title="Remove quiz"
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
