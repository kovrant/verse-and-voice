import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { isLoginDisabled } from "@/lib/student-auth"

const PUBLIC_PATHS = ["/login", "/admin", "/auth"]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  // API routes enforce their own auth/role (see /api/**/route.ts), so the
  // page-level confinement redirects below must not touch them — otherwise a
  // student's fetch/sendBeacon to /api/activity gets 307-redirected to /student
  // and the request body is dropped.
  const isApi = pathname.startsWith("/api/")

  // Role lives in the JWT (app_metadata) so we branch without a DB round-trip.
  // A logged-in user with no role is the original teacher account.
  const role = (user?.app_metadata as { role?: string } | null)?.role ?? "teacher"
  const isStudent = role === "student"
  const isStudentArea = pathname === "/student" || pathname.startsWith("/student/")

  // Carry any cookies Supabase refreshed (token rotation) onto the redirect,
  // otherwise the rotated session is lost and the user gets logged out.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  const redirectPath = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ""
    return redirectTo(url)
  }

  // Teacher turned this student's sign-in off. getUser() returns the CURRENT
  // app_metadata (not the stale JWT), so this catches a lingering session that
  // the live force-signout broadcast never reached (e.g. student was offline).
  // Sign out first — that writes session-clearing cookies onto `response` via
  // setAll — then carry them onto the redirect so /login lands unauthenticated
  // (no logged-in-user-bounced-off-/login loop). API routes are exempt: they
  // enforce their own auth and a redirect would drop the request body.
  if (user && !isApi && isLoginDisabled(user.app_metadata as { login_disabled?: boolean })) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("blocked", "1")
    return redirectTo(url)
  }

  // Unauthenticated: the student login is the default entry for everything.
  // The teacher login lives at /admin and is only reached by going there directly.
  // API routes are skipped — they return their own 401 rather than an HTML redirect.
  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", pathname)
    return redirectTo(url)
  }

  // Already signed in but sitting on a login page → go to the right home.
  if (user && (pathname === "/login" || pathname === "/admin")) {
    return redirectPath(isStudent ? "/student" : "/")
  }

  // Students are confined to their portal; teachers may not roam into it.
  // (API routes are exempt — they authorize themselves.)
  if (user && isStudent && !isStudentArea && !isPublic && !isApi) {
    return redirectPath("/student")
  }
  if (user && !isStudent && isStudentArea) {
    return redirectPath("/")
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets, images, and Next internals
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
