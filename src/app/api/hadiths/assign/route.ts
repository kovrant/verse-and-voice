import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyStudentHadithAssigned } from "@/lib/notify"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface AssignHadithRequestBody {
  hadith_id?: string
  student_ids?: string[]
  due_date?: string | null
  notes?: string | null
}

export async function POST(request: Request) {
  const { denied, user } = await requireTeacher()
  if (denied) return denied

  let body: AssignHadithRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const hadithId = body.hadith_id?.trim()
  const targetStudentIds = Array.isArray(body.student_ids) ? body.student_ids : []
  const dueDate = body.due_date ? new Date(body.due_date).toISOString() : null
  const notes = body.notes?.trim() || null

  if (!hadithId) {
    return NextResponse.json({ error: "hadith_id is required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch Hadith info
  const { data: hadith, error: hadithError } = await admin
    .from("hadiths")
    .select("id, title")
    .eq("id", hadithId)
    .maybeSingle()

  if (hadithError || !hadith) {
    return NextResponse.json({ error: "Hadith not found" }, { status: 404 })
  }

  // 2. Fetch existing assignments for this hadith
  const { data: currentAssignments } = await admin
    .from("hadith_assignments")
    .select("id, student_id")
    .eq("hadith_id", hadithId)

  const existingMap = new Map((currentAssignments || []).map((a) => [a.student_id, a]))
  const toRemove = (currentAssignments || []).filter((a) => !targetStudentIds.includes(a.student_id))
  const newlyAdded = targetStudentIds.filter((id) => !existingMap.has(id))

  // 3. Remove deselected assignments
  if (toRemove.length > 0) {
    await admin
      .from("hadith_assignments")
      .delete()
      .in(
        "id",
        toRemove.map((a) => a.id),
      )
  }

  // 4. Insert new assignments
  if (newlyAdded.length > 0) {
    const rows = newlyAdded.map((studentId) => ({
      teacher_id: user?.id || "admin",
      hadith_id: hadithId,
      student_id: studentId,
      due_date: dueDate,
      notes: notes,
      assigned_at: new Date().toISOString(),
    }))

    const { error: insertError } = await admin.from("hadith_assignments").insert(rows)
    if (insertError) {
      console.error("Failed to insert hadith assignments:", insertError)
      return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 })
    }

    // Notify all newly assigned students
    await Promise.allSettled(
      newlyAdded.map((studentId) => notifyStudentHadithAssigned(studentId, hadith.title, hadith.id)),
    )
  }

  // 5. Update existing still-assigned rows with new due_date/notes if requested
  const preservedStudentIds = targetStudentIds.filter((id) => existingMap.has(id))
  if (preservedStudentIds.length > 0 && (dueDate || notes)) {
    const preservedIds = preservedStudentIds
      .map((sid) => existingMap.get(sid)?.id)
      .filter(Boolean) as string[]

    await admin
      .from("hadith_assignments")
      .update({
        due_date: dueDate,
        notes: notes,
      })
      .in("id", preservedIds)
  }

  return NextResponse.json({
    ok: true,
    newlyAssigned: newlyAdded.length,
    removedCount: toRemove.length,
  })
}
