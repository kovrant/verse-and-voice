import { NextResponse } from "next/server"

import { awardAchievement } from "@/lib/achievements/award"
import { gradeQuizAttempt } from "@/lib/quizzes/quiz-engine"
import type { Quiz, QuizQuestion } from "@/lib/quizzes/types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  let body: {
    student_id?: string
    quiz_id?: string
    assignment_id?: string | null
    answers?: Record<string, string | string[]>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = body.student_id?.trim()
  const quizId = body.quiz_id?.trim()
  const assignmentId = body.assignment_id?.trim() || null
  const answers = body.answers || {}

  if (!studentId || !quizId) {
    return NextResponse.json({ error: "student_id and quiz_id are required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch quiz and questions
  const [quizRes, questionsRes] = await Promise.all([
    admin.from("quizzes").select("*").eq("id", quizId).maybeSingle(),
    admin.from("quiz_questions").select("*").eq("quiz_id", quizId).order("order_index"),
  ])

  if (quizRes.error || !quizRes.data) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  }

  const quiz = quizRes.data as Quiz
  const questions = (questionsRes.data as QuizQuestion[]) || []

  // 2. Grade attempt
  const gradeResult = gradeQuizAttempt(questions, answers, quiz.passing_score || 80)

  // 3. Record attempt
  const { data: attempt, error: attemptError } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: quiz.id,
      student_id: studentId,
      assignment_id: assignmentId,
      score: gradeResult.score,
      total_questions: gradeResult.totalQuestions,
      percentage: gradeResult.percentage,
      passed: gradeResult.passed,
      answers,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle()

  if (attemptError) {
    console.error("Failed to record quiz attempt:", attemptError)
  }

  let badgeAwarded = false

  // 4. Mark assignment as completed
  if (assignmentId) {
    await admin
      .from("quiz_assignments")
      .update({ status: "completed" })
      .eq("id", assignmentId)
      .eq("student_id", studentId)
  } else {
    await admin
      .from("quiz_assignments")
      .update({ status: "completed" })
      .eq("quiz_id", quizId)
      .eq("student_id", studentId)
  }

  // 5. If passed, award badge
  if (gradeResult.passed) {
    const awardRes = await awardAchievement(admin, studentId, quiz.badge_slug, "quiz", {
      slug: quiz.badge_slug,
      title: quiz.badge_title,
      description: quiz.badge_description || `Completed ${quiz.title}`,
      domain: "quiz",
      kind: "badge",
      issuesCertificate: false,
    })

    badgeAwarded = awardRes.awarded
  }

  return NextResponse.json({
    success: true,
    attemptId: attempt?.id,
    gradeResult,
    badgeAwarded,
    badgeTitle: quiz.badge_title,
  })
}
