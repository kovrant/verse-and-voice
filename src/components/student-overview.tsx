"use client"

import {
  ArrowRight,
  BookMarked,
  BookOpen,
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
import { PanelHeader } from "@/components/panel-header"
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
import { Card } from "@/components/ui/card"
import { type CatalogItem, chunkProgress, type StudentMemItem } from "@/lib/memorization"
import type { Student } from "@/lib/utils"
import { cn, formatSessionDuration, safeFormatDate, safeFormatDistanceToNow } from "@/lib/utils"

export type HistorySection =
  "all" | "sessions" | "attendance" | "timeline" | "trophies" | "activity"

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

  const lastClass = sessions.find((s) => (s.duration_seconds || 0) >= 60) ?? null
  const lastClassPara = lastClass ? paraSummary(lastClass) : null

  const stepper = activeRound?.type === "quran" && (
    <div className="inline-flex items-center rounded-lg border border-card-border bg-card-background p-0.5 shadow-xs">
      <button
        type="button"
        disabled={ascVal <= 0}
        onClick={() => onStepRoundProgress(-1, 0)}
        title="Previous para"
        aria-label="Previous para"
        className="flex h-9 w-10 items-center justify-center rounded-md text-text-primary transition-colors hover:bg-background-gray-primary disabled:opacity-35"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="h-5 w-px bg-border-primary" />
      <button
        type="button"
        disabled={ascVal >= 30}
        onClick={() => onStepRoundProgress(1, 0)}
        title="Next para"
        aria-label="Next para"
        className="flex h-9 w-10 items-center justify-center rounded-md text-text-primary transition-colors hover:bg-background-gray-primary disabled:opacity-35"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── READING ── */}
      <Card className="p-5">
        <PanelHeader
          icon={BookOpen}
          tint="indigo"
          title="Reading"
          summary={
            !activeRound
              ? "No active round"
              : activeRound.type === "qaida"
                ? "Norani Qaida, before the Quran"
                : `Round ${roundNum}${rounds.length > 1 ? ` of ${rounds.length}` : ""}`
          }
          actions={
            activeRound ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManageRoundOpen((o) => !o)}
                aria-expanded={manageRoundOpen}
              >
                Manage
                <ChevronDown
                  className={cn(
                    "ml-1.5 h-3.5 w-3.5 transition-transform",
                    manageRoundOpen && "rotate-180",
                  )}
                />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onOpenNewRound}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Start round
              </Button>
            )
          }
        />

        {activeRound?.type === "quran" && paraInfo && (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-3xl font-semibold leading-9 text-text-primary">
                {ascVal > 0 ? `Para ${ascVal}` : "Just started"}
              </p>
              <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-background-gray-tertiary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(pct, paraInfo.total > 0 ? 4 : 0)}%` }}
                />
              </div>
              <p className="mt-2 text-sm tabular-nums text-text-tertiary">
                {paraInfo.total} of 30 paras
                {descVal > 0 ? ` · ${descVal} from the end` : ""}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-xs text-text-tertiary">Move para</span>
              {stepper}
            </div>
          </div>
        )}

        {(activeRound?.type === "qaida" || !activeRound) && (
          <div className="mt-5">
            <StudentQaidaAssign
              studentId={student.id}
              qaidaMediaId={student.qaida_media_id}
              embedded
            />
          </div>
        )}

        {activeRound && manageRoundOpen && (
          <div className="mt-5 space-y-3 rounded-lg bg-background-gray-primary p-4 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-2">
              {activeRound.type === "quran" && (
                <Button variant="outline" size="sm" onClick={onUpdateProgress}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Set exact para
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-600"
                onClick={onCompleteRound}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Complete round
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenNewRound}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New round
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => onNavigate("sessions", "timeline")}
              >
                Round timeline <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
            {activeRound.type !== "qaida" && (
              <div className="border-t border-border-secondary-alt pt-3">
                <StudentQaidaAssign
                  studentId={student.id}
                  qaidaMediaId={student.qaida_media_id}
                  embedded
                />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigate("sessions", "sessions")}
          className="mt-5 flex w-full items-center justify-between gap-3 border-t border-border-primary pt-4 text-left text-sm text-text-tertiary transition-colors hover:text-text-primary"
        >
          <span className="min-w-0 truncate">
            {lastClass ? (
              <>
                Last class {safeFormatDistanceToNow(lastClass.started_at, { addSuffix: true })} ·{" "}
                {formatSessionDuration(lastClass.duration_seconds)}
                {lastClassPara ? ` · ${lastClassPara.label}` : ""}
                {lastClass.notes && (
                  <span className="text-text-secondary"> — {lastClass.notes}</span>
                )}
              </>
            ) : (
              "No classes recorded yet"
            )}
          </span>
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
        </button>
      </Card>

      {/* ── MEMORIZATION ── */}
      <Card className="p-5">
        <PanelHeader
          icon={BookMarked}
          tint="green"
          title="Memorization"
          summary={`${memorizing.length} learning · ${revising.length} revising · ${bucketItems.length} done`}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !assignMemOpen
                setAssignMemOpen(next)
                if (next) onLoadCatalog()
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Assign
            </Button>
          }
        />

        {assignMemOpen && (
          <div className="mt-5 space-y-2 rounded-lg bg-background-gray-primary p-4">
            <p className="text-xs font-medium uppercase text-text-tertiary">Assign from catalog</p>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {unassignedCatalog.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAssignMemItem(item.id)}
                  className="flex items-center gap-1 rounded-lg border border-card-border bg-card-background px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  {item.title}
                  <span className="text-text-tertiary">({item.category})</span>
                </button>
              ))}
              {unassignedCatalog.length === 0 && (
                <p className="text-xs text-text-tertiary">All catalog items are assigned.</p>
              )}
            </div>
          </div>
        )}

        {memorizing.length === 0 && revising.length === 0 && !assignMemOpen && (
          <p className="mt-5 rounded-lg bg-background-gray-primary p-4 text-sm text-text-tertiary">
            Nothing being memorized right now. Use Assign to give the next surah or dua.
          </p>
        )}

        {/* Learning now */}
        {memorizing.map((item) => {
          const chunks = chunksByItem[item.catalog_id] || []
          const hasChunks = chunks.length > 0
          const progress = chunkProgress(chunks, memorizedChunkIds)
          return (
            <div key={item.id} className="mt-5 rounded-xl border border-card-border p-4">
              <div className="flex items-center gap-3">
                <MemThumb src={item.memorization_catalog?.image_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {item.memorization_catalog?.title}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {item.memorization_catalog?.category}
                    {hasChunks ? ` · ${progress.done} of ${progress.total} parts` : ""}
                  </p>
                </div>
                {!hasChunks && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleMemStatus(item)}
                    className="text-green-600 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-600"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Mark done
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => onUnassignMemItem(item.id)}
                  aria-label="Remove item"
                  title="Remove item"
                  className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {hasChunks && (
                <div className="mt-4">
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

        {/* Revising now */}
        {revising.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase text-text-tertiary">Revising</p>
            <ul>
              {revising.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b border-border-primary py-2.5 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MemThumb src={item.memorization_catalog?.image_url} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {item.memorization_catalog?.title}
                      </p>
                      <p className="text-xs text-amber-600">
                        {item.memorization_catalog?.category}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkMemRevised(item.id)}
                    className="text-green-600 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-600"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Mark revised
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Memorized (revision bucket) */}
        {bucketItems.length > 0 && (
          <div className="mt-5 border-t border-border-primary pt-4">
            <button
              type="button"
              onClick={() => setBucketOpen((o) => !o)}
              className="flex w-full items-center justify-between text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              <span>
                <span className="font-medium text-text-primary">Memorized</span> ·{" "}
                {bucketItems.length} item{bucketItems.length === 1 ? "" : "s"} ready to revise
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", bucketOpen && "rotate-180")}
              />
            </button>
            {bucketOpen && (
              <ul className="mt-2 max-h-64 overflow-y-auto">
                {bucketItems.map((item) => {
                  const hasChunks = (chunksByItem[item.catalog_id] || []).length > 0
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-border-primary py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {item.memorization_catalog?.title}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {item.memorization_catalog?.category}
                          {item.last_revised_at &&
                            ` · Revised ${safeFormatDate(item.last_revised_at, "MMM d")}`}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssignMemRevision(item.id)}
                          className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Revise
                        </Button>
                        {!hasChunks && (
                          <Button variant="ghost" size="sm" onClick={() => onToggleMemStatus(item)}>
                            Undo
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => onUnassignMemItem(item.id)}
                          aria-label="Remove item"
                          title="Remove item"
                          className="flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* ── HADITH & QUIZZES ── */}
      <StudentHadithQuizCard
        studentId={student.id}
        studentName={student.name}
        onAchievementEarned={onAchievementEarned}
      />
    </div>
  )
}
