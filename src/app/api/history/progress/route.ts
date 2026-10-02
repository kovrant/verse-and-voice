import { NextResponse } from "next/server"

import { requireStudentOrTeacher } from "@/lib/api-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  let body: {
    student_id?: string
    story_id?: string
    reflection_pledged?: boolean
  } = {}

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = body.student_id?.trim()
  const storyId = body.story_id?.trim()
  const reflectionPledged = body.reflection_pledged ?? true

  if (!studentId || !storyId) {
    return NextResponse.json(
      { error: "student_id and story_id are required" },
      { status: 400 },
    )
  }

  const { denied } = await requireStudentOrTeacher(studentId)
  if (denied) return denied

  const admin = createSupabaseAdminClient()

  try {
    const { data, error } = await admin
      .from("student_story_progress")
      .upsert(
        {
          student_id: studentId,
          story_id: storyId,
          completed_at: new Date().toISOString(),
          reflection_pledged: reflectionPledged,
        },
        { onConflict: "student_id,story_id" },
      )
      .select()
      .single()

    if (error) {
      console.warn("Failed to upsert story progress:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, progress: data })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
