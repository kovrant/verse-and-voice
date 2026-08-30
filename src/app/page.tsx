"use client"

import { format } from "date-fns"
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
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

    const { data: activeForFees } = await supabase
      .from("students")
      .select("id")
      .eq("status", "Reading")
    if (activeForFees && activeForFees.length > 0) {
      await supabase.from("fee_payments").upsert(
        activeForFees.map((s) => ({ student_id: s.id, month, year })),
        { onConflict: "student_id,month,year", ignoreDuplicates: true },
      )
    }

    const [{ count: total }, { count: active }, { data: fees }] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "Reading"),
      supabase
        .from("fee_payments")
        .select("*, students(name, fee, fee_currency, status)")
        .eq("month", month)
        .eq("year", year),
    ])

    setTotalStudents(total || 0)
    setActiveStudents(active || 0)

    const activeFees = (fees || []).filter((f: FeePaymentWithStudent) => f.students?.status === "Reading")
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
            className="group relative overflow-hidden bg-card border border-border opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/class">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="h-4 w-4 mr-2 opacity-60" />
                  Start a class
                </Button>
              </Link>
              <Link href="/students/new">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="h-4 w-4 mr-2 opacity-60" />
                  Add student
                </Button>
              </Link>
              <Link href="/students">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2 opacity-60" />
                  All students ({totalStudents})
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
