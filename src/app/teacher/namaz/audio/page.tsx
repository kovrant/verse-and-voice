"use client"

import { ArrowLeft, Mic } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { NamazAudioRow } from "@/components/namaz-audio-row"
import { PageLoading } from "@/components/page-loading"
import {
  flattenNamaz,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
} from "@/lib/namaz"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const PILL = "rounded-full px-3 py-1 text-xs font-medium transition-colors"
const PILL_ON = "bg-primary text-primary-foreground"
const PILL_OFF = "bg-background-gray-secondary text-text-secondary hover:text-text-primary"

/** Teacher tools for the student Namaz journey: recordings, word timings and the review list. */
export default function NamazAudioPage() {
  const [steps, setSteps] = useState<NamazStep[]>([])
  const [parts, setParts] = useState<NamazStepPart[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewOnly, setReviewOnly] = useState(false)

  useEffect(() => {
    void Promise.all([
      supabase.from("namaz_steps").select(NAMAZ_STEP_SELECT).order("order_index"),
      supabase.from("namaz_step_parts").select(NAMAZ_PART_SELECT).order("order_index"),
    ]).then(([stepsRes, partsRes]) => {
      setSteps((stepsRes.data as NamazStep[]) || [])
      setParts((partsRes.data as NamazStepPart[]) || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <PageLoading variant="grid-cards" count={3} />

  const stops = flattenNamaz(steps, parts).filter(
    (s): s is typeof s & { part: NamazStepPart } =>
      !!s.part && (!reviewOnly || s.part.needs_review),
  )
  const reviewCount = parts.filter((p) => p.needs_review).length
  const recorded = parts.filter((p) => p.audio_url).length

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
      <div className="space-y-2">
        <Link
          href="/teacher/namaz"
          className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Namaz steps
        </Link>
        <h1 className="mb-1 text-[28px] font-medium leading-8 text-text-primary flex items-center gap-2">
          <Mic className="h-7 w-7 text-icon-secondary" />
          Namaz audio
        </h1>
        <p className="text-sm leading-5 text-text-tertiary">
          Record each part, then tap the start of every word so the words light up as students
          listen. {recorded} of {parts.length} parts recorded.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setReviewOnly(false)}
          className={cn(PILL, reviewOnly ? PILL_OFF : PILL_ON)}
        >
          All parts ({parts.length})
        </button>
        <button
          type="button"
          onClick={() => setReviewOnly(true)}
          className={cn(PILL, reviewOnly ? PILL_ON : PILL_OFF)}
        >
          Needs review ({reviewCount})
        </button>
      </div>

      {stops.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-tertiary">
          {reviewOnly
            ? "Everything is approved. ✨"
            : "No parts yet. Add them on the Namaz steps page."}
        </p>
      ) : (
        <div className="space-y-4">
          {stops.map(({ step, part }) => (
            <NamazAudioRow
              key={part.id}
              step={step}
              part={part}
              onChange={(patch) =>
                setParts((all) => all.map((p) => (p.id === part.id ? { ...p, ...patch } : p)))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
