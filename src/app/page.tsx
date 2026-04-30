"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS } from "@/lib/utils"
import { useExchangeRates, convertToPKR } from "@/lib/exchange-rates"
import { FeeDisplay } from "@/components/fee-display"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, CreditCard, AlertCircle, UserPlus, ArrowRight, TrendingUp, BookOpen, Upload, BookMarked, Sparkles, ChevronRight } from "lucide-react"
import { format } from "date-fns"

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
  students: { name: string; fee: number; fee_currency: string }
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

    const [
      { count: total },
      { count: active },
      { data: recent },
      { data: fees },
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "Reading"),
      supabase.from("students").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("fee_payments").select("*, students(name, fee, fee_currency)").eq("month", month).eq("year", year),
    ])

    setTotalStudents(total || 0)
    setActiveStudents(active || 0)
    setRecentStudents(recent || [])

    const paid = (fees || []).filter((f: any) => f.is_paid)
    const unpaid = (fees || []).filter((f: any) => !f.is_paid)

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

  function toPKR(fee: number, currency: string): number {
    const pkr = convertToPKR(fee, currency, rates)
    return pkr !== null ? pkr : fee
  }

  const feesCollected = paidFees.reduce((sum, f: any) =>
    sum + toPKR(f.students?.fee || 0, f.students?.fee_currency || "PKR"), 0)
  const feesPending = unpaidFees.reduce((sum, f: any) =>
    sum + toPKR(f.students?.fee || 0, f.students?.fee_currency || "PKR"), 0)

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
      color: "from-emerald-500 to-teal-600",
      iconBg: "bg-secondary/50",
      iconColor: "text-primary",
    },
    {
      label: "Total Students",
      value: totalStudents,
      icon: UserPlus,
      color: "from-blue-500 to-indigo-600",
      iconBg: "bg-secondary/50",
      iconColor: "text-primary",
    },
    {
      label: "Collected This Month",
      value: `${feesCollected.toLocaleString()}`,
      prefix: "Rs",
      icon: TrendingUp,
      color: "from-emerald-500 to-green-600",
      iconBg: "bg-secondary/50",
      iconColor: "text-primary",
      breakdown: collectedByCurrency,
    },
    {
      label: "Pending This Month",
      value: `${feesPending.toLocaleString()}`,
      prefix: "Rs",
      icon: AlertCircle,
      color: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-300/60",
      iconColor: "text-amber-600",
      breakdown: pendingByCurrency,
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Quran Academy &middot; {currentMonth}
        </p>
      </div>

      {/* Onboarding — shown when no students exist */}
      {totalStudents === 0 && (
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />
          <div className="absolute inset-0 islamic-pattern opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
          <CardContent className="relative pt-8 pb-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold">Welcome to Quran Academy</h2>
              <p className="text-sm text-muted-foreground mt-1">Get started in 3 simple steps</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto">
              <Link href="/students/new">
                <div className="group flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 flex-shrink-0">
                    <UserPlus className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Add Students</p>
                    <p className="text-[11px] text-muted-foreground">Register your first student</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-400/50 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                </div>
              </Link>
              <Link href="/media">
                <div className="group flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 flex-shrink-0">
                    <Upload className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Upload Quran</p>
                    <p className="text-[11px] text-muted-foreground">Add Quran para PDFs</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-400/50 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                </div>
              </Link>
              <Link href="/memorization">
                <div className="group flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 flex-shrink-0">
                    <BookMarked className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Set Up Catalog</p>
                    <p className="text-[11px] text-muted-foreground">Add surahs & duas</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-400/50 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="group relative overflow-hidden opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300`} />
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
                {stat.prefix && <span className="text-lg font-medium text-muted-foreground mr-2">{stat.prefix}</span>}
                {stat.value}
              </div>
              {(stat as any).breakdown && Object.keys((stat as any).breakdown).length > 0 && (
                <div className="flex flex-wrap gap-x-2 mt-1">
                  {Object.entries((stat as any).breakdown as Record<string, number>).map(([c, amt]) => (
                    <span key={c} className="text-[11px] text-muted-foreground">
                      {CURRENCY_SYMBOLS[c]}{(amt as number).toLocaleString()}
                    </span>
                  ))}
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
                  <CreditCard className="h-6 w-6 text-emerald-400" />
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/60 text-amber-600 text-sm font-bold">
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
