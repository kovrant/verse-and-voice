"use client"

import { Download } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

import { loadReport, type ReportData, ReportSheet } from "@/components/monthly-report-sheet"
import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  defaultReportMonth,
  formatReportMonth,
  parseReportMonth,
  pktDateKey,
} from "@/lib/monthly-report"
import { supabase } from "@/lib/supabase"

export default function AllReportsPage() {
  return (
    <Suspense fallback={<PageLoading variant="detail" />}>
      <AllReports />
    </Suspense>
  )
}

/** Every active student's monthly report, one per printed page, for a single "Save as PDF". */
function AllReports() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const month = parseReportMonth(searchParams.get("month")) ?? defaultReportMonth()
  const monthKey = formatReportMonth(month)
  const [reports, setReports] = useState<ReportData[] | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    let active = true
    setReports(null)
    void (async () => {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("status", "Reading")
        .order("name")
      const ids = (data || []).map((s) => s.id as string)
      if (active) setProgress({ done: 0, total: ids.length })
      // ponytail: one loadReport per student (~13 small queries each) — fine for a
      // roster of tens; batch the queries by month if the roster grows to hundreds.
      const results = await Promise.all(
        ids.map((id) =>
          loadReport(id, month).then((r) => {
            if (active) setProgress((p) => ({ ...p, done: p.done + 1 }))
            return r
          }),
        ),
      )
      if (active) setReports(results.filter((r): r is ReportData => r !== null))
    })()
    return () => {
      active = false
    }
    // monthKey captures `month`; the object itself is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Monthly Reports</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every active student&rsquo;s report, one per page. Choose &ldquo;Save as PDF&rdquo; in
            the print window.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label="Report month"
            value={monthKey}
            max={pktDateKey(new Date()).slice(0, 7)}
            onChange={(e) => {
              if (parseReportMonth(e.target.value))
                router.replace(`/reports?month=${e.target.value}`)
            }}
            className="h-9 w-[150px]"
          />
          <Button size="sm" onClick={() => window.print()} disabled={!reports?.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download all ({reports?.length ?? "…"})
          </Button>
        </div>
      </div>

      {!reports ? (
        <div className="print:hidden">
          <p className="text-sm text-muted-foreground">
            Preparing reports… {progress.total > 0 && `${progress.done} of ${progress.total}`}
          </p>
          <PageLoading variant="detail" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active students.</p>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {reports.map((r) => (
            // Each report starts on a new printed page.
            <div key={r.student.id} className="break-after-page last:break-after-auto">
              <ReportSheet data={r} month={month} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
