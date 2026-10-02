"use client"

import { Sparkles } from "lucide-react"

import { ArabicText } from "@/components/arabic-text"
import type { QuranGem } from "@/lib/history"

interface QuranGemBoxProps {
  gem: QuranGem
  className?: string
}

export function QuranGemBox({ gem, className = "" }: QuranGemBoxProps) {
  if (!gem || !gem.arabic) return null

  return (
    <div
      className={`relative my-8 overflow-hidden rounded-[26px] border-[2px] border-[hsl(var(--kid-saffron)/0.55)] p-5 sm:p-7 shadow-soft ${className}`}
      style={{
        background:
          "linear-gradient(145deg, hsl(var(--kid-saffron)/0.15) 0%, hsl(var(--card)) 100%)",
      }}
    >
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[hsl(var(--kid-saffron)/0.2)] blur-2xl"
      />

      {/* Top Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--kid-saffron)/0.3)] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--kid-saffron)/0.35)] text-lg">
            💎
          </span>
          <span className="text-[13px] font-black uppercase tracking-wider text-foreground/80">
            The Quranic Gem
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--kid-saffron)/0.4)] bg-card/90 px-3 py-1 text-[12px] font-bold text-foreground/90 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {gem.surah_name} · {gem.ayah_number}
        </span>
      </div>

      {/* Arabic Ayah in Center */}
      <div className="my-5 rounded-2xl border border-[hsl(var(--kid-saffron)/0.25)] bg-card/60 p-4 sm:p-6 text-center shadow-inner">
        <ArabicText className="text-[24px] sm:text-[28px] md:text-[32px] font-bold leading-[2.2] text-foreground tracking-wide">
          {gem.arabic}
        </ArabicText>
      </div>

      {/* Clear English Translation */}
      <div className="space-y-3">
        <blockquote className="border-l-[3.5px] border-[hsl(var(--kid-saffron))] pl-4 text-[15px] sm:text-[16.5px] font-medium italic leading-relaxed text-foreground/90">
          “{gem.translation}”
        </blockquote>

        {/* Child Takeaway */}
        {gem.child_takeaway && (
          <div className="mt-4 flex items-start gap-3 rounded-[18px] bg-[hsl(var(--kid-saffron)/0.16)] p-3.5 sm:p-4 text-foreground">
            <span className="shrink-0 text-xl" aria-hidden>
              🌟
            </span>
            <div className="min-w-0">
              <span className="block text-[12px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Why Allah told us this
              </span>
              <p className="mt-0.5 text-[14px] sm:text-[15px] font-semibold leading-relaxed text-foreground/90">
                {gem.child_takeaway}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
