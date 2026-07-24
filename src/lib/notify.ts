import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"

// Server-side notification producers. Uses the service-role key (bypasses RLS)
// to resolve recipients and insert rows — same trust model as /api/activity.

/**
 * Notify every teacher that a student signed in / out. No-op when the given
 * user isn't a student (e.g. the teacher signing out).
 */
export async function notifyTeachersOfStudentPresence(
  userId: string,
  event: "login" | "logout",
): Promise<void> {
  const admin = createSupabaseAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("student_id, username")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.student_id) return // not a student — nothing to announce

  const { data: student } = await admin
    .from("students")
    .select("name")
    .eq("id", profile.student_id)
    .maybeSingle()

  const { data: teachers } = await admin.from("profiles").select("id").eq("role", "teacher")
  const teacherIds = (teachers ?? []).map((t) => t.id as string)
  if (teacherIds.length === 0) return

  const name = student?.name || profile.username || "A student"
  const title = event === "login" ? `${name} logged in` : `${name} logged out`

  await admin.from("notifications").insert(
    teacherIds.map((recipient_id) => ({
      recipient_id,
      type: "presence",
      title,
      link: `/students/${profile.student_id}`,
      priority: "low",
    })),
  )
}
