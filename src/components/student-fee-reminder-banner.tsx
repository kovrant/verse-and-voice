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
    // Clear any stale sessionStorage key from previous sessions
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(dismissKey)
      } catch {
        // Ignore
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
    // Dismiss only for the current view. Will reappear on next redirect, visit, or login.
    setDismissed(true)
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
      aria-label="Monthly Tuition Reminder for Parents"
      className="animate-banner-glow relative mb-5 rounded-2xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-400/25 via-amber-300/15 to-orange-400/10 dark:from-amber-950/45 dark:via-amber-900/25 dark:to-orange-950/20 p-4 sm:p-5 shadow-lg animate-fade-in"
    >
      {/* Cross dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        title="Dismiss note for now"
        aria-label="Dismiss note for now"
        className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground transition-colors z-10"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left side: Animated Bell Icon + Content */}
        <div className="flex items-start gap-3.5 min-w-0 pr-6 sm:pr-0">
          {/* Animated Bell with Alert Dot */}
          <div className="relative shrink-0 mt-0.5">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm"
              style={{
                background: "hsl(var(--kid-saffron) / 0.35)",
                border: "2px solid hsl(var(--kid-saffron))",
              }}
            >
              <span className="animate-bell-ring inline-block">🔔</span>
            </span>

            {/* Pulsing Alert Beacon */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-background" />
            </span>
          </div>

          <div className="min-w-0">
            {/* Top Alert Pill */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide bg-amber-400 text-stone-950 shadow-xs">
                <span>📢</span> Note for Mom &amp; Dad
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {monthName} {currentYear}
              </span>
            </div>

            {/* Main Headline for Kid */}
            <h2 className="font-heading text-base sm:text-lg font-black text-foreground mt-1 leading-snug">
              Please show this to Mom or Dad! 👨‍👩‍👧
            </h2>

            {/* Fee Pill & Friendly Instruction */}
            <p className="text-xs font-medium text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Tuition for {monthName} is pending:</span>
              <span className="inline-flex items-center rounded-lg bg-amber-400/25 border border-amber-500/50 px-2 py-0.5 font-heading text-xs font-black text-foreground shadow-2xs">
                {formattedFee}
              </span>
            </p>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-1">
              👉 Please ask your parents to check this note after class today!
            </p>
          </div>
        </div>

        {/* Right side: Action CTA */}
        <div className="flex items-center self-end sm:self-center shrink-0 w-full sm:w-auto">
          <Link
            href="/student/fees"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 active:scale-95 px-4 py-2.5 font-heading text-xs sm:text-sm font-extrabold text-stone-950 shadow-md hover:shadow-lg transition-all"
          >
            <span>Show Mom &amp; Dad</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
