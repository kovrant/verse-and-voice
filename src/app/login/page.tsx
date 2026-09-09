"use client"

import { BookOpen, Eye, EyeOff, Loader2, Lock, Moon, Sun, User as UserIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Brand } from "@/components/brand"
import { LoginBackground } from "@/components/login-background"
import { useTheme } from "@/components/theme-provider"
import { detectDevice } from "@/lib/device-detection"
import { isLoginDisabled, resolveLoginEmail, studentPostLoginPath } from "@/lib/student-auth"
import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser, prepareForPasswordSignIn, seedAuthUser } from "@/lib/use-current-user"
import type { User } from "@supabase/supabase-js"

// Friendly, non-punitive message shown when a teacher has turned off sign-in.
const CONTACT_TEACHER_MESSAGE = "To access the portal, please contact your teacher."

export default function StudentLoginPage() {
  return (
    <Suspense fallback={null}>
      <StudentLoginForm />
    </Suspense>
  )
}

function StudentLoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/student"
  const { dark, toggleDark } = useTheme()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  // Middleware bounces a disabled session here with ?blocked=1 — show the same
  // friendly message on load.
  const [error, setError] = useState<string | null>(
    searchParams.get("blocked") ? CONTACT_TEACHER_MESSAGE : null,
  )
  const [loading, setLoading] = useState(false)

  async function finishLogin(user: User | null | undefined) {
    if (isLoginDisabled(user?.app_metadata as { login_disabled?: boolean })) {
      await supabase.auth.signOut()
      setError(CONTACT_TEACHER_MESSAGE)
      setLoading(false)
      return
    }

    const role = (user?.app_metadata as { role?: string } | null)?.role
    if (role === "student") {
      const dev = detectDevice()
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: dev.label }),
        keepalive: true,
      })
    }
    seedAuthUser(user ?? null)
    // Hard navigation so the next request carries the session cookies.
    // router.replace + refresh races middleware and bounces back to /login.
    window.location.assign(role === "student" ? studentPostLoginPath(redirectTo) : "/")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    await prepareForPasswordSignIn()

    const email = resolveLoginEmail(identifier)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Concurrent auth reads can steal the Web Lock and fail sign-in even though
      // the session was written — recover instead of showing a false error.
      const recovered = await getCurrentAuthUser()
      if (recovered) {
        await finishLogin(recovered)
        return
      }
      setError(error.message)
      setLoading(false)
      return
    }

    await finishLogin(data.user)
  }

  const fieldClass =
    "h-[50px] w-full rounded-2xl border-2 border-border bg-[hsl(var(--surface-alt))] pl-12 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="vv-login-stage -m-4 -mt-16 grid min-h-dvh place-items-center px-4 py-10 lg:-m-8">
      {/* Dynamic Children's Ambient Background */}
      <LoginBackground />

      <div className="relative w-full max-w-[360px] animate-fade-in-up">
        {/* Light / dark toggle */}
        <button
          type="button"
          onClick={toggleDark}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="absolute right-0 top-1 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-soft transition-transform hover:scale-105 active:scale-95"
        >
          {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        {/* Prominent Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft-md ring-4 ring-primary/15">
            <BookOpen className="h-[28px] w-[28px]" strokeWidth={1.8} />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-[32px]">
            <Brand amp="text-brand" />
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Quran Academy
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-soft-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-foreground">Username</span>
              <span className="relative">
                <UserIcon
                  className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="your username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className={fieldClass}
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-foreground">Password</span>
              <span className="relative">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={`${fieldClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-center gap-3 rounded-2xl border-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {error === CONTACT_TEACHER_MESSAGE && (
                  <Lock
                    className="h-5 w-5 flex-shrink-0 animate-lock-shake"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                )}
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-0.5 flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-extrabold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Let's go! 🚀"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
