"use client"

import { Check, Eye, EyeOff, KeyRound } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "@/lib/toast"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidUsername } from "@/lib/student-auth"

/**
 * Teacher-facing card to create or reset a student's portal login. Talks to
 * /api/students/:id/credentials (service-role, teacher-guarded).
 */
export function StudentPortalAccess({ studentId }: { studentId: string }) {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/students/${studentId}/credentials`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setUsername(d?.username ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId])

  const hasLogin = !!username

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Portal Access</p>
              {!loading && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    hasLogin
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasLogin ? "bg-emerald-500" : "bg-muted-foreground/50"
                    }`}
                  />
                  {hasLogin ? "Active" : "Not set"}
                </span>
              )}
            </div>
            {loading ? (
              <div className="mt-1.5 h-4 w-40 shimmer rounded" />
            ) : hasLogin ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Username:{" "}
                <span className="font-mono font-semibold text-foreground">{username}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                No login created yet — create one so the student can sign in.
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="flex-shrink-0"
        >
          {hasLogin ? "Reset password" : "Create login"}
        </Button>
      </div>

      <CredentialDialog
        studentId={studentId}
        open={open}
        onOpenChange={setOpen}
        existingUsername={username}
        onSaved={(u) => setUsername(u)}
      />
    </div>
  )
}

function CredentialDialog({
  studentId,
  open,
  onOpenChange,
  existingUsername,
  onSaved,
}: {
  studentId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  existingUsername: string | null
  onSaved: (username: string) => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  // Seed the username field with the existing one when opening a reset.
  useEffect(() => {
    if (open) {
      setUsername(existingUsername ?? "")
      setPassword("")
      setShowPassword(false)
    }
  }, [open, existingUsername])

  const isReset = !!existingUsername

  async function save() {
    if (!isValidUsername(username)) {
      toast.error("Username must be 3–30 chars: letters, digits, . _ - only.")
      return
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/students/${studentId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || "Something went wrong")
        return
      }
      toast.success(data.created ? "Login created" : "Login updated")
      onSaved(data.username)
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || "Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isReset ? "Reset student login" : "Create student login"}</DialogTitle>
          <DialogDescription>
            The student signs in at the login page with this username and password.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="portal-username">Username</Label>
            <Input
              id="portal-username"
              value={username}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ahmed.k"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portal-password">{isReset ? "New password" : "Password"}</Label>
            <div className="relative">
              <Input
                id="portal-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {isReset ? "Update" : "Create"}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
