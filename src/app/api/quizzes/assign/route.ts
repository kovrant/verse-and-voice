import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyStudentQuizAssigned } from "@/lib/notify"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface AssignRequestBody {
  quiz_id?: string
  student_ids?: string[]
  due_date?: string | null
  reassign?: boolean
}

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: AssignRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const quizId = body.quiz_id?.trim()
  const targetStudentIds = Array.isArray(body.student_ids) ? body.student_ids : []
  const dueDate = body.due_date ? new Date(body.due_date).toISOString() : null
  const isExplicitReassign = !!body.reassign

  if (!quizId) {
    return NextResponse.json({ error: "quiz_id is required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch quiz info
  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select("id, title")
    .eq("id", quizId)
    .maybeSingle()

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  }

  // 2. Fetch existing assignments for this quiz
  const { data: currentAssignments } = await admin
    .from("quiz_assignments")
    .select("id, student_id, status")
    .eq("quiz_id", quizId)

  const existingMap = new Map((currentAssignments || []).map((a) => [a.student_id, a]))

  if (isExplicitReassign) {
    // Single or targeted re-assignment: reset status to pending and notify
    for (const studentId of targetStudentIds) {
      const existing = existingMap.get(studentId)
      if (existing) {
        await admin
          .from("quiz_assignments")
          .update({
            status: "pending",
            assigned_at: new Date().toISOString(),
            due_date: dueDate,
          })
          .eq("id", existing.id)
      } else {
        await admin.from("quiz_assignments").insert({
          quiz_id: quizId,
          student_id: studentId,
          status: "pending",
          due_date: dueDate,
          assigned_at: new Date().toISOString(),
        })
      }

      await notifyStudentQuizAssigned(studentId, quiz.title, quiz.id, true)
    }

    return NextResponse.json({ ok: true, reassigned: targetStudentIds.length })
  }

  const toRemove = (currentAssignments || []).filter((a) => !targetStudentIds.includes(a.student_id))
  const newlyAdded = targetStudentIds.filter((id) => !existingMap.has(id))
  const toReactivate = (currentAssignments || []).filter(
    (a) => targetStudentIds.includes(a.student_id) && a.status === "completed",
  )

  // 3. Remove deselected assignments
  if (toRemove.length > 0) {
    await admin
      .from("quiz_assignments")
      .delete()
      .in(
        "id",
        toRemove.map((a) => a.id),
      )
  }

  // 4. Reactivate completed assignments back to pending if re-selected by teacher
  if (toReactivate.length > 0) {
    await admin
      .from("quiz_assignments")
      .update({
        status: "pending",
        assigned_at: new Date().toISOString(),
        due_date: dueDate,
      })
      .in(
        "id",
        toReactivate.map((a) => a.id),
      )

    await Promise.allSettled(
      toReactivate.map((a) => notifyStudentQuizAssigned(a.student_id, quiz.title, quiz.id, true)),
    )
  }

  // 5. Insert new assignments
  if (newlyAdded.length > 0) {
    const rows = newlyAdded.map((studentId) => ({
      quiz_id: quizId,
      student_id: studentId,
      status: "pending",
      due_date: dueDate,
      assigned_at: new Date().toISOString(),
    }))

    const { error: insertError } = await admin.from("quiz_assignments").insert(rows)
    if (insertError) {
      console.error("Failed to insert quiz assignments:", insertError)
      return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 })
    }

    // Notify all newly assigned students
    await Promise.allSettled(
      newlyAdded.map((studentId) => notifyStudentQuizAssigned(studentId, quiz.title, quiz.id)),
    )
  }

  return NextResponse.json({
    ok: true,
    newlyAssigned: newlyAdded.length,
    reactivatedCount: toReactivate.length,
    removedCount: toRemove.length,
  })
}

