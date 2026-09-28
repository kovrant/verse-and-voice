"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react"

import { KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { NamazStepCard } from "@/components/namaz-step-card"
import { NamazStepViewer } from "@/components/namaz-step-viewer"
import { PageLoading } from "@/components/page-loading"
import {
  isStepCardClickable,
  learningProgress,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
  partProgressByPartId,
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
import { useStudent } from "@/lib/use-student"
import { useStudentNamazRealtime } from "@/lib/use-student-namaz-realtime"

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
      supabase
        .from("student_namaz")
        .select(STUDENT_NAMAZ_SELECT)
        .eq("student_id", student.id)
        .maybeSingle(),
      supabase.from("namaz_steps").select(NAMAZ_STEP_SELECT).order("order_index"),
      supabase.from("namaz_step_parts").select(NAMAZ_PART_SELECT).order("order_index"),
      supabase
        .from("student_namaz_steps")
        .select(STUDENT_NAMAZ_STEP_SELECT)
        .eq("student_id", student.id),
      supabase
        .from("student_namaz_parts")
        .select(STUDENT_NAMAZ_PART_SELECT)
        .eq("student_id", student.id),
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
    if (student?.id && row?.id) {
      await supabase
        .from("student_namaz_steps")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("student_id", student.id)
    }
  }

  if (studentLoading || dataLoading) return <PageLoading variant="grid-cards" count={6} student />

  if (error || !student) {
    return (
      <KidEmpty
        mood="sleepy"
        title="We couldn't load your profile"
        text={error || "Please ask your teacher for help."}
      />
    )
  }

  if (!assignment) {
    return (
      <KidEmpty
        title="Namaz is coming soon"
        text="Your teacher hasn't started Namaz with you yet. It will appear here when they do."
      />
    )
  }

  if (viewStep) {
    return (
      <NamazStepViewer
        key={viewStep.id}
        step={viewStep}
        parts={partsForStep(viewStep.id, parts)}
        partProgress={partProgress}
        completed={moduleStatus === "completed"}
        completedAt={assignment.completed_at}
        onClose={() => setViewStep(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🕌"
        color="rose"
        title={moduleStatus === "completed" ? "Revise your Namaz" : "Learn Namaz"}
        subtitle={
          moduleStatus === "learning"
            ? `${progress.done} of ${progress.total} steps done — tap a step to see the words`
            : "Open the step your teacher asked you to say again"
        }
      />

      {moduleStatus === "learning" && progress.total > 0 && (
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[hsl(var(--kid-rose)/0.25)]">
            <div
              className="h-full rounded-full bg-[hsl(var(--kid-rose))] transition-all duration-500"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <span className="font-heading text-[15px] font-bold text-primary">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

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
              kid
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
