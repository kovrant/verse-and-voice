import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

// POST /api/notifications — teacher-only.
// Composes a notification and fans it out to one student or every student.
// Recipients are resolved server-side from `profiles`; rows are inserted with
// the service-role key (bypassing RLS) — same trust model as /api/activity.
//
// Body: { target: "all" | "student", student_id?, title, body?, priority? }

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export async function POST(request: Request) {
  const { user, denied } = await requireTeacher()
  if (denied) return denied

  const admin = createSupabaseAdminClient()

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const title = str(body.title, 200)
  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 })

  const message = str(body.body, 2000)
  const priority =
    body.priority === "low" || body.priority === "high" ? body.priority : "normal"

  // Resolve recipient auth-user ids.
  let ids: string[] = []
  if (body.target === "all") {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "student")
      .not("student_id", "is", null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    ids = (data ?? []).map((r) => r.id as string)
  } else {
    const studentId = str(body.student_id, 64)
    if (!studentId) return NextResponse.json({ error: "student_id is required" }, { status: 400 })
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("student_id", studentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data)
      return NextResponse.json(
        { error: "That student doesn't have a portal account yet." },
        { status: 400 },
      )
    ids = [data.id as string]
  }

  if (ids.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const { error } = await admin.from("notifications").insert(
    ids.map((recipient_id) => ({
      recipient_id,
      type: "announcement",
      title,
      body: message,
      priority,
      created_by: user.id,
    })),
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, sent: ids.length })
}
