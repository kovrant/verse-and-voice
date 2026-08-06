"use client"

import { LogIn } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { forceSignOutStudent } from "@/lib/use-online-students"

/**
 * Teacher-facing card to allow/deny a student's portal sign-in. Flips
 * app_metadata.login_disabled via /api/students/:id/access (teacher-guarded,
 * service role). Turning access OFF also kicks any live session.
 */
export function StudentSignInAccess({ studentId }: { studentId: string }) {
  const [hasLogin, setHasLogin] = useState(false)
  const [enabled, setEnabled] = useState(true) // access on = login NOT disabled
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/students/${studentId}/access`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        setHasLogin(!!d?.hasLogin)
        setEnabled(!d?.disabled)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId])

  async function toggle() {
    if (saving || !hasLogin) return
    const next = !enabled // next enabled state
    const disabled = !next

    setSaving(true)
    setEnabled(next) // optimistic
    try {
      const res = await fetch(`/api/students/${studentId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Something went wrong")

      if (disabled) {
        // Kick any live session so the student is signed out right away.
        await forceSignOutStudent(studentId).catch(() => {})
        toast.success("Sign-in access turned off")
      } else {
        toast.success("Sign-in access turned on")
      }
    } catch (e: any) {
      setEnabled(!next) // revert
      toast.error(e?.message || "Couldn't update sign-in access")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600">
            <LogIn className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Sign-in Access</p>
              {!loading && hasLogin && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    enabled
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      enabled ? "bg-emerald-500" : "bg-muted-foreground/50"
                    }`}
                  />
                  {enabled ? "Allowed" : "Off"}
                </span>
              )}
            </div>
            {loading ? (
              <div className="mt-1.5 h-4 w-48 shimmer rounded" />
            ) : !hasLogin ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Create a login first (see Portal Access) so you can control sign-in.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {enabled
                  ? "The student can sign in to the portal."
                  : "The student can't sign in — they'll be asked to contact you."}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Allow portal sign-in"
          disabled={loading || saving || !hasLogin}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? "bg-emerald-500" : "bg-secondary"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-card shadow-sm transition-transform ${
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  )
}
