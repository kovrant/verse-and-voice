"use client"

import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { AccessDialogHeader, AccessTile } from "@/components/student-access-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidUsername } from "@/lib/student-auth"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

/**
 * Teacher-facing card to create or reset a student's portal login. Talks to
 * /api/students/:id/credentials (service-role, teacher-guarded).
 */
/** Portal access tile: shows whether a login exists; opens the create/reset dialog. */
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
    <>
      <AccessTile
        icon={KeyRound}
        tint="indigo"
        title="Portal access"
        loading={loading}
        status={{ on: hasLogin, label: hasLogin ? "Active" : "Not set" }}
        onClick={() => setOpen(true)}
      />
      <CredentialDialog
        studentId={studentId}
        open={open}
        onOpenChange={setOpen}
        existingUsername={username}
        onSaved={(u) => setUsername(u)}
      />
    </>
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
  // Set after a successful save: the button turns green, then the dialog closes.
  const [saved, setSaved] = useState<"created" | "updated" | null>(null)

  // Seed the username field with the existing one when opening a reset.
  useEffect(() => {
    if (open) {
      setUsername(existingUsername ?? "")
      setPassword("")
      setShowPassword(false)
      setSaved(null)
    }
    // existingUsername changes on save; reseeding then would wipe the green state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => onOpenChange(false), 1200)
    return () => clearTimeout(t)
  }, [saved, onOpenChange])

  const isReset = !!existingUsername && saved !== "created"

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
      setSaved(data.created ? "created" : "updated")
      onSaved(data.username)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <AccessDialogHeader
          icon={KeyRound}
          tint="indigo"
          title={isReset ? "Reset student login" : "Create student login"}
          description="The student signs in at the login page with this username and password."
        />
        <div className="space-y-4 py-2">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-icon-tertiary hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || !!saved}
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !!saved}
            className={cn(
              "min-w-[140px] disabled:opacity-100",
              saved && "bg-green-600 text-white hover:bg-green-600",
            )}
          >
            {saved ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                {saved === "created" ? "Created" : "Updated"}
              </>
            ) : saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {isReset ? "Updating…" : "Creating…"}
              </>
            ) : (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                {isReset ? "Update login" : "Create login"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
