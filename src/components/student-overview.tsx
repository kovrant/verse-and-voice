"use client"

import {
  ArrowRight,
  Check,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { type MemChunk, MemPartWorkspace } from "@/components/memorization-chunks"
import {
  computeProgress,
  getActiveRound,
  getChronologicalRoundNumber,
  type QuranRound,
} from "@/components/quran-progress"
import type { StudentView } from "@/components/student-detail-nav"
import { StudentHadithQuizCard } from "@/components/student-hadith-quiz-card"
import { StudentQaidaAssign } from "@/components/student-qaida-assign"
import { type ClassSession, MemThumb, paraSummary } from "@/components/student-session-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type CatalogItem, chunkProgress, type StudentMemItem } from "@/lib/memorization"
import type { Student } from "@/lib/utils"
import {
  cn,
  formatSessionDuration,
  safeFormatDate,
  safeFormatDistanceToNow,
} from "@/lib/utils"

export type HistorySection = "all" | "sessions" | "timeline" | "trophies" | "activity"

interface StudentOverviewProps {
  student: Student
  rounds: QuranRound[]
  sessions: ClassSession[]
  memItems: StudentMemItem[]
  catalog: CatalogItem[]
  chunksByItem: Record<string, MemChunk[]>
  memorizedChunkIds: Set<string>
  onNavigate: (view: StudentView, section?: HistorySection) => void
  onUpdateProgress: () => void
  onStepRoundProgress: (deltaAsc: number, deltaDesc: number) => void
  onCompleteRound: () => void
  onOpenNewRound: () => void
  onLoadCatalog: () => void
  onAssignMemItem: (catalogId: string) => void
  onUnassignMemItem: (id: string) => void
  onToggleMemStatus: (item: StudentMemItem) => void
  onToggleChunk: (chunk: MemChunk, memorized: boolean) => void
  onAssignMemRevision: (id: string) => void
  onMarkMemRevised: (id: string) => void
  onAchievementEarned?: () => void
}

export function StudentOverview({
  student,
  rounds,
  sessions,
  memItems,
  catalog,
  chunksByItem,
  memorizedChunkIds,
  onNavigate,
  onUpdateProgress,
  onStepRoundProgress,
  onCompleteRound,
  onOpenNewRound,
  onLoadCatalog,
  onAssignMemItem,
  onUnassignMemItem,
  onToggleMemStatus,
  onToggleChunk,
  onAssignMemRevision,
  onMarkMemRevised,
  onAchievementEarned,
}: StudentOverviewProps) {
  const [manageRoundOpen, setManageRoundOpen] = useState(false)
  const [assignMemOpen, setAssignMemOpen] = useState(false)
  const [bucketOpen, setBucketOpen] = useState(false)

  const activeRound = getActiveRound(rounds)
  const lastSession = sessions[0] ?? null
  const lastPara = lastSession ? paraSummary(lastSession) : null

  const memorizing = memItems.filter((m) => m.status === "memorizing")
  const revising = memItems.filter((m) => m.status === "memorized" && m.revision_assigned_at)
  const bucketItems = memItems.filter((m) => m.status === "memorized" && !m.revision_assigned_at)
  const unassignedCatalog = catalog.filter((c) => !memItems.some((m) => m.catalog_id === c.id))

  const paraInfo =
    activeRound?.type === "quran"
      ? computeProgress(activeRound.desc_completed || 0, activeRound.asc_completed || 0)
      : null

  const ascVal = activeRound?.asc_completed || 0
  const descVal = activeRound?.desc_completed || 0
  const roundNum = activeRound ? getChronologicalRoundNumber(rounds, activeRound) : 1
  const pct = paraInfo ? Math.min(100, Math.round((paraInfo.total / 30) * 100)) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start animate-fade-in-up">
      {/* LEFT CARD: READING PROGRESS */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Reading Progress
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {activeRound ? (
            <div className="space-y-4">
              {/* Main Headline + Single Segmented Stepper */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-2xl sm:text-[26px] font-bold tracking-tight text-foreground">
                    {activeRound.type === "qaida"
                      ? "Norani Qaida"
                      : `Round ${roundNum} · ${ascVal > 0 ? `Para ${ascVal}` : "Started"}`}
                  </p>
                </div>

                {activeRound.type === "quran" && (
                  <div className="inline-flex items-center rounded-xl border border-border bg-secondary/25 p-0.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={ascVal <= 0}
                      onClick={() => onStepRoundProgress(-1, 0)}
                      title="Previous Para"
                      aria-label="Previous Para"
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary disabled:opacity-35"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="h-4 w-px bg-border/80" />
                    <button
                      type="button"
                      disabled={ascVal >= 30}
                      onClick={() => onStepRoundProgress(1, 0)}
                      title="Next Para"
                      aria-label="Next Para"
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary disabled:opacity-35"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Clean Single Progress Bar for Quran Rounds */}
              {activeRound.type === "quran" && paraInfo && (
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.max(pct, paraInfo.total > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {paraInfo.total} of 30 paras
                      {descVal > 0 ? ` (${descVal} from end)` : ""}
                    </span>
                    {rounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onNavigate("sessions", "timeline")}
                        className="hover:text-foreground transition-colors"
                      >
                        {rounds.length} rounds total →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* If student is currently on Qaida, show Qaida Book selector directly */}
              {activeRound.type === "qaida" && (
                <StudentQaidaAssign
                  studentId={student.id}
                  qaidaMediaId={student.qaida_media_id}
                  embedded
                />
              )}

              {/* Progressive Disclosure: Manage Round & Qaida */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setManageRoundOpen((o) => !o)}
                >
                  <span>Manage Round &amp; Qaida</span>
                  <ChevronDown
                    className={cn(
                      "ml-1.5 h-3.5 w-3.5 transition-transform",
                      manageRoundOpen && "rotate-180",
                    )}
                  />
                </Button>

                {manageRoundOpen && (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/15 p-3.5 animate-fade-in-up">
                    <div className="flex flex-wrap items-center gap-2">
                      {activeRound.type === "quran" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={onUpdateProgress}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Set exact para / End paras
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                        onClick={onCompleteRound}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Complete round
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={onOpenNewRound}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        New round
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground ml-auto"
                        onClick={() => onNavigate("sessions", "timeline")}
                      >
                        Round timeline <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>

                    {activeRound.type !== "qaida" && (
                      <div className="pt-2 border-t border-border/50">
                        <StudentQaidaAssign
                          studentId={student.id}
                          qaidaMediaId={student.qaida_media_id}
                          embedded
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">No active Quran or Qaida round</p>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenNewRound}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Start round
                </Button>
              </div>
              <StudentQaidaAssign
                studentId={student.id}
                qaidaMediaId={student.qaida_media_id}
                embedded
              />
            </div>
          )}

          {/* Clean Bottom Divider: Last Class Summary */}
          <div className="border-t border-border/60 pt-3.5 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigate("sessions", "sessions")}
              className="min-w-0 flex-1 text-left text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {lastSession ? (
                <>
                  <span>
                    Last class {safeFormatDistanceToNow(lastSession.started_at, { addSuffix: true })}
                  </span>
                  <span>
                    {" "}
                    ({formatSessionDuration(lastSession.duration_seconds)}
                    {lastPara ? ` · ${lastPara.label}` : ""})
                  </span>
                  {lastSession.notes && (
                    <span className="text-foreground/90"> — {lastSession.notes}</span>
                  )}
                </>
              ) : (
                <span>No classes recorded yet</span>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT CARD: HOMEWORK & ASSIGNMENTS (Unified, Flat-Divided) */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Homework &amp; Assignments
          </CardTitle>
        </CardHeader>

        <CardContent className="divide-y divide-border/60 pt-0">
          {/* SECTION 1: MEMORIZATION & REVISION */}
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Memorization &amp; Revision
                </p>
                {(memorizing.length > 0 || revising.length > 0) && (
                  <p className="text-xs text-muted-foreground">
                    {memorizing.length} learning · {revising.length} revising
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs flex-shrink-0"
                onClick={() => {
                  const next = !assignMemOpen
                  setAssignMemOpen(next)
                  if (next) onLoadCatalog()
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Assign
              </Button>
            </div>

            {/* Inline Catalog Picker */}
            {assignMemOpen && (
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assign from Catalog
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 main-scroll">
                  {unassignedCatalog.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onAssignMemItem(item.id)}
                      className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      {item.title}
                      <span className="text-muted-foreground/50">({item.category})</span>
                    </button>
                  ))}
                  {unassignedCatalog.length === 0 && (
                    <p className="text-xs text-muted-foreground">All catalog items assigned.</p>
                  )}
                </div>
              </div>
            )}

            {/* Assigned for Revision */}
            {revising.length > 0 && (
              <div className="space-y-1.5">
                {revising.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2.5 rounded-xl bg-amber-500/10 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemThumb src={item.memorization_catalog?.image_url} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {item.memorization_catalog?.title}
                        </p>
                        <p className="text-[11px] text-amber-500">
                          Revising · {item.memorization_catalog?.category}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkMemRevised(item.id)}
                      className="h-7 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 flex-shrink-0"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Mark revised
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Currently Memorizing */}
            {memorizing.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 main-scroll">
                {memorizing.map((item) => {
                  const chunks = chunksByItem[item.catalog_id] || []
                  const hasChunks = chunks.length > 0
                  const progress = chunkProgress(chunks, memorizedChunkIds)
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-xl bg-secondary/25"
                    >
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        <MemThumb src={item.memorization_catalog?.image_url} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.memorization_catalog?.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {hasChunks ? `${progress.done}/${progress.total} parts · ` : ""}
                            {item.memorization_catalog?.category}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          {!hasChunks && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onToggleMemStatus(item)}
                              className="h-7 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Mark done
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => onUnassignMemItem(item.id)}
                            aria-label="Remove item"
                            title="Remove item"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {hasChunks && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-border/40">
                          <MemPartWorkspace
                            chunks={chunks}
                            memorizedIds={memorizedChunkIds}
                            onToggle={onToggleChunk}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Collapsible Revision Bucket (Flat Row) */}
            {bucketItems.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setBucketOpen((o) => !o)}
                  className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>
                    <strong className="font-medium text-foreground">Revision Bucket</strong> (
                    {bucketItems.length} completed)
                  </span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", bucketOpen && "rotate-180")}
                  />
                </button>
                {bucketOpen && (
                  <div className="mt-1.5 space-y-1.5 border-l-2 border-border/60 pl-3 max-h-48 overflow-y-auto main-scroll">
                    {bucketItems.map((item) => {
                      const chunks = chunksByItem[item.catalog_id] || []
                      const hasChunks = chunks.length > 0
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 py-1 text-xs"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-foreground">
                              {item.memorization_catalog?.title}
                            </span>
                            <span className="ml-1.5 text-[11px] text-muted-foreground">
                              {item.memorization_catalog?.category}
                              {item.last_revised_at &&
                                ` · Revised ${safeFormatDate(item.last_revised_at, "MMM d")}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => onAssignMemRevision(item.id)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Revise
                            </button>
                            {!hasChunks && (
                              <button
                                type="button"
                                onClick={() => onToggleMemStatus(item)}
                                className="px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                Undo
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onUnassignMemItem(item.id)}
                              title="Remove item"
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: HADITH & SECTION 3: QUIZZES */}
          <StudentHadithQuizCard
            studentId={student.id}
            studentName={student.name}
            onAchievementEarned={onAchievementEarned}
          />
        </CardContent>
      </Card>
    </div>
  )
}
