import { NextResponse } from "next/server"

import { notifyTeachersOfStudentPresence } from "@/lib/notify"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// POST /api/presence — called by the login page right after a student signs in,
// so teachers get a "student logged in" notification. Logout is handled in the
// signout route (it still has the session before clearing it).
export async function POST() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) await notifyTeachersOfStudentPresence(user.id, "login")
  return NextResponse.json({ ok: true })
}
