import { NextResponse } from "next/server"

import { isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/student-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// POST /api/students/:id/credentials
// Teacher-only. Creates a login for the student, or resets the password /
// renames an existing login. Body: { username, password }.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const studentId = params.id

  // 1. Authenticate the caller and confirm they are a teacher.
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if ((user.app_metadata as { role?: string } | null)?.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 2. Validate input.
  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const username = typeof body.username === "string" ? normalizeUsername(body.username) : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3–30 characters: letters, digits, . _ - only." },
      { status: 400 },
    )
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 3. Confirm the student exists.
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, name")
    .eq("id", studentId)
    .maybeSingle()

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 })
  }
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 })
  }

  // 4. Reject a username already taken by a *different* student.
  const { data: usernameOwner } = await admin
    .from("profiles")
    .select("student_id")
    .eq("username", username)
    .maybeSingle()

  if (usernameOwner && usernameOwner.student_id !== studentId) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 })
  }

  const email = usernameToEmail(username)

  // 5. Does this student already have a login?
  const { data: existing } = await admin
    .from("profiles")
    .select("id, username")
    .eq("student_id", studentId)
    .maybeSingle()

  if (existing) {
    // Reset password (and rename if the username changed).
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email,
      user_metadata: { username, student_id: studentId },
    })
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
    if (username !== existing.username) {
      const { error: renameErr } = await admin
        .from("profiles")
        .update({ username })
        .eq("id", existing.id)
      if (renameErr) {
        return NextResponse.json({ error: renameErr.message }, { status: 500 })
      }
    }
    return NextResponse.json({ username, created: false })
  }

  // 6. Create a fresh student auth user + profile.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "student" },
    user_metadata: { username, student_id: studentId },
  })

  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message || "Failed to create login" },
      { status: 500 },
    )
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "student",
    student_id: studentId,
    username,
  })

  if (profileErr) {
    // Roll back the orphaned auth user so a retry can succeed cleanly.
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ username, created: true })
}

// GET /api/students/:id/credentials → { username } | { username: null }
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if ((user.app_metadata as { role?: string } | null)?.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("username")
    .eq("student_id", params.id)
    .maybeSingle()

  return NextResponse.json({ username: data?.username ?? null })
}
