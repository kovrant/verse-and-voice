"use client"

import type { User } from "@supabase/supabase-js"
import { Eye, EyeOff, Lock, User as UserIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Brand } from "@/components/brand"
import { BrandLogo } from "@/components/brand-logo"
import { KidButton, QuranBookIcon } from "@/components/kid-ui"
import { StudentBackdrop } from "@/components/student-backdrop"
import { type MascotMood, MoonMascot } from "@/components/student-mascot"
import type { KidColor } from "@/components/student-nav"
import { DayNightSwitch } from "@/components/student-topbar"
import { detectDevice } from "@/lib/device-detection"
import { isLoginDisabled, resolveLoginEmail, studentPostLoginPath } from "@/lib/student-auth"
import { supabase } from "@/lib/supabase"
import { getCurrentAuthUser, prepareForPasswordSignIn, seedAuthUser } from "@/lib/use-current-user"

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
      // Supabase's "Invalid login credentials" means little to a child.
      setError(
        /invalid login/i.test(error.message)
          ? "That username or password isn't right. Try again!"
          : error.message,
      )
      setShakeKey((k) => k + 1)
      setLoading(false)
      return
    }

    await finishLogin(data.user)
  }

  const fieldClass =
    "h-[56px] w-full rounded-[20px] border-[1.5px] border-border bg-[hsl(var(--surface-alt))] pl-[60px] text-[15px] font-semibold text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-[hsl(var(--kid)/0.6)] focus-visible:border-[hsl(var(--kid))] focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-[hsl(var(--kid)/0.25)] disabled:cursor-not-allowed disabled:opacity-50"

  const [passwordFocused, setPasswordFocused] = useState(false)
  // Bumped on every failed attempt so the card re-runs its "oops" wiggle.
  const [shakeKey, setShakeKey] = useState(0)

  // Hilal reacts to what's happening: excited while signing in, eyes shut
  // while the password is typed ("I won't peek!"), awake otherwise.
  const blocked = error === CONTACT_TEACHER_MESSAGE
  const mood: MascotMood = loading
    ? "excited"
    : passwordFocused && !showPassword
      ? "sleepy"
      : "awake"
  const bubble = loading
    ? "Bismillah! ✨"
    : blocked
      ? "Please ask your teacher 💌"
      : error
        ? "Oops! Let's try again"
        : passwordFocused && !showPassword
          ? "I won't peek! ✋"
          : "Assalamu Alaikum! 👋"

  return (
    <div className="relative isolate -m-4 grid min-h-dvh place-items-center overflow-hidden px-4 py-10 lg:-m-8">
      <StudentBackdrop />

      <DayNightSwitch className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8" />

      <div className="relative w-full max-w-[380px]">
        {/* Brand: the talking logo pops in */}
        <div className="mb-3 text-center">
          <BrandLogo
            animated
            className="mx-auto h-[104px] w-[104px] animate-vv-pop drop-shadow-[0_8px_16px_rgba(46,58,47,0.15)]"
          />
          <h1 className="mt-2 font-heading text-[34px] font-bold leading-none tracking-tight text-primary">
            <Brand amp="text-accent" />
          </h1>
          <p className="mt-1.5 text-[13px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
            Read · Recite · Shine ✨
          </p>
        </div>

        {/* Hilal peeks over the card with a speech bubble */}
        <div className="relative z-10 flex items-end gap-2 pl-3" style={{ marginBottom: -18 }}>
          <MoonMascot mood={mood} className="h-[78px] w-[78px] flex-shrink-0 animate-float-gentle" />
          <span
            key={bubble}
            className="mb-9 animate-vv-bubble rounded-[18px] rounded-bl-[6px] border-[1.5px] border-border bg-card px-3.5 py-2 font-heading text-[15px] font-bold text-primary shadow-soft"
            aria-live="polite"
          >
            {bubble}
          </span>
        </div>

        {/* Form card */}
        <div
          key={shakeKey}
          className={`rounded-[30px] border-[1.5px] border-border bg-card p-6 pt-7 shadow-soft-lg ${shakeKey ? "animate-vv-wiggle" : "animate-fade-in-up"}`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <KidField label="Username" color="sky" icon={<UserIcon className="h-5 w-5" />}>
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
            </KidField>

            <KidField label="Password" color="lavender" icon={<Lock className="h-5 w-5" />}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                disabled={loading}
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[14px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </KidField>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-center gap-3 rounded-[18px] border-[1.5px] px-4 py-3 text-[14px] font-bold text-foreground"
                style={{
                  background: "hsl(var(--kid-coral) / 0.18)",
                  borderColor: "hsl(var(--kid-coral) / 0.5)",
                }}
              >
                <Lock
                  className={`h-5 w-5 flex-shrink-0 text-accent ${blocked ? "animate-lock-shake" : ""}`}
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            <KidButton
              type="submit"
              disabled={loading}
              className="mt-1"
              pad={
                <QuranBookIcon
                  className={
                    loading
                      ? "h-[30px] w-[30px] animate-bounce motion-reduce:animate-none"
                      : "h-[30px] w-[30px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                  }
                />
              }
            >
              {loading ? "Opening your book…" : "Let's go!"}
            </KidButton>
          </form>
        </div>
      </div>
    </div>
  )
}

/** Labelled input with a crayon-colour icon tile; the border lights up in that colour on focus. */
function KidField({
  label,
  color,
  icon,
  children,
}: {
  label: string
  color: KidColor
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label
      className="flex flex-col gap-1.5"
      style={{ "--kid": `var(--kid-${color})` } as React.CSSProperties}
    >
      <span className="pl-1 text-[13px] font-extrabold text-foreground">{label}</span>
      <span className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[14px] bg-[hsl(var(--kid)/0.3)] text-foreground"
        >
          {icon}
        </span>
        {children}
      </span>
    </label>
  )
}
