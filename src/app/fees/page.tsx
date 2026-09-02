"use client"

import { format } from "date-fns"
import { AlertCircle, Check, CheckCircle2, CreditCard, TrendingUp, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "@/lib/toast"

import { FeeDisplay } from "@/components/fee-display"
import { PageLoading } from "@/components/page-loading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SortableHeader, type SortDirection, toggleSort } from "@/components/ui/sortable-header"
import { feeCurrencyBreakdown, sumFeesPKR, useExchangeRates } from "@/lib/exchange-rates"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS, type FeePaymentWithStudent } from "@/lib/utils"

// Helper to get a nested sort value
function getFeeValue(fee: FeePaymentWithStudent, key: string): any {
  if (key === "student_name") return fee.students?.name
  if (key === "fee_amount") return fee.students?.fee
  if (key === "is_paid") return fee.is_paid ? 1 : 0
  if (key === "paid_at") return fee.paid_at || ""
  return (fee as any)[key]
}

export default function FeesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [fees, setFees] = useState<FeePaymentWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { rates } = useExchangeRates()

  const loadFees = useCallback(async () => {
    setLoading(true)

    const { data: students } = await supabase.from("students").select("id").eq("status", "Reading")

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
      .select("*, students(name, fee, fee_currency, status)")
      .eq("month", month)
      .eq("year", year)
      .order("created_at")

    const activeFees = (data || []).filter(
      (f: any) => f.students?.status === "Reading",
    ) as FeePaymentWithStudent[]

    setFees(activeFees)
    setLoading(false)
    setPage(1)
  }, [month, year])

  useEffect(() => {
    loadFees()
  }, [loadFees])

  async function toggleFee(fee: FeePaymentWithStudent) {
    const newPaid = !fee.is_paid
    const paidAt = newPaid ? new Date().toISOString() : null

    // Optimistic update — only update the changed row
    setFees((prev) =>
      prev.map((f) => (f.id === fee.id ? { ...f, is_paid: newPaid, paid_at: paidAt } : f)),
    )

    const { error } = await supabase
      .from("fee_payments")
      .update({ is_paid: newPaid, paid_at: paidAt })
      .eq("id", fee.id)

    if (error) {
      // Roll back the optimistic change so the UI doesn't diverge from the DB.
      setFees((prev) =>
        prev.map((f) =>
          f.id === fee.id ? { ...f, is_paid: fee.is_paid, paid_at: fee.paid_at } : f,
        ),
      )
      toast.error(`Couldn't update payment: ${error.message}`)
      return
    }

    if (newPaid) {
      void fetch("/api/notify/fee-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: fee.student_id, month: fee.month, year: fee.year }),
      })
    }
  }

  // Custom sort for nested fields
  const sorted =
    sortKey && sortDir
      ? [...fees].sort((a, b) => {
          const aVal = getFeeValue(a, sortKey)
          const bVal = getFeeValue(b, sortKey)
          if (aVal == null && bVal == null) return 0
          if (aVal == null) return sortDir === "asc" ? -1 : 1
          if (bVal == null) return sortDir === "asc" ? 1 : -1
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDir === "asc" ? aVal - bVal : bVal - aVal
          }
          const cmp = String(aVal).localeCompare(String(bVal))
          return sortDir === "asc" ? cmp : -cmp
        })
      : fees

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  function handleSort(key: string) {
    const result = toggleSort(sortKey, sortDir, key)
    setSortKey(result.direction ? result.key : null)
    setSortDir(result.direction)
    setPage(1)
  }

  const paidCount = fees.filter((f) => f.is_paid).length

  const paidFees = fees.filter((f) => f.is_paid)
  const unpaidFees = fees.filter((f) => !f.is_paid)

  const totalCollectedPKR = sumFeesPKR(paidFees, rates)
  const totalPendingPKR = sumFeesPKR(unpaidFees, rates)

  const collectedByCurrency = feeCurrencyBreakdown(paidFees)
  const pendingByCurrency = feeCurrencyBreakdown(unpaidFees)

  const years = []
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    years.push(y)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-foreground">Fee Management</span>
        </h1>
        <p className="text-muted-foreground mt-1">Track and manage monthly fee payments</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>
                {format(new Date(2000, i, 1), "MMMM")}
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
        <Button
          variant={
            month === now.getMonth() + 1 && year === now.getFullYear() ? "default" : "outline"
          }
          size="sm"
          onClick={() => {
            setMonth(now.getMonth() + 1)
            setYear(now.getFullYear())
          }}
        >
          This Month
        </Button>
        <Button
          variant={
            (() => {
              const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              return month === prev.getMonth() + 1 && year === prev.getFullYear()
            })()
              ? "default"
              : "outline"
          }
          size="sm"
          onClick={() => {
            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            setMonth(prev.getMonth() + 1)
            setYear(prev.getFullYear())
          }}
        >
          Last Month
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group relative overflow-hidden hover:border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Payment Status
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <CheckCircle2 className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {paidCount}{" "}
              <span className="text-base font-normal text-muted-foreground">
                of {fees.length} paid
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Collected
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">
              Rs{totalCollectedPKR.toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-x-2 mt-1">
              {Object.entries(collectedByCurrency).map(([c, amt]) => (
                <span key={c} className="text-[11px] text-muted-foreground">
                  {CURRENCY_SYMBOLS[c]}
                  {amt.toLocaleString()}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Pending
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <AlertCircle className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              Rs{totalPendingPKR.toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-x-2 mt-1">
              {Object.entries(pendingByCurrency).map(([c, amt]) => (
                <span key={c} className="text-[11px] text-muted-foreground">
                  {CURRENCY_SYMBOLS[c]}
                  {amt.toLocaleString()}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Records */}
      {loading ? (
        <PageLoading variant="rows" count={4} />
      ) : fees.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">No fee records</p>
            <p className="text-sm text-muted-foreground">
              No active students found for {format(new Date(year, month - 1, 1), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            {paginated.map((fee) => (
              <Card key={fee.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 bg-secondary text-muted-foreground">
                        {fee.students?.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{fee.students?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <FeeDisplay
                            amount={fee.students?.fee || 0}
                            currency={fee.students?.fee_currency || "PKR"}
                            rates={rates}
                          />
                          <Badge variant={fee.is_paid ? "success" : "warning"}>
                            {fee.is_paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={fee.is_paid ? "outline" : "default"}
                      onClick={() => toggleFee(fee)}
                      className="flex-shrink-0"
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th scope="col" className="px-5 py-4 text-left">
                      <SortableHeader
                        label="Student"
                        sortKey="student_name"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-4 text-left">
                      <SortableHeader
                        label="Fee Amount"
                        sortKey="fee_amount"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-4 text-left">
                      <SortableHeader
                        label="Status"
                        sortKey="is_paid"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-4 text-left">
                      <SortableHeader
                        label="Paid Date"
                        sortKey="paid_at"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((fee) => (
                    <tr
                      key={fee.id}
                      className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 bg-secondary text-muted-foreground">
                            {fee.students?.name?.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{fee.students?.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <FeeDisplay
                          amount={fee.students?.fee || 0}
                          currency={fee.students?.fee_currency || "PKR"}
                          rates={rates}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={fee.is_paid ? "success" : "warning"}>
                          {fee.is_paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {fee.paid_at ? format(new Date(fee.paid_at), "MMM d, yyyy h:mm a") : "--"}
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

          {sorted.length > pageSize && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={sorted.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s)
                  setPage(1)
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
