"use client"

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { NamazStepCard } from "@/components/namaz-step-card"
import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import {
  isStepCardClickable,
  learningProgress,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  partsForStep,
  partProgressByPartId,
  stepProgressByStepId,
  STUDENT_NAMAZ_PART_SELECT,
  STUDENT_NAMAZ_SELECT,
  STUDENT_NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
  type StudentNamaz,
  type StudentNamazPart,
  type StudentNamazStep,
} from "@/lib/namaz"
import { supabase } from "@/lib/supabase"
import { useStudentNamazRealtime } from "@/lib/use-student-namaz-realtime"
import { useStudent } from "@/lib/use-student"
import { cn } from "@/lib/utils"

export default function StudentNamazPage() {
  const { student, loading: studentLoading, error } = useStudent()
  const [assignment, setAssignment] = useState<StudentNamaz | null>(null)
  const [steps, setSteps] = useState<NamazStep[]>([])
  const [parts, setParts] = useState<NamazStepPart[]>([])
  const [stepRows, setStepRows] = useState<StudentNamazStep[]>([])
  const [partRows, setPartRows] = useState<StudentNamazPart[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [viewStep, setViewStep] = useState<NamazStep | null>(null)

  const loadData = useCallback(async () => {
    if (!student?.id) return
    const [assignRes, stepsRes, partsRes, stepProgRes, partProgRes] = await Promise.all([
      supabase.from("student_namaz").select(STUDENT_NAMAZ_SELECT).eq("student_id", student.id).maybeSingle(),
      supabase.from("namaz_steps").select(NAMAZ_STEP_SELECT).order("order_index"),
      supabase.from("namaz_step_parts").select(NAMAZ_PART_SELECT).order("order_index"),
      supabase.from("student_namaz_steps").select(STUDENT_NAMAZ_STEP_SELECT).eq("student_id", student.id),
      supabase.from("student_namaz_parts").select(STUDENT_NAMAZ_PART_SELECT).eq("student_id", student.id),
    ])
    setAssignment((assignRes.data as StudentNamaz | null) ?? null)
    setSteps((stepsRes.data as NamazStep[]) || [])
    setParts((partsRes.data as NamazStepPart[]) || [])
    setStepRows((stepProgRes.data as StudentNamazStep[]) || [])
    setPartRows((partProgRes.data as StudentNamazPart[]) || [])
    setDataLoading(false)
  }, [student?.id])

  useEffect(() => {
    if (!student?.id) {
      if (!studentLoading) setDataLoading(false)
      return
    }
    setDataLoading(true)
    void loadData()
  }, [student?.id, studentLoading, loadData])

  // Teacher unlocks steps / assigns part revision on another device — update live.
  useStudentNamazRealtime(student?.id, loadData, "page")

  const stepProgress = stepProgressByStepId(stepRows)
  const partProgress = partProgressByPartId(partRows)
  const moduleStatus = assignment?.status ?? "learning"
  const progress = learningProgress(steps, stepProgress)

  async function openStep(step: NamazStep) {
    const row = stepProgress.get(step.id)
    const clickable = isStepCardClickable(
      step,
      row,
      moduleStatus,
      partsForStep(step.id, parts),
      partProgress,
    )
    if (!clickable) return
    setViewStep(step)
    if (student?.id) {
      await supabase.from("student_namaz_steps").upsert(
        {
          student_id: student.id,
          step_id: step.id,
          unlocked_at: row?.unlocked_at ?? new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
        },
        { onConflict: "student_id,step_id" },
      )
    }
  }

  if (studentLoading || dataLoading) return <PageLoading variant="grid-cards" count={6} student />

  if (error || !student) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <p className="font-bold">We couldn&apos;t load your profile</p>
        <p className="text-sm text-muted-foreground mt-1">{error || "Please contact your teacher."}</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="mb-3 text-5xl">🕌</div>
        <p className="font-bold">Namaz is coming soon</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your teacher hasn&apos;t assigned Namaz yet. It&apos;ll appear here when they do.
        </p>
      </div>
    )
  }

  if (viewStep) {
    const stepParts = partsForStep(viewStep.id, parts)

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 bg-card">
          <Button variant="ghost" size="sm" onClick={() => setViewStep(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <p className="font-semibold">{viewStep.title}</p>
            <p className="text-xs text-muted-foreground">
              {moduleStatus === "completed" ? "Revision" : "Learning"}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-sm space-y-4">
            {viewStep.image_url && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <div className="flex items-end justify-center bg-[#f3ede3] px-3 pt-3 pb-2">
                  <img
                    src={viewStep.image_url}
                    alt={viewStep.title}
                    className="max-h-48 w-full object-contain object-bottom sm:max-h-52"
                  />
                </div>
              </div>
            )}
            {stepParts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                Practice this step with your teacher.
              </p>
            ) : (
              <div className="space-y-3">
                {stepParts.map((part) => {
                  const assigned = !!partProgress.get(part.id)?.revision_assigned_at
                  const inactive = moduleStatus === "completed" && !assigned
                  return (
                    <div
                      key={part.id}
                      className={cn(
                        "rounded-xl border p-4 transition-colors",
                        assigned
                          ? "border-amber-400/50 bg-amber-500/10"
                          : inactive
                            ? "border-border/30 opacity-50"
                            : "border-border/50 bg-card",
                      )}
                    >
                      <p className="font-semibold">{part.title}</p>
                      {assigned && (
                        <p className="text-xs text-amber-700 mt-1">Your teacher assigned this for revision</p>
                      )}
                      {part.image_url && (
                        <div className="mt-3 flex justify-center rounded-lg bg-secondary/20 p-3">
                          <img
                            src={part.image_url}
                            alt={part.title}
                            className="max-h-48 w-auto max-w-full object-contain object-center"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {moduleStatus === "completed" && assignment.completed_at && (
              <p className="text-center text-xs text-muted-foreground">
                Namaz badge earned · completed{" "}
                {new Date(assignment.completed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {moduleStatus === "completed" ? "Revise your Namaz" : "Learn Namaz"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {moduleStatus === "learning"
            ? `${progress.done} of ${progress.total} steps complete`
            : "Open the step your teacher assigned for revision"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step) => {
          const row = stepProgress.get(step.id)
          const stepParts = partsForStep(step.id, parts)
          const clickable = isStepCardClickable(step, row, moduleStatus, stepParts, partProgress)
          const completed = !!row?.completed_at
          const activeRevision =
            moduleStatus === "completed" &&
            (stepParts.some((p) => partProgress.get(p.id)?.revision_assigned_at) ||
              !!row?.revision_assigned_at)
          return (
            <NamazStepCard
              key={step.id}
              title={step.title}
              imageUrl={step.image_url}
              cardColor={step.card_color}
              clickable={clickable}
              completed={completed}
              activeRevision={activeRevision}
              onClick={() => openStep(step)}
            />
          )
        })}
      </div>
    </div>
  )
}
