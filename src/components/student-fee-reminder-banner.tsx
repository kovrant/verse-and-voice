"use client"

import { format } from "date-fns"
import { ArrowRight, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS, type FeePayment } from "@/lib/utils"

interface StudentFeeReminderBannerProps {
  studentId: string
  feeAmount: number
  feeCurrency: string
}

export function StudentFeeReminderBanner({
  studentId,
  feeAmount,
  feeCurrency,
}: StudentFeeReminderBannerProps) {
  const [currentFee, setCurrentFee] = useState<FeePayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthName = format(now, "MMMM")
  const dismissKey = `fee_dismissed_${studentId}_${currentYear}_${currentMonth}`

  useEffect(() => {
    // Check if dismissed in this session
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(dismissKey) === "1") {
          setDismissed(true)
          setLoading(false)
          return
        }
      } catch {
        // Ignore session storage errors
      }
    }

    let active = true
    supabase
      .from("fee_payments")
      .select("*")
      .eq("student_id", studentId)
      .eq("year", currentYear)
      .eq("month", currentMonth)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setCurrentFee(data as FeePayment | null)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [studentId, currentYear, currentMonth, dismissKey])

  function handleDismiss() {
    setDismissed(true)
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(dismissKey, "1")
      } catch {
        // Ignore
      }
    }
  }

  // Only show if fee is unpaid and not dismissed
  if (loading || dismissed) return null
  if (currentFee && currentFee.is_paid) return null
  if (feeAmount <= 0) return null

  const symbol = CURRENCY_SYMBOLS[feeCurrency] || feeCurrency
  const formattedFee = `${symbol}${feeAmount.toLocaleString()} ${feeCurrency}`

  return (
    <div
      role="region"
      aria-label="Monthly Fee Reminder for Parents"
      className="relative mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border-[1.5px] border-[hsl(var(--kid-saffron)/0.55)] bg-gradient-to-r from-[hsl(var(--kid-saffron)/0.2)] via-[hsl(var(--kid-saffron)/0.12)] to-[hsl(var(--kid-saffron)/0.06)] p-4 shadow-soft animate-fade-in"
    >
      {/* Left side: Icon + Content */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 pr-8 sm:pr-0">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-xs"
          style={{
            background: "hsl(var(--kid-saffron) / 0.32)",
            border: "1.5px solid hsl(var(--kid-saffron) / 0.65)",
          }}
        >
          🧾
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-foreground"
              style={{ background: "hsl(var(--kid-saffron) / 0.35)" }}
            >
              For Parents
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {monthName} {currentYear}
            </span>
          </div>

          <h2 className="font-heading text-[15px] font-extrabold text-foreground mt-0.5 leading-tight">
            Monthly Tuition Reminder
          </h2>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Fee for {monthName} is pending:{" "}
            <strong className="font-extrabold text-foreground">{formattedFee}</strong>
          </p>
        </div>
      </div>

      {/* Right side: View Details link & Dismiss (cross) button */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <Link
          href="/student/fees"
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold text-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:scale-95"
          style={{
            background: "hsl(var(--kid-saffron))",
            border: "1px solid hsl(var(--kid-saffron) / 0.8)",
          }}
        >
          <span>View Fee Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        {/* Cross button on mobile & desktop */}
        <button
          type="button"
          onClick={handleDismiss}
          title="Dismiss reminder"
          aria-label="Dismiss reminder"
          className="absolute sm:relative top-3.5 right-3.5 sm:top-auto sm:right-auto flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
