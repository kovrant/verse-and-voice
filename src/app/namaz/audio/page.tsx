"use client"

import { ArrowLeft, Mic } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { NamazAudioRow } from "@/components/namaz-audio-row"
import { PageLoading } from "@/components/page-loading"
import { Button } from "@/components/ui/button"
import {
  flattenNamaz,
  NAMAZ_PART_SELECT,
  NAMAZ_STEP_SELECT,
  type NamazStep,
  type NamazStepPart,
} from "@/lib/namaz"
import { supabase } from "@/lib/supabase"

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
          href="/namaz"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Namaz steps
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Mic className="h-8 w-8 text-teal-600" />
          Namaz audio
        </h1>
        <p className="text-muted-foreground">
          Record each part, then tap the start of every word so the words light up as students
          listen. {recorded} of {parts.length} parts recorded.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={reviewOnly ? "outline" : "default"}
          size="sm"
          onClick={() => setReviewOnly(false)}
        >
          All parts ({parts.length})
        </Button>
        <Button
          variant={reviewOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setReviewOnly(true)}
        >
          Needs review ({reviewCount})
        </Button>
      </div>

      {stops.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
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
