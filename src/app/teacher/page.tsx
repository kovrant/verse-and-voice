"use client"

import { format } from "date-fns"
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Wifi,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { Brand } from "@/components/brand"
import { FeeDisplay } from "@/components/fee-display"
import { GeminiQuotaCard } from "@/components/gemini-quota-card"
import { PageLoading } from "@/components/page-loading"
import { TeacherActivityFeed } from "@/components/teacher-activity-feed"
import { TeacherOnlinePanel } from "@/components/teacher-online-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { feeCurrencyBreakdown, sumFeesPKR, useExchangeRates } from "@/lib/exchange-rates"
import { supabase } from "@/lib/supabase"
import { useOnlineStudents } from "@/lib/use-online-students"
import { CURRENCY_SYMBOLS, type FeePaymentWithStudent } from "@/lib/utils"

export default function Dashboard() {
  const [activeStudents, setActiveStudents] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [paidFees, setPaidFees] = useState<FeePaymentWithStudent[]>([])
  const [unpaidFees, setUnpaidFees] = useState<FeePaymentWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const { rates } = useExchangeRates()
  const onlineIds = useOnlineStudents()

  const loadDashboard = useCallback(async () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const [{ count: total }, { data: activeForFees }] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("id").eq("status", "Reading"),
    ])

    const activeList = activeForFees || []
    if (activeList.length > 0) {
      await supabase.from("fee_payments").upsert(
        activeList.map((s) => ({ student_id: s.id, month, year })),
        { onConflict: "student_id,month,year", ignoreDuplicates: true },
      )
    }

    const { data: fees } = await supabase
      .from("fee_payments")
      .select("*, students(name, fee, fee_currency, status)")
      .eq("month", month)
      .eq("year", year)

    setTotalStudents(total || 0)
    setActiveStudents(activeList.length)

    const activeFees = ((fees as FeePaymentWithStudent[]) || []).filter(
      (f) => f.students?.status === "Reading",
    )
    setPaidFees(activeFees.filter((f) => f.is_paid))
    setUnpaidFees(activeFees.filter((f) => !f.is_paid))
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (loading) return <PageLoading variant="dashboard" />

  const now = new Date()
  const currentMonth = format(now, "MMMM yyyy")

  const feesCollected = sumFeesPKR(paidFees, rates)
  const feesPending = sumFeesPKR(unpaidFees, rates)
  const collectedByCurrency = feeCurrencyBreakdown(paidFees)
  const pendingByCurrency = feeCurrencyBreakdown(unpaidFees)

  const statCards = [
    {
      label: "Active students",
      value: activeStudents.toLocaleString(),
      icon: Users,
      tint: "bg-[rgba(59,130,246,0.10)] text-[#3B82F6]",
    },
    {
      label: "Online now",
      value: onlineIds.size.toLocaleString(),
      icon: Wifi,
      tint: "bg-[rgba(168,85,247,0.10)] text-[#A855F7]",
    },
    {
      label: "Collected this month",
      value: feesCollected.toLocaleString(),
      prefix: "Rs",
      icon: TrendingUp,
      tint: "bg-[rgba(34,197,94,0.10)] text-[#22C55E]",
      breakdown: collectedByCurrency,
    },
    {
      label: "Pending this month",
      value: feesPending.toLocaleString(),
      prefix: "Rs",
      icon: AlertCircle,
      tint: "bg-[rgba(249,115,22,0.10)] text-[#F97316]",
      breakdown: pendingByCurrency,
    },
  ]

  const quickActions = [
    {
      href: "/teacher/class",
      label: "Start a class",
      hint: "Live 1-on-1 session",
      icon: GraduationCap,
      tint: "bg-[rgba(87,80,241,0.10)] text-[#5750F1]",
    },
    {
      href: "/teacher/students/new",
      label: "Add student",
      hint: "Register a new learner",
      icon: UserPlus,
      tint: "bg-[rgba(59,130,246,0.10)] text-[#3B82F6]",
    },
    {
      href: "/teacher/students",
      label: "All students",
      hint: `Manage ${totalStudents} enrolled`,
      icon: Users,
      tint: "bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]",
    },
    {
      href: "/teacher/history",
      label: "Story studio",
      hint: "Islamic stories & AI",
      icon: BookOpen,
      tint: "bg-[rgba(34,197,94,0.10)] text-[#22C55E]",
    },
    {
      href: "/teacher/quizzes",
      label: "Quiz studio",
      hint: "Review & assign",
      icon: Sparkles,
      tint: "bg-[rgba(249,115,22,0.10)] text-[#F97316]",
    },
    {
      href: "/teacher/media",
      label: "Media library",
      hint: "Quran paras & assets",
      icon: Upload,
      tint: "bg-[rgba(168,85,247,0.10)] text-[#A855F7]",
    },
  ]

  const setupSteps = [
    {
      href: "/teacher/students/new",
      label: "Add students",
      hint: "Register your first student",
      icon: UserPlus,
    },
    { href: "/teacher/media", label: "Upload Quran", hint: "Add Quran para PDFs", icon: Upload },
    {
      href: "/teacher/memorization",
      label: "Set up catalog",
      hint: "Add surahs & duas",
      icon: BookMarked,
    },
  ]

  return (
    <div className="space-y-5">
      {/* NextAdmin page header */}
      <div>
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">Dashboard</h1>
        <p className="text-sm leading-5 text-text-tertiary">
          Welcome to <Brand /> &middot; {currentMonth}
        </p>
      </div>

      {totalStudents === 0 && (
        <Card className="p-5">
          <p className="font-semibold leading-6 text-text-primary">Get started in 3 steps</p>
          <p className="text-sm text-text-tertiary">Set up the academy before your first class.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {setupSteps.map((step) => (
              <Link
                key={step.href}
                href={step.href}
                className="group flex items-center gap-3 rounded-lg border border-card-border p-3 transition-colors hover:bg-background-gray-primary"
              >
                <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-background-gray-secondary text-icon-secondary">
                  <step.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-primary">{step.label}</span>
                  <span className="block truncate text-xs text-text-tertiary">{step.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-icon-tertiary" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <span className={`flex size-8 items-center justify-center rounded-lg ${stat.tint}`}>
              <stat.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="mb-1 mt-6 text-xl font-semibold leading-7 tabular-nums text-text-primary md:text-2xl md:leading-8">
              {stat.prefix && (
                <span className="mr-1.5 text-base font-medium text-text-tertiary">
                  {stat.prefix}
                </span>
              )}
              {stat.value}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium leading-5 text-text-tertiary">{stat.label}</span>
              {stat.breakdown && Object.keys(stat.breakdown).length > 0 && (
                <span className="flex flex-wrap gap-x-2 text-xs text-text-tertiary">
                  {Object.entries(stat.breakdown).map(([c, amt]) => (
                    <span key={c}>
                      {CURRENCY_SYMBOLS[c]}
                      {amt.toLocaleString()}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <GeminiQuotaCard variant="dashboard" className="h-full" />

        <Card className="flex flex-col p-5">
          <p className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
            Quick actions
          </p>
          <p className="text-sm text-text-tertiary">Classroom shortcuts and academy tools</p>

          <div className="mt-5 grid flex-1 grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3 rounded-lg border border-card-border p-3 transition-colors hover:bg-background-gray-primary"
              >
                <span
                  className={`flex size-8 flex-shrink-0 items-center justify-center rounded-lg ${a.tint}`}
                >
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {a.label}
                  </span>
                  <span className="block truncate text-xs text-text-tertiary">{a.hint}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border-primary pt-4 text-xs text-text-tertiary">
            <span>Looking for AI logs and token limits?</span>
            <Link
              href="/teacher/ai-usage"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              AI usage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TeacherActivityFeed onFeePaid={() => void loadDashboard()} />
        </div>

        <div className="space-y-5">
          <TeacherOnlinePanel />

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">
                Fees due
              </p>
              <Link
                href="/teacher/fees"
                className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {unpaidFees.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-tertiary">
                All fees collected for {currentMonth}
              </p>
            ) : (
              <ul className="mt-4">
                {unpaidFees.slice(0, 5).map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 border-b border-border-primary py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <p className="truncate text-sm font-medium text-text-primary">
                      {f.students?.name}
                    </p>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <FeeDisplay
                        amount={f.students?.fee || 0}
                        currency={f.students?.fee_currency || "PKR"}
                        rates={rates}
                      />
                      <Badge variant="warning" className="text-[11px]">
                        Unpaid
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {unpaidFees.length > 5 && (
              <Link href="/teacher/fees" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  View all {unpaidFees.length} unpaid
                </Button>
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
