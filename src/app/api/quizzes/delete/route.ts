import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface DeleteQuizRequestBody {
  quiz_id?: string
}

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: DeleteQuizRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const quizId = body.quiz_id?.trim()
  if (!quizId) {
    return NextResponse.json({ error: "quiz_id is required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch the quiz to inspect publish status
  const { data: quiz, error: fetchError } = await admin
    .from("quizzes")
    .select("id, title, is_published")
    .eq("id", quizId)
    .maybeSingle()

  if (fetchError || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  }

  // 2. Strict Rule: Published quizzes cannot be deleted. First they have to unpublish and then delete.
  if (quiz.is_published) {
    return NextResponse.json(
      {
        error:
          "Published quizzes cannot be deleted. Please unpublish the quiz first before deleting.",
        is_published: true,
      },
      { status: 400 },
    )
  }

  // 3. Clear linked quiz_id from any stories in islamic_history
  try {
    await admin
      .from("islamic_history")
      .update({ quiz_id: null })
      .eq("quiz_id", quizId)
  } catch (unlinkErr) {
    console.warn("Failed to unlink quiz from islamic_history:", unlinkErr)
  }

  // 4. Delete the quiz (quiz_questions, assignments, and attempts cascade delete)
  const { error: deleteError } = await admin
    .from("quizzes")
    .delete()
    .eq("id", quizId)

  if (deleteError) {
    console.error("Failed to delete quiz:", deleteError)
    return NextResponse.json(
      { error: deleteError.message || "Failed to delete quiz" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    message: `Quiz "${quiz.title}" deleted successfully.`,
  })
}
