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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      label: "Active Students",
      value: activeStudents,
      icon: Users,
    },
    {
      label: "Online Now",
      value: onlineIds.size,
      icon: Wifi,
    },
    {
      label: "Collected This Month",
      value: `${feesCollected.toLocaleString()}`,
      prefix: "Rs",
      icon: TrendingUp,
      breakdown: collectedByCurrency,
    },
    {
      label: "Pending This Month",
      value: `${feesPending.toLocaleString()}`,
      prefix: "Rs",
      icon: AlertCircle,
      breakdown: pendingByCurrency,
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to <Brand /> &middot; {currentMonth}
        </p>
      </div>

      {totalStudents === 0 && (
        <Card className="relative overflow-hidden bg-card border border-border">
          <CardContent className="relative pt-8 pb-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">
                Welcome to <Brand />
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Get started in 3 simple steps</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto">
              <Link href="/students/new">
                <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted transition-all cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground flex-shrink-0">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Add Students</p>
                    <p className="text-[11px] text-muted-foreground">Register your first student</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
              <Link href="/media">
                <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted transition-all cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground flex-shrink-0">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Upload Quran</p>
                    <p className="text-[11px] text-muted-foreground">Add Quran para PDFs</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
              <Link href="/memorization">
                <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted transition-all cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground flex-shrink-0">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Set Up Catalog</p>
                    <p className="text-[11px] text-muted-foreground">Add surahs & duas</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card
            key={stat.label}
            className="group relative overflow-hidden bg-card border border-border animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <stat.icon className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number text-3xl tracking-tight tabular-nums text-foreground">
                {stat.prefix && (
                  <span className="text-lg font-medium text-muted-foreground mr-2">{stat.prefix}</span>
                )}
                {stat.value}
              </div>
              {stat.breakdown && Object.keys(stat.breakdown).length > 0 && (
                <div className="flex flex-wrap gap-x-2 mt-1">
                  {Object.entries(stat.breakdown).map(([c, amt]) => (
                    <span key={c} className="text-[11px] text-muted-foreground">
                      {CURRENCY_SYMBOLS[c]}
                      {amt.toLocaleString()}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Quota & Elevated Action Hub */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <GeminiQuotaCard variant="dashboard" className="h-full" />

        <Card className="flex flex-col justify-between border border-border/80 shadow-soft">
          <CardHeader className="pb-2.5 pt-4 px-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold tracking-tight">
                  Quick Actions
                </CardTitle>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Common classroom shortcuts &amp; academy tools
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                Shortcuts
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-5 pb-4 pt-1 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <Link
                href="/class"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    Start a Class
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Live 1-on-1 session</p>
                </div>
              </Link>

              <Link
                href="/students/new"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:scale-105 transition-transform shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    Add Student
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Register new learner</p>
                </div>
              </Link>

              <Link
                href="/students"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:scale-105 transition-transform shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    All Students
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Manage {totalStudents} enrolled</p>
                </div>
              </Link>

              <Link
                href="/history"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-teal-500/10 hover:border-teal-500/30 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-500 group-hover:scale-105 transition-transform shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground group-hover:text-teal-500 transition-colors truncate">
                    Story Studio
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Islamic stories &amp; AI</p>
                </div>
              </Link>

              <Link
                href="/quizzes"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground group-hover:text-amber-500 transition-colors truncate">
                    Quiz Studio
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Review &amp; assign</p>
                </div>
              </Link>

              <Link
                href="/media"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:scale-105 transition-transform shrink-0">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    Media Library
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Quran paras &amp; assets</p>
                </div>
              </Link>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Looking for AI logs and token limits?</span>
              <Link href="/ai-usage" className="inline-flex items-center text-primary font-semibold hover:underline">
                AI Quota Details &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TeacherActivityFeed onFeePaid={() => void loadDashboard()} />
        </div>

        <div className="space-y-6">
          <TeacherOnlinePanel />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Fees due</CardTitle>
              <Link href="/fees">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {unpaidFees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  All fees collected for {currentMonth}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {unpaidFees.slice(0, 5).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium truncate pr-2">{f.students?.name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <FeeDisplay
                          amount={f.students?.fee || 0}
                          currency={f.students?.fee_currency || "PKR"}
                          rates={rates}
                        />
                        <Badge variant="warning" className="text-[10px]">
                          Unpaid
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {unpaidFees.length > 5 && (
                    <Link href="/fees" className="block pt-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View all {unpaidFees.length} unpaid
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
