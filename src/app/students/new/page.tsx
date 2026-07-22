"use client"

import { ArrowLeft, Sparkles, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"
import { supabase } from "@/lib/supabase"
import { COUNTRIES, formatLocalDate } from "@/lib/utils"

export default function NewStudentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    guardian_name: "",
    country: "",
    started_at: formatLocalDate(),
    fee: "",
    fee_currency: "GBP",
    class_time: "",
    // Initial round
    round_type: "qaida" as "qaida" | "quran",
    desc_completed: "0",
    asc_completed: "0",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Insert student
    const { data: student, error } = await supabase
      .from("students")
      .insert({
        name: form.name,
        guardian_name: form.guardian_name,
        country: form.country || null,
        started_at: form.started_at,
        fee: parseFloat(form.fee),
        fee_currency: form.fee_currency,
        is_qaida: form.round_type === "qaida",
        desc_completed: form.round_type === "quran" ? parseInt(form.desc_completed) || 0 : 0,
        asc_completed: form.round_type === "quran" ? parseInt(form.asc_completed) || 0 : 0,
        class_time: form.class_time || null,
        status: "Reading",
      })
      .select("id")
      .single()

    if (error || !student) {
      toast.error("Error saving student: " + (error?.message || "Unknown error"))
      setSaving(false)
      return
    }

    // Create first round
    const { error: roundError } = await supabase.from("quran_rounds").insert({
      student_id: student.id,
      type: form.round_type,
      round_number: 1,
      started_at: form.started_at,
      desc_completed: form.round_type === "quran" ? parseInt(form.desc_completed) || 0 : 0,
      asc_completed: form.round_type === "quran" ? parseInt(form.asc_completed) || 0 : 0,
    })

    if (roundError) {
      toast.error(
        `Student saved, but the starting round failed: ${roundError.message}. ` +
          `You can add it from the student's page.`,
      )
      setSaving(false)
    }

    router.push(`/students/${student.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <Link href="/" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <Link href="/students" className="hover:text-foreground transition-colors">
            Students
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium">New</span>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="outline" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-foreground">Add Student</span>
            </h1>
            <p className="text-muted-foreground mt-1">Register a new student to the academy</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <UserPlus className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>Student Information</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Fields marked with * are required
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Personal Details
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ahmed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian">Guardian Name *</Label>
                  <Input
                    id="guardian"
                    required
                    value={form.guardian_name}
                    onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                    placeholder="e.g. Ayesha"
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={form.country}
                    onValueChange={(val) => setForm({ ...form, country: val })}
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
              </div>
            </div>

            {/* Schedule & Fees */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Schedule & Fees
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="started_at">Admission Date *</Label>
                  <Input
                    id="started_at"
                    type="date"
                    required
                    value={form.started_at}
                    onChange={(e) => setForm({ ...form, started_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class_time">Class Time</Label>
                  <TimePicker
                    value={form.class_time}
                    onChange={(val) => setForm({ ...form, class_time: val })}
                    placeholder="Select class time"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fee">Monthly Fee *</Label>
                  <Input
                    id="fee"
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={form.fee}
                    onChange={(e) => setForm({ ...form, fee: e.target.value })}
                    placeholder="e.g. 35"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={form.fee_currency}
                    onValueChange={(val) => setForm({ ...form, fee_currency: val })}
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
            </div>

            {/* Starting Round */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Starting Stage
              </div>

              <div className="flex items-center rounded-xl border border-border/50 bg-secondary/30 p-1 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      round_type: "qaida",
                      desc_completed: "0",
                      asc_completed: "0",
                    })
                  }
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.round_type === "qaida"
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Norani Qaida
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, round_type: "quran" })}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.round_type === "quran"
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reading Quran
                </button>
              </div>

              {form.round_type === "qaida" ? (
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-sm text-foreground font-medium">
                    Student is learning the basics
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Norani Qaida must be completed before starting Quran reading.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="desc_completed">Paras from End (30→)</Label>
                    <Input
                      id="desc_completed"
                      type="number"
                      min="0"
                      max="30"
                      value={form.desc_completed}
                      onChange={(e) => setForm({ ...form, desc_completed: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asc_completed">Currently on Para</Label>
                    <Input
                      id="asc_completed"
                      type="number"
                      min="0"
                      max="30"
                      value={form.asc_completed}
                      onChange={(e) => setForm({ ...form, asc_completed: e.target.value })}
                      placeholder="e.g. 19"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Student
                  </>
                )}
              </Button>
              <Link href="/students">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
