"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useEffect, useRef } from "react"

import { KidButton, KidCard } from "@/components/kid-ui"
import { NamazPartPanel } from "@/components/namaz-part-panel"
import { type NamazStep, type NamazStop, stopKey } from "@/lib/namaz"
import { cn } from "@/lib/utils"

const VIEWED_AFTER_MS = 2000
const SWIPE_MIN_PX = 60

/**
 * Learn mode: the whole prayer as one journey. Next always moves forward, across
 * steps (Qiyam part 3 → Ruku), and becomes Finish on the last part. Swipe on
 * phones, arrow keys on desktop.
 */
export function NamazJourney({
  steps,
  stops,
  index,
  onIndex,
  onExit,
  onFinish,
  onViewed,
}: {
  steps: NamazStep[]
  stops: NamazStop[]
  index: number
  onIndex: (i: number) => void
  onExit: () => void
  onFinish: () => void
  /** A screen counts as viewed after 2 s on screen or when its audio finished. */
  onViewed: (key: string) => void
}) {
  const stop = stops[index]
  const isFirst = index === 0
  const isLast = index === stops.length - 1
  const nextStop = stops[index + 1]
  const key = stopKey(stop)

  const goNext = () => (isLast ? onFinish() : onIndex(index + 1))
  const goBack = () => !isFirst && onIndex(index - 1)
  // Handlers change every render; the key/swipe listeners read the latest.
  const nav = useRef({ goNext, goBack, onExit })
  nav.current = { goNext, goBack, onExit }

  useEffect(() => {
    const t = window.setTimeout(() => onViewed(key), VIEWED_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [key, onViewed])

  // New screen: back to the picture at the top.
  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0 })
  }, [index])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "ArrowRight") nav.current.goNext()
      else if (e.key === "ArrowLeft") nav.current.goBack()
      else if (e.key === "Escape") nav.current.onExit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const touch = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current
    touch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) nav.current.goNext()
    else nav.current.goBack()
  }

  const image = stop.part?.image_url || stop.step.image_url
  const nextLabel = isLast
    ? "Finish"
    : nextStop.step.id === stop.step.id
      ? `Next: part ${nextStop.partIndex + 1}`
      : `Next: ${nextStop.step.title}`

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-3"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-4 text-[15px] font-bold text-foreground shadow-soft backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All steps
        </button>
        <p className="ml-auto text-right font-heading text-[15px] font-bold leading-tight text-primary">
          Step {stop.stepIndex + 1} of {steps.length}
          {stop.partCount > 1 && (
            <span className="block text-[13px] text-foreground/70">
              Part {stop.partIndex + 1} of {stop.partCount}
            </span>
          )}
        </p>
      </div>

      <StepProgress
        steps={steps}
        current={stop.stepIndex}
        onJump={(stepIndex) => onIndex(stops.findIndex((s) => s.stepIndex === stepIndex))}
      />

      <KidCard color="rose" className="flex flex-col items-center gap-4 sm:px-8">
        <div key={key} className="flex w-full flex-col items-center gap-4 motion-safe:animate-fade-in-up">
          {image && (
            <img
              src={image}
              alt={`${stop.step.title} posture`}
              className="max-h-[34vh] w-auto max-w-full rounded-[22px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
            />
          )}
          <NamazPartPanel step={stop.step} part={stop.part} onListened={() => onViewed(key)} />
        </div>
      </KidCard>

      {/* Back / Next stays in reach while a long part (Al-Fatiha) scrolls under it. */}
      <div className="sticky bottom-[6.5rem] z-30 lg:bottom-4">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-full bg-card/80 p-1.5 shadow-soft backdrop-blur-md">
          <KidButton
            variant="soft"
            onClick={goBack}
            disabled={isFirst}
            className="h-[52px] shrink-0 px-5 disabled:cursor-default disabled:opacity-40"
          >
            <ArrowLeft className="inline h-5 w-5 align-[-4px]" aria-hidden />
            <span className="sr-only sm:not-sr-only sm:ml-1">Back</span>
          </KidButton>
          <KidButton onClick={goNext} className="h-[52px] min-w-0 flex-1 px-4 text-[17px]">
            <span className="truncate">{nextLabel}</span>
            {!isLast && <ArrowRight className="ml-1 inline h-5 w-5 align-[-4px]" aria-hidden />}
          </KidButton>
        </div>
      </div>
    </div>
  )
}

/** One segment per step: done = sage, current = accent, upcoming = grey. Tap to jump. */
function StepProgress({
  steps,
  current,
  onJump,
}: {
  steps: NamazStep[]
  current: number
  onJump: (stepIndex: number) => void
}) {
  return (
    <nav aria-label="Prayer steps" className="flex gap-1">
      {steps.map((step, i) => (
        <button
          key={step.id}
          type="button"
          onClick={() => onJump(i)}
          aria-label={`Step ${i + 1}: ${step.title}`}
          aria-current={i === current ? "step" : undefined}
          className="group flex h-12 min-w-0 flex-1 items-center"
        >
          <span
            className={cn(
              "h-3 w-full rounded-full transition-colors",
              i === current && "h-4 bg-accent",
              i < current && "bg-[hsl(var(--sage))]",
              i > current && "bg-muted-foreground/25 group-hover:bg-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </nav>
  )
}
