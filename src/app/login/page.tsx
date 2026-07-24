"use client"

import { BookAudio, Eye, EyeOff, Loader2, Lock, Sparkles, Star, User } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { resolveLoginEmail } from "@/lib/student-auth"
import { supabase } from "@/lib/supabase"

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

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    const role = (data.user?.app_metadata as { role?: string } | null)?.role
    // Let teachers know a student came online (fire-and-forget).
    if (role === "student") void fetch("/api/presence", { method: "POST", keepalive: true })
    router.replace(role === "student" ? redirectTo : "/")
    router.refresh()
  }

  const fieldClass =
    "h-14 w-full rounded-2xl border-2 border-border bg-card text-base text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="-m-4 -mt-16 lg:-m-8 min-h-dvh flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Sunny pastel ambient blobs */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full opacity-60 blur-3xl animate-float"
        style={{
          background: "radial-gradient(circle, hsl(var(--c-a-500) / 0.5), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(var(--c-s-500) / 0.5), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/4 h-80 w-80 rounded-full opacity-50 blur-3xl animate-float"
        style={{
          background: "radial-gradient(circle, hsl(var(--c-p-500) / 0.4), transparent 70%)",
          animationDelay: "1.5s",
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="overflow-hidden rounded-[2rem] bg-card shadow-soft-lg border border-border/60">
          {/* Playful header */}
          <div
            className="relative px-8 pb-10 pt-10 text-center"
            style={{
              background:
                "linear-gradient(150deg, hsl(var(--c-a-400)), hsl(var(--primary)) 55%, hsl(var(--c-s-500)))",
            }}
          >
            <div className="absolute inset-0 opacity-30">
              <Star
                className="absolute left-8 top-6 h-4 w-4 text-white sparkle-twinkle"
                fill="currentColor"
              />
              <Sparkles
                className="absolute right-10 top-10 h-5 w-5 text-white sparkle-twinkle"
                style={{ animationDelay: "0.4s" }}
              />
              <Star
                className="absolute right-1/3 bottom-6 h-3 w-3 text-white sparkle-twinkle"
                fill="currentColor"
                style={{ animationDelay: "0.8s" }}
              />
            </div>
            <div className="relative flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/25 ring-2 ring-white/40 backdrop-blur-sm animate-float">
                <BookAudio className="h-10 w-10 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="font-brand text-2xl font-bold text-white drop-shadow-sm">
                  <Brand amp="text-white/80" />
                </h1>
                <p className="text-sm text-white/90 mt-0.5">Welcome back! Ready to learn? ✨</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-7 py-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-semibold text-foreground/90">
                  Username
                </Label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60"
                    aria-hidden="true"
                  />
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="your username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                    className={`${fieldClass} pl-12 pr-4`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={`${fieldClass} pl-12 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="rounded-2xl border-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-14 text-base rounded-2xl hover-bounce"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  "Let's go! 🚀"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
