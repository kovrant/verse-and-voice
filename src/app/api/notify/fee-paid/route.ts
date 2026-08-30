import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { notifyTeachersFeePaid } from "@/lib/notify"

export async function POST(request: Request) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: { student_id?: unknown; month?: unknown; year?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
  const month = typeof body.month === "number" ? body.month : parseInt(String(body.month), 10)
  const year = typeof body.year === "number" ? body.year : parseInt(String(body.year), 10)

  if (!studentId || month < 1 || month > 12 || year < 2000) {
    return NextResponse.json({ error: "student_id, month, and year required" }, { status: 400 })
  }

  await notifyTeachersFeePaid(studentId, month, year)
  return NextResponse.json({ ok: true })
}
