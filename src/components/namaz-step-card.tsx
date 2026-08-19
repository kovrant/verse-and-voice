"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export function NamazStepCard({
  title,
  imageUrl,
  cardColor,
  clickable,
  completed,
  activeRevision,
  onClick,
}: {
  title: string
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
        "group relative overflow-hidden rounded-2xl border text-left shadow-soft transition-all duration-300",
        "min-h-[140px] w-full p-4 sm:min-h-[160px] sm:p-5",
        clickable
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg border-border/40"
          : "cursor-not-allowed opacity-45 border-border/20",
        activeRevision && "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background",
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
          <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Check className="h-3 w-3" />
            Done
          </span>
        )}
        {activeRevision && (
          <span className="mb-2 inline-flex w-fit rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            Revise
          </span>
        )}
        <p className="max-w-[52%] text-xl font-bold leading-tight tracking-tight text-foreground drop-shadow-sm sm:text-2xl">
          {title}
        </p>
      </div>
    </button>
  )
}
