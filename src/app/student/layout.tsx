"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useActivityLogger } from "@/lib/activity-log"
import { isLoginDisabled } from "@/lib/student-auth"
import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser } from "@/lib/use-current-user"
import { useSessionTimeout } from "@/lib/use-session-timeout"

/**
 * Client-side auth guard for the student portal. The middleware already sends
 * unauthenticated requests to /login on every navigation; this additionally
 * catches the session dying *while the app is open* (expired/revoked token) and
 * moves the student to the login screen immediately.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // Log every page view + click across the student portal.
  useActivityLogger()

  // Force a sign-out 3 hours after login, regardless of token refresh.
  useSessionTimeout()

  // Belt-and-suspenders: if sign-in was disabled while this tab is open, leave
  // immediately (middleware reads JWT locally; teacher disable also revokes globally).
  useEffect(() => {
    void getCurrentAuthUser().then((user) => {
      if (isLoginDisabled(user?.app_metadata as { login_disabled?: boolean })) {
        void supabase.auth.signOut().finally(() => router.replace("/login?blocked=1"))
      }
    })
  }, [router])

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Only react to an explicit sign-out. A broad "no session" check raced with
      // login and bounced freshly authenticated students back to /login.
      if (event === "SIGNED_OUT") router.replace("/login")
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}
