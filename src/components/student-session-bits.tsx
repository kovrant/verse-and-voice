"use client"

/* eslint-disable @next/next/no-img-element -- remote Supabase URLs; next/image not worth it here */

import { BookMarked, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ClassSession {
  id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  starting_para: number | null
  ending_para: number | null
  paras_covered: number[]
  memorization_revised: string[]
  notes: string | null
}

export function formatSessionDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return `${s}s`
  const mins = Math.floor(s / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function paraSummary(s: ClassSession): { label: string; title: string } | null {
  const covered = (s.paras_covered || []).filter((n) => n != null)
  if (covered.length > 0) {
    const sorted = [...covered].sort((a, b) => a - b)
    if (sorted.length === 1) return { label: `Para ${sorted[0]}`, title: `Para ${sorted[0]}` }
    return { label: `${sorted.length} paras`, title: `Paras ${sorted.join(", ")}` }
  }
  if (s.starting_para != null && s.ending_para != null) {
    const range =
      s.starting_para === s.ending_para
        ? `Para ${s.starting_para}`
        : `Paras ${s.starting_para}–${s.ending_para}`
    return { label: range, title: range }
  }
  return null
}

export function MemThumb({ src }: { src?: string | null }) {
  if (!src) {
    return (
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
        <BookMarked className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-white">
      <img src={src} alt="" className="h-full w-full object-contain p-1" />
    </div>
  )
}

export function SessionStat({
  icon: Icon,
  tint,
  value,
  label,
}: {
  icon: LucideIcon
  tint: string
  value: string | number
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-lg font-bold leading-none tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
