import { NextResponse } from "next/server"

import { requireStudentOrTeacher } from "@/lib/api-auth"
import type { Quiz } from "@/lib/quizzes/types"
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

  // 1. Fetch the quiz to ensure it exists and is published
  const { data: quizData, error: quizError } = await admin
    .from("quizzes")
    .select("id, title, is_published")
    .eq("id", quizId)
    .maybeSingle()

  if (quizError || !quizData) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  }

  const quiz = quizData as Quiz
  if (quiz.is_published === false) {
    return NextResponse.json({ error: "Quiz is not published" }, { status: 403 })
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

  if (existing) {
    return NextResponse.json({
      ok: true,
      assignment_id: existing.id,
      status: existing.status,
      already_assigned: true,
    })
  }

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

  return NextResponse.json({
    ok: true,
    assignment_id: created.id,
    status: created.status,
    already_assigned: false,
  })
}
