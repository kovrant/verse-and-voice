"use client"

import { cn } from "@/lib/utils"

/** 0 = Sunday … 6 = Saturday (matches JS Date.getDay()). */
export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

interface ClassDaysPickerProps {
  value: number[]
  onChange: (days: number[]) => void
  disabled?: boolean
}

export function ClassDaysPicker({ value, onChange, disabled }: ClassDaysPickerProps) {
  const selected = new Set(value)

  function toggle(day: number) {
    if (disabled) return
    const next = selected.has(day)
      ? value.filter((d) => d !== day)
      : [...value, day].sort((a, b) => a - b)
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Class days">
      {DAY_LABELS.map((label, day) => {
        const on = selected.has(day)
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            title={DAY_NAMES[day]}
            aria-pressed={on}
            onClick={() => toggle(day)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
