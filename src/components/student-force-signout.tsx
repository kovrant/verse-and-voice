"use client"

import { LogOut } from "lucide-react"
import { useState } from "react"

import { SlideToConfirm } from "@/components/slide-to-confirm"
import { AccessDialogHeader, AccessStatusPill, AccessTile } from "@/components/student-access-bits"
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

  async function confirmSignOut() {
    try {
      await forceSignOutStudent(studentId)
      toast.success("Student signed out")
      setOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't sign the student out")
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
          <div className="my-2 space-y-1 rounded-lg bg-background-gray-primary p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-primary">Portal session</p>
              <AccessStatusPill on={isOnline} label={isOnline ? "Online" : "Offline"} />
            </div>
            <p className="text-xs text-text-tertiary">
              {isOnline
                ? "The student has the portal open. Signing them out revokes this session; they can sign back in with their username and password."
                : "The student isn't online right now, so there's nothing to sign out."}
            </p>
          </div>
          {isOnline && (
            /* The dialog's only action, in the footer spot */
            <div className="pt-2">
              <SlideToConfirm
                tone="red"
                label="Slide right to sign out"
                onConfirm={confirmSignOut}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
