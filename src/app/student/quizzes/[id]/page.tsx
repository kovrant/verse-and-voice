"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { useAchievementCelebrations } from "@/components/achievement-celebration-provider"
import { KidButton, KidCard, KidEmpty, KidStat } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
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
        selectedSet.size === correctSet.size && [...selectedSet].every((id) => correctSet.has(id))
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
      <KidEmpty
        title="This quest isn't yours yet"
        text="Ask your teacher to give you this quiz, then it will show up in your quests."
      >
        <KidButton href="/student/quizzes" variant="soft" className="w-full">
          ← Back to my quests
        </KidButton>
      </KidEmpty>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <KidEmpty
        mood="sleepy"
        title="Quest not found"
        text="This quiz may have been removed. Let's go back and pick another one."
      >
        <KidButton href="/student/quizzes" variant="soft" className="w-full">
          ← Back to my quests
        </KidButton>
      </KidEmpty>
    )
  }

  // ── COMPLETION SCREEN ──
  if (isCompleted && gradeResult) {
    const passed = gradeResult.passed

    return (
      <div className="mx-auto max-w-xl py-6 animate-fade-in-up">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
        >
          <KidCard color={passed ? "saffron" : "sky"} className="px-5 py-7 text-center sm:px-7">
            <span aria-hidden className="mx-auto block text-[72px] leading-none">
              {passed ? "🏆" : "💪"}
            </span>
            <h1 className="mt-3 font-heading text-[28px] font-bold leading-tight text-primary sm:text-[32px]">
              {passed ? "MashaAllah!" : "Good try!"}
            </h1>
            <p className="mx-auto mt-2 max-w-[22rem] text-[15px] font-semibold text-muted-foreground">
              {passed
                ? `You won the ${quiz.badge_title} badge!`
                : `You need ${quiz.passing_score}% to win the badge. Have another go — you can do it!`}
            </p>

            <div className="mx-auto mt-5 flex max-w-[20rem] gap-2.5">
              <KidStat
                emoji="✅"
                value={`${gradeResult.score}/${gradeResult.totalQuestions}`}
                label="Right answers"
                color="sage"
              />
              <KidStat
                emoji="📊"
                value={`${gradeResult.percentage}%`}
                label="Your score"
                color={passed ? "saffron" : "sky"}
              />
            </div>

            {passed && (
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mx-auto mt-5 flex max-w-[20rem] items-center justify-center gap-3 rounded-[20px] border-[1.5px] border-[hsl(var(--kid-saffron)/0.5)] bg-[hsl(var(--kid-saffron)/0.28)] p-3.5"
              >
                <span aria-hidden className="text-[30px] leading-none">
                  🏅
                </span>
                <div className="text-left">
                  <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    New badge
                  </p>
                  <p className="font-heading text-[18px] font-bold text-primary">
                    {quiz.badge_title}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {passed ? (
                <KidButton
                  href="/student/achievements"
                  pad={<span className="text-[20px]">🏆</span>}
                >
                  See my badge
                </KidButton>
              ) : (
                <KidButton onClick={handleRetake} pad={<span className="text-[20px]">▶</span>}>
                  Try again
                </KidButton>
              )}
              <KidButton href="/student/quizzes" variant="soft">
                ← Back to my quests
              </KidButton>
            </div>
          </KidCard>
        </motion.div>
      </div>
    )
  }

  // ── ACTIVE GAMEPLAY SCREEN ──
  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up pb-6">
      {/* Top bar: exit, streak, question count */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/student/quizzes"
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3.5 py-2 text-[13.5px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Link>

        {streak > 1 && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[13px] font-extrabold text-accent-foreground shadow-[0_3px_0_hsl(16_48%_40%)]"
          >
            🔥 {streak} in a row!
          </motion.span>
        )}

        <span className="rounded-full border-[1.5px] border-border bg-card px-3.5 py-2 font-heading text-[14px] font-bold text-primary shadow-[0_3px_0_hsl(var(--border))]">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-5 h-3 overflow-hidden rounded-full bg-[hsl(var(--kid-coral)/0.2)]">
        <div
          className="h-full rounded-full bg-[hsl(var(--kid-coral))] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id || currentIndex}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <KidCard className="p-5 sm:p-6">
            <h2 className="font-heading text-[21px] font-bold leading-snug text-primary sm:text-[24px]">
              {currentQuestion.question_text}
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option, optIdx) => {
                const letters = ["A", "B", "C", "D", "E"]
                const isSelected =
                  currentQuestion.question_type === "multi_choice"
                    ? selectedMultiIds.includes(option.id)
                    : selectedOptionId === option.id

                // After checking: right answer sage, a wrong pick rose, the rest fade.
                let tone =
                  "border-border bg-card shadow-[0_4px_0_hsl(var(--border))] hover:-translate-y-0.5"
                let letterTone = "bg-secondary/70 text-muted-foreground"
                if (isAnswerChecked) {
                  if (option.is_correct) {
                    tone =
                      "border-[hsl(var(--kid-sage)/0.6)] bg-[hsl(var(--kid-sage)/0.3)] shadow-[0_4px_0_hsl(var(--kid-sage)/0.55)]"
                    letterTone = "bg-primary text-primary-foreground"
                  } else if (isSelected) {
                    tone =
                      "border-[hsl(var(--kid-rose)/0.7)] bg-[hsl(var(--kid-rose)/0.3)] shadow-[0_4px_0_hsl(var(--kid-rose)/0.6)]"
                    letterTone = "bg-[hsl(var(--kid-rose))] text-white"
                  } else {
                    tone = "border-border bg-card opacity-50"
                  }
                } else if (isSelected) {
                  tone =
                    "border-accent bg-[hsl(var(--kid-coral)/0.25)] shadow-[0_4px_0_hsl(16_48%_44%/0.7)]"
                  letterTone = "bg-accent text-accent-foreground"
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
                    className={`flex w-full min-h-[64px] items-center gap-3.5 rounded-[20px] border-[1.5px] p-3.5 text-left text-[16px] font-bold text-foreground transition-all active:translate-y-[3px] active:shadow-none ${tone}`}
                  >
                    <span
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-heading text-[16px] font-bold ${letterTone}`}
                    >
                      {letters[optIdx] || optIdx + 1}
                    </span>
                    <span className="flex-1">{option.text}</span>
                    {isAnswerChecked && (
                      <span aria-hidden className="flex-shrink-0 text-[22px]">
                        {option.is_correct ? "✅" : isSelected ? "❌" : ""}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {isAnswerChecked && currentQuestion.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 flex items-start gap-3 rounded-[18px] border-[1.5px] border-[hsl(var(--kid-saffron)/0.45)] bg-[hsl(var(--kid-saffron)/0.2)] p-3.5"
              >
                <span aria-hidden className="text-[22px] leading-none">
                  💡
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-foreground">Did you know?</p>
                  <p className="mt-0.5 text-[14px] font-semibold leading-snug text-muted-foreground">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </motion.div>
            )}
          </KidCard>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5">
        {!isAnswerChecked ? (
          <KidButton
            onClick={handleCheckAnswer}
            disabled={
              currentQuestion.question_type === "multi_choice"
                ? selectedMultiIds.length === 0
                : !selectedOptionId
            }
            className="w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            Check my answer
          </KidButton>
        ) : (
          <KidButton
            onClick={handleNextQuestion}
            disabled={isSubmitting}
            className="w-full"
            pad={
              <span className="text-[20px]">{currentIndex < totalQuestions - 1 ? "▶" : "🏆"}</span>
            }
          >
            {currentIndex < totalQuestions - 1
              ? "Next question"
              : isSubmitting
                ? "Counting your score…"
                : "Finish quest"}
          </KidButton>
        )}
      </div>
    </div>
  )
}
