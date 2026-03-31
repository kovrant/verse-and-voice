"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, X, CreditCard, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface FeeRecord {
  id: string
  student_id: string
  month: number
  year: number
  is_paid: boolean
  paid_at: string | null
  students: {
    name: string
    fee: number
    fee_currency: string
    is_active: boolean
  }
}

export default function FeesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFees()
  }, [month, year])

  async function loadFees() {
    setLoading(true)

    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("is_active", true)

    if (students && students.length > 0) {
      const records = students.map((s) => ({
        student_id: s.id,
        month,
        year,
      }))
      await supabase.from("fee_payments").upsert(records, {
        onConflict: "student_id,month,year",
        ignoreDuplicates: true,
      })
    }

    const { data } = await supabase
      .from("fee_payments")
      .select("*, students(name, fee, fee_currency, is_active)")
      .eq("month", month)
      .eq("year", year)
      .order("created_at")

    const activeFees = (data || []).filter(
      (f: any) => f.students?.is_active
    ) as FeeRecord[]

    setFees(activeFees)
    setLoading(false)
  }

  async function toggleFee(fee: FeeRecord) {
    const newPaid = !fee.is_paid
    await supabase
      .from("fee_payments")
      .update({
        is_paid: newPaid,
        paid_at: newPaid ? new Date().toISOString() : null,
      })
      .eq("id", fee.id)

    loadFees()
  }

  const paidCount = fees.filter((f) => f.is_paid).length
  const totalCollected = fees
    .filter((f) => f.is_paid)
    .reduce((sum, f) => sum + (f.students?.fee || 0), 0)
  const totalPending = fees
    .filter((f) => !f.is_paid)
    .reduce((sum, f) => sum + (f.students?.fee || 0), 0)

  const years = []
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    years.push(y)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Fee Management</span>
        </h1>
        <p className="text-muted-foreground mt-1">Track and manage monthly fee payments</p>
      </div>

      {/* Month/Year Selector */}
      <div className="flex gap-3">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Status</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
                <CheckCircle2 className="h-4.5 w-4.5 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {paidCount} <span className="text-base font-normal text-muted-foreground">of {fees.length} paid</span>
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">
              <span className="text-lg font-medium text-muted-foreground">PKR </span>
              {totalCollected.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pending</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
                <AlertCircle className="h-4.5 w-4.5 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">
              <span className="text-lg font-medium text-muted-foreground">PKR </span>
              {totalPending.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Records */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 shimmer rounded-2xl" />
          ))}
        </div>
      ) : fees.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">No fee records</p>
            <p className="text-sm text-muted-foreground">
              No active students found for {MONTH_NAMES[month - 1]} {year}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Amount</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid Date</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${
                          fee.is_paid
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {fee.students?.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{fee.students?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-emerald-400">
                        {CURRENCY_SYMBOLS[fee.students?.fee_currency || "PKR"]}
                        {(fee.students?.fee || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={fee.is_paid ? "success" : "warning"}>
                        {fee.is_paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {fee.paid_at
                        ? format(new Date(fee.paid_at), "MMM d, yyyy h:mm a")
                        : "--"}
                    </td>
                    <td className="px-5 py-4 text-right">
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
        </Card>
      )}
    </div>
  )
}
