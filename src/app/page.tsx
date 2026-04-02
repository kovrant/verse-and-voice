"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { CURRENCY_SYMBOLS } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, CreditCard, AlertCircle, UserPlus, ArrowRight, TrendingUp } from "lucide-react"
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
  const [feesCollected, setFeesCollected] = useState(0)
  const [feesPending, setFeesPending] = useState(0)
  const [unpaidFees, setUnpaidFees] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)

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

    const paidFees = (fees || []).filter((f: any) => f.is_paid)
    const unpaid = (fees || []).filter((f: any) => !f.is_paid)
    const collected = paidFees.reduce((sum: number, f: any) => sum + (f.students?.fee || 0), 0)
    const pending = unpaid.reduce((sum: number, f: any) => sum + (f.students?.fee || 0), 0)

    setFeesCollected(collected)
    setFeesPending(pending)
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

  const statCards = [
    {
      label: "Active Students",
      value: activeStudents,
      icon: Users,
      color: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Total Students",
      value: totalStudents,
      icon: UserPlus,
      color: "from-blue-500 to-indigo-600",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
    },
    {
      label: "Collected This Month",
      value: `${feesCollected.toLocaleString()}`,
      prefix: "PKR ",
      icon: TrendingUp,
      color: "from-emerald-500 to-green-600",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Pending This Month",
      value: `${feesPending.toLocaleString()}`,
      prefix: "PKR ",
      icon: AlertCircle,
      color: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient-gold">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Quran Academy &middot; {currentMonth}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="group relative overflow-hidden hover:border-border">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {stat.prefix && <span className="text-lg font-medium text-muted-foreground">{stat.prefix}</span>}
                {stat.value}
              </div>
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.guardian_name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">
                      {CURRENCY_SYMBOLS[s.fee_currency]}{s.fee.toLocaleString()}
                    </span>
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 text-sm font-bold">
                        {(f.students as any)?.name?.charAt(0)}
                      </div>
                      <p className="font-medium text-sm">{(f.students as any)?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {CURRENCY_SYMBOLS[(f.students as any)?.fee_currency || "PKR"]}
                        {((f.students as any)?.fee || 0).toLocaleString()}
                      </span>
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
