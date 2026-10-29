"use client"

import type { LucideIcon } from "lucide-react"

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Icon tints shared by a tile and its dialog. */
export const ACCESS_TINTS = {
  indigo: "bg-[rgba(87,80,241,0.10)] text-[#5750F1]",
  sky: "bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]",
  red: "bg-destructive/10 text-destructive",
} as const

export type AccessTint = keyof typeof ACCESS_TINTS

/** Green dot pill when on, grey when off. */
export function AccessStatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        on ? "bg-green-500/10 text-green-600" : "bg-background-gray-secondary text-text-secondary",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-green-500" : "bg-icon-tertiary")} />
      {label}
    </span>
  )
}

/** Compact clickable tile (icon, title, status) that opens the control's dialog. */
export function AccessTile({
  icon: Icon,
  tint,
  title,
  status,
  loading,
  onClick,
}: {
  icon: LucideIcon
  tint: AccessTint
  title: string
  status: { on: boolean; label: string } | null
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-start gap-4 rounded-xl border border-card-border bg-card p-4 text-left transition-colors hover:bg-background-gray-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
          ACCESS_TINTS[tint],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        {loading ? (
          <span className="h-5 w-14 shimmer rounded-full" />
        ) : (
          status && <AccessStatusPill on={status.on} label={status.label} />
        )}
      </span>
    </button>
  )
}

/** NextAdmin dialog header: round tinted icon beside the title, then a line of context. */
export function AccessDialogHeader({
  icon: Icon,
  tint,
  title,
  description,
}: {
  icon: LucideIcon
  tint: AccessTint
  title: string
  description: string
}) {
  return (
    <DialogHeader>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 flex-shrink-0 items-center justify-center rounded-full",
            ACCESS_TINTS[tint],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <DialogTitle>{title}</DialogTitle>
      </div>
      <DialogDescription className="mt-2">{description}</DialogDescription>
    </DialogHeader>
  )
}
