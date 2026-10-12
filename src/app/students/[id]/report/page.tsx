"use client"

import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={<PageLoading variant="detail" />}>
      <MonthlyReport />
    </Suspense>
  )
}

function MonthlyReport() {
  const params = useParams()
  const studentId = params.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const month = parseReportMonth(searchParams.get("month")) ?? defaultReportMonth()
  const monthKey = formatReportMonth(month)
  const [data, setData] = useState<ReportData | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    setData(null)
    void loadReport(studentId, month).then((d) => {
      if (!active) return
      if (d) setData(d)
      else setMissing(true)
    })
    return () => {
      active = false
    }
    // monthKey captures `month`; the object itself is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, monthKey])

  if (missing) {
    return <p className="text-sm text-muted-foreground">Student not found.</p>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — never printed */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/students/${studentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to student
        </Link>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label="Report month"
            value={monthKey}
            max={pktDateKey(new Date()).slice(0, 7)}
            onChange={(e) => {
              if (parseReportMonth(e.target.value)) {
                router.replace(`/students/${studentId}/report?month=${e.target.value}`)
              }
            }}
            className="h-9 w-[150px]"
          />
          <Button size="sm" onClick={() => window.print()} disabled={!data}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground print:hidden">
        In the print window, choose &ldquo;Save as PDF&rdquo; as the destination.
      </p>

      {data ? <ReportSheet data={data} month={month} /> : <PageLoading variant="detail" />}
    </div>
  )
}
