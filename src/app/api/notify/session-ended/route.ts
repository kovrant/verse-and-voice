import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyTeachersSessionEnded } from "@/lib/notify"

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: { student_id?: unknown; duration_minutes?: unknown; ending_para?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
  const durationMinutes =
    typeof body.duration_minutes === "number"
      ? body.duration_minutes
      : parseInt(String(body.duration_minutes), 10)
  const endingPara =
    body.ending_para == null
      ? null
      : typeof body.ending_para === "number"
        ? body.ending_para
        : parseInt(String(body.ending_para), 10)

  if (!studentId || !Number.isFinite(durationMinutes) || durationMinutes < 0) {
    return NextResponse.json({ error: "student_id and duration_minutes required" }, { status: 400 })
  }

  await notifyTeachersSessionEnded(
    studentId,
    durationMinutes,
    endingPara != null && Number.isFinite(endingPara) ? endingPara : null,
  )
  return NextResponse.json({ ok: true })
}
