import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyTeachersAchievement } from "@/lib/notify"

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: { student_id?: unknown; title?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""

  if (!studentId || !title) {
    return NextResponse.json({ error: "student_id and title required" }, { status: 400 })
  }

  await notifyTeachersAchievement(studentId, title)
  return NextResponse.json({ ok: true })
}
