"use client"

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { KidCard, KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { NamazStepCard } from "@/components/namaz-step-card"
import { PageLoading } from "@/components/page-loading"
import { StudentBackdrop } from "@/components/student-backdrop"
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
    const stepParts = partsForStep(viewStep.id, parts)

    return (
      <div className="fixed inset-0 z-50 isolate flex flex-col">
        <StudentBackdrop />

        <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 sm:px-4">
          <button
            type="button"
            onClick={() => setViewStep(null)}
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-4 py-2 text-[14px] font-bold text-foreground shadow-[0_3px_0_hsl(var(--border))] backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
          >
            <ArrowLeft className="h-4 w-4" />
            All steps
          </button>
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-3.5 py-1.5 shadow-[0_3px_0_hsl(var(--border))] backdrop-blur-sm">
            <span aria-hidden className="text-[17px] leading-none">
              🕌
            </span>
            <span className="truncate font-heading text-[16px] font-bold text-primary">
              {viewStep.title}
            </span>
          </span>
        </div>

        <div className="flex-1 overflow-auto px-3 pb-8 sm:px-4">
          <div className="mx-auto w-full max-w-md space-y-4">
            {viewStep.image_url && (
              <KidCard color="rose" className="overflow-hidden p-0">
                <div className="flex items-end justify-center px-3 pb-2 pt-3">
                  <img
                    src={viewStep.image_url}
                    alt={viewStep.title}
                    className="max-h-48 w-full object-contain object-bottom sm:max-h-56"
                  />
                </div>
              </KidCard>
            )}

            {stepParts.length === 0 ? (
              <KidCard className="text-center">
                <p className="text-[15px] font-semibold text-foreground/85">
                  🌟 Practise this step with your teacher.
                </p>
              </KidCard>
            ) : (
              stepParts.map((part) => {
                const assigned = !!partProgress.get(part.id)?.revision_assigned_at
                const inactive = moduleStatus === "completed" && !assigned
                return (
                  <KidCard
                    key={part.id}
                    color={assigned ? "saffron" : "rose"}
                    className={cn("space-y-3", inactive && "opacity-60")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-[19px] font-bold leading-tight text-primary">
                        {part.title}
                      </p>
                      {assigned && (
                        <span className="rounded-full bg-[hsl(var(--kid-saffron)/0.5)] px-2.5 py-1 text-[12px] font-extrabold text-foreground">
                          🔁 Say this one again
                        </span>
                      )}
                    </div>

                    {/* The words the child recites. */}
                    {part.arabic_text && (
                      <p
                        dir="rtl"
                        lang="ar"
                        className="select-text rounded-[18px] border-[1.5px] border-border bg-card p-4 text-center font-hadith text-[24px] leading-loose text-foreground sm:text-[27px]"
                      >
                        {part.arabic_text}
                      </p>
                    )}

                    {part.image_url && (
                      <div className="flex justify-center rounded-[18px] bg-card/70 p-3">
                        <img
                          src={part.image_url}
                          alt={part.title}
                          className="max-h-48 w-auto max-w-full object-contain object-center"
                        />
                      </div>
                    )}
                  </KidCard>
                )
              })
            )}

            {moduleStatus === "completed" && assignment.completed_at && (
              <p className="text-center text-[13px] font-bold text-muted-foreground">
                🏅 Namaz badge earned · {new Date(assignment.completed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
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
