"use client"

import { format } from "date-fns"
import { CreditCard } from "lucide-react"
import { useEffect, useState } from "react"

import { FeeDisplay } from "@/components/fee-display"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExchangeRates } from "@/lib/exchange-rates"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"
import type { FeePayment } from "@/lib/utils"

export default function StudentFeesPage() {
  const { student, loading } = useStudent()
  const { rates } = useExchangeRates()
  const [fees, setFees] = useState<FeePayment[]>([])
  const [loadingFees, setLoadingFees] = useState(true)

  useEffect(() => {
    if (!student) return
    supabase
      .from("fee_payments")
      .select("*")
      .eq("student_id", student.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .then(({ data }) => {
        setFees((data as FeePayment[]) || [])
        setLoadingFees(false)
      })
  }, [student])

  if (loading || loadingFees || !student) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
        <div className="h-8 w-40 shimmer rounded-lg" />
        <div className="h-16 shimmer rounded-2xl" />
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    )
  }

  const paidCount = fees.filter((f) => f.is_paid).length
  const unpaidCount = fees.filter((f) => !f.is_paid).length

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/25 text-amber-600 flex-shrink-0">
          <CreditCard className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Fees</h1>
          <p className="text-sm text-muted-foreground">Your monthly fee status.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm rounded-xl border border-border/50 bg-card px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-muted-foreground">Paid</span>
          <span className="font-semibold">{paidCount}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-muted-foreground">Unpaid</span>
          <span className="font-semibold">{unpaidCount}</span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} size="sm" />
        <span className="text-muted-foreground text-xs">/ month</span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <CardTitle>Payment History</CardTitle>
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
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Month
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Paid Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id} className="border-b border-border/30 last:border-0">
                      <td className="px-5 py-3.5 font-medium text-sm">
                        {format(new Date(fee.year, fee.month - 1, 1), "MMMM yyyy")}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={fee.is_paid ? "success" : "warning"}>
                          {fee.is_paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {fee.paid_at ? format(new Date(fee.paid_at), "MMM d, yyyy") : "--"}
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
