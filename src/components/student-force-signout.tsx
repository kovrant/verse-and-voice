"use client"

import { LogOut } from "lucide-react"
import { useState } from "react"

import { AccessDialogHeader, AccessTile } from "@/components/student-access-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "@/lib/toast"
import { forceSignOutStudent, useOnlineStudents } from "@/lib/use-online-students"

/**
 * Teacher-facing card to forcibly end an ONLINE student's session. Broadcasts a
 * force-signout to the student's open tab, which runs a global signOut (also
 * revoking their refresh tokens server-side). Only works while the student has
 * the portal open — there's no offline/admin revoke.
 */
/** Active session tile: online / offline; force sign-out lives in its dialog. */
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't sign the student out")
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <AccessTile
        icon={LogOut}
        tint="red"
        title="Active session"
        status={{ on: isOnline, label: isOnline ? "Online" : "Offline" }}
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <AccessDialogHeader
            icon={LogOut}
            tint="red"
            title="Active session"
            description="Force sign-out ends the student's open portal session right away."
          />
          <div className="py-2">
            <div className="flex items-start gap-3 rounded-lg bg-background-gray-primary p-4">
              <span
                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${isOnline ? "bg-green-500" : "bg-icon-tertiary"}`}
              />
              <p className="text-sm text-text-secondary">
                {isOnline
                  ? "The student has the portal open now. Signing them out revokes this session; they can sign back in with their username and password."
                  : "No active session — the student isn't online right now, so there's nothing to sign out."}
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={signingOut}>
              {isOnline ? "Cancel" : "Close"}
            </Button>
            {isOnline && (
              <Button variant="destructive" onClick={confirmSignOut} disabled={signingOut}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {signingOut ? "Signing out…" : "Force sign out"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
