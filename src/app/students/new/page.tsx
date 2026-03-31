"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"
import { ArrowLeft, UserPlus, Sparkles } from "lucide-react"
import Link from "next/link"

export default function NewStudentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    guardian_name: "",
    started_at: new Date().toISOString().split("T")[0],
    fee: "",
    fee_currency: "PKR",
    para_number: "",
    memorizing: "",
    class_time: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from("students").insert({
      name: form.name,
      guardian_name: form.guardian_name,
      started_at: form.started_at,
      fee: parseFloat(form.fee),
      fee_currency: form.fee_currency,
      para_number: form.para_number ? parseInt(form.para_number) : null,
      memorizing: form.memorizing || null,
      class_time: form.class_time || null,
    })

    if (error) {
      alert("Error saving student: " + error.message)
      setSaving(false)
      return
    }

    router.push("/students")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <Button variant="outline" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient-gold">Add Student</span>
          </h1>
          <p className="text-muted-foreground mt-1">Register a new student to the academy</p>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        {/* Decorative header */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

        <CardHeader className="pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <UserPlus className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle>Student Information</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Fields marked with * are required</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
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
                    placeholder="e.g. Ahmed Khan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian">Guardian Name *</Label>
                  <Input
                    id="guardian"
                    required
                    value={form.guardian_name}
                    onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                    placeholder="e.g. Muhammad Khan"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Schedule & Fees
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="started_at">Start Date *</Label>
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
                    placeholder="e.g. 5000"
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
                      <SelectItem value="PKR">PKR (Rs)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="SAR">SAR (﷼)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Quran Progress Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Quran Progress
              </div>
              <div className="space-y-2">
                <Label htmlFor="para">Para Number (1-30)</Label>
                <Input
                  id="para"
                  type="number"
                  min="1"
                  max="30"
                  value={form.para_number}
                  onChange={(e) => setForm({ ...form, para_number: e.target.value })}
                  placeholder="e.g. 15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memorizing">Currently Memorizing</Label>
                <Textarea
                  id="memorizing"
                  value={form.memorizing}
                  onChange={(e) => setForm({ ...form, memorizing: e.target.value })}
                  placeholder="e.g. Surah Al-Baqarah Ayat 50-60"
                  rows={3}
                />
              </div>
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
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
