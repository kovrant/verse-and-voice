import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Where each portal's sign-out should land. Passed explicitly via ?next= so we
// don't depend on reading the (about-to-be-cleared) session's role here.
const ALLOWED_NEXT = new Set(["/login", "/admin"])

export async function POST(request: Request) {
  const url = new URL(request.url)
  const requested = url.searchParams.get("next") || "/login"
  const next = ALLOWED_NEXT.has(requested) ? requested : "/login"

  // Build the redirect response FIRST, then let the Supabase client write the
  // session-clearing cookies onto THIS response. A fresh NextResponse.redirect
  // created after signOut() would not carry those cookie mutations, leaving the
  // user still logged in.
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 })

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signOut()

  return response
}
