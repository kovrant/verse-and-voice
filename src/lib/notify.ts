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

async function teacherIds(admin: Admin): Promise<string[]> {
  const { data } = await admin.from("profiles").select("id").eq("role", "teacher")
  return (data ?? []).map((t) => t.id as string)
}

async function fanOutToTeachers(
  admin: Admin,
  row: { type: string; title: string; body?: string | null; link?: string | null; priority?: string },
): Promise<void> {
  const ids = await teacherIds(admin)
  if (ids.length === 0) return
  await admin.from("notifications").insert(
    ids.map((recipient_id) => ({
      recipient_id,
      type: row.type,
      title: row.title,
      body: row.body ?? null,
      link: row.link ?? null,
      priority: row.priority ?? "normal",
    })),
  )
}

async function studentName(admin: Admin, studentId: string): Promise<string | null> {
  const { data } = await admin.from("students").select("name").eq("id", studentId).maybeSingle()
  return data?.name ?? null
}

/**
 * Notify every teacher that a student signed in / out. No-op when the given
 * user isn't a student (e.g. the teacher signing out).
 */
export async function notifyTeachersOfStudentPresence(
  userId: string,
  event: "login" | "logout",
  device?: string,
): Promise<void> {
  const admin = createSupabaseAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("student_id, username")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.student_id) return // not a student — nothing to announce

  if (event === "login" && device) {
    try {
      await admin
        .from("students")
        .update({ last_device: device, last_device_at: new Date().toISOString() })
        .eq("id", profile.student_id)
    } catch {
      // Best-effort device record
    }
  }

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

  await fanOutToTeachers(admin, { type: "presence", title, link, priority: "low" })
}

/** All teachers — a student paid a monthly fee. */
export async function notifyTeachersFeePaid(
  studentId: string,
  month: number,
  year: number,
): Promise<void> {
  const admin = createSupabaseAdminClient()
  const name = (await studentName(admin, studentId)) || "A student"
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })
  const title = `${name} paid ${monthLabel} fee`
  const link = `/students/${studentId}`

  const ids = await teacherIds(admin)
  for (const recipientId of ids) {
    if (await alreadyNotified(admin, recipientId, "fee_paid", title)) continue
    await admin.from("notifications").insert({
      recipient_id: recipientId,
      type: "fee_paid",
      title,
      link,
      priority: "normal",
    })
  }
}

/** All teachers — a student earned a badge / milestone. */
export async function notifyTeachersAchievement(
  studentId: string,
  achievementTitle: string,
): Promise<void> {
  const admin = createSupabaseAdminClient()
  const name = (await studentName(admin, studentId)) || "A student"
  const title = `${name} earned ${achievementTitle}`
  const link = `/students/${studentId}`

  const ids = await teacherIds(admin)
  for (const recipientId of ids) {
    if (await alreadyNotified(admin, recipientId, "achievement", title)) continue
    await admin.from("notifications").insert({
      recipient_id: recipientId,
      type: "achievement",
      title,
      link,
      priority: "normal",
    })
  }
}

/** All teachers — a live class session was saved. */
export async function notifyTeachersSessionEnded(
  studentId: string,
  durationMinutes: number,
  endingPara: number | null,
): Promise<void> {
  const admin = createSupabaseAdminClient()
  const name = (await studentName(admin, studentId)) || "A student"
  const paraBit = endingPara != null ? ` · ended on Para ${endingPara}` : ""
  const title = `Class with ${name} · ${durationMinutes} min${paraBit}`
  const link = `/students/${studentId}`

  const ids = await teacherIds(admin)
  for (const recipientId of ids) {
    if (await alreadyNotified(admin, recipientId, "session", title)) continue
    await admin.from("notifications").insert({
      recipient_id: recipientId,
      type: "session",
      title,
      link,
      priority: "low",
    })
  }
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
