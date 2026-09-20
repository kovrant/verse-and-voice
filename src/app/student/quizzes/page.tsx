"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { KidButton, KidCard, KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
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

  // Assigned quizzes that are pending (either newly assigned or re-assigned by teacher)
  const pendingAssigned = useMemo(() => {
    return assignments.filter((a) => a.status === "pending" && a.quiz)
  }, [assignments])

  // Assigned quizzes that have been completed
  const completedAssigned = useMemo(() => {
    return assignments.filter((a) => a.status === "completed" && a.quiz)
  }, [assignments])

  if (loading || studentLoading) {
    return <PageLoading variant="grid-cards" student />
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="✨"
        color="coral"
        title="Quizzes"
        subtitle="Little quests from your teacher — win badges for your trophy shelf"
        right={
          <Link
            href="/student/achievements"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-[14px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
          >
            <span aria-hidden>🏆</span> Trophy case
          </Link>
        }
      />

      {assignments.length === 0 ? (
        <KidEmpty
          title="No quests yet"
          text="When your teacher gives you a quiz, it will pop up right here. You'll get a message too!"
        />
      ) : (
        <div className="space-y-8">
          {pendingAssigned.length > 0 && (
            <section>
              <SectionTitle emoji="🎯" title="Play now" count={`${pendingAssigned.length} to do`} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingAssigned.map((assignment) => (
                  <QuestCard
                    key={assignment.id}
                    assignment={assignment}
                    best={bestAttempts.get(assignment.quiz!.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {completedAssigned.length > 0 && (
            <section>
              <SectionTitle
                emoji="🏅"
                title="Finished"
                count={`${completedAssigned.length} done`}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedAssigned.map((assignment) => (
                  <QuestCard
                    key={assignment.id}
                    assignment={assignment}
                    best={bestAttempts.get(assignment.quiz!.id)}
                    done
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ emoji, title, count }: { emoji: string; title: string; count: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden className="text-[22px] leading-none">
        {emoji}
      </span>
      <h2 className="font-heading text-[22px] font-bold text-primary">{title}</h2>
      <span className="rounded-full bg-secondary/70 px-2.5 py-0.5 text-[12.5px] font-bold text-muted-foreground">
        {count}
      </span>
    </div>
  )
}

/** One quest: coral while it's waiting to be played, saffron once it's finished. */
function QuestCard({
  assignment,
  best,
  done = false,
}: {
  assignment: QuizAssignment
  best?: QuizAttempt
  done?: boolean
}) {
  const quiz = assignment.quiz!
  const cat = CATEGORY_LABELS[quiz.category] || CATEGORY_LABELS.general
  const ageLabel = AGE_GROUP_LABELS[quiz.age_group] || "All Ages"
  const passed = !!best?.passed
  const playHref = `/student/quizzes/${quiz.id}?assignment=${assignment.id}`

  return (
    <KidCard color={done ? "saffron" : "coral"} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-card/80 px-2.5 py-1 text-[12px] font-bold text-foreground">
          {cat.label}
        </span>
        <span className="rounded-full bg-card/60 px-2.5 py-1 text-[12px] font-bold text-muted-foreground">
          {ageLabel}
        </span>
        {passed && (
          <span className="ml-auto rounded-full bg-primary px-2.5 py-1 text-[12px] font-extrabold text-primary-foreground">
            ✓ Passed
          </span>
        )}
      </div>

      <div>
        <h3 className="font-heading text-[20px] font-bold leading-tight text-primary">
          {quiz.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-muted-foreground">
          {quiz.description || "A fun challenge for you!"}
        </p>
      </div>

      {/* Badge on offer */}
      <div className="flex items-center gap-2.5 rounded-[16px] border-[1.5px] border-[hsl(var(--kid-saffron)/0.45)] bg-[hsl(var(--kid-saffron)/0.2)] px-3 py-2">
        <span aria-hidden className="text-[20px] leading-none">
          🏅
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-extrabold text-foreground">
            {quiz.badge_title}
          </p>
          <p className="text-[12px] font-semibold text-foreground/75">
            {best ? `Your best: ${best.percentage}%` : `Pass mark: ${quiz.passing_score}%`}
          </p>
        </div>
      </div>

      {done && best && (
        <p className="text-center text-[13px] font-bold text-muted-foreground">
          {best.score} of {best.total_questions} right
        </p>
      )}

      <div className="mt-auto">
        {done && passed ? (
          <KidButton href="/student/achievements" variant="soft" className="w-full">
            🏆 See my badge
          </KidButton>
        ) : (
          <KidButton
            href={playHref}
            className="w-full"
            pad={<span className="text-[20px]">▶</span>}
          >
            {best ? "Try again" : "Start quest"}
          </KidButton>
        )}
      </div>
    </KidCard>
  )
}
