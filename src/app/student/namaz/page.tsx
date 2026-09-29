"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react"

import { KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { NamazStepCard } from "@/components/namaz-step-card"
import { NamazStepViewer } from "@/components/namaz-step-viewer"
import { PageLoading } from "@/components/page-loading"
import {
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
  partsForStep,
} from "@/lib/namaz"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

export default function StudentNamazPage() {
  const { student, loading: studentLoading, error } = useStudent()
  const [steps, setSteps] = useState<NamazStep[]>([])
  const [parts, setParts] = useState<NamazStepPart[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [viewStep, setViewStep] = useState<NamazStep | null>(null)

  const loadData = useCallback(async () => {
    const [stepsRes, partsRes] = await Promise.all([
      supabase.from("namaz_steps").select(NAMAZ_STEP_SELECT).order("order_index"),
      supabase.from("namaz_step_parts").select(NAMAZ_PART_SELECT).order("order_index"),
    ])
    setSteps((stepsRes.data as NamazStep[]) || [])
    setParts((partsRes.data as NamazStepPart[]) || [])
    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (!student?.id) {
      if (!studentLoading) setDataLoading(false)
      return
    }
    setDataLoading(true)
    void loadData()
  }, [student?.id, studentLoading, loadData])

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

  if (steps.length === 0) {
    return (
      <KidEmpty
        title="Namaz is coming soon"
        text="Namaz steps will appear here once your teacher adds them."
      />
    )
  }

  if (viewStep) {
    return (
      <NamazStepViewer
        key={viewStep.id}
        step={viewStep}
        parts={partsForStep(viewStep.id, parts)}
        onClose={() => setViewStep(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-6">
      <KidPageHeader
        emoji="🕌"
        color="rose"
        title="Learn Namaz"
        subtitle="Tap any step to see the posture and words"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step) => (
          <NamazStepCard
            key={step.id}
            kid
            title={step.title}
            imageUrl={step.image_url}
            cardColor={step.card_color}
            clickable
            onClick={() => setViewStep(step)}
          />
        ))}
      </div>
    </div>
  )
}
