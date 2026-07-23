import { NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// POST /api/activity
// Batch-ingest student activity events. The caller is identified from the
// session cookie, and student_id is resolved server-side from `profiles` — the
// client never sends it, so events can't be attributed to another student.
//
// Body: { events: ActivityEvent[] }
// Called both via fetch(keepalive) and navigator.sendBeacon (unload).

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "link_click",
  "click",
  "para_open",
  "pdf_page",
])

const MAX_EVENTS_PER_BATCH = 100

interface IncomingEvent {
  event_type?: unknown
  path?: unknown
  label?: unknown
  href?: unknown
  meta?: unknown
  occurred_at?: unknown
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export async function POST(request: Request) {
  // 1. Identify the caller. sendBeacon/keepalive carry the session cookie.
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Silently accept-and-drop when there's no session; logging is best-effort
  // and we don't want unload beacons throwing visible errors.
  if (!user) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  // 2. Parse the batch.
  let body: { events?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const rawEvents = Array.isArray(body.events) ? body.events : []
  if (rawEvents.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  // 3. Resolve the student this session belongs to. Non-students (teacher)
  //    produce no student_id, so we simply skip — the portal logger only runs
  //    for students anyway.
  const admin = createSupabaseAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("student_id")
    .eq("id", user.id)
    .maybeSingle()

  const studentId = profile?.student_id ?? null
  if (!studentId) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  // 4. Sanitize + shape rows.
  const rows = (rawEvents as IncomingEvent[])
    .slice(0, MAX_EVENTS_PER_BATCH)
    .map((e) => {
      const eventType = typeof e.event_type === "string" ? e.event_type : ""
      if (!ALLOWED_EVENT_TYPES.has(eventType)) return null

      const occurred =
        typeof e.occurred_at === "string" && !Number.isNaN(Date.parse(e.occurred_at))
          ? e.occurred_at
          : new Date().toISOString()

      const meta =
        e.meta && typeof e.meta === "object" && !Array.isArray(e.meta)
          ? (e.meta as Record<string, unknown>)
          : {}

      return {
        student_id: studentId,
        user_id: user.id,
        event_type: eventType,
        path: str(e.path, 512),
        label: str(e.label, 200),
        href: str(e.href, 512),
        meta,
        occurred_at: occurred,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  const { error } = await admin.from("activity_logs").insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, inserted: rows.length })
}
