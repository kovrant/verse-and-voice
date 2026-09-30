"use client"

import { cn } from "@/lib/utils"

export type StudentView = "profile" | "overview" | "sessions" | "trophies" | "account"

export interface StudentNavItem {
  id: StudentView
  label: string
  count?: number
  alert?: boolean
}

interface StudentDetailNavProps {
  active: StudentView
  onChange: (view: StudentView) => void
  items: StudentNavItem[]
}

export function StudentDetailNav({ active, onChange, items }: StudentDetailNavProps) {
  return (
    <div className="mb-6 border-b border-border/70 overflow-x-auto">
      <nav className="-mb-px flex items-center gap-6" aria-label="Student sections">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 py-3 text-sm transition-colors",
                isActive
                  ? "border-emerald-500 font-semibold text-emerald-500"
                  : "border-transparent font-medium text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "tabular-nums",
                    isActive ? "text-emerald-500" : "text-muted-foreground",
                  )}
                >
                  ({item.count})
                </span>
              )}
              {item.alert && (
                <span
                  className="ml-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"
                  title="Fee unpaid this month"
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function studentNavItems(signals: {
  sessionCount: number
  unpaidThisMonth: boolean
  achievementCount?: number
}): StudentNavItem[] {
  return [
    {
      id: "profile",
      label: "Profile",
    },
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "sessions",
      label: "Sessions",
      count: signals.sessionCount,
    },
    {
      id: "trophies",
      label: "Trophies",
      count: signals.achievementCount ?? 0,
    },
    {
      id: "account",
      label: "Fees & Access",
      alert: signals.unpaidThisMonth,
    },
  ]
}
