"use client"

import type { StudentGender } from "@/lib/utils"
import { cn } from "@/lib/utils"

const OPTIONS: { value: StudentGender; label: string }[] = [
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
]

/** Boy / Girl segmented control for the teacher's student forms (picks the avatar). */
export function GenderPicker({
  value,
  onChange,
  disabled,
}: {
  value: StudentGender | null
  onChange: (v: StudentGender) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Boy or girl"
      className={cn(
        "flex h-11 items-center gap-1 rounded-lg bg-background-gray-secondary p-1",
        disabled && "opacity-60",
      )}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-full flex-1 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed",
            value === o.value
              ? "bg-card-background text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
