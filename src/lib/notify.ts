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

/**
 * Notify a student that their teacher just started the live class. No-op if the
 * student has no portal account yet.
 */
export async function notifyStudentClassLive(studentId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("student_id", studentId)
    .maybeSingle()
  if (!profile?.id) return

  await admin.from("notifications").insert({
    recipient_id: profile.id,
    type: "live_class",
    title: "Your class is live",
    body: "Your teacher started the class — tap to join.",
    link: "/student/classes",
    priority: "high",
  })
}

/**
 * Notify the hosting teacher that the student has joined the live class. Targets
 * the calling teacher directly (reliable even for the original no-profile admin).
 */
export async function notifyTeacherStudentJoined(
  teacherUserId: string,
  studentId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { data: student } = await admin
    .from("students")
    .select("name")
    .eq("id", studentId)
    .maybeSingle()

  await admin.from("notifications").insert({
    recipient_id: teacherUserId,
    type: "live_class",
    title: `${student?.name || "The student"} joined the class`,
    link: `/students/${studentId}`,
    priority: "normal",
    created_by: teacherUserId,
  })
}
