import { NextResponse } from "next/server"

import { requireTeacher } from "@/lib/api-auth"
import { isLoginDisabled } from "@/lib/student-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

// Find the student's auth user id (= profiles.id) from their student_id.
async function findAuthUserId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  studentId: string,
) {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("student_id", studentId)
    .maybeSingle()
  return data?.id ?? null
}

// GET /api/students/:id/access → { disabled, hasLogin }
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  const admin = createSupabaseAdminClient()
  const authUserId = await findAuthUserId(admin, params.id)
  if (!authUserId) return NextResponse.json({ hasLogin: false, disabled: false })

  const { data, error } = await admin.auth.admin.getUserById(authUserId)
  if (error || !data?.user) {
    return NextResponse.json({ error: error?.message || "User not found" }, { status: 500 })
  }

  return NextResponse.json({
    hasLogin: true,
    disabled: isLoginDisabled(data.user.app_metadata as { login_disabled?: boolean }),
  })
}

// POST /api/students/:id/access  body { disabled: boolean } → { disabled }
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { denied } = await requireTeacher()
  if (denied) return denied

  let body: { disabled?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const disabled = body.disabled === true

  const admin = createSupabaseAdminClient()
  const authUserId = await findAuthUserId(admin, params.id)
  if (!authUserId) {
    return NextResponse.json({ error: "Student has no login yet" }, { status: 404 })
  }

  // Merge with existing app_metadata so we never drop `role`.
  const { data: current, error: readErr } = await admin.auth.admin.getUserById(authUserId)
  if (readErr || !current?.user) {
    return NextResponse.json({ error: readErr?.message || "User not found" }, { status: 500 })
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, {
    app_metadata: { ...current.user.app_metadata, login_disabled: disabled },
  })
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ disabled })
}
