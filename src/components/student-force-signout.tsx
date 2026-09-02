"use client"

import { LogOut } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { forceSignOutStudent, useOnlineStudents } from "@/lib/use-online-students"

/**
 * Teacher-facing card to forcibly end an ONLINE student's session. Broadcasts a
 * force-signout to the student's open tab, which runs a global signOut (also
 * revoking their refresh tokens server-side). Only works while the student has
 * the portal open — there's no offline/admin revoke.
 */
export function StudentForceSignOut({ studentId }: { studentId: string }) {
  const online = useOnlineStudents()
  const isOnline = online.has(studentId)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function confirmSignOut() {
    setSigningOut(true)
    try {
      await forceSignOutStudent(studentId)
      toast.success("Student signed out")
      setOpen(false)
    } catch (e: any) {
      toast.error(e?.message || "Couldn't sign the student out")
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <LogOut className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Active Session</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isOnline
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOnline ? "bg-emerald-500" : "bg-muted-foreground/50"
                  }`}
                />
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isOnline
                ? "Force this student's open portal to sign out immediately."
                : "No active session — the student isn't online right now."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={!isOnline}
          className="flex-shrink-0 text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Force sign out
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Force sign out?</DialogTitle>
            <DialogDescription>
              This immediately signs the student out of their open session and revokes it. They can
              sign back in with their username and password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button onClick={confirmSignOut} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out student"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={signingOut}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
