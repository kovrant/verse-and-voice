"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"
import { ArrowLeft, Pencil, Check, X, CreditCard, Clock, BookOpen, CalendarDays, Sparkles } from "lucide-react"
import { format, differenceInDays } from "date-fns"

interface Student {
  id: string
  name: string
  guardian_name: string
  started_at: string
  fee: number
  fee_currency: string
  para_number: number | null
  memorizing: string | null
  class_time: string | null
  is_active: boolean
  created_at: string
}

interface FeePayment {
  id: string
  month: number
  year: number
  is_paid: boolean
  paid_at: string | null
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [fees, setFees] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    para_number: "",
    memorizing: "",
    class_time: "",
    fee: "",
    is_active: "true",
  })

  const loadStudent = useCallback(async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("id", params.id)
      .single()

    if (!data) {
      router.push("/students")
      return
    }

    setStudent(data)
    setEditForm({
      para_number: data.para_number?.toString() || "",
      memorizing: data.memorizing || "",
      class_time: data.class_time || "",
      fee: data.fee.toString(),
      is_active: data.is_active.toString(),
    })

    await ensureFeeRecords(data)
    await loadFees()
    setLoading(false)
  }, [params.id, router])

  async function ensureFeeRecords(s: Student) {
    const startDate = new Date(s.started_at)
    const now = new Date()
    const months: { student_id: string; month: number; year: number }[] = []

    let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (d <= now) {
      months.push({
        student_id: s.id,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      })
      d.setMonth(d.getMonth() + 1)
    }

    if (months.length > 0) {
      await supabase.from("fee_payments").upsert(months, {
        onConflict: "student_id,month,year",
        ignoreDuplicates: true,
      })
    }
  }

  async function loadFees() {
    const { data } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("student_id", params.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12)

    setFees(data || [])
  }

  async function toggleFee(fee: FeePayment) {
    const newPaid = !fee.is_paid
    await supabase
      .from("fee_payments")
      .update({
        is_paid: newPaid,
        paid_at: newPaid ? new Date().toISOString() : null,
      })
      .eq("id", fee.id)

    await loadFees()
  }

  async function saveEdit() {
    await supabase
      .from("students")
      .update({
        para_number: editForm.para_number ? parseInt(editForm.para_number) : null,
        memorizing: editForm.memorizing || null,
        class_time: editForm.class_time || null,
        fee: parseFloat(editForm.fee),
        is_active: editForm.is_active === "true",
      })
      .eq("id", params.id)

    setEditOpen(false)
    loadStudent()
  }

  useEffect(() => {
    loadStudent()
  }, [loadStudent])

  if (loading || !student) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shimmer rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="h-8 w-48 shimmer rounded-lg" />
            <div className="h-5 w-64 shimmer rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    )
  }

  const daysSinceStart = differenceInDays(new Date(), new Date(student.started_at))
  const cs = CURRENCY_SYMBOLS[student.fee_currency]
  const paraProgress = student.para_number ? (student.para_number / 30) * 100 : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/students">
          <Button variant="outline" size="icon" className="rounded-xl mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
              <p className="text-muted-foreground text-sm">
                Guardian: {student.guardian_name} &middot; {daysSinceStart} days since enrollment
              </p>
            </div>
          </div>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update student details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Monthly Fee</Label>
                <Input
                  type="number"
                  value={editForm.fee}
                  onChange={(e) => setEditForm({ ...editForm, fee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Para Number (1-30)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={editForm.para_number}
                  onChange={(e) => setEditForm({ ...editForm, para_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currently Memorizing</Label>
                <Textarea
                  value={editForm.memorizing}
                  onChange={(e) => setEditForm({ ...editForm, memorizing: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Class Time</Label>
                <TimePicker
                  value={editForm.class_time}
                  onChange={(val) => setEditForm({ ...editForm, class_time: val })}
                  placeholder="Select class time"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.is_active}
                  onValueChange={(val) => setEditForm({ ...editForm, is_active: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={saveEdit}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Student Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Fee</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">{cs}{student.fee.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{student.fee_currency}</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Para</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{student.para_number ? `${student.para_number}/30` : "--"}</p>
            {student.para_number && (
              <div className="mt-2">
                <Progress value={paraProgress} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{student.class_time || "--"}</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant={student.is_active ? "success" : "secondary"} className="text-sm px-3 py-1.5">
              {student.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Currently Memorizing */}
      {student.memorizing && (
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currently Memorizing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-amber-300">{student.memorizing}</p>
          </CardContent>
        </Card>
      )}

      {/* Fee Payment History */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <CardTitle>Fee Payment History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No fee records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Month</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid Date</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-sm">
                        {MONTH_NAMES[fee.month - 1]} {fee.year}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={fee.is_paid ? "success" : "warning"}>
                          {fee.is_paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {fee.paid_at ? format(new Date(fee.paid_at), "MMM d, yyyy h:mm a") : "--"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={fee.is_paid ? "outline" : "default"}
                          onClick={() => toggleFee(fee)}
                        >
                          {fee.is_paid ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Unpaid
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Mark Paid
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
