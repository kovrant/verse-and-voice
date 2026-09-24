"use client"

import { format } from "date-fns"
import { useEffect, useState } from "react"

import { FeeDisplay } from "@/components/fee-display"
import { KidCard, KidEmpty, KidPageHeader, KidStat } from "@/components/kid-ui"
import { PageLoading } from "@/components/page-loading"
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

  if (loading || loadingFees || !student) return <PageLoading variant="student-simple" student />

  const paidCount = fees.filter((f) => f.is_paid).length
  const unpaidCount = fees.filter((f) => !f.is_paid).length

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🧾"
        color="sky"
        title="Fees"
        subtitle="Your monthly fee — this page is for your parents."
      />

      {/* Monthly fee + how the months stand */}
      <KidCard color="sky" className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              Monthly fee
            </p>
            <div className="mt-1">
              <FeeDisplay
                amount={student.fee}
                currency={student.fee_currency}
                rates={rates}
                size="lg"
                kid
              />
            </div>
          </div>
          <p className="text-[14px] font-bold text-foreground/85">per month</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <KidStat emoji="✅" value={paidCount} label="Months paid" color="sage" />
          <KidStat emoji="⏳" value={unpaidCount} label="Not paid yet" color="saffron" />
        </div>

        {unpaidCount > 0 && (
          <p className="mt-3.5 rounded-[16px] border-[1.5px] border-[hsl(var(--kid-saffron)/0.5)] bg-[hsl(var(--kid-saffron)/0.22)] px-3.5 py-2.5 text-[14px] font-bold text-foreground">
            {unpaidCount === 1 ? "1 month is" : `${unpaidCount} months are`} still to be paid. The
            months are listed below.
          </p>
        )}
      </KidCard>

      {/* Month by month */}
      <div className="mb-3 flex items-center gap-2.5">
        <span aria-hidden className="text-[22px] leading-none">
          📅
        </span>
        <h2 className="font-heading text-[22px] font-bold text-primary">Month by month</h2>
      </div>

      {fees.length === 0 ? (
        <KidEmpty
          title="No fee records yet"
          text="When your teacher records a monthly fee, it will show up here."
        />
      ) : (
        <ul className="space-y-3">
          {fees.map((fee) => (
            <li key={fee.id}>
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border-[1.5px] p-3.5"
                style={{
                  borderColor: `hsl(var(--kid-${fee.is_paid ? "sage" : "saffron"}) / 0.45)`,
                  background: `linear-gradient(160deg, hsl(var(--kid-${
                    fee.is_paid ? "sage" : "saffron"
                  }) / 0.2), hsl(var(--kid-${
                    fee.is_paid ? "sage" : "saffron"
                  }) / 0.07)), hsl(var(--card))`,
                  boxShadow: "0 4px 12px rgba(61, 64, 91, 0.08)",
                }}
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-[22px]"
                  style={{
                    background: `hsl(var(--kid-${fee.is_paid ? "sage" : "saffron"}) / 0.35)`,
                  }}
                >
                  {fee.is_paid ? "✅" : "⏳"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-[18px] font-bold leading-tight text-primary">
                    {format(new Date(fee.year, fee.month - 1, 1), "MMMM yyyy")}
                  </span>
                  <span className="block text-[13px] font-semibold text-foreground/85">
                    {fee.is_paid
                      ? fee.paid_at
                        ? `Paid on ${format(new Date(fee.paid_at), "MMM d, yyyy")}`
                        : "Paid"
                      : "Not paid yet"}
                  </span>
                </span>
                <span
                  className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold text-foreground"
                  style={{
                    background: `hsl(var(--kid-${fee.is_paid ? "sage" : "saffron"}) / 0.45)`,
                  }}
                >
                  {fee.is_paid ? "Paid" : "Unpaid"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
