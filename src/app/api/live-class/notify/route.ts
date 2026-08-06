import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyStudentClassLive, notifyTeacherStudentJoined } from "@/lib/notify"

// POST /api/live-class/notify — teacher-only.
// Writes a durable notification for a live-class event:
//   { event: "started", student_id } → tell the student their class is live
//   { event: "joined",  student_id } → tell the hosting teacher the student joined
// Rows are inserted with the service-role key — same trust model as /api/notifications.

export async function POST(request: Request) {
  const { user, denied } = await requireTeacher()
  if (denied) return denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
  if (!studentId) return NextResponse.json({ error: "student_id is required" }, { status: 400 })

  try {
    if (body.event === "started") await notifyStudentClassLive(studentId)
    else if (body.event === "joined") await notifyTeacherStudentJoined(user.id, studentId)
    else return NextResponse.json({ error: "Unknown event" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
