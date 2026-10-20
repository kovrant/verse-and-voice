import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { isLoginDisabled } from "@/lib/student-auth"

const PUBLIC_PATHS = ["/login", "/teacher/login", "/auth", "/welcome", "/faq", "/privacy", "/terms"]
const TEACHER_HOME = "/teacher"
/** Pre-/teacher addresses of the dashboard pages, still in bookmarks and old notifications. */
const LEGACY_TEACHER_PATH =
  /^\/(students|class|hadiths|memorization|quran|qaida|namaz|history|quizzes|fees|media|ai-usage|notifications)(\/|$)/

/** Drop Supabase auth cookies without a network signOut — middleware must stay local. */
function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest) {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-")) response.cookies.delete(name)
  }
}

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

  // getSession() reads the JWT from cookies — no round-trip to Supabase Auth.
  // getUser() validates remotely on EVERY request and caused MIDDLEWARE_INVOCATION_TIMEOUT
  // (504) on Vercel during live classes when Auth was slow. RLS + API routes still
  // enforce security; this gate only routes pages by role.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

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

  // Teacher turned sign-in off — flag is on the JWT (app_metadata.login_disabled).
  // Clear cookies locally and send to /login; disabling also revokes sessions
  // server-side via /api/students/:id/access so the JWT can't linger.
  if (user && !isApi && isLoginDisabled(user.app_metadata as { login_disabled?: boolean })) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("blocked", "1")
    const redirect = NextResponse.redirect(url)
    clearSupabaseAuthCookies(redirect, request)
    return redirect
  }

  // Old addresses keep working: /admin was the teacher login and the dashboard
  // pages used to live at the root (/students/123 …). Redirect, query intact.
  if (pathname === "/admin" || LEGACY_TEACHER_PATH.test(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === "/admin" ? "/teacher/login" : TEACHER_HOME + pathname
    return redirectTo(url)
  }

  // The front door: "/" is the public website for everyone except a signed-in
  // student, who is sent to their portal below. A rewrite, not a redirect, so
  // the address stays the bare domain. The shell and palette key off the
  // rendered route segment ("welcome"), not the URL, so this works on full
  // loads and on client-side navigations alike.
  if (pathname === "/" && !(user && isStudent)) {
    const url = request.nextUrl.clone()
    url.pathname = "/welcome"
    const rewrite = NextResponse.rewrite(url)
    response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie))
    return rewrite
  }

  // Unauthenticated elsewhere: each portal has its own door. Teacher pages go to
  // the teacher login, everything else to the kids' login.
  // API routes are skipped — they return their own 401 rather than an HTML redirect.
  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone()
    url.pathname =
      pathname === TEACHER_HOME || pathname.startsWith("/teacher/") ? "/teacher/login" : "/login"
    // Keep the query so deep links (/student/namaz?step=ruku&part=1) survive sign-in.
    url.search = ""
    url.searchParams.set("redirectTo", pathname + request.nextUrl.search)
    return redirectTo(url)
  }

  // Already signed in but sitting on a login page → go to the right home.
  if (user && (pathname === "/login" || pathname === "/teacher/login")) {
    return redirectPath(isStudent ? "/student" : TEACHER_HOME)
  }

  // Students are confined to their portal; teachers may not roam into it.
  // (API routes are exempt — they authorize themselves.)
  if (user && isStudent && !isStudentArea && !isPublic && !isApi) {
    return redirectPath("/student")
  }
  if (user && !isStudent && isStudentArea) {
    return redirectPath(TEACHER_HOME)
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets, images, crawler files (robots.txt,
    // sitemap.xml, llms.txt) and Next internals
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
}
