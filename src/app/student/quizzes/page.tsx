"use client"

import {
  Award,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AGE_GROUP_LABELS, CATEGORY_LABELS } from "@/lib/quizzes/quiz-engine"
import type { QuizAssignment, QuizAttempt } from "@/lib/quizzes/types"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

export default function StudentQuizzesPage() {
  const { student, loading: studentLoading } = useStudent()
  const [assignments, setAssignments] = useState<QuizAssignment[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!student?.id) return
    try {
      const [assignRes, attemptsRes] = await Promise.all([
        supabase
          .from("quiz_assignments")
          .select("*, quizzes(*, quiz_questions(*))")
          .eq("student_id", student.id)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("quiz_attempts")
          .select("*")
          .eq("student_id", student.id)
          .order("completed_at", { ascending: false }),
      ])

      const rawAssignments = (assignRes.data as any[]) || []
      const formattedAssignments: QuizAssignment[] = rawAssignments.map((a) => {
        const quizObj = a.quiz || a.quizzes
        const resolvedQuiz = Array.isArray(quizObj) ? quizObj[0] : quizObj
        return {
          id: a.id,
          quiz_id: a.quiz_id,
          student_id: a.student_id,
          status: a.status,
          assigned_at: a.assigned_at,
          due_date: a.due_date,
          quiz: resolvedQuiz,
        }
      })

      setAssignments(formattedAssignments)
      setAttempts((attemptsRes.data as QuizAttempt[]) || [])
    } catch (err) {
      console.error("Error loading student quiz data:", err)
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

  // Assigned quizzes that are pending
  const pendingAssigned = useMemo(() => {
    return assignments.filter((a) => a.status === "pending" && a.quiz)
  }, [assignments])

  // Assigned quizzes that are completed
  const completedAssigned = useMemo(() => {
    return assignments.filter((a) => a.status === "completed" && a.quiz)
  }, [assignments])

  // Map of best attempt by quiz id
  const bestAttempts = useMemo(() => {
    const map = new Map<string, QuizAttempt>()
    for (const a of attempts) {
      const existing = map.get(a.quiz_id)
      if (!existing || a.percentage > existing.percentage) {
        map.set(a.quiz_id, a)
      }
    }
    return map
  }, [attempts])

  if (loading || studentLoading) {
    return <PageLoading variant="grid-cards" student />
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-primary/5 to-card border border-amber-500/30 p-6 sm:p-8 shadow-soft">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Islamic Quests & Badges
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Your Islamic Knowledge Quests
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete quests assigned by your teacher, test your knowledge, and unlock badges for your Trophy Case!
          </p>
        </div>

        <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-6 opacity-15 sm:opacity-25 pointer-events-none">
          <Trophy className="h-32 w-32 sm:h-40 sm:w-40 text-amber-500" />
        </div>
      </div>

      {/* When no quizzes are assigned at all */}
      {assignments.length === 0 ? (
        <Card className="border-dashed py-16 text-center">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">No Quests Assigned Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your teacher hasn&apos;t assigned any quiz quests to you yet. When a new quest is assigned, you will receive a notification and it will appear right here!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* ── SECTION 1: ACTIVE ASSIGNED QUESTS (TO DO) ── */}
          {pendingAssigned.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Active Quests (To Do)</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {pendingAssigned.length} to do
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingAssigned.map((assignment) => {
                  const quiz = assignment.quiz!
                  const cat = CATEGORY_LABELS[quiz.category] || CATEGORY_LABELS.general
                  const ageLabel = AGE_GROUP_LABELS[quiz.age_group] || "All Ages"

                  return (
                    <Card
                      key={assignment.id}
                      className="border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 via-card to-card hover:shadow-soft-lg transition-all"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            {cat.label}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {ageLabel}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold line-clamp-1">{quiz.title}</CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {quiz.description || "Master this Islamic knowledge challenge!"}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-4 pb-4">
                        <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs">
                          <Award className="h-4 w-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-amber-700 dark:text-amber-300 truncate">
                              Reward: {quiz.badge_title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Pass mark: {quiz.passing_score}%
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/student/quizzes/${quiz.id}?assignment=${assignment.id}`}
                          className="block"
                        >
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm">
                            <Play className="h-4 w-4 fill-white" />
                            Start Quest
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── SECTION 2: COMPLETED QUESTS & BADGES ── */}
          {completedAssigned.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Completed Quests</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {completedAssigned.length} completed
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedAssigned.map((assignment) => {
                  const quiz = assignment.quiz!
                  const best = bestAttempts.get(quiz.id)
                  const cat = CATEGORY_LABELS[quiz.category] || CATEGORY_LABELS.general
                  const ageLabel = AGE_GROUP_LABELS[quiz.age_group] || "All Ages"
                  const hasPassed = best && best.passed

                  return (
                    <Card
                      key={assignment.id}
                      className="border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card hover:shadow-soft transition-all"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
                            {cat.label}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {ageLabel}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold line-clamp-1">{quiz.title}</CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {quiz.description || "Master this Islamic knowledge challenge!"}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-4 pb-4">
                        {/* Badge Reward */}
                        <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs">
                          <Award className="h-4 w-4 text-amber-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-amber-700 dark:text-amber-300 truncate">
                                {quiz.badge_title}
                              </p>
                              {hasPassed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Unlocked
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {best ? `Best Score: ${best.percentage}%` : `Pass mark: ${quiz.passing_score}%`}
                            </p>
                          </div>
                        </div>

                        {/* Retake button */}
                        <Link
                          href={`/student/quizzes/${quiz.id}?assignment=${assignment.id}`}
                          className="block"
                        >
                          <Button
                            variant="outline"
                            className="w-full font-semibold gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retake Quest ({best ? `${best.percentage}%` : "Play"})
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
