"use client"

import { Check, Play, Trophy } from "lucide-react"

import { getChronologicalRoundNumber, type QuranRound } from "@/components/quran-progress"
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
import { formatLocalDate } from "@/lib/utils"

export type RoundProgressForm = { desc_completed: string; asc_completed: string }

export type NewRoundForm = {
  type: "qaida" | "quran"
  started_at: string
  completed_at: string
  desc_completed: string
  asc_completed: string
  is_completed: boolean
}

export type EditRoundForm = Omit<NewRoundForm, "type">

export function emptyNewRoundForm(): NewRoundForm {
  return {
    type: "quran",
    started_at: formatLocalDate(),
    completed_at: "",
    desc_completed: "0",
    asc_completed: "0",
    is_completed: false,
  }
}

/** Quick progress edit for the active round (Quran only; Qaida has no para progress). */
export function UpdateProgressDialog({
  open,
  onOpenChange,
  round,
  rounds,
  form,
  onFormChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  round: QuranRound | null
  rounds: QuranRound[]
  form: RoundProgressForm
  onFormChange: (form: RoundProgressForm) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>
            {round?.type === "qaida"
              ? "Norani Qaida"
              : `Quran Round ${round ? getChronologicalRoundNumber(rounds, round) : 1}`}
          </DialogDescription>
        </DialogHeader>
        {round?.type === "quran" ? (
          <div className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Paras from End (30→)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={form.desc_completed}
                  onChange={(e) => onFormChange({ ...form, desc_completed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currently on Para</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={form.asc_completed}
                  onChange={(e) => onFormChange({ ...form, asc_completed: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={onSave}>Save</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Qaida has no para progress. Use &ldquo;Complete&rdquo; to finish this round.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Start a new round, or log a past completed one. */
export function AddRoundDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: NewRoundForm
  onFormChange: (form: NewRoundForm) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Round</DialogTitle>
          <DialogDescription>Add a new or past completed round</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center rounded-xl border border-border/50 bg-secondary/30 p-1 gap-1">
            <button
              type="button"
              onClick={() => onFormChange({ ...form, type: "qaida" })}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.type === "qaida" ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              Norani Qaida
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...form, type: "quran" })}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.type === "quran" ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              Quran Reading
            </button>
          </div>

          <button
            type="button"
            onClick={() => onFormChange({ ...form, is_completed: !form.is_completed })}
            className="flex items-center gap-3 w-full rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-left hover:bg-secondary/40 transition-all"
          >
            <div
              className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${form.is_completed ? "bg-emerald-500" : "bg-secondary"}`}
            >
              <div
                className="h-4 w-4 rounded-full bg-card shadow-sm mt-0.5"
                style={{
                  transform: form.is_completed ? "translateX(16px)" : "translateX(2px)",
                  transition: "transform 0.2s",
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Already completed</p>
              <p className="text-xs text-muted-foreground">Toggle on for a past round</p>
            </div>
          </button>

          <div className={`grid gap-4 ${form.is_completed ? "sm:grid-cols-2" : ""}`}>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.started_at}
                onChange={(e) => onFormChange({ ...form, started_at: e.target.value })}
              />
            </div>
            {form.is_completed && (
              <div className="space-y-2">
                <Label>Completed Date</Label>
                <Input
                  type="date"
                  value={form.completed_at}
                  onChange={(e) => onFormChange({ ...form, completed_at: e.target.value })}
                />
              </div>
            )}
          </div>

          {!form.is_completed && form.type === "quran" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Paras from End (30→)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={form.desc_completed}
                  onChange={(e) => onFormChange({ ...form, desc_completed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currently on Para</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={form.asc_completed}
                  onChange={(e) => onFormChange({ ...form, asc_completed: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.is_completed && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-400">
                {form.type === "quran"
                  ? "Saved as fully completed (30/30)."
                  : "Saved as completed Qaida round."}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={onSave}>
              {form.is_completed ? (
                <>
                  <Trophy className="h-3.5 w-3.5 mr-1" />
                  Add Completed Round
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Start Round
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Edit any round's dates, progress and completion. Open while `round` is set. */
export function EditRoundDialog({
  round,
  rounds,
  onClose,
  form,
  onFormChange,
  onSave,
}: {
  round: QuranRound | null
  rounds: QuranRound[]
  onClose: () => void
  form: EditRoundForm
  onFormChange: (form: EditRoundForm) => void
  onSave: () => void
}) {
  return (
    <Dialog
      open={!!round}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Round</DialogTitle>
          <DialogDescription>
            {round?.type === "qaida"
              ? "Norani Qaida"
              : `Quran Round ${round ? getChronologicalRoundNumber(rounds, round) : ""}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <button
            type="button"
            onClick={() => onFormChange({ ...form, is_completed: !form.is_completed })}
            className="flex items-center gap-3 w-full rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-left hover:bg-secondary/40 transition-all"
          >
            <div
              className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${form.is_completed ? "bg-emerald-500" : "bg-secondary"}`}
            >
              <div
                className="h-4 w-4 rounded-full bg-card shadow-sm mt-0.5"
                style={{
                  transform: form.is_completed ? "translateX(16px)" : "translateX(2px)",
                  transition: "transform 0.2s",
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Completed</p>
              <p className="text-xs text-muted-foreground">Mark as completed round</p>
            </div>
          </button>

          <div className={`grid gap-4 ${form.is_completed ? "sm:grid-cols-2" : ""}`}>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.started_at}
                onChange={(e) => onFormChange({ ...form, started_at: e.target.value })}
              />
            </div>
            {form.is_completed && (
              <div className="space-y-2">
                <Label>Completed Date</Label>
                <Input
                  type="date"
                  value={form.completed_at}
                  onChange={(e) => onFormChange({ ...form, completed_at: e.target.value })}
                />
              </div>
            )}
          </div>

          {!form.is_completed && round?.type === "quran" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Paras from End (30→)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={form.desc_completed}
                  onChange={(e) => onFormChange({ ...form, desc_completed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currently on Para</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={form.asc_completed}
                  onChange={(e) => onFormChange({ ...form, asc_completed: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.is_completed && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-400">
                {round?.type === "quran"
                  ? "Saved as fully completed (30/30)."
                  : "Saved as completed Qaida round."}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={onSave}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
