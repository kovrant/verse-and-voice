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
  let dueDate: string | null = null
  if (body.due_date) {
    const parsed = Date.parse(body.due_date)
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Invalid due_date" }, { status: 400 })
    }
    dueDate = new Date(parsed).toISOString()
  }
  const isExplicitReassign = !!body.reassign

  if (!quizId) {
    return NextResponse.json({ error: "quiz_id is required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch quiz info and existing assignments in parallel
  const [{ data: quiz, error: quizError }, { data: currentAssignments }] = await Promise.all([
    admin.from("quizzes").select("id, title").eq("id", quizId).maybeSingle(),
    admin.from("quiz_assignments").select("id, student_id, status").eq("quiz_id", quizId),
  ])

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  }

  const existingMap = new Map((currentAssignments || []).map((a) => [a.student_id, a]))

  if (isExplicitReassign) {
    // Batch re-assignment: reset existing to pending, insert missing, and notify in parallel
    const now = new Date().toISOString()
    const existingIdsToReset: string[] = []
    const newRowsToInsert: Array<{
      quiz_id: string
      student_id: string
      status: string
      due_date: string | null
      assigned_at: string
    }> = []

    for (const studentId of targetStudentIds) {
      const existing = existingMap.get(studentId)
      if (existing) {
        existingIdsToReset.push(existing.id)
      } else {
        newRowsToInsert.push({
          quiz_id: quizId,
          student_id: studentId,
          status: "pending",
          due_date: dueDate,
          assigned_at: now,
        })
      }
    }

    await Promise.all([
      existingIdsToReset.length > 0
        ? admin
            .from("quiz_assignments")
            .update({ status: "pending", assigned_at: now, due_date: dueDate })
            .in("id", existingIdsToReset)
        : Promise.resolve(),
      newRowsToInsert.length > 0
        ? admin.from("quiz_assignments").insert(newRowsToInsert)
        : Promise.resolve(),
    ])

    await Promise.allSettled(
      targetStudentIds.map((studentId) =>
        notifyStudentQuizAssigned(studentId, quiz.title, quiz.id, true),
      ),
    )

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

