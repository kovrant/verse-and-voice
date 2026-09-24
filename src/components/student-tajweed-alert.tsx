"use client"

import { Check, Sparkles, X } from "lucide-react"
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

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 left-1/2 z-[100] w-[min(92vw,460px)] -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-200"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[26px] border-[2px] border-border bg-card p-5 shadow-2xl backdrop-blur-md",
          "shadow-soft-lg",
        )}
        style={{
          borderColor: `hsl(var(--kid-${rule.color}) / 0.7)`,
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
        }}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Arabic Symbol Badge */}
            <span
              className="flex h-12 min-w-[48px] max-w-[180px] px-3 shrink-0 items-center justify-center rounded-[18px] border-[1.5px] font-arabic text-xl font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                background: `hsl(var(--kid-${rule.color}) / 0.35)`,
                borderColor: `hsl(var(--kid-${rule.color}) / 0.7)`,
                boxShadow: "0 4px 12px rgba(61, 64, 91, 0.08)",
              }}
            >
              {rule.arabicSymbol}
            </span>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary"
                  style={{ background: `hsl(var(--kid-${rule.color}) / 0.2)` }}
                >
                  <Sparkles className="h-3 w-3" />
                  Tajweed Reminder
                </span>
              </div>
              <h3 className="font-heading text-[20px] font-bold leading-tight text-foreground mt-0.5">
                {rule.title}
                <span className="ml-2 font-arabic text-lg text-primary font-bold">
                  ({rule.nameUrdu})
                </span>
              </h3>
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

        {/* Short Golden Cue */}
        <div
          className="mt-3.5 rounded-[16px] p-3 text-[14px] font-bold text-foreground"
          style={{ background: `hsl(var(--kid-${rule.color}) / 0.15)` }}
        >
          💡 {rule.shortCue}
        </div>

        {/* Explanation */}
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {rule.explanation}
        </p>

        {/* Examples Section */}
        {rule.examples.length > 0 && (
          <div className="mt-3 rounded-[16px] border border-border/60 bg-secondary/30 p-2.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Practice Example:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {rule.examples.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-[12px] bg-card px-3 py-1.5 border border-border/80"
                >
                  <span className="font-arabic text-base font-bold text-foreground">
                    {ex.arabic}
                  </span>
                  <span className="text-[12px] font-semibold text-muted-foreground">
                    {ex.transliteration}
                  </span>
                  {ex.note && (
                    <span className="text-[11px] text-primary/80 font-medium">
                      · {ex.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button: Got It! */}
        <div className="mt-4 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full flex items-center justify-center gap-2 rounded-[18px] py-2.5 text-[15px] font-extrabold text-foreground transition-transform hover:-translate-y-0.5 active:translate-y-[2px]"
            style={{
              background: `hsl(var(--kid-${rule.color}) / 0.45)`,
              borderColor: `hsl(var(--kid-${rule.color}) / 0.8)`,
              borderWidth: "1.5px",
              boxShadow: "0 4px 12px rgba(61, 64, 91, 0.08)",
            }}
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>Got it, Teacher!</span>
          </button>
        </div>
      </div>
    </div>
  )
}
