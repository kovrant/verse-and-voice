import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()

  // Read the role before signing out so we can return the user to the right login.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isStudent =
    (user?.app_metadata as { role?: string } | null)?.role === "student"

  await supabase.auth.signOut()

  const dest = isStudent ? "/login" : "/admin"
  return NextResponse.redirect(new URL(dest, request.url), { status: 303 })
}
