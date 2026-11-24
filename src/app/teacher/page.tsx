"use client"

import { format } from "date-fns"
import { ArrowRight, GraduationCap, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { type ClassStudent } from "@/components/class-student-card"
import { ClassTodayAttendance } from "@/components/class-today-attendance"
import { FeeDisplay } from "@/components/fee-display"
import { PageLoading } from "@/components/page-loading"
import { TeacherActivityFeed } from "@/components/teacher-activity-feed"
import { TeacherOnlinePanel } from "@/components/teacher-online-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { sumFeesPKR, useExchangeRates } from "@/lib/exchange-rates"
import { supabase } from "@/lib/supabase"
import { useOnlineStudents } from "@/lib/use-online-students"
import { type FeePaymentWithStudent } from "@/lib/utils"

export default function TodayPage() {
  const router = useRouter()
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [unpaidFees, setUnpaidFees] = useState<FeePaymentWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const { rates } = useExchangeRates()
  const onlineIds = useOnlineStudents()

  const loadToday = useCallback(async () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data: active } = await supabase
      .from("students")
      .select(
        "id, name, guardian_name, started_at, class_time, class_days, qaida_media_id, gender, country",
      )
      .eq("status", "Reading")
      .order("name")

    // Every active student gets this month's fee row (the Fees page relies on it).
    const activeList = active || []
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
      .eq("is_paid", false)

    setStudents(activeList)
    setUnpaidFees(
      ((fees as FeePaymentWithStudent[]) || []).filter((f) => f.students?.status === "Reading"),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadToday()
  }, [loadToday])

  if (loading) return <PageLoading variant="dashboard" />

  const now = new Date()
  const currentMonth = format(now, "MMMM yyyy")
  const feesPending = sumFeesPKR(unpaidFees, rates)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary">Today</h1>
          <p className="text-sm leading-5 text-text-tertiary">
            {format(now, "EEEE, d MMMM")} · {onlineIds.size} online now
            {feesPending > 0 && (
              <>
                {" · "}
                <Link href="/teacher/fees" className="hover:text-text-primary hover:underline">
                  Rs {feesPending.toLocaleString()} fees pending
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href="/teacher/class">
          <Button variant="outline" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            Extra class
          </Button>
        </Link>
      </div>

      {students.length === 0 ? (
        <Card className="p-5">
          <p className="font-semibold leading-6 text-text-primary">Add your first student</p>
          <p className="text-sm text-text-tertiary">
            Their classes will show up here on the days you teach them.
          </p>
          <Link href="/teacher/students/new" className="mt-4 inline-block">
            <Button className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Add student
            </Button>
          </Link>
        </Card>
      ) : (
        <ClassTodayAttendance
          students={students}
          onlineIds={onlineIds}
          onStart={(id) => router.push(`/teacher/class?student=${id}&start=1`)}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TeacherActivityFeed onFeePaid={() => void loadToday()} />
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
