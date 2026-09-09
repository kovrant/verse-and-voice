"use client"

import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Play,
  Sparkles,
  Tablet,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { FeeDisplay } from "@/components/fee-display"
import { OnlineDot } from "@/components/online-dot"
import { type ActivityLog, ActivityFeed } from "@/components/student-activity-feed"
import { paraSummary, type ClassSession } from "@/components/student-session-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { chunkProgress, type StudentMemItem } from "@/lib/memorization"
import {
  getActiveRound,
  getChronologicalRoundNumber,
  computeProgress,
  QuranProgress,
  type QuranRound,
} from "@/components/quran-progress"
import type { FeePayment, Student } from "@/lib/utils"
import { formatSessionDuration } from "@/lib/utils"
import type { StudentView } from "@/components/student-detail-nav"
import type { MemChunk } from "@/components/memorization-chunks"

interface StudentOverviewProps {
  student: Student
  rounds: QuranRound[]
  sessions: ClassSession[]
  fees: FeePayment[]
  memItems: StudentMemItem[]
  chunksByItem: Record<string, MemChunk[]>
  memorizedChunkIds: Set<string>
  rates: Record<string, number> | null
  online: boolean
  activity: ActivityLog[]
  activityLoading: boolean
  onNavigate: (view: StudentView) => void
  onMarkFeePaid: (fee: FeePayment) => void
  onUpdateProgress: () => void
  onCompleteRound: () => void
}

export function StudentOverview({
  student,
  rounds,
  sessions,
  fees,
  memItems,
  chunksByItem,
  memorizedChunkIds,
  rates,
  online,
  activity,
  activityLoading,
  onNavigate,
  onMarkFeePaid,
  onUpdateProgress,
  onCompleteRound,
}: StudentOverviewProps) {
  const [activityOpen, setActivityOpen] = useState(false)

  const activeRound = getActiveRound(rounds)
  const lastSession = sessions[0] ?? null
  const lastPara = lastSession ? paraSummary(lastSession) : null

  const now = new Date()
  const currentFee = fees.find((f) => f.month === now.getMonth() + 1 && f.year === now.getFullYear())
  const memorizing = memItems.filter((m) => m.status === "memorizing")

  const paraInfo =
    activeRound?.type === "quran"
      ? computeProgress(activeRound.desc_completed || 0, activeRound.asc_completed || 0)
      : null

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Right now</h2>
          <p className="text-sm text-muted-foreground">What you need before the next class</p>
        </div>
        <div className="flex items-center gap-2">
          {student.last_device && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground"
              title={student.last_device_at ? `Last active on this device: ${new Date(student.last_device_at).toLocaleString()}` : undefined}
            >
              <Tablet className="h-3 w-3 text-primary" />
              {student.last_device}
            </span>
          )}
          {online && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              <OnlineDot />
              Online
            </span>
          )}
          <Link href={`/class?student=${student.id}`}>
            <Button size="sm">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start class
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Quran */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Quran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRound ? (
              <>
                <div>
                  <p className="text-sm font-semibold">
                    {activeRound.type === "qaida"
                      ? "Norani Qaida"
                      : `Round ${getChronologicalRoundNumber(rounds, activeRound)}`}
                  </p>
                  <div className="mt-1">
                    <QuranProgress rounds={rounds} variant="compact" />
                  </div>
                  {paraInfo?.currentPara != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Para {paraInfo.currentPara} · {paraInfo.total}/30 paras
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onUpdateProgress}>
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-emerald-600"
                    onClick={onCompleteRound}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs ml-auto"
                    onClick={() => onNavigate("progress")}
                  >
                    Full timeline <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No active round</p>
                <Button variant="outline" size="sm" onClick={() => onNavigate("progress")}>
                  View progress
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last class */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last class
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastSession ? (
              <>
                <div>
                  <p className="text-sm font-semibold">
                    {formatDistanceToNow(new Date(lastSession.started_at), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(lastSession.started_at), "EEE, MMM d")} ·{" "}
                    {formatSessionDuration(lastSession.duration_seconds)}
                    {lastPara ? ` · ${lastPara.label}` : ""}
                  </p>
                  {lastSession.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                      &ldquo;{lastSession.notes}&rdquo;
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate("classes")}>
                  All sessions <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No classes recorded yet</p>
                <Link href={`/class?student=${student.id}`}>
                  <Button variant="outline" size="sm">
                    Start first class
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fee this month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Fee · {format(now, "MMMM")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentFee ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <FeeDisplay amount={student.fee} currency={student.fee_currency} rates={rates} size="sm" />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      currentFee.is_paid
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    }`}
                  >
                    {currentFee.is_paid ? "Paid" : "Unpaid"}
                  </span>
                </div>
                {!currentFee.is_paid && (
                  <Button size="sm" className="h-8 text-xs" onClick={() => onMarkFeePaid(currentFee)}>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Mark paid
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate("account")}>
                  Fee history <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No fee row for this month</p>
            )}
          </CardContent>
        </Card>

        {/* Memorization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              Memorizing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memorizing.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Nothing in progress</p>
                <Button variant="outline" size="sm" onClick={() => onNavigate("memorization")}>
                  Assign items
                </Button>
              </>
            ) : (
              <>
                <ul className="space-y-2">
                  {memorizing.slice(0, 3).map((item) => {
                    const chunks = chunksByItem[item.catalog_id] || []
                    const progress = chunkProgress(chunks, memorizedChunkIds)
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-2.5 py-2"
                      >
                        <span className="text-sm font-medium truncate">{item.memorization_catalog?.title}</span>
                        {chunks.length > 0 ? (
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground flex-shrink-0">
                            {progress.done}/{progress.total}
                          </span>
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        )}
                      </li>
                    )
                  })}
                </ul>
                {memorizing.length > 3 && (
                  <p className="text-[11px] text-muted-foreground">+{memorizing.length - 3} more</p>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate("memorization")}>
                  Open workspace <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule strip */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm">
          <span className="text-muted-foreground">Schedule</span>
          <span className="font-medium">{student.class_time || "No time set"}</span>
          <span className="text-muted-foreground/40 hidden sm:inline">·</span>
          <span className="text-muted-foreground">
            {student.class_days?.length
              ? student.class_days
                  .slice()
                  .sort((a, b) => a - b)
                  .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                  .join(" · ")
              : "No days set"}
          </span>
          <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => onNavigate("account")}>
            Portal & fees <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Activity — collapsed by default */}
      <Card>
        <button
          type="button"
          onClick={() => setActivityOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold">Portal activity</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activity.length > 0
                ? `${activity.length} events logged`
                : "Clicks and page views from the student app"}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${activityOpen ? "rotate-180" : ""}`}
          />
        </button>
        {activityOpen && (
          <CardContent className="pt-0 pb-5">
            <ActivityFeed logs={activity.slice(-50)} loading={activityLoading} />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
