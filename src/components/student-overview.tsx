"use client"

import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { type MemChunk, MemPartWorkspace } from "@/components/memorization-chunks"
import {
  computeProgress,
  getActiveRound,
  getChronologicalRoundNumber,
  QuranProgress,
  type QuranRound,
} from "@/components/quran-progress"
import type { StudentView } from "@/components/student-detail-nav"
import { StudentHadithQuizCard } from "@/components/student-hadith-quiz-card"
import { StudentNamazAssign } from "@/components/student-namaz-assign"
import { StudentQaidaAssign } from "@/components/student-qaida-assign"
import { type ClassSession, MemThumb, paraSummary } from "@/components/student-session-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type CatalogItem, chunkProgress, type StudentMemItem } from "@/lib/memorization"
import type { Student } from "@/lib/utils"
import { cn, formatSessionDuration } from "@/lib/utils"

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

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* 2x2 Interactive Teaching Desk Bento Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. QURAN & QAIDA CARD */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <span>Quran & Qaida</span>
                  <p className="text-xs font-normal text-muted-foreground">
                    {activeRound
                      ? activeRound.type === "qaida"
                        ? "Active: Norani Qaida"
                        : `Active: Round ${getChronologicalRoundNumber(rounds, activeRound)}`
                      : "No active reading round"}
                  </p>
                </div>
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenNewRound}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Round
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onNavigate("history", "timeline")}
                >
                  Timeline <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            {activeRound ? (
              <div className="space-y-3.5">
                <div>
                  <QuranProgress rounds={rounds} variant="compact" />
                  {paraInfo && (
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {paraInfo.currentPara != null
                          ? `Currently reading Para ${paraInfo.currentPara}`
                          : "Started round"}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {paraInfo.total}/30 paras
                      </span>
                    </div>
                  )}
                </div>

                {/* Inline Para Steppers for Quran Round */}
                {activeRound.type === "quran" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Current Para
                        </p>
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          {ascVal > 0 ? `Para ${ascVal}` : "Not set"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={ascVal <= 0}
                          onClick={() => onStepRoundProgress(-1, 0)}
                          title="Previous Para"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={ascVal >= 30}
                          onClick={() => onStepRoundProgress(1, 0)}
                          title="Next Para"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          End Paras (30→)
                        </p>
                        <p className="text-sm font-bold tabular-nums text-foreground">{descVal}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={descVal <= 0}
                          onClick={() => onStepRoundProgress(0, -1)}
                          title="Decrease End Paras"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={descVal >= 30}
                          onClick={() => onStepRoundProgress(0, 1)}
                          title="Increase End Paras"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {activeRound.type === "quran" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={onUpdateProgress}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Set exact para
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
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">
                <span>No active Quran or Qaida round</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenNewRound}>
                  <Plus className="h-3 w-3 mr-1" />
                  Start round
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {/* Embedded Qaida Book Picker */}
              <StudentQaidaAssign
                studentId={student.id}
                qaidaMediaId={student.qaida_media_id}
                embedded
              />

              {/* Compact Last Class Context Strip */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  {lastSession ? (
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-foreground">
                        Last class{" "}
                        {formatDistanceToNow(new Date(lastSession.started_at), { addSuffix: true })}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatSessionDuration(lastSession.duration_seconds)}
                        {lastPara ? ` · ${lastPara.label}` : ""}
                      </span>
                      {lastSession.notes && (
                        <span className="text-muted-foreground italic">
                          {" "}
                          — &ldquo;{lastSession.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No classes recorded yet</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("history", "sessions")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline flex-shrink-0"
                >
                  Sessions <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. MEMORIZATION & REVISION CARD */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <BookMarked className="h-4 w-4" />
                </span>
                <div>
                  <span>Memorization & Revision</span>
                  <p className="text-xs font-normal text-muted-foreground">
                    {memorizing.length} learning · {revising.length} revising · {bucketItems.length} in
                    bucket
                  </p>
                </div>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
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
          </CardHeader>

          <CardContent className="space-y-3.5 flex-1">
            {/* Inline Catalog Picker */}
            {assignMemOpen && (
              <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
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

            {/* Assigned for Revision (Pinned at top for fast grading) */}
            {revising.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Assigned for Revision ({revising.length})
                </p>
                <div className="space-y-2">
                  {revising.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemThumb src={item.memorization_catalog?.image_url} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.memorization_catalog?.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.memorization_catalog?.category}
                            {item.last_revised_at &&
                              ` · Last ${format(new Date(item.last_revised_at), "MMM d")}`}
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
              </div>
            )}

            {/* Currently Memorizing (Interactive chunk checklist inline) */}
            {memorizing.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5 main-scroll">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  Currently Memorizing ({memorizing.length})
                </p>
                {memorizing.map((item) => {
                  const chunks = chunksByItem[item.catalog_id] || []
                  const hasChunks = chunks.length > 0
                  const progress = chunkProgress(chunks, memorizedChunkIds)
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-xl border border-emerald-500/25 bg-card"
                    >
                      <div className="flex items-center gap-2.5 border-b border-emerald-500/10 bg-emerald-500/[0.06] px-3 py-2">
                        <MemThumb src={item.memorization_catalog?.image_url} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.memorization_catalog?.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {hasChunks && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                {progress.done}/{progress.total} parts
                              </span>
                            )}
                            {item.memorization_catalog?.category && (
                              <span className="text-[11px] text-muted-foreground">
                                {item.memorization_catalog.category}
                              </span>
                            )}
                          </div>
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
                        <div className="p-2.5">
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
            ) : (
              revising.length === 0 && (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">
                  <span>No active memorization or revision items</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setAssignMemOpen(true)
                      onLoadCatalog()
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Assign item
                  </Button>
                </div>
              )
            )}

            {/* Collapsible Revision Bucket (Completed lessons ready to assign for revision) */}
            {bucketItems.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-secondary/10">
                <button
                  type="button"
                  onClick={() => setBucketOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Revision Bucket ({bucketItems.length} completed)
                  </span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", bucketOpen && "rotate-180")}
                  />
                </button>
                {bucketOpen && (
                  <div className="border-t border-border/50 p-2.5 space-y-2 max-h-56 overflow-y-auto main-scroll">
                    {bucketItems.map((item) => {
                      const chunks = chunksByItem[item.catalog_id] || []
                      const hasChunks = chunks.length > 0
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card px-2.5 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {item.memorization_catalog?.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.memorization_catalog?.category}
                              {item.last_revised_at &&
                                ` · Revised ${format(new Date(item.last_revised_at), "MMM d")}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAssignMemRevision(item.id)}
                              className="h-7 text-xs text-amber-600 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Assign revision
                            </Button>
                            {!hasChunks && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleMemStatus(item)}
                                className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                              >
                                Undo
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => onUnassignMemItem(item.id)}
                              title="Remove item"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
          </CardContent>
        </Card>

        {/* 3. NAMAZ TRACKER CARD (Moved from Account tab to Teaching Desk) */}
        <StudentNamazAssign
          studentId={student.id}
          onAchievementEarned={onAchievementEarned}
        />

        {/* 4. HADITHS & QUIZZES CARD (Unified on Teaching Desk) */}
        <StudentHadithQuizCard
          studentId={student.id}
          studentName={student.name}
          onAchievementEarned={onAchievementEarned}
        />
      </div>
    </div>
  )
}
