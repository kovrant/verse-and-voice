import { NextResponse } from "next/server"

import { requireStudentOrTeacher } from "@/lib/api-auth"
import type { Quiz, QuizQuestion } from "@/lib/quizzes/types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface AutoAssignRequestBody {
  quiz_id?: string
  student_id?: string
}

export async function POST(request: Request) {
  let body: AutoAssignRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const quizId = body.quiz_id?.trim()
  const studentId = body.student_id?.trim()

  if (!quizId || !studentId) {
    return NextResponse.json(
      { error: "quiz_id and student_id are required" },
      { status: 400 },
    )
  }

  const { denied } = await requireStudentOrTeacher(studentId)
  if (denied) return denied

  const admin = createSupabaseAdminClient()

  // 1. Fetch the quiz
  const { data: quizData, error: quizError } = await admin
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .maybeSingle()

  if (quizError || !quizData) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  }

  const quiz = quizData as Quiz

  // If the quiz is marked as draft, check if it belongs to a published Islamic History story
  if (quiz.is_published === false) {
    const { data: linkedStory } = await admin
      .from("islamic_history")
      .select("id, title, is_published")
      .eq("quiz_id", quizId)
      .maybeSingle()

    // If the story exists and is published, auto-heal & publish the quiz!
    if (linkedStory && linkedStory.is_published) {
      await admin.from("quizzes").update({ is_published: true }).eq("id", quizId)
      quiz.is_published = true
    } else if (linkedStory) {
      // If it belongs to a story that the teacher made available
      await admin.from("quizzes").update({ is_published: true }).eq("id", quizId)
      quiz.is_published = true
    } else {
      return NextResponse.json({ error: "Quiz is not published" }, { status: 403 })
    }
  }

  // 2. Check if this student is already assigned to this quiz
  const { data: existing, error: findError } = await admin
    .from("quiz_assignments")
    .select("id, status")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .maybeSingle()

  if (findError) {
    console.error("Error looking up quiz assignment:", findError)
    return NextResponse.json({ error: "Database lookup failed" }, { status: 500 })
  }

  let assignmentId: string
  let assignmentStatus = "pending"
  let alreadyAssigned = false

  if (existing) {
    assignmentId = existing.id
    assignmentStatus = existing.status
    alreadyAssigned = true
  } else {
    // 3. Create the assignment for this student
    const now = new Date().toISOString()
    const { data: created, error: createError } = await admin
      .from("quiz_assignments")
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        status: "pending",
        assigned_at: now,
      })
      .select("id, status")
      .single()

    if (createError || !created) {
      console.error("Error auto-assigning quiz:", createError)
      return NextResponse.json({ error: "Failed to auto-assign quiz" }, { status: 500 })
    }

    assignmentId = created.id
    assignmentStatus = created.status
    alreadyAssigned = false
  }

  // 4. Also fetch questions so the caller receives the full quiz payload
  const { data: questionsData } = await admin
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })

  const questions = (questionsData as QuizQuestion[]) || []

  return NextResponse.json({
    ok: true,
    assignment_id: assignmentId,
    status: assignmentStatus,
    already_assigned: alreadyAssigned,
    quiz,
    questions,
  })
}
