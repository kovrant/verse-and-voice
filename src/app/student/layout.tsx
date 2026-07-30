"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useActivityLogger } from "@/lib/activity-log"
import { supabase } from "@/lib/supabase"
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

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        router.replace("/login")
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}
