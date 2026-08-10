import "server-only"

import { dedupeCutoffIso } from "@/lib/notifications"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

// Server-side notification producers. Uses the service-role key (bypasses RLS)
// to resolve recipients and insert rows — same trust model as /api/activity.
//
// Every producer here is triggered by something that can fire more than once
// for a single real-world event: a component mount (React StrictMode double
// mounts, back-navigation and HMR all remount), a login redirect (repeated per
// tab/device), or a client retry. So each one suppresses an identical row
// inside DEDUPE_WINDOW_MINUTES. The client-side guards are an optimisation to
// skip the round-trip; this is the check that actually holds.

type Admin = ReturnType<typeof createSupabaseAdminClient>

/**
 * True when this exact notification already reached this recipient inside the
 * dedupe window.
 *
 * ponytail: check-then-insert, so two genuinely concurrent requests can both
 * pass the check and insert. Harmless here (a rare duplicate row), and the
 * upgrade path is a unique index on (recipient_id, type, title, time bucket).
 */
async function alreadyNotified(
  admin: Admin,
  recipientId: string,
  type: string,
  title: string,
): Promise<boolean> {
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .eq("type", type)
    .eq("title", title)
    .gte("created_at", dedupeCutoffIso())
  return (count ?? 0) > 0
}

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

  const name = student?.name || profile.username || "A student"
  const title = event === "login" ? `${name} logged in` : `${name} logged out`
  const link = `/students/${profile.student_id}`

  // Presence rows fan out to every teacher at once, so the newest one for this
  // student is the state they all last saw. Re-announcing that same state
  // inside the window is a duplicate trigger rather than a real transition —
  // a genuine login → logout → login still lands, because the title changes.
  const { data: last } = await admin
    .from("notifications")
    .select("title")
    .eq("type", "presence")
    .eq("link", link)
    .gte("created_at", dedupeCutoffIso())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (last?.title === title) return

  const { data: teachers } = await admin.from("profiles").select("id").eq("role", "teacher")
  const teacherIds = (teachers ?? []).map((t) => t.id as string)
  if (teacherIds.length === 0) return

  await admin.from("notifications").insert(
    teacherIds.map((recipient_id) => ({
      recipient_id,
      type: "presence",
      title,
      link,
      priority: "low",
    })),
  )
}

/**
 * Notify a student that their teacher just started the live class. No-op if the
 * student has no portal account yet, or if we already told them recently.
 */
export async function notifyStudentClassLive(studentId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("student_id", studentId)
    .maybeSingle()
  if (!profile?.id) return

  const title = "Your class is live"
  if (await alreadyNotified(admin, profile.id as string, "live_class", title)) return

  await admin.from("notifications").insert({
    recipient_id: profile.id,
    type: "live_class",
    title,
    body: "Your teacher started the class. Tap to join.",
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
  if (!student) return // unknown student — don't mint a nameless notification

  const title = `${student.name || "The student"} joined the class`
  if (await alreadyNotified(admin, teacherUserId, "live_class", title)) return

  await admin.from("notifications").insert({
    recipient_id: teacherUserId,
    type: "live_class",
    title,
    link: `/students/${studentId}`,
    priority: "normal",
    created_by: teacherUserId,
  })
}
