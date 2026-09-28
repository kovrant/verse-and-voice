import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyStudentHadithAssigned } from "@/lib/notify"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface AssignHadithRequestBody {
  hadith_id?: string
  student_ids?: string[]
  due_date?: string | null
  append?: boolean
}

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: AssignHadithRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const hadithId = body.hadith_id?.trim()
  const targetStudentIds = Array.isArray(body.student_ids) ? body.student_ids : []
  const isAppend = Boolean(body.append)
  let dueDate: string | null = null
  if (body.due_date) {
    const parsed = Date.parse(body.due_date)
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Invalid due_date" }, { status: 400 })
    }
    dueDate = new Date(parsed).toISOString()
  }

  if (!hadithId) {
    return NextResponse.json({ error: "hadith_id is required" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Fetch Hadith info and existing assignments in parallel
  const [{ data: hadith, error: hadithError }, { data: currentAssignments }] = await Promise.all([
    admin.from("hadiths").select("id, hadith_number, english_text").eq("id", hadithId).maybeSingle(),
    admin.from("hadith_assignments").select("id, student_id").eq("hadith_id", hadithId),
  ])

  if (hadithError || !hadith) {
    return NextResponse.json({ error: "Hadith not found" }, { status: 404 })
  }

  const hadithTitle = `Hadith #${hadith.hadith_number}: ${hadith.english_text?.slice(0, 30)}...`

  const existingMap = new Map((currentAssignments || []).map((a) => [a.student_id, a]))
  const toRemove = isAppend
    ? []
    : (currentAssignments || []).filter((a) => !targetStudentIds.includes(a.student_id))
  const newlyAdded = targetStudentIds.filter((id) => !existingMap.has(id))

  // 3. Remove deselected assignments (unless in append mode)
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
      hadith_id: hadithId,
      student_id: studentId,
      status: "pending",
      due_date: dueDate,
      assigned_at: new Date().toISOString(),
    }))

    const { error: insertError } = await admin.from("hadith_assignments").insert(rows)
    if (insertError) {
      console.error("Failed to insert hadith assignments:", insertError)
      return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 })
    }

    // Notify all newly assigned students
    await Promise.allSettled(
      newlyAdded.map((studentId) => notifyStudentHadithAssigned(studentId, hadithTitle, hadith.id)),
    )
  }

  // 5. Update existing still-assigned rows with new due_date if requested
  const preservedStudentIds = targetStudentIds.filter((id) => existingMap.has(id))
  if (preservedStudentIds.length > 0 && dueDate) {
    const preservedIds = preservedStudentIds
      .map((sid) => existingMap.get(sid)?.id)
      .filter(Boolean) as string[]

    await admin
      .from("hadith_assignments")
      .update({
        due_date: dueDate,
      })
      .in("id", preservedIds)
  }

  return NextResponse.json({
    ok: true,
    newlyAssigned: newlyAdded.length,
    removedCount: toRemove.length,
  })
}
