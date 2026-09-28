"use client"

import { format } from "date-fns"
import { Check, ChevronDown, Lock, Moon, RotateCcw, Unlock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { awardNamazCompleteBadge } from "@/lib/achievements"
import {
  activeRevisionPart,
  currentLearningStep,
  isModuleReadyToComplete,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
  partProgressByPartId,
  partRevisionStats,
  partsForStep,
  stepProgressByStepId,
  STUDENT_NAMAZ_PART_SELECT,
  STUDENT_NAMAZ_SELECT,
  STUDENT_NAMAZ_STEP_SELECT,
  type StudentNamaz,
  type StudentNamazPart,
  type StudentNamazStep,
} from "@/lib/namaz"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

/**
 * Teacher panel: assign Namaz, unlock steps, mark complete, assign part revision,
 * mark revised, and view per-part revision counts.
 */
export function StudentNamazAssign({
  studentId,
  onAchievementEarned,
}: {
  studentId: string
  onAchievementEarned?: () => void
}) {
  const [assignment, setAssignment] = useState<StudentNamaz | null>(null)
  const [steps, setSteps] = useState<NamazStep[]>([])
  const [parts, setParts] = useState<NamazStepPart[]>([])
  const [stepRows, setStepRows] = useState<StudentNamazStep[]>([])
  const [partRows, setPartRows] = useState<StudentNamazPart[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showAllSteps, setShowAllSteps] = useState(false)

  const load = useCallback(async () => {
    const [assignRes, stepsRes, partsRes, stepProgRes, partProgRes] = await Promise.all([
      supabase.from("student_namaz").select(STUDENT_NAMAZ_SELECT).eq("student_id", studentId).maybeSingle(),
      supabase.from("namaz_steps").select(NAMAZ_STEP_SELECT).order("order_index"),
      supabase.from("namaz_step_parts").select(NAMAZ_PART_SELECT).order("order_index"),
      supabase.from("student_namaz_steps").select(STUDENT_NAMAZ_STEP_SELECT).eq("student_id", studentId),
      supabase.from("student_namaz_parts").select(STUDENT_NAMAZ_PART_SELECT).eq("student_id", studentId),
    ])
    setAssignment((assignRes.data as StudentNamaz | null) ?? null)
    setSteps((stepsRes.data as NamazStep[]) || [])
    setParts((partsRes.data as NamazStepPart[]) || [])
    setStepRows((stepProgRes.data as StudentNamazStep[]) || [])
    setPartRows((partProgRes.data as StudentNamazPart[]) || [])
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const stepProgress = stepProgressByStepId(stepRows)
  const partProgress = partProgressByPartId(partRows)
  const moduleStatus = assignment?.status ?? "learning"
  const learningStep = currentLearningStep(steps, stepProgress)
  const revisingPart = activeRevisionPart(parts, partProgress)

  async function assignNamaz() {
    setBusy("assign")
    const first = steps[0]
    const { error } = await supabase
      .from("student_namaz")
      .insert({ student_id: studentId, status: "learning" })
      .select(STUDENT_NAMAZ_SELECT)
      .single()
    if (error) {
      toast.error(error.message)
      setBusy(null)
      return
    }
    if (first) {
      await supabase.from("student_namaz_steps").upsert(
        { student_id: studentId, step_id: first.id, unlocked_at: new Date().toISOString() },
        { onConflict: "student_id,step_id" },
      )
    }
    setBusy(null)
    toast.success("Namaz assigned — Takbir unlocked")
    await load()
  }

  async function unassignNamaz() {
    setBusy("unassign")
    const { error } = await supabase.from("student_namaz").delete().eq("student_id", studentId)
    setBusy(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Namaz unassigned")
    await load()
  }

  async function unlockStep(stepId: string) {
    setBusy(stepId)
    const { error } = await supabase.from("student_namaz_steps").upsert(
      { student_id: studentId, step_id: stepId, unlocked_at: new Date().toISOString() },
      { onConflict: "student_id,step_id" },
    )
    setBusy(null)
    if (error) toast.error(error.message)
    else await load()
  }

  async function lockStep(stepId: string) {
    setBusy(stepId)
    const { error } = await supabase
      .from("student_namaz_steps")
      .delete()
      .eq("student_id", studentId)
      .eq("step_id", stepId)
    setBusy(null)
    if (error) toast.error(error.message)
    else await load()
  }

  async function markStepComplete(stepId: string) {
    setBusy(`done-${stepId}`)
    const now = new Date().toISOString()
    const { error } = await supabase.from("student_namaz_steps").upsert(
      {
        student_id: studentId,
        step_id: stepId,
        unlocked_at: stepProgress.get(stepId)?.unlocked_at ?? now,
        completed_at: now,
      },
      { onConflict: "student_id,step_id" },
    )
    if (error) {
      toast.error(error.message)
      setBusy(null)
      return
    }

    const nextProgress = new Map(stepProgress)
    const row = nextProgress.get(stepId) ?? {
      id: "",
      student_id: studentId,
      step_id: stepId,
      unlocked_at: now,
      last_viewed_at: null,
      completed_at: now,
      revision_assigned_at: null,
      last_revised_at: null,
      revision_count: 0,
    }
    nextProgress.set(stepId, { ...row, completed_at: now })

    if (isModuleReadyToComplete(steps, nextProgress)) {
      await supabase
        .from("student_namaz")
        .update({ status: "completed", completed_at: now })
        .eq("student_id", studentId)
      await awardNamazCompleteBadge(studentId)
      onAchievementEarned?.()
      toast.success("Namaz complete — badge awarded")
    } else {
      toast.success("Step marked complete")
    }
    setBusy(null)
    await load()
  }

  async function assignStepRevision(stepId: string) {
    setBusy(`rev-step-${stepId}`)
    await supabase
      .from("student_namaz_steps")
      .update({ revision_assigned_at: null })
      .eq("student_id", studentId)
      .not("revision_assigned_at", "is", null)
    const { error } = await supabase.from("student_namaz_steps").upsert(
      {
        student_id: studentId,
        step_id: stepId,
        unlocked_at: stepProgress.get(stepId)?.unlocked_at,
        completed_at: stepProgress.get(stepId)?.completed_at,
        revision_assigned_at: new Date().toISOString(),
      },
      { onConflict: "student_id,step_id" },
    )
    setBusy(null)
    if (error) toast.error(error.message)
    else {
      toast.success("Step assigned for revision")
      await load()
    }
  }

  async function markStepRevised(stepId: string) {
    setBusy(`mark-step-${stepId}`)
    const row = stepProgress.get(stepId)
    const { error } = await supabase
      .from("student_namaz_steps")
      .update({
        revision_assigned_at: null,
        last_revised_at: new Date().toISOString(),
        revision_count: (row?.revision_count ?? 0) + 1,
      })
      .eq("student_id", studentId)
      .eq("step_id", stepId)
    if (!error) {
      await supabase
        .from("student_namaz")
        .update({ last_revised_at: new Date().toISOString() })
        .eq("student_id", studentId)
    }
    setBusy(null)
    if (error) toast.error(error.message)
    else {
      toast.success("Step revision recorded")
      await load()
    }
  }

  async function assignPartRevision(partId: string) {
    setBusy(`rev-part-${partId}`)
    await supabase
      .from("student_namaz_parts")
      .update({ revision_assigned_at: null })
      .eq("student_id", studentId)
      .not("revision_assigned_at", "is", null)
    await supabase
      .from("student_namaz_steps")
      .update({ revision_assigned_at: null })
      .eq("student_id", studentId)
      .not("revision_assigned_at", "is", null)
    const { error } = await supabase.from("student_namaz_parts").upsert(
      { student_id: studentId, part_id: partId, revision_assigned_at: new Date().toISOString() },
      { onConflict: "student_id,part_id" },
    )
    setBusy(null)
    if (error) toast.error(error.message)
    else {
      toast.success("Part assigned for revision")
      await load()
    }
  }

  async function markPartRevised(partId: string) {
    setBusy(`mark-part-${partId}`)
    const row = partProgress.get(partId)
    const { error } = await supabase
      .from("student_namaz_parts")
      .update({
        revision_assigned_at: null,
        last_revised_at: new Date().toISOString(),
        revision_count: (row?.revision_count ?? 0) + 1,
      })
      .eq("student_id", studentId)
      .eq("part_id", partId)
    if (!error) {
      await supabase
        .from("student_namaz")
        .update({ last_revised_at: new Date().toISOString() })
        .eq("student_id", studentId)
    }
    setBusy(null)
    if (error) toast.error(error.message)
    else {
      toast.success("Part revision recorded")
      await load()
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="h-5 w-32 shimmer rounded" />
        <div className="mt-4 h-24 shimmer rounded-xl" />
      </div>
    )
  }

  const completedStepsCount = steps.filter((s) => !!stepProgress.get(s.id)?.completed_at).length

  // For compact Teaching Desk view: show unlocked incomplete steps + the first locked step + most recent completed step
  const firstLockedIdx = steps.findIndex((s) => !stepProgress.get(s.id)?.unlocked_at)
  const visibleSteps =
    showAllSteps || steps.length <= 4
      ? steps
      : steps.filter((step, idx) => {
          const row = stepProgress.get(step.id)
          const unlocked = !!row?.unlocked_at
          const done = !!row?.completed_at
          if (unlocked && !done) return true // Currently learning
          if (idx === firstLockedIdx) return true // Next step to unlock
          if (done && idx === firstLockedIdx - 1) return true // Just completed
          return false
        })

  const finalVisibleSteps = visibleSteps.length > 0 ? visibleSteps : steps.slice(0, 3)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600">
            <Moon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Namaz</p>
              {assignment && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {completedStepsCount}/{steps.length} steps
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {assignment
                ? moduleStatus === "completed"
                  ? "Completed — assign parts to revise"
                  : learningStep
                    ? `Learning: ${learningStep.title}`
                    : "Assigned — unlock steps below"
                : "Hidden from student until assigned"}
            </p>
          </div>
        </div>
        {assignment ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!busy}
            onClick={unassignNamaz}
            className="h-8 text-xs text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            Unassign
          </Button>
        ) : (
          <Button size="sm" className="h-8 text-xs" disabled={!!busy || steps.length === 0} onClick={assignNamaz}>
            Assign Namaz
          </Button>
        )}
      </div>

      {assignment && (
        <>
          {moduleStatus === "learning" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {showAllSteps ? "All Steps" : "Active Steps"}
                </p>
                {steps.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSteps((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                  >
                    {showAllSteps ? "Compact view" : `All ${steps.length} steps`}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", showAllSteps && "rotate-180")}
                    />
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 main-scroll">
                {finalVisibleSteps.map((step) => {
                  const row = stepProgress.get(step.id)
                  const unlocked = !!row?.unlocked_at
                  const done = !!row?.completed_at
                  const stepParts = partsForStep(step.id, parts)
                  return (
                    <div
                      key={step.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2"
                    >
                      <span className="min-w-[90px] text-xs font-semibold">{step.title}</span>
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Check className="h-3.5 w-3.5" /> Complete
                        </span>
                      ) : unlocked ? (
                        <>
                          <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-600">
                            Unlocked
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                            disabled={!!busy}
                            onClick={() => markStepComplete(step.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Mark complete
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      )}
                      {!done && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs ml-auto"
                          disabled={!!busy}
                          onClick={() => (unlocked ? lockStep(step.id) : unlockStep(step.id))}
                        >
                          {unlocked ? (
                            <>
                              <Lock className="h-3 w-3 mr-1" /> Lock
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3 mr-1" /> Unlock
                            </>
                          )}
                        </Button>
                      )}
                      {stepParts.length > 0 && (
                        <span className="w-full text-[11px] text-muted-foreground">
                          Parts: {stepParts.map((p) => p.title).join(", ")}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {moduleStatus === "completed" && (
            <div className="space-y-3">
              {revisingPart && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Active Revision
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {revisingPart.title}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                    disabled={!!busy}
                    onClick={() => markPartRevised(revisingPart.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark revised
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Steps & Parts Revision
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllSteps((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                >
                  {showAllSteps ? "Hide list" : "Assign / view all"}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", showAllSteps && "rotate-180")}
                  />
                </button>
              </div>

              {(showAllSteps || !revisingPart) && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-0.5 main-scroll">
                  {steps.map((step) => {
                    const row = stepProgress.get(step.id)
                    if (!row?.completed_at) return null
                    const stepParts = partsForStep(step.id, parts)
                    if (stepParts.length === 0) {
                      const revising = !!row.revision_assigned_at
                      return (
                        <div
                          key={step.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 px-3 py-2"
                        >
                          <span className="text-xs font-semibold">{step.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.revision_count} revision{row.revision_count === 1 ? "" : "s"}
                          </span>
                          {revising ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs ml-auto"
                              disabled={!!busy}
                              onClick={() => markStepRevised(step.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Mark revised
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs ml-auto"
                              disabled={!!busy}
                              onClick={() => assignStepRevision(step.id)}
                            >
                              Assign revision
                            </Button>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div key={step.id} className="rounded-xl border border-border/50 p-2.5 space-y-1.5">
                        <p className="text-xs font-semibold">{step.title}</p>
                        {partRevisionStats(stepParts, partProgress).map(
                          ({ part, revision_count, last_revised_at, revision_assigned_at }) => (
                            <div
                              key={part.id}
                              className={cn(
                                "flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-xs",
                                revision_assigned_at && "bg-amber-500/10",
                                revision_count >= 5 && !revision_assigned_at && "bg-rose-500/5",
                              )}
                            >
                              <span className="min-w-[110px] font-medium">{part.title}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {revision_count}×
                                {last_revised_at &&
                                  ` · ${format(new Date(last_revised_at), "MMM d")}`}
                              </span>
                              {revision_assigned_at ? (
                                <Button
                                  size="sm"
                                  className="h-6 text-[11px] ml-auto px-2"
                                  disabled={!!busy}
                                  onClick={() => markPartRevised(part.id)}
                                >
                                  Mark revised
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[11px] ml-auto px-2"
                                  disabled={!!busy}
                                  onClick={() => assignPartRevision(part.id)}
                                >
                                  Assign
                                </Button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
