"use client"

import { LogIn } from "lucide-react"
import { useEffect, useState } from "react"

import { AccessDialogHeader, AccessTile } from "@/components/student-access-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "@/lib/toast"
import { forceSignOutStudent } from "@/lib/use-online-students"

/**
 * Teacher-facing card to allow/deny a student's portal sign-in. Flips
 * app_metadata.login_disabled via /api/students/:id/access (teacher-guarded,
 * service role). Turning access OFF also kicks any live session.
 */
/** Sign-in access tile: allowed / off; the switch lives in its dialog. */
export function StudentSignInAccess({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false)
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
    } catch (e: unknown) {
      setEnabled(!next) // revert
      toast.error(e instanceof Error ? e.message : "Couldn't update sign-in access")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AccessTile
        icon={LogIn}
        tint="sky"
        title="Sign-in access"
        loading={loading}
        status={
          hasLogin
            ? { on: enabled, label: enabled ? "Allowed" : "Off" }
            : { on: false, label: "No login" }
        }
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <AccessDialogHeader
            icon={LogIn}
            tint="sky"
            title="Sign-in access"
            description="Turning sign-in off also signs the student out of any open session."
          />
          <div className="py-2">
            {hasLogin ? (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-background-gray-primary p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">Allow portal sign-in</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {enabled
                      ? "The student can sign in to the portal."
                      : "The student can't sign in — they'll be asked to contact you."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label="Allow portal sign-in"
                  disabled={saving}
                  onClick={toggle}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 ${
                    enabled ? "bg-primary" : "bg-background-gray-tertiary"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-card-background shadow-xs transition-transform ${
                      enabled ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-background-gray-primary p-4 text-sm text-text-secondary">
                This student has no portal login yet. Create one from Portal access first, then you
                can turn sign-in on or off here.
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
