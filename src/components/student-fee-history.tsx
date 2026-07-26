"use client"

import { format } from "date-fns"
import { Check, CreditCard, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { SortableHeader, type SortDirection } from "@/components/ui/sortable-header"
import type { FeePayment } from "@/lib/utils"

export function FeeHistoryTable({
  fees,
  sortKey,
  sortDir,
  page,
  pageSize,
  onSort,
  onPageChange,
  onToggleFee,
}: {
  fees: FeePayment[]
  sortKey: string | null
  sortDir: SortDirection
  page: number
  pageSize: number
  onSort: (key: string) => void
  onPageChange: (page: number) => void
  onToggleFee: (fee: FeePayment) => void
}) {
  function getFeeSort(fee: FeePayment, key: string): string | number | null {
    if (key === "month_year") return fee.year * 100 + fee.month
    if (key === "is_paid") return fee.is_paid ? 1 : 0
    if (key === "paid_at") return fee.paid_at || ""
    return null
  }

  const sorted =
    sortKey && sortDir
      ? [...fees].sort((a, b) => {
          const aVal = getFeeSort(a, sortKey)
          const bVal = getFeeSort(b, sortKey)
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

  return (
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th scope="col" className="px-5 py-3 text-left">
                      <SortableHeader
                        label="Month"
                        sortKey="month_year"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={onSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-3 text-left">
                      <SortableHeader
                        label="Status"
                        sortKey="is_paid"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={onSort}
                      />
                    </th>
                    <th scope="col" className="px-5 py-3 text-left">
                      <SortableHeader
                        label="Paid Date"
                        sortKey="paid_at"
                        currentSort={sortKey}
                        currentDirection={sortDir}
                        onSort={onSort}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider"
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
                      <td className="px-5 py-3.5 font-medium text-sm">
                        {format(new Date(fee.year, fee.month - 1, 1), "MMMM yyyy")}
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
                          onClick={() => onToggleFee(fee)}
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
            {sorted.length > pageSize && (
              <div className="pt-4 border-t border-border/50">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={sorted.length}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
