"use client"

/* eslint-disable @next/next/no-img-element -- images are remote Supabase URLs */

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { KidButton, KidCard } from "@/components/kid-ui"
import { StudentBackdrop } from "@/components/student-backdrop"
import type { NamazStep, NamazStepPart, StudentNamazPart } from "@/lib/namaz"
import { cn } from "@/lib/utils"

/**
 * Arabic size by length, so "Allahu Akbar" fills the panel while Al-Fatiha or
 * Durood still fit without scrolling on a laptop. Sizes are for phone / tablet
 * / desktop.
 */
function arabicSize(text: string) {
  const n = text.length
  if (n <= 40) return "text-[44px] sm:text-[58px] lg:text-[72px]"
  if (n <= 120) return "text-[34px] sm:text-[44px] lg:text-[54px]"
  return "text-[27px] sm:text-[32px] lg:text-[38px]"
}

/**
 * One Namaz step, one part at a time: the words large on the left, the child's
 * posture on the right (stacked on phones), with the meaning underneath.
 * A child learning to recite does better with one thing on screen than with a
 * long scroll of every part.
 */
export function NamazStepViewer({
  step,
  parts,
  partProgress,
  completed = false,
  completedAt = null,
  onClose,
}: {
  step: NamazStep
  parts: NamazStepPart[]
  partProgress?: Map<string, StudentNamazPart>
  completed?: boolean
  completedAt?: string | null
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const part = parts[index] ?? null
  const total = parts.length
  const isLast = index >= total - 1

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total])
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])

  // Arrow keys on desktop.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") back()
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, back, onClose])

  const image = part?.image_url || step.image_url
  const assigned = !!(part && partProgress?.get(part.id)?.revision_assigned_at)
  const inactive = completed && !assigned

  return (
    <div className="fixed inset-0 z-50 isolate flex flex-col">
      <StudentBackdrop />

      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 sm:px-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-4 py-2 text-[14px] font-bold text-foreground shadow-soft backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <ArrowLeft className="h-4 w-4" />
          All steps
        </button>
        <span className="inline-flex min-w-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 px-3.5 py-1.5 shadow-soft backdrop-blur-sm">
          <span aria-hidden className="text-[17px] leading-none">
            🕌
          </span>
          <span className="truncate font-heading text-[16px] font-bold text-primary">
            {step.title}
          </span>
        </span>
        {total > 1 && (
          <span className="ml-auto rounded-full border-[1.5px] border-border bg-card/90 px-3.5 py-1.5 font-heading text-[14px] font-bold tabular-nums text-primary shadow-soft backdrop-blur-sm">
            {index + 1} of {total}
          </span>
        )}
      </div>

      {/* Words + picture */}
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 sm:px-5">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 md:flex-row md:items-stretch md:gap-6">
          {image && (
            // Picture: first on phones, right-hand column from md up.
            <div className="flex shrink-0 items-center justify-center md:order-2 md:w-[40%] md:shrink">
              <img
                key={image}
                src={image}
                alt={part?.title || step.title}
                className="max-h-[30vh] w-auto max-w-full animate-fade-in-up rounded-[22px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] md:max-h-full"
              />
            </div>
          )}

          <KidCard
            color={assigned ? "saffron" : "rose"}
            className={cn(
              // my-auto on the child centres short parts; long ones (Al-Fatiha) scroll
              // instead of being clipped at both ends, which justify-center would do.
              "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto text-center md:order-1 md:px-10",
              inactive && "opacity-60",
            )}
          >
            {part ? (
              <div key={part.id} className="my-auto flex animate-fade-in-up flex-col gap-4">
                {assigned && (
                  <span className="mx-auto rounded-full bg-[hsl(var(--kid-saffron)/0.5)] px-3 py-1 text-[13px] font-extrabold text-foreground">
                    🔁 Say this one again
                  </span>
                )}

                {part.arabic_text ? (
                  <p
                    dir="rtl"
                    lang="ar"
                    className={cn(
                      "select-text font-hadith font-bold leading-[1.9] text-foreground",
                      arabicSize(part.arabic_text),
                    )}
                  >
                    {part.arabic_text}
                  </p>
                ) : (
                  <p className="font-heading text-[28px] font-bold text-primary">{part.title}</p>
                )}

                {(part.translation || part.arabic_text) && (
                  <div className="mx-auto w-full max-w-2xl border-t-[1.5px] border-[hsl(var(--kid-rose)/0.35)] pt-4">
                    {part.translation && (
                      <p className="text-[17px] font-semibold leading-relaxed text-foreground/90 sm:text-[20px]">
                        {part.translation}
                      </p>
                    )}
                    {part.arabic_text && (
                      // The title doubles as a pronunciation hint ("Allah Hu Akbar").
                      <p className="mt-2 text-[14px] font-bold text-muted-foreground">
                        {part.title}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="my-auto text-[17px] font-semibold text-foreground/85">
                🌟 Practise this step with your teacher.
              </p>
            )}
          </KidCard>
        </div>
      </div>

      {/* Back / Next */}
      {total > 1 && (
        <div className="shrink-0 px-3 pb-4 pt-1 sm:px-5">
          <div className="mx-auto flex w-full max-w-md items-center gap-3">
            <KidButton
              variant="soft"
              onClick={back}
              disabled={index === 0}
              className="flex-1 disabled:cursor-default disabled:opacity-40"
            >
              <ArrowLeft className="inline h-5 w-5 align-[-4px]" /> Back
            </KidButton>
            {isLast ? (
              <KidButton onClick={onClose} className="flex-1">
                Done ✓
              </KidButton>
            ) : (
              <KidButton onClick={next} className="flex-1">
                Next <ArrowRight className="inline h-5 w-5 align-[-4px]" />
              </KidButton>
            )}
          </div>
        </div>
      )}

      {completed && completedAt && (
        <p className="shrink-0 pb-3 text-center text-[13px] font-bold text-muted-foreground">
          🏅 Namaz badge earned · {new Date(completedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
