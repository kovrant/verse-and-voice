"use client"

import { Check, X } from "lucide-react"
import { useEffect } from "react"

import { playTajweedChime } from "@/lib/tajweed/audio-chime"
import type { TajweedRule } from "@/lib/tajweed/rules"
import { cn } from "@/lib/utils"

interface StudentTajweedAlertProps {
  rule: TajweedRule | null
  onDismiss: () => void
}

export function StudentTajweedAlert({ rule, onDismiss }: StudentTajweedAlertProps) {
  // Play cheerful gentle chime when a rule arrives
  useEffect(() => {
    if (rule) {
      playTajweedChime()
    }
  }, [rule])

  if (!rule) return null

  const displayExamples = rule.examples.slice(0, 2)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 left-1/2 z-[100] w-[min(92vw,440px)] -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-200"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[26px] border-2 bg-card p-5 shadow-2xl backdrop-blur-md space-y-3.5",
          "shadow-soft-lg",
        )}
        style={{
          borderColor: `hsl(var(--kid-${rule.color}) / 0.65)`,
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.32)",
        }}
      >
        {/* Top Row: Big Qaida Badge + Clean Title + Rhythm Pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <span
              className="flex h-16 min-w-[68px] max-w-[160px] px-3 shrink-0 items-center justify-center rounded-[20px] border-2 font-arabic text-3xl font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                background: `hsl(var(--kid-${rule.color}) / 0.28)`,
                borderColor: `hsl(var(--kid-${rule.color}) / 0.65)`,
              }}
            >
              {rule.arabicSymbol}
            </span>

            <div className="min-w-0">
              <h3 className="font-heading text-[22px] font-extrabold leading-tight text-foreground flex flex-wrap items-baseline gap-1.5">
                <span>{rule.shortTitle || rule.title}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-arabic text-[22px] font-bold text-foreground">
                  {rule.nameUrdu}
                </span>
              </h3>

              <span
                className="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold text-foreground"
                style={{
                  background: `hsl(var(--kid-${rule.color}) / 0.2)`,
                  borderColor: `hsl(var(--kid-${rule.color}) / 0.55)`,
                }}
              >
                {rule.rhythmBadge || rule.shortCue}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss rule"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-transform hover:scale-110 hover:text-foreground active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visual Do vs Don't Sound Contrast Pills (Green & Burgundy) */}
        {rule.doSay && rule.dontSay && (
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-xs sm:text-[13px] font-extrabold text-foreground"
              style={{
                background: "rgba(46, 160, 67, 0.15)",
                borderColor: "rgba(46, 160, 67, 0.48)",
              }}
            >
              <span className="text-emerald-500">✓ Say:</span>
              <span className="truncate">{rule.doSay}</span>
            </div>
            <div
              className="flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-xs sm:text-[13px] font-extrabold text-foreground"
              style={{
                background: "rgba(190, 58, 70, 0.16)",
                borderColor: "rgba(190, 58, 70, 0.48)",
              }}
            >
              <span className="text-rose-400">✗ Not:</span>
              <span className="truncate">{rule.dontSay}</span>
            </div>
          </div>
        )}

        {/* Giant Side-by-Side Read-Together Arabic Practice Tiles */}
        {displayExamples.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {displayExamples.map((ex, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-secondary/35 px-2.5 py-3 text-center"
              >
                <span className="font-arabic text-3xl sm:text-[32px] font-bold leading-normal text-foreground">
                  {ex.arabic}
                </span>
                <span className="mt-0.5 text-xs font-bold tracking-wide text-muted-foreground">
                  {ex.transliteration}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button: Got It! */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[15px] font-extrabold text-foreground transition-transform hover:-translate-y-0.5 active:translate-y-[1px]"
          style={{
            background: `hsl(var(--kid-${rule.color}) / 0.42)`,
            borderColor: `hsl(var(--kid-${rule.color}) / 0.75)`,
            borderWidth: "1.5px",
          }}
        >
          <Check className="h-4 w-4 stroke-[3]" />
          <span>Got it, Teacher!</span>
        </button>
      </div>
    </div>
  )
}
