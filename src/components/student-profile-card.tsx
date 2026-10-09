"use client"

import { differenceInDays } from "date-fns"
import { Check, Clock, CreditCard, MapPin, Pencil } from "lucide-react"
import { useEffect, useState } from "react"

import { ClassDaysPicker } from "@/components/class-days-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toInputTime, toPktClassTime } from "@/lib/class-time"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import {
  COUNTRIES,
  type FeePayment,
  parseLocalDate,
  safeFormatDate,
  type Student,
  type StudentStatus,
} from "@/lib/utils"

function formFromStudent(s: Student) {
  return {
    fee: (s.fee ?? 0).toString(),
    fee_currency: s.fee_currency || "GBP",
    class_time: s.class_time || "",
    class_days: Array.isArray(s.class_days) ? s.class_days : [],
    country: s.country || "",
    status: (s.status || "Reading") as StudentStatus,
    ended_at: s.ended_at || "",
  }
}

/** Teacher's profile card: summary strip, current-month fee pill, and the editable schedule/fee/status form. */
export function StudentProfileCard({
  student,
  currentFee,
  onToggleFee,
  onOpenBilling,
  onSaved,
}: {
  student: Student
  currentFee: FeePayment | undefined
  onToggleFee: (fee: FeePayment) => void
  onOpenBilling: () => void
  onSaved: () => void
}) {
  const [editForm, setEditForm] = useState(() => formFromStudent(student))
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Reload after a save (or elsewhere) hands us a fresh student: show its values.
  useEffect(() => setEditForm(formFromStudent(student)), [student])

  async function saveEdit() {
    // Guard against an empty fee becoming NaN (NOT NULL violation): keep the
    // existing fee if the field was cleared/invalid.
    const parsedFee = parseFloat(editForm.fee)
    const fee = Number.isNaN(parsedFee) ? (student.fee ?? 0) : parsedFee

    const { error } = await supabase
      .from("students")
      .update({
        fee,
        fee_currency: editForm.fee_currency,
        class_time: editForm.class_time || null,
        class_days: editForm.class_days.length > 0 ? editForm.class_days : null,
        country: editForm.country || null,
        status: editForm.status,
        // "Reading" students have no end date — clear any stale value left over
        // from a previous "Completed"/"Left" status.
        ended_at: editForm.status === "Reading" ? null : editForm.ended_at || null,
      })
      .eq("id", student.id)

    if (error) {
      toast.error(`Couldn't save changes: ${error.message}`)
      return
    }

    setIsEditingProfile(false)
    toast.success("Profile updated")
    onSaved()
  }

  const now = new Date()
  const daysSinceStart = differenceInDays(now, parseLocalDate(student.started_at) ?? now)
  const scheduleDaysLabel = student.class_days?.length
    ? student.class_days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
        .join(" · ")
    : null

  return (
    <Card className="lg:col-span-7">
      <CardContent className="pt-6 space-y-6">
        {/* Profile Summary Strip (Avatar + Schedule + Current Month Fee Status) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border/60">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xl font-bold flex-shrink-0">
              {(student.name || "?").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-heading text-lg font-bold text-foreground truncate">
                {student.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                <span>Guardian: {student.guardian_name}</span>
                {student.country && (
                  <>
                    <span className="text-muted-foreground/40">&middot;</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {student.country}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/40">&middot;</span>
                <span>{daysSinceStart}d enrolled</span>
                {student.ended_at && (
                  <>
                    <span className="text-muted-foreground/40">&middot;</span>
                    <span>Ended {safeFormatDate(student.ended_at, "MMM yyyy")}</span>
                  </>
                )}
              </div>
              {(student.class_time || scheduleDaysLabel) && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/85 mt-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {student.class_time || "No time"}
                    {scheduleDaysLabel ? ` (${scheduleDaysLabel})` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {currentFee &&
              (currentFee.is_paid ? (
                <button
                  type="button"
                  onClick={onOpenBilling}
                  title="View billing history"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/15"
                >
                  <Check className="h-3.5 w-3.5" />
                  {safeFormatDate(now, "MMM")} Fee Paid
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleFee(currentFee)}
                  title="Click to mark this month's fee as paid"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {safeFormatDate(now, "MMM")} Fee Unpaid &middot; Mark Paid
                </button>
              ))}

            {!isEditingProfile && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Profile Options (Read-only by default, editable when Edit is clicked) */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                disabled={!isEditingProfile}
                value={editForm.country}
                onValueChange={(val) => setEditForm({ ...editForm, country: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_class_time">Class Time (PKT)</Label>
              <Input
                id="edit_class_time"
                type="time"
                disabled={!isEditingProfile}
                value={toInputTime(editForm.class_time)}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    class_time: e.target.value ? toPktClassTime(e.target.value) : "",
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Class Days</Label>
            <ClassDaysPicker
              disabled={!isEditingProfile}
              value={editForm.class_days}
              onChange={(class_days) => setEditForm({ ...editForm, class_days })}
            />
            <p className="text-xs text-muted-foreground">
              Days this student has class — drives their daily streak.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Monthly Fee</Label>
              <Input
                type="number"
                disabled={!isEditingProfile}
                value={editForm.fee}
                onChange={(e) => setEditForm({ ...editForm, fee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                disabled={!isEditingProfile}
                value={editForm.fee_currency}
                onValueChange={(val) => setEditForm({ ...editForm, fee_currency: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="PKR">PKR (Rs)</SelectItem>
                  <SelectItem value="SAR">SAR (﷼)</SelectItem>
                  <SelectItem value="BHD">BHD (BD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                disabled={!isEditingProfile}
                value={editForm.status}
                onValueChange={(val) => setEditForm({ ...editForm, status: val as StudentStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reading">Reading</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Left Uncompleted">Left Uncompleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.status !== "Reading" && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  disabled={!isEditingProfile}
                  value={editForm.ended_at}
                  onChange={(e) => setEditForm({ ...editForm, ended_at: e.target.value })}
                />
              </div>
            )}
          </div>

          {isEditingProfile && (
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={saveEdit}>Save Changes</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditForm(formFromStudent(student))
                  setIsEditingProfile(false)
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
