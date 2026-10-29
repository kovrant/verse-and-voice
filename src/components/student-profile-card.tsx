"use client"

import { differenceInDays } from "date-fns"
import { Check, Clock, CreditCard } from "lucide-react"
import { useEffect, useState } from "react"

import { ClassDaysPicker } from "@/components/class-days-picker"
import { GenderPicker } from "@/components/gender-picker"
import { StudentAvatar } from "@/components/student-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  COUNTRY_FLAGS,
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
    gender: s.gender ?? null,
    status: (s.status || "Reading") as StudentStatus,
    ended_at: s.ended_at || "",
  }
}

/**
 * Teacher's "Profile details" card (NextAdmin's Account Details): avatar +
 * summary, current-month fee pill, and an always-editable form saved with
 * Save changes (enabled once something differs from the saved student).
 */
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
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(editForm) !== JSON.stringify(formFromStudent(student))

  // Reload after a save (or elsewhere) hands us a fresh student: show its values.
  useEffect(() => setEditForm(formFromStudent(student)), [student])

  async function saveEdit() {
    // Guard against an empty fee becoming NaN (NOT NULL violation): keep the
    // existing fee if the field was cleared/invalid.
    const parsedFee = parseFloat(editForm.fee)
    const fee = Number.isNaN(parsedFee) ? (student.fee ?? 0) : parsedFee

    setSaving(true)
    const { error } = await supabase
      .from("students")
      .update({
        fee,
        fee_currency: editForm.fee_currency,
        class_time: editForm.class_time || null,
        class_days: editForm.class_days.length > 0 ? editForm.class_days : null,
        country: editForm.country || null,
        gender: editForm.gender,
        status: editForm.status,
        // "Reading" students have no end date — clear any stale value left over
        // from a previous "Completed"/"Left" status.
        ended_at: editForm.status === "Reading" ? null : editForm.ended_at || null,
      })
      .eq("id", student.id)

    setSaving(false)
    if (error) {
      toast.error(`Couldn't save changes: ${error.message}`)
      return
    }

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
    <Card className="p-5">
      <h2 className="mb-6 text-xl font-semibold leading-7 text-text-primary">Profile details</h2>

      {/* Avatar + summary + this month's fee */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative size-16 flex-shrink-0 overflow-hidden rounded-full border border-card-border">
            <StudentAvatar
              id={student.id}
              name={student.name}
              gender={editForm.gender}
              sizes="64px"
              className="origin-[50%_30%] scale-[1.7] object-[50%_30%]"
              initialClassName="text-2xl"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-primary">{student.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-tertiary">
              <span>Guardian: {student.guardian_name}</span>
              {student.country && (
                <>
                  <span>&middot;</span>
                  <span title={student.country}>
                    {COUNTRY_FLAGS[student.country] ?? ""} {student.country}
                  </span>
                </>
              )}
              <span>&middot;</span>
              <span>{daysSinceStart}d enrolled</span>
              {student.ended_at && (
                <>
                  <span>&middot;</span>
                  <span>Ended {safeFormatDate(student.ended_at, "MMM yyyy")}</span>
                </>
              )}
            </p>
            {(student.class_time || scheduleDaysLabel) && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Clock className="h-3.5 w-3.5 text-icon-tertiary" />
                {student.class_time || "No time"}
                {scheduleDaysLabel ? ` (${scheduleDaysLabel})` : ""}
              </p>
            )}
          </div>
        </div>

        {currentFee &&
          (currentFee.is_paid ? (
            <button
              type="button"
              onClick={onOpenBilling}
              title="View billing history"
              className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-500/15 sm:self-auto"
            >
              <Check className="h-3.5 w-3.5" />
              {safeFormatDate(now, "MMM")} Fee Paid
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleFee(currentFee)}
              title="Click to mark this month's fee as paid"
              className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 sm:self-auto"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {safeFormatDate(now, "MMM")} Fee Unpaid &middot; Mark Paid
            </button>
          ))}
      </div>

      <form
        className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void saveEdit()
        }}
      >
        <div className="space-y-2.5">
          <Label>Boy or girl</Label>
          <GenderPicker
            value={editForm.gender}
            onChange={(gender) => setEditForm({ ...editForm, gender })}
          />
        </div>
        <div className="space-y-2.5">
          <Label>Country</Label>
          <Select
            value={editForm.country}
            onValueChange={(val) => setEditForm({ ...editForm, country: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className="mr-2">{COUNTRY_FLAGS[c]}</span>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="edit_class_time">Class time (PKT)</Label>
          <Input
            id="edit_class_time"
            type="time"
            value={toInputTime(editForm.class_time)}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                class_time: e.target.value ? toPktClassTime(e.target.value) : "",
              })
            }
          />
        </div>
        <div className="space-y-2.5">
          <Label>Class days</Label>
          <ClassDaysPicker
            value={editForm.class_days}
            onChange={(class_days) => setEditForm({ ...editForm, class_days })}
          />
          <p className="text-xs text-text-tertiary">Drives the student&apos;s daily streak.</p>
        </div>

        <div className="space-y-2.5">
          <Label>Monthly fee</Label>
          <Input
            type="number"
            value={editForm.fee}
            onChange={(e) => setEditForm({ ...editForm, fee: e.target.value })}
          />
        </div>
        <div className="space-y-2.5">
          <Label>Currency</Label>
          <Select
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

        <div className="space-y-2.5">
          <Label>Status</Label>
          <Select
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
          <div className="space-y-2.5">
            <Label>End date</Label>
            <Input
              type="date"
              value={editForm.ended_at}
              onChange={(e) => setEditForm({ ...editForm, ended_at: e.target.value })}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => setEditForm(formFromStudent(student))}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
