"use client"

import { format } from "date-fns"
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  ChevronRight,
  CreditCard,
  Sparkles,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Brand } from "@/components/brand"
import { FeeDisplay } from "@/components/fee-display"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { convertToPKR, useExchangeRates } from "@/lib/exchange-rates"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS } from "@/lib/utils"

interface Student {
  id: string
  name: string
  guardian_name: string
  fee: number
  fee_currency: string
  created_at: string
}

interface FeePayment {
  id: string
  student_id: string
  is_paid: boolean
  students: { name: string; fee: number; fee_currency: string; status: string }
}

export default function Dashboard() {
  const [totalStudents, setTotalStudents] = useState(0)
  const [activeStudents, setActiveStudents] = useState(0)
  const [recentStudents, setRecentStudents] = useState<Student[]>([])
  const [paidFees, setPaidFees] = useState<FeePayment[]>([])
  const [unpaidFees, setUnpaidFees] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const { rates } = useExchangeRates()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Ensure this month's fee rows exist for active students. Without this the
    // dashboard shows "All Clear!" / Rs0 pending at the start of a month until
    // someone opens /fees (which is what creates the rows).
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

    const [{ count: total }, { count: active }, { data: recent }, { data: fees }] =
      await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("status", "Reading"),
        supabase.from("students").select("*").order("created_at", { ascending: false }).limit(5),
        supabase
          .from("fee_payments")
          .select("*, students(name, fee, fee_currency, status)")
          .eq("month", month)
          .eq("year", year),
      ])

    setTotalStudents(total || 0)
    setActiveStudents(active || 0)
    setRecentStudents(recent || [])

    // Only count fees for active ("Reading") students — mirrors the Fees page —
    // so departed students don't show up in Collected/Pending this month.
    const activeFees = (fees || []).filter((f: any) => f.students?.status === "Reading")
    const paid = activeFees.filter((f: any) => f.is_paid)
    const unpaid = activeFees.filter((f: any) => !f.is_paid)

    setPaidFees(paid as any)
    setUnpaidFees(unpaid as any)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-8 w-48 shimmer rounded-lg" />
          <div className="h-5 w-72 shimmer rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 shimmer rounded-2xl" />
          <div className="h-64 shimmer rounded-2xl" />
        </div>
      </div>
    )
  }

  const now = new Date()
  const currentMonth = format(now, "MMMM yyyy")

  // Returns null when conversion isn't possible yet (rates loading / unknown
  // currency), so foreign amounts aren't added as raw PKR before rates resolve.
  function toPKR(fee: number, currency: string): number | null {
    if (currency === "PKR") return fee
    return convertToPKR(fee, currency, rates)
  }

  const sumPKR = (list: FeePayment[]) =>
    list.reduce((sum, f: any) => {
      const v = toPKR(f.students?.fee || 0, f.students?.fee_currency || "PKR")
      return v == null ? sum : sum + v
    }, 0)

  const feesCollected = sumPKR(paidFees)
  const feesPending = sumPKR(unpaidFees)

  function currencyBreakdown(items: FeePayment[]) {
    const map: Record<string, number> = {}
    items.forEach((f: any) => {
      const c = f.students?.fee_currency || "PKR"
      map[c] = (map[c] || 0) + (f.students?.fee || 0)
    })
    return map
  }
  const collectedByCurrency = currencyBreakdown(paidFees)
  const pendingByCurrency = currencyBreakdown(unpaidFees)

  const statCards = [
    {
      label: "Active Students",
      value: activeStudents,
      icon: Users,
      iconBg: "bg-secondary",
      iconColor: "text-muted-foreground",
    },
    {
      label: "Total Students",
      value: totalStudents,
      icon: UserPlus,
      iconBg: "bg-secondary",
      iconColor: "text-muted-foreground",
    },
    {
      label: "Collected This Month",
      value: `${feesCollected.toLocaleString()}`,
      prefix: "Rs",
      icon: TrendingUp,
      iconBg: "bg-secondary",
      iconColor: "text-muted-foreground",
      breakdown: collectedByCurrency,
    },
    {
      label: "Pending This Month",
      value: `${feesPending.toLocaleString()}`,
      prefix: "Rs",
      icon: AlertCircle,
      iconBg: "bg-secondary",
      iconColor: "text-muted-foreground",
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

      {/* Onboarding — shown when no students exist */}
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

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="group relative overflow-hidden bg-card border border-border opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number text-3xl tracking-tight tabular-nums text-foreground">
                {stat.prefix && (
                  <span className="text-lg font-medium text-muted-foreground mr-2">
                    {stat.prefix}
                  </span>
                )}
                {stat.value}
              </div>
              {(stat as any).breakdown && Object.keys((stat as any).breakdown).length > 0 && (
                <div className="flex flex-wrap gap-x-2 mt-1">
                  {Object.entries((stat as any).breakdown as Record<string, number>).map(
                    ([c, amt]) => (
                      <span key={c} className="text-[11px] text-muted-foreground">
                        {CURRENCY_SYMBOLS[c]}
                        {(amt as number).toLocaleString()}
                      </span>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Students</CardTitle>
            <Link href="/students">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentStudents.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No students yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first student to get started
                </p>
                <Link href="/students/new">
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Student
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((s) => (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    className="group flex items-center justify-between rounded-xl border border-border/50 p-3.5 hover:bg-secondary/50 hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/40 text-primary text-sm font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.guardian_name}</p>
                      </div>
                    </div>
                    <FeeDisplay amount={s.fee} currency={s.fee_currency} rates={rates} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fees Due */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fees Due This Month</CardTitle>
            <Link href="/fees">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {unpaidFees.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <CreditCard className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="font-medium mb-1">All Clear!</p>
                <p className="text-sm text-muted-foreground">
                  All fees collected for {currentMonth}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {unpaidFees.slice(0, 6).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground text-sm font-bold">
                        {(f.students as any)?.name?.charAt(0)}
                      </div>
                      <p className="font-medium text-sm">{(f.students as any)?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <FeeDisplay
                        amount={(f.students as any)?.fee || 0}
                        currency={(f.students as any)?.fee_currency || "PKR"}
                        rates={rates}
                      />
                      <Badge variant="warning">Unpaid</Badge>
                    </div>
                  </div>
                ))}
                {unpaidFees.length > 6 && (
                  <Link href="/fees" className="block">
                    <Button variant="outline" size="sm" className="w-full mt-2">
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
  )
}
