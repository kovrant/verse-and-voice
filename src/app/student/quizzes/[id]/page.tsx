"use client"

import {
  AnimatePresence,
  motion,
} from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { useAchievementCelebrations } from "@/components/achievement-celebration-provider"
import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Quiz, QuizGradeResult, QuizQuestion } from "@/lib/quizzes/types"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

export default function StudentQuizPlayerPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { student, loading: studentLoading } = useStudent()
  const { refresh: refreshCelebrations } = useAchievementCelebrations()

  const quizId = params?.id as string
  const assignmentId = searchParams.get("assignment")

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)

  // Player state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [selectedMultiIds, setSelectedMultiIds] = useState<string[]>([])
  const [isAnswerChecked, setIsAnswerChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  // Completion state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [gradeResult, setGradeResult] = useState<QuizGradeResult | null>(null)

  const [isNotAssigned, setIsNotAssigned] = useState(false)

  const loadQuiz = useCallback(async () => {
    if (!quizId || !student?.id) return
    try {
      const [quizRes, questionsRes, assignRes] = await Promise.all([
        supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle(),
        supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("order_index", { ascending: true }),
        supabase
          .from("quiz_assignments")
          .select("id")
          .eq("quiz_id", quizId)
          .eq("student_id", student.id)
          .maybeSingle(),
      ])

      if (!assignRes.data) {
        setIsNotAssigned(true)
        setLoading(false)
        return
      }

      if (quizRes.data) {
        setQuiz(quizRes.data as Quiz)
      }
      if (questionsRes.data) {
        setQuestions(questionsRes.data as QuizQuestion[])
      }
    } catch (err) {
      console.error("Error loading quiz:", err)
    } finally {
      setLoading(false)
    }
  }, [quizId, student?.id])

  useEffect(() => {
    if (!student?.id) {
      if (!studentLoading) setLoading(false)
      return
    }
    void loadQuiz()
  }, [student?.id, studentLoading, loadQuiz])

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0

  // Check current answer
  const handleCheckAnswer = () => {
    if (!currentQuestion) return

    let correct = false
    let answerVal: string | string[] = ""

    if (currentQuestion.question_type === "multi_choice") {
      answerVal = selectedMultiIds
      const correctIds = currentQuestion.options.filter((o) => o.is_correct).map((o) => o.id)
      const selectedSet = new Set(selectedMultiIds)
      const correctSet = new Set(correctIds)
      correct =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((id) => correctSet.has(id))
    } else {
      answerVal = selectedOptionId || ""
      const correctOption = currentQuestion.options.find((o) => o.is_correct)
      correct = !!correctOption && correctOption.id === selectedOptionId
    }

    setIsAnswerChecked(true)

    if (correct) {
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerVal,
    }))
  }

  // Next Question or Finish
  const handleNextQuestion = async () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1)
      setSelectedOptionId(null)
      setSelectedMultiIds([])
      setIsAnswerChecked(false)
    } else {
      // Final submission
      await finishQuiz()
    }
  }

  const finishQuiz = async () => {
    if (!student?.id || !quiz) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/quizzes/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          quiz_id: quiz.id,
          assignment_id: assignmentId || null,
          answers,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setGradeResult(data.gradeResult)
        setIsCompleted(true)
        if (data.badgeAwarded) {
          refreshCelebrations()
        }
      }
    } catch (err) {
      console.error("Error submitting quiz:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Retake / Reset
  const handleRetake = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setSelectedMultiIds([])
    setIsAnswerChecked(false)
    setStreak(0)
    setAnswers({})
    setIsCompleted(false)
    setGradeResult(null)
  }

  if (loading || studentLoading) {
    return <PageLoading variant="student-simple" student />
  }

  if (isNotAssigned) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Award className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Quest Not Assigned</h2>
        <p className="text-sm text-muted-foreground">
          This quiz quest is not currently assigned to your account. Ask your teacher to assign it to you!
        </p>
        <Link href="/student/quizzes">
          <Button variant="outline">Back to My Quests</Button>
        </Link>
      </div>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Quest Not Found</h2>
        <p className="text-sm text-muted-foreground">
          This quiz might have been deleted or is currently not published.
        </p>
        <Link href="/student/quizzes">
          <Button variant="outline">Back to Quests</Button>
        </Link>
      </div>
    )
  }

  // ── COMPLETION SCREEN ──
  if (isCompleted && gradeResult) {
    const passed = gradeResult.passed

    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 space-y-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className={`relative overflow-hidden rounded-3xl border p-8 sm:p-10 shadow-soft-lg ${
            passed
              ? "border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-card to-card"
              : "border-border/80 bg-card"
          }`}
        >
          {/* Confetti Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-5 shadow-inner">
            {passed ? (
              <Trophy className="h-10 w-10 animate-bounce" />
            ) : (
              <Sparkles className="h-10 w-10 text-amber-500" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {passed ? "MashaAllah! Quest Completed!" : "Great Effort!"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {passed
                ? `You scored ${gradeResult.percentage}% and earned the ${quiz.badge_title} badge!`
                : `You scored ${gradeResult.percentage}%. The pass mark is ${quiz.passing_score}%. Try again to master this quest and unlock your badge!`}
            </p>
          </div>

          {/* Badge Unlock Box */}
          {passed && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 p-4"
            >
              <Award className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300">
                  Badge Unlocked
                </span>
                <p className="font-bold text-base text-foreground">{quiz.badge_title}</p>
              </div>
            </motion.div>
          )}

          {/* Score Stats */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-border/60">
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-xl font-black text-foreground">
                {gradeResult.score} / {gradeResult.totalQuestions}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Percentage</p>
              <p className="text-xl font-black text-foreground">{gradeResult.percentage}%</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              onClick={handleRetake}
              variant="outline"
              className="flex-1 gap-2 border-border/80 font-semibold"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quest
            </Button>

            {passed ? (
              <Link href="/student/achievements" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold gap-2 shadow-sm">
                  <Trophy className="h-4 w-4" />
                  View Trophy Case
                </Button>
              </Link>
            ) : (
              <Link href="/student/quizzes" className="flex-1">
                <Button className="w-full bg-primary font-bold">Back to Quests</Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── ACTIVE GAMEPLAY SCREEN ──
  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/student/quizzes"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Quest
        </Link>

        {/* Streak Counter */}
        {streak > 1 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400"
          >
            <Flame className="h-4 w-4 fill-orange-500 text-orange-500 animate-pulse" />
            {streak} Streak!
          </motion.div>
        )}

        <div className="text-right">
          <span className="text-xs font-bold text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2.5 bg-secondary rounded-full" />

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id || currentIndex}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <Card className="border-border/80 bg-card shadow-soft p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
              {currentQuestion.question_text}
            </h2>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3 mt-6">
              {currentQuestion.options.map((option, optIdx) => {
                const letters = ["A", "B", "C", "D", "E"]
                const isSelected =
                  currentQuestion.question_type === "multi_choice"
                    ? selectedMultiIds.includes(option.id)
                    : selectedOptionId === option.id

                let stateClasses = "border-border/70 hover:border-amber-500/60 hover:bg-secondary/40"

                if (isAnswerChecked) {
                  if (option.is_correct) {
                    stateClasses =
                      "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold"
                  } else if (isSelected && !option.is_correct) {
                    stateClasses =
                      "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold"
                  } else {
                    stateClasses = "border-border/40 opacity-50"
                  }
                } else if (isSelected) {
                  stateClasses = "border-amber-500 bg-amber-500/15 font-bold ring-2 ring-amber-500/30"
                }

                return (
                  <button
                    key={option.id || optIdx}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => {
                      if (currentQuestion.question_type === "multi_choice") {
                        if (selectedMultiIds.includes(option.id)) {
                          setSelectedMultiIds(selectedMultiIds.filter((id) => id !== option.id))
                        } else {
                          setSelectedMultiIds([...selectedMultiIds, option.id])
                        }
                      } else {
                        setSelectedOptionId(option.id)
                      }
                    }}
                    className={`flex items-center gap-3.5 w-full p-4 rounded-2xl border text-left transition-all text-sm sm:text-base ${stateClasses}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isSelected
                          ? "bg-amber-500 text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {letters[optIdx] || optIdx + 1}
                    </span>

                    <span className="flex-1">{option.text}</span>

                    {isAnswerChecked && (
                      <span className="shrink-0">
                        {option.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : isSelected ? (
                          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        ) : null}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Did You Know? Learning Fact Toast */}
            {isAnswerChecked && currentQuestion.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs sm:text-sm text-foreground"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-700 dark:text-amber-300">Did you know?</p>
                  <p className="text-muted-foreground">{currentQuestion.explanation}</p>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {!isAnswerChecked ? (
          <Button
            size="lg"
            onClick={handleCheckAnswer}
            disabled={
              currentQuestion.question_type === "multi_choice"
                ? selectedMultiIds.length === 0
                : !selectedOptionId
            }
            className="w-full sm:w-auto min-w-[140px] bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 shadow-sm"
          >
            Check Answer
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleNextQuestion}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
          >
            {currentIndex < totalQuestions - 1 ? (
              <>
                Next Question
                <ArrowRight className="h-4 w-4" />
              </>
            ) : isSubmitting ? (
              "Calculating Score..."
            ) : (
              <>
                Finish Quest
                <Trophy className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
