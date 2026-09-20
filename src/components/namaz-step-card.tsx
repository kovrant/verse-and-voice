"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export function NamazStepCard({
  title,
  kid = false,
  imageUrl,
  cardColor,
  clickable,
  completed,
  activeRevision,
  onClick,
}: {
  title: string
  /** Student-portal look: chunky storybook tile. Teacher pages keep the original. */
  kid?: boolean
  imageUrl?: string | null
  cardColor: string
  clickable: boolean
  completed?: boolean
  activeRevision?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden text-left transition-all duration-300",
        kid
          ? "min-h-[150px] w-full rounded-[26px] border-[1.5px] p-4 sm:min-h-[170px] sm:p-5"
          : "min-h-[140px] w-full rounded-2xl border p-4 shadow-soft sm:min-h-[160px] sm:p-5",
        kid
          ? clickable
            ? "cursor-pointer border-border shadow-[0_5px_0_hsl(var(--border))] hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none"
            : "cursor-not-allowed border-dashed border-border opacity-55"
          : clickable
            ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg border-border/40"
            : "cursor-not-allowed opacity-45 border-border/20",
        activeRevision &&
          (kid
            ? "ring-4 ring-[hsl(var(--kid-saffron)/0.45)]"
            : "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background"),
      )}
      style={{
        background: `linear-gradient(135deg, ${cardColor}22 0%, ${cardColor}44 100%)`,
      }}
    >
      {/*
        Wide PNG: empty left, illustration right. Height fills the card; align right.
      */}
      {imageUrl && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[68%] bg-no-repeat opacity-[0.58] transition-opacity group-enabled:group-hover:opacity-[0.72]"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "auto 100%",
            backgroundPosition: "right center",
          }}
          aria-hidden
        />
      )}
      <div className="relative flex h-full min-h-[108px] flex-col justify-end">
        {completed && (
          <span
            className={cn(
              "mb-2 inline-flex w-fit items-center gap-1 rounded-full",
              kid
                ? "bg-primary px-2.5 py-1 text-[12px] font-extrabold text-primary-foreground"
                : "bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white",
            )}
          >
            <Check className={kid ? "h-3.5 w-3.5" : "h-3 w-3"} />
            Done
          </span>
        )}
        {activeRevision && (
          <span
            className={cn(
              "mb-2 inline-flex w-fit rounded-full",
              kid
                ? "bg-[hsl(var(--kid-saffron)/0.6)] px-2.5 py-1 text-[12px] font-extrabold text-foreground"
                : "bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white",
            )}
          >
            {kid ? "🔁 Say again" : "Revise"}
          </span>
        )}
        <p
          className={cn(
            "max-w-[52%] leading-tight text-foreground drop-shadow-sm",
            kid
              ? "font-heading text-[21px] font-bold sm:text-[24px]"
              : "text-xl font-bold tracking-tight sm:text-2xl",
          )}
        >
          {title}
        </p>
      </div>
    </button>
  )
}
