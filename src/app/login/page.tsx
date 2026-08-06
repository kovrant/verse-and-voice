"use client"

import { BookOpen, Eye, EyeOff, Loader2, Lock, Moon, Sun, User } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Brand } from "@/components/brand"
import { useTheme } from "@/components/theme-provider"
import { isLoginDisabled, resolveLoginEmail } from "@/lib/student-auth"
import { supabase } from "@/lib/supabase"

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
  const router = useRouter()
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const email = resolveLoginEmail(identifier)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // signInWithPassword returns current app_metadata, so a teacher's "sign-in
    // off" is enforced even on an otherwise-valid password.
    if (isLoginDisabled(data.user?.app_metadata as { login_disabled?: boolean })) {
      await supabase.auth.signOut()
      setError(CONTACT_TEACHER_MESSAGE)
      setLoading(false)
      return
    }

    const role = (data.user?.app_metadata as { role?: string } | null)?.role
    // Let teachers know a student came online (fire-and-forget).
    if (role === "student") void fetch("/api/presence", { method: "POST", keepalive: true })
    router.replace(role === "student" ? redirectTo : "/")
    router.refresh()
  }

  const fieldClass =
    "h-[50px] w-full rounded-2xl border-2 border-border bg-[hsl(var(--surface-alt))] pl-12 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="vv-login-stage -m-4 -mt-16 grid min-h-dvh place-items-center px-6 py-10 lg:-m-8">
      <div className="relative w-full max-w-[340px] animate-fade-in-up">
        {/* Light / dark toggle */}
        <button
          type="button"
          onClick={toggleDark}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="absolute -right-1.5 -top-1.5 z-[3] flex h-10 w-10 items-center justify-center rounded-xl bg-card text-foreground shadow-soft-lg transition-transform hover:scale-105"
        >
          {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-soft-lg">
          {/* Forest header */}
          <div className="bg-primary px-6 pb-6 pt-7 text-center">
            <div className="mx-auto flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-white/15 ring-2 ring-inset ring-white/25">
              <BookOpen className="h-[30px] w-[30px] text-primary-foreground" strokeWidth={1.75} />
            </div>
            <h1 className="mt-3 font-heading text-[22px] font-bold text-primary-foreground">
              <Brand amp="text-primary-foreground/75" />
            </h1>
            <p className="text-[13px] text-primary-foreground/85">Welcome back! Ready to learn?</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-6 pb-6 pt-5" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-foreground">Username</span>
              <span className="relative">
                <User
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
              <p
                role="alert"
                aria-live="polite"
                className="rounded-2xl border-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {error}
              </p>
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
