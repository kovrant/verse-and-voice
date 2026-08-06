import "server-only"

import type { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { isTeacherRole } from "@/lib/student-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// The single teacher-only guard for /api routes. It used to be copy-pasted into
// every route, and the copies drifted into two variants: some compared
// app_metadata.role, others looked up profiles.role and defaulted a missing row
// to "teacher" — which handed teacher powers to any authenticated account that
// had no profile row.

/** Resolves the role signals in isTeacherRole, hitting the DB only if needed. */
async function isTeacher(user: User): Promise<boolean> {
  const jwtRole = (user.app_metadata as { role?: string } | null)?.role
  if (jwtRole) return isTeacherRole(jwtRole, null)

  // No role on the JWT. Only accounts predating the metadata mirroring land
  // here, so pay for the lookup rather than guessing.
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle()
  return isTeacherRole(null, data?.role as string | undefined)
}

/**
 * Authenticate the caller and require the teacher role.
 *
 * Returns the user on success, or `denied` — a ready-to-return 401/403 that the
 * route should hand straight back:
 *
 *   const { user, denied } = await requireTeacher()
 *   if (denied) return denied
 */
export async function requireTeacher(): Promise<
  { user: User; denied?: undefined } | { user?: undefined; denied: NextResponse }
> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { denied: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  if (!(await isTeacher(user))) {
    return { denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user }
}
