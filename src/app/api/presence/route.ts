import { NextResponse } from "next/server"

import { notifyTeachersOfStudentPresence } from "@/lib/notify"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// POST /api/presence — called by the login page right after a student signs in,
// so teachers get a "student logged in" notification and student device info is recorded.
// Logout is handled in the signout route (it still has the session before clearing it).
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    let device: string | undefined
    try {
      const body = (await request.json()) as { device?: string }
      if (body?.device && typeof body.device === "string") device = body.device.trim()
    } catch {
      // Body is optional
    }
    await notifyTeachersOfStudentPresence(user.id, "login", device)
  }
  return NextResponse.json({ ok: true })
}
