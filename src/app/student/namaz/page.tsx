"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"

import { KidButton, KidCard, KidEmpty, KidPageHeader } from "@/components/kid-ui"
import { NamazJourney } from "@/components/namaz-journey"
import { NamazStepCard } from "@/components/namaz-step-card"
import { PageLoading } from "@/components/page-loading"
import {
  findStop,
  flattenNamaz,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
  stepSlug,
  stopKey,
} from "@/lib/namaz"
import { readLast, readViewed, writeLast, writeViewed } from "@/lib/namaz-progress"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

const BASE = "/student/namaz"

// Set when the grid opens the journey, so "All steps" can pop that history entry
// instead of stacking a new one. A deep link lands without it and replaces instead.
let openedFromGrid = false

export default function StudentNamazPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<PageLoading variant="grid-cards" count={6} student />}>
      <NamazGuide />
    </Suspense>
  )
}

function NamazGuide() {
  const { student, loading: studentLoading, error } = useStudent()
  const router = useRouter()
  const params = useSearchParams()
  const [steps, setSteps] = useState<NamazStep[]>([])
  const [parts, setParts] = useState<NamazStepPart[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [viewed, setViewed] = useState<Set<string>>(new Set())
  const [lastKey, setLastKey] = useState<string | null>(null)

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
    setViewed(readViewed(student.id))
    setLastKey(readLast(student.id))
    void loadData()
  }, [student?.id, studentLoading, loadData])

  const studentId = student?.id
  const stops = useMemo(() => flattenNamaz(steps, parts), [steps, parts])
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.order_index - b.order_index),
    [steps],
  )

  const stepParam = params.get("step")
  const index = stepParam ? findStop(stops, stepParam, Number(params.get("part")) || 1) : -1
  const finished = params.get("done") === "1"

  const href = useCallback(
    (i: number) => `${BASE}?step=${stepSlug(stops[i].step.title)}&part=${stops[i].partIndex + 1}`,
    [stops],
  )

  // Remember where the child is, for "Continue".
  useEffect(() => {
    if (!studentId || index < 0) return
    const key = stopKey(stops[index])
    writeLast(studentId, key)
    setLastKey(key)
  }, [studentId, index, stops])

  const markViewed = useCallback(
    (key: string) => {
      if (!studentId) return
      setViewed((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev).add(key)
        writeViewed(studentId, next)
        return next
      })
    },
    [studentId],
  )

  const openAt = (i: number) => {
    openedFromGrid = true
    router.push(href(i), { scroll: false })
  }
  const exitToGrid = () => {
    if (openedFromGrid) {
      openedFromGrid = false
      router.back()
    } else router.replace(BASE, { scroll: false })
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

  if (stops.length === 0) {
    return (
      <KidEmpty
        title="Namaz is coming soon"
        text="Namaz steps will appear here once your teacher adds them."
      />
    )
  }

  if (finished) {
    return (
      <Celebration onAgain={() => router.replace(href(0), { scroll: false })} onExit={exitToGrid} />
    )
  }

  if (index >= 0) {
    return (
      <NamazJourney
        steps={sortedSteps}
        stops={stops}
        index={index}
        onIndex={(i) => i >= 0 && router.replace(href(i), { scroll: false })}
        onExit={exitToGrid}
        onFinish={() => router.replace(`${BASE}?done=1`, { scroll: false })}
        onViewed={markViewed}
      />
    )
  }

  const lastIndex = lastKey ? stops.findIndex((s) => stopKey(s) === lastKey) : -1
  const canContinue = lastIndex > 0
  const stepDone = (stepId: string) =>
    stops.filter((s) => s.step.id === stepId).every((s) => viewed.has(stopKey(s)))

  return (
    <div className="mx-auto max-w-5xl pb-6 motion-safe:animate-fade-in-up">
      <KidPageHeader
        emoji="🕌"
        color="rose"
        title="Learn Namaz"
        subtitle="Learn the whole prayer, one step at a time"
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        {canContinue && (
          <KidButton onClick={() => openAt(lastIndex)} className="sm:flex-1">
            Continue: {stops[lastIndex].step.title}
          </KidButton>
        )}
        <KidButton
          variant={canContinue ? "soft" : "primary"}
          onClick={() => openAt(0)}
          className="sm:flex-1"
        >
          Start from the beginning
        </KidButton>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {sortedSteps.map((step) => (
          <NamazStepCard
            key={step.id}
            kid
            title={step.title}
            imageUrl={step.image_url}
            cardColor={step.card_color}
            clickable
            completed={stepDone(step.id)}
            onClick={() => openAt(stops.findIndex((s) => s.step.id === step.id))}
          />
        ))}
      </div>
    </div>
  )
}

function Celebration({ onAgain, onExit }: { onAgain: () => void; onExit: () => void }) {
  return (
    <div className="mx-auto max-w-md pt-6">
      <KidCard color="rose" className="flex flex-col items-center gap-4 text-center">
        <span aria-hidden className="celebrate-pop text-[72px] leading-none">
          🌟
        </span>
        <h2 className="font-heading text-[28px] font-bold leading-tight text-primary">
          You learned the whole prayer!
        </h2>
        <p className="text-[16px] font-semibold text-foreground/80">
          MashaAllah! Every step, from Takbir to Salam.
        </p>
        <div className="flex w-full flex-col gap-2">
          <KidButton variant="soft" onClick={onAgain}>
            Start again
          </KidButton>
          <KidButton onClick={onExit}>Back to steps</KidButton>
        </div>
      </KidCard>
    </div>
  )
}
