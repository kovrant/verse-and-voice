import { NextResponse } from "next/server"

import { notifyTeachersOfStudentPresence } from "@/lib/notify"
import { isLoginDisabled } from "@/lib/student-auth"
import { createSupabaseServerClient } from "@/lib/supabase-server"

const MAX_DEVICE_LENGTH = 120

// POST /api/presence — called by the login page right after a student signs in,
// so teachers get a "student logged in" notification and student device info is recorded.
// Logout is handled in the signout route (it still has the session before clearing it).
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user && !isLoginDisabled(user.app_metadata as { login_disabled?: boolean })) {
    let device: string | undefined
    try {
      const body = (await request.json()) as { device?: string }
      if (body?.device && typeof body.device === "string") {
        const trimmed = body.device.trim().slice(0, MAX_DEVICE_LENGTH)
        if (trimmed) device = trimmed
      }
    } catch {
      // Body is optional
    }
    await notifyTeachersOfStudentPresence(user.id, "login", device)
  }
  return NextResponse.json({ ok: true })
}
